import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { RATE_TYPES } from "@/features/qr-detail/data/reportTypes";

interface ReportGridProps {
  reportCounts: Record<string, number>;
  userReport: string | null;
  isLoggedIn: boolean;
  isPayment?: boolean;
  disabled?: boolean;
  onReport: (type: string) => void;
}

export default function ReportGrid({ reportCounts: _reportCounts, userReport, isLoggedIn, isPayment, disabled, onReport }: ReportGridProps) {
  const { colors, isDark } = useTheme();

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
        {RATE_TYPES.map((rt) => {
          const isSelected = userReport === rt.key;
          const rtColor = rt.color(colors);
          return (
            <Pressable
              key={rt.key}
              onPress={() => { if (!disabled) onReport(rt.key); }}
              disabled={disabled}
              style={({ pressed }) => [
                styles.rateBtn,
                isSelected
                  ? { backgroundColor: rtColor + (isDark ? "22" : "14"), borderColor: rtColor, borderWidth: 1.5 }
                  : { backgroundColor: isDark ? colors.surfaceLight : colors.background, borderColor: colors.surfaceBorder, borderWidth: 1 },
                { opacity: disabled ? 0.5 : pressed ? 0.75 : 1, transform: [{ scale: pressed && !disabled ? 0.96 : 1 }] },
              ]}
            >
              <Ionicons
                name={rt.icon as any}
                size={17}
                color={isSelected ? rtColor : colors.textMuted}
              />
              <Text style={[styles.rateBtnLabel, { color: isSelected ? rtColor : colors.textSecondary }]}>
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
    gap: 6,
    paddingVertical: 13,
    paddingHorizontal: 4,
    borderRadius: 14,
  },
  rateBtnLabel: { fontSize: 12, fontFamily: "Inter_700Bold" },
});
