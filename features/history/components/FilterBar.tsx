import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "@/lib/haptics";
import { useTheme } from "@/contexts/ThemeContext";
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
  all:       "apps-outline",
  url:       "globe-outline",
  payment:   "card-outline",
  text:      "document-text-outline",
  other:     "ellipsis-horizontal-circle-outline",
  favorites: "heart-outline",
  camera:    "camera-outline",
  gallery:   "images-outline",
};

const FILTER_ICONS_ACTIVE: Record<string, IoniconName> = {
  all:       "apps",
  url:       "globe",
  payment:   "card",
  text:      "document-text",
  other:     "ellipsis-horizontal-circle",
  favorites: "heart",
  camera:    "camera",
  gallery:   "images",
};

const FilterBar = React.memo(function FilterBar({
  filters,
  activeFilter,
  onFilterChange,
}: FilterBarProps) {
  const { colors, isDark } = useTheme();

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
        const isActive   = activeFilter === f.key;

        const activeColor  = isFavorite ? colors.danger  : colors.primary;
        const activeBg     = isFavorite ? colors.danger  : colors.primary;
        const iconName     = isActive
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
              isActive
                ? {
                    backgroundColor: activeBg,
                    borderColor: "transparent",
                    shadowColor: activeColor,
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: isDark ? 0.5 : 0.25,
                    shadowRadius: 8,
                    elevation: 4,
                  }
                : {
                    backgroundColor: isDark ? colors.surfaceLight : colors.surface,
                    borderColor: colors.surfaceBorder,
                  },
              { opacity: pressed ? 0.75 : 1 },
            ]}
          >
            <Ionicons
              name={iconName}
              size={13}
              color={isActive ? (isFavorite ? "#fff" : colors.primaryText) : colors.textSecondary}
            />
            <Text
              style={[
                styles.chipText,
                {
                  color: isActive
                    ? (isFavorite ? "#fff" : colors.primaryText)
                    : colors.textSecondary,
                },
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
    gap: 8,
    paddingBottom: 6,
    paddingTop: 2,
    flexDirection: "row",
    alignItems: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.1,
  },
});
