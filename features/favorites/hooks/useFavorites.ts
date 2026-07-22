import { useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { useAuth } from "@/shared/contexts/AuthContext";
import { getUserFavorites } from "@/lib/firestore-service";

export interface FavoriteItem {
  id: string;
  qrCodeId: string;
  content: string;
  contentType: string;
  createdAt: string;
}

export function useFavorites() {
  const { user } = useAuth();
  const [favorites,  setFavorites]  = useState<FavoriteItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFavorites = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getUserFavorites(user.id);
      setFavorites(data as FavoriteItem[]);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [user?.id]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    loadFavorites();
  }, [loadFavorites]));

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadFavorites();
  }, [loadFavorites]);

  return { user, favorites, loading, refreshing, handleRefresh };
}
