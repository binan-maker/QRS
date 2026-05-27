import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "@/shared/utils/haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Platform } from "react-native";
import type { ParsedPaymentQr } from "@/services/analysis";
import type { AppBrand } from "./brand-data";
import { getBankFullName, formatAmount, addSoftHyphens } from "./utils";
import { styles } from "./styles";

interface Props {
  parsedPayment: ParsedPaymentQr;
  brand: AppBrand;
  isIndia: boolean;
  displayVpa: string | undefined;
  effectiveBankName: string | null;
}

const PaymentCardFace = React.memo(function PaymentCardFace({
  parsedPayment, brand, isIndia, displayVpa, effectiveBankName,
}: Props) {
  const [upiCopied, setUpiCopied] = React.useState(false);

  async function handleCopyUpi() {
    if (!displayVpa) return;
    await Clipboard.setStringAsync(displayVpa);
    if (Platform.OS !== "android") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setUpiCopied(true);
    setTimeout(() => setUpiCopied(false), 2000);
  }

  return (
    <LinearGradient colors={[brand.gradientStart, brand.gradientEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
      <View style={[styles.decCircleLarge, { backgroundColor: brand.chipColor }]} />
      <View style={[styles.decCircleSmall, { backgroundColor: brand.chipColor }]} />

      <View style={styles.cardTopRow}>
        <View style={styles.appNameRow}>
          <View style={[styles.appIconBubble, { backgroundColor: brand.chipColor }]}>
            <Ionicons name={brand.iconName} size={15} color={brand.accentColor} />
          </View>
          <Text style={[styles.appNameText, { color: brand.subtextOnCard }]} maxFontSizeMultiplier={1} numberOfLines={1}>
            {parsedPayment.appDisplayName}
          </Text>
          {isIndia && (
            <View style={styles.indiaBadge}>
              <Text style={styles.indiaBadgeText} maxFontSizeMultiplier={1}>🇮🇳 UPI</Text>
            </View>
          )}
        </View>
        <View style={styles.shieldBadge}>
          <Ionicons name="shield-checkmark" size={13} color="#4ADE80" />
          <Text style={styles.shieldText} maxFontSizeMultiplier={1}>QRS</Text>
        </View>
      </View>

      <Text style={[styles.merchantName, { color: brand.textOnCard }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.78} maxFontSizeMultiplier={1}
        // @ts-ignore
        android_hyphenationFrequency="full">
        {addSoftHyphens(parsedPayment.recipientName || "Unknown Merchant")}
      </Text>

      {displayVpa ? (
        <Pressable onPress={handleCopyUpi} style={styles.upiRow}>
          <Ionicons name="at-circle-outline" size={14} color={brand.accentColor} style={{ flexShrink: 0 }} />
          <Text style={[styles.upiId, { color: brand.subtextOnCard }]} selectable maxFontSizeMultiplier={1}
            // @ts-ignore
            android_hyphenationFrequency="full">
            {addSoftHyphens(displayVpa)}
          </Text>
          <Ionicons name={upiCopied ? "checkmark-circle" : "copy-outline"} size={13} color={upiCopied ? "#4ADE80" : brand.accentColor} style={{ flexShrink: 0 }} />
        </Pressable>
      ) : null}

      {effectiveBankName ? (
        <View style={styles.bankRow}>
          <Ionicons name="business-outline" size={12} color={brand.accentColor} />
          <Text style={[styles.bankName, { color: brand.subtextOnCard }]} maxFontSizeMultiplier={1} numberOfLines={1}>{effectiveBankName}</Text>
        </View>
      ) : parsedPayment.bankHandle ? (
        <View style={styles.bankRow}>
          <Ionicons name="business-outline" size={12} color={brand.accentColor} />
          <Text style={[styles.bankName, { color: brand.subtextOnCard }]} maxFontSizeMultiplier={1} numberOfLines={1}>@{parsedPayment.bankHandle}</Text>
        </View>
      ) : null}

      {parsedPayment.isAmountPreFilled && parsedPayment.amount ? (
        <View style={[styles.amountChip, { backgroundColor: brand.chipColor, borderColor: brand.accentColor + "50" }]}>
          <Ionicons name="cash-outline" size={14} color="#FCD34D" />
          <Text style={styles.amountText} maxFontSizeMultiplier={1}>
            {formatAmount(parsedPayment.amount, parsedPayment.currency)}
          </Text>
          <Text style={[styles.amountLabel, { color: brand.subtextOnCard }]} maxFontSizeMultiplier={1}>Pre-filled Amount</Text>
        </View>
      ) : null}

      {parsedPayment.note ? (
        <View style={styles.noteRow}>
          <Ionicons name="document-text-outline" size={12} color={brand.accentColor} />
          <Text style={[styles.noteText, { color: brand.subtextOnCard }]} numberOfLines={2}>{parsedPayment.note}</Text>
        </View>
      ) : null}

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
              <Text style={[styles.extraFieldValue, { color: brand.textOnCard }]} selectable>{parsedPayment.extraFields.ifsc}</Text>
            </View>
          ) : null}
          {parsedPayment.extraFields.bankName ? (
            <View style={styles.extraFieldRow}>
              <Ionicons name="business-outline" size={12} color={brand.accentColor} />
              <Text style={[styles.extraFieldLabel, { color: brand.subtextOnCard }]}>Bank</Text>
              <Text style={[styles.extraFieldValue, { color: brand.textOnCard }]} numberOfLines={1}>{parsedPayment.extraFields.bankName}</Text>
            </View>
          ) : null}
          {parsedPayment.extraFields.accountType ? (
            <View style={styles.extraFieldRow}>
              <Ionicons name="file-tray-outline" size={12} color={brand.accentColor} />
              <Text style={[styles.extraFieldLabel, { color: brand.subtextOnCard }]}>Type</Text>
              <Text style={[styles.extraFieldValue, { color: brand.textOnCard }]}>{parsedPayment.extraFields.accountType}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {parsedPayment.isEmv && parsedPayment.extraFields && !parsedPayment.extraFields.accountNumber ? (
        <View style={styles.extraFieldsBlock}>
          {parsedPayment.extraFields.ifsc ? (
            <View style={styles.extraFieldRow}>
              <Ionicons name="code-outline" size={12} color={brand.accentColor} />
              <Text style={[styles.extraFieldLabel, { color: brand.subtextOnCard }]}>IFSC</Text>
              <Text style={[styles.extraFieldValue, { color: brand.textOnCard }]} selectable>{parsedPayment.extraFields.ifsc}</Text>
            </View>
          ) : null}
          {parsedPayment.extraFields.billNumber ? (
            <View style={styles.extraFieldRow}>
              <Ionicons name="receipt-outline" size={12} color={brand.accentColor} />
              <Text style={[styles.extraFieldLabel, { color: brand.subtextOnCard }]}>Bill No.</Text>
              <Text style={[styles.extraFieldValue, { color: brand.textOnCard }]} selectable>{parsedPayment.extraFields.billNumber}</Text>
            </View>
          ) : null}
          {parsedPayment.extraFields.referenceLabel ? (
            <View style={styles.extraFieldRow}>
              <Ionicons name="bookmark-outline" size={12} color={brand.accentColor} />
              <Text style={[styles.extraFieldLabel, { color: brand.subtextOnCard }]}>Ref</Text>
              <Text style={[styles.extraFieldValue, { color: brand.textOnCard }]} selectable>{parsedPayment.extraFields.referenceLabel}</Text>
            </View>
          ) : null}
          {parsedPayment.extraFields.mcc ? (
            <View style={styles.extraFieldRow}>
              <Ionicons name="pricetag-outline" size={12} color={brand.accentColor} />
              <Text style={[styles.extraFieldLabel, { color: brand.subtextOnCard }]}>MCC</Text>
              <Text style={[styles.extraFieldValue, { color: brand.textOnCard }]}>{parsedPayment.extraFields.mcc}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {parsedPayment.extraFields?.billerId && !parsedPayment.isEmv && !parsedPayment.extraFields?.accountNumber ? (
        <View style={styles.extraFieldsBlock}>
          <View style={styles.extraFieldRow}>
            <Ionicons name="business-outline" size={12} color={brand.accentColor} />
            <Text style={[styles.extraFieldLabel, { color: brand.subtextOnCard }]}>Biller</Text>
            <Text style={[styles.extraFieldValue, { color: brand.textOnCard }]} numberOfLines={1} selectable>{parsedPayment.extraFields.billerId}</Text>
          </View>
          {parsedPayment.extraFields.category ? (
            <View style={styles.extraFieldRow}>
              <Ionicons name="list-outline" size={12} color={brand.accentColor} />
              <Text style={[styles.extraFieldLabel, { color: brand.subtextOnCard }]}>Category</Text>
              <Text style={[styles.extraFieldValue, { color: brand.textOnCard }]}>{parsedPayment.extraFields.category}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={[styles.cardChipLine, { backgroundColor: brand.accentColor + "30" }]} />
      <View style={styles.cardBottomRow}>
        <View style={styles.verifiedRow}>
          <View style={styles.verifiedDot} />
          <Text style={[styles.verifiedText, { color: brand.subtextOnCard }]} maxFontSizeMultiplier={1}>
            Scanned & Analysed by QR Guard
          </Text>
        </View>
        <Text style={[styles.regionText, { color: brand.accentColor }]} maxFontSizeMultiplier={1}>
          {parsedPayment.region}
        </Text>
      </View>
    </LinearGradient>
  );
});

export default PaymentCardFace;
