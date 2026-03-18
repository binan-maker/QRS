import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { formatCompactNumber } from "@/lib/number-format";

const REPORT_TYPES = [
  { key: "safe", label: "Safe", icon: "shield-checkmark", color: Colors.dark.safe, bg: Colors.dark.safeDim },
  { key: "scam", label: "Scam", icon: "warning", color: Colors.dark.danger, bg: Colors.dark.dangerDim },
  { key: "fake", label: "Fake", icon: "close-circle", color: Colors.dark.warning, bg: Colors.dark.warningDim },
  { key: "spam", label: "Spam", icon: "mail-unread", color: Colors.dark.accent, bg: Colors.dark.accentDim },
];

interface ReportGridProps {
  reportCounts: Record<string, number>;
  userReport: string | null;
  reportLoading: string | null;
  isLoggedIn: boolean;
  onReport: (type: string) => void;
}

export default function ReportGrid({ reportCounts, userReport, reportLoading, isLoggedIn, onReport }: ReportGridProps) {
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
              disabled={!!reportLoading}
              style={({ pressed }) => [
                styles.card,
                {
                  borderColor: isSelected ? rt.color : Colors.dark.surfaceBorder,
                  backgroundColor: isSelected ? rt.bg : Colors.dark.surface,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              {reportLoading === rt.key ? (
                <ActivityIndicator size="small" color={rt.color} />
              ) : (
                <Ionicons name={rt.icon as any} size={24} color={rt.color} />
              )}
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

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.dark.text, marginBottom: 4 },
  sectionSubtext: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary, marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  card: {
    width: "47%", borderRadius: 14, padding: 14, alignItems: "center",
    gap: 6, borderWidth: 1.5, position: "relative",
  },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  count: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted },
  dot: { position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: 4 },
});
