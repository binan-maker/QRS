import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const FILTER_ICONS: Record<string, IoniconName> = {
  all: "apps-outline",
  url: "link-outline",
  payment: "card-outline",
  text: "document-text-outline",
  other: "ellipsis-horizontal-circle-outline",
  favorites: "heart-outline",
};

const FILTER_ICONS_ACTIVE: Record<string, IoniconName> = {
  all: "apps",
  url: "link",
  payment: "card",
  text: "document-text",
  other: "ellipsis-horizontal-circle",
  favorites: "heart",
};

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
      style={styles.scroll}
    >
      {filters.map((f) => {
        const isFavorite = f.key === "favorites";
        const isActive = activeFilter === f.key;

        const iconColor = isFavorite
          ? isActive ? Colors.dark.danger : Colors.dark.textMuted
          : isActive ? Colors.dark.primary : Colors.dark.textMuted;

        const iconName = isActive
          ? (FILTER_ICONS_ACTIVE[f.key] ?? "apps")
          : (FILTER_ICONS[f.key] ?? "apps-outline");

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
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name={iconName} size={13} color={iconColor} />
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
  scroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  container: {
    paddingHorizontal: 16,
    gap: 6,
    paddingBottom: 2,
    flexDirection: "row",
    alignItems: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
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
