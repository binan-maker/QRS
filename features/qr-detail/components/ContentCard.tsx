import React from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "@/lib/haptics";
import type { ParsedPaymentQr } from "@/lib/qr-analysis";
import { useTheme } from "@/contexts/ThemeContext";
import PaymentCard from "./PaymentCard";

const TYPE_CONFIG: Record<string, {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  gradient: [string, string];
  openLabel: string;
}> = {
  url:      { icon: "globe-outline",       label: "URL",              gradient: ["#006FFF", "#00E5FF"], openLabel: "Open Link" },
  phone:    { icon: "call-outline",        label: "Phone Number",     gradient: ["#00D68F", "#00E5FF"], openLabel: "Call Number" },
  email:    { icon: "mail-outline",        label: "Email",            gradient: ["#B060FF", "#FF4D6A"], openLabel: "Send Email" },
  wifi:     { icon: "wifi-outline",        label: "Wi-Fi Network",    gradient: ["#006FFF", "#B060FF"], openLabel: "Connect to Wi-Fi" },
  location: { icon: "location-outline",    label: "Location",         gradient: ["#FF4D6A", "#FFB800"], openLabel: "Open in Maps" },
  payment:  { icon: "card-outline",        label: "Payment",          gradient: ["#FFB800", "#FF4D6A"], openLabel: "Open Payment" },
  sms:      { icon: "chatbubble-outline",  label: "SMS Message",      gradient: ["#00E5FF", "#006FFF"], openLabel: "Send SMS" },
  contact:  { icon: "person-outline",      label: "Contact Card",     gradient: ["#00D68F", "#006FFF"], openLabel: "Save Contact" },
  event:    { icon: "calendar-outline",    label: "Calendar Event",   gradient: ["#FFB800", "#B060FF"], openLabel: "Add to Calendar" },
  otp:      { icon: "lock-closed-outline", label: "OTP / 2FA Setup",  gradient: ["#B060FF", "#00E5FF"], openLabel: "Open Authenticator" },
  app:      { icon: "apps-outline",        label: "App Link",         gradient: ["#00E5FF", "#B060FF"], openLabel: "Open App" },
  social:   { icon: "people-outline",      label: "Social Profile",   gradient: ["#B060FF", "#FF4D6A"], openLabel: "Open Profile" },
  media:    { icon: "play-circle-outline", label: "Media",            gradient: ["#FF4D6A", "#B060FF"], openLabel: "Play Media" },
  document: { icon: "document-outline",    label: "Document",         gradient: ["#3D6080", "#7BA7CC"], openLabel: "Open Document" },
  boarding: { icon: "airplane-outline",    label: "Boarding Pass",    gradient: ["#006FFF", "#B060FF"], openLabel: "View Boarding Pass" },
  product:  { icon: "barcode-outline",     label: "Product",          gradient: ["#00D68F", "#FFB800"], openLabel: "View Product" },
  text:     { icon: "document-text-outline", label: "Text",           gradient: ["#3D6080", "#7BA7CC"], openLabel: "Open" },
};

function getTypeCfg(type: string) {
  return TYPE_CONFIG[type] ?? TYPE_CONFIG.text;
}

function parseWifi(content: string) {
  try {
    const ssid = content.match(/S:([^;]*)/)?.[1] ?? "";
    const password = content.match(/P:([^;]*)/)?.[1] ?? "";
    const security = content.match(/T:([^;]*)/)?.[1] ?? "WPA";
    const hidden = content.includes("H:true");
    if (!ssid) return null;
    return { ssid, password, security, hidden };
  } catch { return null; }
}

function parseContact(content: string) {
  const r = { name: "", phone: "", email: "", org: "", url: "" };
  if (content.startsWith("BEGIN:VCARD")) {
    r.name = content.match(/FN:([^\r\n]+)/)?.[1] ?? content.match(/N:([^\r\n]+)/)?.[1] ?? "";
    r.phone = content.match(/TEL[^:]*:([^\r\n]+)/)?.[1] ?? "";
    r.email = content.match(/EMAIL[^:]*:([^\r\n]+)/)?.[1] ?? "";
    r.org = content.match(/ORG:([^\r\n]+)/)?.[1] ?? "";
    r.url = content.match(/URL:([^\r\n]+)/)?.[1] ?? "";
  } else if (content.toLowerCase().startsWith("mecard:")) {
    r.name = content.match(/N:([^;]+)/)?.[1] ?? "";
    r.phone = content.match(/TEL:([^;]+)/)?.[1] ?? "";
    r.email = content.match(/EMAIL:([^;]+)/)?.[1] ?? "";
  }
  return r;
}

function parseSms(content: string) {
  try {
    const url = new URL(content);
    const to = url.pathname.replace(/^\//, "");
    const body = url.searchParams.get("body") ?? "";
    return { to, body };
  } catch { return { to: content.replace(/^sms[to]*:/i, "").split("?")[0], body: "" }; }
}

function parseEvent(content: string) {
  return {
    summary: content.match(/SUMMARY:([^\r\n]+)/)?.[1] ?? "",
    dtstart: content.match(/DTSTART[^:]*:([^\r\n]+)/)?.[1] ?? "",
    location: content.match(/LOCATION:([^\r\n]+)/)?.[1] ?? "",
    description: content.match(/DESCRIPTION:([^\r\n]+)/)?.[1] ?? "",
  };
}

function formatEventDate(dt: string): string {
  if (!dt) return "";
  try {
    const y = dt.slice(0, 4), mo = dt.slice(4, 6), d = dt.slice(6, 8);
    const h = dt.slice(9, 11), mi = dt.slice(11, 13);
    return new Date(`${y}-${mo}-${d}T${h || "00"}:${mi || "00"}`).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch { return dt; }
}

function extractBasicPaymentInfo(content: string) {
  try {
    return {
      vpa: content.match(/pa=([^&\s]+)/i)?.[1] ? decodeURIComponent(content.match(/pa=([^&\s]+)/i)![1]) : undefined,
      name: content.match(/pn=([^&\s]+)/i)?.[1] ? decodeURIComponent(content.match(/pn=([^&\s]+)/i)![1]) : undefined,
      amount: content.match(/(?:\bam|amount)=([^&\s]+)/i)?.[1] ? decodeURIComponent(content.match(/(?:\bam|amount)=([^&\s]+)/i)![1]) : undefined,
      currency: content.match(/cu=([^&\s]+)/i)?.[1] ? decodeURIComponent(content.match(/cu=([^&\s]+)/i)![1]) : undefined,
    };
  } catch { return {}; }
}

interface Props {
  content: string;
  contentType: string;
  parsedPayment: ParsedPaymentQr | null;
  isDeactivated: boolean;
  onOpenContent: () => void;
}

const EXPAND_THRESHOLD = 120;

const ContentCard = React.memo(function ContentCard({ content, contentType, parsedPayment, isDeactivated, onOpenContent }: Props) {
  const { colors, isDark } = useTheme();
  const [copied, setCopied] = React.useState(false);
  const [contentExpanded, setContentExpanded] = React.useState(false);

  const isLongContent = content.length > EXPAND_THRESHOLD || content.includes("\n");
  const cfg = getTypeCfg(contentType);
  const hasOpenAction = !isDeactivated && contentType !== "text" && contentType !== "product";

  async function handleCopy() {
    await Clipboard.setStringAsync(content);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (Platform.OS !== "android") {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const wifi = contentType === "wifi" ? parseWifi(content) : null;
  const contact = contentType === "contact" ? parseContact(content) : null;
  const smsData = contentType === "sms" ? parseSms(content) : null;
  const eventData = contentType === "event" ? parseEvent(content) : null;
  const basicPayment = (contentType === "payment" && !parsedPayment) ? extractBasicPaymentInfo(content) : null;
  const isEmvContent = content.startsWith("000201") || content.startsWith("00020");

  if (contentType === "payment") {
    const paymentData: ParsedPaymentQr = parsedPayment ?? (isEmvContent ? {
      app: "emv_generic", appDisplayName: "Bank Merchant QR", appCategory: "emv",
      region: "Regional", recipientId: "", rawContent: content, isAmountPreFilled: false,
    } : {
      app: "upi", appDisplayName: "UPI Payment", appCategory: "upi_india", region: "India",
      recipientId: basicPayment?.vpa || "", recipientName: basicPayment?.name,
      amount: basicPayment?.amount, currency: basicPayment?.currency || "INR",
      rawContent: content, isAmountPreFilled: !!basicPayment?.amount, vpa: basicPayment?.vpa,
    });
    return <View><PaymentCard parsedPayment={paymentData} isDeactivated={isDeactivated} onOpenContent={onOpenContent} /></View>;
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
      <LinearGradient
        colors={[cfg.gradient[0] + (isDark ? "18" : "10"), "transparent"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Hero icon */}
      <View style={styles.heroCenter}>
        <LinearGradient colors={cfg.gradient} style={styles.heroIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Ionicons name={cfg.icon} size={36} color="#fff" />
        </LinearGradient>
        <LinearGradient colors={cfg.gradient} style={styles.typePill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <Text style={styles.typePillText}>{cfg.label.toUpperCase()}</Text>
        </LinearGradient>
      </View>

      {/* Content text — hidden for URL type (open button is the action) */}
      {contentType !== "url" && (
        <View style={[styles.contentBox, { backgroundColor: isDark ? colors.surfaceLight : colors.background, borderColor: colors.surfaceBorder }]}>
          <Text style={[styles.contentText, { color: colors.text }]} selectable numberOfLines={contentExpanded ? undefined : 4}>
            {content}
          </Text>
          {isLongContent && (
            <Pressable onPress={() => setContentExpanded(v => !v)} style={styles.expandBtn}>
              <Text style={[styles.expandBtnText, { color: cfg.gradient[0] }]}>{contentExpanded ? "Show less" : "Show more"}</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* URL display — clean domain pill instead of raw text */}
      {contentType === "url" && (
        <View style={[styles.urlBox, { backgroundColor: isDark ? colors.surfaceLight : colors.background, borderColor: colors.surfaceBorder }]}>
          <Ionicons name="link-outline" size={14} color={cfg.gradient[0]} />
          <Text style={[styles.urlText, { color: colors.textSecondary }]} numberOfLines={1} selectable>
            {(() => { try { return new URL(content.startsWith("http") ? content : `https://${content}`).hostname.replace(/^www\./, ""); } catch { return content; } })()}
          </Text>
        </View>
      )}

      {/* Parsed info rows */}
      {wifi && (
        <View style={[styles.infoGrid, { backgroundColor: isDark ? colors.surfaceLight : colors.background, borderColor: colors.surfaceBorder }]}>
          <InfoRow label="Network" value={wifi.ssid} gradient={cfg.gradient} colors={colors} />
          <InfoRow label="Security" value={wifi.security} gradient={cfg.gradient} colors={colors} />
          {wifi.password ? <InfoRow label="Password" value={wifi.password} selectable gradient={cfg.gradient} colors={colors} /> : null}
          {wifi.hidden ? <InfoRow label="Hidden" value="Yes" gradient={cfg.gradient} colors={colors} /> : null}
        </View>
      )}
      {contact && (contact.name || contact.phone || contact.email) && (
        <View style={[styles.infoGrid, { backgroundColor: isDark ? colors.surfaceLight : colors.background, borderColor: colors.surfaceBorder }]}>
          {contact.name ? <InfoRow label="Name" value={contact.name} gradient={cfg.gradient} colors={colors} /> : null}
          {contact.org ? <InfoRow label="Org" value={contact.org} gradient={cfg.gradient} colors={colors} /> : null}
          {contact.phone ? <InfoRow label="Phone" value={contact.phone} selectable gradient={cfg.gradient} colors={colors} /> : null}
          {contact.email ? <InfoRow label="Email" value={contact.email} selectable gradient={cfg.gradient} colors={colors} /> : null}
          {contact.url ? <InfoRow label="Website" value={contact.url} selectable gradient={cfg.gradient} colors={colors} /> : null}
        </View>
      )}
      {smsData && (smsData.to || smsData.body) && (
        <View style={[styles.infoGrid, { backgroundColor: isDark ? colors.surfaceLight : colors.background, borderColor: colors.surfaceBorder }]}>
          {smsData.to ? <InfoRow label="To" value={smsData.to} gradient={cfg.gradient} colors={colors} /> : null}
          {smsData.body ? <InfoRow label="Message" value={smsData.body} gradient={cfg.gradient} colors={colors} /> : null}
        </View>
      )}
      {eventData && eventData.summary && (
        <View style={[styles.infoGrid, { backgroundColor: isDark ? colors.surfaceLight : colors.background, borderColor: colors.surfaceBorder }]}>
          <InfoRow label="Event" value={eventData.summary} gradient={cfg.gradient} colors={colors} />
          {eventData.dtstart ? <InfoRow label="When" value={formatEventDate(eventData.dtstart)} gradient={cfg.gradient} colors={colors} /> : null}
          {eventData.location ? <InfoRow label="Where" value={eventData.location} gradient={cfg.gradient} colors={colors} /> : null}
          {eventData.description ? <InfoRow label="Details" value={eventData.description} gradient={cfg.gradient} colors={colors} /> : null}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actionRow}>
        {hasOpenAction && (
          <Pressable onPress={onOpenContent} style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.85 : 1 }]}>
            <LinearGradient colors={cfg.gradient} style={styles.openBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Ionicons name="open-outline" size={17} color="#fff" />
              <Text style={styles.openBtnText}>{cfg.openLabel}</Text>
            </LinearGradient>
          </Pressable>
        )}
        <Pressable
          onPress={handleCopy}
          style={({ pressed }) => [styles.copyBtn, { backgroundColor: isDark ? colors.surfaceLight : colors.background, borderColor: colors.surfaceBorder, opacity: pressed ? 0.75 : 1 }]}
        >
          <Ionicons name={copied ? "checkmark" : "copy-outline"} size={18} color={copied ? "#10B981" : colors.textSecondary} />
          {copied && <Text style={styles.copiedText}>Copied!</Text>}
        </Pressable>
      </View>
    </View>
  );
});

function InfoRow({ label, value, selectable, gradient, colors }: { label: string; value: string; selectable?: boolean; gradient: [string, string]; colors: any }) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: gradient[0] }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]} selectable={selectable} numberOfLines={2}>{value}</Text>
    </View>
  );
}

export default ContentCard;

const styles = StyleSheet.create({
  card: {
    borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, overflow: "hidden", gap: 16,
  },
  heroCenter: { alignItems: "center", gap: 12, paddingVertical: 8 },
  heroIcon: {
    width: 80, height: 80, borderRadius: 26,
    alignItems: "center", justifyContent: "center",
  },
  typePill: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 100 },
  typePillText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: 1 },
  contentBox: {
    borderRadius: 16, padding: 14, borderWidth: 1, gap: 8,
  },
  urlBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1,
  },
  urlText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  contentText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22, letterSpacing: 0.2 },
  expandBtn: { alignSelf: "flex-start" },
  expandBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  infoGrid: {
    borderRadius: 16, padding: 14, gap: 10, borderWidth: 1,
  },
  infoRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  infoLabel: { fontSize: 12, fontFamily: "Inter_700Bold", minWidth: 70, letterSpacing: 0.3 },
  infoValue: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1, textAlign: "right" },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  openBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 18,
  },
  openBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
  copyBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    height: 50, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1,
  },
  copiedText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#10B981" },
});
