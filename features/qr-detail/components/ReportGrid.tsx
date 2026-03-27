import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";

interface ReportGridProps {
  reportCounts: Record<string, number>;
  userReport: string | null;
  isLoggedIn: boolean;
  onReport: (type: string) => void;
}

export default function ReportGrid({ reportCounts: _reportCounts, userReport, isLoggedIn, onReport }: ReportGridProps) {
  const { colors, isDark } = useTheme();

  const REPORT_TYPES = [
    { key: "safe", label: "Safe",  icon: "shield-checkmark" as const, color: colors.safe    },
    { key: "scam", label: "Scam",  icon: "warning" as const,          color: colors.danger  },
    { key: "fake", label: "Fake",  icon: "close-circle" as const,     color: colors.warning },
    { key: "spam", label: "Spam",  icon: "mail-unread" as const,      color: colors.primary },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="flag-outline" size={15} color={colors.textSecondary} />
          <Text style={[styles.title, { color: colors.text }]}>Rate this QR</Text>
        </View>
        {userReport ? (
          <View style={[styles.votedBadge, { backgroundColor: colors.safeDim, borderColor: colors.safe + "40" }]}>
            <Ionicons name="checkmark-circle" size={11} color={colors.safe} />
            <Text style={[styles.votedText, { color: colors.safe }]}>Voted</Text>
          </View>
        ) : (
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            {isLoggedIn ? "Tap to vote" : "Sign in to vote"}
          </Text>
        )}
      </View>

      <View style={styles.row}>
        {REPORT_TYPES.map((rt) => {
          const isSelected = userReport === rt.key;
          return (
            <Pressable
              key={rt.key}
              onPress={() => onReport(rt.key)}
              style={({ pressed }) => [
                styles.rateBtn,
                isSelected
                  ? { backgroundColor: rt.color + (isDark ? "20" : "15"), borderColor: rt.color + "60", borderWidth: 1.5 }
                  : { backgroundColor: isDark ? colors.surfaceLight : colors.background, borderColor: colors.surfaceBorder, borderWidth: 1 },
                { opacity: pressed ? 0.75 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] },
              ]}
            >
              <Ionicons name={rt.icon} size={15} color={isSelected ? rt.color : colors.textMuted} />
              <Text style={[styles.rateBtnLabel, { color: isSelected ? rt.color : colors.textSecondary }]}>
                {rt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.disclaimer}>
        <Ionicons name="information-circle-outline" size={12} color={colors.textMuted} />
        <Text style={[styles.disclaimerText, { color: colors.textMuted }]}>
          Always verify the merchant name and UPI ID before paying
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 10 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  title: { fontSize: 15, fontFamily: "Inter_700Bold" },
  votedBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100, borderWidth: 1,
  },
  votedText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  hint: { fontSize: 11, fontFamily: "Inter_400Regular" },
  row: { flexDirection: "row", gap: 8 },
  rateBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, paddingVertical: 9, paddingHorizontal: 4,
    borderRadius: 12, position: "relative",
  },
  rateBtnLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  disclaimer: {
    flexDirection: "row", alignItems: "flex-start", gap: 6,
    marginTop: 8,
  },
  disclaimerText: { fontSize: 11, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 15 },
});
