import React from "react";
import { View, Text, Switch, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/shared/contexts/ThemeContext";

export interface PrivacyToggleRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  label: string;
  sublabel: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}

export default function PrivacyToggleRow({
  icon, iconColor, iconBg, label, sublabel, value, onValueChange, disabled,
}: PrivacyToggleRowProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { opacity: disabled ? 0.45 : 1 }]}>
      <View style={[styles.icon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.sub, { color: colors.textMuted }]}>{sublabel}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.surfaceBorder, true: colors.primary + "99" }}
        thumbColor={value ? colors.primary : colors.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  sub: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
