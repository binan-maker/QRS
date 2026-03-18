import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import type { Filter } from "@/hooks/useHistory";

interface FilterOption {
  key: Filter;
  label: string;
}

interface FilterBarProps {
  filters: FilterOption[];
  activeFilter: Filter;
  onFilterChange: (filter: Filter) => void;
}

const FILTER_ICONS: Record<string, { lib: "ion" | "mci"; name: string }> = {
  all: { lib: "ion", name: "apps" },
  url: { lib: "ion", name: "link" },
  payment: { lib: "mci", name: "cash" },
  text: { lib: "ion", name: "document-text-outline" },
  other: { lib: "mci", name: "dots-horizontal" },
  favorites: { lib: "ion", name: "heart" },
};

function FilterIcon({ filterKey, isActive, isFavorite }: { filterKey: string; isActive: boolean; isFavorite: boolean }) {
  const meta = FILTER_ICONS[filterKey];
  if (!meta) return null;

  const color = isFavorite
    ? isActive ? Colors.dark.danger : Colors.dark.textMuted
    : isActive ? Colors.dark.primary : Colors.dark.textMuted;

  const size = 13;

  if (meta.lib === "mci") {
    return <MaterialCommunityIcons name={meta.name as any} size={size} color={color} />;
  }
  return <Ionicons name={meta.name as any} size={size} color={color} />;
}

const FilterBar = React.memo(function FilterBar({
  filters,
  activeFilter,
  onFilterChange,
}: FilterBarProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      bounces={false}
    >
      {filters.map((f) => {
        const isFavorite = f.key === "favorites";
        const isActive = activeFilter === f.key;
        return (
          <Pressable
            key={f.key}
            onPress={() => {
              onFilterChange(f.key);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={({ pressed }) => [
              styles.chip,
              isActive && styles.chipActive,
              isFavorite && styles.chipFavorite,
              isFavorite && isActive && styles.chipFavoriteActive,
              { opacity: pressed ? 0.75 : 1 },
            ]}
          >
            <FilterIcon filterKey={f.key} isActive={isActive} isFavorite={isFavorite} />
            <Text
              style={[
                styles.chipText,
                isActive && styles.chipTextActive,
                isFavorite && isActive && { color: Colors.dark.danger },
              ]}
              numberOfLines={1}
            >
              {f.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
});

export default FilterBar;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    gap: 7,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.surfaceBorder,
  },
  chipActive: {
    backgroundColor: Colors.dark.primaryDim,
    borderColor: Colors.dark.primary,
  },
  chipFavorite: {
    borderColor: Colors.dark.danger + "40",
  },
  chipFavoriteActive: {
    backgroundColor: Colors.dark.dangerDim,
    borderColor: Colors.dark.danger,
  },
  chipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textMuted,
  },
  chipTextActive: {
    color: Colors.dark.primary,
  },
});
