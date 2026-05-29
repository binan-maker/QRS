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
  content:         string;
  onOpenContent:   () => void;
  isDeactivated:   boolean;
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

  const site          = parseWebsite(content);
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

        {/* ── Hero row: avatar · domain · copy ─────────────────────── */}
        <Animated.View entering={FadeIn.delay(30).duration(260)} style={styles.heroRow}>
          {/* Domain avatar */}
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
          </View>

          {/* Domain name only — no badge, no "Website" label */}
          <View style={styles.heroText}>
            <Text
              style={[styles.domainName, { color: isDark ? "#F0F9FF" : "#1E3A8A" }]}
              numberOfLines={1}
            >
              {domainOnly}
            </Text>
          </View>

          {/* Copy button */}
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

        {/* ── URL strip ────────────────────────────────────────────── */}
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
              numberOfLines={2}
            >
              {site?.fullUrl ?? content}
            </Text>
          </View>
        </Animated.View>

        {/* ── Open button — just the word "Open", nothing else ─────── */}
        {hasOpenAction && (
          <Animated.View entering={FadeInDown.delay(80).duration(260)}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onOpenContent();
              }}
              style={({ pressed }) => ({
                transform: [{ scale: pressed ? 0.975 : 1 }],
                opacity:   pressed ? 0.88 : 1,
              })}
            >
              <LinearGradient
                colors={[BLUE_MID, BLUE_DARK]}
                style={openBtnStyles.btn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={openBtnStyles.label}>Open</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
}

const openBtnStyles = StyleSheet.create({
  btn: {
    borderRadius:   14,
    paddingVertical: 14,
    alignItems:      "center",
    justifyContent:  "center",
  },
  label: {
    fontSize:      15,
    fontFamily:    "Inter_700Bold",
    color:         "#fff",
    letterSpacing: 0.3,
  },
});
