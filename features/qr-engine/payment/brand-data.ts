import { Ionicons } from "@expo/vector-icons";

export interface AppBrand {
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

export function getAppBrand(appId: string, appCategory: string): AppBrand {
  switch (appId) {
    case "phonepe":
      return { name: "PhonePe", gradientStart: "#5F259F", gradientEnd: "#3B1263", accentColor: "#A259FF", textOnCard: "#FFFFFF", subtextOnCard: "rgba(255,255,255,0.7)", iconName: "phone-portrait-outline", chipColor: "#7B3FC7" };
    case "gpay_india":
      return { name: "Google Pay", gradientStart: "#1A73E8", gradientEnd: "#0D47A1", accentColor: "#4FC3F7", textOnCard: "#FFFFFF", subtextOnCard: "rgba(255,255,255,0.7)", iconName: "logo-google", chipColor: "#1565C0" };
    case "paytm":
      return { name: "Paytm", gradientStart: "#002B7F", gradientEnd: "#00144A", accentColor: "#00BCD4", textOnCard: "#FFFFFF", subtextOnCard: "rgba(255,255,255,0.7)", iconName: "wallet-outline", chipColor: "#00144A" };
    case "bhim":
      return { name: "BHIM", gradientStart: "#1A237E", gradientEnd: "#0D1540", accentColor: "#42A5F5", textOnCard: "#FFFFFF", subtextOnCard: "rgba(255,255,255,0.7)", iconName: "shield-checkmark-outline", chipColor: "#283593" };
    case "amazon_pay":
      return { name: "Amazon Pay", gradientStart: "#1B2535", gradientEnd: "#0F1925", accentColor: "#FF9900", textOnCard: "#FFFFFF", subtextOnCard: "rgba(255,255,255,0.65)", iconName: "cart-outline", chipColor: "#232F3E" };
    case "cred":
      return { name: "CRED", gradientStart: "#1B1B2F", gradientEnd: "#0D0D1A", accentColor: "#C9A96E", textOnCard: "#FFFFFF", subtextOnCard: "rgba(255,255,255,0.65)", iconName: "card-outline", chipColor: "#2A2A40" };
    case "yono_sbi":
      return { name: "YONO SBI", gradientStart: "#00509E", gradientEnd: "#003573", accentColor: "#64B5F6", textOnCard: "#FFFFFF", subtextOnCard: "rgba(255,255,255,0.7)", iconName: "business-outline", chipColor: "#00437E" };
    case "imobile_pay":
      return { name: "iMobile Pay", gradientStart: "#B71C1C", gradientEnd: "#7F0000", accentColor: "#EF9A9A", textOnCard: "#FFFFFF", subtextOnCard: "rgba(255,255,255,0.7)", iconName: "phone-portrait-outline", chipColor: "#C62828" };
    case "airtel_money":
      return { name: "Airtel Pay", gradientStart: "#C62828", gradientEnd: "#7F0000", accentColor: "#FF8A80", textOnCard: "#FFFFFF", subtextOnCard: "rgba(255,255,255,0.7)", iconName: "radio-outline", chipColor: "#B71C1C" };
    case "jiomoney":
      return { name: "JioMoney", gradientStart: "#1B6CA8", gradientEnd: "#0D3F6A", accentColor: "#4FC3F7", textOnCard: "#FFFFFF", subtextOnCard: "rgba(255,255,255,0.7)", iconName: "cellular-outline", chipColor: "#1565C0" };
    case "bajaj_pay":
      return { name: "Bajaj Pay", gradientStart: "#D84315", gradientEnd: "#8D2B0A", accentColor: "#FFAB91", textOnCard: "#FFFFFF", subtextOnCard: "rgba(255,255,255,0.7)", iconName: "flash-outline", chipColor: "#BF360C" };
    case "freecharge":
      return { name: "FreeCharge", gradientStart: "#00695C", gradientEnd: "#003D36", accentColor: "#80CBC4", textOnCard: "#FFFFFF", subtextOnCard: "rgba(255,255,255,0.7)", iconName: "flash-outline", chipColor: "#00574A" };
    case "mobikwik":
      return { name: "MobiKwik", gradientStart: "#1565C0", gradientEnd: "#0D3A7A", accentColor: "#82B1FF", textOnCard: "#FFFFFF", subtextOnCard: "rgba(255,255,255,0.7)", iconName: "phone-portrait-outline", chipColor: "#0D47A1" };
    case "razorpay":
      return { name: "Razorpay", gradientStart: "#072654", gradientEnd: "#020E20", accentColor: "#3195FF", textOnCard: "#FFFFFF", subtextOnCard: "rgba(255,255,255,0.65)", iconName: "flash-outline", chipColor: "#0B3D6E" };
    case "hdfc_bank":
      return { name: "HDFC Bank", gradientStart: "#003580", gradientEnd: "#001840", accentColor: "#4FC3F7", textOnCard: "#FFFFFF", subtextOnCard: "rgba(255,255,255,0.75)", iconName: "business-outline", chipColor: "#002563" };
    case "bharatpe":
      return { name: "BharatPe", gradientStart: "#0D47A1", gradientEnd: "#001970", accentColor: "#FFD740", textOnCard: "#FFFFFF", subtextOnCard: "rgba(255,255,255,0.72)", iconName: "storefront-outline", chipColor: "#0A3A8A" };
    case "axis_pay":
      return { name: "Axis Pay", gradientStart: "#6D0000", gradientEnd: "#3D0000", accentColor: "#FF8A80", textOnCard: "#FFFFFF", subtextOnCard: "rgba(255,255,255,0.72)", iconName: "card-outline", chipColor: "#5A0000" };
    case "kotak_pay":
      return { name: "Kotak Pay", gradientStart: "#B71C1C", gradientEnd: "#601010", accentColor: "#FF7043", textOnCard: "#FFFFFF", subtextOnCard: "rgba(255,255,255,0.72)", iconName: "card-outline", chipColor: "#941515" };
    case "bob_world":
      return { name: "BOB World Pay", gradientStart: "#004D40", gradientEnd: "#00251A", accentColor: "#80CBC4", textOnCard: "#FFFFFF", subtextOnCard: "rgba(255,255,255,0.72)", iconName: "business-outline", chipColor: "#003D33" };
    case "idfcfirst":
      return { name: "IDFC FIRST Bank", gradientStart: "#880E4F", gradientEnd: "#4A0526", accentColor: "#F48FB1", textOnCard: "#FFFFFF", subtextOnCard: "rgba(255,255,255,0.72)", iconName: "card-outline", chipColor: "#6A0B3D" };
    case "yes_pay":
      return { name: "Yes Pay", gradientStart: "#1A237E", gradientEnd: "#0D1450", accentColor: "#82B1FF", textOnCard: "#FFFFFF", subtextOnCard: "rgba(255,255,255,0.72)", iconName: "card-outline", chipColor: "#141B60" };
    case "fi_money":
      return { name: "Fi Money", gradientStart: "#1B5E20", gradientEnd: "#0A2E0D", accentColor: "#A5D6A7", textOnCard: "#FFFFFF", subtextOnCard: "rgba(255,255,255,0.72)", iconName: "leaf-outline", chipColor: "#154C19" };
    case "jupiter_money":
      return { name: "Jupiter Money", gradientStart: "#4A148C", gradientEnd: "#280A4E", accentColor: "#CE93D8", textOnCard: "#FFFFFF", subtextOnCard: "rgba(255,255,255,0.72)", iconName: "planet-outline", chipColor: "#3A1070" };
    case "groww_pay":
      return { name: "Groww Pay", gradientStart: "#00695C", gradientEnd: "#00352E", accentColor: "#80CBC4", textOnCard: "#FFFFFF", subtextOnCard: "rgba(255,255,255,0.72)", iconName: "trending-up-outline", chipColor: "#005045" };
    case "bharatqr":
      return { name: "BharatQR (NPCI)", gradientStart: "#1A237E", gradientEnd: "#0D1450", accentColor: "#FF6F00", textOnCard: "#FFFFFF", subtextOnCard: "rgba(255,255,255,0.72)", iconName: "qr-code-outline", chipColor: "#141B60" };
    case "navi":
      return { name: "Navi", gradientStart: "#0D47A1", gradientEnd: "#061C45", accentColor: "#64B5F6", textOnCard: "#FFFFFF", subtextOnCard: "rgba(255,255,255,0.72)", iconName: "navigate-outline", chipColor: "#0A3A80" };
    case "pockets_icici":
      return { name: "Pockets (ICICI)", gradientStart: "#B71C1C", gradientEnd: "#601010", accentColor: "#EF9A9A", textOnCard: "#FFFFFF", subtextOnCard: "rgba(255,255,255,0.72)", iconName: "wallet-outline", chipColor: "#941515" };
    case "canara_bank":
      return { name: "Canara ai1", gradientStart: "#E65100", gradientEnd: "#7A2D00", accentColor: "#FFCC80", textOnCard: "#FFFFFF", subtextOnCard: "rgba(255,255,255,0.72)", iconName: "business-outline", chipColor: "#BF4400" };
    case "union_bank":
      return { name: "Vyom (Union Bank)", gradientStart: "#004D7A", gradientEnd: "#002540", accentColor: "#81D4FA", textOnCard: "#FFFFFF", subtextOnCard: "rgba(255,255,255,0.72)", iconName: "business-outline", chipColor: "#003D60" };
    case "rbl_bank":
      return { name: "RBL MoBank", gradientStart: "#4A148C", gradientEnd: "#200748", accentColor: "#CE93D8", textOnCard: "#FFFFFF", subtextOnCard: "rgba(255,255,255,0.72)", iconName: "card-outline", chipColor: "#37106D" };
    case "pnb_one":
      return { name: "PNB ONE", gradientStart: "#1A237E", gradientEnd: "#0D1450", accentColor: "#FF8F00", textOnCard: "#FFFFFF", subtextOnCard: "rgba(255,255,255,0.72)", iconName: "business-outline", chipColor: "#141B60" };
    case "indus_pay":
      return { name: "IndusPay", gradientStart: "#004D40", gradientEnd: "#001F1A", accentColor: "#80CBC4", textOnCard: "#FFFFFF", subtextOnCard: "rgba(255,255,255,0.72)", iconName: "card-outline", chipColor: "#003D33" };
    case "superapp":
      return { name: "SuperApp", gradientStart: "#212121", gradientEnd: "#0A0A0A", accentColor: "#FF6D00", textOnCard: "#FFFFFF", subtextOnCard: "rgba(255,255,255,0.65)", iconName: "apps-outline", chipColor: "#1A1A1A" };
    case "indpay":
      return { name: "IndPay (Indian Bank)", gradientStart: "#1A237E", gradientEnd: "#0D1450", accentColor: "#64B5F6", textOnCard: "#FFFFFF", subtextOnCard: "rgba(255,255,255,0.72)", iconName: "business-outline", chipColor: "#141B60" };
    case "bitcoin":
      return { name: "Bitcoin (BTC)", gradientStart: "#F57C00", gradientEnd: "#7A3E00", accentColor: "#FFD54F", textOnCard: "#FFFFFF", subtextOnCard: "rgba(255,255,255,0.72)", iconName: "logo-bitcoin", chipColor: "#BF6200" };
    case "ethereum":
      return { name: "Ethereum (ETH)", gradientStart: "#3D3D8F", gradientEnd: "#1A1A4A", accentColor: "#B0BEC5", textOnCard: "#FFFFFF", subtextOnCard: "rgba(255,255,255,0.72)", iconName: "logo-bitcoin", chipColor: "#2E2E70" };
    case "litecoin": case "bitcoin_cash": case "dogecoin": case "bnb":
    case "solana": case "xrp": case "tron": case "monero": {
      const cryptoNames: Record<string, string> = {
        litecoin: "Litecoin (LTC)", bitcoin_cash: "Bitcoin Cash (BCH)",
        dogecoin: "Dogecoin (DOGE)", bnb: "BNB Chain",
        solana: "Solana (SOL)", xrp: "XRP Ledger",
        tron: "TRON (TRX)", monero: "Monero (XMR)",
      };
      return { name: cryptoNames[appId] || "Crypto Wallet", gradientStart: "#1B2535", gradientEnd: "#0A0F1A", accentColor: "#FFD740", textOnCard: "#FFFFFF", subtextOnCard: "rgba(255,255,255,0.65)", iconName: "logo-bitcoin", chipColor: "#141C2A" };
    }
    case "emv_generic":
      return { name: "Bank Merchant QR", gradientStart: "#1B3A5C", gradientEnd: "#0A1E33", accentColor: "#FF9800", textOnCard: "#FFFFFF", subtextOnCard: "rgba(255,255,255,0.72)", iconName: "business-outline", chipColor: "#152F4A" };
    default:
      if (appCategory === "upi_india" || appCategory === "india_wallet") {
        return { name: "UPI Payment", gradientStart: "#22409A", gradientEnd: "#111E4A", accentColor: "#64B5F6", textOnCard: "#FFFFFF", subtextOnCard: "rgba(255,255,255,0.7)", iconName: "card-outline", chipColor: "#1A2E7A" };
      }
      if (appCategory === "emv") {
        return { name: "Bank Merchant QR", gradientStart: "#1B3A5C", gradientEnd: "#0A1E33", accentColor: "#FF9800", textOnCard: "#FFFFFF", subtextOnCard: "rgba(255,255,255,0.72)", iconName: "business-outline", chipColor: "#152F4A" };
      }
      return { name: "Payment", gradientStart: "#1A2438", gradientEnd: "#0A0E17", accentColor: "#00D4FF", textOnCard: "#FFFFFF", subtextOnCard: "rgba(255,255,255,0.65)", iconName: "card-outline", chipColor: "#263348" };
  }
}
