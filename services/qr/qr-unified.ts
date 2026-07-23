import { db } from "@/lib/db/client";
import { tsToString } from "../utils";
import type { UnifiedQr, UnifiedQrStatus, QrType } from "../types";

export type { UnifiedQr, UnifiedQrStatus };

function computeStatus(data: any): UnifiedQrStatus {
  if (data.status === "inactive") return "inactive";
  if (data.expiryDate && new Date(data.expiryDate).getTime() < Date.now()) return "expired";
  if (data.scanLimit != null && (data.scanCount ?? 0) >= data.scanLimit) return "limit_reached";
  return "active";
}

function mapDocToUnifiedQr(id: string, data: any): UnifiedQr {
  return {
    id,
    ownerId: data.ownerId || "",
    ownerName: data.ownerName || "",
    qrType: (data.qrType as QrType) || "individual",
    template: data.template || null,
    title: data.title || null,
    isDynamic: data.isDynamic === true,
    destination: data.destination || "",
    rawDestination: data.rawDestination || data.destination || "",
    contentType: data.contentType || "text",
    businessName: data.businessName || null,
    status: computeStatus(data),
    scanCount: data.scanCount ?? 0,
    downloads: data.downloads ?? 0,
    shares: data.shares ?? 0,
    scanLimit: data.scanLimit ?? null,
    expiryDate: data.expiryDate || null,
    expiryPreset: data.expiryPreset || null,
    design: {
      fgColor: data.design?.fgColor || "#0A0E17",
      bgColor: data.design?.bgColor || "#F8FAFC",
      logoPosition: data.design?.logoPosition || "center",
      logoUri: data.design?.logoUri || null,
      label: data.design?.label || null,
    },
    formValues: data.formValues || null,
    createdAt: tsToString(data.createdAt),
    updatedAt: tsToString(data.updatedAt ?? data.createdAt),
  };
}

export async function createUnifiedQr(params: {
  id: string;
  ownerId: string;
  ownerName: string;
  qrType: QrType;
  template: string | null;
  title: string | null;
  isDynamic: boolean;
  destination: string;
  rawDestination: string;
  contentType: string;
  businessName: string | null;
  scanLimit: number | null;
  expiryDate: string | null;
  expiryPreset: string | null;
  design: {
    fgColor: string;
    bgColor: string;
    logoPosition?: string;
    logoUri?: string | null;
    label?: string | null;
  };
  formValues?: { value: string; extra: Record<string, string> } | null;
}): Promise<void> {
  await db.set(["qrs", params.id], {
    ownerId: params.ownerId,
    ownerName: params.ownerName,
    qrType: params.qrType,
    template: params.template,
    title: params.title,
    isDynamic: params.isDynamic,
    destination: params.destination,
    rawDestination: params.rawDestination,
    contentType: params.contentType,
    businessName: params.businessName,
    status: "active",
    scanCount: 0,
    downloads: 0,
    shares: 0,
    scanLimit: params.scanLimit,
    expiryDate: params.expiryDate,
    expiryPreset: params.expiryPreset,
    design: {
      fgColor: params.design.fgColor,
      bgColor: params.design.bgColor,
      logoPosition: params.design.logoPosition ?? "center",
      logoUri: params.design.logoUri ?? null,
      label: params.design.label ?? null,
    },
    formValues: params.formValues ?? null,
    createdAt: db.timestamp(),
    updatedAt: db.timestamp(),
  });
}

export async function getUnifiedQr(id: string): Promise<UnifiedQr | null> {
  try {
    const data = await db.get(["qrs", id]);
    if (!data) return null;
    return mapDocToUnifiedQr(id, data);
  } catch {
    return null;
  }
}

export async function updateUnifiedQrDesign(
  id: string,
  ownerId: string,
  fields: {
    title?: string | null;
    design?: Partial<UnifiedQr["design"]>;
    scanLimit?: number | null;
    expiryDate?: string | null;
    expiryPreset?: string | null;
  }
): Promise<void> {
  const data = await db.get(["qrs", id]);
  if (!data) throw new Error("QR not found");
  if (data.ownerId !== ownerId) throw new Error("Not authorized");

  const updates: Record<string, any> = { updatedAt: db.timestamp() };
  if (fields.title !== undefined) updates.title = fields.title;
  if (fields.scanLimit !== undefined) updates.scanLimit = fields.scanLimit;
  if (fields.expiryDate !== undefined) updates.expiryDate = fields.expiryDate;
  if (fields.expiryPreset !== undefined) updates.expiryPreset = fields.expiryPreset;
  if (fields.design) {
    const current = data.design ?? {};
    updates.design = { ...current, ...fields.design };
  }

  await db.update(["qrs", id], updates);
}

export async function updateUnifiedQrDestination(
  id: string,
  ownerId: string,
  newDestination: string
): Promise<void> {
  const data = await db.get(["qrs", id]);
  if (!data) throw new Error("QR not found");
  if (data.ownerId !== ownerId) throw new Error("Not authorized");
  if (!data.isDynamic) throw new Error("This QR is not dynamic and cannot be redirected");

  await db.update(["qrs", id], {
    destination: newDestination,
    rawDestination: newDestination,
    updatedAt: db.timestamp(),
  });
}

export async function setUnifiedQrStatus(
  id: string,
  ownerId: string,
  status: "active" | "inactive"
): Promise<void> {
  const data = await db.get(["qrs", id]);
  if (!data) throw new Error("QR not found");
  if (data.ownerId !== ownerId) throw new Error("Not authorized");
  await db.update(["qrs", id], { status, updatedAt: db.timestamp() });
}

export async function incrementUnifiedQrStat(
  id: string,
  field: "downloads" | "shares"
): Promise<void> {
  try {
    await db.increment(["qrs", id], field, 1);
  } catch {
    // best-effort
  }
}

export async function getUserUnifiedQrs(ownerId: string, limitCount = 200): Promise<UnifiedQr[]> {
  try {
    const { docs } = await db.query(["qrs"], {
      where: [{ field: "ownerId", op: "==", value: ownerId }],
      orderBy: { field: "createdAt", direction: "desc" },
      limit: limitCount,
    });
    return docs.map(d => mapDocToUnifiedQr(d.id, d.data));
  } catch {
    return [];
  }
}
