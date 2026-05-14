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
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/contexts/ThemeContext";
import type { AppColors } from "@/constants/colors";

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
    icon: "cafe-outline" as const,
    description: "Keeps the servers running for a few minutes",
    gradient: ["#92400E", "#B45309"] as [string, string],
    emoji: "☕",
  },
  {
    sku: "qrguard_donate_50",
    amount: "₹50",
    label: "Buy Me a Snack",
    icon: "pizza-outline" as const,
    description: "Covers bug fixes and small feature development",
    gradient: ["#1D4ED8", "#3B82F6"] as [string, string],
    emoji: "🍕",
    popular: true,
  },
  {
    sku: "qrguard_donate_100",
    amount: "₹100",
    label: "Power the App",
    icon: "rocket-outline" as const,
    description: "Funds new features and threat intelligence upgrades",
    gradient: ["#5B21B6", "#7C3AED"] as [string, string],
    emoji: "🚀",
  },
];

function TierCard({
  tier,
  colors,
  price,
  onPress,
  loading,
}: {
  tier: (typeof TIERS)[0];
  colors: AppColors;
  price?: string;
  onPress: () => void;
  loading: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        styles.tierCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.surfaceBorder,
          opacity: pressed ? 0.88 : 1,
        },
        tier.popular && { borderColor: colors.primary, borderWidth: 2 },
      ]}
    >
      {tier.popular && (
        <View style={[styles.popularBadge, { backgroundColor: colors.primary }]}>
          <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
        </View>
      )}
      <View style={styles.tierRow}>
        <LinearGradient
          colors={tier.gradient}
          style={styles.tierIconWrap}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.tierEmoji}>{tier.emoji}</Text>
        </LinearGradient>

        <View style={styles.tierInfo}>
          <Text style={[styles.tierLabel, { color: colors.text }]}>{tier.label}</Text>
          <Text style={[styles.tierDesc, { color: colors.textSecondary }]}>{tier.description}</Text>
        </View>

        <View style={[styles.tierPriceWrap, { backgroundColor: colors.primaryDim }]}>
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.tierPrice, { color: colors.primary }]}>
              {price || tier.amount}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

function InfoRow({ icon, text, colors }: { icon: keyof typeof Ionicons.glyphMap; text: string; colors: AppColors }) {
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIconWrap, { backgroundColor: colors.primaryDim }]}>
        <Ionicons name={icon} size={15} color={colors.primary} />
      </View>
      <Text style={[styles.infoText, { color: colors.textSecondary }]}>{text}</Text>
    </View>
  );
}

export default function DonationScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

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

        const items = await iapModule!.getProducts({ skus: DONATION_SKUS });
        if (!mounted) return;

        const priceMap: Record<string, string> = {};
        items.forEach((p: any) => {
          priceMap[p.productId] = p.localizedPrice || p.price;
        });
        setProducts(priceMap);
      } catch (e) {
      } finally {
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
        Alert.alert(
          "Android Only",
          "In-app purchases are only available on Android via Google Play Store.",
          [{ text: "OK" }]
        );
        return;
      }

      if (!iapModule || !connected) {
        Alert.alert(
          "Store Unavailable",
          "Google Play Store is not available right now. Please try again later.",
          [{ text: "OK" }]
        );
        return;
      }

      setPurchasingSkus((prev) => new Set([...prev, sku]));
      try {
        await iapModule!.requestPurchase({ skus: [sku] });
        Alert.alert(
          "Thank You! 🙏",
          "Your donation means the world to us. It goes directly to supporting the developer and keeping QR Guard running and improving.",
          [{ text: "Close" }]
        );
      } catch (err: any) {
        if (err?.code !== "E_USER_CANCELLED") {
          Alert.alert("Purchase Failed", "Something went wrong. Your payment was not charged.", [
            { text: "OK" },
          ]);
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
    <View style={[styles.container, { paddingTop: topInset, backgroundColor: colors.background }]}>
      <View style={[styles.navBar, { borderBottomColor: colors.surfaceBorder }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.text }]}>Support QR Guard</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
      >
        {/* Hero */}
        <LinearGradient
          colors={
            colors.isDark
              ? ["rgba(139,92,246,0.15)", "rgba(99,102,241,0.08)", "transparent"]
              : ["rgba(139,92,246,0.08)", "rgba(99,102,241,0.03)", "transparent"]
          }
          style={[styles.hero, { borderColor: "#7C3AED30" }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <LinearGradient
            colors={["#7C3AED", "#6366F1"]}
            style={styles.heroIconWrap}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="heart" size={30} color="#fff" />
          </LinearGradient>
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            Help Keep QR Guard Free & Secure
          </Text>
          <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
            QR Guard is built and maintained by an indie developer. Every rupee you donate goes directly towards server costs, threat intelligence feeds, and building new features that protect you and millions of others from QR code fraud.
          </Text>
        </LinearGradient>

        {/* What your donation supports */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Where Your Donation Goes</Text>
          <InfoRow icon="server-outline" text="Firebase & server infrastructure costs" colors={colors} />
          <InfoRow icon="shield-checkmark-outline" text="Google Safe Browsing threat intelligence API" colors={colors} />
          <InfoRow icon="code-slash-outline" text="Full-time development by a solo founder" colors={colors} />
          <InfoRow icon="bug-outline" text="Bug fixes, security audits, and performance work" colors={colors} />
          <InfoRow icon="globe-outline" text="Keeping the app 100% free for all users" colors={colors} />
        </View>

        {/* Donation tiers */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Choose an Amount</Text>
        <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
          All payments are processed securely via Google Play Store. No recurring charges — this is a one-time donation.
        </Text>

        {loadingProducts && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>
              Connecting to Play Store…
            </Text>
          </View>
        )}

        {TIERS.map((tier) => (
          <TierCard
            key={tier.sku}
            tier={tier}
            colors={colors}
            price={products[tier.sku]}
            loading={purchasingSkus.has(tier.sku)}
            onPress={() => handleDonate(tier.sku)}
          />
        ))}

        {/* Transparency note */}
        <View style={[styles.noteCard, { backgroundColor: colors.warningDim, borderColor: colors.warning + "35" }]}>
          <Ionicons name="information-circle-outline" size={18} color={colors.warning} />
          <Text style={[styles.noteText, { color: colors.warning }]}>
            Donations are voluntary and non-refundable. They do not unlock premium features. QR Guard remains free for everyone regardless. For refunds, contact Google Play Support directly.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Ionicons name="heart" size={14} color="#EC4899" />
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            Made with love in India — QR Guard v2.0
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navTitle: { fontSize: 16, fontFamily: "Inter_700Bold", flex: 1, textAlign: "center" },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  scrollContent: { padding: 16, gap: 12 },
  hero: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    alignItems: "center",
    gap: 12,
  },
  heroIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    lineHeight: 25,
  },
  heroSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  infoText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 19,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    marginTop: 4,
  },
  sectionSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    marginTop: -6,
    marginBottom: 4,
  },
  loadingWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
  },
  loadingText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  tierCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    overflow: "visible",
  },
  popularBadge: {
    position: "absolute",
    top: -10,
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 100,
    zIndex: 1,
  },
  popularBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 0.8,
  },
  tierRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  tierIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  tierEmoji: { fontSize: 22 },
  tierInfo: { flex: 1, gap: 3 },
  tierLabel: { fontSize: 14, fontFamily: "Inter_700Bold" },
  tierDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  tierPriceWrap: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 60,
    alignItems: "center",
  },
  tierPrice: { fontSize: 15, fontFamily: "Inter_700Bold" },
  noteCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    marginTop: 4,
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
    paddingVertical: 12,
  },
  footerText: { fontSize: 11, fontFamily: "Inter_500Medium" },
});
