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
import { useTheme } from "@/contexts/ThemeContext";
import type { AppColors } from "@/shared/constants/colors";

let iapModule: typeof import("react-native-iap") | null = null;
try {
  iapModule = require("react-native-iap");
} catch {}

const DONATION_SKUS = [
  "qrguard_donate_10",
  "qrguard_donate_50",
  "qrguard_donate_100",
];

const TIERS = [
  {
    sku: "qrguard_donate_10",
    amount: "₹10",
    label: "Buy Me a Coffee",
    emoji: "☕",
    description: "Keeps the servers warm for a while",
    gradient: ["#78350F", "#92400E", "#B45309"] as [string, string, string],
    accentColor: "#F59E0B",
    popular: false,
  },
  {
    sku: "qrguard_donate_50",
    amount: "₹50",
    label: "Buy Me a Meal",
    emoji: "🍱",
    description: "Funds bug fixes and new features",
    gradient: ["#1E3A8A", "#1D4ED8", "#3B82F6"] as [string, string, string],
    accentColor: "#93C5FD",
    popular: true,
  },
  {
    sku: "qrguard_donate_100",
    amount: "₹100",
    label: "Power the App",
    emoji: "🚀",
    description: "Funds threat intelligence & security upgrades",
    gradient: ["#3B0764", "#5B21B6", "#7C3AED"] as [string, string, string],
    accentColor: "#C4B5FD",
    popular: false,
  },
];

function TierCard({
  tier,
  price,
  onPress,
  loading,
}: {
  tier: (typeof TIERS)[0];
  price?: string;
  onPress: () => void;
  loading: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1 }]}
    >
      <LinearGradient
        colors={tier.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.tierCard, tier.popular && styles.tierCardPopular]}
      >
        {tier.popular && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularBadgeText}>⭐  MOST POPULAR</Text>
          </View>
        )}

        <View style={styles.tierTopRow}>
          <Text style={styles.tierEmoji}>{tier.emoji}</Text>
          <View style={styles.tierLabelWrap}>
            <Text style={styles.tierLabel}>{tier.label}</Text>
            <Text style={styles.tierDesc}>{tier.description}</Text>
          </View>
        </View>

        <View style={styles.tierDivider} />

        <View style={styles.tierBottomRow}>
          <View>
            <Text style={styles.tierPriceSmall}>One-time donation</Text>
            <Text style={[styles.tierPrice, { color: tier.accentColor }]}>
              {price || tier.amount}
            </Text>
          </View>
          <View style={[styles.tierBtn, { borderColor: tier.accentColor + "55", backgroundColor: "rgba(0,0,0,0.22)" }]}>
            {loading ? (
              <ActivityIndicator size="small" color={tier.accentColor} />
            ) : (
              <>
                <Text style={[styles.tierBtnText, { color: tier.accentColor }]}>Donate</Text>
                <Ionicons name="arrow-forward" size={14} color={tier.accentColor} />
              </>
            )}
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

export default function DonationScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = useTopInset();

  const [products, setProducts] = useState<Record<string, string>>({});
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [purchasingSkus, setPurchasingSkus] = useState<Set<string>>(new Set());
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!iapModule || Platform.OS !== "android") return;
    let mounted = true;
    (async () => {
      try {
        setLoadingProducts(true);
        await iapModule!.initConnection();
        if (!mounted) return;
        setConnected(true);
        const items =
          (await (iapModule as any)!.fetchProducts?.({ productIds: DONATION_SKUS })) ??
          (await (iapModule as any)!.getProducts?.({ skus: DONATION_SKUS })) ??
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

  const handleDonate = useCallback(
    async (sku: string) => {
      if (Platform.OS !== "android") {
        Alert.alert("Android Only", "In-app purchases are only available on Android via Google Play.", [{ text: "OK" }]);
        return;
      }
      if (!iapModule || !connected) {
        Alert.alert("Store Unavailable", "Google Play Store is not available right now. Please try again later.", [{ text: "OK" }]);
        return;
      }
      setPurchasingSkus((prev) => new Set([...prev, sku]));
      try {
        await (iapModule as any)!.requestPurchase({ sku, skus: [sku] });
        Alert.alert(
          "Thank You! 🙏",
          "Your donation means the world to us. It goes directly to supporting the developer and keeping QR Guard running and improving.",
          [{ text: "Close" }]
        );
      } catch (err: any) {
        if (err?.code !== "E_USER_CANCELLED") {
          Alert.alert("Purchase Failed", "Something went wrong. Your payment was not charged.", [{ text: "OK" }]);
        }
      } finally {
        setPurchasingSkus((prev) => {
          const next = new Set(prev);
          next.delete(sku);
          return next;
        });
      }
    },
    [connected]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topInset }]}>
      <ScreenHeader title="Support QR Guard" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 48 }]}
      >
        {/* ── HERO ── */}
        <LinearGradient
          colors={
            colors.isDark
              ? ["rgba(109,40,217,0.22)", "rgba(79,70,229,0.10)", "transparent"]
              : ["rgba(109,40,217,0.10)", "rgba(79,70,229,0.04)", "transparent"]
          }
          style={[styles.hero, { borderColor: colors.isDark ? "#7C3AED28" : "#7C3AED18" }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <LinearGradient
            colors={["#6D28D9", "#7C3AED", "#4F46E5"]}
            style={styles.heroIcon}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.heroIconEmoji}>❤️</Text>
          </LinearGradient>
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            Help Keep QR Guard{"\n"}Free &amp; Secure
          </Text>
          <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
            Built by a solo developer in India. Every rupee goes directly to servers, threat intelligence, and building features that protect you from QR fraud.
          </Text>
          <View style={styles.heroTagRow}>
            {["100% free", "No ads", "No subscriptions"].map((tag) => (
              <View key={tag} style={[styles.heroTag, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "30" }]}>
                <Text style={[styles.heroTagText, { color: colors.primary }]}>{tag}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* ── SECTION LABEL ── */}
        <View style={styles.sectionRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Choose an Amount</Text>
          {loadingProducts && <ActivityIndicator size="small" color={colors.primary} />}
        </View>
        <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
          One-time · No recurring charges · Processed securely by Google Play
        </Text>

        {/* ── TIER CARDS ── */}
        <View style={styles.tiersWrap}>
          {TIERS.map((tier) => (
            <TierCard
              key={tier.sku}
              tier={tier}
              price={products[tier.sku]}
              loading={purchasingSkus.has(tier.sku)}
              onPress={() => handleDonate(tier.sku)}
            />
          ))}
        </View>

        {/* ── WHERE IT GOES ── */}
        <View style={[styles.whereCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <Text style={[styles.whereTitle, { color: colors.text }]}>Where your money goes</Text>
          {[
            { icon: "server-outline" as const, text: "Firebase & server infrastructure costs" },
            { icon: "shield-checkmark-outline" as const, text: "Google Safe Browsing threat intelligence" },
            { icon: "code-slash-outline" as const, text: "Solo developer — building full-time for you" },
            { icon: "bug-outline" as const, text: "Security audits, bug fixes & performance" },
          ].map(({ icon, text }) => (
            <View key={text} style={styles.whereRow}>
              <View style={[styles.whereIconWrap, { backgroundColor: colors.primaryDim }]}>
                <Ionicons name={icon} size={14} color={colors.primary} />
              </View>
              <Text style={[styles.whereText, { color: colors.textSecondary }]}>{text}</Text>
            </View>
          ))}
        </View>

        {/* ── DISCLAIMER ── */}
        <View style={[styles.noteCard, { backgroundColor: colors.warningDim, borderColor: colors.warning + "30" }]}>
          <Ionicons name="information-circle-outline" size={16} color={colors.warning} />
          <Text style={[styles.noteText, { color: colors.warning }]}>
            Donations are voluntary and non-refundable. They do not unlock premium features — QR Guard remains free for everyone. For refunds, contact Google Play Support.
          </Text>
        </View>

        {/* ── FOOTER ── */}
        <View style={styles.footer}>
          <Text style={styles.footerHeart}>❤️</Text>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>Made with love in India · QR Guard</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8, gap: 14 },

  hero: {
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    alignItems: "center",
    gap: 12,
  },
  heroIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  heroIconEmoji: { fontSize: 30 },
  heroTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    lineHeight: 30,
  },
  heroSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 300,
  },
  heroTagRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" },
  heroTag: {
    paddingHorizontal: 11, paddingVertical: 5,
    borderRadius: 100, borderWidth: 1,
  },
  heroTagText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  sectionRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: -4,
  },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  sectionSub: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },

  tiersWrap: { gap: 12 },

  tierCard: {
    borderRadius: 22,
    padding: 20,
    gap: 14,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  tierCardPopular: {
    shadowOpacity: 0.55,
    elevation: 14,
    transform: [{ scale: 1.01 }],
  },
  popularBadge: {
    position: "absolute",
    top: 0,
    right: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "rgba(255,255,255,0.18)",
  },
  popularBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 0.6,
  },
  tierTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 4,
  },
  tierEmoji: { fontSize: 38 },
  tierLabelWrap: { flex: 1, gap: 4 },
  tierLabel: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  tierDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.65)",
    lineHeight: 17,
  },
  tierDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  tierBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tierPriceSmall: {
    fontSize: 9,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.50)",
    marginBottom: 3,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  tierPrice: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
  },
  tierBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    minWidth: 96,
    justifyContent: "center",
  },
  tierBtnText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },

  whereCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  whereTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  whereRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  whereIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  whereText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 19,
  },

  noteCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
  },
  footerHeart: { fontSize: 13 },
  footerText: { fontSize: 11, fontFamily: "Inter_500Medium" },
});
