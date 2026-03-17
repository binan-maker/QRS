import { firestore } from "../firebase";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
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
  await setDoc(doc(firestore, "guardLinks", uuid), {
    uuid,
    currentDestination: destination,
    previousDestination: null,
    businessName: businessName || null,
    ownerName,
    ownerId,
    isActive: true,
    destinationChangedAt: null,
    createdAt: serverTimestamp(),
  });
}

export async function updateGuardLinkDestination(
  uuid: string,
  newDestination: string,
  userId: string
): Promise<void> {
  const ref = doc(firestore, "guardLinks", uuid);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Guard link not found");
  const data = snap.data();
  if (data.ownerId !== userId) throw new Error("Not authorized");
  await updateDoc(ref, {
    previousDestination: data.currentDestination,
    currentDestination: newDestination,
    destinationChangedAt: serverTimestamp(),
  });
}

export async function getGuardLink(uuid: string): Promise<GuardLink | null> {
  try {
    const snap = await getDoc(doc(firestore, "guardLinks", uuid));
    if (!snap.exists()) return null;
    const d = snap.data();
    return {
      uuid,
      currentDestination: d.currentDestination || "",
      previousDestination: d.previousDestination || null,
      businessName: d.businessName || null,
      ownerName: d.ownerName || "",
      ownerId: d.ownerId || "",
      isActive: d.isActive !== false,
      destinationChangedAt: d.destinationChangedAt ? tsToString(d.destinationChangedAt) : null,
      createdAt: tsToString(d.createdAt),
    };
  } catch (e) {
    console.warn("[firestore] getGuardLink failed:", e);
    return null;
  }
}

export async function setGuardLinkActive(
  uuid: string,
  userId: string,
  isActive: boolean
): Promise<void> {
  const ref = doc(firestore, "guardLinks", uuid);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Guard link not found");
  if (snap.data().ownerId !== userId) throw new Error("Not authorized");
  await updateDoc(ref, { isActive });
}
