/**
 * QR Engine — HeroRenderer
 * ─────────────────────────────────────────────────────────────────────────────
 * Large, prominent card shown immediately after a successful scan.
 * Communicates the QR type, content, and trust level at a glance.
 *
 * Mode: "hero"
 */

import React, { memo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInUp, ZoomIn } from "react-native-reanimated";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { getQrTypeMeta, getDisplayLabel, getSubtitle } from "../registry";
import { trustLevelColor, trustLevelLabel, trustLevelIcon } from "../trust/trust-scorer";
import type { QrRenderProps } from "../types";

function HeroRendererComponent({
  content,
  contentType,
  templateKey,
  onOpen,
  risk,
  trustSummary,
  isDynamic,
  isDeactivated,
}: QrRenderProps) {
  const { colors, isDark } = useTheme();
  const effectiveType = templateKey ?? contentType;
  const meta = getQrTypeMeta(effectiveType);
  const displayLabel = getDisplayLabel(content, effectiveType);
  const subtitle = getSubtitle(content, effectiveType);

  const accentColor = isDeactivated ? "#9CA3AF" : meta.color;
  const trustColor = trustSummary
    ? trustLevelColor(trustSummary.level)
    : risk === "dangerous" ? "#DC2626"
    : risk === "caution"   ? "#F59E0B"
    : "#10B981";

  return (
    <Animated.View entering={FadeInUp.springify().damping(14)}>
      <LinearGradient
        colors={isDeactivated
          ? ["#9CA3AF18", "#9CA3AF0A"]
          : [meta.gradient[0] + "28", meta.gradient[1] + "0C"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, { borderColor: accentColor + "30" }]}
      >
        {/* Icon + type */}
        <Animated.View entering={ZoomIn.duration(300).delay(100)} style={styles.iconSection}>
          <View style={[styles.iconCircle, { backgroundColor: accentColor + "20" }]}>
            <Ionicons name={meta.icon as any} size={36} color={accentColor} />
          </View>
          <View style={styles.typeInfo}>
            <Text style={[styles.typeLabel, { color: accentColor }]}>
              {meta.label}
            </Text>
            {isDynamic && (
              <View style={[styles.dynamicTag, { backgroundColor: "#6366F115", borderColor: "#6366F130" }]}>
                <Ionicons name="git-branch-outline" size={11} color="#6366F1" />
                <Text style={styles.dynamicTagText}>Dynamic</Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Main content */}
        <Text
          style={[styles.displayLabel, { color: colors.text }]}
          numberOfLines={3}
          ellipsizeMode="tail"
        >
          {displayLabel}
        </Text>
        {subtitle && (
          <Text
            style={[styles.subtitle, { color: colors.textMuted }]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {subtitle}
          </Text>
        )}

        {/* Trust banner */}
        <View style={[styles.trustBanner, { backgroundColor: trustColor + "12", borderColor: trustColor + "25" }]}>
          <Ionicons
            name={trustSummary
              ? (trustLevelIcon(trustSummary.level) as any)
              : (risk === "dangerous" ? "skull-outline" : "shield-checkmark-outline") as any}
            size={16}
            color={trustColor}
          />
          <Text style={[styles.trustText, { color: trustColor }]}>
            {trustSummary
              ? `${trustLevelLabel(trustSummary.level)} · Score ${trustSummary.score}/100`
              : risk === "dangerous" ? "Dangerous — do not proceed"
              : risk === "caution"   ? "Proceed with caution"
              : "No threats detected"}
          </Text>
        </View>

        {/* Primary action */}
        {onOpen && !isDeactivated && (
          <Pressable
            onPress={onOpen}
            style={({ pressed }) => [
              styles.ctaButton,
              { backgroundColor: accentColor, opacity: pressed ? 0.88 : 1 },
            ]}
          >
            <Ionicons name="open-outline" size={16} color="#FFFFFF" />
            <Text style={styles.ctaText}>{meta.openLabel ?? "Open"}</Text>
          </Pressable>
        )}

        {isDeactivated && (
          <View style={[styles.deactivatedBanner, { backgroundColor: "#9CA3AF15" }]}>
            <Ionicons name="ban-outline" size={14} color="#9CA3AF" />
            <Text style={styles.deactivatedText}>This QR code has been deactivated</Text>
          </View>
        )}
      </LinearGradient>
    </Animated.View>
  );
}

export const HeroRenderer = memo(HeroRendererComponent);
export default HeroRenderer;

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 20,
    gap: 14,
  },
  iconSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  typeInfo: {
    flex: 1,
    gap: 6,
  },
  typeLabel: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  dynamicTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
  },
  dynamicTagText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "#6366F1",
  },
  displayLabel: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    lineHeight: 27,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  trustBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  trustText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
  },
  ctaText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  deactivatedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  deactivatedText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#9CA3AF",
  },
});
