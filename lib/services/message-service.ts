import { firestore } from "../firebase";
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit as firestoreLimit,
  onSnapshot,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { tsToString } from "./utils";
import type { QrMessage } from "./types";

export type { QrMessage };

export async function sendMessageToQrOwner(
  fromUserId: string,
  fromDisplayName: string,
  toUserId: string,
  qrCodeId: string,
  qrBrandedUuid: string,
  message: string
): Promise<void> {
  await addDoc(collection(firestore, "qrMessages"), {
    fromUserId,
    fromDisplayName,
    toUserId,
    qrCodeId,
    qrBrandedUuid,
    message,
    read: false,
    createdAt: new Date().toISOString(),
  });
}

export function subscribeToQrMessages(
  ownerUserId: string,
  qrCodeId: string,
  onUpdate: (msgs: QrMessage[]) => void
): () => void {
  const q = query(
    collection(firestore, "qrMessages"),
    orderBy("createdAt", "desc"),
    firestoreLimit(50)
  );
  return onSnapshot(q, (snap) => {
    const msgs: QrMessage[] = snap.docs
      .filter((d) => {
        const data = d.data();
        return data.toUserId === ownerUserId && data.qrCodeId === qrCodeId;
      })
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          fromUserId: data.fromUserId,
          fromDisplayName: data.fromDisplayName || "User",
          toUserId: data.toUserId,
          qrCodeId: data.qrCodeId,
          qrBrandedUuid: data.qrBrandedUuid || "",
          message: data.message,
          read: data.read || false,
          createdAt: tsToString(data.createdAt),
        };
      });
    onUpdate(msgs);
  }, () => {});
}

export async function markQrMessageRead(messageId: string): Promise<void> {
  try {
    await updateDoc(doc(firestore, "qrMessages", messageId), { read: true });
  } catch {}
}

export async function getUnreadMessageCount(ownerUserId: string): Promise<number> {
  try {
    const snap = await getDocs(query(collection(firestore, "qrMessages")));
    let count = 0;
    snap.forEach((d) => {
      const data = d.data();
      if (data.toUserId === ownerUserId && !data.read) count++;
    });
    return count;
  } catch {
    return 0;
  }
}
