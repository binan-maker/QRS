import type {
  User, type NewUser,
  QrCode, type NewQrCode,
  QrScan, type NewQrScan,
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

export interface Repositories {
  users: IUserRepository;
  qrCodes: IQrCodeRepository;
  scans: IScanRepository;
}
