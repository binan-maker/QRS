import React, { memo } from "react";
import {
  View, Text, Pressable, StyleSheet, useWindowDimensions, ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Reanimated, { FadeIn, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
}

const MODES: ModeCard[] = [
  {
    key: "individual",
    label: "Standard",
    tag: "Saved · Tracked",
    icon: "shield-checkmark-outline",
    color: "#3B82F6",
  },
  {
    key: "business",
    label: "Business",
    tag: "Smart Redirect",
    icon: "storefront-outline",
    color: "#F59E0B",
    badge: "PRO",
  },
  {
    key: "private",
    label: "Private",
    tag: "No trace",
    icon: "eye-off-outline",
    color: "#64748B",
  },
];

const BANNER: Record<QrMode, { icon: keyof typeof Ionicons.glyphMap; line: string }> = {
  individual: {
    icon: "shield-checkmark-outline",
    line: "QR sticker encodes a qrguard.app/go/ID link — only our database reveals the real content.",
  },
  business: {
    icon: "sync-outline",
    line: "Same database-lock as Standard — change the destination anytime without reprinting.",
  },
  private: {
    icon: "eye-off-outline",
    line: "Raw content baked directly into the QR. No server, no database, no tracking.",
  },
};

interface QuickTile {
  presetIdx: number;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const STANDARD_TILES: QuickTile[] = [
  { presetIdx: 1,  label: "Link",    icon: "link-outline",               color: "#3B82F6" },
  { presetIdx: 5,  label: "Chat",    icon: "chatbubble-ellipses-outline", color: "#22C55E" },
  { presetIdx: 6,  label: "WiFi",    icon: "wifi-outline",                color: "#F59E0B" },
  { presetIdx: 9,  label: "Contact", icon: "person-outline",              color: "#8B5CF6" },
];

interface BusinessTile {
  category: BusinessCategory;
  label: string;
  sub: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const BUSINESS_TILES: BusinessTile[] = [
  { category: "website",  label: "Website",    sub: "Redirect to any URL",   icon: "globe-outline",              color: "#3B82F6" },
  { category: "whatsapp", label: "Chat Link",  sub: "Redirect to chat",      icon: "chatbubble-ellipses-outline", color: "#22C55E" },
  { category: "wifi",     label: "WiFi",       sub: "Share credentials",     icon: "wifi-outline",               color: "#F59E0B" },
  { category: "event",    label: "Event",      sub: "Redirect to calendar",  icon: "calendar-outline",           color: "#EC4899" },
  { category: "phone",    label: "Phone",      sub: "Redirect to call",      icon: "call-outline",               color: "#14B8A6" },
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
}

function TypePickerHome({
  qrMode, onSetMode, onModeCardPress,
  onSelectPreset, onSelectBusinessCategory,
  onOpenTemplates, onOpenCustom,
  user,
}: Props) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const pad = 20;
  const gap = 10;
  const tileSize = (width - pad * 2 - gap) / 2;
  const scrollPadBottom = insets.bottom + 80;

  function pressMode(mode: QrMode) {
    if (mode === "business" && !user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onModeCardPress(mode);
  }

  function tapModeBadge(mode: QrMode) {
    if (mode === "business" && !user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSetMode(mode);
  }

  function pickPreset(idx: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelectPreset(idx);
  }

  function pickBusiness(cat: BusinessCategory) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelectBusinessCategory(cat);
  }

  const activeMode = MODES.find((m) => m.key === qrMode)!;
  const banner = BANNER[qrMode];

  return (
    <ScrollView
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.root, { paddingHorizontal: pad, paddingBottom: scrollPadBottom }]}
    >
      {/* ── Mode cards ── */}
      <Reanimated.View entering={FadeIn.duration(300)} style={styles.modeRow}>
        {MODES.map((m) => {
          const active = qrMode === m.key;
          const disabled = m.key === "business" && !user;
          return (
            <Pressable
              key={m.key}
              onPress={() => pressMode(m.key)}
              onLongPress={() => tapModeBadge(m.key)}
              delayLongPress={400}
              style={({ pressed }) => [
                styles.modeCard,
                {
                  backgroundColor: active ? m.color + "18" : colors.surface,
                  borderColor: active ? m.color + "80" : colors.surfaceBorder,
                  borderWidth: active ? 1.5 : 1,
                  opacity: disabled ? 0.4 : pressed ? 0.76 : 1,
                  transform: [{ scale: pressed && !disabled ? 0.96 : 1 }],
                },
              ]}
            >
              {m.badge && (
                <View style={[styles.modeBadge, { backgroundColor: m.color + "25", borderColor: m.color + "50" }]}>
                  <Text style={[styles.modeBadgeText, { color: m.color }]}>{m.badge}</Text>
                </View>
              )}

              <View style={[styles.modeIconWrap, { backgroundColor: m.color + (active ? "28" : "16") }]}>
                <Ionicons name={m.icon} size={22} color={m.color} />
              </View>

              <Text style={[styles.modeLabel, { color: active ? m.color : colors.text }]} numberOfLines={1}>
                {m.label}
              </Text>

              <Text
                style={[styles.modeTag, {
                  color: disabled ? colors.textMuted : active ? m.color + "CC" : colors.textMuted,
                }]}
                numberOfLines={1}
              >
                {disabled ? "Sign in" : m.tag}
              </Text>

              {active && (
                <View style={[styles.activeBar, { backgroundColor: m.color }]} />
              )}
            </Pressable>
          );
        })}
      </Reanimated.View>

      {/* ── Mode banner ── */}
      <Reanimated.View entering={FadeIn.duration(280).delay(40)}>
        <View style={[styles.banner, {
          backgroundColor: activeMode.color + "0C",
          borderColor: activeMode.color + "28",
        }]}>
          <Ionicons name={banner.icon} size={13} color={activeMode.color} style={{ flexShrink: 0, marginTop: 1 }} />
          <Text style={[styles.bannerText, { color: activeMode.color }]} numberOfLines={2}>
            {banner.line}
          </Text>
        </View>
      </Reanimated.View>

      {/* ── Section label ── */}
      <Reanimated.View entering={FadeInUp.duration(260).delay(60)} style={styles.sectionRow}>
        <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
          {qrMode === "business" ? "Choose Type" : "Quick Create"}
        </Text>
        <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />
      </Reanimated.View>

      {/* ── Standard / Private: 2×2 tile grid ── */}
      {qrMode !== "business" && (
        <Reanimated.View entering={FadeInUp.duration(300).delay(80)} style={styles.grid}>
          {STANDARD_TILES.map((t) => (
            <Pressable
              key={t.presetIdx}
              onPress={() => pickPreset(t.presetIdx)}
              style={({ pressed }) => [
                styles.tile,
                {
                  width: tileSize,
                  height: tileSize * 0.78,
                  backgroundColor: colors.surface,
                  borderColor: colors.surfaceBorder,
                  opacity: pressed ? 0.76 : 1,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                },
              ]}
            >
              <View style={[styles.tileIcon, { backgroundColor: t.color + "18" }]}>
                <Ionicons name={t.icon} size={24} color={t.color} />
              </View>
              <Text style={[styles.tileLabel, { color: colors.text }]}>{t.label}</Text>
            </Pressable>
          ))}
        </Reanimated.View>
      )}

      {/* ── Business: 5 generic redirect types ── */}
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
                  borderColor: colors.surfaceBorder,
                  opacity: pressed ? 0.76 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
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

      {/* ── Footer actions (Standard / Private) ── */}
      {qrMode !== "business" && (
        <Reanimated.View entering={FadeInUp.duration(300).delay(120)} style={{ gap: 10, marginTop: 4 }}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onOpenCustom();
            }}
            style={({ pressed }) => [
              styles.footerRow,
              {
                backgroundColor: colors.surface,
                borderColor: colors.surfaceBorder,
                opacity: pressed ? 0.76 : 1,
              },
            ]}
          >
            <View style={[styles.footerIcon, { backgroundColor: colors.primaryDim }]}>
              <Ionicons name="add" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.footerLabel, { color: colors.text }]}>Custom QR</Text>
              <Text style={[styles.footerSub, { color: colors.textMuted }]}>Build with your own fields</Text>
            </View>
            <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onOpenTemplates();
            }}
            style={({ pressed }) => [styles.browseRow, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Ionicons name="apps-outline" size={14} color={colors.textMuted} />
            <Text style={[styles.browseText, { color: colors.textMuted }]}>Browse all types</Text>
            <Ionicons name="chevron-forward" size={12} color={colors.textMuted} />
          </Pressable>
        </Reanimated.View>
      )}
    </ScrollView>
  );
}

export default memo(TypePickerHome);

const CARD_HEIGHT = 118;

const styles = StyleSheet.create({
  root: { gap: 12 },

  modeRow: { flexDirection: "row", gap: 10 },
  modeCard: {
    flex: 1,
    height: CARD_HEIGHT,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    position: "relative",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 14,
  },
  modeBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  modeBadgeText: { fontSize: 7.5, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  modeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modeLabel: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  modeTag: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  activeBar: {
    position: "absolute",
    bottom: 0,
    left: "20%",
    right: "20%",
    height: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },

  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  bannerText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },

  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 2,
  },
  divider: { flex: 1, height: StyleSheet.hairlineWidth },
  sectionLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: {
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "flex-start",
    justifyContent: "flex-end",
    padding: 16,
    gap: 6,
  },
  tileIcon: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  tileLabel: { fontSize: 17, fontFamily: "Inter_700Bold" },

  bizRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  bizIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  bizLabel: { fontSize: 14, fontFamily: "Inter_700Bold" },
  bizSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  bizNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 2,
  },
  bizNoteText: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular" },

  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  footerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  footerLabel: { fontSize: 15, fontFamily: "Inter_700Bold" },
  footerSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  browseRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  browseText: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
