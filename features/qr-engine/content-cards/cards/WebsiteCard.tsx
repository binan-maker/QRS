import React from "react";
import { View, Text, Pressable, Animated as RNAnimated, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "@/shared/utils/haptics";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { parseWebsite } from "../parsers";
import { styles } from "./WebsiteCardStyles";

interface Props {
  content:        string;
  onOpenContent:  () => void;
  isDeactivated:  boolean;
  hideOpenAction?: boolean;
}

const BLUE_DARK  = "#1E3A8A";
const BLUE_MID   = "#1D4ED8";
const BLUE_LIGHT = "#3B82F6";
const BLUE_GLOW  = "#60A5FA";

function domainInitial(hostname: string) {
  return (hostname?.replace(/^www\./, "")[0] ?? "W").toUpperCase();
}

export default function WebsiteCard({ content, onOpenContent, isDeactivated, hideOpenAction }: Props) {
  const { colors, isDark } = useTheme();
  const [copied, setCopied] = React.useState(false);
  const pulseAnim = React.useRef(new RNAnimated.Value(1)).current;

  const site         = parseWebsite(content);
  const hasOpenAction = !isDeactivated && !hideOpenAction;

  const domainOnly = site?.hostname ?? content.replace(/^https?:\/\/(www\.)?/, "").split("/")[0];
  const initial    = domainInitial(domainOnly);

  React.useEffect(() => {
    const pulse = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(pulseAnim, { toValue: 1.06, duration: 2000, useNativeDriver: true }),
        RNAnimated.timing(pulseAnim, { toValue: 1.00, duration: 2000, useNativeDriver: true }),
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
    <Animated.View entering={FadeInDown.duration(260)}>
      <View style={[
        styles.card,
        {
          backgroundColor: isDark ? "#0F172A" : "#EFF6FF",
          borderColor:     isDark ? BLUE_MID + "55" : BLUE_LIGHT + "60",
        },
      ]}>
        <LinearGradient
          colors={isDark
            ? [BLUE_DARK + "40", BLUE_MID + "18", "transparent"]
            : [BLUE_LIGHT + "22", BLUE_GLOW + "0A", "transparent"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        {/* ── Hero row: avatar · domain · copy ─────────────────────────── */}
        <Animated.View entering={FadeIn.delay(30).duration(260)} style={styles.heroRow}>
          <View style={styles.avatarWrap}>
            <RNAnimated.View style={[
              styles.glowRing,
              { borderColor: BLUE_GLOW + (isDark ? "55" : "35"), transform: [{ scale: pulseAnim }] },
            ]} />
            <LinearGradient
              colors={[BLUE_MID, BLUE_DARK]}
              style={styles.avatarGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.avatarLetter}>{initial}</Text>
            </LinearGradient>
            <Animated.View
              entering={FadeIn.delay(70).duration(240)}
              style={[styles.secDot, { backgroundColor: site?.isSecure ? "#22C55E" : "#F59E0B" }]}
            >
              <Ionicons
                name={site?.isSecure ? "lock-closed" : "lock-open-outline"}
                size={7}
                color="#fff"
              />
            </Animated.View>
          </View>

          <View style={styles.heroText}>
            <Text
              style={[styles.domainName, { color: isDark ? "#F0F9FF" : "#1E3A8A" }]}
              numberOfLines={1}
            >
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
                <Text style={[styles.protoText, { color: site?.isSecure ? "#22C55E" : "#F59E0B" }]}>
                  {site?.isSecure ? "SECURE" : "INSECURE"}
                </Text>
              </View>
              <Text style={[styles.websiteLabel, { color: isDark ? BLUE_GLOW + "BB" : BLUE_MID + "99" }]}>
                Website
              </Text>
            </View>
          </View>

          <Pressable
            onPress={handleCopy}
            style={({ pressed }) => [styles.copyBtn, {
              backgroundColor: copied
                ? "#22C55E" + (isDark ? "22" : "15")
                : (isDark ? BLUE_MID + "20" : BLUE_LIGHT + "18"),
              borderColor: copied
                ? "#22C55E60"
                : isDark ? BLUE_MID + "50" : BLUE_LIGHT + "60",
              opacity: pressed ? 0.7 : 1,
            }]}
          >
            <Ionicons
              name={copied ? "checkmark-circle" : "copy-outline"}
              size={14}
              color={copied ? "#22C55E" : isDark ? BLUE_GLOW : BLUE_MID}
            />
            <Text style={[styles.copyText, { color: copied ? "#22C55E" : isDark ? BLUE_GLOW : BLUE_MID }]}>
              {copied ? "Copied!" : "Copy"}
            </Text>
          </Pressable>
        </Animated.View>

        {/* ── URL strip — domain only, no path ─────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(40).duration(260)}>
          <View style={[styles.urlStrip, {
            backgroundColor: isDark ? "#1E293B" : "#DBEAFE",
            borderColor:     isDark ? BLUE_MID + "35" : BLUE_LIGHT + "55",
          }]}>
            <View style={[styles.urlIcon, { backgroundColor: BLUE_MID + "22" }]}>
              <Ionicons name="link" size={12} color={isDark ? BLUE_GLOW : BLUE_MID} />
            </View>
            <Text
              style={[styles.urlText, { color: isDark ? "#CBD5E1" : "#1E40AF" }]}
              numberOfLines={1}
            >
              {domainOnly}
            </Text>
            {site?.isSecure && (
              <Ionicons name="shield-checkmark" size={13} color="#22C55E" />
            )}
          </View>
        </Animated.View>

        {/* ── Modern open button ────────────────────────────────────────── */}
        {hasOpenAction && (
          <Animated.View entering={FadeInDown.delay(80).duration(260)}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onOpenContent();
              }}
              style={({ pressed }) => [
                cardOpenStyles.card,
                {
                  borderColor:     isDark ? BLUE_MID + "55" : BLUE_LIGHT + "70",
                  backgroundColor: isDark ? BLUE_DARK + "50" : BLUE_LIGHT + "14",
                  transform: [{ scale: pressed ? 0.975 : 1 }],
                  opacity:   pressed ? 0.9 : 1,
                },
              ]}
            >
              <LinearGradient
                colors={isDark
                  ? [BLUE_MID + "30", BLUE_DARK + "55"]
                  : [BLUE_LIGHT + "25", BLUE_GLOW + "10"]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <View style={cardOpenStyles.inner}>
                {/* Globe icon bubble */}
                <LinearGradient
                  colors={[BLUE_MID, BLUE_DARK]}
                  style={cardOpenStyles.iconBubble}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="globe" size={20} color="#fff" />
                </LinearGradient>

                {/* Text group */}
                <View style={{ flex: 1 }}>
                  <Text style={[cardOpenStyles.label, { color: isDark ? "#F0F9FF" : "#1E3A8A" }]}>
                    Open Website
                  </Text>
                  <Text style={[cardOpenStyles.sub, { color: isDark ? BLUE_GLOW + "BB" : BLUE_MID + "99" }]}>
                    {domainOnly}
                  </Text>
                </View>

                {/* Arrow pill */}
                <View style={[
                  cardOpenStyles.arrowPill,
                  {
                    backgroundColor: isDark ? BLUE_MID + "30" : BLUE_LIGHT + "25",
                    borderColor:     isDark ? BLUE_MID + "55" : BLUE_LIGHT + "55",
                  },
                ]}>
                  <Ionicons
                    name="arrow-forward"
                    size={16}
                    color={isDark ? BLUE_GLOW : BLUE_MID}
                  />
                </View>
              </View>
            </Pressable>
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
}

const cardOpenStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth:  1,
    overflow:     "hidden",
  },
  inner: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               14,
    paddingVertical:   14,
    paddingHorizontal: 14,
  },
  iconBubble: {
    width:          44,
    height:         44,
    borderRadius:   14,
    alignItems:     "center",
    justifyContent: "center",
    flexShrink:     0,
  },
  label: {
    fontSize:      15,
    fontFamily:    "Inter_700Bold",
    letterSpacing: -0.2,
  },
  sub: {
    fontSize:   12,
    fontFamily: "Inter_400Regular",
    marginTop:  2,
  },
  arrowPill: {
    width:          36,
    height:         36,
    borderRadius:   11,
    alignItems:     "center",
    justifyContent: "center",
    borderWidth:    1,
    flexShrink:     0,
  },
});
