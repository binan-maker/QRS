import { db } from "../db/client";
import { tsToString } from "./utils";
import { detectContentType } from "./qr-service";
import type { GuardLink } from "./types";

export type { GuardLink };

export async function saveGuardLink(
  uuid: string,
  destination: string,
  businessName: string | null,
  ownerName: string,
  ownerId: string,
  contentType?: string
): Promise<void> {
  await db.set(["guardLinks", uuid], {
    uuid,
    currentDestination: destination,
    previousDestination: null,
    businessName: businessName || null,
    ownerName,
    ownerId,
    isActive: true,
    destinationChangedAt: null,
    createdAt: db.timestamp(),
    ...(contentType ? { contentType } : {}),
  });
}

export async function updateGuardLinkDestination(
  uuid: string,
  newDestination: string,
  userId: string
): Promise<void> {
  const data = await db.get(["guardLinks", uuid]);
  if (!data) throw new Error("Guard link not found");
  if (data.ownerId !== userId) throw new Error("Not authorized");

  const changeEntry = {
    changedAt: new Date().toISOString(),
    from: data.currentDestination,
    to: newDestination,
    changedBy: userId,
  };

  const existingLog: any[] = Array.isArray(data.changeLog) ? data.changeLog : [];
  const updatedLog = [...existingLog, changeEntry].slice(-10);

  await db.update(["guardLinks", uuid], {
    previousDestination: data.currentDestination,
    currentDestination: newDestination,
    destinationChangedAt: db.timestamp(),
    changeLog: updatedLog,
  });
}

export async function getGuardLink(uuid: string): Promise<GuardLink | null> {
  try {
    const data = await db.get(["guardLinks", uuid]);
    if (!data) return null;
    const rawLog: any[] = Array.isArray(data.changeLog) ? data.changeLog : [];
    const changeLog = rawLog.map((e: any) => ({
      changedAt: typeof e.changedAt === "string" ? e.changedAt : new Date().toISOString(),
      from: e.from || "",
      to: e.to || "",
      changedBy: e.changedBy || "",
    }));

    return {
      uuid,
      currentDestination: data.currentDestination || "",
      previousDestination: data.previousDestination || null,
      businessName: data.businessName || null,
      ownerName: data.ownerName || "",
      ownerId: data.ownerId || "",
      isActive: data.isActive !== false,
      destinationChangedAt: data.destinationChangedAt ? tsToString(data.destinationChangedAt) : null,
      createdAt: tsToString(data.createdAt),
      changeLog,
      contentType: data.contentType || undefined,
    };
  } catch (e) {
    console.warn("[db] getGuardLink failed:", e);
    return null;
  }
}

export async function setGuardLinkActive(
  uuid: string,
  userId: string,
  isActive: boolean
): Promise<void> {
  const data = await db.get(["guardLinks", uuid]);
  if (!data) throw new Error("Guard link not found");
  if (data.ownerId !== userId) throw new Error("Not authorized");
  await db.update(["guardLinks", uuid], { isActive });
}

export async function saveStandardLink(
  uuid: string,
  rawContent: string,
  contentType: string,
  ownerId: string,
  ownerName: string
): Promise<void> {
  await db.set(["standardLinks", uuid], {
    uuid,
    rawContent,
    contentType,
    ownerId,
    ownerName,
    isActive: true,
    createdAt: db.timestamp(),
  });
}

export async function updateStandardLinkRawContent(
  uuid: string,
  newRawContent: string,
  userId: string
): Promise<void> {
  const data = await db.get(["standardLinks", uuid]);
  if (!data) throw new Error("Standard link not found");
  if (data.ownerId !== userId) throw new Error("Not authorized");
  await db.update(["standardLinks", uuid], {
    rawContent: newRawContent,
    contentType: detectContentType(newRawContent),
    updatedAt: db.timestamp(),
  });
}

export async function getStandardLink(uuid: string): Promise<{ rawContent: string; contentType: string; ownerId: string; ownerName: string; isActive: boolean } | null> {
  try {
    const data = await db.get(["standardLinks", uuid]);
    if (!data) return null;
    return {
      rawContent: data.rawContent || "",
      contentType: data.contentType || "text",
      ownerId: data.ownerId || "",
      ownerName: data.ownerName || "",
      isActive: data.isActive !== false,
    };
  } catch (e) {
    console.warn("[db] getStandardLink failed:", e);
    return null;
  }
}
