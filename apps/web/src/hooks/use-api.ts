"use client";

/**
 * useApi — client-side API client hook.
 *
 * Returns a BinroApiClient instance pre-configured with the current user's
 * Supabase access token. Re-uses a stable instance per auth state.
 *
 * Usage:
 *   const api = useApi();
 *   const { data } = useQuery({ queryKey: ["qrs"], queryFn: () => api.unifiedQr.list() });
 */

import { useMemo } from "react";
import { createClientApiClient, type BinroApiClient } from "@/lib/api-client";
import { getSupabaseClient } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";

export function useApi(): BinroApiClient {
  const { user } = useAuth();

  return useMemo(() => {
    const getToken = async (): Promise<string | null> => {
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token ?? null;
    };

    return createClientApiClient(getToken);
    // Re-create client when user UID changes (sign in / sign out)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
}

/**
 * usePublicApi — API client that makes unauthenticated requests.
 * Use for public endpoints that don't require a Bearer token.
 */
export function usePublicApi(): BinroApiClient {
  return useMemo(() => createClientApiClient(async () => null), []);
}
