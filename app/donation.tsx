import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTopInset } from "@/shared/utils/platform";
import ScreenHeader from "@/shared/components/ui/ScreenHeader";
import { useTheme } from "@/shared/contexts/ThemeContext";

let iapModule: typeof import("react-native-iap") | null = null;
try {
  iapModule = require("react-native-iap");
} catch {}

const TIERS = [
  { sku: "qrguard_donate_10",  amount: "₹10",  label: "Starter" },
  { sku: "qrguard_donate_50",  amount: "₹50",  label: "Popular" },
  { sku: "qrguard_donate_100", amount: "₹100", label: "Champion" },
];

const IMPACT_ITEMS = [
  {
    icon: "shield-checkmark-outline" as const,
    title: "Scam Detection",
    desc: "Improves malicious QR identification",
  },
  {
    icon: "lock-closed-outline" as const,
    title: "Privacy First",
    desc: "Keeps the platform independent",
  },
  {
    icon: "flash-outline" as const,
    title: "Faster Updates",
    desc: "Ships better protection sooner",
  },
];

export default function DonationScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = useTopInset();

  const [products,        setProducts]        = useState<Record<string, string>>({});
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [purchasing,      setPurchasing]      = useState<string | null>(null);
  const [connected,       setConnected]       = useState(false);
  const [selected,        setSelected]        = useState(TIERS[1].sku);

  useEffect(() => {
    if (!iapModule || Platform.OS !== "android") return;
    let mounted = true;
    (async () => {
      try {
        setLoadingProducts(true);
        await iapModule!.initConnection();
        if (!mounted) return;
        setConnected(true);
        const skus = TIERS.map((t) => t.sku);
        const items =
          (await (iapModule as any)!.fetchProducts?.({ productIds: skus })) ??
          (await (iapModule as any)!.getProducts?.({ skus })) ??
          [];
        if (!mounted) return;
        const priceMap: Record<string, string> = {};
        items.forEach((p: any) => {
          priceMap[p.productId] = p.localizedPrice || p.price;
        });
        setProducts(priceMap);
      } catch {}
      finally {
        if (mounted) setLoadingProducts(false);
      }
    })();
    return () => {
      mounted = false;
      iapModule?.endConnection?.();
    };
  }, []);

  const handleDonate = useCallback(async () => {
    if (Platform.OS !== "android") {
      Alert.alert("Android Only", "In-app purchases are available on Android via Google Play.", [{ text: "OK" }]);
      return;
    }
    if (!iapModule || !connected) {
      Alert.alert("Store Unavailable", "Google Play Store is not available right now. Please try again.", [{ text: "OK" }]);
      return;
    }
    const sku = selected;
    setPurchasing(sku);
    try {
      await (iapModule as any)!.requestPurchase({ sku, skus: [sku] });
      Alert.alert(
        "Thank You",
        "Your support means a lot. It goes directly to keeping QR Guard running and improving.",
        [{ text: "Close" }]
      );
    } catch (err: any) {
      if (err?.code !== "E_USER_CANCELLED") {
        Alert.alert("Purchase Failed", "Something went wrong. Your payment was not charged.", [{ text: "OK" }]);
      }
    } finally {
      setPurchasing(null);
    }
  }, [selected, connected]);

  const selectedTier = TIERS.find((t) => t.sku === selected) ?? TIERS[1];
  const selectedPrice = products[selected] || selectedTier.amount;

  return (
    <View style={[s.container, { backgroundColor: colors.background, paddingTop: topInset }]}>
      <ScreenHeader title="Support QR Guard" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 48 }]}
      >

        {/* ── HERO ─────────────────────────────────────────────── */}
        <View style={s.hero}>
          <View style={[s.heroIconRing, { borderColor: colors.primary + "28", backgroundColor: colors.primaryDim }]}>
            <Ionicons name="shield-checkmark" size={28} color={colors.primary} />
          </View>
          <Text style={[s.heroTitle, { color: colors.text }]}>
            Support QR Guard
          </Text>
          <Text style={[s.heroSub, { color: colors.textSecondary }]}>
            Help build a safer QR experience for everyone.{"\n"}Your support funds scam detection, security systems, and privacy-first features.
          </Text>
          <View style={s.heroTagRow}>
            {["100% Free", "No Ads", "No Subscriptions"].map((tag) => (
              <View
                key={tag}
                style={[s.heroTag, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
              >
                <Ionicons name="checkmark" size={11} color={colors.primary} />
                <Text style={[s.heroTagText, { color: colors.textSecondary }]}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── IMPACT CARDS ─────────────────────────────────────── */}
        <View style={s.impactRow}>
          {IMPACT_ITEMS.map((item) => (
            <View
              key={item.title}
              style={[s.impactCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
            >
              <View style={[s.impactIconWrap, { backgroundColor: colors.primaryDim }]}>
                <Ionicons name={item.icon} size={15} color={colors.primary} />
              </View>
              <Text style={[s.impactTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={[s.impactDesc, { color: colors.textMuted }]}>{item.desc}</Text>
            </View>
          ))}
        </View>

        {/* ── AMOUNT PICKER ────────────────────────────────────── */}
        <View style={[s.pickerCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <View style={s.pickerHeader}>
            <Text style={[s.pickerLabel, { color: colors.text }]}>Choose an amount</Text>
            {loadingProducts && <ActivityIndicator size="small" color={colors.primary} />}
          </View>
          <Text style={[s.pickerSub, { color: colors.textMuted }]}>
            One-time · No recurring charges · via Google Play
          </Text>

          <View style={s.chipRow}>
            {TIERS.map((tier) => {
              const isActive = selected === tier.sku;
              const displayPrice = products[tier.sku] || tier.amount;
              return (
                <Pressable
                  key={tier.sku}
                  onPress={() => setSelected(tier.sku)}
                  style={({ pressed }) => [
                    s.chip,
                    {
                      backgroundColor: isActive ? colors.primary : colors.surfaceLight,
                      borderColor: isActive ? colors.primary : colors.surfaceBorder,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Text style={[s.chipAmount, { color: isActive ? "#fff" : colors.text }]}>
                    {displayPrice}
                  </Text>
                  {isActive && (
                    <Text style={[s.chipLabel, { color: "rgba(255,255,255,0.75)" }]}>
                      {tier.label}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* CTA */}
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
                  <Text style={s.ctaText}>Support with {selectedPrice}</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </View>

        {/* ── TRUST NOTE ───────────────────────────────────────── */}
        <View style={[s.trustCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <Ionicons name="lock-closed-outline" size={14} color={colors.textMuted} style={{ marginTop: 1 }} />
          <Text style={[s.trustText, { color: colors.textMuted }]}>
            QR Guard never sells user data. Your support keeps the platform independent and free. Donations are voluntary and non-refundable. For refunds, contact Google Play Support.
          </Text>
        </View>

        {/* ── WHERE IT GOES ─────────────────────────────────────── */}
        <View style={[s.whereCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <Text style={[s.whereTitle, { color: colors.text }]}>Where your support goes</Text>
          {[
            { icon: "server-outline" as const,          text: "Firebase & server infrastructure" },
            { icon: "shield-checkmark-outline" as const, text: "Google Safe Browsing threat data" },
            { icon: "code-slash-outline" as const,       text: "Solo developer building full-time" },
            { icon: "bug-outline" as const,              text: "Security audits & performance" },
          ].map(({ icon, text }) => (
            <View key={text} style={s.whereRow}>
              <Ionicons name={icon} size={14} color={colors.primary} />
              <Text style={[s.whereText, { color: colors.textSecondary }]}>{text}</Text>
            </View>
          ))}
        </View>

        {/* ── FOOTER ───────────────────────────────────────────── */}
        <Text style={[s.footer, { color: colors.textMuted }]}>
          Made with care in India · QR Guard
        </Text>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  scroll:    { paddingHorizontal: 16, paddingTop: 8, gap: 14 },

  // Hero
  hero: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 8,
    gap: 10,
  },
  heroIconRing: {
    width: 64, height: 64,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  heroSub: {
    fontSize: 13.5,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 21,
    maxWidth: 310,
  },
  heroTagRow: { flexDirection: "row", gap: 7, flexWrap: "wrap", justifyContent: "center", marginTop: 2 },
  heroTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    borderWidth: 1,
  },
  heroTagText: { fontSize: 11, fontFamily: "Inter_500Medium" },

  // Impact cards
  impactRow:  { flexDirection: "row", gap: 8 },
  impactCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 7,
  },
  impactIconWrap: {
    width: 32, height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  impactTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", lineHeight: 16 },
  impactDesc:  { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 15 },

  // Picker card
  pickerCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  pickerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pickerLabel:  { fontSize: 15, fontFamily: "Inter_700Bold" },
  pickerSub:    { fontSize: 11.5, fontFamily: "Inter_400Regular", lineHeight: 17, marginTop: -4 },

  // Amount chips
  chipRow: { flexDirection: "row", gap: 8 },
  chip: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 13,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 3,
  },
  chipAmount: { fontSize: 16, fontFamily: "Inter_700Bold" },
  chipLabel:  { fontSize: 9,  fontFamily: "Inter_500Medium", letterSpacing: 0.2 },

  // CTA
  ctaBtn:  { borderRadius: 16, overflow: "hidden" },
  ctaGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    paddingHorizontal: 24,
  },
  ctaText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 0.1,
  },

  // Trust note
  trustCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  trustText: {
    flex: 1,
    fontSize: 11.5,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },

  // Where it goes
  whereCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    gap: 11,
  },
  whereTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },
  whereRow:   { flexDirection: "row", alignItems: "center", gap: 10 },
  whereText:  { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 19 },

  // Footer
  footer: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingVertical: 8,
  },
});
