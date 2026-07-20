import { db } from "@/lib/db/client";
import * as Crypto from "expo-crypto";
import { detectContentType, getQrCodeId } from "../qr-service";
import { logError } from "./crud";
import type { QrOwnerInfo, QrType } from "../types";
import { SIGNATURE_SALT } from "../types";
import { COLLECTIONS } from "@/shared/constants/collections";

export type { QrOwnerInfo };

export async function generateBrandedQr(
  content: string,
  userId: string,
  displayName: string
): Promise<{ qrId: string; signature: string; uuid: string }> {
  const SALT = SIGNATURE_SALT;
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
    const existing = await db.get([COLLECTIONS.QR_CODES, qrId]);
    if (existing) {
      if (!existing.ownerId) {
        await db.update([COLLECTIONS.QR_CODES, qrId], {
          ownerId: userId, ownerName: displayName,
          brandedUuid: uuid, isBranded: true, signature,
        });
      }
    } else {
      await db.set([COLLECTIONS.QR_CODES, qrId], {
        content, contentType, ownerId: userId, ownerName: displayName,
        brandedUuid: uuid, isBranded: true, signature,
        ownerVerified: false, scanCount: 0, commentCount: 0,
        createdAt: db.timestamp(),
      });
    }
    await db.add([COLLECTIONS.USERS, userId, COLLECTIONS.GENERATED_QRS], {
      content, contentType, uuid, branded: true, qrCodeId: qrId,
      signature, scanCount: 0, commentCount: 0, createdAt: db.timestamp(),
    });
  } catch (e) {
    logError("generateBrandedQr", e, { userId, qrId });
    throw new Error("Could not generate branded QR. Please try again.");
  }

  return { qrId, signature, uuid };
}

export async function getQrOwnerInfo(qrId: string): Promise<QrOwnerInfo | null> {
  try {
    const data = await db.get([COLLECTIONS.QR_CODES, qrId]);
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
    const { firebaseAuth } = await import("../../lib/firebase");
    const { getIdToken } = await import("firebase/auth");

    const currentUser = firebaseAuth.currentUser;
    if (!currentUser) throw new Error("Not authenticated");

    const idToken = await getIdToken(currentUser, false);
    const raw = process.env.EXPO_PUBLIC_DOMAIN;
    const BASE_URL = raw ? `https://${raw.split(":")[0]}` : "";

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
