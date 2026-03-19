import React from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import type { ParsedPaymentQr } from "@/lib/qr-analysis";
import { useTheme } from "@/contexts/ThemeContext";
import PaymentCard from "./PaymentCard";

function getTypeIcon(contentType: string): keyof typeof Ionicons.glyphMap {
  switch (contentType) {
    case "url":       return "link-outline";
    case "phone":     return "call-outline";
    case "email":     return "mail-outline";
    case "wifi":      return "wifi-outline";
    case "location":  return "location-outline";
    case "payment":   return "card-outline";
    case "sms":       return "chatbubble-outline";
    case "contact":   return "person-outline";
    case "event":     return "calendar-outline";
    case "otp":       return "lock-closed-outline";
    case "app":       return "apps-outline";
    case "social":    return "people-outline";
    case "media":     return "play-circle-outline";
    case "document":  return "document-outline";
    case "boarding":  return "airplane-outline";
    case "product":   return "barcode-outline";
    case "text":      return "document-text-outline";
    default:          return "qr-code-outline";
  }
}

function getTypeLabel(contentType: string): string {
  switch (contentType) {
    case "url":       return "URL";
    case "phone":     return "Phone Number";
    case "email":     return "Email";
    case "wifi":      return "Wi-Fi Network";
    case "location":  return "Location";
    case "payment":   return "Payment";
    case "sms":       return "SMS Message";
    case "contact":   return "Contact Card";
    case "event":     return "Calendar Event";
    case "otp":       return "OTP / 2FA Setup";
    case "app":       return "App Link";
    case "social":    return "Social Profile";
    case "media":     return "Media";
    case "document":  return "Document";
    case "boarding":  return "Boarding Pass";
    case "product":   return "Product / Barcode";
    default:          return "Text";
  }
}

function getOpenLabel(contentType: string): string {
  switch (contentType) {
    case "url":       return "Open Link";
    case "phone":     return "Call Number";
    case "email":     return "Send Email";
    case "wifi":      return "Connect to Wi-Fi";
    case "location":  return "Open in Maps";
    case "sms":       return "Send SMS";
    case "contact":   return "Save Contact";
    case "event":     return "Add to Calendar";
    case "otp":       return "Open Authenticator";
    case "app":       return "Open App / Store";
    case "social":    return "Open Profile";
    case "media":     return "Play Media";
    case "document":  return "Open Document";
    case "boarding":  return "View Boarding Pass";
    case "product":   return "View Product";
    default:          return "Open";
  }
}

function parseWifi(content: string): { ssid: string; password: string; security: string; hidden: boolean } | null {
  try {
    const ssid = content.match(/S:([^;]*)/)?.[1] ?? "";
    const password = content.match(/P:([^;]*)/)?.[1] ?? "";
    const security = content.match(/T:([^;]*)/)?.[1] ?? "WPA";
    const hidden = content.includes("H:true");
    if (!ssid) return null;
    return { ssid, password, security, hidden };
  } catch { return null; }
}

function parseContact(content: string): { name: string; phone: string; email: string; org: string; url: string } {
  const result = { name: "", phone: "", email: "", org: "", url: "" };
  if (content.startsWith("BEGIN:VCARD")) {
    result.name = content.match(/FN:([^\r\n]+)/)?.[1] ?? content.match(/N:([^\r\n]+)/)?.[1] ?? "";
    result.phone = content.match(/TEL[^:]*:([^\r\n]+)/)?.[1] ?? "";
    result.email = content.match(/EMAIL[^:]*:([^\r\n]+)/)?.[1] ?? "";
    result.org = content.match(/ORG:([^\r\n]+)/)?.[1] ?? "";
    result.url = content.match(/URL:([^\r\n]+)/)?.[1] ?? "";
  } else if (content.toLowerCase().startsWith("mecard:")) {
    result.name = content.match(/N:([^;]+)/)?.[1] ?? "";
    result.phone = content.match(/TEL:([^;]+)/)?.[1] ?? "";
    result.email = content.match(/EMAIL:([^;]+)/)?.[1] ?? "";
  }
  return result;
}

function parseSms(content: string): { to: string; body: string } {
  try {
    const url = new URL(content);
    const to = url.pathname.replace(/^\//, "");
    const body = url.searchParams.get("body") ?? "";
    return { to, body };
  } catch { return { to: content.replace(/^sms[to]*:/i, "").split("?")[0], body: "" }; }
}

function parseEvent(content: string): { summary: string; dtstart: string; location: string; description: string } {
  const summary = content.match(/SUMMARY:([^\r\n]+)/)?.[1] ?? "";
  const dtstart = content.match(/DTSTART[^:]*:([^\r\n]+)/)?.[1] ?? "";
  const location = content.match(/LOCATION:([^\r\n]+)/)?.[1] ?? "";
  const description = content.match(/DESCRIPTION:([^\r\n]+)/)?.[1] ?? "";
  return { summary, dtstart, location, description };
}

function formatEventDate(dt: string): string {
  if (!dt) return "";
  try {
    const y = dt.slice(0, 4), mo = dt.slice(4, 6), d = dt.slice(6, 8);
    const h = dt.slice(9, 11), mi = dt.slice(11, 13);
    const date = new Date(`${y}-${mo}-${d}T${h || "00"}:${mi || "00"}`);
    return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch { return dt; }
}

interface Props {
  content: string;
  contentType: string;
  parsedPayment: ParsedPaymentQr | null;
  isDeactivated: boolean;
  onOpenContent: () => void;
}

function extractBasicPaymentInfo(content: string): { vpa?: string; name?: string; amount?: string; currency?: string } {
  try {
    const vpa = content.match(/pa=([^&\s]+)/i)?.[1];
    const name = content.match(/pn=([^&\s]+)/i)?.[1];
    const amount = content.match(/(?:\bam|amount)=([^&\s]+)/i)?.[1];
    const cu = content.match(/cu=([^&\s]+)/i)?.[1];
    return {
      vpa: vpa ? decodeURIComponent(vpa) : undefined,
      name: name ? decodeURIComponent(name) : undefined,
      amount: amount ? decodeURIComponent(amount) : undefined,
      currency: cu ? decodeURIComponent(cu) : undefined,
    };
  } catch { return {}; }
}

const EXPAND_THRESHOLD = 120;

const ContentCard = React.memo(function ContentCard({
  content,
  contentType,
  parsedPayment,
  isDeactivated,
  onOpenContent,
}: Props) {
  const { colors } = useTheme();
  const [copied, setCopied] = React.useState(false);
  const [contentExpanded, setContentExpanded] = React.useState(false);

  const isLongContent = content.length > EXPAND_THRESHOLD || content.includes("\n");

  async function handleCopy() {
    await Clipboard.setStringAsync(content);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (Platform.OS !== "android") {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const hasOpenAction = !isDeactivated && contentType !== "text" && contentType !== "product";
  const openLabel = getOpenLabel(contentType);
  const typeLabel = getTypeLabel(contentType);
  const typeIcon = getTypeIcon(contentType);

  const wifi = contentType === "wifi" ? parseWifi(content) : null;
  const contact = contentType === "contact" ? parseContact(content) : null;
  const smsData = contentType === "sms" ? parseSms(content) : null;
  const eventData = contentType === "event" ? parseEvent(content) : null;

  const basicPayment = (contentType === "payment" && !parsedPayment) ? extractBasicPaymentInfo(content) : null;

  if (contentType === "payment") {
    const paymentData: ParsedPaymentQr = parsedPayment ?? {
      app: "upi",
      appDisplayName: "UPI Payment",
      appCategory: "upi_india",
      region: "India",
      recipientId: basicPayment?.vpa || "",
      recipientName: basicPayment?.name,
      amount: basicPayment?.amount,
      currency: basicPayment?.currency || "INR",
      rawContent: content,
      isAmountPreFilled: !!basicPayment?.amount,
      vpa: basicPayment?.vpa,
    };
    return (
      <View>
        <PaymentCard
          parsedPayment={paymentData}
          isDeactivated={isDeactivated}
          onOpenContent={onOpenContent}
        />
        <Pressable
          onPress={() => setContentExpanded((v) => !v)}
          style={({ pressed }) => [{
            flexDirection: "row", alignItems: "center", gap: 6,
            backgroundColor: colors.surfaceLight, borderRadius: 10,
            paddingHorizontal: 12, paddingVertical: 8, marginBottom: 16,
            borderWidth: 1, borderColor: colors.surfaceBorder,
            opacity: pressed ? 0.8 : 1,
          }]}
        >
          <Ionicons name="code-outline" size={13} color={colors.textMuted} />
          <View style={{ flex: 1 }}>
            <Text
              style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: colors.textMuted, letterSpacing: 0.2, lineHeight: 16 }}
              selectable
              numberOfLines={contentExpanded ? undefined : 2}
            >{content}</Text>
            {!contentExpanded && (
              <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: colors.textMuted, marginTop: 3, letterSpacing: 1 }}>• • •  tap to expand full QR data</Text>
            )}
          </View>
          <Ionicons
            name={contentExpanded ? "chevron-up" : "chevron-down"}
            size={14}
            color={colors.textMuted}
          />
          <Pressable onPress={(e) => { e.stopPropagation?.(); handleCopy(); }} style={[styles.copyIconBtnSmall, { backgroundColor: colors.surfaceBorder }]}>
            <Ionicons
              name={copied ? "checkmark" : "copy-outline"}
              size={13}
              color={copied ? colors.safe : colors.textMuted}
            />
          </Pressable>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.contentCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
      <View style={styles.contentHeader}>
        <View style={[styles.typeIcon, { backgroundColor: colors.primaryDim }]}>
          <Ionicons name={typeIcon} size={24} color={colors.primary} />
        </View>
        <View style={[styles.typeBadge, { backgroundColor: colors.primaryDim }]}>
          <Text style={[styles.typeBadgeText, { color: colors.primary }]}>{typeLabel.toUpperCase()}</Text>
        </View>
      </View>

      <Text
        style={[styles.contentText, { color: colors.text }, !isLongContent && styles.contentTextSpaced]}
        selectable
        numberOfLines={contentExpanded ? undefined : 3}
      >{content}</Text>
      {isLongContent && (
        <Pressable onPress={() => setContentExpanded((v) => !v)} style={styles.expandBtn}>
          <Text style={[styles.expandBtnText, { color: colors.primary }]}>{contentExpanded ? "Show less" : "Show more"}</Text>
        </Pressable>
      )}

      {wifi ? (
        <View style={[styles.infoCard, { backgroundColor: colors.surfaceLight }]}>
          <InfoRow label="Network" value={wifi.ssid} colors={colors} />
          <InfoRow label="Security" value={wifi.security} colors={colors} />
          {wifi.password ? <InfoRow label="Password" value={wifi.password} selectable colors={colors} /> : null}
          {wifi.hidden ? <InfoRow label="Hidden" value="Yes" colors={colors} /> : null}
        </View>
      ) : null}

      {contact && (contact.name || contact.phone || contact.email) ? (
        <View style={[styles.infoCard, { backgroundColor: colors.surfaceLight }]}>
          {contact.name ? <InfoRow label="Name" value={contact.name} colors={colors} /> : null}
          {contact.org ? <InfoRow label="Org" value={contact.org} colors={colors} /> : null}
          {contact.phone ? <InfoRow label="Phone" value={contact.phone} selectable colors={colors} /> : null}
          {contact.email ? <InfoRow label="Email" value={contact.email} selectable colors={colors} /> : null}
          {contact.url ? <InfoRow label="Website" value={contact.url} selectable colors={colors} /> : null}
        </View>
      ) : null}

      {smsData && (smsData.to || smsData.body) ? (
        <View style={[styles.infoCard, { backgroundColor: colors.surfaceLight }]}>
          {smsData.to ? <InfoRow label="To" value={smsData.to} colors={colors} /> : null}
          {smsData.body ? <InfoRow label="Message" value={smsData.body} colors={colors} /> : null}
        </View>
      ) : null}

      {eventData && eventData.summary ? (
        <View style={[styles.infoCard, { backgroundColor: colors.surfaceLight }]}>
          <InfoRow label="Event" value={eventData.summary} colors={colors} />
          {eventData.dtstart ? <InfoRow label="When" value={formatEventDate(eventData.dtstart)} colors={colors} /> : null}
          {eventData.location ? <InfoRow label="Where" value={eventData.location} colors={colors} /> : null}
          {eventData.description ? <InfoRow label="Details" value={eventData.description} colors={colors} /> : null}
        </View>
      ) : null}

      <View style={styles.actionRow}>
        {hasOpenAction ? (
          <Pressable onPress={onOpenContent} style={({ pressed }) => [styles.openBtn, { backgroundColor: colors.primaryDim, opacity: pressed ? 0.8 : 1 }]}>
            <Ionicons name="open-outline" size={16} color={colors.primary} />
            <Text style={[styles.openBtnText, { color: colors.primary }]}>{openLabel}</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={handleCopy} style={({ pressed }) => [styles.copyIconBtn, { backgroundColor: colors.surfaceLight, opacity: pressed ? 0.75 : 1 }]}>
          <Ionicons name="copy-outline" size={17} color={colors.textSecondary} />
        </Pressable>
        {copied ? <Text style={[styles.copiedToast, { color: colors.safe }]}>Copied!</Text> : null}
      </View>
    </View>
  );
});

function InfoRow({ label, value, selectable, colors }: { label: string; value: string; selectable?: boolean; colors: any }) {
  return (
    <View style={styles.paymentRow}>
      <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]} selectable={selectable} numberOfLines={2}>{value}</Text>
    </View>
  );
}

export default ContentCard;

const styles = StyleSheet.create({
  contentCard: {
    borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1,
  },
  contentHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  typeIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  typeBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  typeBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  contentText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22, letterSpacing: 0.2 },
  contentTextSpaced: { marginBottom: 14 },
  expandBtn: { marginBottom: 14, marginTop: 4 },
  expandBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", textDecorationLine: "underline" },
  infoCard: { borderRadius: 14, padding: 14, gap: 8, marginBottom: 12 },
  paymentRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  infoLabel: { fontSize: 12, fontFamily: "Inter_400Regular", minWidth: 64 },
  infoValue: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1, textAlign: "right" },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  openBtn: {
    flexDirection: "row", alignItems: "center", gap: 8, flex: 1,
    borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16,
  },
  openBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  copyIconBtn: {
    width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center",
  },
  copiedToast: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  copyIconBtnSmall: {
    width: 26, height: 26, borderRadius: 7, alignItems: "center", justifyContent: "center",
  },
});
