import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
import { formatCompactNumber } from "@/lib/number-format";

interface ReportGridProps {
  reportCounts: Record<string, number>;
  userReport: string | null;
  isLoggedIn: boolean;
  onReport: (type: string) => void;
}

export default function ReportGrid({ reportCounts, userReport, isLoggedIn, onReport }: ReportGridProps) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const REPORT_TYPES = [
    { key: "safe", label: "Safe", icon: "shield-checkmark", color: colors.safe, bg: colors.safeDim },
    { key: "scam", label: "Scam", icon: "warning", color: colors.danger, bg: colors.dangerDim },
    { key: "fake", label: "Fake", icon: "close-circle", color: colors.warning, bg: colors.warningDim },
    { key: "spam", label: "Spam", icon: "mail-unread", color: colors.accent, bg: colors.accentDim },
  ];

  return (
    <View>
      <Text style={styles.sectionTitle}>Report This QR</Text>
      <Text style={styles.sectionSubtext}>
        {isLoggedIn ? "Tap to submit your report" : "Sign in to report this QR code"}
      </Text>
      <View style={styles.grid}>
        {REPORT_TYPES.map((rt) => {
          const count = reportCounts[rt.key] || 0;
          const isSelected = userReport === rt.key;
          return (
            <Pressable
              key={rt.key}
              onPress={() => onReport(rt.key)}
              style={({ pressed }) => [
                styles.card,
                {
                  borderColor: isSelected ? rt.color : colors.surfaceBorder,
                  backgroundColor: isSelected ? rt.bg : colors.surface,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Ionicons name={rt.icon as any} size={24} color={rt.color} />
              <Text style={[styles.label, { color: rt.color }]}>{rt.label}</Text>
              <Text style={styles.count}>{formatCompactNumber(count)}</Text>
              {isSelected && <View style={[styles.dot, { backgroundColor: rt.color }]} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function makeStyles(c: ReturnType<typeof import("@/contexts/ThemeContext").useTheme>["colors"]) {
  return StyleSheet.create({
    sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: c.text, marginBottom: 4 },
    sectionSubtext: { fontSize: 13, fontFamily: "Inter_400Regular", color: c.textSecondary, marginBottom: 12 },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
    card: {
      width: "47%", borderRadius: 14, padding: 14, alignItems: "center",
      gap: 6, borderWidth: 1.5, position: "relative",
    },
    label: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
    count: { fontSize: 12, fontFamily: "Inter_400Regular", color: c.textMuted },
    dot: { position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: 4 },
  });
}
