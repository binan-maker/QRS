import { useState, useCallback, useRef } from "react";
import { useAuth } from "@/shared/contexts/AuthContext";
import { searchUsers, type UserSearchResult } from "@/services/user";

export type { UserSearchResult };

export function useUserSearch() {
  const { user } = useAuth();
  const [query,    setQuery]    = useState("");
  const [results,  setResults]  = useState<UserSearchResult[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [searched, setSearched] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const raw = await searchUsers(q);
      const filtered = user ? raw.filter((r) => r.userId !== user.id) : raw;
      setResults(filtered);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleChange = useCallback((text: string) => {
    setQuery(text);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => runSearch(text), 400);
  }, [runSearch]);

  const handleClear = useCallback(() => {
    setQuery("");
    setResults([]);
    setSearched(false);
  }, []);

  return { query, results, loading, searched, handleChange, handleClear, runSearch };
}
