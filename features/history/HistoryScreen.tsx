import React, { useCallback, useMemo, useState, useEffect } from "react";
import { View, StyleSheet, Platform, RefreshControl, useWindowDimensions, LayoutChangeEvent } from "react-native";
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
import { SectionHeader } from "@/shared/components/ui/SectionHeader";
import EmptyState        from "@/features/history/components/EmptyState";
import CloudErrorBanner  from "@/features/history/components/CloudErrorBanner";
import OfflineBanner     from "@/features/history/components/OfflineBanner";
import SearchResultsRow  from "@/features/history/components/SearchResultsRow";
import FilterBar         from "@/features/history/components/FilterBar";
import HistoryItemComponent from "@/features/history/components/HistoryItem";
import HistoryItemSkeleton  from "@/features/history/components/HistoryItemSkeleton";
import { useFocusEffect } from "expo-router";
import { useTabBarScroll } from "@/shared/contexts/TabBarContext";
import { useHeaderHide }   from "@/shared/utils/use-header-hide";
import Reanimated          from "react-native-reanimated";

function HistoryScreen() {
  const insets   = useSafeAreaInsets();
  const topInset = useTopInset();
  const { colors } = useTheme();
  const { isOnline } = useNetworkStatus();

  const { width } = useWindowDimensions();
  const scale = Math.min(Math.max(width / 390, 0.82), 1.0);
  const rf = useCallback((size: number) => Math.round(size * scale), [scale]);

  const {
    user,
    history,
    displayItems,
    safetyRiskMap,
    activeFilters,
    onFilterChange,
    refreshing,
    loadingMore,
    cloudLoading,
    cloudError,
    bootstrapping,
    onRefresh,
    handleEndReached,
    deleteItem,
    scanStats,
  } = useHistory();

  const { onTabScroll, resetTabBar } = useTabBarScroll();
  const { headerStyle, setHeight, onScroll: onHeaderScroll, reset: resetHeader } = useHeaderHide();

  useFocusEffect(
    useCallback(() => {
      resetTabBar();
      resetHeader();
    }, [resetTabBar, resetHeader])
  );
  const [headerH, setHeaderH] = useState(0);

  const handleScroll = useCallback((e: any) => {
    onHeaderScroll(e);
    onTabScroll(e);
  }, [onHeaderScroll, onTabScroll]);

  const {
    searchVisible,
    searchQuery,
    debouncedQuery,
    setSearchQuery,
    searchInputRef,
    openSearch,
    closeSearch,
  } = useSearch();

  useEffect(() => {
    if (searchVisible) resetHeader();
  }, [searchVisible, resetHeader]);

  const filterOptions = useMemo(
    () => getActiveFilters(history, scanStats, user),
    [history, scanStats, user]
  );

  const searchedItems = useMemo(
    () => debouncedQuery.trim()
      ? displayItems.filter((item) => matchesSearch(item, debouncedQuery))
      : displayItems,
    [displayItems, debouncedQuery]
  );
  const listRows = useMemo(() => groupByDate(searchedItems), [searchedItems]);

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
    // Initial cloud fetch running while local items are already visible — show
    // 8 skeleton rows so the user knows more history is loading, not lost.
    // Guard: only when list has items; if list is empty, EmptyState already
    // renders its own skeleton block and we must not double up.
    if (cloudLoading && !loadingMore && listRows.length > 0) {
      return (
        <View style={{ paddingTop: 4 }}>
          {Array.from({ length: 8 }).map((_, i) => <HistoryItemSkeleton key={i} index={i} />)}
        </View>
      );
    }
    // Scroll-triggered pagination loading — fewer skeletons at bottom.
    if (loadingMore) {
      return (
        <View style={{ paddingTop: 4 }}>
          {Array.from({ length: 3 }).map((_, i) => <HistoryItemSkeleton key={i} index={i} />)}
        </View>
      );
    }
    return null;
  }, [cloudLoading, loadingMore, listRows.length]);

  const renderEmpty = useCallback(() => (
    <EmptyState
      user={user}
      cloudLoading={cloudLoading}
      searchQuery={searchQuery}
      activeFilters={activeFilters}
      colors={colors}
      fontSize={rf}
    />
  ), [user, cloudLoading, searchQuery, activeFilters, colors, rf]);

  const keyExtractor = useCallback((row: ListRow) => row.kind === "header" ? row.id : row.item.id, []);
  const getItemType  = useCallback((row: ListRow) => row.kind === "header" ? "header" : "item", []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      <Reanimated.View
        style={[
          styles.headerWrap,
          { backgroundColor: colors.background },
          !searchVisible ? headerStyle : undefined,
        ]}
        onLayout={(e: LayoutChangeEvent) => {
          const h = e.nativeEvent.layout.height;
          setHeaderH(h);
          setHeight(h);
        }}
      >
        <View style={{ paddingTop: topInset }}>
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
            <FilterBar
              filters={filterOptions}
              activeFilters={activeFilters}
              onFilterChange={onFilterChange}
            />
          )}

          {!isOnline && user && !searchVisible && (
            <OfflineBanner colors={colors} />
          )}

          {searchVisible && searchQuery.trim() && searchedItems.length > 0 && (
            <SearchResultsRow count={searchedItems.length} query={searchQuery} colors={colors} fontSize={rf} />
          )}
        </View>
      </Reanimated.View>

      {bootstrapping ? (
        <View style={[styles.list, { paddingTop: headerH + 8, paddingBottom: insets.bottom + 84 }]}>
          {Array.from({ length: 8 }).map((_, i) => <HistoryItemSkeleton key={i} index={i} />)}
        </View>
      ) : (
        <FlashList
          data={listRows}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemType={getItemType}
          estimatedItemSize={88}
          contentContainerStyle={[
            styles.list,
            { paddingTop: headerH, paddingBottom: Platform.OS === "web" ? 34 + 84 : insets.bottom + 84 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScroll={handleScroll}
          scrollEventThrottle={16}
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1 },
  headerWrap: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 },
  list:       { paddingHorizontal: 16 },
});

export default React.memo(HistoryScreen);
