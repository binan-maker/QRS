import React from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import type { ParsedPaymentQr } from "@/lib/qr-analysis";
import Colors from "@/constants/colors";

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

function getPaymentAppIcon(appId: string): keyof typeof Ionicons.glyphMap {
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

  return (
    <View style={styles.contentCard}>
      <View style={styles.contentHeader}>
        <View style={[styles.typeIcon, { backgroundColor: Colors.dark.primaryDim }]}>
          <Ionicons name={typeIcon} size={24} color={Colors.dark.primary} />
        </View>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{typeLabel.toUpperCase()}</Text>
        </View>
      </View>

      <Text style={styles.contentText} selectable numberOfLines={4}>{content}</Text>

      {/* ── Wi-Fi detail card ── */}
      {wifi ? (
        <View style={styles.infoCard}>
          <InfoRow label="Network" value={wifi.ssid} />
          <InfoRow label="Security" value={wifi.security} />
          {wifi.password ? <InfoRow label="Password" value={wifi.password} selectable /> : null}
          {wifi.hidden ? <InfoRow label="Hidden" value="Yes" /> : null}
        </View>
      ) : null}

      {/* ── Contact / vCard detail card ── */}
      {contact && (contact.name || contact.phone || contact.email) ? (
        <View style={styles.infoCard}>
          {contact.name ? <InfoRow label="Name" value={contact.name} /> : null}
          {contact.org ? <InfoRow label="Org" value={contact.org} /> : null}
          {contact.phone ? <InfoRow label="Phone" value={contact.phone} selectable /> : null}
          {contact.email ? <InfoRow label="Email" value={contact.email} selectable /> : null}
          {contact.url ? <InfoRow label="Website" value={contact.url} selectable /> : null}
        </View>
      ) : null}

      {/* ── SMS detail card ── */}
      {smsData && (smsData.to || smsData.body) ? (
        <View style={styles.infoCard}>
          {smsData.to ? <InfoRow label="To" value={smsData.to} /> : null}
          {smsData.body ? <InfoRow label="Message" value={smsData.body} /> : null}
        </View>
      ) : null}

      {/* ── Calendar Event detail card ── */}
      {eventData && eventData.summary ? (
        <View style={styles.infoCard}>
          <InfoRow label="Event" value={eventData.summary} />
          {eventData.dtstart ? <InfoRow label="When" value={formatEventDate(eventData.dtstart)} /> : null}
          {eventData.location ? <InfoRow label="Where" value={eventData.location} /> : null}
          {eventData.description ? <InfoRow label="Details" value={eventData.description} /> : null}
        </View>
      ) : null}

      {/* ── Payment detail card ── */}
      {contentType === "payment" && parsedPayment && !isDeactivated ? (
        <View style={styles.infoCard}>
          <View style={styles.paymentRow}>
            <Text style={styles.infoLabel}>App</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1, justifyContent: "flex-end" }}>
              <Text style={[styles.infoValue, { color: Colors.dark.primary }]} numberOfLines={1}>
                {parsedPayment.appDisplayName}
              </Text>
              <View style={styles.regionBadge}>
                <Text style={styles.regionBadgeText}>{parsedPayment.region}</Text>
              </View>
            </View>
          </View>
          {parsedPayment.recipientName ? <InfoRow label="Payee" value={parsedPayment.recipientName} /> : null}
          {parsedPayment.appCategory === "upi_india" && parsedPayment.vpa ? (
            <>
              <InfoRow label="UPI ID" value={parsedPayment.vpa} selectable />
              {parsedPayment.bankHandle ? <InfoRow label="Bank" value={`@${parsedPayment.bankHandle}`} /> : null}
            </>
          ) : null}
          {parsedPayment.appCategory === "crypto" && parsedPayment.recipientId ? (
            <View style={styles.paymentRow}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text selectable numberOfLines={2} style={styles.cryptoAddress}>{parsedPayment.recipientId}</Text>
            </View>
          ) : null}
          {parsedPayment.appCategory !== "upi_india" && parsedPayment.appCategory !== "crypto" && parsedPayment.recipientId && !parsedPayment.recipientName ? (
            <InfoRow label="To" value={parsedPayment.recipientId} selectable />
          ) : null}
          {parsedPayment.isAmountPreFilled && parsedPayment.amount ? (
            <View style={styles.paymentRow}>
              <Text style={styles.infoLabel}>Amount</Text>
              <Text style={[styles.infoValue, { color: Colors.dark.warning, fontFamily: "Inter_700Bold" }]}>
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
          {parsedPayment.note ? <InfoRow label="Note" value={parsedPayment.note} /> : null}

          <Pressable onPress={onOpenContent} style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.8 : 1 }]}>
            <Ionicons name={getPaymentAppIcon(parsedPayment.app) as any} size={18} color="#000" />
            <Text style={styles.actionBtnText}>
              {parsedPayment.appCategory === "crypto"
                ? `Open in ${parsedPayment.appDisplayName} Wallet`
                : `Pay with ${parsedPayment.appDisplayName}`}
            </Text>
          </Pressable>
          <Text style={styles.warningText}>
            {parsedPayment.appCategory === "crypto"
              ? "Crypto is irreversible — verify the address character by character"
              : parsedPayment.appCategory === "upi_india"
              ? "Verify the payee name and UPI ID before paying"
              : "Always verify the recipient before sending money"}
          </Text>
        </View>
      ) : contentType === "payment" && !parsedPayment && !isDeactivated ? (
        <Pressable onPress={onOpenContent} style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.8 : 1 }]}>
          <Ionicons name="card-outline" size={18} color="#000" />
          <Text style={styles.actionBtnText}>Open Payment</Text>
        </Pressable>
      ) : null}

      {/* ── Action row for all non-payment types ── */}
      {contentType !== "payment" ? (
        <View style={styles.actionRow}>
          {hasOpenAction ? (
            <Pressable onPress={onOpenContent} style={({ pressed }) => [styles.openBtn, { opacity: pressed ? 0.8 : 1 }]}>
              <Ionicons name="open-outline" size={16} color={Colors.dark.primary} />
              <Text style={styles.openBtnText}>{openLabel}</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={handleCopy} style={({ pressed }) => [styles.copyIconBtn, { opacity: pressed ? 0.75 : 1 }]}>
            <Ionicons name="copy-outline" size={17} color={Colors.dark.textSecondary} />
          </Pressable>
          {copied ? <Text style={styles.copiedToast}>Copied!</Text> : null}
        </View>
      ) : null}
    </View>
  );
});

function InfoRow({ label, value, selectable }: { label: string; value: string; selectable?: boolean }) {
  return (
    <View style={styles.paymentRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} selectable={selectable} numberOfLines={2}>{value}</Text>
    </View>
  );
}

export default ContentCard;

const styles = StyleSheet.create({
  contentCard: {
    backgroundColor: Colors.dark.surface, borderRadius: 16, padding: 18,
    marginBottom: 16, borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  contentHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  typeIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  typeBadge: { backgroundColor: Colors.dark.primaryDim, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  typeBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold", color: Colors.dark.primary, letterSpacing: 0.5 },
  contentText: {
    fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.dark.text,
    lineHeight: 22, marginBottom: 14, letterSpacing: 0.2,
  },
  infoCard: {
    backgroundColor: Colors.dark.surfaceLight, borderRadius: 14, padding: 14, gap: 8, marginBottom: 12,
  },
  paymentRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  infoLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted, minWidth: 64 },
  infoValue: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.dark.text, flex: 1, textAlign: "right" },
  regionBadge: { backgroundColor: Colors.dark.primaryDim, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  regionBadgeText: { color: Colors.dark.primary, fontSize: 10, fontFamily: "Inter_600SemiBold" },
  cryptoAddress: {
    flex: 1, textAlign: "right", fontSize: 11, fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary, letterSpacing: 0.3,
  },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  openBtn: {
    flexDirection: "row", alignItems: "center", gap: 8, flex: 1,
    backgroundColor: Colors.dark.primaryDim, borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 16,
  },
  openBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.dark.primary },
  copyIconBtn: {
    width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.dark.surfaceLight,
  },
  copiedToast: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.dark.safe },
  actionBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: Colors.dark.primary, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 20, marginTop: 4,
  },
  actionBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#000" },
  warningText: {
    fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted,
    textAlign: "center", lineHeight: 18, marginTop: 4,
  },
});
