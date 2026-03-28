import React, { useCallback, useMemo, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  RefreshControl,
  useWindowDimensions,
  TextInput,
  Keyboard,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "@/lib/haptics";
import { useTheme } from "@/contexts/ThemeContext";
import { useHistory, type HistoryItem, type Filter } from "@/hooks/useHistory";
import HistoryItemComponent from "@/features/history/components/HistoryItem";
import HistoryItemSkeleton from "@/features/history/components/HistoryItemSkeleton";
import FilterBar from "@/features/history/components/FilterBar";
import { parseAnyPaymentQr } from "@/lib/qr-analysis";

const SKELETON_COUNT = 8;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all",     label: "All"     },
  { key: "camera",  label: "Camera"  },
  { key: "gallery", label: "Gallery" },
  { key: "url",     label: "URLs"    },
  { key: "payment", label: "Payment" },
  { key: "text",    label: "Text"    },
  { key: "other",   label: "Other"   },
];

type ListRow =
  | { kind: "header"; label: string; count: number; id: string }
  | { kind: "item"; item: HistoryItem };

function getDateLabel(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (d.getTime() === today.getTime()) return "Today";
  if (d.getTime() === yesterday.getTime()) return "Yesterday";
  return date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

function groupByDate(items: HistoryItem[]): ListRow[] {
  const rows: ListRow[] = [];
  let lastLabel = "";
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const label = getDateLabel(new Date(item.scannedAt));
    if (label !== lastLabel) {
      const count = items.slice(i).filter(
        (it) => getDateLabel(new Date(it.scannedAt)) === label
      ).length;
      rows.push({ kind: "header", label, count, id: `header-${label}` });
      lastLabel = label;
    }
    rows.push({ kind: "item", item });
  }
  return rows;
}

function matchesSearch(item: HistoryItem, q: string): boolean {
  const lower = q.toLowerCase().trim();
  if (!lower) return true;
  if (item.content.toLowerCase().includes(lower)) return true;
  if (item.contentType.toLowerCase().includes(lower)) return true;
  if (item.contentType === "url") {
    try {
      const host = new URL(item.content).hostname.replace("www.", "");
      if (host.toLowerCase().includes(lower)) return true;
    } catch {}
  }
  if (item.contentType === "payment") {
    try {
      const parsed = parseAnyPaymentQr(item.content);
      if (parsed?.recipientName?.toLowerCase().includes(lower)) return true;
      if (parsed?.vpa?.toLowerCase().includes(lower)) return true;
      if (parsed?.recipientId?.toLowerCase().includes(lower)) return true;
    } catch {}
  }
  return false;
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const {
    user,
    history,
    displayItems,
    safetyRiskMap,
    filter,
    setFilter,
    refreshing,
    loadingMore,
    cloudLoading,
    cloudError,
    onRefresh,
    handleEndReached,
    deleteItem,
  } = useHistory();

  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<TextInput>(null);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const { width } = useWindowDimensions();
  const s = Math.min(Math.max(width / 390, 0.82), 1.0);
  const rf = (size: number) => Math.round(size * s);

  function openSearch() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSearchVisible(true);
    setTimeout(() => searchInputRef.current?.focus(), 80);
  }

  function closeSearch() {
    setSearchQuery("");
    setSearchVisible(false);
    Keyboard.dismiss();
  }

  // Stats from full history (all loaded items), not just filtered page
  const allDangerCount = useMemo(() =>
    history.filter((i) => safetyRiskMap.get(i.id) === "dangerous").length,
  [history, safetyRiskMap]);

  const allCautionCount = useMemo(() =>
    history.filter((i) => safetyRiskMap.get(i.id) === "caution").length,
  [history, safetyRiskMap]);

  const allSafeCount = useMemo(() =>
    history.length - allDangerCount - allCautionCount,
  [history, allDangerCount, allCautionCount]);

  // Filter chips counts from full history
  const activeFilters: { key: Filter; label: string; count?: number }[] = useMemo(() => {
    const base = FILTERS.map((f) => {
      let count = 0;
      if (f.key === "all")     count = history.length;
      else if (f.key === "url")     count = history.filter((i) => i.contentType === "url").length;
      else if (f.key === "payment") count = history.filter((i) => i.contentType === "payment").length;
      else if (f.key === "text")    count = history.filter((i) => i.contentType === "text").length;
      else if (f.key === "camera")  count = history.filter((i) => (i.scanSource ?? "camera") === "camera").length;
      else if (f.key === "gallery") count = history.filter((i) => i.scanSource === "gallery").length;
      else count = history.filter((i) => !["url","text","payment"].includes(i.contentType)).length;
      return { ...f, count };
    });
    if (user) base.push({ key: "favorites" as Filter, label: "Favorites" });
    return base;
  }, [history, user]);

  // Apply inline search on top of the filter-based displayItems
  const searchedItems = useMemo(() => {
    if (!searchQuery.trim()) return displayItems;
    return displayItems.filter((item) => matchesSearch(item, searchQuery));
  }, [displayItems, searchQuery]);

  const listRows = useMemo(() => groupByDate(searchedItems), [searchedItems]);

  const hasThreats = (allDangerCount + allCautionCount) > 0;
  const showStats = user && !cloudLoading && history.length > 0;

  const renderItem = useCallback(
    ({ item: row }: { item: ListRow }) => {
      if (row.kind === "header") {
        return (
          <View style={[styles.sectionHeader, { borderColor: colors.surfaceBorder + "60" }]}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]} maxFontSizeMultiplier={1}>
              {row.label}
            </Text>
            <View style={[styles.sectionLine, { backgroundColor: colors.surfaceBorder }]} />
            <View style={[styles.sectionCount, { backgroundColor: colors.surfaceBorder + "80" }]}>
              <Text style={[styles.sectionCountText, { color: colors.textMuted }]} maxFontSizeMultiplier={1}>
                {row.count}
              </Text>
            </View>
          </View>
        );
      }
      const risk = safetyRiskMap.get(row.item.id) ?? "safe";
      return (
        <HistoryItemComponent
          item={row.item}
          risk={risk as "safe" | "caution" | "dangerous"}
          onDelete={deleteItem}
        />
      );
    },
    [safetyRiskMap, deleteItem, colors]
  );

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={{ paddingTop: 4 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <HistoryItemSkeleton key={i} />
        ))}
      </View>
    );
  }, [loadingMore]);

  const keyExtractor = useCallback((row: ListRow) =>
    row.kind === "header" ? row.id : row.item.id,
  []);

  const emptyComponent = () => {
    if (!user) {
      return (
        <View style={styles.emptyState}>
          <LinearGradient
            colors={[colors.primary + "20", colors.primary + "08"]}
            style={styles.emptyIconWrap}
          >
            <Ionicons name="person-outline" size={32} color={colors.primary} />
          </LinearGradient>
          <Text style={[styles.emptyTitle, { color: colors.text, fontSize: rf(18) }]}>
            Sign in to view history
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary, fontSize: rf(13) }]}>
            Your scan history is saved to your account and synced across all your devices.
          </Text>
          <Pressable
            onPress={() => router.push("/(auth)/login")}
            style={({ pressed }) => [
              styles.signInBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
            ]}
          >
            <Ionicons name="log-in-outline" size={17} color="#fff" />
            <Text style={[styles.signInBtnText, { fontSize: rf(14) }]}>Sign In</Text>
          </Pressable>
        </View>
      );
    }
    if (cloudLoading) {
      return (
        <View style={{ paddingTop: 4 }}>
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <HistoryItemSkeleton key={i} />
          ))}
        </View>
      );
    }
    if (searchQuery.trim()) {
      return (
        <View style={styles.emptyState}>
          <LinearGradient
            colors={[colors.surfaceBorder + "80", colors.surfaceBorder + "30"]}
            style={styles.emptyIconWrap}
          >
            <Ionicons name="search-outline" size={32} color={colors.textMuted} />
          </LinearGradient>
          <Text style={[styles.emptyTitle, { color: colors.textSecondary, fontSize: rf(17) }]}>
            No results for "{searchQuery}"
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textMuted, fontSize: rf(13) }]}>
            Try searching by URL, payment name, or QR content
          </Text>
        </View>
      );
    }
    const emptyIcon: keyof typeof Ionicons.glyphMap =
      filter === "favorites" ? "heart-outline"
      : filter === "camera"   ? "camera-outline"
      : filter === "gallery"  ? "images-outline"
      : "time-outline";
    const emptyMsg =
      filter === "favorites" ? "No favorites yet"
      : filter === "camera"  ? "No camera scans yet"
      : filter === "gallery" ? "No gallery scans yet"
      : "No scans yet";
    const emptySub =
      filter === "favorites" ? "Tap the heart on a QR detail to save it here"
      : filter === "camera"  ? "QR codes scanned with the camera will appear here"
      : filter === "gallery" ? "QR codes scanned from your gallery will appear here"
      : "Scanned QR codes will appear here";
    return (
      <View style={styles.emptyState}>
        <LinearGradient
          colors={[colors.surfaceBorder + "80", colors.surfaceBorder + "30"]}
          style={styles.emptyIconWrap}
        >
          <Ionicons name={emptyIcon} size={32} color={colors.textMuted} />
        </LinearGradient>
        <Text style={[styles.emptyTitle, { color: colors.textSecondary, fontSize: rf(17) }]}>{emptyMsg}</Text>
        <Text style={[styles.emptySubtext, { color: colors.textMuted, fontSize: rf(13) }]}>{emptySub}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topInset }]}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      {!searchVisible ? (
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text, fontSize: rf(22) }]}>
            Scan History
          </Text>
          <View style={styles.headerActions}>
            <Pressable
              onPress={openSearch}
              style={[styles.headerBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
            </Pressable>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/settings");
              }}
              style={[styles.headerBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="settings-outline" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>
        </View>
      ) : (
        /* ── Search bar ───────────────────────────────────────────── */
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <Ionicons name="search-outline" size={17} color={colors.textMuted} />
          <TextInput
            ref={searchInputRef}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search URLs, payments, text…"
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.text }]}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
            maxFontSizeMultiplier={1}
          />
          <Pressable onPress={closeSearch} hitSlop={8}>
            <Text style={[styles.searchCancel, { color: colors.primary }]} maxFontSizeMultiplier={1}>
              Cancel
            </Text>
          </Pressable>
        </View>
      )}

      {/* ── Stats strip — from full history, shows immediately ─────── */}
      {showStats && !searchVisible && (
        <View style={[styles.statsStrip, { borderColor: colors.surfaceBorder }]}>
          <View style={[styles.statItem, { borderRightColor: colors.surfaceBorder }]}>
            <Text style={[styles.statNumber, { color: colors.text }]} maxFontSizeMultiplier={1}>
              {history.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]} maxFontSizeMultiplier={1}>Total</Text>
          </View>
          <View style={[styles.statItem, { borderRightColor: colors.surfaceBorder }]}>
            <Text style={[styles.statNumber, { color: colors.safe }]} maxFontSizeMultiplier={1}>
              {allSafeCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]} maxFontSizeMultiplier={1}>Safe</Text>
          </View>
          <View style={[styles.statItem, { borderRightColor: colors.surfaceBorder }]}>
            <Text style={[styles.statNumber, { color: colors.warning }]} maxFontSizeMultiplier={1}>
              {allCautionCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]} maxFontSizeMultiplier={1}>Caution</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.danger }]} maxFontSizeMultiplier={1}>
              {allDangerCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]} maxFontSizeMultiplier={1}>Danger</Text>
          </View>
        </View>
      )}

      {/* ── Threat Banner ──────────────────────────────────────────── */}
      {user && hasThreats && !cloudLoading && !searchVisible && (
        <Pressable
          onPress={onRefresh}
          style={[
            styles.threatBanner,
            {
              backgroundColor: allDangerCount > 0 ? colors.dangerDim : colors.warningDim,
              borderColor: (allDangerCount > 0 ? colors.danger : colors.warning) + "40",
              marginHorizontal: 16,
              marginBottom: 6,
            },
          ]}
        >
          <LinearGradient
            colors={allDangerCount > 0
              ? [colors.danger, colors.dangerShade ?? colors.danger]
              : [colors.warning, colors.warningShade ?? colors.warning]}
            style={styles.threatBannerIcon}
          >
            <Ionicons name={allDangerCount > 0 ? "warning" : "alert-circle"} size={14} color="#fff" />
          </LinearGradient>
          <Text style={[
            styles.threatBannerText,
            { color: allDangerCount > 0 ? colors.danger : colors.warning, fontSize: rf(12) },
          ]} maxFontSizeMultiplier={1}>
            {allDangerCount > 0
              ? `${allDangerCount} dangerous QR code${allDangerCount > 1 ? "s" : ""} detected`
              : `${allCautionCount} QR code${allCautionCount > 1 ? "s" : ""} flagged for caution`}
          </Text>
        </Pressable>
      )}

      {/* ── Cloud Error Banner ─────────────────────────────────────── */}
      {user && cloudError && !searchVisible && (
        <Pressable
          onPress={onRefresh}
          style={[
            styles.cloudErrorBanner,
            {
              backgroundColor: colors.warningDim,
              borderColor: colors.warning + "40",
              marginHorizontal: 16,
              marginBottom: 6,
            },
          ]}
        >
          <Ionicons name="cloud-offline-outline" size={15} color={colors.warning} />
          <Text style={[styles.cloudErrorText, { color: colors.warning, fontSize: rf(12) }]}>
            Couldn't load cloud history — tap to retry
          </Text>
        </Pressable>
      )}

      {/* ── Filters (hidden during search) ─────────────────────────── */}
      {!searchVisible && (
        <FilterBar
          filters={activeFilters}
          activeFilter={filter}
          onFilterChange={setFilter}
        />
      )}

      {/* ── Search result count ─────────────────────────────────────── */}
      {searchVisible && searchQuery.trim() && searchedItems.length > 0 && (
        <View style={[styles.searchResultsRow, { borderBottomColor: colors.surfaceBorder }]}>
          <Text style={[styles.searchResultsText, { color: colors.textMuted, fontSize: rf(12) }]} maxFontSizeMultiplier={1}>
            {searchedItems.length} result{searchedItems.length !== 1 ? "s" : ""} for "{searchQuery}"
          </Text>
        </View>
      )}

      {/* ── List ───────────────────────────────────────────────────── */}
      <FlatList
        data={listRows}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: Platform.OS === "web" ? 34 + 84 : insets.bottom + 84 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          !searchVisible ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          ) : undefined
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={emptyComponent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    paddingVertical: 0,
  },
  searchCancel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  searchResultsRow: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchResultsText: {
    fontFamily: "Inter_400Regular",
  },
  statsStrip: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRightWidth: 1,
  },
  statNumber: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    letterSpacing: 0.2,
    marginTop: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingVertical: 13,
    paddingHorizontal: 2,
    marginBottom: 2,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 1.3,
    flexShrink: 0,
  },
  sectionLine: {
    flex: 1,
    height: 1,
  },
  sectionCount: {
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 2,
    flexShrink: 0,
  },
  sectionCountText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.2,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 2,
  },
  threatBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  threatBannerIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  threatBannerText: {
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  cloudErrorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  cloudErrorText: {
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  emptyState: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 60,
    paddingHorizontal: 36,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  emptySubtext: {
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  signInBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 14,
  },
  signInBtnText: {
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 0.2,
  },
});
