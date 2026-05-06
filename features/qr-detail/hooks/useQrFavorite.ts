import { useState, useRef, useEffect } from "react";
import { router } from "expo-router";
import NetInfo from "@react-native-community/netinfo";
import * as Haptics from "@/lib/haptics";
import { toggleFavorite } from "@/lib/firestore-service";
import { invalidateQrCache } from "@/lib/cache/qr-cache";
import { queueOfflineFavorite, syncOfflineFavorites } from "@/lib/services/offline-sync";

const DEBOUNCE_MS = 700;

export function useQrFavorite(id: string, userId: string | null) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  const committedFavoriteRef = useRef(false);
  const pendingFavoriteRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef<{ content: string; contentType: string } | null>(null);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        syncOfflineFavorites().catch(() => {});
      }
    });
    return () => unsub();
  }, []);

  async function commitFavorite() {
    if (!userId) return;
    const desiredState = pendingFavoriteRef.current;
    if (desiredState === committedFavoriteRef.current) return;

    const netState = await NetInfo.fetch();
    const isOnline = netState.isConnected !== false;

    if (!isOnline) {
      if (contentRef.current) {
        await queueOfflineFavorite(
          id,
          userId,
          contentRef.current.content,
          contentRef.current.contentType
        );
      }
      committedFavoriteRef.current = desiredState;
      return;
    }

    setFavoriteLoading(true);
    try {
      const confirmed = await toggleFavorite(
        id,
        userId,
        contentRef.current?.content ?? "",
        contentRef.current?.contentType ?? ""
      );
      committedFavoriteRef.current = confirmed;
      setIsFavorite(confirmed);
      invalidateQrCache(id);
      if (confirmed !== desiredState) {
        pendingFavoriteRef.current = confirmed;
      }
    } catch {
      setIsFavorite(committedFavoriteRef.current);
      pendingFavoriteRef.current = committedFavoriteRef.current;
    } finally {
      setFavoriteLoading(false);
    }
  }

  function handleToggleFavorite(content: string, contentType: string) {
    if (!userId) { router.push("/(auth)/login"); return; }

    const newFav = !pendingFavoriteRef.current;
    pendingFavoriteRef.current = newFav;
    contentRef.current = { content, contentType };

    setIsFavorite(newFav);
    Haptics.impactAsync(newFav ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(commitFavorite, DEBOUNCE_MS);
  }

  return {
    isFavorite,
    setIsFavorite: (v: boolean) => {
      committedFavoriteRef.current = v;
      pendingFavoriteRef.current = v;
      setIsFavorite(v);
    },
    favoriteLoading,
    handleToggleFavorite,
  };
}
