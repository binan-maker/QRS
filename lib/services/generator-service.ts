import { firestore, realtimeDB, firebaseAuth } from "../firebase";
import {
  doc,
  collection,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  orderBy,
  limit as firestoreLimit,
  serverTimestamp,
  onSnapshot,
  where,
} from "firebase/firestore";
import {
  ref as dbRef,
  get as dbGet,
} from "firebase/database";
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
  await addDoc(collection(firestore, "users", userId, "generatedQrs"), {
    content, contentType, uuid, branded,
    qrCodeId: qrId, qrType,
    businessName: businessName || null,
    guardUuid: guardUuid || null,
    ...(signature ? { signature } : {}),
    createdAt: serverTimestamp(),
  });
  if (branded) {
    const qrRef = doc(firestore, "qrCodes", qrId);
    const snap = await getDoc(qrRef);
    if (snap.exists()) {
      const data = snap.data();
      if (!data.ownerId) {
        await updateDoc(qrRef, {
          ownerId: userId, ownerName: displayName,
          brandedUuid: uuid, isBranded: true,
          qrType, isActive: true,
          businessName: businessName || null,
          ...(signature ? { signature } : {}),
          ...(ownerLogoBase64 ? { ownerLogoBase64 } : {}),
        });
      }
    } else {
      await setDoc(qrRef, {
        content, contentType,
        createdAt: serverTimestamp(),
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
    try { await firebaseAuth.currentUser?.getIdToken(true); } catch {}
    const snap = await getDocs(collection(firestore, "users", userId, "generatedQrs"));
    const items: GeneratedQrItem[] = [];
    for (const d of snap.docs) {
      const data = d.data();
      let scanCount = 0;
      let commentCount = 0;
      let isActive = true;
      let deactivationMessage: string | null = null;
      if (data.qrCodeId) {
        try {
          const qrSnap = await getDoc(doc(firestore, "qrCodes", data.qrCodeId));
          if (qrSnap.exists()) {
            const qrData = qrSnap.data();
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
    console.warn("[firestore] getUserGeneratedQrs failed:", e);
    return [];
  }
}

export function subscribeToUserGeneratedQrs(
  userId: string,
  onUpdate: (items: GeneratedQrItem[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(
    collection(firestore, "users", userId, "generatedQrs"),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(
    q,
    (snap) => {
      const items: GeneratedQrItem[] = snap.docs.map((d) => {
        const data = d.data();
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
    },
    (err) => {
      console.warn("[firestore] subscribeToUserGeneratedQrs error:", err);
      if (onError) onError(err);
    }
  );
}

export async function updateQrDesign(
  userId: string,
  docId: string,
  design: { fgColor: string; bgColor: string; logoPosition: string; logoUri: string | null }
): Promise<void> {
  try {
    await updateDoc(doc(firestore, "users", userId, "generatedQrs", docId), {
      fgColor: design.fgColor,
      bgColor: design.bgColor,
      logoPosition: design.logoPosition,
      logoUri: design.logoUri || null,
    });
  } catch (e) {
    console.warn("[firestore] updateQrDesign failed:", e);
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
  const qrRef = doc(firestore, "qrCodes", qrId);
  const snap = await getDoc(qrRef);
  if (snap.exists()) {
    const existing = snap.data();
    if (!existing.ownerId) {
      await updateDoc(qrRef, {
        ownerId: userId, ownerName: displayName,
        brandedUuid: uuid, isBranded: true, signature,
      });
    }
  } else {
    await setDoc(qrRef, {
      content, contentType, ownerId: userId, ownerName: displayName,
      brandedUuid: uuid, isBranded: true, signature,
      ownerVerified: false, scanCount: 0, commentCount: 0,
      createdAt: serverTimestamp(),
    });
  }
  await addDoc(collection(firestore, "users", userId, "generatedQrs"), {
    content, contentType, uuid, branded: true, qrCodeId: qrId,
    signature, createdAt: serverTimestamp(),
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
    const snapshot = await dbGet(dbRef(realtimeDB, `qrScanVelocity/${qrId}`));
    if (snapshot.exists()) {
      snapshot.forEach((child: any) => {
        const { ts } = child.val();
        if (ts >= cutoff) {
          const bucketIdx = Math.floor((ts - cutoff) / (60 * 60 * 1000));
          if (bucketIdx >= 0 && bucketIdx < 24) buckets[bucketIdx].count++;
        }
      });
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
  const existing = query(
    collection(firestore, "verificationRequests"),
    where("userId", "==", userId),
    where("qrId", "==", qrId),
    firestoreLimit(1)
  );
  const snap = await getDocs(existing);
  if (!snap.empty) {
    const docId = snap.docs[0].id;
    await updateDoc(doc(firestore, "verificationRequests", docId), {
      businessName, businessIdBase64, status: "pending", updatedAt: serverTimestamp(),
    });
    return;
  }
  await addDoc(collection(firestore, "verificationRequests"), {
    userId, qrId, businessName, businessIdBase64,
    status: "pending", createdAt: serverTimestamp(),
  });
}

export async function getVerificationStatus(userId: string, qrId: string): Promise<VerificationStatus> {
  try {
    const q = query(
      collection(firestore, "verificationRequests"),
      where("userId", "==", userId),
      where("qrId", "==", qrId),
      firestoreLimit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return { status: "none" };
    const d = snap.docs[0].data();
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
    const snap = await getDoc(doc(firestore, "qrCodes", qrId));
    if (!snap.exists()) return null;
    const d = snap.data();
    if (!d.isBranded || !d.ownerId) return null;
    return {
      ownerId: d.ownerId,
      ownerName: d.ownerName || "Unknown",
      brandedUuid: d.brandedUuid || "",
      isBranded: true,
      signature: d.signature,
      ownerVerified: d.ownerVerified || false,
      qrType: (d.qrType as QrType) || "individual",
      isActive: d.isActive !== false,
      deactivationMessage: d.deactivationMessage || null,
      businessName: d.businessName || null,
      ownerLogoBase64: d.ownerLogoBase64 || null,
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
  const qrRef = doc(firestore, "qrCodes", qrId);
  const snap = await getDoc(qrRef);
  if (!snap.exists()) throw new Error("QR code not found");
  const data = snap.data();
  if (data.qrType === "government") throw new Error("Government QR codes cannot be modified");
  if (data.ownerId !== userId) throw new Error("Only the owner can modify this QR code");
  await updateDoc(qrRef, {
    isActive,
    deactivationMessage: isActive ? null : (deactivationMessage?.trim().slice(0, 100) || null),
  });
}
