import { useState, useEffect, useCallback, useRef } from "react";
import { Platform, Alert } from "react-native";
import { getPaymentFailureDetails } from "../utils/iapErrors";

// react-native-iap v15 — loaded lazily so it never crashes on web
let iap: typeof import("react-native-iap") | null = null;
try { iap = require("react-native-iap"); } catch {}

export const TIERS = [
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

export type TierSku = (typeof TIERS)[number]["sku"];

const ALL_SKUS = TIERS.map((t) => t.sku);

export function useDonation() {
  const [prices,          setPrices]          = useState<Record<string, string>>({});
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [purchasing,      setPurchasing]      = useState<string | null>(null);
  const [connected,       setConnected]       = useState(false);
  const [selected,        setSelected]        = useState<TierSku>(TIERS[1].sku);
  const [lastError,       setLastError]       = useState<{ title: string; message: string } | null>(null);

  const mountedRef    = useRef(true);
  const purchasingRef = useRef<string | null>(null);

  const showError = useCallback((details: { title: string; message: string }) => {
    setLastError(details);
    Alert.alert(details.title, details.message, [{ text: "OK", onPress: () => setLastError(null) }]);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (!iap || Platform.OS === "web") return;

    // ── v15 purchase listeners ─────────────────────────────────────────────
    const onPurchase = iap.purchaseUpdatedListener(async (purchase) => {
      const token = purchase.purchaseToken ?? (purchase as any).transactionId;
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
          const store   = Platform.OS === "ios" ? "App Store" : "Google Play";
          const details = getPaymentFailureDetails(err, store) ?? {
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
      const store   = Platform.OS === "ios" ? "App Store" : "Google Play";
      const details = getPaymentFailureDetails(error, store);
      if (details) showError(details);
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
      } catch {
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

  const handleDonate = useCallback(async () => {
    if (!iap || !connected) {
      const store = Platform.OS === "ios" ? "App Store" : "Google Play Store";
      showError({
        title:   "Store Not Connected",
        message: `BinRo could not connect to ${store}. Please make sure you are signed in and have an active internet connection, then try again.`,
      });
      return;
    }

    if (purchasingRef.current) return;

    const sku = selected;
    purchasingRef.current = sku;
    setPurchasing(sku);
    setLastError(null);

    try {
      await (iap as any).requestPurchase(
        Platform.OS === "android"
          ? { request: { google: { skus: [sku] } }, type: "in-app" }
          : { request: { ios: { sku } },             type: "in-app" },
      );
      // Success comes via purchaseUpdatedListener
    } catch (err: any) {
      setPurchasing(null);
      purchasingRef.current = null;
      const store   = Platform.OS === "ios" ? "App Store" : "Google Play";
      const details = getPaymentFailureDetails(err, store);
      if (details) showError(details);
    }
  }, [selected, connected, showError]);

  // Derived values
  const selectedTier  = TIERS.find((t) => t.sku === selected) ?? TIERS[1];
  const selectedPrice = prices[selected] || selectedTier.amount;
  const isAndroid     = Platform.OS === "android";
  const storeLabel    = isAndroid ? "Google Play" : "App Store";
  const btnLabel      = `Send ${selectedPrice}`;

  return {
    TIERS,
    prices,
    loadingProducts,
    purchasing,
    selected,
    setSelected,
    lastError,
    setLastError,
    handleDonate,
    selectedTier,
    selectedPrice,
    storeLabel,
    btnLabel,
  };
}
