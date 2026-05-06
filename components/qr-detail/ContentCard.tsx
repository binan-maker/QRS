import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "@/lib/haptics";
import type { ParsedPaymentQr } from "@/lib/qr-analysis";
import Colors from "@/constants/colors";

function getPaymentAppIcon(appId: string): string {
  switch (appId) {
    case "phonepe": return "phone-portrait-outline";
    case "gpay_india": return "logo-google";
    case "paytm": return "wallet-outline";
    case "bhim": return "shield-checkmark-outline";
    case "amazon_pay": return "cart-outline";
    case "paypal": return "card-outline";
    case "venmo": return "people-outline";
    case "cash_app": return "cash-outline";
    case "alipay": case "wechat_pay": return "globe-outline";
    case "bitcoin": case "ethereum": case "litecoin":
    case "solana": case "dogecoin": case "bnb": return "logo-bitcoin";
    case "mpesa": case "flutterwave": case "paystack": return "phone-portrait-outline";
    case "revolut": case "wise": case "swish_se": return "swap-horizontal-outline";
    case "pix": return "flash-outline";
    default: return "card-outline";
  }
}

interface Props {
  content: string;
  contentType: string;
  parsedPayment: ParsedPaymentQr | null;
  isDeactivated: boolean;
  onOpenContent: () => void;
}

const ContentCard = React.memo(function ContentCard({
  content,
  contentType,
  parsedPayment,
  isDeactivated,
  onOpenContent,
}: Props) {
  const [copied, setCopied] = React.useState(false);

  async function handleCopy() {
    await Clipboard.setStringAsync(content);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <View style={styles.contentCard}>
      <View style={styles.contentHeader}>
        <View style={[styles.typeIcon, { backgroundColor: Colors.dark.primaryDim }]}>
          <MaterialCommunityIcons name="qrcode" size={28} color={Colors.dark.primary} />
        </View>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{contentType.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.contentText} selectable numberOfLines={4}>{content}</Text>

      {contentType === "url" && !isDeactivated ? (
        <View style={styles.actionRow}>
          <Pressable onPress={onOpenContent} style={({ pressed }) => [styles.openBtn, { opacity: pressed ? 0.8 : 1 }]}>
            <Ionicons name="open-outline" size={16} color={Colors.dark.primary} />
            <Text style={styles.openBtnText}>Open Link</Text>
          </Pressable>
          <Pressable
            onPress={handleCopy}
            style={({ pressed }) => [
              styles.copyIconBtn,
              copied ? styles.copyIconBtnCopied : {},
              { opacity: pressed ? 0.75 : 1 },
            ]}
          >
            <Ionicons name={copied ? "checkmark-circle" : "copy-outline"} size={16} color={copied ? Colors.dark.safe : Colors.dark.textSecondary} />
            <Text style={[styles.copiedToast, { color: copied ? Colors.dark.safe : Colors.dark.textSecondary }]}>{copied ? "Copied!" : "Copy"}</Text>
          </Pressable>
        </View>
      ) : contentType !== "payment" ? (
        <View style={styles.actionRow}>
          <Pressable
            onPress={handleCopy}
            style={({ pressed }) => [
              styles.copyIconBtn,
              copied ? styles.copyIconBtnCopied : {},
              { opacity: pressed ? 0.75 : 1 },
            ]}
          >
            <Ionicons name={copied ? "checkmark-circle" : "copy-outline"} size={16} color={copied ? Colors.dark.safe : Colors.dark.textSecondary} />
            <Text style={[styles.copiedToast, { color: copied ? Colors.dark.safe : Colors.dark.textSecondary }]}>{copied ? "Copied!" : "Copy"}</Text>
          </Pressable>
        </View>
      ) : null}

      {contentType === "payment" && parsedPayment && !isDeactivated ? (
        <View style={styles.paymentCard}>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>App</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1, justifyContent: "flex-end" }}>
              <Text style={[styles.paymentValue, { color: Colors.dark.primary }]} numberOfLines={1}>
                {parsedPayment.appDisplayName}
              </Text>
              <View style={styles.regionBadge}>
                <Text style={styles.regionBadgeText}>{parsedPayment.region}</Text>
              </View>
            </View>
          </View>

          {parsedPayment.recipientName ? (
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Payee</Text>
              <Text style={styles.paymentValue} numberOfLines={1}>{parsedPayment.recipientName}</Text>
            </View>
          ) : null}

          {parsedPayment.appCategory === "upi_india" && parsedPayment.vpa ? (
            <>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>UPI ID</Text>
                <Text style={styles.paymentValue} selectable numberOfLines={1}>{parsedPayment.vpa}</Text>
              </View>
              {parsedPayment.bankHandle ? (
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Bank</Text>
                  <Text style={styles.paymentValue}>@{parsedPayment.bankHandle}</Text>
                </View>
              ) : null}
            </>
          ) : null}

          {parsedPayment.appCategory === "crypto" && parsedPayment.recipientId ? (
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Address</Text>
              <Text selectable numberOfLines={2} style={styles.cryptoAddress}>
                {parsedPayment.recipientId}
              </Text>
            </View>
          ) : null}

          {parsedPayment.appCategory !== "upi_india" && parsedPayment.appCategory !== "crypto" && parsedPayment.recipientId && !parsedPayment.recipientName ? (
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>To</Text>
              <Text style={styles.paymentValue} selectable numberOfLines={1}>{parsedPayment.recipientId}</Text>
            </View>
          ) : null}

          {parsedPayment.isAmountPreFilled && parsedPayment.amount ? (
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Amount</Text>
              <Text style={[styles.paymentValue, { color: Colors.dark.warning, fontFamily: "Inter_700Bold" }]}>
                {parsedPayment.currency === "INR"
                  ? `₹${parseFloat(parsedPayment.amount).toLocaleString("en-IN")}`
                  : parsedPayment.currency === "USD"
                  ? `$${parseFloat(parsedPayment.amount).toLocaleString("en-US")}`
                  : parsedPayment.currency === "EUR"
                  ? `€${parseFloat(parsedPayment.amount).toLocaleString("de-DE")}`
                  : `${parsedPayment.amount} ${parsedPayment.currency || ""}`}
              </Text>
            </View>
          ) : null}

          {parsedPayment.note ? (
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Note</Text>
              <Text style={styles.paymentValue} numberOfLines={2}>{parsedPayment.note}</Text>
            </View>
          ) : null}

          <Pressable onPress={onOpenContent} style={({ pressed }) => [styles.payBtn, { opacity: pressed ? 0.8 : 1 }]}>
            <Ionicons name={getPaymentAppIcon(parsedPayment.app) as any} size={18} color="#000" />
            <Text style={styles.payBtnText}>
              {parsedPayment.appCategory === "crypto"
                ? `Open in ${parsedPayment.appDisplayName} Wallet`
                : `Pay with ${parsedPayment.appDisplayName}`}
            </Text>
          </Pressable>
          <Text style={styles.paymentWarning}>
            {parsedPayment.appCategory === "crypto"
              ? "Crypto payments are irreversible — verify the address character by character"
              : parsedPayment.appCategory === "upi_india"
              ? "Verify the payee name and UPI ID before paying"
              : "Always verify the recipient before sending money"}
          </Text>
        </View>
      ) : contentType === "payment" && !parsedPayment && !isDeactivated ? (
        <View style={styles.actionRow}>
          <Pressable onPress={onOpenContent} style={({ pressed }) => [styles.payBtn, { opacity: pressed ? 0.8 : 1 }]}>
            <Ionicons name="card-outline" size={18} color="#000" />
            <Text style={styles.payBtnText}>Open Payment</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
});

export default ContentCard;

const styles = StyleSheet.create({
  contentCard: {
    backgroundColor: Colors.dark.surface, borderRadius: 16, padding: 18,
    marginBottom: 16, borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  contentHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  typeIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  typeBadge: { backgroundColor: Colors.dark.primaryDim, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  typeBadgeText: { fontSize: 12, fontFamily: "Inter_700Bold", color: Colors.dark.primary, letterSpacing: 0.5 },
  contentText: {
    fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.dark.text,
    lineHeight: 22, marginBottom: 14, letterSpacing: 0.2,
  },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  openBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.dark.primaryDim, borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 16,
  },
  openBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.dark.primary },
  copyIconBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 4, height: 28, paddingHorizontal: 9, borderRadius: 8, borderWidth: 1,
    backgroundColor: Colors.dark.surfaceLight, borderColor: Colors.dark.surfaceBorder,
  },
  copyIconBtnCopied: {
    backgroundColor: Colors.dark.safe + "18",
    borderColor: Colors.dark.safe,
  },
  copiedToast: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  paymentCard: {
    backgroundColor: Colors.dark.surfaceLight, borderRadius: 14, padding: 14, gap: 8, marginTop: 4,
  },
  paymentRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  paymentLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted, minWidth: 60 },
  paymentValue: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.dark.text, flex: 1, textAlign: "right" },
  regionBadge: { backgroundColor: Colors.dark.primaryDim, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  regionBadgeText: { color: Colors.dark.primary, fontSize: 12, fontFamily: "Inter_600SemiBold" },
  cryptoAddress: {
    flex: 1, textAlign: "right", fontSize: 12, fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary, letterSpacing: 0.3,
  },
  payBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: Colors.dark.primary, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 20, marginTop: 4,
  },
  payBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#000" },
  paymentWarning: {
    fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted,
    textAlign: "center", lineHeight: 18,
  },
});
