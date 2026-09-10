import { db } from "@/lib/db/client";
import * as Crypto from "expo-crypto";
import { API_BASE_URL } from "@/config/api";
import { detectContentType, getQrCodeId } from "../qr/qr-service";
import { logError } from "./crud";
import { SIGNATURE_SALT } from "../types";
import { COLLECTIONS } from "@/shared/constants/collections";

export async function generateBrandedQr(
  content: string,
  userId: string,
  _displayName: string
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
      await db.update([COLLECTIONS.QR_CODES, qrId], {
        brandedUuid: uuid, isBranded: true, signature,
      });
    } else {
      await db.set([COLLECTIONS.QR_CODES, qrId], {
        content, contentType,
        brandedUuid: uuid, isBranded: true, signature,
        scanCount: 0, commentCount: 0,
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

export async function setQrActiveState(
  qrId: string,
  userId: string,
  isActive: boolean,
  deactivationMessage: string | null
): Promise<void> {
  try {
    const { authAdapter } = await import("@/lib/auth");

    const currentUser = authAdapter.getCurrentUser();
    if (!currentUser) throw new Error("Not authenticated");

    const idToken = await currentUser.getIdToken(false);
    const res = await fetch(`${API_BASE_URL}/api/qr/${encodeURIComponent(qrId)}/active`, {
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
