import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useQrDetail } from "@/features/qr-detail/hooks/useQrDetail";

type Verdict = ReturnType<ReturnType<typeof useQrDetail>["getCombinedVerdict"]>;

export function VerdictBanner({ verdict, offlineMode }: { verdict: Verdict; offlineMode: boolean }) {
  const { colors, isDark } = useTheme();

  if (offlineMode) {
    const accent = "#f59e0b";
    return (
      <View style={[styles.banner, { backgroundColor: isDark ? "#14100300" : "#fffbeb", borderColor: accent + "28" }]}>
        <View style={[styles.accentBar, { backgroundColor: accent }]} />
        <View style={[styles.iconBox, { borderColor: accent + "40", backgroundColor: accent + "10" }]}>
          <Ionicons name="cloud-offline-outline" size={20} color={accent} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.eyebrowRow}>
            <View style={[styles.statusDot, { backgroundColor: accent }]} />
            <Text style={[styles.eyebrow, { color: accent }]}>OFFLINE MODE</Text>
          </View>
          <Text style={[styles.label, { color: isDark ? "#e2e8f0" : "#1e293b" }]}>Cached Community Data</Text>
          <Text style={[styles.reason, { color: colors.textSecondary }]}>
            Connect to see the latest community score
          </Text>
        </View>
      </View>
    );
  }

  const isTrusted = verdict.level === "safe";
  const accent = isTrusted ? "#22c55e" : "#f59e0b";
  const iconName: keyof typeof Ionicons.glyphMap = isTrusted
    ? "people-outline"
    : verdict.label === "UNVERIFIED QR"
      ? "help-circle-outline"
      : "information-circle-outline";

  return (
    <View style={[styles.banner, {
      backgroundColor: isTrusted ? (isDark ? "#0a1a0e" : "#f0fdf4") : (isDark ? "#16120400" : "#fffbeb"),
      borderColor: accent + "28",
    }]}>
      <View style={[styles.accentBar, { backgroundColor: accent }]} />
      <View style={[styles.iconBox, { borderColor: accent + "45", backgroundColor: accent + "12" }]}>
        <Ionicons name={iconName} size={22} color={accent} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.eyebrowRow}>
          <View style={[styles.statusDot, { backgroundColor: accent }]} />
          <Text style={[styles.eyebrow, { color: accent }]}>COMMUNITY SIGNAL</Text>
        </View>
        <Text style={[styles.label, { color: isDark ? "#e2e8f0" : "#1e293b" }]}>{verdict.label}</Text>
        <Text style={[styles.reason, { color: isDark ? "#94a3b8" : "#64748b" }]} numberOfLines={2}>
          {verdict.reason}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 16,
    paddingVertical: 16,
    paddingRight: 16,
    paddingLeft: 0,
    marginBottom: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  accentBar: { width: 4, alignSelf: "stretch", borderRadius: 2, flexShrink: 0 },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  eyebrowRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 3 },
  statusDot: { width: 5, height: 5, borderRadius: 2.5, flexShrink: 0 },
  eyebrow: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.4 },
  label: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 2, lineHeight: 22 },
  reason: { fontSize: 12.5, fontFamily: "Inter_400Regular", lineHeight: 18 },
});