import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "@/lib/haptics";
import { LinearGradient } from "expo-linear-gradient";
import type { ParsedPaymentQr } from "@/lib/qr-analysis";

interface AppBrand {
  name: string;
  gradientStart: string;
  gradientEnd: string;
  accentColor: string;
  textOnCard: string;
  subtextOnCard: string;
  iconName: keyof typeof Ionicons.glyphMap;
  mcIcon?: string;
  chipColor: string;
}

function getAppBrand(appId: string, appCategory: string): AppBrand {
  switch (appId) {
    case "phonepe":
      return {
        name: "PhonePe",
        gradientStart: "#5F259F",
        gradientEnd: "#3B1263",
        accentColor: "#A259FF",
        textOnCard: "#FFFFFF",
        subtextOnCard: "rgba(255,255,255,0.7)",
        iconName: "phone-portrait-outline",
        chipColor: "#7B3FC7",
      };
    case "gpay_india":
      return {
        name: "Google Pay",
        gradientStart: "#1A73E8",
        gradientEnd: "#0D47A1",
        accentColor: "#4FC3F7",
        textOnCard: "#FFFFFF",
        subtextOnCard: "rgba(255,255,255,0.7)",
        iconName: "logo-google",
        chipColor: "#1565C0",
      };
    case "paytm":
      return {
        name: "Paytm",
        gradientStart: "#002B7F",
        gradientEnd: "#00144A",
        accentColor: "#00BCD4",
        textOnCard: "#FFFFFF",
        subtextOnCard: "rgba(255,255,255,0.7)",
        iconName: "wallet-outline",
        chipColor: "#00144A",
      };
    case "bhim":
      return {
        name: "BHIM",
        gradientStart: "#1A237E",
        gradientEnd: "#0D1540",
        accentColor: "#42A5F5",
        textOnCard: "#FFFFFF",
        subtextOnCard: "rgba(255,255,255,0.7)",
        iconName: "shield-checkmark-outline",
        chipColor: "#283593",
      };
    case "amazon_pay":
      return {
        name: "Amazon Pay",
        gradientStart: "#1B2535",
        gradientEnd: "#0F1925",
        accentColor: "#FF9900",
        textOnCard: "#FFFFFF",
        subtextOnCard: "rgba(255,255,255,0.65)",
        iconName: "cart-outline",
        chipColor: "#232F3E",
      };
    case "cred":
      return {
        name: "CRED",
        gradientStart: "#1B1B2F",
        gradientEnd: "#0D0D1A",
        accentColor: "#C9A96E",
        textOnCard: "#FFFFFF",
        subtextOnCard: "rgba(255,255,255,0.65)",
        iconName: "card-outline",
        chipColor: "#2A2A40",
      };
    case "yono_sbi":
      return {
        name: "YONO SBI",
        gradientStart: "#00509E",
        gradientEnd: "#003573",
        accentColor: "#64B5F6",
        textOnCard: "#FFFFFF",
        subtextOnCard: "rgba(255,255,255,0.7)",
        iconName: "business-outline",
        chipColor: "#00437E",
      };
    case "imobile_pay":
      return {
        name: "iMobile Pay",
        gradientStart: "#B71C1C",
        gradientEnd: "#7F0000",
        accentColor: "#EF9A9A",
        textOnCard: "#FFFFFF",
        subtextOnCard: "rgba(255,255,255,0.7)",
        iconName: "phone-portrait-outline",
        chipColor: "#C62828",
      };
    case "airtel_money":
      return {
        name: "Airtel Pay",
        gradientStart: "#C62828",
        gradientEnd: "#7F0000",
        accentColor: "#FF8A80",
        textOnCard: "#FFFFFF",
        subtextOnCard: "rgba(255,255,255,0.7)",
        iconName: "radio-outline",
        chipColor: "#B71C1C",
      };
    case "jiomoney":
      return {
        name: "JioMoney",
        gradientStart: "#1B6CA8",
        gradientEnd: "#0D3F6A",
        accentColor: "#4FC3F7",
        textOnCard: "#FFFFFF",
        subtextOnCard: "rgba(255,255,255,0.7)",
        iconName: "cellular-outline",
        chipColor: "#1565C0",
      };
    case "bajaj_pay":
      return {
        name: "Bajaj Pay",
        gradientStart: "#D84315",
        gradientEnd: "#8D2B0A",
        accentColor: "#FFAB91",
        textOnCard: "#FFFFFF",
        subtextOnCard: "rgba(255,255,255,0.7)",
        iconName: "flash-outline",
        chipColor: "#BF360C",
      };
    case "freecharge":
      return {
        name: "FreeCharge",
        gradientStart: "#00695C",
        gradientEnd: "#003D36",
        accentColor: "#80CBC4",
        textOnCard: "#FFFFFF",
        subtextOnCard: "rgba(255,255,255,0.7)",
        iconName: "flash-outline",
        chipColor: "#00574A",
      };
    case "mobikwik":
      return {
        name: "MobiKwik",
        gradientStart: "#1565C0",
        gradientEnd: "#0D3A7A",
        accentColor: "#82B1FF",
        textOnCard: "#FFFFFF",
        subtextOnCard: "rgba(255,255,255,0.7)",
        iconName: "phone-portrait-outline",
        chipColor: "#0D47A1",
      };
    case "razorpay":
      return {
        name: "Razorpay",
        gradientStart: "#072654",
        gradientEnd: "#020E20",
        accentColor: "#3195FF",
        textOnCard: "#FFFFFF",
        subtextOnCard: "rgba(255,255,255,0.65)",
        iconName: "flash-outline",
        chipColor: "#0B3D6E",
      };

    case "hdfc_bank":
      return {
        name: "HDFC Bank",
        gradientStart: "#003580",
        gradientEnd: "#001840",
        accentColor: "#4FC3F7",
        textOnCard: "#FFFFFF",
        subtextOnCard: "rgba(255,255,255,0.75)",
        iconName: "business-outline",
        chipColor: "#002563",
      };

    case "bharatpe":
      return {
        name: "BharatPe",
        gradientStart: "#0D47A1",
        gradientEnd: "#001970",
        accentColor: "#FFD740",
        textOnCard: "#FFFFFF",
        subtextOnCard: "rgba(255,255,255,0.72)",
        iconName: "storefront-outline",
        chipColor: "#0A3A8A",
      };

    case "axis_pay":
      return {
        name: "Axis Pay",
        gradientStart: "#6D0000",
        gradientEnd: "#3D0000",
        accentColor: "#FF8A80",
        textOnCard: "#FFFFFF",
        subtextOnCard: "rgba(255,255,255,0.72)",
        iconName: "card-outline",
        chipColor: "#5A0000",
      };

    case "kotak_pay":
      return {
        name: "Kotak Pay",
        gradientStart: "#B71C1C",
        gradientEnd: "#601010",
        accentColor: "#FF7043",
        textOnCard: "#FFFFFF",
        subtextOnCard: "rgba(255,255,255,0.72)",
        iconName: "card-outline",
        chipColor: "#941515",
      };

    case "bob_world":
      return {
        name: "BOB World Pay",
        gradientStart: "#004D40",
        gradientEnd: "#00251A",
        accentColor: "#80CBC4",
        textOnCard: "#FFFFFF",
        subtextOnCard: "rgba(255,255,255,0.72)",
        iconName: "business-outline",
        chipColor: "#003D33",
      };

    case "idfcfirst":
      return {
        name: "IDFC FIRST Bank",
        gradientStart: "#880E4F",
        gradientEnd: "#4A0526",
        accentColor: "#F48FB1",
        textOnCard: "#FFFFFF",
        subtextOnCard: "rgba(255,255,255,0.72)",
        iconName: "card-outline",
        chipColor: "#6A0B3D",
      };

    case "yes_pay":
      return {
        name: "Yes Pay",
        gradientStart: "#1A237E",
        gradientEnd: "#0D1450",
        accentColor: "#82B1FF",
        textOnCard: "#FFFFFF",
        subtextOnCard: "rgba(255,255,255,0.72)",
        iconName: "card-outline",
        chipColor: "#141B60",
      };

    case "fi_money":
      return {
        name: "Fi Money",
        gradientStart: "#1B5E20",
        gradientEnd: "#0A2E0D",
        accentColor: "#A5D6A7",
        textOnCard: "#FFFFFF",
        subtextOnCard: "rgba(255,255,255,0.72)",
        iconName: "leaf-outline",
        chipColor: "#154C19",
      };

    case "jupiter_money":
      return {
        name: "Jupiter Money",
        gradientStart: "#4A148C",
        gradientEnd: "#280A4E",
        accentColor: "#CE93D8",
        textOnCard: "#FFFFFF",
        subtextOnCard: "rgba(255,255,255,0.72)",
        iconName: "planet-outline",
        chipColor: "#3A1070",
      };

    case "groww_pay":
      return {
        name: "Groww Pay",
        gradientStart: "#00695C",
        gradientEnd: "#00352E",
        accentColor: "#80CBC4",
        textOnCard: "#FFFFFF",
        subtextOnCard: "rgba(255,255,255,0.72)",
        iconName: "trending-up-outline",
        chipColor: "#005045",
      };

    case "bharatqr":
      return {
        name: "BharatQR (NPCI)",
        gradientStart: "#1A237E",
        gradientEnd: "#0D1450",
        accentColor: "#FF6F00",
        textOnCard: "#FFFFFF",
        subtextOnCard: "rgba(255,255,255,0.72)",
        iconName: "qr-code-outline",
        chipColor: "#141B60",
      };

    case "navi":
      return {
        name: "Navi",
        gradientStart: "#0D47A1",
        gradientEnd: "#061C45",
        accentColor: "#64B5F6",
        textOnCard: "#FFFFFF",
        subtextOnCard: "rgba(255,255,255,0.72)",
        iconName: "navigate-outline",
        chipColor: "#0A3A80",
      };

    case "pockets_icici":
      return {
        name: "Pockets (ICICI)",
        gradientStart: "#B71C1C",
        gradientEnd: "#601010",
        accentColor: "#EF9A9A",
        textOnCard: "#FFFFFF",
        subtextOnCard: "rgba(255,255,255,0.72)",
        iconName: "wallet-outline",
        chipColor: "#941515",
      };

    case "canara_bank":
      return {
        name: "Canara ai1",
        gradientStart: "#E65100",
        gradientEnd: "#7A2D00",
        accentColor: "#FFCC80",
        textOnCard: "#FFFFFF",
        subtextOnCard: "rgba(255,255,255,0.72)",
        iconName: "business-outline",
        chipColor: "#BF4400",
      };

    case "union_bank":
      return {
        name: "Vyom (Union Bank)",
        gradientStart: "#004D7A",
        gradientEnd: "#002540",
        accentColor: "#81D4FA",
        textOnCard: "#FFFFFF",
        subtextOnCard: "rgba(255,255,255,0.72)",
        iconName: "business-outline",
        chipColor: "#003D60",
      };

    case "rbl_bank":
      return {
        name: "RBL MoBank",
        gradientStart: "#4A148C",
        gradientEnd: "#200748",
        accentColor: "#CE93D8",
        textOnCard: "#FFFFFF",
        subtextOnCard: "rgba(255,255,255,0.72)",
        iconName: "card-outline",
        chipColor: "#37106D",
      };

    case "pnb_one":
      return {
        name: "PNB ONE",
        gradientStart: "#1A237E",
        gradientEnd: "#0D1450",
        accentColor: "#FF8F00",
        textOnCard: "#FFFFFF",
        subtextOnCard: "rgba(255,255,255,0.72)",
        iconName: "business-outline",
        chipColor: "#141B60",
      };

    case "indus_pay":
      return {
        name: "IndusPay",
        gradientStart: "#004D40",
        gradientEnd: "#001F1A",
        accentColor: "#80CBC4",
        textOnCard: "#FFFFFF",
        subtextOnCard: "rgba(255,255,255,0.72)",
        iconName: "card-outline",
        chipColor: "#003D33",
      };

    case "superapp":
      return {
        name: "SuperApp",
        gradientStart: "#212121",
        gradientEnd: "#0A0A0A",
        accentColor: "#FF6D00",
        textOnCard: "#FFFFFF",
        subtextOnCard: "rgba(255,255,255,0.65)",
        iconName: "apps-outline",
        chipColor: "#1A1A1A",
      };

    case "indpay":
      return {
        name: "IndPay (Indian Bank)",
        gradientStart: "#1A237E",
        gradientEnd: "#0D1450",
        accentColor: "#64B5F6",
        textOnCard: "#FFFFFF",
        subtextOnCard: "rgba(255,255,255,0.72)",
        iconName: "business-outline",
        chipColor: "#141B60",
      };

    // Crypto cases
    case "bitcoin":
      return {
        name: "Bitcoin (BTC)",
        gradientStart: "#F57C00",
        gradientEnd: "#7A3E00",
        accentColor: "#FFD54F",
        textOnCard: "#FFFFFF",
        subtextOnCard: "rgba(255,255,255,0.72)",
        iconName: "logo-bitcoin",
        chipColor: "#BF6200",
      };
    case "ethereum":
      return {
        name: "Ethereum (ETH)",
        gradientStart: "#3D3D8F",
        gradientEnd: "#1A1A4A",
        accentColor: "#B0BEC5",
        textOnCard: "#FFFFFF",
        subtextOnCard: "rgba(255,255,255,0.72)",
        iconName: "logo-bitcoin",
        chipColor: "#2E2E70",
      };
    case "litecoin": case "bitcoin_cash": case "dogecoin": case "bnb":
    case "solana": case "xrp": case "tron": case "monero": {
      const cryptoNames: Record<string, string> = {
        litecoin: "Litecoin (LTC)", bitcoin_cash: "Bitcoin Cash (BCH)",
        dogecoin: "Dogecoin (DOGE)", bnb: "BNB Chain",
        solana: "Solana (SOL)", xrp: "XRP Ledger",
        tron: "TRON (TRX)", monero: "Monero (XMR)",
      };
      return {
        name: cryptoNames[appId] || "Crypto Wallet",
        gradientStart: "#1B2535",
        gradientEnd: "#0A0F1A",
        accentColor: "#FFD740",
        textOnCard: "#FFFFFF",
        subtextOnCard: "rgba(255,255,255,0.65)",
        iconName: "logo-bitcoin",
        chipColor: "#141C2A",
      };
    }

    case "emv_generic":
      return {
        name: "Bank Merchant QR",
        gradientStart: "#1B3A5C",
        gradientEnd: "#0A1E33",
        accentColor: "#FF9800",
        textOnCard: "#FFFFFF",
        subtextOnCard: "rgba(255,255,255,0.72)",
        iconName: "business-outline",
        chipColor: "#152F4A",
      };

    default:
      if (appCategory === "upi_india" || appCategory === "india_wallet") {
        return {
          name: "UPI Payment",
          gradientStart: "#22409A",
          gradientEnd: "#111E4A",
          accentColor: "#64B5F6",
          textOnCard: "#FFFFFF",
          subtextOnCard: "rgba(255,255,255,0.7)",
          iconName: "card-outline",
          chipColor: "#1A2E7A",
        };
      }
      if (appCategory === "emv") {
        return {
          name: "Bank Merchant QR",
          gradientStart: "#1B3A5C",
          gradientEnd: "#0A1E33",
          accentColor: "#FF9800",
          textOnCard: "#FFFFFF",
          subtextOnCard: "rgba(255,255,255,0.72)",
          iconName: "business-outline",
          chipColor: "#152F4A",
        };
      }
      return {
        name: "Payment",
        gradientStart: "#1A2438",
        gradientEnd: "#0A0E17",
        accentColor: "#00D4FF",
        textOnCard: "#FFFFFF",
        subtextOnCard: "rgba(255,255,255,0.65)",
        iconName: "card-outline",
        chipColor: "#263348",
      };
  }
}

function formatAmount(amount: string, currency?: string): string {
  const num = parseFloat(amount);
  if (isNaN(num)) return amount;
  if (!currency || currency === "INR") {
    return `₹${num.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  }
  if (currency === "USD") return `$${num.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  if (currency === "EUR") return `€${num.toLocaleString("de-DE", { maximumFractionDigits: 2 })}`;
  return `${num} ${currency}`;
}

function getBankFullName(handle?: string): string | null {
  if (!handle) return null;
  const map: Record<string, string> = {
    "oksbi": "State Bank of India",
    "okaxis": "Axis Bank",
    "okhdfcbank": "HDFC Bank",
    "okicici": "ICICI Bank",
    "ybl": "Yes Bank (PhonePe)",
    "ibl": "IndusInd Bank",
    "paytm": "Paytm Payments Bank",
    "axl": "Axis Bank",
    "hdfcbank": "HDFC Bank",
    "icici": "ICICI Bank",
    "sbi": "State Bank of India",
    "kotak": "Kotak Mahindra Bank",
    "pnb": "Punjab National Bank",
    "bob": "Bank of Baroda",
    "cnrb": "Canara Bank",
    "federal": "Federal Bank",
    "idbi": "IDBI Bank",
    "rbl": "RBL Bank",
    "indus": "IndusInd Bank",
    "airtel": "Airtel Payments Bank",
    "jio": "Jio Payments Bank",
    "barodampay": "Bank of Baroda",
    "mahb": "Bank of Maharashtra",
    "centralbank": "Central Bank of India",
    "uco": "UCO Bank",
    "idfcbank": "IDFC First Bank",
    "aubank": "AU Small Finance Bank",
    "fbl": "Federal Bank",
    "superyes": "Yes Bank",
    "abfspay": "Aditya Birla Finance",
    "sliceaxis": "Slice (Axis Bank)",
    "naviaxis": "Navi (Axis Bank)",
    "timecosmos": "Fino Payments Bank",
    "postbank": "India Post Payments Bank",
    "kmbl": "Kotak Mahindra Bank",
    "idfcfirst": "IDFC FIRST Bank",
    "payzapp": "HDFC Bank (PayZapp)",
    "hdfcbankjd": "HDFC Bank",
    "icicibank": "ICICI Bank",
    "tapicici": "ICICI Bank",
    "yesbank": "Yes Bank",
    "yesbankltd": "Yes Bank",
    "groww": "Groww (IDFC FIRST Bank)",
    "navi": "Navi (Equitas SFB)",
    "freecharge": "FreeCharge (Axis Bank)",
    "mobikwik": "MobiKwik",
    "cred": "CRED (Federal Bank)",
    "amazonpay": "Amazon Pay (Axis Bank)",
    "apl": "Amazon Pay ICICI",
    "juspay": "JusPay",
    "razorpay": "Razorpay (RBL Bank)",
    "bajajpay": "Bajaj Finance",
    "airtelpe": "Airtel Payments Bank",
    "bhim": "BHIM (NPCI)",
    "uboi": "Union Bank of India",
    "ucobank": "UCO Bank",
    "jupiterpay": "Jupiter Money (Federal Bank)",
    "upi": "NPCI UPI Network",
  };
  const lower = handle.toLowerCase();
  return map[lower] ?? null;
}

interface Props {
  parsedPayment: ParsedPaymentQr;
  isDeactivated: boolean;
  onOpenContent: () => void;
}

const PaymentCard = React.memo(function PaymentCard({
  parsedPayment,
  isDeactivated,
  onOpenContent,
}: Props) {
  const [upiCopied, setUpiCopied] = React.useState(false);
  const brand = getAppBrand(parsedPayment.app, parsedPayment.appCategory);
  const bankFullName = getBankFullName(parsedPayment.bankHandle);
  const isIndia = parsedPayment.appCategory === "upi_india" || parsedPayment.appCategory === "india_wallet";

  // Use vpa if set, otherwise fall back to recipientId if it looks like a VPA (contains @)
  const displayVpa = parsedPayment.vpa ||
    (parsedPayment.recipientId?.includes("@") ? parsedPayment.recipientId : undefined);

  // Also derive bankHandle from displayVpa if not set
  const effectiveBankHandle = parsedPayment.bankHandle ||
    (displayVpa?.includes("@") ? displayVpa.split("@")[1] : undefined);
  const effectiveBankName = getBankFullName(effectiveBankHandle);

  async function handleCopyUpi() {
    if (!displayVpa) return;
    await Clipboard.setStringAsync(displayVpa);
    if (Platform.OS !== "android") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setUpiCopied(true);
    setTimeout(() => setUpiCopied(false), 2000);
  }

  return (
    <View style={styles.wrapper}>
      {/* ── Floating Payment Card ── */}
      <LinearGradient
        colors={[brand.gradientStart, brand.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Decorative circles for card feel */}
        <View style={[styles.decCircleLarge, { backgroundColor: brand.chipColor }]} />
        <View style={[styles.decCircleSmall, { backgroundColor: brand.chipColor }]} />

        {/* Card top row: app name + shield */}
        <View style={styles.cardTopRow}>
          <View style={styles.appNameRow}>
            <View style={[styles.appIconBubble, { backgroundColor: brand.chipColor }]}>
              <Ionicons name={brand.iconName} size={15} color={brand.accentColor} />
            </View>
            <Text style={[styles.appNameText, { color: brand.subtextOnCard }]}>
              {parsedPayment.appDisplayName}
            </Text>
            {isIndia && (
              <View style={styles.indiaBadge}>
                <Text style={styles.indiaBadgeText}>🇮🇳 UPI</Text>
              </View>
            )}
          </View>
          <View style={styles.shieldBadge}>
            <Ionicons name="shield-checkmark" size={13} color="#4ADE80" />
            <Text style={styles.shieldText}>QRS</Text>
          </View>
        </View>

        {/* Merchant Name — large & bold */}
        <Text style={[styles.merchantName, { color: brand.textOnCard }]} numberOfLines={2}>
          {parsedPayment.recipientName || "Unknown Merchant"}
        </Text>

        {/* UPI ID — small, selectable */}
        {displayVpa ? (
          <Pressable onPress={handleCopyUpi} style={styles.upiRow}>
            <Ionicons name="at-circle-outline" size={14} color={brand.accentColor} />
            <Text style={[styles.upiId, { color: brand.subtextOnCard }]} selectable numberOfLines={1}>
              {displayVpa}
            </Text>
            <Ionicons
              name={upiCopied ? "checkmark-circle" : "copy-outline"}
              size={13}
              color={upiCopied ? "#4ADE80" : brand.accentColor}
            />
          </Pressable>
        ) : null}

        {/* Bank name */}
        {effectiveBankName ? (
          <View style={styles.bankRow}>
            <Ionicons name="business-outline" size={12} color={brand.accentColor} />
            <Text style={[styles.bankName, { color: brand.subtextOnCard }]}>{effectiveBankName}</Text>
          </View>
        ) : parsedPayment.bankHandle ? (
          <View style={styles.bankRow}>
            <Ionicons name="business-outline" size={12} color={brand.accentColor} />
            <Text style={[styles.bankName, { color: brand.subtextOnCard }]}>@{parsedPayment.bankHandle}</Text>
          </View>
        ) : null}

        {/* Amount if pre-filled */}
        {parsedPayment.isAmountPreFilled && parsedPayment.amount ? (
          <View style={[styles.amountChip, { backgroundColor: brand.chipColor, borderColor: brand.accentColor + "50" }]}>
            <Ionicons name="cash-outline" size={14} color="#FCD34D" />
            <Text style={styles.amountText}>
              {formatAmount(parsedPayment.amount, parsedPayment.currency)}
            </Text>
            <Text style={[styles.amountLabel, { color: brand.subtextOnCard }]}>Pre-filled Amount</Text>
          </View>
        ) : null}

        {/* Note */}
        {parsedPayment.note ? (
          <View style={styles.noteRow}>
            <Ionicons name="document-text-outline" size={12} color={brand.accentColor} />
            <Text style={[styles.noteText, { color: brand.subtextOnCard }]} numberOfLines={2}>
              {parsedPayment.note}
            </Text>
          </View>
        ) : null}

        {/* Indian bank account fields — account number, IFSC, bank name */}
        {parsedPayment.extraFields?.accountNumber ? (
          <View style={styles.extraFieldsBlock}>
            <View style={styles.extraFieldRow}>
              <Ionicons name="card-outline" size={12} color={brand.accentColor} />
              <Text style={[styles.extraFieldLabel, { color: brand.subtextOnCard }]}>Account</Text>
              <Text style={[styles.extraFieldValue, { color: brand.textOnCard }]} selectable>
                {`••••${parsedPayment.extraFields.accountNumber.slice(-4)}`}
              </Text>
            </View>
            {parsedPayment.extraFields.ifsc ? (
              <View style={styles.extraFieldRow}>
                <Ionicons name="code-outline" size={12} color={brand.accentColor} />
                <Text style={[styles.extraFieldLabel, { color: brand.subtextOnCard }]}>IFSC</Text>
                <Text style={[styles.extraFieldValue, { color: brand.textOnCard }]} selectable>
                  {parsedPayment.extraFields.ifsc}
                </Text>
              </View>
            ) : null}
            {parsedPayment.extraFields.bankName ? (
              <View style={styles.extraFieldRow}>
                <Ionicons name="business-outline" size={12} color={brand.accentColor} />
                <Text style={[styles.extraFieldLabel, { color: brand.subtextOnCard }]}>Bank</Text>
                <Text style={[styles.extraFieldValue, { color: brand.textOnCard }]} numberOfLines={1}>
                  {parsedPayment.extraFields.bankName}
                </Text>
              </View>
            ) : null}
            {parsedPayment.extraFields.accountType ? (
              <View style={styles.extraFieldRow}>
                <Ionicons name="file-tray-outline" size={12} color={brand.accentColor} />
                <Text style={[styles.extraFieldLabel, { color: brand.subtextOnCard }]}>Type</Text>
                <Text style={[styles.extraFieldValue, { color: brand.textOnCard }]}>
                  {parsedPayment.extraFields.accountType}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* BharatQR / EMV extra info — merchant city, bill number, reference */}
        {parsedPayment.isEmv && parsedPayment.extraFields && !parsedPayment.extraFields.accountNumber ? (
          <View style={styles.extraFieldsBlock}>
            {parsedPayment.extraFields.ifsc ? (
              <View style={styles.extraFieldRow}>
                <Ionicons name="code-outline" size={12} color={brand.accentColor} />
                <Text style={[styles.extraFieldLabel, { color: brand.subtextOnCard }]}>IFSC</Text>
                <Text style={[styles.extraFieldValue, { color: brand.textOnCard }]} selectable>
                  {parsedPayment.extraFields.ifsc}
                </Text>
              </View>
            ) : null}
            {parsedPayment.extraFields.billNumber ? (
              <View style={styles.extraFieldRow}>
                <Ionicons name="receipt-outline" size={12} color={brand.accentColor} />
                <Text style={[styles.extraFieldLabel, { color: brand.subtextOnCard }]}>Bill No.</Text>
                <Text style={[styles.extraFieldValue, { color: brand.textOnCard }]} selectable>
                  {parsedPayment.extraFields.billNumber}
                </Text>
              </View>
            ) : null}
            {parsedPayment.extraFields.referenceLabel ? (
              <View style={styles.extraFieldRow}>
                <Ionicons name="bookmark-outline" size={12} color={brand.accentColor} />
                <Text style={[styles.extraFieldLabel, { color: brand.subtextOnCard }]}>Ref</Text>
                <Text style={[styles.extraFieldValue, { color: brand.textOnCard }]} selectable>
                  {parsedPayment.extraFields.referenceLabel}
                </Text>
              </View>
            ) : null}
            {parsedPayment.extraFields.mcc ? (
              <View style={styles.extraFieldRow}>
                <Ionicons name="pricetag-outline" size={12} color={brand.accentColor} />
                <Text style={[styles.extraFieldLabel, { color: brand.subtextOnCard }]}>MCC</Text>
                <Text style={[styles.extraFieldValue, { color: brand.textOnCard }]}>
                  {parsedPayment.extraFields.mcc}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* BBPS bill info */}
        {parsedPayment.extraFields?.billerId && !parsedPayment.isEmv && !parsedPayment.extraFields?.accountNumber ? (
          <View style={styles.extraFieldsBlock}>
            <View style={styles.extraFieldRow}>
              <Ionicons name="business-outline" size={12} color={brand.accentColor} />
              <Text style={[styles.extraFieldLabel, { color: brand.subtextOnCard }]}>Biller</Text>
              <Text style={[styles.extraFieldValue, { color: brand.textOnCard }]} numberOfLines={1} selectable>
                {parsedPayment.extraFields.billerId}
              </Text>
            </View>
            {parsedPayment.extraFields.category ? (
              <View style={styles.extraFieldRow}>
                <Ionicons name="list-outline" size={12} color={brand.accentColor} />
                <Text style={[styles.extraFieldLabel, { color: brand.subtextOnCard }]}>Category</Text>
                <Text style={[styles.extraFieldValue, { color: brand.textOnCard }]}>
                  {parsedPayment.extraFields.category}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Bottom divider line (card chip feel) */}
        <View style={[styles.cardChipLine, { backgroundColor: brand.accentColor + "30" }]} />

        {/* Verified row */}
        <View style={styles.cardBottomRow}>
          <View style={styles.verifiedRow}>
            <View style={styles.verifiedDot} />
            <Text style={[styles.verifiedText, { color: brand.subtextOnCard }]}>
              Scanned & Analysed by QR Guard
            </Text>
          </View>
          <Text style={[styles.regionText, { color: brand.accentColor }]}>
            {parsedPayment.region}
          </Text>
        </View>
      </LinearGradient>

      {/* ── Action Buttons ── */}
      {!isDeactivated && (
        <View style={styles.actionArea}>
          <Pressable
            onPress={onOpenContent}
            style={({ pressed }) => [styles.payBtn, { opacity: pressed ? 0.85 : 1 }]}
          >
            <LinearGradient
              colors={[brand.gradientStart, brand.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.payBtnGradient}
            >
              <Ionicons name={brand.iconName} size={18} color="#FFF" />
              <Text style={styles.payBtnText}>
                {parsedPayment.appCategory === "crypto"
                  ? "Open Wallet"
                  : parsedPayment.isEmv && parsedPayment.vpa
                  ? "Pay with UPI App"
                  : parsedPayment.isEmv && parsedPayment.extraFields?.accountNumber
                  ? "Transfer via Bank App"
                  : parsedPayment.isEmv
                  ? "Open in UPI App"
                  : `Pay via ${parsedPayment.appDisplayName}`}
              </Text>
              <Ionicons name="arrow-forward" size={16} color="#FFF" />
            </LinearGradient>
          </Pressable>

          <View style={styles.warningBox}>
            <Ionicons name="information-circle-outline" size={14} color="#94A3B8" />
            <Text style={styles.warningText}>
              {parsedPayment.appCategory === "crypto"
                ? "Crypto is irreversible — verify address character by character"
                : isIndia
                ? "Always verify the Merchant Name and UPI ID before paying"
                : "Always verify the recipient before sending money"}
            </Text>
          </View>
        </View>
      )}

      {isDeactivated && (
        <View style={styles.deactivatedBanner}>
          <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
          <Text style={styles.deactivatedText}>This payment QR has been deactivated</Text>
        </View>
      )}
    </View>
  );
});

export default PaymentCard;

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },

  card: {
    borderRadius: 20,
    padding: 22,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
    marginBottom: 14,
    position: "relative",
  },

  decCircleLarge: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    top: -60,
    right: -60,
    opacity: 0.4,
  },
  decCircleSmall: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    bottom: -30,
    left: -20,
    opacity: 0.3,
  },

  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  appNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  appIconBubble: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  appNameText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },
  indiaBadge: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  indiaBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "#FFF",
  },
  shieldBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(74, 222, 128, 0.15)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "rgba(74, 222, 128, 0.3)",
  },
  shieldText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#4ADE80",
    letterSpacing: 0.5,
  },

  merchantName: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
    lineHeight: 32,
    marginBottom: 10,
  },

  upiRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  upiId: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
    letterSpacing: 0.2,
  },

  bankRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  bankName: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },

  amountChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
    marginBottom: 4,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  amountText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#FCD34D",
  },
  amountLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },

  noteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 8,
  },
  noteText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 17,
  },

  cardChipLine: {
    height: 1,
    borderRadius: 1,
    marginVertical: 14,
  },

  cardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  verifiedDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#4ADE80",
  },
  verifiedText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  regionText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },

  actionArea: {
    gap: 10,
  },
  payBtn: {
    borderRadius: 14,
    overflow: "hidden",
  },
  payBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  payBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    flex: 1,
    textAlign: "center",
  },

  warningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    backgroundColor: "rgba(148, 163, 184, 0.08)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.12)",
  },
  warningText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#94A3B8",
    flex: 1,
    lineHeight: 18,
  },

  deactivatedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.25)",
  },
  deactivatedText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#EF4444",
    flex: 1,
  },

  extraFieldsBlock: {
    marginTop: 10,
    marginBottom: 2,
    gap: 5,
  },
  extraFieldRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  extraFieldLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    minWidth: 52,
    letterSpacing: 0.2,
  },
  extraFieldValue: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
    letterSpacing: 0.1,
  },
});
