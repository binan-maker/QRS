import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "@/shared/utils/haptics";
import { Platform } from "react-native";
import type { ParsedPaymentQr } from "@/services/analysis";
import type { AppBrand } from "./brand-data";
import { styles } from "./styles";
import { formatAmount } from "./utils";

interface Props {
  parsedPayment: ParsedPaymentQr;
  brand: AppBrand;
  isIndia: boolean;
  isDeactivated: boolean;
  onOpenContent: () => void;
}

const PaymentCardActions = React.memo(function PaymentCardActions({
  parsedPayment, brand, isIndia, isDeactivated,
}: Props) {
  const [upiCopied, setUpiCopied] = React.useState(false);
  const [amtCopied, setAmtCopied] = React.useState(false);
  const [linkCopied, setLinkCopied] = React.useState(false);

  const displayVpa = parsedPayment.vpa ||
    (parsedPayment.recipientId?.includes("@") ? parsedPayment.recipientId : undefined);

  const isCrypto = parsedPayment.appCategory === "crypto";
  const cryptoAddress = isCrypto ? parsedPayment.recipientId ?? parsedPayment.vpa : undefined;

  async function handleCopyUpi() {
    const val = displayVpa;
    if (!val) return;
    await Clipboard.setStringAsync(val);
    if (Platform.OS !== "android") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setUpiCopied(true);
    setTimeout(() => setUpiCopied(false), 2000);
  }

  async function handleCopyAmount() {
    const val = parsedPayment.amount;
    if (!val) return;
    await Clipboard.setStringAsync(val);
    if (Platform.OS !== "android") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAmtCopied(true);
    setTimeout(() => setAmtCopied(false), 2000);
  }

  async function handleCopyPaymentLink() {
    const val = parsedPayment.rawContent ?? displayVpa;
    if (!val) return;
    await Clipboard.setStringAsync(val);
    if (Platform.OS !== "android") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  async function handleCopyCrypto() {
    const val = cryptoAddress;
    if (!val) return;
    await Clipboard.setStringAsync(val);
    if (Platform.OS !== "android") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setUpiCopied(true);
    setTimeout(() => setUpiCopied(false), 2000);
  }

  if (isDeactivated) {
    return (
      <View style={styles.deactivatedBanner}>
        <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
        <Text style={styles.deactivatedText}>This payment QR has been deactivated</Text>
      </View>
    );
  }

  if (isCrypto) {
    return (
      <View style={styles.actionArea}>
        <Pressable
          onPress={handleCopyCrypto}
          style={({ pressed }) => [actionStyles.copyBtn, { opacity: pressed ? 0.82 : 1, borderColor: brand.gradientStart + "60" }]}
        >
          <Ionicons name={upiCopied ? "checkmark-circle" : "copy-outline"} size={17} color={upiCopied ? "#4ADE80" : brand.gradientStart} />
          <Text style={[actionStyles.copyBtnText, { color: upiCopied ? "#4ADE80" : brand.gradientStart }]}>
            {upiCopied ? "Copied!" : "Copy Address"}
          </Text>
        </Pressable>
        <View style={styles.warningBox}>
          <Ionicons name="warning-outline" size={14} color="#F59E0B" style={{ flexShrink: 0 }} />
          <Text style={styles.warningText} maxFontSizeMultiplier={1}>
            Crypto is irreversible — verify the address character by character before sending
          </Text>
        </View>
      </View>
    );
  }

  if (parsedPayment.isEmv && parsedPayment.extraFields?.accountNumber) {
    return (
      <View style={styles.actionArea}>
        <View style={actionStyles.manualBox}>
          <Ionicons name="information-circle-outline" size={16} color="#60A5FA" style={{ flexShrink: 0 }} />
          <Text style={actionStyles.manualText}>
            Open your bank app and use the account number and IFSC shown above to transfer.
          </Text>
        </View>
        <View style={styles.warningBox}>
          <Ionicons name="information-circle-outline" size={14} color="#94A3B8" style={{ flexShrink: 0 }} />
          <Text style={styles.warningText} maxFontSizeMultiplier={1}>
            Always verify the beneficiary name and account details before transferring
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.actionArea}>
      <View style={actionStyles.copyRow}>
        {displayVpa ? (
          <Pressable
            onPress={handleCopyUpi}
            style={({ pressed }) => [actionStyles.copyBtn, actionStyles.copyBtnFlex, { opacity: pressed ? 0.82 : 1, borderColor: brand.gradientStart + "60" }]}
          >
            <Ionicons name={upiCopied ? "checkmark-circle" : "at-circle-outline"} size={17} color={upiCopied ? "#4ADE80" : brand.gradientStart} />
            <Text style={[actionStyles.copyBtnText, { color: upiCopied ? "#4ADE80" : brand.gradientStart }]}>
              {upiCopied ? "Copied!" : "Copy UPI ID"}
            </Text>
          </Pressable>
        ) : null}

        {parsedPayment.isAmountPreFilled && parsedPayment.amount ? (
          <Pressable
            onPress={handleCopyAmount}
            style={({ pressed }) => [actionStyles.copyBtn, actionStyles.copyBtnFlex, { opacity: pressed ? 0.82 : 1, borderColor: "#FCD34D60" }]}
          >
            <Ionicons name={amtCopied ? "checkmark-circle" : "cash-outline"} size={17} color={amtCopied ? "#4ADE80" : "#FCD34D"} />
            <Text style={[actionStyles.copyBtnText, { color: amtCopied ? "#4ADE80" : "#FCD34D" }]}>
              {amtCopied ? "Copied!" : `Copy ${formatAmount(parsedPayment.amount, parsedPayment.currency)}`}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <Pressable
        onPress={handleCopyPaymentLink}
        style={({ pressed }) => [actionStyles.copyBtn, { opacity: pressed ? 0.82 : 1, borderColor: "rgba(148,163,184,0.25)" }]}
      >
        <Ionicons name={linkCopied ? "checkmark-circle" : "link-outline"} size={17} color={linkCopied ? "#4ADE80" : "#94A3B8"} />
        <Text style={[actionStyles.copyBtnText, { color: linkCopied ? "#4ADE80" : "#94A3B8" }]}>
          {linkCopied ? "Copied!" : "Copy Payment Link"}
        </Text>
      </Pressable>

      <View style={actionStyles.manualBox}>
        <Ionicons name="phone-portrait-outline" size={15} color="#60A5FA" style={{ flexShrink: 0 }} />
        <Text style={actionStyles.manualText}>
          Open your preferred UPI app (GPay, PhonePe, Paytm, BHIM) and paste the UPI ID to pay manually.
        </Text>
      </View>

      <View style={styles.warningBox}>
        <Ionicons name="information-circle-outline" size={14} color="#94A3B8" style={{ flexShrink: 0 }} />
        <Text style={styles.warningText} maxFontSizeMultiplier={1}>
          {isIndia
            ? "Always verify the Merchant Name and UPI ID before paying"
            : "Always verify the recipient before sending money"}
        </Text>
      </View>
    </View>
  );
});

const actionStyles = StyleSheet.create({
  copyRow: {
    flexDirection: "row",
    gap: 10,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
  },
  copyBtnFlex: {
    flex: 1,
  },
  copyBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  manualBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(96,165,250,0.08)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.18)",
  },
  manualText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#93C5FD",
    flex: 1,
    lineHeight: 17,
  },
});

export default PaymentCardActions;
