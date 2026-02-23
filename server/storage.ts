import { drizzle } from "drizzle-orm/node-postgres";
import { eq, desc, count, and } from "drizzle-orm";
import {
  users,
  authTokens,
  qrCodes,
  comments,
  reports,
  scans,
  type User,
  type QrCode,
  type Comment,
  type Report,
  type Scan,
} from "@shared/schema";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const db = drizzle(process.env.DATABASE_URL!);

export async function createUser(
  email: string,
  displayName: string,
  password: string
): Promise<User> {
  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(users)
    .values({ email, displayName, passwordHash })
    .returning();
  return user;
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  return user;
}

export async function getUserById(id: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user;
}

export async function verifyPassword(
  user: User,
  password: string
): Promise<boolean> {
  return bcrypt.compare(password, user.passwordHash);
}

export async function createAuthToken(userId: string): Promise<string> {
  const token = randomUUID();
  await db.insert(authTokens).values({ userId, token });
  return token;
}

export async function getUserByToken(token: string): Promise<User | undefined> {
  const [result] = await db
    .select()
    .from(authTokens)
    .innerJoin(users, eq(authTokens.userId, users.id))
    .where(eq(authTokens.token, token));
  return result?.users;
}

export async function deleteAuthToken(token: string): Promise<void> {
  await db.delete(authTokens).where(eq(authTokens.token, token));
}

export async function getOrCreateQrCode(
  content: string,
  contentType: string = "text"
): Promise<QrCode> {
  const [existing] = await db
    .select()
    .from(qrCodes)
    .where(eq(qrCodes.content, content));
  if (existing) return existing;
  const [created] = await db
    .insert(qrCodes)
    .values({ content, contentType })
    .returning();
  return created;
}

export async function getQrCodeById(id: string): Promise<QrCode | undefined> {
  const [qr] = await db.select().from(qrCodes).where(eq(qrCodes.id, id));
  return qr;
}

export async function getQrCodeComments(
  qrCodeId: string,
  limit?: number
): Promise<(Comment & { user: { displayName: string } })[]> {
  const query = db
    .select({
      id: comments.id,
      qrCodeId: comments.qrCodeId,
      userId: comments.userId,
      text: comments.text,
      createdAt: comments.createdAt,
      userDisplayName: users.displayName,
    })
    .from(comments)
    .innerJoin(users, eq(comments.userId, users.id))
    .where(eq(comments.qrCodeId, qrCodeId))
    .orderBy(desc(comments.createdAt));

  const results = limit ? await query.limit(limit) : await query;
  return results.map((r) => ({
    id: r.id,
    qrCodeId: r.qrCodeId,
    userId: r.userId,
    text: r.text,
    createdAt: r.createdAt,
    user: { displayName: r.userDisplayName },
  }));
}

export async function addComment(
  qrCodeId: string,
  userId: string,
  text: string
): Promise<Comment> {
  const [comment] = await db
    .insert(comments)
    .values({ qrCodeId, userId, text })
    .returning();
  return comment;
}

export async function getQrCodeReports(qrCodeId: string) {
  const results = await db
    .select({
      reportType: reports.reportType,
      cnt: count(),
    })
    .from(reports)
    .where(eq(reports.qrCodeId, qrCodeId))
    .groupBy(reports.reportType);
  return results.reduce(
    (acc, r) => {
      acc[r.reportType] = Number(r.cnt);
      return acc;
    },
    {} as Record<string, number>
  );
}

export async function addReport(
  qrCodeId: string,
  userId: string,
  reportType: string
): Promise<Report> {
  const existing = await db
    .select()
    .from(reports)
    .where(
      and(
        eq(reports.qrCodeId, qrCodeId),
        eq(reports.userId, userId)
      )
    );
  if (existing.length > 0) {
    const [updated] = await db
      .update(reports)
      .set({ reportType })
      .where(eq(reports.id, existing[0].id))
      .returning();
    return updated;
  }
  const [report] = await db
    .insert(reports)
    .values({ qrCodeId, userId, reportType })
    .returning();
  return report;
}

export async function getUserReport(qrCodeId: string, userId: string) {
  const [report] = await db
    .select()
    .from(reports)
    .where(
      and(eq(reports.qrCodeId, qrCodeId), eq(reports.userId, userId))
    );
  return report || null;
}

export async function recordScan(
  qrCodeId: string,
  userId: string | null,
  isAnonymous: boolean = false
): Promise<Scan> {
  const [scan] = await db
    .insert(scans)
    .values({
      qrCodeId,
      userId,
      isAnonymous,
    })
    .returning();
  return scan;
}

export async function getUserScans(userId: string) {
  const results = await db
    .select({
      id: scans.id,
      qrCodeId: scans.qrCodeId,
      scannedAt: scans.scannedAt,
      isAnonymous: scans.isAnonymous,
      content: qrCodes.content,
      contentType: qrCodes.contentType,
    })
    .from(scans)
    .innerJoin(qrCodes, eq(scans.qrCodeId, qrCodes.id))
    .where(and(eq(scans.userId, userId), eq(scans.isAnonymous, false)))
    .orderBy(desc(scans.scannedAt));
  return results;
}

export async function getTotalScans(qrCodeId: string): Promise<number> {
  const [result] = await db
    .select({ cnt: count() })
    .from(scans)
    .where(eq(scans.qrCodeId, qrCodeId));
  return Number(result.cnt);
}

export async function getTotalComments(qrCodeId: string): Promise<number> {
  const [result] = await db
    .select({ cnt: count() })
    .from(comments)
    .where(eq(comments.qrCodeId, qrCodeId));
  return Number(result.cnt);
}

export async function decodeQrFromImage(
  base64Data: string
): Promise<string | null> {
  try {
    const { Jimp } = await import("jimp");
    const jsQR = (await import("jsqr")).default;
    const buffer = Buffer.from(base64Data, "base64");
    const image = await Jimp.read(buffer);
    const width = image.width;
    const height = image.height;
    const bitmap = image.bitmap;
    const data = new Uint8ClampedArray(bitmap.data);
    const code = jsQR(data, width, height);
    return code ? code.data : null;
  } catch (e) {
    console.error("QR decode error:", e);
    return null;
  }
}
