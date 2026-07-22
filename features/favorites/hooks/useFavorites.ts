import { useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { useAuth } from "@/shared/contexts/AuthContext";
import { getUserFavorites } from "@/lib/firestore-service";
import { useListScreen } from "@/shared/hooks/useListScreen";

export interface FavoriteItem {
  id: string;
  qrCodeId: string;
  content: string;
  contentType: string;
  createdAt: string;
}

export function useFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  const loadFavorites = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getUserFavorites(user.id);
      setFavorites(data as FavoriteItem[]);
    } catch {}
  }, [user?.id]);

  const { loading, setLoading, refreshing, handleRefresh } = useListScreen(loadFavorites);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    loadFavorites().finally(() => setLoading(false));
  }, [loadFavorites, setLoading]));

  return { user, favorites, loading, refreshing, handleRefresh };
}
