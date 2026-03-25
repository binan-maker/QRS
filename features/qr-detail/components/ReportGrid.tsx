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

const REPORT_TYPES = [
  { key: "safe", label: "Safe",  icon: "shield-checkmark" as const, gradient: ["#10B981", "#06B6D4"] as [string, string], desc: "Looks legit" },
  { key: "scam", label: "Scam",  icon: "warning" as const,          gradient: ["#EF4444", "#DC2626"] as [string, string], desc: "Fraud attempt" },
  { key: "fake", label: "Fake",  icon: "close-circle" as const,     gradient: ["#F59E0B", "#F97316"] as [string, string], desc: "Not genuine" },
  { key: "spam", label: "Spam",  icon: "mail-unread" as const,      gradient: ["#8B5CF6", "#EC4899"] as [string, string], desc: "Unwanted" },
];

export default function ReportGrid({ reportCounts, userReport, isLoggedIn, onReport }: ReportGridProps) {
  const { colors, isDark } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <LinearGradient colors={["#EF4444", "#F97316"]} style={styles.titleIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Ionicons name="flag" size={14} color="#fff" />
          </LinearGradient>
          <Text style={[styles.title, { color: colors.text }]}>Rate this QR</Text>
        </View>
        {userReport ? (
          <View style={[styles.votedBadge, { backgroundColor: "#10B98118", borderColor: "#10B98140" }]}>
            <Ionicons name="checkmark-circle" size={12} color="#10B981" />
            <Text style={styles.votedText}>Voted</Text>
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
          return (
            <Pressable
              key={rt.key}
              onPress={() => onReport(rt.key)}
              style={({ pressed }) => [{ width: "47%", opacity: pressed ? 0.8 : 1 }]}
            >
              {isSelected ? (
                <LinearGradient colors={rt.gradient} style={styles.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <View style={styles.selectedCheck}>
                    <Ionicons name="checkmark" size={11} color="#fff" />
                  </View>
                  <View style={[styles.cardIconBg, { backgroundColor: "rgba(255,255,255,0.25)" }]}>
                    <Ionicons name={rt.icon} size={26} color="#fff" />
                  </View>
                  <Text style={[styles.cardLabel, { color: "#fff" }]}>{rt.label}</Text>
                  <Text style={[styles.cardDesc, { color: "rgba(255,255,255,0.8)" }]}>{rt.desc}</Text>
                  <Text style={[styles.cardCount, { color: "rgba(255,255,255,0.9)" }]}>
                    {count > 0 ? formatCompactNumber(count) : "–"}
                  </Text>
                </LinearGradient>
              ) : (
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, borderWidth: 1 }]}>
                  <LinearGradient colors={[rt.gradient[0] + (isDark ? "20" : "14"), "transparent"]} style={StyleSheet.absoluteFill} />
                  <LinearGradient colors={rt.gradient} style={styles.cardIconBg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    <Ionicons name={rt.icon} size={26} color="#fff" />
                  </LinearGradient>
                  <Text style={[styles.cardLabel, { color: colors.text }]}>{rt.label}</Text>
                  <Text style={[styles.cardDesc, { color: colors.textMuted }]}>{rt.desc}</Text>
                  <Text style={[styles.cardCount, { color: rt.gradient[0] }]}>
                    {count > 0 ? formatCompactNumber(count) : "–"}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 8 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  titleIcon: { width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 17, fontFamily: "Inter_700Bold" },
  votedBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 100, borderWidth: 1 },
  votedText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#10B981" },
  hint: { fontSize: 12, fontFamily: "Inter_400Regular" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: {
    borderRadius: 20, padding: 16, alignItems: "center", gap: 7,
    position: "relative", overflow: "hidden",
  },
  selectedCheck: {
    position: "absolute", top: 10, right: 10,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center", justifyContent: "center",
  },
  cardIconBg: {
    width: 52, height: 52, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
  },
  cardLabel: { fontSize: 14, fontFamily: "Inter_700Bold" },
  cardDesc: { fontSize: 11, fontFamily: "Inter_400Regular" },
  cardCount: { fontSize: 13, fontFamily: "Inter_700Bold" },
});
