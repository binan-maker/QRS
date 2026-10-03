import React, { memo, useState, useMemo } from "react";
import { View, Text, Pressable, StyleSheet, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "@/shared/utils/haptics";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { parseAnyPaymentQr, isPaymentQr, analyzeAnyPaymentQr } from "@/services/analysis";

function copyValue(value: string, onDone: () => void) {
  Clipboard.setStringAsync(value).then(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onDone();
  });
}

function CardHeader({
  title,
  content,
  badge,
  badgeBg,
  badgeColor,
  icon,
}: {
  title: string;
  content: string;
  badge?: string;
  badgeBg?: string;
  badgeColor?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const { colors } = useTheme();
  const [copied, setCopied] = useState(false);
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        {icon && <Ionicons name={icon} size={18} color={badgeColor || colors.primary} />}
        <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
        {badge && (
          <View style={[styles.badge, { backgroundColor: badgeBg || colors.primaryDim }]}>
            <Text style={[styles.badgeText, { color: badgeColor || colors.primary }]}>{badge}</Text>
          </View>
        )}
      </View>
      <Pressable
        onPress={() =>
          copyValue(content, () => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          })
        }
        style={[
          styles.copyBtn,
          {
            backgroundColor: copied ? colors.safe + "18" : colors.surfaceLight,
            borderColor: copied ? colors.safe : colors.surfaceBorder,
          },
        ]}
      >
        <Ionicons
          name={copied ? "checkmark-circle" : "copy-outline"}
          size={14}
          color={copied ? colors.safe : colors.textMuted}
        />
        <Text style={[styles.copyText, { color: copied ? colors.safe : colors.textMuted }]}>
          {copied ? "Copied!" : "Copy"}
        </Text>
      </Pressable>
    </View>
  );
}

function PaymentContentCard({
  content,
  onOpenContent,
  hideOpenAction,
}: {
  content: string;
  onOpenContent: () => void;
  hideOpenAction?: boolean;
}) {
  const { colors, isDark } = useTheme();
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  const parsed = useMemo(() => parseAnyPaymentQr(content), [content]);
  const analysis = useMemo(() => (parsed ? analyzeAnyPaymentQr(parsed) : null), [parsed]);

  const appTitle = parsed?.appDisplayName || "Payment QR";
  const recipientAddress = parsed?.vpa || parsed?.recipientId || content;
  const isWebLink = /^https?:\/\//i.test(content);

  const handleCopyAddress = () => {
    copyValue(recipientAddress, () => {
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2200);
    });
  };

  const handleCopyAll = () => {
    copyValue(content, () => {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2200);
    });
  };

  const handlePayPress = async () => {
    // If external open callback provided, attempt direct pay / launch
    if (onOpenContent) {
      onOpenContent();
      return;
    }
    // Fallback: try opening URI / URL directly
    try {
      const canOpen = await Linking.canOpenURL(content).catch(() => false);
      if (canOpen) {
        await Linking.openURL(content);
        return;
      }
    } catch {}
    handleCopyAddress();
  };

  // Format pre-filled amount nicely
  let formattedAmount = "";
  if (parsed?.isAmountPreFilled && parsed.amount) {
    const amt = parseFloat(parsed.amount);
    if (!isNaN(amt)) {
      if (parsed.appCategory === "upi_india" || parsed.appCategory === "india_wallet") {
        formattedAmount = `₹${amt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
      } else if (parsed.app === "pix") {
        formattedAmount = `R$ ${amt.toFixed(2)}`;
      } else if (parsed.currency) {
        formattedAmount = `${parsed.currency} ${amt.toLocaleString()}`;
      } else {
        formattedAmount = `${amt.toLocaleString()}`;
      }
    } else {
      formattedAmount = `${parsed.currency ? parsed.currency + " " : ""}${parsed.amount}`;
    }
  }

  return (
    <Animated.View entering={FadeInDown.duration(260)}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.surfaceBorder,
            borderLeftWidth: 4,
            borderLeftColor: colors.safe,
          },
        ]}
      >
        {/* Header */}
        <CardHeader
          title="Payment QR Code"
          content={content}
          badge={appTitle}
          badgeBg={colors.safeDim}
          badgeColor={colors.safe}
          icon="card"
        />

        {/* Network & App Identity Banner */}
        <View
          style={[
            styles.paymentBanner,
            {
              backgroundColor: isDark ? colors.surfaceLight : "#F0FDF4",
              borderColor: isDark ? colors.surfaceBorder : "#BBF7D0",
            },
          ]}
        >
          <View style={[styles.paymentIconRing, { backgroundColor: colors.safe + "20" }]}>
            <Ionicons name="card" size={22} color={colors.safe} />
          </View>
          <View style={styles.paymentBannerTextCol}>
            <Text style={[styles.paymentBannerTitle, { color: colors.text }]}>{appTitle}</Text>
            <Text style={[styles.paymentBannerSub, { color: colors.textSecondary }]}>
              {parsed?.region ? `${parsed.region} • ` : ""}
              {parsed?.appCategory === "upi_india"
                ? "UPI Instant Payment"
                : parsed?.appCategory === "crypto"
                  ? "Cryptocurrency Transfer"
                  : isWebLink
                    ? "Online Payment Gateway"
                    : "Digital Payment Network"}
            </Text>
          </View>
        </View>

        {/* Amount Box */}
        {parsed?.isAmountPreFilled && formattedAmount ? (
          <View
            style={[
              styles.amountBox,
              {
                backgroundColor: isDark ? colors.surfaceLight : "#FEF3C7",
                borderColor: isDark ? colors.surfaceBorder : "#FCD34D",
              },
            ]}
          >
            <View style={styles.amountRow}>
              <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>
                Pre-Filled Amount
              </Text>
              <View style={[styles.alertPill, { backgroundColor: colors.warning + "25" }]}>
                <Ionicons name="alert-circle" size={12} color={colors.warning} />
                <Text style={[styles.alertPillText, { color: colors.warning }]}>Fixed Amount</Text>
              </View>
            </View>
            <Text style={[styles.amountValue, { color: colors.text }]}>{formattedAmount}</Text>
            <Text style={[styles.amountHint, { color: colors.textSecondary }]}>
              Verify this requested amount carefully before authorising payment.
            </Text>
          </View>
        ) : (
          <View
            style={[
              styles.openAmountBox,
              {
                backgroundColor: isDark ? colors.surfaceLight : colors.background,
                borderColor: colors.surfaceBorder,
              },
            ]}
          >
            <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
            <Text style={[styles.openAmountText, { color: colors.textSecondary }]}>
              Amount not pre-filled. You specify the amount in your payment app.
            </Text>
          </View>
        )}

        {/* Structured Details */}
        <View
          style={[
            styles.detailsCard,
            {
              backgroundColor: isDark ? colors.surfaceLight : colors.background,
              borderColor: colors.surfaceBorder,
            },
          ]}
        >
          {parsed?.recipientName ? (
            <View style={[styles.detailRow, { borderBottomColor: colors.surfaceBorder }]}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Payee / Merchant</Text>
              <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={1}>
                {parsed.recipientName}
              </Text>
            </View>
          ) : null}

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
              {parsed?.vpa ? "UPI ID / VPA" : "Payment Address"}
            </Text>
            <View style={styles.addressWrap}>
              <Text
                style={[styles.addressText, { color: colors.text }]}
                selectable
                numberOfLines={2}
              >
                {recipientAddress}
              </Text>
              <Pressable
                onPress={handleCopyAddress}
                style={[
                  styles.miniCopyBtn,
                  {
                    backgroundColor: copiedAddress ? colors.safe + "20" : colors.surface,
                    borderColor: copiedAddress ? colors.safe : colors.surfaceBorder,
                  },
                ]}
                hitSlop={6}
              >
                <Ionicons
                  name={copiedAddress ? "checkmark" : "copy-outline"}
                  size={12}
                  color={copiedAddress ? colors.safe : colors.textMuted}
                />
              </Pressable>
            </View>
          </View>

          {parsed?.note ? (
            <View
              style={[
                styles.detailRow,
                { borderTopWidth: 1, borderTopColor: colors.surfaceBorder },
              ]}
            >
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Note / Remarks</Text>
              <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={2}>
                {parsed.note}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Security Warning Box */}
        <View
          style={[
            styles.advisoryBox,
            {
              backgroundColor: isDark ? colors.surfaceLight : "#EFF6FF",
              borderColor: isDark ? colors.surfaceBorder : "#BFDBFE",
            },
          ]}
        >
          <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
          <Text style={[styles.advisoryText, { color: colors.textSecondary }]}>
            Never enter your UPI PIN or password to receive money. Transfers are immediate and
            irreversible once sent.
          </Text>
        </View>

        {/* Action Buttons */}
        {!hideOpenAction && (
          <View style={styles.actionButtonGroup}>
            <Pressable
              onPress={handlePayPress}
              style={[styles.payPrimaryBtn, { backgroundColor: colors.safe }]}
            >
              <Ionicons name="card-outline" size={16} color="#FFFFFF" />
              <Text style={styles.payPrimaryText}>
                {isWebLink ? "Open Payment Link" : `Pay with ${appTitle}`}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleCopyAll}
              style={[
                styles.paySecondaryBtn,
                {
                  backgroundColor: copiedAll ? colors.safe + "15" : colors.surfaceLight,
                  borderColor: copiedAll ? colors.safe : colors.surfaceBorder,
                },
              ]}
            >
              <Ionicons
                name={copiedAll ? "checkmark-circle" : "copy-outline"}
                size={14}
                color={copiedAll ? colors.safe : colors.text}
              />
              <Text style={[styles.paySecondaryText, { color: copiedAll ? colors.safe : colors.text }]}>
                {copiedAll ? "Details Copied!" : "Copy Details"}
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

function PhoneContentCard({ content, onOpenContent }: { content: string; onOpenContent?: () => void }) {
  const { colors, isDark } = useTheme();
  const [copied, setCopied] = useState(false);
  const rawNumber = content.replace(/^tel:/i, "").trim();
  const callUrl = `tel:${rawNumber}`;

  return (
    <Animated.View entering={FadeInDown.duration(260)}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
        <CardHeader title="Phone Number" content={rawNumber} icon="call-outline" />
        <View
          style={[
            styles.urlStrip,
            { backgroundColor: isDark ? colors.surfaceLight : colors.background, borderColor: colors.surfaceBorder },
          ]}
        >
          <Text style={[styles.domain, { color: colors.text }]}>{rawNumber}</Text>
        </View>
        <Pressable
          onPress={() => (onOpenContent ? onOpenContent() : Linking.openURL(callUrl).catch(() => {}))}
          style={[styles.openBtn, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "30" }]}
        >
          <Text style={[styles.openLabel, { color: colors.primary }]}>Call Number</Text>
          <Ionicons name="call-outline" size={14} color={colors.primary} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

function EmailContentCard({ content, onOpenContent }: { content: string; onOpenContent?: () => void }) {
  const { colors, isDark } = useTheme();
  const email = content.replace(/^mailto:/i, "").split("?")[0].trim();
  const mailUrl = content.startsWith("mailto:") ? content : `mailto:${content}`;

  return (
    <Animated.View entering={FadeInDown.duration(260)}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
        <CardHeader title="Email Address" content={email} icon="mail-outline" />
        <View
          style={[
            styles.urlStrip,
            { backgroundColor: isDark ? colors.surfaceLight : colors.background, borderColor: colors.surfaceBorder },
          ]}
        >
          <Text style={[styles.domain, { color: colors.text }]}>{email}</Text>
        </View>
        <Pressable
          onPress={() => (onOpenContent ? onOpenContent() : Linking.openURL(mailUrl).catch(() => {}))}
          style={[styles.openBtn, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "30" }]}
        >
          <Text style={[styles.openLabel, { color: colors.primary }]}>Send Email</Text>
          <Ionicons name="mail-outline" size={14} color={colors.primary} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

function TextContentCard({ content }: { content: string }) {
  const { colors, isDark } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const long = content.length > 120 || content.includes("\n");
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
      <CardHeader title="Text" content={content} icon="document-text-outline" />
      <View
        style={[
          styles.rawBox,
          { backgroundColor: isDark ? colors.surfaceLight : colors.background, borderColor: colors.surfaceBorder },
        ]}
      >
        <Text style={[styles.rawText, { color: colors.text }]} selectable numberOfLines={expanded ? undefined : 4}>
          {content}
        </Text>
        {long && (
          <Pressable onPress={() => setExpanded((value) => !value)}>
            <Text style={[styles.expand, { color: colors.primary }]}>{expanded ? "Show less" : "Show more"}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function WebsiteContentCard({
  content,
  onOpenContent,
  hideOpenAction,
}: {
  content: string;
  onOpenContent: () => void;
  hideOpenAction?: boolean;
}) {
  const { colors } = useTheme();
  const [copied, setCopied] = useState(false);
  const fullUrl = /^https?:\/\//i.test(content) ? content : `https://${content}`;
  let hostname = content;
  try {
    hostname = new URL(fullUrl).hostname.replace(/^www\./, "");
  } catch {}
  const handleCopy = () =>
    copyValue(fullUrl, () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  return (
    <Animated.View entering={FadeInDown.duration(260)}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
        <View style={styles.row}>
          <Text style={[styles.domain, { color: colors.text }]} numberOfLines={1}>
            {hostname}
          </Text>
          <Pressable
            onPress={handleCopy}
            style={[
              styles.copyBtn,
              {
                backgroundColor: copied ? colors.safe + "18" : colors.surfaceLight,
                borderColor: copied ? colors.safe : colors.surfaceBorder,
              },
            ]}
          >
            <Ionicons
              name={copied ? "checkmark-circle" : "copy-outline"}
              size={14}
              color={copied ? colors.safe : colors.textMuted}
            />
            <Text style={[styles.copyText, { color: copied ? colors.safe : colors.textMuted }]}>
              {copied ? "Copied!" : "Copy"}
            </Text>
          </Pressable>
        </View>
        <View style={[styles.urlStrip, { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder }]}>
          <Text style={[styles.urlText, { color: colors.textSecondary }]} selectable numberOfLines={2}>
            {fullUrl}
          </Text>
        </View>
        {!hideOpenAction && (
          <Pressable
            onPress={onOpenContent}
            style={[styles.openBtn, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "30" }]}
          >
            <Text style={[styles.openLabel, { color: colors.primary }]}>Open</Text>
            <Ionicons name="open-outline" size={14} color={colors.primary} />
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

export const QrContentCard = memo(function QrContentCard({
  content,
  contentType,
  onOpenContent,
  hideOpenAction,
}: {
  content: string;
  contentType: string;
  onOpenContent: () => void;
  hideOpenAction?: boolean;
}) {
  const clean = content?.trim() || "";
  const isPayment = contentType === "payment" || isPaymentQr(clean);

  if (isPayment) {
    return (
      <PaymentContentCard
        content={clean}
        onOpenContent={onOpenContent}
        hideOpenAction={hideOpenAction}
      />
    );
  }

  if (contentType === "phone" || /^tel:/i.test(clean)) {
    return <PhoneContentCard content={clean} onOpenContent={onOpenContent} />;
  }

  if (contentType === "email" || /^mailto:/i.test(clean)) {
    return <EmailContentCard content={clean} onOpenContent={onOpenContent} />;
  }

  if (contentType === "url") {
    return (
      <WebsiteContentCard
        content={clean}
        onOpenContent={onOpenContent}
        hideOpenAction={hideOpenAction}
      />
    );
  }

  return <TextContentCard content={clean} />;
});

const styles = StyleSheet.create({
  card: { borderRadius: 18, padding: 14, marginBottom: 12, borderWidth: 1, gap: 10 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  headerTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  badgeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  domain: { fontSize: 15, fontFamily: "Inter_700Bold", flex: 1 },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  copyText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  rawBox: { borderRadius: 12, padding: 12, borderWidth: 1, gap: 6 },
  rawText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  expand: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  urlStrip: { borderRadius: 10, paddingVertical: 9, paddingHorizontal: 11, borderWidth: 1 },
  urlText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  openBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    paddingVertical: 11,
    borderWidth: 1,
  },
  openLabel: { fontSize: 13, fontFamily: "Inter_700Bold" },

  // ── Payment Card Styles ──────────────────────────────────────────────────
  paymentBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  paymentIconRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentBannerTextCol: { flex: 1, gap: 2 },
  paymentBannerTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  paymentBannerSub: { fontSize: 12, fontFamily: "Inter_500Medium" },

  amountBox: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  amountLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  alertPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  alertPillText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  amountValue: { fontSize: 24, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  amountHint: { fontSize: 11, fontFamily: "Inter_400Regular" },

  openAmountBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  openAmountText: { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },

  detailsCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  detailLabel: { fontSize: 12, fontFamily: "Inter_500Medium", flexShrink: 0 },
  detailValue: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1, textAlign: "right" },
  addressWrap: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1, justifyContent: "flex-end" },
  addressText: { fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "right", flexShrink: 1 },
  miniCopyBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  advisoryBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  advisoryText: { fontSize: 11, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 16 },

  actionButtonGroup: {
    flexDirection: "column",
    gap: 8,
    marginTop: 4,
  },
  payPrimaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 13,
  },
  payPrimaryText: { color: "#FFFFFF", fontSize: 14, fontFamily: "Inter_700Bold" },
  paySecondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 14,
    paddingVertical: 11,
    borderWidth: 1,
  },
  paySecondaryText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
