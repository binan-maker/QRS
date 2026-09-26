import { eq } from "drizzle-orm";
import type { Database } from "../db";
import {
  users, qrCodes, qrScans,
  type User, type NewUser,
  type QrCode, type NewQrCode,
  type QrScan, type NewQrScan,
} from "@binro/db";

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(user: NewUser): Promise<User>;
  update(id: string, user: Partial<User>): Promise<User>;
  delete(id: string): Promise<void>;
}

export interface IQrCodeRepository {
  findById(id: string): Promise<QrCode | null>;
  create(qr: NewQrCode): Promise<QrCode>;
  update(id: string, qr: Partial<QrCode>): Promise<QrCode>;
  delete(id: string): Promise<void>;
  incrementScanCount(id: string): Promise<void>;
}

export interface IScanRepository {
  recordScan(scan: NewQrScan): Promise<QrScan>;
  findByQrId(qrId: string, limit?: number): Promise<QrScan[]>;
  findByUserId(userId: string, limit?: number): Promise<QrScan[]>;
}

// ─── DrizzleUserRepository ───────────────────────────────────────────────────

export class DrizzleUserRepository implements IUserRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<User | null> {
    const rows = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0] ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const rows = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return rows[0] ?? null;
  }

  async create(data: NewUser): Promise<User> {
    const rows = await this.db.insert(users).values(data).returning();
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

  async delete(id: string): Promise<void> {
    await this.db.delete(users).where(eq(users.id, id));
  }
}

// ─── DrizzleQrCodeRepository ─────────────────────────────────────────────────

export class DrizzleQrCodeRepository implements IQrCodeRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<QrCode | null> {
    const rows = await this.db.select().from(qrCodes).where(eq(qrCodes.id, id)).limit(1);
    return rows[0] ?? null;
  }

  async create(data: NewQrCode): Promise<QrCode> {
    const rows = await this.db.insert(qrCodes).values(data).returning();
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
    const current = await this.findById(id);
    if (!current) return;
    await this.db
      .update(qrCodes)
      .set({ scanCount: (current.scanCount ?? 0) + 1, updatedAt: new Date() })
      .where(eq(qrCodes.id, id));
  }
}

// ─── DrizzleScanRepository ───────────────────────────────────────────────────

export class DrizzleScanRepository implements IScanRepository {
  constructor(private readonly db: Database) {}

  async recordScan(data: NewQrScan): Promise<QrScan> {
    const rows = await this.db.insert(qrScans).values(data).returning();
    return rows[0]!;
  }

  async findByQrId(qrId: string, limit = 50): Promise<QrScan[]> {
    return this.db
      .select()
      .from(qrScans)
      .where(eq(qrScans.qrCodeId, qrId))
      .limit(limit);
  }

  async findByUserId(userId: string, limit = 50): Promise<QrScan[]> {
    return this.db
      .select()
      .from(qrScans)
      .where(eq(qrScans.userId, userId))
      .limit(limit);
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export interface Repositories {
  users: IUserRepository;
  qrCodes: IQrCodeRepository;
  scans: IScanRepository;
}

export function createRepositories(db: Database): Repositories {
  return {
    users: new DrizzleUserRepository(db),
    qrCodes: new DrizzleQrCodeRepository(db),
    scans: new DrizzleScanRepository(db),
  };
}
