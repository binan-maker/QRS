import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Linking } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";
import type { GuardLink } from "@/services/guard-service";

export function LivingShieldBanner({
  guardLink,
  loading,
}: {
  guardLink: GuardLink | null;
  loading: boolean;
}) {
  const { colors, isDark } = useTheme();
  const accent = "#6366f1";

  function handleOpenDestination() {
    if (!guardLink?.currentDestination) return;
    const dest = guardLink.currentDestination;
    let parsed: URL;
    try {
      parsed = new URL(dest.startsWith("http") ? dest : `https://${dest}`);
    } catch {
      return;
    }
    const scheme = parsed.protocol;
    if (scheme !== "https:" && scheme !== "http:") return;
    const hostname = parsed.hostname.toLowerCase();
    const privateIPPatterns = [
      /^localhost$/,
      /^127\./,
      /^10\./,
      /^192\.168\./,
      /^172\.(1[6-9]|2\d|3[01])\./,
      /^169\.254\./,
      /^::1$/,
    ];
    if (privateIPPatterns.some((re) => re.test(hostname))) return;
    Linking.openURL(parsed.href);
  }

  const recentlyChanged = guardLink?.destinationChangedAt
    ? Date.now() - new Date(guardLink.destinationChangedAt).getTime() < 24 * 60 * 60 * 1000
    : false;

  return (
    <Animated.View entering={FadeInDown.delay(60).duration(260)}>
      <View
        style={[
          styles.card,
          { backgroundColor: isDark ? "#1a1a2e" : "#f0f0ff", borderColor: accent + "30" },
        ]}
      >
        <LinearGradient
          colors={[accent + "18", accent + "06"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={styles.header}>
          <View
            style={[styles.iconWrap, { backgroundColor: accent + "20", borderColor: accent + "40" }]}
          >
            <Ionicons name="git-branch-outline" size={22} color={accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: accent }]}>Smart Redirect QR</Text>
            <Text style={[styles.sub, { color: colors.textSecondary }]}>
              Dynamic QR — destination is owner-controlled &amp; verified
            </Text>
          </View>
        </View>

        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={accent} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading guard data…
            </Text>
          </View>
        )}

        {!loading && guardLink && (
          <>
            {(guardLink.businessName || guardLink.ownerName) && (
              <View style={[styles.infoRow, { borderColor: colors.surfaceBorder }]}>
                <Ionicons name="business-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Owner</Text>
                <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>
                  {guardLink.businessName || guardLink.ownerName}
                </Text>
              </View>
            )}
            <View style={[styles.infoRow, { borderColor: colors.surfaceBorder }]}>
              <Ionicons name="link-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Destination</Text>
              <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>
                {guardLink.currentDestination}
              </Text>
            </View>

            {recentlyChanged && (
              <View
                style={[styles.warningRow, { backgroundColor: "#f59e0b18", borderColor: "#f59e0b40" }]}
              >
                <Ionicons name="warning-outline" size={14} color="#f59e0b" />
                <Text style={[styles.warningText, { color: "#f59e0b" }]}>
                  Destination changed in the last 24 hours — proceed with caution
                </Text>
              </View>
            )}

            {guardLink.isActive === false ? (
              <View
                style={[
                  styles.deactivatedRow,
                  { backgroundColor: "#ef444418", borderColor: "#ef444440" },
                ]}
              >
                <Ionicons name="ban-outline" size={14} color="#ef4444" />
                <Text style={[styles.warningText, { color: "#ef4444" }]}>
                  This QR code has been deactivated by its owner
                </Text>
              </View>
            ) : (
              <Pressable
                style={({ pressed }) => [
                  styles.openBtn,
                  { backgroundColor: accent, opacity: pressed ? 0.85 : 1 },
                ]}
                onPress={handleOpenDestination}
              >
                <Ionicons name="open-outline" size={16} color="#fff" />
                <Text style={styles.openBtnText}>Open Destination</Text>
              </Pressable>
            )}
          </>
        )}

        {!loading && !guardLink && (
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Could not load guard link data
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    overflow: "hidden",
    marginBottom: 4,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 15, fontFamily: "Inter_700Bold" },
  sub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  loadingText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  infoLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", width: 68, flexShrink: 0 },
  infoValue: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  warningRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  deactivatedRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  warningText: { fontSize: 12.5, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 },
  openBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  openBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
