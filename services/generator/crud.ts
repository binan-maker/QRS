import { db } from "@/lib/db/client";
import { trackQrGenerated } from "@/lib/analytics";
import * as Crypto from "expo-crypto";
import { tsToString } from "../utils";
import type { QrType, ScanVelocityBucket, GeneratedQrItem } from "../types";
import { SIGNATURE_SALT } from "../types";
import { getQrCodeId } from "../qr-service";
import { getEffectiveScanCount } from "@/lib/db/distributed-counter";

export type { QrType, ScanVelocityBucket, GeneratedQrItem };

export function logError(context: string, error: unknown, meta?: Record<string, unknown>) {
  const err = error instanceof Error ? error : new Error(String(error));
  if (__DEV__) {
    console.error(`[generator-service] ${context}`, { ...meta, error: err.message });
  }
}

function mapDocToItem(id: string, data: any): GeneratedQrItem {
  return {
    docId: id,
    content: data.content || "",
    contentType: data.contentType || "text",
    uuid: data.uuid || "",
    branded: data.branded !== false,
    qrCodeId: data.qrCodeId || "",
    createdAt: tsToString(data.createdAt),
    fgColor: data.fgColor || "#0A0E17",
    bgColor: data.bgColor || "#F8FAFC",
    logoPosition: data.logoPosition || "center",
    logoUri: data.logoUri || null,
    label: data.label || null,
    scanLimit: data.scanLimit ?? null,
    expiryDate: data.expiryDate || null,
    expiryPreset: data.expiryPreset || null,
    scanCount: data.scanCount || 0,
    commentCount: data.commentCount || 0,
    qrType: (data.qrType as QrType) || "individual",
    isActive: true,
    deactivationMessage: null,
    businessName: data.businessName || null,
    guardUuid: data.guardUuid || null,
    displayDestination: data.displayDestination || null,
    templateKey: data.templateKey || null,
    formValues: data.formValues || null,
  } as any;
}

export async function saveGeneratedQr(
  userId: string,
  displayName: string,
  content: string,
  contentType: string,
  uuid: string,
  branded: boolean,
  qrType: QrType = "individual",
  businessName?: string | null,
  ownerLogoBase64?: string | null,
  guardUuid?: string | null,
  design?: {
    fgColor?: string;
    bgColor?: string;
    scanLimit?: number | null;
    expiryDate?: string | null;
    expiryPreset?: string | null;
    label?: string | null;
  } | null,
  displayDestination?: string | null,
  templateKey?: string | null,
  formValues?: { value: string; extra: Record<string, string> } | null
): Promise<string> {
  const SALT = SIGNATURE_SALT;
  const qrId = await getQrCodeId(content);
  let signature: string | undefined;
  if (branded) {
    try {
      const rawSig = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        content + "|" + userId + "|" + SALT
      );
      signature = rawSig.slice(0, 32);
    } catch (e) {
      logError("saveGeneratedQr/signature", e, { userId });
    }
  }

  try {
    const docRef = await db.add(["users", userId, "generatedQrs"], {
      content, contentType, uuid, branded,
      qrCodeId: qrId, qrType,
      businessName: businessName || null,
      guardUuid: guardUuid || null,
      ...(templateKey ? { templateKey } : {}),
      ...(displayDestination ? { displayDestination } : {}),
      ...(formValues ? { formValues } : {}),
      ...(signature ? { signature } : {}),
      fgColor: design?.fgColor || "#0A0E17",
      bgColor: design?.bgColor || "#F8FAFC",
      ...(design?.scanLimit ? { scanLimit: design.scanLimit } : {}),
      ...(design?.expiryDate ? { expiryDate: design.expiryDate } : {}),
      ...(design?.expiryPreset ? { expiryPreset: design.expiryPreset } : {}),
      ...(design?.label ? { label: design.label } : {}),
      scanCount: 0,
      commentCount: 0,
      createdAt: db.timestamp(),
    });

    if (branded) {
      try {
        const existingQr = await db.get(["qrCodes", qrId]);
        if (existingQr) {
          if (!existingQr.ownerId) {
            await db.update(["qrCodes", qrId], {
              ownerId: userId, ownerName: displayName,
              brandedUuid: uuid, isBranded: true,
              qrType, isActive: true,
              businessName: businessName || null,
              ...(signature ? { signature } : {}),
              ...(ownerLogoBase64 ? { ownerLogoBase64 } : {}),
              ...(templateKey ? { templateKey } : {}),
              ...(displayDestination ? { displayDestination } : {}),
              ...(formValues ? { formValues } : {}),
            });
          }
        } else {
          await db.set(["qrCodes", qrId], {
            content, contentType,
            createdAt: db.timestamp(),
            scanCount: 0, commentCount: 0,
            ownerId: userId, ownerName: displayName,
            brandedUuid: uuid, isBranded: true,
            qrType, isActive: true,
            businessName: businessName || null,
            ...(signature ? { signature } : {}),
            ...(ownerLogoBase64 ? { ownerLogoBase64 } : {}),
            ...(templateKey ? { templateKey } : {}),
            ...(displayDestination ? { displayDestination } : {}),
            ...(formValues ? { formValues } : {}),
          });
        }
      } catch (e) {
        logError("saveGeneratedQr/qrCodes-write", e, { qrId, userId });
      }
    }

    trackQrGenerated({ qrType, contentType, branded });
    return docRef.id;
  } catch (e) {
    logError("saveGeneratedQr/generatedQrs-write", e, { userId, contentType });
    throw new Error("Could not save QR code. Please check your connection and try again.");
  }
}

export async function getGeneratedQrById(userId: string, docId: string): Promise<GeneratedQrItem | null> {
  try {
    const data = await db.get(["users", userId, "generatedQrs", docId]);
    if (!data) return null;

    let scanCount = data.scanCount || 0;
    let commentCount = data.commentCount || 0;
    let isActive = true;
    let deactivationMessage: string | null = null;

    if (data.qrCodeId) {
      try {
        const qrData = await db.get(["qrCodes", data.qrCodeId]);
        if (qrData) {
          const storedScanCount = qrData.scanCount || scanCount;
          scanCount = await getEffectiveScanCount(data.qrCodeId, storedScanCount);
          commentCount = qrData.commentCount || commentCount;
          isActive = qrData.isActive !== false;
          deactivationMessage = qrData.deactivationMessage || null;
        }
      } catch (e) {
        logError("getGeneratedQrById/qrCodes-fetch", e, { docId });
      }
    }

    return { ...mapDocToItem(docId, data), scanCount, commentCount, isActive, deactivationMessage };
  } catch (e) {
    logError("getGeneratedQrById", e, { docId });
    return null;
  }
}

export async function getUserGeneratedQrs(userId: string): Promise<GeneratedQrItem[]> {
  try {
    // FIX: previously an unbounded query — a prolific user with thousands of
    // saved QRs would trigger a full collection scan on every list load. Cap at
    // 200 (sorted newest-first) so the initial render is fast; the My QR Codes
    // screen already does client-side pagination of the returned array.
    const { docs } = await db.query(["users", userId, "generatedQrs"], {
      orderBy: { field: "createdAt", direction: "desc" },
      limit: 200,
    });
    const items: GeneratedQrItem[] = docs.map((d) => mapDocToItem(d.id, d.data));

    const idsNeedingLookup = [...new Set(items.map(i => i.qrCodeId).filter(Boolean))] as string[];
    if (idsNeedingLookup.length > 0) {
      const qrResults = await Promise.all(
        idsNeedingLookup.map(id => db.get(["qrCodes", id]).catch(() => null))
      );
      const qrDataMap: Record<string, any> = {};
      idsNeedingLookup.forEach((id, i) => { if (qrResults[i]) qrDataMap[id] = qrResults[i]; });

      items.forEach(item => {
        const qrData = item.qrCodeId ? qrDataMap[item.qrCodeId] : null;
        if (qrData) {
          if (item.scanCount === 0) item.scanCount = qrData.scanCount || 0;
          if (item.commentCount === 0) item.commentCount = qrData.commentCount || 0;
          item.isActive = qrData.isActive !== false;
          item.deactivationMessage = qrData.deactivationMessage || null;
        }
      });
    }

    // Items already ordered by createdAt desc from Firestore — no client sort needed.
    return items;
  } catch (e) {
    logError("getUserGeneratedQrs", e, { userId });
    return [];
  }
}

export function subscribeToUserGeneratedQrs(
  userId: string,
  onUpdate: (items: GeneratedQrItem[]) => void,
  onError?: (err: Error) => void
): () => void {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let cancelled = false;

  function debouncedUpdate(items: GeneratedQrItem[]) {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (!cancelled) onUpdate(items);
    }, 300);
  }

  const unsub = db.onQuery(
    ["users", userId, "generatedQrs"],
    { orderBy: { field: "createdAt", direction: "desc" }, limit: 100 },
    (docs) => {
      const base: GeneratedQrItem[] = docs.map((d) => mapDocToItem(d.id, d.data));
      debouncedUpdate(base);

      const ids = [...new Set(base.map(i => i.qrCodeId).filter(Boolean))] as string[];
      if (ids.length === 0) return;

      Promise.all(ids.map(id => db.get(["qrCodes", id]).catch(() => null)))
        .then((results) => {
          if (cancelled) return;
          const map: Record<string, any> = {};
          ids.forEach((id, i) => { if (results[i]) map[id] = results[i]; });
          const enriched: GeneratedQrItem[] = base.map((item) => {
            const qr = item.qrCodeId ? map[item.qrCodeId] : null;
            return {
              ...item,
              scanCount:           qr?.scanCount           ?? item.scanCount,
              commentCount:        qr?.commentCount        ?? item.commentCount,
              isActive:            qr ? qr.isActive !== false : true,
              deactivationMessage: qr?.deactivationMessage ?? null,
            };
          });
          debouncedUpdate(enriched);
        })
        .catch(e => logError("subscribeToUserGeneratedQrs/enrichment", e, { userId }));
    }
  );

  return () => {
    cancelled = true;
    if (debounceTimer) clearTimeout(debounceTimer);
    unsub();
  };
}
