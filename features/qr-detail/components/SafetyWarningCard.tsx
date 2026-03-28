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
  const icon: keyof typeof Ionicons.glyphMap = isDangerous ? "shield-half-outline" : "alert-circle-outline";
  const defaultTitle = isDangerous ? "Security Warning" : "Proceed with Caution";
  const displayTitle = (title ?? defaultTitle).replace(/^⚠\s*/, "");

  return (
    <View style={[styles.card, { backgroundColor: bg, borderColor: borderColor + "55" }]}>
      <View style={styles.headerRow}>
        <LinearGradient colors={gradient} style={styles.iconBox} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Ionicons name={icon} size={22} color="#fff" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eyebrow, { color: borderColor }]} maxFontSizeMultiplier={1}>
            {isDangerous ? "DANGER DETECTED" : "CAUTION"}
          </Text>
          <Text style={[styles.title, { color: isDark ? "#fff" : "#111" }]} maxFontSizeMultiplier={1}>
            {displayTitle}
          </Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: borderColor + "30" }]} />

      <View style={styles.warningsContainer}>
        {warnings.map((w, i) => (
          <View key={i} style={styles.warningRow}>
            <View style={[styles.dot, { backgroundColor: gradient[0] }]} />
            <Text style={[styles.warningText, { color: isDark ? colors.text : "#1f1f1f" }]} maxFontSizeMultiplier={1}>
              {w}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    gap: 14,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  eyebrow: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  title: { fontSize: 16, fontFamily: "Inter_700Bold", lineHeight: 21 },
  divider: { height: StyleSheet.hairlineWidth },
  warningsContainer: { gap: 10 },
  warningRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
    flexShrink: 0,
  },
  warningText: {
    flex: 1,
    fontSize: 13.5,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
});
