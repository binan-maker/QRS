import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "@/shared/utils/haptics";
import { useTheme } from "@/shared/contexts/ThemeContext";
import type { Filter } from "@/features/history/types";

interface FilterOption {
  key: Filter;
  label: string;
  count?: number;
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
  social:    "heart-outline",
  payment:   "card-outline",
  contact:   "person-outline",
  wifi:      "wifi-outline",
  location:  "location-outline",
  utility:   "construct-outline",
  business:  "trending-up-outline",
  text:      "document-text-outline",
  favorites: "bookmark-outline",
  camera:    "camera-outline",
  gallery:   "images-outline",
};

const FILTER_ICONS_ACTIVE: Record<string, IoniconName> = {
  all:       "apps",
  url:       "globe",
  social:    "heart",
  payment:   "card",
  contact:   "person",
  wifi:      "wifi",
  location:  "location",
  utility:   "construct",
  business:  "trending-up",
  text:      "document-text",
  favorites: "bookmark",
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
      {filters.map((f, idx) => {
        const isFavorite = f.key === "favorites";
        const isActive   = activeFilter === f.key;

        const activeColor = isFavorite ? colors.danger : colors.primary;
        const iconName    = isActive
          ? (FILTER_ICONS_ACTIVE[f.key] ?? "apps")
          : (FILTER_ICONS[f.key] ?? "apps-outline");

        return (
          <Animated.View
            key={f.key}
            entering={FadeInDown.delay(25 + Math.min(idx, 4) * 18).duration(260)}
          >
            <Pressable
              onPress={() => {
                onFilterChange(f.key);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={({ pressed }) => [
                styles.chip,
                isActive
                  ? {
                      backgroundColor: activeColor,
                      borderColor: "transparent",
                      shadowColor: activeColor,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: isDark ? 0.45 : 0.3,
                      shadowRadius: 10,
                      elevation: 5,
                    }
                  : {
                      backgroundColor: isDark ? colors.surfaceLight + "CC" : colors.surface,
                      borderColor: colors.surfaceBorder,
                    },
                { opacity: pressed ? 0.78 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] },
              ]}
            >
              <Ionicons
                name={iconName}
                size={13}
                color={isActive ? "#fff" : colors.textSecondary}
              />
              <Text
                style={[
                  styles.chipText,
                  { color: isActive ? "#fff" : colors.textSecondary },
                ]}
                numberOfLines={1}
                maxFontSizeMultiplier={1}
              >
                {f.label}
              </Text>
            </Pressable>
          </Animated.View>
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
    gap: 7,
    paddingBottom: 8,
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
