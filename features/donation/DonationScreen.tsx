import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  type LayoutChangeEvent,
} from "react-native";
import Reanimated from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTopInset } from "@/shared/utils/platform";
import ScreenHeader from "@/shared/components/ui/ScreenHeader";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useHeaderHide } from "@/shared/hooks/useHeaderHide";
import { useDonation } from "./hooks/useDonation";

export default function DonationScreen() {
  const { colors } = useTheme();
  const insets     = useSafeAreaInsets();
  const topInset   = useTopInset();
  const { headerStyle, setHeight, onScroll: onHeaderScroll } = useHeaderHide();
  const [headerH, setHeaderH] = useState(0);

  const {
    TIERS,
    prices,
    loadingProducts,
    purchasing,
    selected,
    setSelected,
    lastError,
    setLastError,
    handleDonate,
    storeLabel,
    btnLabel,
  } = useDonation();

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <Reanimated.View
        style={[
          { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, backgroundColor: colors.background },
          headerStyle,
        ]}
        onLayout={(e: LayoutChangeEvent) => {
          const h = e.nativeEvent.layout.height;
          if (h > 0) { setHeaderH(h); setHeight(h); }
        }}
      >
        <View style={{ paddingTop: topInset }}>
          <ScreenHeader title="Support BinRo" />
        </View>
      </Reanimated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={onHeaderScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[s.scroll, { paddingTop: headerH + 8, paddingBottom: insets.bottom + 48 }]}
      >

        {/* ── LAST ERROR BANNER ───────────────────────────────────── */}
        {lastError && (
          <Pressable
            onPress={() => setLastError(null)}
            style={[s.errorBanner, { backgroundColor: colors.dangerDim, borderColor: colors.danger + "40" }]}
          >
            <Ionicons name="alert-circle" size={16} color={colors.danger} />
            <View style={{ flex: 1 }}>
              <Text style={[s.errorBannerTitle, { color: colors.danger }]}>{lastError.title}</Text>
              <Text style={[s.errorBannerMsg, { color: colors.danger + "cc" }]} numberOfLines={3}>
                {lastError.message}
              </Text>
            </View>
            <Ionicons name="close" size={14} color={colors.danger} />
          </Pressable>
        )}

        {/* ── HERO ─────────────────────────────────────────────────── */}
        <View style={s.hero}>
          <View style={[s.heroIconRing, { borderColor: colors.primary + "28", backgroundColor: colors.primaryDim }]}>
            <Ionicons name="heart" size={28} color={colors.primary} />
          </View>
          <Text style={[s.heroTitle, { color: colors.text }]}>Help Build BinRo</Text>
          <Text style={[s.heroSub, { color: colors.textSecondary }]}>
            BinRo is built by a solo developer. If this app has helped you stay safe,
            consider sending a small amount to support the work.
          </Text>
          <View style={[s.noticeBox, { backgroundColor: colors.surface, borderColor: colors.primary + "30" }]}>
            <Ionicons name="information-circle-outline" size={15} color={colors.primary} />
            <Text style={[s.noticeText, { color: colors.textSecondary }]}>
              This is a voluntary donation — not a subscription, not a purchase.
              You get nothing in return except the good feeling of supporting an independent app.
            </Text>
          </View>
        </View>

        {/* ── TIER CARDS ───────────────────────────────────────────── */}
        <View style={s.tiersCol}>
          {TIERS.map((tier) => {
            const isActive     = selected === tier.sku;
            const displayPrice = prices[tier.sku] || tier.amount;
            return (
              <Pressable
                key={tier.sku}
                onPress={() => setSelected(tier.sku)}
                style={({ pressed }) => [
                  s.tierCard,
                  {
                    backgroundColor: isActive ? colors.primary + "12" : colors.surface,
                    borderColor:     isActive ? colors.primary : colors.surfaceBorder,
                    opacity:         pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View style={s.tierLeft}>
                  <View style={[
                    s.tierRadio,
                    {
                      borderColor:     isActive ? colors.primary : colors.surfaceBorder,
                      backgroundColor: isActive ? colors.primary : "transparent",
                    },
                  ]}>
                    {isActive && <View style={s.tierRadioDot} />}
                  </View>
                  <View style={s.tierInfo}>
                    <Text style={[s.tierLabel, { color: colors.text }]}>{tier.label}</Text>
                    <Text style={[s.tierDesc,  { color: colors.textMuted }]}>{tier.desc}</Text>
                  </View>
                </View>
                <Text style={[s.tierAmount, { color: isActive ? colors.primary : colors.text }]}>
                  {displayPrice}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── DONATE BUTTON ────────────────────────────────────────── */}
        <View style={[s.ctaCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <Text style={[s.ctaHint, { color: colors.textMuted }]}>
            You can donate as many times as you like — every amount helps.
          </Text>

          {loadingProducts && (
            <View style={s.ctaLoading}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[s.ctaLoadingText, { color: colors.textMuted }]}>Loading prices…</Text>
            </View>
          )}

          <Pressable
            onPress={handleDonate}
            disabled={!!purchasing}
            style={({ pressed }) => [s.ctaBtn, { opacity: pressed || !!purchasing ? 0.82 : 1 }]}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryShade ?? colors.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.ctaGrad}
            >
              {purchasing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="heart" size={16} color="#fff" />
                  <Text style={s.ctaText}>{btnLabel}</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>

          <Text style={[s.ctaNote, { color: colors.textMuted }]}>
            Processed via {storeLabel} · Donations are non-refundable
          </Text>
        </View>

        {/* ── WHERE IT GOES ─────────────────────────────────────────── */}
        <View style={[s.whereCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <Text style={[s.whereTitle, { color: colors.text }]}>Where your support goes</Text>
          {([
            { icon: "person-outline"           as const, text: "₹10 — Goes directly to the founder" },
            { icon: "code-slash-outline"       as const, text: "₹50 — BinRo app development" },
            { icon: "shield-checkmark-outline" as const, text: "₹100 — BinRo app development" },
            { icon: "server-outline"           as const, text: "Firebase, server & infrastructure costs" },
            { icon: "bug-outline"              as const, text: "Security audits & performance improvements" },
          ] as const).map(({ icon, text }) => (
            <View key={text} style={s.whereRow}>
              <Ionicons name={icon} size={14} color={colors.primary} />
              <Text style={[s.whereText, { color: colors.textSecondary }]}>{text}</Text>
            </View>
          ))}
        </View>

        {/* ── FOOTER ───────────────────────────────────────────────── */}
        <Text style={[s.footer, { color: colors.textMuted }]}>
          Made with care in India · BinRo
        </Text>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  scroll:    { paddingHorizontal: 16, paddingTop: 8, gap: 14 },

  errorBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    borderRadius: 14, borderWidth: 1, padding: 13,
  },
  errorBannerTitle: { fontSize: 13, fontFamily: "Inter_700Bold", marginBottom: 2 },
  errorBannerMsg:   { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },

  hero: { alignItems: "center", paddingVertical: 24, paddingHorizontal: 8, gap: 10 },
  heroIconRing: {
    width: 64, height: 64, borderRadius: 20,
    borderWidth: 1.5, alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  heroTitle: { fontSize: 26, fontFamily: "Inter_700Bold", textAlign: "center", letterSpacing: -0.3 },
  heroSub: {
    fontSize: 13.5, fontFamily: "Inter_400Regular",
    textAlign: "center", lineHeight: 21, maxWidth: 310,
  },
  noticeBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    borderRadius: 14, borderWidth: 1, padding: 13, marginTop: 4, width: "100%",
  },
  noticeText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },

  tiersCol: { gap: 10 },
  tierCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderRadius: 16, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 14,
  },
  tierLeft:     { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  tierRadio:    { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  tierRadioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" },
  tierInfo:     { flex: 1 },
  tierLabel:    { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  tierDesc:     { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2, lineHeight: 16 },
  tierAmount:   { fontSize: 17, fontFamily: "Inter_700Bold", marginLeft: 8 },

  ctaCard:        { borderRadius: 20, borderWidth: 1, padding: 18, gap: 12 },
  ctaHint:        { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
  ctaLoading:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  ctaLoadingText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  ctaBtn:         { borderRadius: 16, overflow: "hidden" },
  ctaGrad: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 15, paddingHorizontal: 24,
  },
  ctaText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: 0.1 },
  ctaNote: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },

  whereCard:  { borderRadius: 18, borderWidth: 1, padding: 18, gap: 11 },
  whereTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },
  whereRow:   { flexDirection: "row", alignItems: "center", gap: 10 },
  whereText:  { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 19 },

  footer: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", paddingVertical: 8 },
});
