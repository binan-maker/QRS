export interface QrRecord {
  id: string;
  content: string;
  contentType: string;
  createdAt: string;
  scanCount: number;
  commentCount: number;
  ownerId?: string;
  ownerName?: string;
  isBranded?: boolean;
}

export interface QrScanRecord {
  id: string;
  content: string;
  contentType: string;
  scannedAt: string;
  qrCodeId?: string;
}

export interface IQrRepository {
  getById(qrId: string): Promise<QrRecord | null>;
  getOrCreate(content: string): Promise<QrRecord>;
  recordScan(
    qrId: string,
    content: string,
    contentType: string,
    userId: string | null,
    isAnonymous: boolean
  ): Promise<void>;
  getUserScans(userId: string, pageSize?: number): Promise<{ items: QrScanRecord[]; hasMore: boolean }>;
}
