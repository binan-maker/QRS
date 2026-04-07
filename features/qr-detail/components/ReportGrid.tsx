import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";

interface ReportGridProps {
  reportCounts: Record<string, number>;
  userReport: string | null;
  isLoggedIn: boolean;
  isPayment?: boolean;
  onReport: (type: string) => void;
}

export default function ReportGrid({ reportCounts, userReport, isLoggedIn, isPayment, onReport }: ReportGridProps) {
  const { colors, isDark } = useTheme();

  const REPORT_TYPES = [
    { key: "safe", label: "Safe",  icon: "shield-checkmark" as const, color: colors.safe    },
    { key: "scam", label: "Scam",  icon: "warning" as const,          color: colors.danger  },
    { key: "fake", label: "Fake",  icon: "close-circle" as const,     color: colors.warning },
    { key: "spam", label: "Spam",  icon: "mail-unread" as const,      color: colors.primary },
  ];

  const total = REPORT_TYPES.reduce((sum, rt) => sum + (reportCounts[rt.key] || 0), 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Rate this QR</Text>
        {userReport ? (
          <View style={[styles.votedBadge, { backgroundColor: colors.safeDim, borderColor: colors.safe + "50" }]}>
            <Ionicons name="checkmark-circle" size={11} color={colors.safe} />
            <Text style={[styles.votedText, { color: colors.safe }]}>Voted</Text>
          </View>
        ) : (
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            Tap to vote
          </Text>
        )}
      </View>

      <View style={styles.row}>
        {REPORT_TYPES.map((rt) => {
          const isSelected = userReport === rt.key;
          const count = reportCounts[rt.key] || 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const showPct = count > 0;

          return (
            <Pressable
              key={rt.key}
              onPress={() => onReport(rt.key)}
              style={({ pressed }) => [
                styles.rateBtn,
                isSelected
                  ? { backgroundColor: rt.color + (isDark ? "22" : "14"), borderColor: rt.color, borderWidth: 1.5 }
                  : { backgroundColor: isDark ? colors.surfaceLight : colors.background, borderColor: colors.surfaceBorder, borderWidth: 1 },
                { opacity: pressed ? 0.75 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] },
              ]}
            >
              <Ionicons
                name={rt.icon}
                size={17}
                color={isSelected ? rt.color : colors.textMuted}
              />
              <Text style={[styles.rateBtnLabel, { color: isSelected ? rt.color : colors.textSecondary }]}>
                {rt.label}
              </Text>
              {showPct ? (
                <View style={[
                  styles.pctBadge,
                  { backgroundColor: rt.color + (isDark ? "22" : "14"), borderColor: rt.color + "40" }
                ]}>
                  <Text style={[styles.pctText, { color: rt.color }]}>{pct}%</Text>
                </View>
              ) : (
                <View style={styles.pctPlaceholder} />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  title: { fontSize: 16, fontFamily: "Inter_700Bold" },
  votedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
  },
  votedText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  hint: { fontSize: 12, fontFamily: "Inter_400Regular" },
  row: { flexDirection: "row", gap: 8 },
  rateBtn: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 13,
    paddingHorizontal: 4,
    borderRadius: 14,
  },
  rateBtnLabel: { fontSize: 12, fontFamily: "Inter_700Bold" },
  pctBadge: {
    borderRadius: 100,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  pctText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.2 },
  pctPlaceholder: { height: 20 },
});
