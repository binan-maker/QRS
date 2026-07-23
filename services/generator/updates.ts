import { db } from "@/lib/db/client";
import { detectContentType } from "../qr/qr-service";
import { logError } from "./crud";
import { updateUnifiedQrDesign } from "../qr/qr-unified";
import { COLLECTIONS } from "@/shared/constants/collections";

export async function updateSavedQrContent(
  userId: string,
  docId: string,
  newContent: string
): Promise<void> {
  try {
    const data = await db.get([COLLECTIONS.USERS, userId, COLLECTIONS.GENERATED_QRS, docId]);
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

    const batch = db.batch();
    batch.update([COLLECTIONS.USERS, userId, COLLECTIONS.GENERATED_QRS, docId], {
      content: newContent,
      contentType,
      contentChangeLog: updatedLog,
      updatedAt: db.timestamp(),
    });
    if (data.qrCodeId) {
      batch.update([COLLECTIONS.QR_CODES, data.qrCodeId], {
        content: newContent,
        contentType,
        updatedAt: db.timestamp(),
      });
    }
    await batch.commit();
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
    const data = await db.get([COLLECTIONS.USERS, userId, COLLECTIONS.GENERATED_QRS, docId]);
    if (!data) throw new Error("QR not found");

    const batch = db.batch();
    batch.update([COLLECTIONS.USERS, userId, COLLECTIONS.GENERATED_QRS, docId], {
      displayDestination,
      updatedAt: db.timestamp(),
    });
    if (data.qrCodeId) {
      batch.update([COLLECTIONS.QR_CODES, data.qrCodeId], {
        displayDestination,
        updatedAt: db.timestamp(),
      });
    }
    await batch.commit();
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
    const data = await db.get([COLLECTIONS.USERS, userId, COLLECTIONS.GENERATED_QRS, docId]);
    if (!data) throw new Error("QR not found");

    const contentType = detectContentType(newContent);

    const batch = db.batch();
    batch.update([COLLECTIONS.USERS, userId, COLLECTIONS.GENERATED_QRS, docId], {
      content: newContent,
      contentType,
      formValues,
      updatedAt: db.timestamp(),
    });
    if (data.qrCodeId) {
      batch.update([COLLECTIONS.QR_CODES, data.qrCodeId], {
        content: newContent,
        contentType,
        formValues,
        updatedAt: db.timestamp(),
      });
    }
    await batch.commit();
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
    expiryPreset?: string | null;
    standardLinkUuid?: string | null;
    guardLinkUuid?: string | null;
  }
): Promise<void> {
  try {
    const data = await db.get([COLLECTIONS.USERS, userId, COLLECTIONS.GENERATED_QRS, docId]);
    const uuid: string | null = data?.uuid || null;

    // ── Primary write: user's own generatedQrs doc (always required) ──────────
    await db.update([COLLECTIONS.USERS, userId, COLLECTIONS.GENERATED_QRS, docId], {
      fgColor: design.fgColor,
      bgColor: design.bgColor,
      logoPosition: design.logoPosition,
      logoUri: design.logoUri || null,
      label: design.label || null,
      scanLimit: design.scanLimit ?? null,
      expiryDate: design.expiryDate || null,
      expiryPreset: design.expiryPreset || null,
    });

    // ── Secondary writes: best-effort syncs, each isolated ───────────────────
    // standardLinks / guardLinks only exist for legacy QRs. New-model QRs store
    // everything in qrs/{uuid}. Wrap each separately so a missing or inaccessible
    // doc never fails the primary write above.
    const limitFields = {
      scanLimit: design.scanLimit ?? null,
      expiryDate: design.expiryDate || null,
    };
    if (design.standardLinkUuid) {
      db.update([COLLECTIONS.STANDARD_LINKS, design.standardLinkUuid], limitFields).catch(() => {});
    }
    if (design.guardLinkUuid) {
      db.update([COLLECTIONS.GUARD_LINKS, design.guardLinkUuid], limitFields).catch(() => {});
    }

    // ── Unified qrs/{uuid} sync (new-model QRs) ───────────────────────────────
    if (uuid) {
      updateUnifiedQrDesign(uuid, userId, {
        title: design.label || null,
        design: {
          fgColor: design.fgColor,
          bgColor: design.bgColor,
          logoPosition: design.logoPosition,
          logoUri: design.logoUri,
          label: design.label || null,
        },
        scanLimit: design.scanLimit ?? null,
        expiryDate: design.expiryDate || null,
        expiryPreset: design.expiryPreset || null,
      }).catch(() => {});
    }
  } catch (e) {
    logError("updateQrDesign", e, { userId, docId });
    throw e;
  }
}
