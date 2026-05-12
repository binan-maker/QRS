import React, { memo } from "react";
import {
  View, Text, Pressable, StyleSheet, useWindowDimensions, ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Reanimated, { FadeIn, FadeInUp } from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";
import * as Haptics from "@/lib/haptics";
import type { BusinessCategory } from "@/features/generator/components/BusinessTypeSelector";

type QrMode = "individual" | "business" | "private";

interface ModeCard {
  key: QrMode;
  label: string;
  sub: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  badge?: string;
}

const MODES: ModeCard[] = [
  {
    key: "individual",
    label: "Standard",
    sub: "Saved + tracked",
    icon: "bookmark-outline",
    color: "#3B82F6",
  },
  {
    key: "business",
    label: "Business",
    sub: "Smart Redirect",
    icon: "storefront-outline",
    color: "#F59E0B",
    badge: "PRO",
  },
  {
    key: "private",
    label: "Private",
    sub: "No trace",
    icon: "eye-off-outline",
    color: "#64748B",
  },
];

interface QuickTile {
  presetIdx: number;
  label: string;
  sub: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const STANDARD_TILES: QuickTile[] = [
  { presetIdx: 1, label: "Link",    sub: "Website or URL",    icon: "link-outline",               color: "#3B82F6" },
  { presetIdx: 5, label: "Chat",    sub: "WhatsApp message",  icon: "chatbubble-ellipses-outline", color: "#22C55E" },
  { presetIdx: 6, label: "WiFi",    sub: "Share password",    icon: "wifi-outline",                color: "#F59E0B" },
  { presetIdx: 9, label: "Contact", sub: "Business card",     icon: "person-outline",              color: "#8B5CF6" },
];

interface BusinessTile {
  category: BusinessCategory;
  label: string;
  sub: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const BUSINESS_TILES: BusinessTile[] = [
  { category: "website",  label: "Website",   sub: "URL — redirect to any site",       icon: "globe-outline",    color: "#3B82F6" },
  { category: "whatsapp", label: "WhatsApp",  sub: "Chat link — redirect to number",   icon: "logo-whatsapp",    color: "#22C55E" },
  { category: "upi",      label: "UPI Pay",   sub: "Payment — redirect to UPI ID",     icon: "card-outline",     color: "#8B5CF6" },
  { category: "wifi",     label: "WiFi",      sub: "Network — show credentials",       icon: "wifi-outline",     color: "#F59E0B" },
  { category: "event",    label: "Event",     sub: "Calendar — redirect to event",     icon: "calendar-outline", color: "#EC4899" },
  { category: "phone",    label: "Phone",     sub: "Call — redirect to phone number",  icon: "call-outline",     color: "#14B8A6" },
];

interface Props {
  qrMode: QrMode;
  onSetMode: (mode: QrMode) => void;
  onSelectPreset: (idx: number) => void;
  onSelectBusinessCategory: (cat: BusinessCategory) => void;
  onOpenTemplates: () => void;
  onOpenCustom: () => void;
  user?: any;
}

function TypePickerHome({
  qrMode, onSetMode,
  onSelectPreset, onSelectBusinessCategory,
  onOpenTemplates, onOpenCustom,
  user,
}: Props) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();

  const pad = 20;
  const gap = 10;
  const tileSize = (width - pad * 2 - gap) / 2;

  function pickMode(mode: QrMode) {
    if (mode === "business" && !user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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

  return (
    <ScrollView
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.root, { paddingHorizontal: pad, paddingBottom: 40 }]}
    >
      {/* ── Mode selector ── */}
      <Reanimated.View entering={FadeIn.duration(300)} style={styles.modeRow}>
        {MODES.map((m) => {
          const active = qrMode === m.key;
          const disabled = m.key === "business" && !user;
          return (
            <Pressable
              key={m.key}
              onPress={() => pickMode(m.key)}
              style={({ pressed }) => [
                styles.modeCard,
                {
                  backgroundColor: active ? m.color + "1A" : colors.surface,
                  borderColor: active ? m.color : colors.surfaceBorder,
                  borderWidth: active ? 1.5 : 1,
                  opacity: pressed ? 0.78 : disabled ? 0.42 : 1,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                },
              ]}
            >
              {m.badge && (
                <View style={[styles.modeBadge, { backgroundColor: m.color + "25", borderColor: m.color + "40" }]}>
                  <Text style={[styles.modeBadgeText, { color: m.color }]}>{m.badge}</Text>
                </View>
              )}
              <View style={[styles.modeIconWrap, { backgroundColor: m.color + (active ? "28" : "16") }]}>
                <Ionicons name={m.icon} size={20} color={m.color} />
              </View>
              <Text style={[styles.modeLabel, { color: active ? m.color : colors.text }]} numberOfLines={1}>
                {m.label}
              </Text>
              <Text style={[styles.modeSub, { color: colors.textMuted }]} numberOfLines={2}>
                {disabled ? "Login required" : m.sub}
              </Text>
              {active && <View style={[styles.modeActiveDot, { backgroundColor: m.color }]} />}
            </Pressable>
          );
        })}
      </Reanimated.View>

      {/* ── Mode description banner ── */}
      <Reanimated.View entering={FadeIn.duration(280).delay(40)}>
        <View style={[styles.modeBanner, {
          backgroundColor: activeMode.color + "0E",
          borderColor: activeMode.color + "30",
        }]}>
          {qrMode === "individual" && (
            <>
              <Ionicons name="shield-checkmark-outline" size={13} color={activeMode.color} style={{ marginTop: 1 }} />
              <Text style={[styles.modeBannerText, { color: activeMode.color }]}>
                QR encodes a{" "}
                <Text style={{ fontFamily: "Inter_700Bold" }}>qrguard.app/go/ID</Text>
                {" "}— only QR Guard's database can reveal the real content. Scan history tracked. Other apps see our web page.
              </Text>
            </>
          )}
          {qrMode === "business" && (
            <>
              <Ionicons name="sync-outline" size={13} color={activeMode.color} style={{ marginTop: 1 }} />
              <Text style={[styles.modeBannerText, { color: activeMode.color }]}>
                <Text style={{ fontFamily: "Inter_700Bold" }}>Smart Redirect — </Text>
                QR encodes a{" "}
                <Text style={{ fontFamily: "Inter_700Bold" }}>/guard/ID</Text>
                {" "}link. Change the destination anytime without reprinting.
              </Text>
            </>
          )}
          {qrMode === "private" && (
            <>
              <Ionicons name="eye-off-outline" size={13} color={activeMode.color} style={{ marginTop: 1 }} />
              <Text style={[styles.modeBannerText, { color: activeMode.color }]}>
                <Text style={{ fontFamily: "Inter_700Bold" }}>No trace — </Text>
                raw content embedded directly in QR. No database, no server, no save. Works fully offline.
              </Text>
            </>
          )}
        </View>
      </Reanimated.View>

      {/* ── Section divider ── */}
      <Reanimated.View entering={FadeInUp.duration(260).delay(60)} style={styles.sectionHeaderRow}>
        <View style={[styles.dividerLine, { backgroundColor: colors.surfaceBorder }]} />
        <Text style={[styles.sectionHeaderText, { color: colors.textMuted }]}>
          {qrMode === "business" ? "Choose Type" : "Quick Create"}
        </Text>
        <View style={[styles.dividerLine, { backgroundColor: colors.surfaceBorder }]} />
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
                  height: tileSize * 0.82,
                  backgroundColor: colors.surface,
                  borderColor: colors.surfaceBorder,
                  opacity: pressed ? 0.78 : 1,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                },
              ]}
            >
              <View style={[styles.tileIconRing, { backgroundColor: t.color + "18" }]}>
                <Ionicons name={t.icon} size={26} color={t.color} />
              </View>
              <Text style={[styles.tileLabel, { color: colors.text }]}>{t.label}</Text>
              <Text style={[styles.tileSub, { color: colors.textMuted }]}>{t.sub}</Text>
            </Pressable>
          ))}
        </Reanimated.View>
      )}

      {/* ── Business: list of 6 redirect-capable types ── */}
      {qrMode === "business" && (
        <Reanimated.View entering={FadeInUp.duration(300).delay(80)} style={{ gap: 8 }}>
          {BUSINESS_TILES.map((t) => (
            <Pressable
              key={t.category}
              onPress={() => pickBusiness(t.category)}
              style={({ pressed }) => [
                styles.businessRow,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.surfaceBorder,
                  opacity: pressed ? 0.78 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <View style={[styles.businessIconBox, { backgroundColor: t.color + "18" }]}>
                <Ionicons name={t.icon} size={20} color={t.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.businessRowLabel, { color: colors.text }]}>{t.label}</Text>
                <Text style={[styles.businessRowSub, { color: colors.textMuted }]}>{t.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          ))}

          <View style={[styles.whyBanner, { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder }]}>
            <Ionicons name="information-circle-outline" size={13} color={colors.textMuted} />
            <Text style={[styles.whyText, { color: colors.textMuted }]}>
              Only these 6 types support Smart Redirect. Their destination can be updated server-side at any time without reprinting.
            </Text>
          </View>
        </Reanimated.View>
      )}

      {/* ── Standard / Private footer actions ── */}
      {qrMode !== "business" && (
        <Reanimated.View entering={FadeInUp.duration(300).delay(120)} style={{ gap: 10, marginTop: 4 }}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onOpenCustom();
            }}
            style={({ pressed }) => [
              styles.customRow,
              {
                backgroundColor: colors.surface,
                borderColor: colors.surfaceBorder,
                opacity: pressed ? 0.78 : 1,
              },
            ]}
          >
            <View style={[styles.customIconBox, { backgroundColor: colors.primaryDim }]}>
              <Ionicons name="add" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.customLabel, { color: colors.text }]}>Custom QR</Text>
              <Text style={[styles.customSub, { color: colors.textMuted }]}>Build with your own fields</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onOpenTemplates();
            }}
            style={({ pressed }) => [styles.moreRow, { opacity: pressed ? 0.65 : 1 }]}
          >
            <Ionicons name="apps-outline" size={15} color={colors.textMuted} />
            <Text style={[styles.moreText, { color: colors.textMuted }]}>Browse all 28 types</Text>
            <Ionicons name="chevron-forward" size={13} color={colors.textMuted} />
          </Pressable>
        </Reanimated.View>
      )}
    </ScrollView>
  );
}

export default memo(TypePickerHome);

const styles = StyleSheet.create({
  root: { gap: 14 },

  modeRow: { flexDirection: "row", gap: 10 },
  modeCard: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    alignItems: "center",
    gap: 6,
    position: "relative",
    overflow: "hidden",
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
  modeBadgeText: { fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 0.4 },
  modeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modeLabel: { fontSize: 13, fontFamily: "Inter_700Bold", textAlign: "center" },
  modeSub: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 14 },
  modeActiveDot: {
    position: "absolute",
    bottom: 8,
    width: 4,
    height: 4,
    borderRadius: 2,
  },

  modeBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modeBannerText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },

  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 2,
  },
  dividerLine: { flex: 1, height: 1 },
  sectionHeaderText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    alignItems: "flex-start",
    justifyContent: "flex-end",
    gap: 4,
  },
  tileIconRing: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  tileLabel: { fontSize: 17, fontFamily: "Inter_700Bold" },
  tileSub: { fontSize: 11, fontFamily: "Inter_400Regular" },

  businessRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  businessIconBox: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  businessRowLabel: { fontSize: 14, fontFamily: "Inter_700Bold" },
  businessRowSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },

  whyBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4,
  },
  whyText: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },

  customRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  customIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  customLabel: { fontSize: 15, fontFamily: "Inter_700Bold" },
  customSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  moreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  moreText: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
