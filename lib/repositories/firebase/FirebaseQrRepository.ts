import {
  getOrCreateQrCode,
  getQrCodeById,
  recordScan,
  getUserScansPaginated,
} from "@/lib/services/qr-service";
import type { IQrRepository, QrRecord, QrScanRecord } from "../interfaces/IQrRepository";

export class FirebaseQrRepository implements IQrRepository {
  async getById(qrId: string): Promise<QrRecord | null> {
    const qr = await getQrCodeById(qrId);
    if (!qr) return null;
    return {
      id: qr.id,
      content: qr.content,
      contentType: qr.contentType,
      createdAt: qr.createdAt,
      scanCount: qr.scanCount,
      commentCount: qr.commentCount,
      ownerId: qr.ownerId,
      ownerName: qr.ownerName,
      isBranded: qr.isBranded,
    };
  }

  async getOrCreate(content: string): Promise<QrRecord> {
    const qr = await getOrCreateQrCode(content);
    return {
      id: qr.id,
      content: qr.content,
      contentType: qr.contentType,
      createdAt: qr.createdAt,
      scanCount: qr.scanCount,
      commentCount: qr.commentCount,
      ownerId: qr.ownerId,
      ownerName: qr.ownerName,
      isBranded: qr.isBranded,
    };
  }

  async recordScan(
    qrId: string,
    content: string,
    contentType: string,
    userId: string | null,
    isAnonymous: boolean
  ): Promise<void> {
    await recordScan(qrId, content, contentType, userId, isAnonymous);
  }

  async getUserScans(
    userId: string,
    pageSize: number = 20
  ): Promise<{ items: QrScanRecord[]; hasMore: boolean }> {
    const result = await getUserScansPaginated(userId, pageSize);
    return {
      items: result.items.map((s) => ({
        id: s.id,
        content: s.content,
        contentType: s.contentType,
        scannedAt: s.scannedAt,
        qrCodeId: s.qrCodeId,
      })),
      hasMore: result.hasMore,
    };
  }
}
