import React from "react";
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
            style={[
              styles.chip,
              isActive && styles.chipActive,
              isFavorite && styles.chipFavorite,
              isFavorite && isActive && styles.chipFavoriteActive,
            ]}
          >
            {isFavorite ? (
              <Ionicons
                name={isActive ? "heart" : "heart-outline"}
                size={13}
                color={isActive ? Colors.dark.danger : Colors.dark.textMuted}
              />
            ) : null}
            <Text style={[
              styles.chipText,
              isActive && styles.chipTextActive,
              isFavorite && isActive && { color: Colors.dark.danger },
            ]}>
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
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 12,
    flexDirection: "row",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
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
    borderColor: Colors.dark.danger + "50",
  },
  chipFavoriteActive: {
    backgroundColor: Colors.dark.dangerDim,
    borderColor: Colors.dark.danger,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textMuted,
  },
  chipTextActive: {
    color: Colors.dark.primary,
  },
});
