// ─── History Search ───────────────────────────────────────────────────────────
// Single responsibility: search input visibility, raw query state, debounced
// query value (300ms), and focus ref.
// Keeps all search concerns out of HistoryScreen and useHistory.

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Keyboard, TextInput } from "react-native";
import * as Haptics from "@/lib/haptics";

const DEBOUNCE_MS = 300;

export function useSearch() {
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery,   setSearchQuery]   = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const searchInputRef = useRef<TextInput>(null) as React.RefObject<TextInput>;
  const debounceTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce raw query → debouncedQuery
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchQuery]);

  const openSearch = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSearchVisible(true);
  }, []);

  const closeSearch = useCallback(() => {
    setSearchQuery("");
    setDebouncedQuery("");
    setSearchVisible(false);
    Keyboard.dismiss();
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
  }, []);

  return {
    searchVisible,
    searchQuery,
    debouncedQuery,
    setSearchQuery,
    searchInputRef,
    openSearch,
    closeSearch,
  };
}
