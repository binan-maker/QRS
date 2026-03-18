import { useState } from "react";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { toggleFavorite } from "@/lib/firestore-service";
import { invalidateQrCache } from "@/lib/cache/qr-cache";

export function useQrFavorite(id: string, userId: string | null) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  async function handleToggleFavorite(content: string, contentType: string) {
    if (!userId) { router.push("/(auth)/login"); return; }
    setFavoriteLoading(true);
    try {
      const newFav = await toggleFavorite(id, userId, content, contentType);
      setIsFavorite(newFav);
      invalidateQrCache(id);
      Haptics.impactAsync(newFav ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setFavoriteLoading(false);
  }

  return { isFavorite, setIsFavorite, favoriteLoading, handleToggleFavorite };
}
