import { db } from "../db";
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
  await db.add(["qrMessages"], {
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

// ── Cost optimization: filter by toUserId + qrCodeId in the query instead of
//    reading ALL qrMessages and filtering client-side.
export function subscribeToQrMessages(
  ownerUserId: string,
  qrCodeId: string,
  onUpdate: (msgs: QrMessage[]) => void
): () => void {
  return db.onQuery(
    ["qrMessages"],
    {
      where: [
        { field: "toUserId", op: "==", value: ownerUserId },
        { field: "qrCodeId", op: "==", value: qrCodeId },
      ],
      orderBy: { field: "createdAt", direction: "desc" },
      limit: 50,
    },
    (docs) => {
      const msgs: QrMessage[] = docs.map((d) => ({
        id: d.id,
        fromUserId: d.data.fromUserId,
        fromDisplayName: d.data.fromDisplayName || "User",
        toUserId: d.data.toUserId,
        qrCodeId: d.data.qrCodeId,
        qrBrandedUuid: d.data.qrBrandedUuid || "",
        message: d.data.message,
        read: d.data.read || false,
        createdAt: tsToString(d.data.createdAt),
      }));
      onUpdate(msgs);
    }
  );
}

export async function markQrMessageRead(messageId: string): Promise<void> {
  try {
    await db.update(["qrMessages", messageId], { read: true });
  } catch {}
}

// ── Cost optimization: query only unread messages for this owner.
export async function getUnreadMessageCount(ownerUserId: string): Promise<number> {
  try {
    const { docs } = await db.query(["qrMessages"], {
      where: [
        { field: "toUserId", op: "==", value: ownerUserId },
        { field: "read", op: "==", value: false },
      ],
    });
    return docs.length;
  } catch {
    return 0;
  }
}
