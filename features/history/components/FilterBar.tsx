import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "@/lib/haptics";
import { useTheme } from "@/contexts/ThemeContext";
import type { Filter } from "@/hooks/useHistory";

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

        const activeColor = isFavorite ? colors.danger : colors.primary;
        const iconName    = isActive
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
            {typeof f.count === "number" && f.count > 0 && (
              <View style={[
                styles.countPill,
                { backgroundColor: isActive ? "rgba(255,255,255,0.22)" : activeColor + "20" },
              ]}>
                <Text style={[
                  styles.countText,
                  { color: isActive ? "#fff" : activeColor },
                ]} maxFontSizeMultiplier={1}>
                  {f.count > 999 ? "999+" : f.count}
                </Text>
              </View>
            )}
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
  countPill: {
    borderRadius: 100,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: "center",
  },
  countText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
});
