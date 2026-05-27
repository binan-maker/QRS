import React from "react";
import { Pressable, Text, StyleSheet, ViewStyle, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/shared/contexts/ThemeContext";

interface Props {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "danger";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export default function GradientButton({
  label,
  onPress,
  icon,
  size = "md",
  variant = "primary",
  disabled,
  loading,
  style,
}: Props) {
  const { colors } = useTheme();

  const gradients: Record<string, [string, string]> = {
    primary: [colors.primary, (colors as any).primaryShade ?? colors.primary],
    danger: [colors.danger, (colors as any).dangerShade ?? colors.danger],
  };

  const padV = size === "sm" ? 11 : size === "lg" ? 17 : 14;
  const fontSize = size === "sm" ? 13 : size === "lg" ? 16 : 15;
  const iconSize = fontSize + 3;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.wrap,
        style,
        { opacity: pressed || disabled || loading ? 0.72 : 1 },
      ]}
    >
      <LinearGradient
        colors={gradients[variant]}
        style={[styles.inner, { paddingVertical: padV }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            {icon && <Ionicons name={icon} size={iconSize} color="#fff" />}
            <Text style={[styles.label, { fontSize }]}>{label}</Text>
          </>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    overflow: "hidden",
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  label: {
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
});
