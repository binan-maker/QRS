import React, { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "@/shared/utils/haptics";
import { useTheme } from "@/shared/contexts/ThemeContext";
import type { FilterKey, ActiveFilters } from "@/features/history/types";

interface FilterOption {
  key:    FilterKey;
  label:  string;
  count?: number;
}

interface FilterBarProps {
  filters:        FilterOption[];
  activeFilters:  ActiveFilters;
  onFilterChange: (key: FilterKey) => void;
}

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const FILTER_ICONS: Record<string, IoniconName> = {
  all:       "apps-outline",
  payment:   "card-outline",
  url:       "globe-outline",
  contact:   "person-outline",
  wifi:      "wifi-outline",
  others:    "ellipsis-horizontal-circle-outline",
  favorites: "bookmark-outline",
};

const FILTER_ICONS_ACTIVE: Record<string, IoniconName> = {
  all:       "apps",
  payment:   "card",
  url:       "globe",
  contact:   "person",
  wifi:      "wifi",
  others:    "ellipsis-horizontal-circle",
  favorites: "bookmark",
};

const FilterBar = React.memo(function FilterBar({
  filters,
  activeFilters,
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
        const isActive   = activeFilters.includes(f.key);

        const activeColor = isFavorite ? colors.danger : colors.primary;
        const iconName    = isActive
          ? (FILTER_ICONS_ACTIVE[f.key] ?? "apps")
          : (FILTER_ICONS[f.key]        ?? "apps-outline");

        // Only show the count badge on "All" — per-filter counts recompute
        // across multiple data-load waves (local → cloud → stats) which makes
        // chips resize and the ScrollView bounce. "All" is stable because it
        // comes from pre-warmed scanStats, not from iterating history.
        const showCount = f.key === "all" && typeof f.count === "number" && f.count > 0;

        return (
          <Animated.View
            key={f.key}
            entering={FadeInDown.delay(25 + Math.min(idx, 6) * 16).duration(250)}
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
                      borderColor:     "transparent",
                      shadowColor:     activeColor,
                      shadowOffset:    { width: 0, height: 4 },
                      shadowOpacity:   isDark ? 0.45 : 0.28,
                      shadowRadius:    10,
                      elevation:       5,
                    }
                  : {
                      backgroundColor: isDark
                        ? colors.surfaceLight + "CC"
                        : colors.surface,
                      borderColor: colors.surfaceBorder,
                    },
                { opacity: pressed ? 0.78 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] },
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
              {showCount && (
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: isActive
                        ? "rgba(255,255,255,0.28)"
                        : colors.surfaceBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      { color: isActive ? "#fff" : colors.textMuted },
                    ]}
                    maxFontSizeMultiplier={1}
                  >
                    {f.count! > 99 ? "99+" : f.count}
                  </Text>
                </View>
              )}
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
    flexGrow:   0,
    flexShrink: 0,
  },
  container: {
    paddingHorizontal: 16,
    gap:         7,
    paddingBottom: 8,
    paddingTop:  2,
    flexDirection: "row",
    alignItems:  "center",
  },
  chip: {
    flexDirection:   "row",
    alignItems:      "center",
    gap:             5,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius:    100,
    borderWidth:     1,
  },
  chipText: {
    fontSize:    12,
    fontFamily:  "Inter_600SemiBold",
    letterSpacing: 0.1,
  },
  badge: {
    minWidth:        18,
    height:          16,
    borderRadius:    100,
    alignItems:      "center",
    justifyContent:  "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize:   10,
    fontFamily: "Inter_700Bold",
  },
});
