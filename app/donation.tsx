import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
  type LayoutChangeEvent,
} from "react-native";
import Reanimated from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTopInset } from "@/shared/utils/platform";
import ScreenHeader from "@/shared/components/ui/ScreenHeader";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useHeaderHide } from "@/shared/utils/use-header-hide";

// react-native-iap v15 — loaded lazily so it never crashes on non-Android builds
let iap: typeof import("react-native-iap") | null = null;
try { iap = require("react-native-iap"); } catch {}

// ── Product definitions ────────────────────────────────────────────────────────
const TIERS = [
  {
    sku:    "binro_donate_10",
    amount: "₹10",
    label:  "For the Founder",
    desc:   "A small thank-you directly to the person building this",
  },
  {
    sku:    "binro_donate_50",
    amount: "₹50",
    label:  "App Development",
    desc:   "Helps fund server costs and new features",
  },
  {
    sku:    "binro_donate_100",
    amount: "₹100",
    label:  "App Development",
    desc:   "Powers security upgrades and threat intelligence",
  },
] as const;

const ALL_SKUS = TIERS.map((t) => t.sku);

// ── Detailed failure reason mapper ────────────────────────────────────────────
// Maps every react-native-iap v15 ErrorCode (kebab-case) to a specific,
// human-readable title + message so users always know EXACTLY why payment failed.
function getPaymentFailureDetails(error: any): { title: string; message: string } | null {
  // Normalise the code — v15 uses kebab-case (e.g. "network-error"),
  // but legacy E_* codes (e.g. "E_NETWORK_ERROR") may still appear from native.
  const raw: string = error?.code ?? error?.message ?? "";
  const code = raw
    .toLowerCase()
    .replace(/^e_/, "")       // strip leading E_
    .replace(/_/g, "-");      // snake_case → kebab-case

  switch (code) {
    // ── User actions (silent or informational) ──────────────────────────────
    case "user-cancelled":
    case "user-canceled":
      return null; // user deliberately cancelled — no alert needed

    case "deferred-payment":
      return {
        title:   "Awaiting Approval",
        message: "Your payment is pending parental or family approval. You will be charged once it is approved.",
      };

    case "pending":
      return {
        title:   "Payment Pending",
        message: "Your payment is being processed by Google Play. It may take a few minutes to complete.",
      };

    // ── Network & connectivity ───────────────────────────────────────────────
    case "network-error":
    case "remote-error":
      return {
        title:   "No Internet Connection",
        message: "Your payment could not be sent because the device is offline. Please connect to the internet and try again.",
      };

    case "service-timeout":
      return {
        title:   "Google Play Timed Out",
        message: "The request to Google Play took too long. Please check your connection and try again.",
      };

    // ── Google Play service issues ───────────────────────────────────────────
    case "service-error":
      return {
        title:   "Google Play Service Error",
        message: "Google Play Store encountered an error. Please make sure the Play Store app is up-to-date and try again.",
      };

    case "service-disconnected":
    case "connection-closed":
      return {
        title:   "Google Play Disconnected",
        message: "The connection to Google Play was lost mid-payment. Your card was NOT charged. Please try again.",
      };

    case "billing-unavailable":
      return {
        title:   "Billing Not Available",
        message: "In-app purchases are not enabled on this device or Google account. This can happen if your Play account doesn't support billing in your country, or if the device is managed/restricted.",
      };

    case "feature-not-supported":
      return {
        title:   "Not Supported on This Device",
        message: "Your device or Android version does not support in-app purchases via Google Play.",
      };

    case "iap-not-available":
      return {
        title:   "In-App Purchases Unavailable",
        message: "Google Play in-app purchases are not available right now. This may be a temporary Play Store outage — please try again later.",
      };

    // ── Product / SKU issues ─────────────────────────────────────────────────
    case "item-unavailable":
    case "sku-not-found":
    case "empty-sku-list":
      return {
        title:   "Donation Not Available",
        message: "This donation tier is not currently available in the store. The app may need to be updated. Please try again after updating BinRo.",
      };

    case "sku-offer-mismatch":
      return {
        title:   "Product Mismatch",
        message: "There was a mismatch between the selected donation and the store offer. Please restart the app and try again.",
      };

    case "query-product":
      return {
        title:   "Could Not Load Products",
        message: "BinRo could not fetch donation options from Google Play. Please check your internet and try again.",
      };

    // ── Ownership / duplicate issues ─────────────────────────────────────────
    case "already-owned":
      return {
        title:   "Already Purchased",
        message: "Google Play shows this donation as already purchased but not yet consumed. Please restart the app — it will be automatically resolved.",
      };

    case "item-not-owned":
      return {
        title:   "Purchase Not Found",
        message: "Google Play could not find an active purchase to finish. If you were charged, please contact support@binro.app with your order ID.",
      };

    case "duplicate-purchase":
      return {
        title:   "Duplicate Purchase Detected",
        message: "It looks like this purchase was already processed. Your previous donation went through — you have not been double-charged.",
      };

    // ── Transaction / verification issues ────────────────────────────────────
    case "transaction-validation-failed":
    case "purchase-verification-failed":
    case "receipt-failed":
      return {
        title:   "Verification Failed",
        message: "Your payment went through on Google Play but BinRo could not verify it. You have NOT been charged twice. Please contact support@binro.app with your order ID.",
      };

    case "purchase-verification-finish-failed":
    case "receipt-finished-failed":
    case "not-ended":
      return {
        title:   "Could Not Confirm Donation",
        message: "Payment was received but the confirmation step failed. The donation is still recorded. If the issue persists, please contact support@binro.app.",
      };

    case "purchase-verification-finished":
    case "receipt-finished":
      return null; // this is actually success — no error alert needed

    // ── Initialisation issues ────────────────────────────────────────────────
    case "not-prepared":
    case "init-connection":
    case "already-prepared":
      return {
        title:   "Store Not Ready",
        message: "BinRo could not connect to Google Play Store. Please make sure the Play Store app is installed and you are signed in to a Google account, then try again.",
      };

    // ── Interrupted / general errors ─────────────────────────────────────────
    case "interrupted":
      return {
        title:   "Purchase Interrupted",
        message: "The payment flow was interrupted (e.g. the app went to background). Your card was NOT charged. Please try again.",
      };

    case "developer-error":
    case "sync-error":
      return {
        title:   "App Configuration Error",
        message: "An internal error occurred in the payment setup. Please update BinRo to the latest version and try again.",
      };

    case "purchase-error":
    case "user-error":
      return {
        title:   "Purchase Failed",
        message: "Google Play rejected the purchase. Please make sure your payment method is valid and try again.",
      };

    // ── Unknown / fallback ───────────────────────────────────────────────────
    default: {
      // Try to surface the raw message if it contains useful info
      const rawMsg: string = error?.message ?? "";
      if (rawMsg && !rawMsg.toLowerCase().includes("unknown")) {
        return {
          title:   "Payment Failed",
          message: `${rawMsg}\n\nIf you were charged, please contact support@binro.app with your order details.`,
        };
      }
      return {
        title:   "Payment Failed",
        message: "An unexpected error occurred with Google Play. Your card was not charged. Please try again or contact support@binro.app if the problem continues.",
      };
    }
  }
}

// ── Screen ─────────────────────────────────────────────────────────────────────
export default function DonationScreen() {
  const { colors } = useTheme();
  const insets     = useSafeAreaInsets();
  const topInset   = useTopInset();
  const { headerStyle, setHeight, onScroll: onHeaderScroll } = useHeaderHide();
  const [headerH, setHeaderH] = useState(0);

  const [prices,          setPrices]          = useState<Record<string, string>>({});
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [purchasing,      setPurchasing]      = useState<string | null>(null);
  const [connected,       setConnected]       = useState(false);
  const [selected,        setSelected]        = useState<string>(TIERS[1].sku);
  const [lastError,       setLastError]       = useState<{ title: string; message: string } | null>(null);

  const mountedRef    = useRef(true);
  const purchasingRef = useRef<string | null>(null);

  const showError = useCallback((details: { title: string; message: string }) => {
    setLastError(details);
    Alert.alert(details.title, details.message, [{ text: "OK", onPress: () => setLastError(null) }]);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (!iap || Platform.OS !== "android") return;

    // ── v15 purchase listeners ─────────────────────────────────────────────
    const onPurchase = iap.purchaseUpdatedListener(async (purchase) => {
      const token = purchase.purchaseToken;
      if (!token) return;
      try {
        await iap!.finishTransaction({ purchase, isConsumable: true });
        if (mountedRef.current) {
          setPurchasing(null);
          purchasingRef.current = null;
          setLastError(null);
          Alert.alert(
            "Thank You ❤️",
            "Your support means everything. It goes directly to the person building BinRo.",
            [{ text: "Close" }],
          );
        }
      } catch (err: any) {
        if (mountedRef.current) {
          setPurchasing(null);
          purchasingRef.current = null;
          // finishTransaction failure — payment went through but confirmation failed
          const details = getPaymentFailureDetails(err) ?? {
            title:   "Could Not Confirm Donation",
            message: "Payment was received but the confirmation step failed. Please contact support@binro.app with your order ID.",
          };
          showError(details);
        }
      }
    });

    const onError = iap.purchaseErrorListener((error: any) => {
      if (!mountedRef.current) return;
      setPurchasing(null);
      purchasingRef.current = null;
      const details = getPaymentFailureDetails(error);
      if (details) showError(details); // null = user-cancelled, no alert
    });

    // ── Init + fetch Play Console prices ──────────────────────────────────
    (async () => {
      try {
        setLoadingProducts(true);
        await iap!.initConnection();
        if (!mountedRef.current) return;
        setConnected(true);

        const items = await iap!.fetchProducts({ skus: ALL_SKUS, type: "in-app" });
        if (!mountedRef.current) return;

        const priceMap: Record<string, string> = {};
        (items as any[]).forEach((p: any) => {
          const id    = p.id ?? p.productId;
          const price = p.displayPrice || p.localizedPrice || p.price;
          if (id && price) priceMap[id] = String(price);
        });
        setPrices(priceMap);
      } catch (err: any) {
        // Non-fatal — screen still works with hardcoded ₹ labels
      } finally {
        if (mountedRef.current) setLoadingProducts(false);
      }
    })();

    return () => {
      mountedRef.current = false;
      onPurchase.remove();
      onError.remove();
      iap?.endConnection?.();
    };
  }, [showError]);

  // ── Purchase handler ───────────────────────────────────────────────────────
  const handleDonate = useCallback(async () => {
    if (Platform.OS !== "android") {
      Alert.alert(
        "Android Only",
        "Donations are processed via Google Play and are only available on Android.",
        [{ text: "OK" }],
      );
      return;
    }

    if (!iap || !connected) {
      showError({
        title:   "Store Not Connected",
        message: "BinRo could not connect to Google Play Store. Please make sure you are signed in to a Google account, the Play Store app is up-to-date, and you have an active internet connection.",
      });
      return;
    }

    if (purchasingRef.current) return;

    const sku = selected;
    purchasingRef.current = sku;
    setPurchasing(sku);
    setLastError(null);

    try {
      await (iap as any).requestPurchase({
        request: { google: { skus: [sku] } },
        type: "in-app",
      });
      // Success comes via purchaseUpdatedListener
    } catch (err: any) {
      setPurchasing(null);
      purchasingRef.current = null;
      const details = getPaymentFailureDetails(err);
      if (details) showError(details);
    }
  }, [selected, connected, showError]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const selectedTier  = TIERS.find((t) => t.sku === selected) ?? TIERS[1];
  const selectedPrice = prices[selected] || selectedTier.amount;
  const isAndroid     = Platform.OS === "android";
  const btnLabel      = isAndroid ? `Send ${selectedPrice}` : "Available on Android";

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

        {/* ── LAST ERROR BANNER (persistent until dismissed) ───────── */}
        {lastError && (
          <Pressable
            onPress={() => setLastError(null)}
            style={[s.errorBanner, { backgroundColor: colors.dangerDim, borderColor: colors.danger + "40" }]}
          >
            <Ionicons name="alert-circle" size={16} color={colors.danger} />
            <View style={{ flex: 1 }}>
              <Text style={[s.errorBannerTitle, { color: colors.danger }]}>{lastError.title}</Text>
              <Text style={[s.errorBannerMsg,   { color: colors.danger + "cc" }]} numberOfLines={3}>
                {lastError.message}
              </Text>
            </View>
            <Ionicons name="close" size={14} color={colors.danger} />
          </Pressable>
        )}

        {/* ── HERO ─────────────────────────────────────────────── */}
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

        {/* ── TIER CARDS ───────────────────────────────────────── */}
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
                    borderColor:     isActive ? colors.primary    : colors.surfaceBorder,
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

        {/* ── DONATE BUTTON ────────────────────────────────────── */}
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
            Processed via Google Play · Donations are non-refundable
          </Text>
        </View>

        {/* ── WHERE IT GOES ─────────────────────────────────────── */}
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

        {/* ── FOOTER ───────────────────────────────────────────── */}
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
