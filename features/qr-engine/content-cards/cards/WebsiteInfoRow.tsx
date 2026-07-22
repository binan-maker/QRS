import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "./WebsiteCardStyles";

interface InfoRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  accent: string;
  isDark: boolean;
}

export function InfoRow({ icon, label, value, accent, isDark }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIcon, { backgroundColor: accent + "22" }]}>
        <Ionicons name={icon} size={11} color={accent} />
      </View>
      <Text style={[styles.infoLabel, { color: isDark ? "#64748B" : "#93C5FD" }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: isDark ? "#E2E8F0" : "#1E40AF" }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}
