import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/contexts/ThemeContext";

interface SafetyWarningCardProps {
  riskLevel: "caution" | "dangerous";
  warnings: string[];
  title?: string;
}

export default function SafetyWarningCard({ riskLevel, warnings, title }: SafetyWarningCardProps) {
  const { colors, isDark } = useTheme();
  const isDangerous = riskLevel === "dangerous";
  const gradient: [string, string] = isDangerous ? [colors.danger, colors.dangerShade] : [colors.warning, colors.warningShade];
  const bg = isDangerous ? colors.dangerDim : colors.warningDim;
  const borderColor = isDangerous ? colors.danger : colors.warning;
  const icon = isDangerous ? "shield-half-outline" : "alert-circle-outline";
  const defaultTitle = isDangerous ? "Security Warning" : "Proceed with Caution";
  const displayTitle = (title ?? defaultTitle).replace(/^⚠\s*/, "");

  return (
    <View style={[styles.card, { backgroundColor: bg, borderColor: borderColor + "50" }]}>
      <View style={styles.headerRow}>
        <LinearGradient colors={gradient} style={styles.iconCircle} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Ionicons name={icon as any} size={24} color="#fff" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eyebrow, { color: borderColor }]}>
            {isDangerous ? "DANGER DETECTED" : "CAUTION"}
          </Text>
          <Text style={[styles.title, { color: isDark ? "#fff" : "#1a1a1a" }]}>{displayTitle}</Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: borderColor + "30" }]} />

      <View style={styles.warningsContainer}>
        {warnings.map((w, i) => (
          <View key={i} style={styles.warningRow}>
            <View style={[styles.dot, { backgroundColor: gradient[0] }]} />
            <Text style={[styles.warningText, { color: isDark ? colors.text : "#1f1f1f" }]}>{w}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, padding: 18, marginBottom: 14, borderWidth: 1, gap: 14 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  iconCircle: { width: 52, height: 52, borderRadius: 18, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  eyebrow: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1, marginBottom: 2 },
  title: { fontSize: 17, fontFamily: "Inter_700Bold", lineHeight: 22 },
  divider: { height: 1 },
  warningsContainer: { gap: 10 },
  warningRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  dot: { width: 7, height: 7, borderRadius: 4, marginTop: 6, flexShrink: 0 },
  warningText: { flex: 1, fontSize: 13.5, fontFamily: "Inter_400Regular", lineHeight: 20 },
});
