import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/contexts/ThemeContext";
import { formatCompactNumber } from "@/lib/number-format";

interface ReportGridProps {
  reportCounts: Record<string, number>;
  userReport: string | null;
  isLoggedIn: boolean;
  onReport: (type: string) => void;
}

export default function ReportGrid({ reportCounts, userReport, isLoggedIn, onReport }: ReportGridProps) {
  const { colors, isDark } = useTheme();

  const REPORT_TYPES = [
    { key: "safe", label: "Safe",  icon: "shield-checkmark" as const, color: colors.safe,    desc: "Looks legitimate" },
    { key: "scam", label: "Scam",  icon: "warning" as const,          color: colors.danger,  desc: "Fraud attempt" },
    { key: "fake", label: "Fake",  icon: "close-circle" as const,     color: colors.warning, desc: "Not genuine" },
    { key: "spam", label: "Spam",  icon: "mail-unread" as const,      color: colors.primary, desc: "Unwanted content" },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="flag-outline" size={17} color={colors.textSecondary} />
          <Text style={[styles.title, { color: colors.text }]}>Rate this QR</Text>
        </View>
        {userReport ? (
          <View style={[styles.votedBadge, { backgroundColor: colors.safeDim, borderColor: colors.safe + "40" }]}>
            <Ionicons name="checkmark-circle" size={12} color={colors.safe} />
            <Text style={[styles.votedText, { color: colors.safe }]}>Voted</Text>
          </View>
        ) : (
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            {isLoggedIn ? "Tap to vote" : "Sign in to vote"}
          </Text>
        )}
      </View>

      <View style={styles.grid}>
        {REPORT_TYPES.map((rt) => {
          const count = reportCounts[rt.key] || 0;
          const isSelected = userReport === rt.key;
          const dimBg = rt.color + (isDark ? "18" : "10");

          return (
            <Pressable
              key={rt.key}
              onPress={() => onReport(rt.key)}
              style={({ pressed }) => [{ width: "47%", opacity: pressed ? 0.8 : 1 }]}
            >
              <View
                style={[
                  styles.card,
                  isSelected
                    ? { backgroundColor: dimBg, borderColor: rt.color + "60", borderWidth: 1.5 }
                    : { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, borderWidth: 1 },
                ]}
              >
                {isSelected && (
                  <View style={[styles.selectedCheck, { backgroundColor: rt.color }]}>
                    <Ionicons name="checkmark" size={9} color="#fff" />
                  </View>
                )}
                <View style={[styles.cardIconBg, { backgroundColor: rt.color + (isDark ? "20" : "12") }]}>
                  <Ionicons name={rt.icon} size={20} color={rt.color} />
                </View>
                <Text style={[styles.cardLabel, { color: isSelected ? rt.color : colors.text }]}>{rt.label}</Text>
                <Text style={[styles.cardDesc, { color: colors.textMuted }]}>{rt.desc}</Text>
                {count > 0 && (
                  <Text style={[styles.cardCount, { color: isSelected ? rt.color : colors.textSecondary }]}>
                    {formatCompactNumber(count)}
                  </Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 8 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  title: { fontSize: 16, fontFamily: "Inter_700Bold" },
  votedBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100, borderWidth: 1,
  },
  votedText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  hint: { fontSize: 12, fontFamily: "Inter_400Regular" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: {
    borderRadius: 16, padding: 14, alignItems: "center", gap: 5,
    position: "relative", overflow: "hidden",
  },
  selectedCheck: {
    position: "absolute", top: 8, right: 8,
    width: 16, height: 16, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
  },
  cardIconBg: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  cardLabel: { fontSize: 13, fontFamily: "Inter_700Bold" },
  cardDesc: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
  cardCount: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
