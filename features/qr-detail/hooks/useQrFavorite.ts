import { useState, useRef, useEffect, useCallback } from "react";
import { router } from "expo-router";
import { safePush } from "@/shared/utils/navigation";
import NetInfo from "@react-native-community/netinfo";
import * as Haptics from "@/shared/utils/haptics";
import { toggleFavorite } from "@/lib/firestore-service";
import { invalidateQrCache } from "@/services/cache/qr-cache";
import { queueOfflineFavorite, syncOfflineFavorites } from "@/services/offline-sync";

const DEBOUNCE_MS = 700;

export function useQrFavorite(id: string, userId: string | null) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  // Exposed so the screen can show a toast on a failed favorite write.
  const [favoriteError, setFavoriteError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const committedFavoriteRef = useRef(false);
  const pendingFavoriteRef = useRef(false);
  const inFlightRef = useRef(false);           // prevents concurrent writes
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

  // Clear pending debounce timer on unmount.
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const commitFavorite = useCallback(async () => {
    if (!userId) return;
    // Prevent concurrent writes — if a write is already in-flight, the debounce
    // timer will have been rescheduled in the finally block so intent is preserved.
    if (inFlightRef.current) return;

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

    inFlightRef.current = true;
    if (mountedRef.current) setFavoriteLoading(true);
    try {
      const confirmed = await toggleFavorite(
        id,
        userId,
        contentRef.current?.content ?? "",
        contentRef.current?.contentType ?? ""
      );
      committedFavoriteRef.current = confirmed;
      if (mountedRef.current) {
        setIsFavorite(confirmed);
        invalidateQrCache(id);
      }
      if (confirmed !== desiredState) {
        pendingFavoriteRef.current = confirmed;
      }
    } catch {
      // Roll back to the last confirmed server state and surface the error.
      pendingFavoriteRef.current = committedFavoriteRef.current;
      if (mountedRef.current) {
        setIsFavorite(committedFavoriteRef.current);
        setFavoriteError("Couldn't update favorites. Please try again.");
      }
    } finally {
      inFlightRef.current = false;
      if (mountedRef.current) setFavoriteLoading(false);
      // If the user tapped again while this write was in-flight, their intent is
      // still in pendingFavoriteRef but no timer remains to send it. Schedule one.
      if (pendingFavoriteRef.current !== committedFavoriteRef.current) {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(commitFavorite, DEBOUNCE_MS);
      }
    }
  }, [id, userId]);

  function handleToggleFavorite(content: string, contentType: string) {
    if (!userId) { safePush("/(auth)/login"); return; }

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
    favoriteError, clearFavoriteError: () => setFavoriteError(null),
    handleToggleFavorite,
  };
}
