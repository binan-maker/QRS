/**
 * useListScreen — shared hook for list screens.
 *
 * Provides loading + refreshing state and a pull-to-refresh handler so every
 * list screen doesn't hand-roll the same boilerplate. The caller owns the
 * actual data state; this hook only manages the UI loading indicators.
 *
 * Usage:
 *   const { loading, setLoading, refreshing, handleRefresh } = useListScreen(fetchData);
 */
import { useState, useCallback } from "react";

export function useListScreen(loader: (force?: boolean) => Promise<void>) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loader(true).finally(() => setRefreshing(false));
  }, [loader]);

  return { loading, setLoading, refreshing, handleRefresh };
}
