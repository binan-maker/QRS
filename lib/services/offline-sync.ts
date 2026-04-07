import AsyncStorage from "@react-native-async-storage/async-storage";
import { toggleFavorite } from "@/lib/firestore-service";

const QUEUE_KEY = "offline_pending_favorites";

interface PendingFavorite {
  id: string;
  userId: string;
  content: string;
  contentType: string;
  timestamp: number;
}

export async function queueOfflineFavorite(
  id: string,
  userId: string,
  content: string,
  contentType: string
): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(QUEUE_KEY);
    const queue: PendingFavorite[] = stored ? JSON.parse(stored) : [];
    const filtered = queue.filter((q) => !(q.id === id && q.userId === userId));
    filtered.push({ id, userId, content, contentType, timestamp: Date.now() });
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
  } catch {}
}

export async function syncOfflineFavorites(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(QUEUE_KEY);
    if (!stored) return;
    const queue: PendingFavorite[] = JSON.parse(stored);
    if (queue.length === 0) return;

    const remaining: PendingFavorite[] = [];
    for (const item of queue) {
      try {
        await toggleFavorite(item.id, item.userId, item.content, item.contentType);
      } catch {
        remaining.push(item);
      }
    }
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  } catch {}
}
