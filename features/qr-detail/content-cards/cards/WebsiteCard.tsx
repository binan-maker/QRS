import React from "react";
import {
  View, Text, StyleSheet, Pressable, Animated as RNAnimated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeInDown, FadeIn, ZoomIn,
} from "react-native-reanimated";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "@/lib/haptics";
import { useTheme } from "@/contexts/ThemeContext";
import { parseWebsite } from "../parsers";

interface Props {
  content: string;
  onOpenContent: () => void;
  isDeactivated: boolean;
  hideOpenAction?: boolean;
}

const BLUE_DARK   = "#1E3A8A";
const BLUE_MID    = "#1D4ED8";
const BLUE_LIGHT  = "#3B82F6";
const BLUE_GLOW   = "#60A5FA";

function stripProtocol(url: string) {
  return url.replace(/^https?:\/\/(www\.)?/, "");
}

function domainInitial(hostname: string) {
  return (hostname?.replace(/^www\./, "")[0] ?? "W").toUpperCase();
}

export default function WebsiteCard({ content, onOpenContent, isDeactivated, hideOpenAction }: Props) {
  const { colors, isDark } = useTheme();
  const [copied, setCopied] = React.useState(false);
  const [pathOpen, setPathOpen] = React.useState(false);
  const pulseAnim = React.useRef(new RNAnimated.Value(1)).current;

  const site = parseWebsite(content);
  const hasOpenAction = !isDeactivated && !hideOpenAction;

  const cleanDisplay = stripProtocol(site?.fullUrl ?? content);
  const domainOnly   = site?.hostname ?? cleanDisplay.split("/")[0];
  const initial      = domainInitial(domainOnly);
  const hasPath      = !!site?.path;
  const hasQuery     = site?.hasQuery ?? false;

  React.useEffect(() => {
    const pulse = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(pulseAnim, { toValue: 1.06, duration: 1800, useNativeDriver: true }),
        RNAnimated.timing(pulseAnim, { toValue: 1.00, duration: 1800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  async function handleCopy() {
    await Clipboard.setStringAsync(site?.fullUrl ?? content);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

  return (
    <Animated.View entering={FadeInDown.springify().damping(18)}>
      <View style={[
        styles.card,
        {
          backgroundColor: isDark ? "#0F172A" : "#EFF6FF",
          borderColor: isDark ? BLUE_MID + "55" : BLUE_LIGHT + "60",
        }
      ]}>

        {/* ── Ambient glow background ───────────────────────────── */}
        <LinearGradient
          colors={isDark
            ? [BLUE_DARK + "40", BLUE_MID + "18", "transparent"]
            : [BLUE_LIGHT + "22", BLUE_GLOW + "0A", "transparent"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        {/* ── Hero domain block ─────────────────────────────────── */}
        <Animated.View entering={FadeIn.delay(60).duration(300)} style={styles.heroRow}>
          {/* Pulsing avatar with glow ring */}
          <View style={styles.avatarWrap}>
            <RNAnimated.View style={[styles.glowRing, {
              borderColor: BLUE_GLOW + (isDark ? "55" : "35"),
              transform: [{ scale: pulseAnim }],
            }]} />
            <LinearGradient
              colors={[BLUE_MID, BLUE_DARK]}
              style={styles.avatarGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.avatarLetter}>{initial}</Text>
            </LinearGradient>
            {/* Security dot overlay */}
            <Animated.View entering={ZoomIn.delay(200).springify()} style={[
              styles.secDot,
              { backgroundColor: site?.isSecure ? "#22C55E" : "#F59E0B" }
            ]}>
              <Ionicons
                name={site?.isSecure ? "lock-closed" : "lock-open-outline"}
                size={7}
                color="#fff"
              />
            </Animated.View>
          </View>

          {/* Domain + label */}
          <View style={styles.heroText}>
            <Text style={[styles.domainName, { color: isDark ? "#F0F9FF" : "#1E3A8A" }]} numberOfLines={1}>
              {domainOnly}
            </Text>
            <View style={styles.badgeRow}>
              <View style={[styles.protoBadge, {
                backgroundColor: site?.isSecure
                  ? (isDark ? "#14532D55" : "#DCFCE7")
                  : (isDark ? "#78350F55" : "#FEF3C7"),
                borderColor: site?.isSecure
                  ? (isDark ? "#22C55E55" : "#86EFAC")
                  : (isDark ? "#F59E0B55" : "#FCD34D"),
              }]}>
                <Ionicons
                  name={site?.isSecure ? "shield-checkmark" : "warning-outline"}
                  size={9}
                  color={site?.isSecure ? "#22C55E" : "#F59E0B"}
                />
                <Text style={[styles.protoText, {
                  color: site?.isSecure ? "#22C55E" : "#F59E0B"
                }]}>
                  {site?.isSecure ? "SECURE" : "INSECURE"}
                </Text>
              </View>
              <Text style={[styles.websiteLabel, { color: isDark ? BLUE_GLOW + "BB" : BLUE_MID + "99" }]}>
                Website
              </Text>
            </View>
          </View>

          {/* Copy button */}
          <Pressable
            onPress={handleCopy}
            style={({ pressed }) => [styles.copyBtn, {
              backgroundColor: copied
                ? "#22C55E" + (isDark ? "22" : "15")
                : (isDark ? BLUE_MID + "20" : BLUE_LIGHT + "18"),
              borderColor: copied
                ? "#22C55E" + "60"
                : isDark ? BLUE_MID + "50" : BLUE_LIGHT + "60",
              opacity: pressed ? 0.7 : 1,
            }]}
          >
            <Ionicons
              name={copied ? "checkmark-circle" : "copy-outline"}
              size={14}
              color={copied ? "#22C55E" : isDark ? BLUE_GLOW : BLUE_MID}
            />
            <Text style={[styles.copyText, {
              color: copied ? "#22C55E" : isDark ? BLUE_GLOW : BLUE_MID,
            }]}>
              {copied ? "Copied!" : "Copy"}
            </Text>
          </Pressable>
        </Animated.View>

        {/* ── URL strip — clean, no https:// ────────────────────── */}
        <Animated.View entering={FadeInDown.delay(80).springify().damping(20)}>
          <View style={[styles.urlStrip, {
            backgroundColor: isDark ? "#1E293B" : "#DBEAFE",
            borderColor: isDark ? BLUE_MID + "35" : BLUE_LIGHT + "55",
          }]}>
            <View style={[styles.urlIcon, { backgroundColor: BLUE_MID + "22" }]}>
              <Ionicons name="link" size={12} color={isDark ? BLUE_GLOW : BLUE_MID} />
            </View>
            <Text
              style={[styles.urlText, { color: isDark ? "#CBD5E1" : "#1E40AF" }]}
              numberOfLines={1}
              selectable
            >
              {cleanDisplay}
            </Text>
          </View>
        </Animated.View>

        {/* ── Path + query chips ────────────────────────────────── */}
        {(hasPath || hasQuery) && (
          <Animated.View entering={FadeInDown.delay(120).springify()}>
            <Pressable
              onPress={() => setPathOpen(v => !v)}
              style={[styles.detailsToggle, {
                backgroundColor: isDark ? BLUE_DARK + "44" : BLUE_LIGHT + "14",
                borderColor: isDark ? BLUE_MID + "30" : BLUE_LIGHT + "40",
              }]}
            >
              <View style={styles.detailsLeft}>
                <Ionicons name="git-branch-outline" size={12} color={isDark ? BLUE_GLOW : BLUE_MID} />
                <Text style={[styles.detailsToggleText, { color: isDark ? BLUE_GLOW : BLUE_MID }]}>
                  {pathOpen ? "Hide path info" : "Show path info"}
                </Text>
              </View>
              <View style={styles.chipGroup}>
                {hasPath && (
                  <View style={[styles.chip, {
                    backgroundColor: isDark ? BLUE_MID + "28" : BLUE_LIGHT + "22",
                    borderColor: isDark ? BLUE_MID + "50" : BLUE_LIGHT + "55",
                  }]}>
                    <Text style={[styles.chipText, { color: isDark ? BLUE_GLOW : BLUE_MID }]}>PATH</Text>
                  </View>
                )}
                {hasQuery && (
                  <View style={[styles.chip, {
                    backgroundColor: isDark ? "#6366F1" + "28" : "#6366F1" + "18",
                    borderColor: isDark ? "#6366F1" + "50" : "#6366F1" + "55",
                  }]}>
                    <Text style={[styles.chipText, { color: isDark ? "#A5B4FC" : "#4338CA" }]}>
                      {site?.queryCount}Q
                    </Text>
                  </View>
                )}
                <Ionicons
                  name={pathOpen ? "chevron-up" : "chevron-forward"}
                  size={13}
                  color={isDark ? BLUE_GLOW + "AA" : BLUE_MID + "99"}
                />
              </View>
            </Pressable>

            {pathOpen && site && (
              <Animated.View
                entering={FadeInDown.springify().damping(20)}
                style={[styles.detailsBox, {
                  backgroundColor: isDark ? "#0F172A" : "#DBEAFE",
                  borderColor: isDark ? BLUE_MID + "30" : BLUE_LIGHT + "50",
                }]}
              >
                <InfoRow
                  icon="globe-outline"
                  label="Domain"
                  value={site.hostname}
                  accent={isDark ? BLUE_GLOW : BLUE_MID}
                  colors={colors}
                  isDark={isDark}
                />
                {site.path ? (
                  <>
                    <View style={[styles.sep, { backgroundColor: isDark ? BLUE_MID + "25" : BLUE_LIGHT + "40" }]} />
                    <InfoRow
                      icon="git-branch-outline"
                      label="Path"
                      value={site.path}
                      accent={isDark ? BLUE_GLOW : BLUE_MID}
                      colors={colors}
                      isDark={isDark}
                    />
                  </>
                ) : null}
                {site.hasQuery ? (
                  <>
                    <View style={[styles.sep, { backgroundColor: isDark ? BLUE_MID + "25" : BLUE_LIGHT + "40" }]} />
                    <InfoRow
                      icon="options-outline"
                      label="Params"
                      value={`${site.queryCount} query param${site.queryCount !== 1 ? "s" : ""}`}
                      accent={isDark ? "#A5B4FC" : "#4338CA"}
                      colors={colors}
                      isDark={isDark}
                    />
                  </>
                ) : null}
              </Animated.View>
            )}
          </Animated.View>
        )}

        {/* ── Open Link CTA ─────────────────────────────────────── */}
        {hasOpenAction && (
          <Animated.View entering={FadeInDown.delay(150).springify().damping(20)}>
            <Pressable
              onPress={onOpenContent}
              style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1 }]}
            >
              <LinearGradient
                colors={[BLUE_MID, BLUE_DARK]}
                style={styles.openBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <View style={styles.openBtnInner}>
                  <Ionicons name="globe" size={16} color="#fff" />
                  <Text style={styles.openBtnText}>Open Website</Text>
                </View>
                <View style={[styles.openBtnArrow, { backgroundColor: "#ffffff22" }]}>
                  <Ionicons name="arrow-forward" size={15} color="#fff" />
                </View>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
}

function InfoRow({
  icon, label, value, accent, colors, isDark,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  accent: string;
  colors: any;
  isDark: boolean;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIcon, { backgroundColor: accent + "22" }]}>
        <Ionicons name={icon} size={11} color={accent} />
      </View>
      <Text style={[styles.infoLabel, { color: isDark ? "#64748B" : "#93C5FD" }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: isDark ? "#E2E8F0" : "#1E40AF" }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    overflow: "hidden",
    gap: 11,
  },

  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  avatarWrap: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  glowRing: {
    position: "absolute",
    width: 52,
    height: 52,
    borderRadius: 17,
    borderWidth: 1.5,
  },
  avatarGrad: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: -0.5,
  },
  secDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#0F172A",
  },

  heroText: {
    flex: 1,
    gap: 5,
  },
  domainName: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.4,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  protoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  protoText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  websiteLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.2,
  },

  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 9,
    borderWidth: 1,
    flexShrink: 0,
  },
  copyText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },

  urlStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  urlIcon: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  urlText: {
    flex: 1,
    fontSize: 12.5,
    fontFamily: "Inter_500Medium",
    lineHeight: 18,
    letterSpacing: 0.1,
  },

  detailsToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
  },
  detailsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailsToggleText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  chipGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  chip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },

  detailsBox: {
    borderRadius: 13,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderWidth: 1,
    marginTop: 6,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingVertical: 9,
  },
  infoIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  infoLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    width: 48,
  },
  infoValue: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
    textAlign: "right",
  },
  sep: {
    height: 1,
    marginHorizontal: -2,
  },

  openBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    paddingVertical: 13,
    paddingLeft: 18,
    paddingRight: 10,
    overflow: "hidden",
  },
  openBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  openBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 0.1,
  },
  openBtnArrow: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
