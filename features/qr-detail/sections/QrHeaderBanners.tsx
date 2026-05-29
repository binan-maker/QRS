import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";

interface TrustInfo {
  score: number;
  label: string;
  color: string;
}

interface Props {
  offlineMode:     boolean;
  hasOwner:        boolean;
  isDeactivated:   boolean;
  deactivationMsg: string | null;
  isDark:          boolean;
  colors:          any;
  trust?:          TrustInfo;
}

export function QrHeaderBanners({ offlineMode, hasOwner, isDeactivated, deactivationMsg, isDark, colors, trust }: Props) {
  return (
    <>
      {/* ── Trust verdict banner for non-owner QRs ──────────────── */}
      {!offlineMode && !hasOwner && (() => {
        const score  = trust?.score ?? -1;
        const accent = score >= 70 ? "#22C55E" : score >= 40 ? "#F59E0B" : "#94A3B8";
        const iconName: keyof typeof Ionicons.glyphMap =
          score >= 70 ? "shield-checkmark-outline"
          : score >= 40 ? "information-circle-outline"
          : "help-circle-outline";
        const statusLabel =
          score >= 70 ? "SAFE" : score >= 40 ? "CAUTION" : "UNKNOWN";
        const bg = score >= 70
          ? (isDark ? "#0a1a0e" : "#f0fdf4")
          : score >= 40
          ? (isDark ? "#16120400" : "#fffbeb")
          : (isDark ? "#0f172a" : "#f8fafc");

        return (
          <Animated.View entering={FadeInDown.delay(30).duration(260)} style={{ marginBottom: 12 }}>
            <View style={[styles.verdictBanner, { backgroundColor: bg, borderColor: accent + "28" }]}>
              <View style={[styles.accentBar, { backgroundColor: accent }]} />
              <View style={[styles.iconBox, { borderColor: accent + "45", backgroundColor: accent + "12" }]}>
                <Ionicons name={iconName} size={22} color={accent} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.eyebrowRow}>
                  <View style={[styles.dot, { backgroundColor: accent }]} />
                  <Text style={[styles.eyebrow, { color: accent }]}>{statusLabel}</Text>
                </View>
                <Text style={[styles.scoreText, { color: isDark ? "#e2e8f0" : "#1e293b" }]}>
                  {score >= 0 ? trust!.label : "Unverified QR Code"}
                </Text>
                <Text style={[styles.sub, { color: isDark ? "#94a3b8" : "#64748b" }]}>
                  Community Trust Score{score >= 0 ? `: ${score}` : " — not yet rated"}
                </Text>
              </View>
            </View>
          </Animated.View>
        );
      })()}

      {/* ── Deactivated banner ───────────────────────────────────── */}
      {isDeactivated && (
        <Animated.View entering={FadeInDown.delay(30).duration(260)}>
          <View style={[styles.deactivatedBanner, { borderColor: "#ef444440" }]}>
            <LinearGradient
              colors={["rgba(239,68,68,0.18)", "rgba(239,68,68,0.08)"]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <View style={styles.deactivatedIconWrap}>
              <Ionicons name="ban" size={22} color="#EF4444" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.deactivatedTitle, { color: colors.text }]}>QR Code Deactivated</Text>
              <Text style={[styles.deactivatedSub, { color: colors.textSecondary }]}>
                {deactivationMsg || "The owner has turned off this QR code. Links and actions are disabled."}
              </Text>
            </View>
          </View>
        </Animated.View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  // ── Verdict banner ──────────────────────────────────────────────
  verdictBanner: {
    flexDirection:  "row",
    alignItems:     "center",
    gap:            14,
    borderRadius:   16,
    paddingVertical: 14,
    paddingRight:   14,
    paddingLeft:    0,
    borderWidth:    1,
    overflow:       "hidden",
  },
  accentBar: {
    width:        4,
    alignSelf:    "stretch",
    borderRadius: 2,
    marginLeft:   0,
    flexShrink:   0,
  },
  iconBox: {
    width:          46,
    height:         46,
    borderRadius:   12,
    borderWidth:    1,
    alignItems:     "center",
    justifyContent: "center",
    flexShrink:     0,
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           5,
    marginBottom:  3,
  },
  dot: { width: 5, height: 5, borderRadius: 2.5, flexShrink: 0 },
  eyebrow: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.4 },
  scoreText: {
    fontSize:     16,
    fontFamily:   "Inter_700Bold",
    marginBottom: 2,
    lineHeight:   21,
  },
  sub: {
    fontSize:   12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },

  // ── Deactivated banner ──────────────────────────────────────────
  deactivatedBanner: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           12,
    borderRadius:  14,
    borderWidth:   1,
    padding:       14,
    marginBottom:  12,
    overflow:      "hidden",
  },
  deactivatedIconWrap: {
    width:           40,
    height:          40,
    borderRadius:    12,
    backgroundColor: "rgba(239,68,68,0.12)",
    alignItems:      "center",
    justifyContent:  "center",
    flexShrink:      0,
  },
  deactivatedTitle: {
    fontSize:     14,
    fontFamily:   "Inter_700Bold",
    marginBottom: 2,
  },
  deactivatedSub: {
    fontSize:   12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
});
