import React from "react";
import {
  View, Text, Pressable, Animated as RNAnimated, StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "@/shared/utils/haptics";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { parseWebsite } from "../parsers";
import { InfoRow } from "./WebsiteInfoRow";
import { styles } from "./WebsiteCardStyles";

interface Props {
  content: string;
  onOpenContent: () => void;
  isDeactivated: boolean;
  hideOpenAction?: boolean;
}

const BLUE_DARK  = "#1E3A8A";
const BLUE_MID   = "#1D4ED8";
const BLUE_LIGHT = "#3B82F6";
const BLUE_GLOW  = "#60A5FA";

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
    <Animated.View entering={FadeInDown.duration(260)}>
      <View style={[
        styles.card,
        {
          backgroundColor: isDark ? "#0F172A" : "#EFF6FF",
          borderColor: isDark ? BLUE_MID + "55" : BLUE_LIGHT + "60",
        }
      ]}>

        <LinearGradient
          colors={isDark
            ? [BLUE_DARK + "40", BLUE_MID + "18", "transparent"]
            : [BLUE_LIGHT + "22", BLUE_GLOW + "0A", "transparent"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        <Animated.View entering={FadeIn.delay(30).duration(260)} style={styles.heroRow}>
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
            <Animated.View entering={FadeIn.delay(70).duration(240)} style={[
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
            <Text style={[styles.copyText, { color: copied ? "#22C55E" : isDark ? BLUE_GLOW : BLUE_MID }]}>
              {copied ? "Copied!" : "Copy"}
            </Text>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(40).duration(260)}>
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

        {(hasPath || hasQuery) && (
          <Animated.View entering={FadeInDown.delay(50).duration(260)}>
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
                entering={FadeInDown.duration(260)}
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

        {hasOpenAction && (
          <Animated.View entering={FadeInDown.delay(150).duration(260)}>
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
