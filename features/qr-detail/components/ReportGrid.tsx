import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { RATE_TYPES } from "@/features/qr-detail/data/reportTypes";

export interface ReportGridProps {
  reportCounts?: Record<string, number>;
  userReport: string | null;
  isLoggedIn?: boolean;
  isPayment?: boolean;
  loading?: boolean;
  onReport: (type: string) => void;
}

export default function ReportGrid({ userReport, loading, onReport }: ReportGridProps) {
  const { colors, isDark } = useTheme();
  const activeType = RATE_TYPES.find((rt) => rt.key === userReport);
  const badgeColor = activeType ? activeType.color(colors) : colors.safe;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Rate this QR</Text>
        {userReport ? (
          <View style={[styles.votedBadge, { backgroundColor: badgeColor + (isDark ? "22" : "14"), borderColor: badgeColor + "50" }]}>
            <Ionicons name={(activeType?.icon as any) ?? "checkmark-circle"} size={11} color={badgeColor} />
            <Text style={[styles.votedText, { color: badgeColor }]}>{activeType ? `Voted ${activeType.label}` : "Voted"}</Text>
          </View>
        ) : (
          <Text style={[styles.hint, { color: colors.textMuted }]}>Tap to vote</Text>
        )}
      </View>

      <View style={styles.row}>
        {RATE_TYPES.map((rt) => {
          const selected = userReport === rt.key;
          const color = rt.color(colors);
          return (
            <Pressable
              key={rt.key}
              onPress={() => onReport(rt.key)}
              style={({ pressed }) => [
                styles.rateBtn,
                selected
                  ? { backgroundColor: color + (isDark ? "22" : "14"), borderColor: color, borderWidth: 1.5 }
                  : { backgroundColor: isDark ? colors.surfaceLight : colors.background, borderColor: colors.surfaceBorder, borderWidth: 1 },
                { opacity: loading ? 0.65 : pressed ? 0.75 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] },
              ]}
            >
              <Ionicons name={rt.icon as any} size={17} color={selected ? color : colors.textMuted} />
              <Text style={[styles.rateBtnLabel, { color: selected ? color : colors.textSecondary }]}>
                {rt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  title: { fontSize: 16, fontFamily: "Inter_700Bold" },
  votedBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 100, borderWidth: 1 },
  votedText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  hint: { fontSize: 12, fontFamily: "Inter_400Regular" },
  row: { flexDirection: "row", gap: 8 },
  rateBtn: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 13, paddingHorizontal: 4, borderRadius: 14 },
  rateBtnLabel: { fontSize: 12, fontFamily: "Inter_700Bold" },
});
