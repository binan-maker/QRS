import { db } from "@/lib/db/client";
import { COLLECTIONS } from "@/shared/constants/collections";

export interface UserSearchResult {
  userId: string;
  displayName: string;
  username: string;
  photoURL: string | null;
}

export async function searchUsers(query: string): Promise<UserSearchResult[]> {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase().trim();
  try {
    const { docs } = await db.query([COLLECTIONS.USERS], {
      where: [
        { field: "username", op: ">=", value: q },
        { field: "username", op: "<=", value: q + "\uf8ff" },
      ],
      limit: 20,
    });
    return docs
      .filter((d) => d.data.username && !d.data.isDeleted)
      .map((d) => ({
        userId: d.id,
        displayName: d.data.displayName || d.data.username || "",
        username: d.data.username || "",
        photoURL: d.data.photoURL || null,
      }));
  } catch {
    return [];
  }
}
