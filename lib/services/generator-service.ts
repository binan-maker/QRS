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
  guardUuid?: string | null
): Promise<void> {
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
    } catch {}
  }
  await db.add(["users", userId, "generatedQrs"], {
    content, contentType, uuid, branded,
    qrCodeId: qrId, qrType,
    businessName: businessName || null,
    guardUuid: guardUuid || null,
    ...(signature ? { signature } : {}),
    createdAt: db.timestamp(),
  });
  if (branded) {
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
  }
}

export async function getUserGeneratedQrs(userId: string): Promise<GeneratedQrItem[]> {
  try {
    const { docs } = await db.query(["users", userId, "generatedQrs"]);
    const items: GeneratedQrItem[] = [];
    for (const d of docs) {
      const data = d.data;
      let scanCount = 0;
      let commentCount = 0;
      let isActive = true;
      let deactivationMessage: string | null = null;
      if (data.qrCodeId) {
        try {
          const qrData = await db.get(["qrCodes", data.qrCodeId]);
          if (qrData) {
            scanCount = qrData.scanCount || 0;
            commentCount = qrData.commentCount || 0;
            isActive = qrData.isActive !== false;
            deactivationMessage = qrData.deactivationMessage || null;
          }
        } catch {}
      }
      items.push({
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
        scanCount, commentCount,
        qrType: (data.qrType as QrType) || "individual",
        isActive, deactivationMessage,
        businessName: data.businessName || null,
        guardUuid: data.guardUuid || null,
      });
    }
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return items;
  } catch (e) {
    console.warn("[db] getUserGeneratedQrs failed:", e);
    return [];
  }
}

export function subscribeToUserGeneratedQrs(
  userId: string,
  onUpdate: (items: GeneratedQrItem[]) => void,
  onError?: (err: Error) => void
): () => void {
  return db.onQuery(
    ["users", userId, "generatedQrs"],
    { orderBy: { field: "createdAt", direction: "desc" } },
    (docs) => {
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
          scanCount: data.scanCount || 0,
          commentCount: data.commentCount || 0,
          qrType: (data.qrType as QrType) || "individual",
          isActive: data.isActive !== false,
          deactivationMessage: data.deactivationMessage || null,
          businessName: data.businessName || null,
          guardUuid: data.guardUuid || null,
        };
      });
      onUpdate(items);
    }
  );
}

export async function updateQrDesign(
  userId: string,
  docId: string,
  design: { fgColor: string; bgColor: string; logoPosition: string; logoUri: string | null }
): Promise<void> {
  try {
    await db.update(["users", userId, "generatedQrs", docId], {
      fgColor: design.fgColor,
      bgColor: design.bgColor,
      logoPosition: design.logoPosition,
      logoUri: design.logoUri || null,
    });
  } catch (e) {
    console.warn("[db] updateQrDesign failed:", e);
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
    signature, createdAt: db.timestamp(),
  });
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
  } catch {}
  return buckets;
}

export async function submitVerificationRequest(
  userId: string,
  qrId: string,
  businessName: string,
  businessIdBase64: string
): Promise<void> {
  const { docs } = await db.query(["verificationRequests"], {
    where: [
      { field: "userId", op: "==", value: userId },
      { field: "qrId", op: "==", value: qrId },
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
}

export async function getVerificationStatus(userId: string, qrId: string): Promise<VerificationStatus> {
  try {
    const { docs } = await db.query(["verificationRequests"], {
      where: [
        { field: "userId", op: "==", value: userId },
        { field: "qrId", op: "==", value: qrId },
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
  } catch {
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
      signature: data.signature,
      ownerVerified: data.ownerVerified || false,
      qrType: (data.qrType as QrType) || "individual",
      isActive: data.isActive !== false,
      deactivationMessage: data.deactivationMessage || null,
      businessName: data.businessName || null,
      ownerLogoBase64: data.ownerLogoBase64 || null,
    };
  } catch {
    return null;
  }
}

export async function setQrActiveState(
  qrId: string,
  userId: string,
  isActive: boolean,
  deactivationMessage: string | null
): Promise<void> {
  const data = await db.get(["qrCodes", qrId]);
  if (!data) throw new Error("QR code not found");
  if (data.qrType === "government") throw new Error("Government QR codes cannot be modified");
  if (data.ownerId !== userId) throw new Error("Only the owner can modify this QR code");
  await db.update(["qrCodes", qrId], {
    isActive,
    deactivationMessage: isActive ? null : (deactivationMessage?.trim().slice(0, 100) || null),
  });
}
