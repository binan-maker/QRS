// ─── History Search ───────────────────────────────────────────────────────────
// Single responsibility: search input visibility, query state, and focus ref.
// Keeps all search concerns out of HistoryScreen and useHistory.

import { useState, useRef, useCallback } from "react";
import { Keyboard, TextInput } from "react-native";
import * as Haptics from "@/lib/haptics";

export function useSearch() {
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery,   setSearchQuery]   = useState("");
  const searchInputRef = useRef<TextInput>(null);

  const openSearch = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSearchVisible(true);
  }, []);

  const closeSearch = useCallback(() => {
    setSearchQuery("");
    setSearchVisible(false);
    Keyboard.dismiss();
  }, []);

  return {
    searchVisible,
    searchQuery,
    setSearchQuery,
    searchInputRef,
    openSearch,
    closeSearch,
  };
}
