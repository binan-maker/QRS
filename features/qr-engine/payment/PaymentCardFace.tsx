import React, { memo, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "@/shared/utils/haptics";
import { Platform } from "react-native";
import type { ParsedPaymentQr } from "@/services/analysis";
import type { AppBrand } from "./brand-data";
import { formatAmount, addSoftHyphens } from "./utils";
import { styles } from "./styles";
import { useTheme } from "@/shared/contexts/ThemeContext";

interface Props {
  parsedPayment: ParsedPaymentQr;
  brand: AppBrand;
  isIndia: boolean;
  displayVpa: string | undefined;
  effectiveBankName: string | null;
}

const PaymentCardFace = memo(function PaymentCardFace({
  parsedPayment, brand, isIndia, displayVpa, effectiveBankName,
}: Props) {
  const { colors, isDark } = useTheme();
  const [upiCopied, setUpiCopied] = useState(false);

  async function handleCopyUpi() {
    if (!displayVpa) return;
    await Clipboard.setStringAsync(displayVpa);
    if (Platform.OS !== "android") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setUpiCopied(true);
    setTimeout(() => setUpiCopied(false), 2000);
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
      <View style={styles.cardTopRow}>
        <View style={styles.appNameRow}>
          <View style={[styles.appIconBubble, { backgroundColor: brand.gradientStart + (isDark ? "26" : "16") }]}>
            <Ionicons name={brand.iconName} size={17} color={brand.gradientStart} />
          </View>
          <View style={styles.appNameCol}>
            <Text style={[styles.appNameText, { color: colors.text }]} maxFontSizeMultiplier={1} numberOfLines={1}>
              {parsedPayment.appDisplayName}
            </Text>
            {isIndia && (
              <View style={[styles.indiaBadge, { backgroundColor: colors.primaryDim }]}>
                <Text style={[styles.indiaBadgeText, { color: colors.primary }]} maxFontSizeMultiplier={1}>🇮🇳 UPI</Text>
              </View>
            )}
          </View>
        </View>
        <View style={[styles.shieldBadge, { backgroundColor: colors.safeDim ?? colors.safe + "18", borderColor: colors.safe + "35" }]}>
          <Ionicons name="shield-checkmark" size={12} color={colors.safe} />
          <Text style={[styles.shieldText, { color: colors.safe }]} maxFontSizeMultiplier={1}>QRS</Text>
        </View>
      </View>

      <Text style={[styles.merchantName, { color: colors.text }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.78} maxFontSizeMultiplier={1}
        // @ts-ignore
        android_hyphenationFrequency="full">
        {addSoftHyphens(parsedPayment.recipientName || "Unknown Merchant")}
      </Text>

      {displayVpa ? (
        <Pressable onPress={handleCopyUpi} style={styles.upiRow}>
          <Ionicons name="at-circle-outline" size={14} color={colors.textSecondary} style={{ flexShrink: 0 }} />
          <Text style={[styles.upiId, { color: colors.textSecondary }]} selectable maxFontSizeMultiplier={1}
            // @ts-ignore
            android_hyphenationFrequency="full">
            {addSoftHyphens(displayVpa)}
          </Text>
          <Ionicons name={upiCopied ? "checkmark-circle" : "copy-outline"} size={13} color={upiCopied ? colors.safe : colors.textMuted} style={{ flexShrink: 0 }} />
        </Pressable>
      ) : null}

      {effectiveBankName ? (
        <View style={styles.bankRow}>
          <Ionicons name="business-outline" size={12} color={colors.textMuted} />
          <Text style={[styles.bankName, { color: colors.textMuted }]} maxFontSizeMultiplier={1} numberOfLines={1}>{effectiveBankName}</Text>
        </View>
      ) : parsedPayment.bankHandle ? (
        <View style={styles.bankRow}>
          <Ionicons name="business-outline" size={12} color={colors.textMuted} />
          <Text style={[styles.bankName, { color: colors.textMuted }]} maxFontSizeMultiplier={1} numberOfLines={1}>@{parsedPayment.bankHandle}</Text>
        </View>
      ) : null}

      {parsedPayment.isAmountPreFilled && parsedPayment.amount ? (
        <View style={[styles.amountChip, { backgroundColor: colors.warningDim ?? colors.warning + "18", borderColor: colors.warning + "40" }]}>
          <Ionicons name="cash-outline" size={15} color={colors.warning} />
          <Text style={[styles.amountText, { color: colors.warning }]} maxFontSizeMultiplier={1}>
            {formatAmount(parsedPayment.amount, parsedPayment.currency)}
          </Text>
          <Text style={[styles.amountLabel, { color: colors.textMuted }]} maxFontSizeMultiplier={1}>Pre-filled Amount</Text>
        </View>
      ) : null}

      {parsedPayment.note ? (
        <View style={[styles.noteRow, { backgroundColor: colors.surfaceLight }]}>
          <Ionicons name="document-text-outline" size={12} color={colors.textMuted} />
          <Text style={[styles.noteText, { color: colors.textSecondary }]} numberOfLines={2}>{parsedPayment.note}</Text>
        </View>
      ) : null}

      {parsedPayment.extraFields?.accountNumber ? (
        <View style={[styles.extraFieldsBlock, { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder }]}>
          <View style={styles.extraFieldRow}>
            <Ionicons name="card-outline" size={12} color={colors.textMuted} />
            <Text style={[styles.extraFieldLabel, { color: colors.textMuted }]}>Account</Text>
            <Text style={[styles.extraFieldValue, { color: colors.text }]} selectable>
              {`••••${parsedPayment.extraFields.accountNumber.slice(-4)}`}
            </Text>
          </View>
          {parsedPayment.extraFields.ifsc ? (
            <View style={styles.extraFieldRow}>
              <Ionicons name="code-outline" size={12} color={colors.textMuted} />
              <Text style={[styles.extraFieldLabel, { color: colors.textMuted }]}>IFSC</Text>
              <Text style={[styles.extraFieldValue, { color: colors.text }]} selectable>{parsedPayment.extraFields.ifsc}</Text>
            </View>
          ) : null}
          {parsedPayment.extraFields.bankName ? (
            <View style={styles.extraFieldRow}>
              <Ionicons name="business-outline" size={12} color={colors.textMuted} />
              <Text style={[styles.extraFieldLabel, { color: colors.textMuted }]}>Bank</Text>
              <Text style={[styles.extraFieldValue, { color: colors.text }]} numberOfLines={1}>{parsedPayment.extraFields.bankName}</Text>
            </View>
          ) : null}
          {parsedPayment.extraFields.accountType ? (
            <View style={styles.extraFieldRow}>
              <Ionicons name="file-tray-outline" size={12} color={colors.textMuted} />
              <Text style={[styles.extraFieldLabel, { color: colors.textMuted }]}>Type</Text>
              <Text style={[styles.extraFieldValue, { color: colors.text }]}>{parsedPayment.extraFields.accountType}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {parsedPayment.isEmv && parsedPayment.extraFields && !parsedPayment.extraFields.accountNumber ? (
        <View style={[styles.extraFieldsBlock, { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder }]}>
          {parsedPayment.extraFields.ifsc ? (
            <View style={styles.extraFieldRow}>
              <Ionicons name="code-outline" size={12} color={colors.textMuted} />
              <Text style={[styles.extraFieldLabel, { color: colors.textMuted }]}>IFSC</Text>
              <Text style={[styles.extraFieldValue, { color: colors.text }]} selectable>{parsedPayment.extraFields.ifsc}</Text>
            </View>
          ) : null}
          {parsedPayment.extraFields.billNumber ? (
            <View style={styles.extraFieldRow}>
              <Ionicons name="receipt-outline" size={12} color={colors.textMuted} />
              <Text style={[styles.extraFieldLabel, { color: colors.textMuted }]}>Bill No.</Text>
              <Text style={[styles.extraFieldValue, { color: colors.text }]} selectable>{parsedPayment.extraFields.billNumber}</Text>
            </View>
          ) : null}
          {parsedPayment.extraFields.referenceLabel ? (
            <View style={styles.extraFieldRow}>
              <Ionicons name="bookmark-outline" size={12} color={colors.textMuted} />
              <Text style={[styles.extraFieldLabel, { color: colors.textMuted }]}>Ref</Text>
              <Text style={[styles.extraFieldValue, { color: colors.text }]} selectable>{parsedPayment.extraFields.referenceLabel}</Text>
            </View>
          ) : null}
          {parsedPayment.extraFields.mcc ? (
            <View style={styles.extraFieldRow}>
              <Ionicons name="pricetag-outline" size={12} color={colors.textMuted} />
              <Text style={[styles.extraFieldLabel, { color: colors.textMuted }]}>MCC</Text>
              <Text style={[styles.extraFieldValue, { color: colors.text }]}>{parsedPayment.extraFields.mcc}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {parsedPayment.extraFields?.billerId && !parsedPayment.isEmv && !parsedPayment.extraFields?.accountNumber ? (
        <View style={[styles.extraFieldsBlock, { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder }]}>
          <View style={styles.extraFieldRow}>
            <Ionicons name="business-outline" size={12} color={colors.textMuted} />
            <Text style={[styles.extraFieldLabel, { color: colors.textMuted }]}>Biller</Text>
            <Text style={[styles.extraFieldValue, { color: colors.text }]} numberOfLines={1} selectable>{parsedPayment.extraFields.billerId}</Text>
          </View>
          {parsedPayment.extraFields.category ? (
            <View style={styles.extraFieldRow}>
              <Ionicons name="list-outline" size={12} color={colors.textMuted} />
              <Text style={[styles.extraFieldLabel, { color: colors.textMuted }]}>Category</Text>
              <Text style={[styles.extraFieldValue, { color: colors.text }]}>{parsedPayment.extraFields.category}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />
      <View style={styles.cardBottomRow}>
        <View style={styles.verifiedRow}>
          <View style={[styles.verifiedDot, { backgroundColor: colors.safe }]} />
          <Text style={[styles.verifiedText, { color: colors.textMuted }]} maxFontSizeMultiplier={1}>
            Scanned & Analysed by BinRo
          </Text>
        </View>
        <Text style={[styles.regionText, { color: colors.textMuted }]} maxFontSizeMultiplier={1}>
          {parsedPayment.region}
        </Text>
      </View>
    </View>
  );
});

export default PaymentCardFace;
