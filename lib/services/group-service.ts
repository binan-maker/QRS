import { db } from "../db/client";

export interface QrGroup {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  qrDocIds: string[];
  createdAt: string;
  updatedAt: string;
}

const GROUP_COLORS = [
  "#6366F1", "#0EA5E9", "#10B981", "#F59E0B",
  "#EF4444", "#8B5CF6", "#EC4899", "#F97316",
];

export function getDefaultGroupColor(index: number): string {
  return GROUP_COLORS[index % GROUP_COLORS.length];
}

export function subscribeToUserGroups(
  userId: string,
  callback: (groups: QrGroup[]) => void
): () => void {
  return db.onQuery(
    ["users", userId, "qrGroups"],
    { orderBy: { field: "createdAt", direction: "desc" } },
    (docs) => {
      const groups: QrGroup[] = docs.map((d) => ({
        id: d.id,
        name: d.data.name ?? "Unnamed Group",
        description: d.data.description ?? "",
        color: d.data.color ?? "#6366F1",
        icon: d.data.icon ?? "folder-outline",
        qrDocIds: d.data.qrDocIds ?? [],
        createdAt: d.data.createdAt?.toDate?.()?.toISOString?.() ?? d.data.createdAt ?? new Date().toISOString(),
        updatedAt: d.data.updatedAt?.toDate?.()?.toISOString?.() ?? d.data.updatedAt ?? new Date().toISOString(),
      }));
      callback(groups);
    }
  );
}

export async function createGroup(
  userId: string,
  name: string,
  description: string,
  color: string,
  icon: string
): Promise<string> {
  const result = await db.add(["users", userId, "qrGroups"], {
    name: name.trim(),
    description: description.trim(),
    color,
    icon,
    qrDocIds: [],
    createdAt: db.timestamp(),
    updatedAt: db.timestamp(),
  });
  return result.id;
}

export async function updateGroup(
  userId: string,
  groupId: string,
  updates: { name?: string; description?: string; color?: string; icon?: string }
): Promise<void> {
  const cleaned: Record<string, any> = { updatedAt: db.timestamp() };
  if (updates.name !== undefined) cleaned.name = updates.name.trim();
  if (updates.description !== undefined) cleaned.description = updates.description.trim();
  if (updates.color !== undefined) cleaned.color = updates.color;
  if (updates.icon !== undefined) cleaned.icon = updates.icon;
  await db.update(["users", userId, "qrGroups", groupId], cleaned);
}

export async function deleteGroup(userId: string, groupId: string): Promise<void> {
  await db.delete(["users", userId, "qrGroups", groupId]);
}

export async function addQrToGroup(
  userId: string,
  groupId: string,
  qrDocId: string
): Promise<void> {
  const existing = await db.get(["users", userId, "qrGroups", groupId]);
  if (!existing) return;
  const ids: string[] = existing.qrDocIds ?? [];
  if (ids.includes(qrDocId)) return;
  await db.update(["users", userId, "qrGroups", groupId], {
    qrDocIds: [...ids, qrDocId],
    updatedAt: db.timestamp(),
  });
}

export async function removeQrFromGroup(
  userId: string,
  groupId: string,
  qrDocId: string
): Promise<void> {
  const existing = await db.get(["users", userId, "qrGroups", groupId]);
  if (!existing) return;
  const ids: string[] = existing.qrDocIds ?? [];
  await db.update(["users", userId, "qrGroups", groupId], {
    qrDocIds: ids.filter((id) => id !== qrDocId),
    updatedAt: db.timestamp(),
  });
}

export async function addQrToMultipleGroups(
  userId: string,
  groupIds: string[],
  qrDocId: string
): Promise<void> {
  await Promise.all(groupIds.map((gid) => addQrToGroup(userId, gid, qrDocId)));
}

export async function getGroupsForQr(
  userId: string,
  qrDocId: string
): Promise<QrGroup[]> {
  const result = await db.query(["users", userId, "qrGroups"], {
    where: [{ field: "qrDocIds", op: "array-contains", value: qrDocId }],
  });
  return result.docs.map((d) => ({
    id: d.id,
    name: d.data.name ?? "Unnamed Group",
    description: d.data.description ?? "",
    color: d.data.color ?? "#6366F1",
    icon: d.data.icon ?? "folder-outline",
    qrDocIds: d.data.qrDocIds ?? [],
    createdAt: d.data.createdAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
    updatedAt: d.data.updatedAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
  }));
}
