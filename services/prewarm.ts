import {
  getCachedHistoryPage,
  getCachedFavorites,
  getCachedScanStats,
} from "@/services/cache/qr-cache";
import { queryClient } from "@/shared/utils/query-client";
import type { ScanStatsResult } from "@/services/scan-history/scan-stats";
import { COLLECTIONS } from "@/shared/constants/collections";

// Track which user IDs have already been pre-warmed this session so
// repeated calls (e.g. token refresh) don't re-read from disk unnecessarily.
const _warmedUsers = new Set<string>();

/**
 * Reads all three history-related disk caches concurrently and seeds the
 * TanStack Query cache with the results.  Called from AuthContext as soon as
 * the user's ID is known — well before the user can possibly navigate to the
 * History tab — so the tab renders with `isLoading = false` on its very first
 * mount.
 *
 * Safe to call multiple times: a no-op if the data is already in-cache or
 * the userId has already been warmed this session.
 */
export async function prewarmUserData(userId: string): Promise<void> {
  if (_warmedUsers.has(userId)) return;
  _warmedUsers.add(userId);

  await Promise.all([
    // History (paginated)
    getCachedHistoryPage<{ items: any[]; hasMore: boolean }>(userId)
      .then((cached) => {
        if (!cached?.items?.length) return;
        const qk = ["history", userId];
        if (queryClient.getQueryData(qk)) return; // already warm
        queryClient.setQueryData(qk, {
          pages:      [{ items: cached.items, cursor: null, hasMore: cached.hasMore }],
          pageParams: [null],
        });
      })
      .catch(() => {}),

    // Favorites
    getCachedFavorites<any[]>(userId)
      .then((cached) => {
        if (!cached?.length) return;
        const qk = [COLLECTIONS.FAVORITES, userId];
        if (queryClient.getQueryData(qk)) return;
        queryClient.setQueryData(qk, cached);
      })
      .catch(() => {}),

    // Scan stats
    getCachedScanStats<ScanStatsResult>(userId)
      .then((cached) => {
        if (!cached) return;
        const qk = ["scan-stats", userId];
        if (queryClient.getQueryData(qk)) return;
        queryClient.setQueryData(qk, cached);
      })
      .catch(() => {}),
  ]);
}

/** Clear the warmed-user set on sign-out so the next login re-warms fresh. */
export function clearPrewarmState(): void {
  _warmedUsers.clear();
}
