import { db } from "../db/client";
import { tsToString } from "./utils";
import type { GuardLink } from "./types";

export type { GuardLink };

export async function saveGuardLink(
  uuid: string,
  destination: string,
  businessName: string | null,
  ownerName: string,
  ownerId: string
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
  await db.update(["guardLinks", uuid], {
    previousDestination: data.currentDestination,
    currentDestination: newDestination,
    destinationChangedAt: db.timestamp(),
  });
}

export async function getGuardLink(uuid: string): Promise<GuardLink | null> {
  try {
    const data = await db.get(["guardLinks", uuid]);
    if (!data) return null;
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
