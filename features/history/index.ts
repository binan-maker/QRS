// ─── History Feature Public API ────────────────────────────────────────────────
export { default as HistoryScreen }      from "./HistoryScreen";

// Hooks
export { useHistory }                    from "./hooks/useHistory";
export { useHistoryData }                from "./hooks/useHistoryData";
export { useSearch }                     from "./hooks/useSearch";

// Components
export { default as HistoryItem }        from "./components/HistoryItem";
export { default as HistoryItemSkeleton } from "./components/HistoryItemSkeleton";
export { default as FilterBar }          from "./components/FilterBar";
export { default as HistoryHeader }      from "./components/HistoryHeader";
export { default as SectionHeader }      from "./components/SectionHeader";
export { default as EmptyState }         from "./components/EmptyState";
export { default as CloudErrorBanner }   from "./components/CloudErrorBanner";
export { default as OfflineBanner }      from "./components/OfflineBanner";
export { default as SearchResultsRow }   from "./components/SearchResultsRow";

// Types
export type { HistoryItem as HistoryItemType, Filter, RiskLevel, ListRow } from "./types";

// Utils
export { groupByDate, getDateLabel }     from "./utils/date-utils";
export { matchesSearch }                 from "./utils/search-utils";
export { getActiveFilters }              from "./utils/filter-utils";
export { SKELETON_COUNT, PAGE_SIZE, STALE_MS, FILTERS } from "./utils/constants";
