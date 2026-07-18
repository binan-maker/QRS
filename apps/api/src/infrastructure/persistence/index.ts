/**
 * @infrastructure/persistence — Drizzle ORM repository implementations
 *
 * Each class implements a domain repository interface using Drizzle + PostgreSQL.
 * These are only instantiated when DATABASE_URL is set (Phase 2+).
 *
 * Usage:
 *   import { getDb } from "@binro/db";
 *   const userRepo = new DrizzleUserRepository(getDb());
 */

import { eq, and, lt, desc } from "drizzle-orm";
import { getDb } from "@binro/db";
import type { Database } from "@binro/db";
import {
  users, qrCodes, unifiedQrs, qrScans,
} from "@binro/db";
import type {
  User, NewUser,
  QrCode,
  UnifiedQr, NewUnifiedQr,
  QrScan,
} from "@binro/db";
import type { IUserRepository } from "../../domain/user";
import type { IQrCodeRepository, IUnifiedQrRepository } from "../../domain/qr";
import type { IScanRepository } from "../../domain/scan";

// ─── DrizzleUserRepository ────────────────────────────────────────────────────

export class DrizzleUserRepository implements IUserRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<User | null> {
    const rows = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0] ?? null;
  }

  async findByFirebaseUid(uid: string): Promise<User | null> {
    const rows = await this.db.select().from(users).where(eq(users.firebaseUid, uid)).limit(1);
    return rows[0] ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const rows = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return rows[0] ?? null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const rows = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
    return rows[0] ?? null;
  }

  async create(data: Omit<User, "createdAt" | "updatedAt">): Promise<User> {
    const rows = await this.db.insert(users).values(data as NewUser).returning();
    return rows[0]!;
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const rows = await this.db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    if (!rows[0]) throw new Error(`User not found: ${id}`);
    return rows[0];
  }

  async softDelete(id: string): Promise<void> {
    await this.db
      .update(users)
      .set({ isDeleted: true, deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async isUsernameTaken(username: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    return rows.length > 0;
  }
}

// ─── DrizzleQrCodeRepository (legacy QR model) ───────────────────────────────

export class DrizzleQrCodeRepository implements IQrCodeRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<QrCode | null> {
    const rows = await this.db.select().from(qrCodes).where(eq(qrCodes.id, id)).limit(1);
    return rows[0] ?? null;
  }

  async findByUuid(uuid: string): Promise<QrCode | null> {
    const rows = await this.db.select().from(qrCodes).where(eq(qrCodes.uuid, uuid)).limit(1);
    return rows[0] ?? null;
  }

  async findByOwnerId(ownerId: string, limit = 20, offset = 0): Promise<QrCode[]> {
    return this.db
      .select()
      .from(qrCodes)
      .where(eq(qrCodes.ownerId, ownerId))
      .orderBy(desc(qrCodes.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async create(data: Omit<QrCode, "id" | "createdAt" | "updatedAt">): Promise<QrCode> {
    const rows = await this.db.insert(qrCodes).values(data as any).returning();
    return rows[0]!;
  }

  async update(id: string, data: Partial<QrCode>): Promise<QrCode> {
    const rows = await this.db
      .update(qrCodes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(qrCodes.id, id))
      .returning();
    if (!rows[0]) throw new Error(`QR code not found: ${id}`);
    return rows[0];
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(qrCodes).where(eq(qrCodes.id, id));
  }

  async incrementScanCount(id: string): Promise<void> {
    // Drizzle doesn't have a built-in increment; use raw SQL via update
    const current = await this.findById(id);
    if (!current) return;
    await this.db
      .update(qrCodes)
      .set({ scanCount: (current.scanCount ?? 0) + 1, updatedAt: new Date() })
      .where(eq(qrCodes.id, id));
  }
}

// ─── DrizzleUnifiedQrRepository (new unified model) ──────────────────────────

export class DrizzleUnifiedQrRepository implements IUnifiedQrRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<UnifiedQr | null> {
    const rows = await this.db.select().from(unifiedQrs).where(eq(unifiedQrs.id, id)).limit(1);
    return rows[0] ?? null;
  }

  async findByOwnerId(ownerId: string, limit = 20, offset = 0): Promise<UnifiedQr[]> {
    return this.db
      .select()
      .from(unifiedQrs)
      .where(eq(unifiedQrs.ownerId, ownerId))
      .orderBy(desc(unifiedQrs.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async create(data: Omit<UnifiedQr, "createdAt" | "updatedAt">): Promise<UnifiedQr> {
    const rows = await this.db.insert(unifiedQrs).values(data as NewUnifiedQr).returning();
    return rows[0]!;
  }

  async update(id: string, data: Partial<UnifiedQr>): Promise<UnifiedQr> {
    const rows = await this.db
      .update(unifiedQrs)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(unifiedQrs.id, id))
      .returning();
    if (!rows[0]) throw new Error(`Unified QR not found: ${id}`);
    return rows[0];
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(unifiedQrs).where(eq(unifiedQrs.id, id));
  }

  async incrementScanCount(id: string): Promise<void> {
    const current = await this.findById(id);
    if (!current) return;
    await this.db
      .update(unifiedQrs)
      .set({ scanCount: (current.scanCount ?? 0) + 1, updatedAt: new Date() })
      .where(eq(unifiedQrs.id, id));
  }
}

// ─── DrizzleScanRepository ────────────────────────────────────────────────────

export class DrizzleScanRepository implements IScanRepository {
  constructor(private readonly db: Database) {}

  async record(data: Omit<QrScan, "id" | "scannedAt">): Promise<QrScan> {
    const rows = await this.db.insert(qrScans).values(data as any).returning();
    return rows[0]!;
  }

  async findRecentByUser(userId: string, limit = 20): Promise<QrScan[]> {
    return this.db
      .select()
      .from(qrScans)
      .where(eq(qrScans.userId, userId))
      .orderBy(desc(qrScans.scannedAt))
      .limit(limit);
  }

  async findRecentByQr(qrId: string, limit = 20): Promise<QrScan[]> {
    return this.db
      .select()
      .from(qrScans)
      .where(eq(qrScans.unifiedQrId, qrId))
      .orderBy(desc(qrScans.scannedAt))
      .limit(limit);
  }

  async getSecondsSinceLastScan(
    qrId: string,
    userId: string | null,
    _deviceId?: string,
  ): Promise<number | null> {
    if (!userId) return null;
    const rows = await this.db
      .select({ scannedAt: qrScans.scannedAt })
      .from(qrScans)
      .where(and(eq(qrScans.unifiedQrId, qrId), eq(qrScans.userId, userId)))
      .orderBy(desc(qrScans.scannedAt))
      .limit(1);
    if (!rows[0]) return null;
    return Math.floor((Date.now() - new Date(rows[0].scannedAt).getTime()) / 1000);
  }
}

// ─── Repository factory ───────────────────────────────────────────────────────
// Call this only when DATABASE_URL is set. Will throw if not configured.

export function createRepositories() {
  const db = getDb();
  return {
    users:      new DrizzleUserRepository(db),
    qrCodes:    new DrizzleQrCodeRepository(db),
    unifiedQrs: new DrizzleUnifiedQrRepository(db),
    scans:      new DrizzleScanRepository(db),
  };
}
