import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";

interface SafetyWarningCardProps {
  riskLevel: "caution" | "dangerous";
  warnings: string[];
  title?: string;
}

export default function SafetyWarningCard({ riskLevel: _riskLevel, warnings, title }: SafetyWarningCardProps) {
  const { colors } = useTheme();
  const accent = colors.warning;
  const bg = colors.warningDim;
  const icon: keyof typeof Ionicons.glyphMap = "alert-circle";
  const defaultTitle = "Safety Notice";
  const displayTitle = (title ?? defaultTitle).replace(/^⚠\s*/, "");

  return (
    <View style={[styles.card, { backgroundColor: bg, borderColor: accent + "40", borderLeftColor: accent, borderLeftWidth: 3 }]}>
      <View style={styles.headerRow}>
        <Ionicons name={icon} size={16} color={accent} />
        <Text style={[styles.title, { color: isDark ? "#fff" : "#111" }]} maxFontSizeMultiplier={1}>
          {displayTitle}
        </Text>
      </View>
      {warnings.map((w, i) => (
        <View key={i} style={styles.warningRow}>
          <View style={[styles.dot, { backgroundColor: accent }]} />
          <Text style={[styles.warningText, { color: colors.textSecondary }]} maxFontSizeMultiplier={1}>
            {w}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    gap: 8,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 14, fontFamily: "Inter_700Bold", flex: 1 },
  warningRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingLeft: 2 },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 6,
    flexShrink: 0,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
});
