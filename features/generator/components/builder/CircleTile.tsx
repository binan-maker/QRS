import React, { memo } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
import { catColor } from "@/features/generator/data/category-config";
import type { CategorySchema } from "@/lib/schemas/CategorySchema";
import { S } from "./builderStyles";

interface Props {
  cat: CategorySchema;
  size: number;
  circleD: number;
  onPress: () => void;
}

const CircleTile = memo(function CircleTile({ cat, size, circleD, onPress }: Props) {
  const { colors } = useTheme();
  const col = catColor(cat.id);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        S.circleTile,
        { width: size, opacity: pressed ? 0.65 : 1, transform: [{ scale: pressed ? 0.9 : 1 }] },
      ]}
    >
      <View style={[S.circleIcon, {
        width: circleD, height: circleD,
        borderRadius: circleD / 2,
        backgroundColor: col + "18",
        borderColor: col + "40",
      }]}>
        <Ionicons name={cat.icon as any} size={Math.floor(circleD * 0.43)} color={col} />
        {cat.isIndiaFirst && (
          <View style={S.indiaFlag}>
            <Text style={{ fontSize: 7 }}>🇮🇳</Text>
          </View>
        )}
      </View>
      <Text style={[S.circleTileLabel, { color: colors.textSecondary }]} numberOfLines={2}>
        {cat.name}
      </Text>
    </Pressable>
  );
});

export default CircleTile;
