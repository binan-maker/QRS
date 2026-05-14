import React, { memo } from "react";
import {
  View, Text, Pressable, StyleSheet, useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Reanimated, { FadeIn, FadeInUp } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/contexts/ThemeContext";
import * as Haptics from "@/lib/haptics";
import type { BusinessCategory } from "@/features/generator/components/BusinessTypeSelector";

type QrMode = "individual" | "business" | "private";

interface ModeCard {
  key: QrMode;
  label: string;
  tag: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  badge?: string;
  info: string;
}

const MODES: ModeCard[] = [
  {
    key:   "individual",
    label: "Standard",
    tag:   "",
    icon:  "shield-checkmark-outline",
    color: "#3B82F6",
    info:  "",
  },
  {
    key:   "business",
    label: "Business",
    tag:   "",
    icon:  "storefront-outline",
    color: "#F59E0B",
    info:  "",
  },
  {
    key:   "private",
    label: "Private",
    tag:   "",
    icon:  "eye-off-outline",
    color: "#64748B",
    info:  "",
  },
];

interface BusinessTile {
  category: BusinessCategory;
  label: string;
  sub: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const BUSINESS_TILES: BusinessTile[] = [
  { category: "website",  label: "Website",   sub: "Redirect to any URL",   icon: "globe-outline",               color: "#3B82F6" },
  { category: "whatsapp", label: "Chat Link", sub: "Redirect to WhatsApp",  icon: "chatbubble-ellipses-outline", color: "#22C55E" },
  { category: "wifi",     label: "WiFi",      sub: "Share credentials",     icon: "wifi-outline",                color: "#F59E0B" },
  { category: "event",    label: "Event",     sub: "Redirect to calendar",  icon: "calendar-outline",            color: "#EC4899" },
  { category: "phone",    label: "Phone",     sub: "Redirect to call",      icon: "call-outline",                color: "#14B8A6" },
];

interface Props {
  qrMode: QrMode;
  onSetMode: (mode: QrMode) => void;
  onModeCardPress: (mode: QrMode) => void;
  onSelectPreset: (idx: number) => void;
  onSelectBusinessCategory: (cat: BusinessCategory) => void;
  onOpenTemplates: () => void;
  onOpenCustom: () => void;
  user?: any;
  /** When true only the mode cards render — the action rows are hidden */
  hideActions?: boolean;
}

function TypePickerHome({
  qrMode, onSetMode,
  onSelectBusinessCategory,
  onOpenTemplates, onOpenCustom,
  user,
  hideActions = false,
}: Props) {
  const { colors } = useTheme();
  const { width }  = useWindowDimensions();
  const PAD = 20;

  function pressMode(mode: QrMode) {
    if (mode === "business" && !user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSetMode(mode);
  }

  function pickBusiness(cat: BusinessCategory) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelectBusinessCategory(cat);
  }

  return (
    <View style={[styles.root, { paddingHorizontal: PAD }]}>
      {/* ── Mode cards ── */}
      <Reanimated.View entering={FadeIn.duration(300)} style={styles.modeRow}>
        {MODES.map((m) => {
          const active   = qrMode === m.key;
          const disabled = m.key === "business" && !user;
          return (
            <Pressable
              key={m.key}
              onPress={() => pressMode(m.key)}
              style={({ pressed }) => [
                styles.modeCard,
                {
                  backgroundColor: active ? m.color + "18" : colors.surface,
                  borderColor:     active ? m.color + "80" : colors.surfaceBorder,
                  borderWidth:     active ? 1.5 : 1,
                  opacity:         disabled ? 0.4 : pressed ? 0.76 : 1,
                  transform:       [{ scale: pressed && !disabled ? 0.96 : 1 }],
                },
              ]}
            >
              {/* Icon */}
              <View style={[styles.modeIconWrap, { backgroundColor: m.color + (active ? "28" : "16") }]}>
                <Ionicons name={m.icon} size={20} color={m.color} />
              </View>

              {/* Label */}
              <Text style={[styles.modeLabel, { color: active ? m.color : colors.text }]} numberOfLines={1}>
                {m.label}
              </Text>

              {/* Active underline */}
              {active && (
                <View style={[styles.activeBar, { backgroundColor: m.color }]} />
              )}
            </Pressable>
          );
        })}
      </Reanimated.View>

      {/* ── Actions section (hidden when a type is already picked) ── */}
      {!hideActions && (
        <>
          {/* Business: type tiles */}
          {qrMode === "business" && (
            <Reanimated.View entering={FadeInUp.duration(300).delay(80)} style={{ gap: 8 }}>
              {BUSINESS_TILES.map((t) => (
                <Pressable
                  key={t.category}
                  onPress={() => pickBusiness(t.category)}
                  style={({ pressed }) => [
                    styles.bizRow,
                    {
                      backgroundColor: colors.surface,
                      borderColor:     colors.surfaceBorder,
                      opacity:         pressed ? 0.76 : 1,
                      transform:       [{ scale: pressed ? 0.98 : 1 }],
                    },
                  ]}
                >
                  <View style={[styles.bizIcon, { backgroundColor: t.color + "18" }]}>
                    <Ionicons name={t.icon} size={20} color={t.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.bizLabel, { color: colors.text }]}>{t.label}</Text>
                    <Text style={[styles.bizSub, { color: colors.textMuted }]} numberOfLines={1}>{t.sub}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
                </Pressable>
              ))}

              <View style={[styles.bizNote, { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder }]}>
                <Ionicons name="swap-horizontal-outline" size={13} color={colors.textMuted} />
                <Text style={[styles.bizNoteText, { color: colors.textMuted }]}>
                  All types support destination changes without reprinting.
                </Text>
              </View>
            </Reanimated.View>
          )}

          {/* Standard / Private: Custom QR only */}
          {qrMode !== "business" && (
            <Reanimated.View entering={FadeInUp.duration(300).delay(80)} style={{ marginTop: 12 }}>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  onOpenCustom();
                }}
                style={({ pressed }) => ({
                  opacity:      pressed ? 0.82 : 1,
                  transform:    [{ scale: pressed ? 0.98 : 1 }],
                  borderRadius: 16,
                  overflow:     "hidden" as const,
                })}
              >
                <LinearGradient
                  colors={[colors.primary + "22", colors.primary + "08"]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={[styles.customCard, { borderColor: colors.primary + "40" }]}
                >
                  <View style={[styles.customCardIcon, { backgroundColor: colors.primaryDim }]}>
                    <Ionicons name="create-outline" size={22} color={colors.primary} />
                  </View>
                  <Text style={[styles.customCardTitle, { color: colors.text }]}>Custom QR</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                </LinearGradient>
              </Pressable>
            </Reanimated.View>
          )}
        </>
      )}
    </View>
  );
}

export default memo(TypePickerHome);

const styles = StyleSheet.create({
  root: { gap: 12, paddingTop: 8 },

  /* Mode cards */
  modeRow: { flexDirection: "row", gap: 8 },
  modeCard: {
    flex: 1,
    height: 72,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    position: "relative",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  modeBadge: {
    position: "absolute", top: 7, right: 7,
    borderRadius: 5, borderWidth: 1,
    paddingHorizontal: 4, paddingVertical: 1,
  },
  modeBadgeText: { fontSize: 7, fontFamily: "Inter_700Bold", letterSpacing: 0.4 },
  infoIcon: { position: "absolute", top: 7, left: 7 },
  modeIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  modeLabel: { fontSize: 12, fontFamily: "Inter_700Bold", textAlign: "center" },
  modeTag:   { fontSize: 10, fontFamily: "Inter_500Medium", textAlign: "center" },
  activeBar: {
    position: "absolute", bottom: 0,
    left: "20%", right: "20%",
    height: 3, borderTopLeftRadius: 3, borderTopRightRadius: 3,
  },

  /* Business tiles */
  bizRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 11,
  },
  bizIcon: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  bizLabel: { fontSize: 14, fontFamily: "Inter_700Bold" },
  bizSub:   { fontSize: 11.5, fontFamily: "Inter_400Regular", marginTop: 1 },
  bizNote: {
    flexDirection: "row", alignItems: "center", gap: 7,
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 9, marginTop: 2,
  },
  bizNoteText: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular" },

  /* Custom QR card */
  customCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderWidth: 1.5, borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  customCardIcon: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  customCardTitle: { fontSize: 14, fontFamily: "Inter_700Bold", flex: 1 },

  /* Browse card */
  browseCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 16, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  browseCardIcon: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  browseCardTitle: { fontSize: 14, fontFamily: "Inter_700Bold", flex: 1 },
});
