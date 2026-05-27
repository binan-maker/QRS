import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { ParsedPaymentQr } from "@/lib/qr-analysis";
import type { AppBrand } from "./brand-data";
import { styles } from "./styles";

interface Props {
  parsedPayment: ParsedPaymentQr;
  brand: AppBrand;
  isIndia: boolean;
  isDeactivated: boolean;
  onOpenContent: () => void;
}

const PaymentCardActions = React.memo(function PaymentCardActions({
  parsedPayment, brand, isIndia, isDeactivated, onOpenContent,
}: Props) {
  const payLabel = parsedPayment.appCategory === "crypto"
    ? "Open Wallet"
    : parsedPayment.isEmv && parsedPayment.vpa
    ? "Pay with UPI App"
    : parsedPayment.isEmv && parsedPayment.extraFields?.accountNumber
    ? "Transfer via Bank App"
    : parsedPayment.isEmv
    ? "Open in UPI App"
    : `Pay via ${parsedPayment.appDisplayName}`;

  const warningText = parsedPayment.appCategory === "crypto"
    ? "Crypto is irreversible — verify address character by character"
    : isIndia
    ? "Always verify the Merchant Name and UPI ID before paying"
    : "Always verify the recipient before sending money";

  if (isDeactivated) {
    return (
      <View style={styles.deactivatedBanner}>
        <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
        <Text style={styles.deactivatedText}>This payment QR has been deactivated</Text>
      </View>
    );
  }

  return (
    <View style={styles.actionArea}>
      <Pressable onPress={onOpenContent} style={({ pressed }) => [styles.payBtn, { opacity: pressed ? 0.85 : 1 }]}>
        <LinearGradient colors={[brand.gradientStart, brand.gradientEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.payBtnGradient}>
          <Ionicons name={brand.iconName} size={18} color="#FFF" />
          <Text style={styles.payBtnText}>{payLabel}</Text>
          <Ionicons name="arrow-forward" size={16} color="#FFF" />
        </LinearGradient>
      </Pressable>
      <View style={styles.warningBox}>
        <Ionicons name="information-circle-outline" size={14} color="#94A3B8" style={{ flexShrink: 0 }} />
        <Text style={styles.warningText} maxFontSizeMultiplier={1}>{warningText}</Text>
      </View>
    </View>
  );
});

export default PaymentCardActions;
