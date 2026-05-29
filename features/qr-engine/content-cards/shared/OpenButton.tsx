import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

interface OpenButtonProps {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  gradient: readonly [string, string];
  onPress: () => void;
}

export function OpenButton({ label, icon = "open-outline", gradient, onPress }: OpenButtonProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
      <LinearGradient
        colors={[...gradient]}
        style={styles.btn}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Ionicons name={icon} size={14} color="#fff" />
        <Text style={styles.label}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14 },
  label: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },
});
