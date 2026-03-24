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
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Report This QR</Text>
        {userReport && (
          <View style={styles.votedBadge}>
            <Ionicons name="checkmark-circle" size={13} color={colors.safe} />
            <Text style={[styles.votedBadgeText, { color: colors.safe }]}>Voted · tap to change or undo</Text>
          </View>
        )}
      </View>
      {!userReport && (
        <Text style={styles.sectionSubtext}>
          {isLoggedIn ? "Tap a card to submit your report" : "Sign in to report this QR code"}
        </Text>
      )}
      <View style={styles.grid}>
        {REPORT_TYPES.map((rt) => {
          const count = reportCounts[rt.key] || 0;
          const isSelected = userReport === rt.key;
          const iconColor = isSelected ? rt.color : colors.textMuted;
          const labelColor = isSelected ? rt.color : colors.textSecondary;
          return (
            <Pressable
              key={rt.key}
              onPress={() => onReport(rt.key)}
              style={({ pressed }) => [
                styles.card,
                {
                  borderColor: isSelected ? rt.color : colors.surfaceBorder,
                  backgroundColor: isSelected ? rt.bg : colors.surface,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              {isSelected && (
                <View style={[styles.checkBadge, { backgroundColor: rt.color }]}>
                  <Ionicons name="checkmark" size={10} color="#fff" />
                </View>
              )}
              <Ionicons name={rt.icon as any} size={24} color={iconColor} />
              <Text style={[styles.label, { color: labelColor }]}>{rt.label}</Text>
              <Text style={[styles.count, isSelected && { color: rt.color, fontFamily: "Inter_600SemiBold" }]}>
                {count > 0 ? formatCompactNumber(count) : "0"}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function makeStyles(c: ReturnType<typeof import("@/contexts/ThemeContext").useTheme>["colors"]) {
  return StyleSheet.create({
    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
    sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: c.text },
    sectionSubtext: { fontSize: 13, fontFamily: "Inter_400Regular", color: c.textSecondary, marginBottom: 12 },
    votedBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
    votedBadgeText: { fontSize: 11, fontFamily: "Inter_400Regular" },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16, marginTop: 12 },
    card: {
      width: "47%", borderRadius: 14, padding: 14, alignItems: "center",
      gap: 6, borderWidth: 1.5, position: "relative",
    },
    checkBadge: {
      position: "absolute", top: 8, right: 8,
      width: 18, height: 18, borderRadius: 9,
      alignItems: "center", justifyContent: "center",
    },
    label: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
    count: { fontSize: 12, fontFamily: "Inter_400Regular", color: c.textMuted },
  });
}
