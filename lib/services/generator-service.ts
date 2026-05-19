import { db, rtdb } from "../db/client";
import * as Crypto from "expo-crypto";
import { tsToString } from "./utils";
import type {
  QrOwnerInfo,
  QrType,
  ScanVelocityBucket,
  GeneratedQrItem,
  VerificationStatus,
} from "./types";
import { detectContentType, getQrCodeId } from "./qr-service";

export type { QrOwnerInfo, QrType, ScanVelocityBucket, GeneratedQrItem, VerificationStatus };

function logError(context: string, error: unknown, meta?: Record<string, unknown>) {
  const err = error instanceof Error ? error : new Error(String(error));
  if (__DEV__) {
    console.error(`[generator-service] ${context}`, { ...meta, error: err.message });
  }
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
    label?: string | null;
  } | null,
  displayDestination?: string | null,
  templateKey?: string | null,
  formValues?: { value: string; extra: Record<string, string> } | null
): Promise<string> {
  const { SIGNATURE_SALT: SALT } = await import("./types");
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
          });
        }
      } catch (e) {
        logError("saveGeneratedQr/qrCodes-write", e, { qrId, userId });
      }
    }

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
          scanCount = qrData.scanCount || scanCount;
          commentCount = qrData.commentCount || commentCount;
          isActive = qrData.isActive !== false;
          deactivationMessage = qrData.deactivationMessage || null;
        }
      } catch (e) {
        logError("getGeneratedQrById/qrCodes-fetch", e, { docId });
      }
    }

    return {
      docId,
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
      scanCount, commentCount,
      qrType: (data.qrType as QrType) || "individual",
      isActive, deactivationMessage,
      businessName: data.businessName || null,
      guardUuid: data.guardUuid || null,
      displayDestination: data.displayDestination || null,
      templateKey: data.templateKey || null,
      formValues: data.formValues || null,
    } as any;
  } catch (e) {
    logError("getGeneratedQrById", e, { docId });
    return null;
  }
}

export async function getUserGeneratedQrs(userId: string): Promise<GeneratedQrItem[]> {
  try {
    const { docs } = await db.query(["users", userId, "generatedQrs"]);

    const items: GeneratedQrItem[] = docs.map((d) => {
      const data = d.data;
      return {
        docId: d.id,
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
    });

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

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
      const base: GeneratedQrItem[] = docs.map((d) => {
        const data = d.data;
        return {
          docId: d.id,
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
      });

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

export async function updateSavedQrContent(
  userId: string,
  docId: string,
  newContent: string
): Promise<void> {
  try {
    const data = await db.get(["users", userId, "generatedQrs", docId]);
    if (!data) throw new Error("QR not found");

    const contentType = detectContentType(newContent);
    const changeEntry = {
      changedAt: new Date().toISOString(),
      from: data.content || "",
      to: newContent,
      changedBy: userId,
    };
    const existingLog: any[] = Array.isArray(data.contentChangeLog) ? data.contentChangeLog : [];
    const updatedLog = [...existingLog, changeEntry].slice(-10);

    await db.update(["users", userId, "generatedQrs", docId], {
      content: newContent,
      contentType,
      contentChangeLog: updatedLog,
      updatedAt: db.timestamp(),
    });
  } catch (e) {
    logError("updateSavedQrContent", e, { userId, docId });
    throw e;
  }
}

export async function updateDisplayDestination(
  userId: string,
  docId: string,
  displayDestination: string
): Promise<void> {
  try {
    await db.update(["users", userId, "generatedQrs", docId], {
      displayDestination,
      updatedAt: db.timestamp(),
    });
  } catch (e) {
    logError("updateDisplayDestination", e, { userId, docId });
    throw e;
  }
}

export async function updateSavedQrFormValues(
  userId: string,
  docId: string,
  newContent: string,
  formValues: { value: string; extra: Record<string, string> }
): Promise<void> {
  try {
    const contentType = detectContentType(newContent);
    await db.update(["users", userId, "generatedQrs", docId], {
      content: newContent,
      contentType,
      formValues,
      updatedAt: db.timestamp(),
    });
  } catch (e) {
    logError("updateSavedQrFormValues", e, { userId, docId });
    throw e;
  }
}

export async function updateQrDesign(
  userId: string,
  docId: string,
  design: {
    fgColor: string;
    bgColor: string;
    logoPosition: string;
    logoUri: string | null;
    label?: string | null;
    scanLimit?: number | null;
    expiryDate?: string | null;
  }
): Promise<void> {
  try {
    await db.update(["users", userId, "generatedQrs", docId], {
      fgColor: design.fgColor,
      bgColor: design.bgColor,
      logoPosition: design.logoPosition,
      logoUri: design.logoUri || null,
      label: design.label || null,
      scanLimit: design.scanLimit ?? null,
      expiryDate: design.expiryDate || null,
    });
  } catch (e) {
    logError("updateQrDesign", e, { userId, docId });
    throw e;
  }
}

export async function generateBrandedQr(
  content: string,
  userId: string,
  displayName: string
): Promise<{ qrId: string; signature: string; uuid: string }> {
  const { SIGNATURE_SALT: SALT } = await import("./types");
  const qrId = await getQrCodeId(content);
  const contentType = detectContentType(content);
  const rawSig = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    content + "|" + userId + "|" + SALT
  );
  const signature = rawSig.slice(0, 32);
  const uuidRaw = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    content + Date.now().toString()
  );
  const uuid = uuidRaw.slice(0, 16).toUpperCase().match(/.{1,4}/g)?.join("-") || uuidRaw.slice(0, 16);

  try {
    const existing = await db.get(["qrCodes", qrId]);
    if (existing) {
      if (!existing.ownerId) {
        await db.update(["qrCodes", qrId], {
          ownerId: userId, ownerName: displayName,
          brandedUuid: uuid, isBranded: true, signature,
        });
      }
    } else {
      await db.set(["qrCodes", qrId], {
        content, contentType, ownerId: userId, ownerName: displayName,
        brandedUuid: uuid, isBranded: true, signature,
        ownerVerified: false, scanCount: 0, commentCount: 0,
        createdAt: db.timestamp(),
      });
    }
    await db.add(["users", userId, "generatedQrs"], {
      content, contentType, uuid, branded: true, qrCodeId: qrId,
      signature, scanCount: 0, commentCount: 0, createdAt: db.timestamp(),
    });
  } catch (e) {
    logError("generateBrandedQr", e, { userId, qrId });
    throw new Error("Could not generate branded QR. Please try again.");
  }

  return { qrId, signature, uuid };
}

export async function getScanVelocity(qrId: string): Promise<ScanVelocityBucket[]> {
  const now = Date.now();
  const cutoff = now - 24 * 60 * 60 * 1000;
  const buckets: ScanVelocityBucket[] = Array.from({ length: 24 }, (_, i) => {
    const h = new Date(cutoff + i * 60 * 60 * 1000);
    const hour = h.getHours();
    const label = hour === 0 ? "12a" : hour < 12 ? `${hour}a` : hour === 12 ? "12p" : `${hour - 12}p`;
    return { hour: i, label, count: 0 };
  });
  try {
    const data = await rtdb.get(`qrScanVelocity/${qrId}`);
    if (data) {
      for (const key of Object.keys(data)) {
        const { ts } = data[key];
        if (ts >= cutoff) {
          const bucketIdx = Math.floor((ts - cutoff) / (60 * 60 * 1000));
          if (bucketIdx >= 0 && bucketIdx < 24) buckets[bucketIdx].count++;
        }
      }
    }
  } catch {
    // Permission denied or network error — return empty buckets silently
  }
  return buckets;
}

export async function submitVerificationRequest(
  userId: string,
  qrId: string,
  businessName: string,
  businessIdBase64: string
): Promise<void> {
  try {
    const { docs } = await db.query(["verificationRequests"], {
      where: [
        { field: "userId", op: "==", value: userId },
        { field: "qrId",   op: "==", value: qrId   },
      ],
      limit: 1,
    });
    if (docs.length > 0) {
      await db.update(["verificationRequests", docs[0].id], {
        businessName, businessIdBase64, status: "pending", updatedAt: db.timestamp(),
      });
      return;
    }
    await db.add(["verificationRequests"], {
      userId, qrId, businessName, businessIdBase64,
      status: "pending", createdAt: db.timestamp(),
    });
  } catch (e) {
    logError("submitVerificationRequest", e, { userId, qrId });
    throw e;
  }
}

export async function getVerificationStatus(userId: string, qrId: string): Promise<VerificationStatus> {
  try {
    const { docs } = await db.query(["verificationRequests"], {
      where: [
        { field: "userId", op: "==", value: userId },
        { field: "qrId",   op: "==", value: qrId   },
      ],
      limit: 1,
    });
    if (docs.length === 0) return { status: "none" };
    const d = docs[0].data;
    return {
      status: d.status || "pending",
      businessName: d.businessName,
      submittedAt: tsToString(d.createdAt),
    };
  } catch (e) {
    logError("getVerificationStatus", e, { userId, qrId });
    return { status: "none" };
  }
}

export async function getQrOwnerInfo(qrId: string): Promise<QrOwnerInfo | null> {
  try {
    const data = await db.get(["qrCodes", qrId]);
    if (!data) return null;
    if (!data.isBranded || !data.ownerId) return null;
    return {
      ownerId: data.ownerId,
      ownerName: data.ownerName || "Unknown",
      brandedUuid: data.brandedUuid || "",
      isBranded: true,
      isVerified: data.ownerVerified || false,
      signature: data.signature,
      ownerVerified: data.ownerVerified || false,
      qrType: (data.qrType as QrType) || "individual",
      isActive: data.isActive !== false,
      deactivationMessage: data.deactivationMessage || null,
      businessName: data.businessName || null,
      ownerLogoBase64: data.ownerLogoBase64 || null,
    };
  } catch (e) {
    logError("getQrOwnerInfo", e, { qrId });
    return null;
  }
}

export async function setQrActiveState(
  qrId: string,
  userId: string,
  isActive: boolean,
  deactivationMessage: string | null
): Promise<void> {
  try {
    const { firebaseAuth } = await import("../firebase");
    const { getIdToken } = await import("firebase/auth");

    const currentUser = firebaseAuth.currentUser;
    if (!currentUser) throw new Error("Not authenticated");

    const idToken = await getIdToken(currentUser, false);

    const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
      ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
      : "";

    const res = await fetch(`${BASE_URL}/api/qr/${encodeURIComponent(qrId)}/active`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`,
      },
      body: JSON.stringify({ isActive, deactivationMessage }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).error || "Could not update QR code");
    }
  } catch (e) {
    logError("setQrActiveState", e, { qrId, userId, isActive });
    throw e;
  }
}
