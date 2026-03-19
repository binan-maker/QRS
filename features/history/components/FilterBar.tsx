import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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
  all: "apps-outline",
  url: "link-outline",
  payment: "card-outline",
  text: "document-text-outline",
  other: "ellipsis-horizontal-circle-outline",
  favorites: "heart-outline",
  camera: "camera-outline",
  gallery: "images-outline",
};

const FILTER_ICONS_ACTIVE: Record<string, IoniconName> = {
  all: "apps",
  url: "link",
  payment: "card",
  text: "document-text",
  other: "ellipsis-horizontal-circle",
  favorites: "heart",
  camera: "camera",
  gallery: "images",
};

const FilterBar = React.memo(function FilterBar({
  filters,
  activeFilter,
  onFilterChange,
}: FilterBarProps) {
  const { colors } = useTheme();

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

        const activeColor = isFavorite ? colors.danger : colors.primary;
        const activeBg = isFavorite ? colors.dangerDim : colors.primaryDim;
        const activeBorder = isFavorite ? colors.danger : colors.primary;

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
              {
                backgroundColor: isActive ? activeBg : colors.surfaceLight,
                borderColor: isActive ? activeBorder : colors.surfaceBorder,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Ionicons
              name={iconName}
              size={13}
              color={isActive ? activeColor : colors.textSecondary}
            />
            <Text
              style={[
                styles.chipText,
                { color: isActive ? activeColor : colors.textSecondary },
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
    paddingBottom: 4,
    paddingTop: 2,
    flexDirection: "row",
    alignItems: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
});
