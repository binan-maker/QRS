import { db } from "@/lib/db/client";
import { detectContentType } from "../qr-service";
import { logError } from "./crud";

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

    const batch = db.batch();
    batch.update(["users", userId, "generatedQrs", docId], {
      content: newContent,
      contentType,
      contentChangeLog: updatedLog,
      updatedAt: db.timestamp(),
    });
    if (data.qrCodeId) {
      batch.update(["qrCodes", data.qrCodeId], {
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
    const data = await db.get(["users", userId, "generatedQrs", docId]);
    if (!data) throw new Error("QR not found");

    const batch = db.batch();
    batch.update(["users", userId, "generatedQrs", docId], {
      displayDestination,
      updatedAt: db.timestamp(),
    });
    if (data.qrCodeId) {
      batch.update(["qrCodes", data.qrCodeId], {
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
    const data = await db.get(["users", userId, "generatedQrs", docId]);
    if (!data) throw new Error("QR not found");

    const contentType = detectContentType(newContent);

    const batch = db.batch();
    batch.update(["users", userId, "generatedQrs", docId], {
      content: newContent,
      contentType,
      formValues,
      updatedAt: db.timestamp(),
    });
    if (data.qrCodeId) {
      batch.update(["qrCodes", data.qrCodeId], {
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
    const batch = db.batch();
    batch.update(["users", userId, "generatedQrs", docId], {
      fgColor: design.fgColor,
      bgColor: design.bgColor,
      logoPosition: design.logoPosition,
      logoUri: design.logoUri || null,
      label: design.label || null,
      scanLimit: design.scanLimit ?? null,
      expiryDate: design.expiryDate || null,
      expiryPreset: design.expiryPreset || null,
    });

    // Sync scanLimit + expiryDate into the public link doc so server-side
    // enforcement (scan counting, auto-deactivation) uses the latest values.
    const limitFields = {
      scanLimit: design.scanLimit ?? null,
      expiryDate: design.expiryDate || null,
    };
    if (design.standardLinkUuid) {
      batch.update(["standardLinks", design.standardLinkUuid], limitFields);
    }
    if (design.guardLinkUuid) {
      batch.update(["guardLinks", design.guardLinkUuid], limitFields);
    }

    await batch.commit();
  } catch (e) {
    logError("updateQrDesign", e, { userId, docId });
    throw e;
  }
}
