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

    await db.update(["users", userId, "generatedQrs", docId], {
      content: newContent,
      contentType,
      contentChangeLog: updatedLog,
      updatedAt: db.timestamp(),
    });

    if (data.qrCodeId) {
      try {
        await db.update(["qrCodes", data.qrCodeId], {
          content: newContent,
          contentType,
          updatedAt: db.timestamp(),
        });
      } catch (e) {
        logError("updateSavedQrContent/qrCodes-sync", e, { docId });
      }
    }
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

    try {
      const data = await db.get(["users", userId, "generatedQrs", docId]);
      if (data?.qrCodeId) {
        await db.update(["qrCodes", data.qrCodeId], {
          displayDestination,
          updatedAt: db.timestamp(),
        });
      }
    } catch (e) {
      logError("updateDisplayDestination/qrCodes-sync", e, { docId });
    }
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

    try {
      const data = await db.get(["users", userId, "generatedQrs", docId]);
      if (data?.qrCodeId) {
        await db.update(["qrCodes", data.qrCodeId], {
          content: newContent,
          contentType,
          formValues,
          updatedAt: db.timestamp(),
        });
      }
    } catch (e) {
      logError("updateSavedQrFormValues/qrCodes-sync", e, { docId });
    }
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
