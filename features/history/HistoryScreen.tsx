import React, { useCallback, useMemo } from "react";
import { View, StyleSheet, Platform, RefreshControl, useWindowDimensions } from "react-native";
import { FlashList as _FlashList } from "@shopify/flash-list";
const FlashList = _FlashList as any;
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTopInset } from "@/shared/utils/platform";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useNetworkStatus } from "@/shared/utils/use-network";

import { useHistory }         from "@/features/history/hooks/useHistory";
import { useSearch }          from "@/features/history/hooks/useSearch";
import { groupByDate }        from "@/features/history/utils/date-utils";
import { matchesSearch }      from "@/features/history/utils/search-utils";
import { getActiveFilters }   from "@/features/history/utils/filter-utils";
import type { ListRow }       from "@/features/history/types";

import HistoryHeader     from "@/features/history/components/HistoryHeader";
import SectionHeader     from "@/features/history/components/SectionHeader";
import EmptyState        from "@/features/history/components/EmptyState";
import CloudErrorBanner  from "@/features/history/components/CloudErrorBanner";
import OfflineBanner     from "@/features/history/components/OfflineBanner";
import SearchResultsRow  from "@/features/history/components/SearchResultsRow";
import FilterBar         from "@/features/history/components/FilterBar";
import HistoryItemComponent from "@/features/history/components/HistoryItem";
import HistoryItemSkeleton  from "@/features/history/components/HistoryItemSkeleton";

function HistoryScreen() {
  const insets   = useSafeAreaInsets();
  const topInset = useTopInset();
  const { colors } = useTheme();
  const { isOnline } = useNetworkStatus();

  // Responsive font scaling
  const { width } = useWindowDimensions();
  const scale = Math.min(Math.max(width / 390, 0.82), 1.0);
  const rf = useCallback((size: number) => Math.round(size * scale), [scale]);

  // Data + actions
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
    scanStats,
  } = useHistory();

  // Search state
  const {
    searchVisible,
    searchQuery,
    debouncedQuery,
    setSearchQuery,
    searchInputRef,
    openSearch,
    closeSearch,
  } = useSearch();

  // Derived display data
  const activeFilters  = useMemo(() => getActiveFilters(history, scanStats, user), [history, scanStats, user]);
  // Use debouncedQuery (300ms lag) so matchesSearch / parseAnyPaymentQr
  // only runs after the user pauses typing, not on every keystroke.
  const searchedItems  = useMemo(
    () => debouncedQuery.trim() ? displayItems.filter((item) => matchesSearch(item, debouncedQuery)) : displayItems,
    [displayItems, debouncedQuery]
  );
  const listRows       = useMemo(() => groupByDate(searchedItems), [searchedItems]);

  // ── List renderers ─────────────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item: row, index }: { item: ListRow; index: number }) => {
      if (row.kind === "header") {
        return <SectionHeader label={row.label} count={row.count} />;
      }
      const risk = safetyRiskMap.get(row.item.id) ?? "safe";
      return (
        <HistoryItemComponent
          item={row.item}
          risk={risk as "safe" | "caution" | "dangerous"}
          onDelete={deleteItem}
          index={index}
        />
      );
    },
    [safetyRiskMap, deleteItem]
  );

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={{ paddingTop: 4 }}>
        {Array.from({ length: 3 }).map((_, i) => <HistoryItemSkeleton key={i} index={i} />)}
      </View>
    );
  }, [loadingMore]);

  const renderEmpty = useCallback(() => (
    <EmptyState
      user={user}
      cloudLoading={cloudLoading}
      searchQuery={searchQuery}
      filter={filter}
      colors={colors}
      fontSize={rf}
    />
  ), [user, cloudLoading, searchQuery, filter, colors, rf]);

  const keyExtractor  = useCallback((row: ListRow) => row.kind === "header" ? row.id : row.item.id, []);
  const getItemType   = useCallback((row: ListRow) => row.kind === "header" ? "header" : "item", []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topInset }]}>

      <HistoryHeader
        searchVisible={searchVisible}
        searchQuery={searchQuery}
        onChangeQuery={setSearchQuery}
        onOpenSearch={openSearch}
        onCloseSearch={closeSearch}
        searchInputRef={searchInputRef}
        colors={colors}
        fontSize={rf}
      />

      {user && cloudError && !searchVisible && (
        <CloudErrorBanner onRetry={onRefresh} colors={colors} fontSize={rf} />
      )}

      {!searchVisible && (
        <FilterBar filters={activeFilters} activeFilter={filter} onFilterChange={setFilter} />
      )}

      {!isOnline && user && !searchVisible && (
        <OfflineBanner colors={colors} />
      )}

      {searchVisible && searchQuery.trim() && searchedItems.length > 0 && (
        <SearchResultsRow count={searchedItems.length} query={searchQuery} colors={colors} fontSize={rf} />
      )}

      <FlashList
        data={listRows}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemType={getItemType}
        estimatedItemSize={88}
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
        ListEmptyComponent={renderEmpty}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list:      { paddingHorizontal: 16, paddingTop: 2 },
});

export default React.memo(HistoryScreen);
