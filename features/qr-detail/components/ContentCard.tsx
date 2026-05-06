import React from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "@/lib/haptics";
import type { ParsedPaymentQr } from "@/lib/qr-analysis";
import { useTheme } from "@/contexts/ThemeContext";
import PaymentCard from "./PaymentCard";
import type { AppColors } from "@/constants/colors";

type GradientPair = [string, string];

function getTypeCfg(type: string, colors: AppColors): {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  gradient: GradientPair;
  openLabel: string;
} {
  const primary: GradientPair = [colors.primary, colors.primaryShade];
  const safe: GradientPair = [colors.safe, colors.safeShade];
  const payment: GradientPair = [colors.warning, colors.warningShade];
  const danger: GradientPair = [colors.danger, colors.dangerShade];
  const neutral: GradientPair = [colors.textSecondary, colors.textMuted];

  const map: Record<string, { icon: keyof typeof Ionicons.glyphMap; label: string; gradient: GradientPair; openLabel: string }> = {
    url:      { icon: "globe-outline",         label: "Website URL",      gradient: primary,  openLabel: "Open Link"          },
    phone:    { icon: "call-outline",           label: "Phone Number",     gradient: safe,     openLabel: "Call Number"        },
    email:    { icon: "mail-outline",           label: "Email",            gradient: primary,  openLabel: "Send Email"         },
    wifi:     { icon: "wifi-outline",           label: "Wi-Fi Network",    gradient: primary,  openLabel: "Connect to Wi-Fi"  },
    location: { icon: "location-outline",       label: "Location",         gradient: danger,   openLabel: "Open in Maps"      },
    payment:  { icon: "card-outline",           label: "Payment",          gradient: payment,  openLabel: "Open Payment"      },
    sms:      { icon: "chatbubble-outline",     label: "SMS Message",      gradient: primary,  openLabel: "Send SMS"          },
    contact:  { icon: "person-outline",         label: "Contact Card",     gradient: primary,  openLabel: "Save Contact"      },
    event:    { icon: "calendar-outline",       label: "Calendar Event",   gradient: primary,  openLabel: "Add to Calendar"   },
    otp:      { icon: "lock-closed-outline",    label: "OTP / 2FA",        gradient: safe,     openLabel: "Open Authenticator"},
    app:      { icon: "apps-outline",           label: "App Link",         gradient: primary,  openLabel: "Open App"          },
    social:   { icon: "people-outline",         label: "Social Profile",   gradient: primary,  openLabel: "Open Profile"      },
    media:    { icon: "play-circle-outline",    label: "Media",            gradient: primary,  openLabel: "Play Media"        },
    document: { icon: "document-outline",       label: "Document",         gradient: neutral,  openLabel: "Open Document"     },
    boarding: { icon: "airplane-outline",       label: "Boarding Pass",    gradient: primary,  openLabel: "View Pass"         },
    product:  { icon: "barcode-outline",        label: "Product",          gradient: primary,  openLabel: "View Product"      },
    text:      { icon: "document-text-outline",  label: "Text",             gradient: neutral,   openLabel: "Open"              },
    encrypted: { icon: "key-outline",            label: "Encrypted Data",   gradient: [colors.warning, colors.warningShade], openLabel: "Open" },
  };
  return map[type] ?? map.text;
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
    dtend: content.match(/DTEND[^:]*:([^\r\n]+)/)?.[1] ?? "",
    location: content.match(/LOCATION:([^\r\n]+)/)?.[1] ?? "",
    description: content.match(/DESCRIPTION:([^\r\n]+)/)?.[1] ?? "",
  };
}

function icalToDate(dt: string): Date | null {
  if (!dt) return null;
  try {
    const y = dt.slice(0, 4), mo = dt.slice(4, 6), d = dt.slice(6, 8);
    const h = dt.slice(9, 11) || "00", mi = dt.slice(11, 13) || "00";
    return new Date(`${y}-${mo}-${d}T${h}:${mi}:00`);
  } catch { return null; }
}

function formatEventDate(dt: string): string {
  if (!dt) return "";
  const date = icalToDate(dt);
  if (!date) return dt;
  return date.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function formatEventTime(dt: string): string {
  if (!dt) return "";
  const date = icalToDate(dt);
  if (!date) return "";
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function isEventPast(dtend: string, dtstart: string): boolean {
  const ref = dtend || dtstart;
  if (!ref) return false;
  const date = icalToDate(ref);
  return date ? date < new Date() : false;
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
  hideOpenAction?: boolean;
}

const EXPAND_THRESHOLD = 120;

const ContentCard = React.memo(function ContentCard({ content, contentType, parsedPayment, isDeactivated, onOpenContent, hideOpenAction }: Props) {
  const { colors, isDark } = useTheme();
  const [copied, setCopied] = React.useState(false);
  const [contentExpanded, setContentExpanded] = React.useState(false);

  const isLongContent = content.length > EXPAND_THRESHOLD || content.includes("\n");
  const cfg = getTypeCfg(contentType, colors);
  const hasOpenAction = !isDeactivated && !hideOpenAction && contentType !== "text" && contentType !== "product";

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
  const eventOver = eventData ? isEventPast(eventData.dtend, eventData.dtstart) : false;
  const basicPayment = (contentType === "payment" && !parsedPayment) ? extractBasicPaymentInfo(content) : null;
  const isEmvContent = content.startsWith("000201") || content.startsWith("00020");

  if (contentType === "encrypted") {
    const preview = content.length > 40 ? content.slice(0, 40) + "…" : content;
    const isBase64 = /^[A-Za-z0-9+/]{20,}={0,2}$/.test(content.trim());
    const isHex = /^[0-9a-fA-F]{40,}$/.test(content.trim());
    const dataHint = isBase64 ? "Base64-encoded" : isHex ? "Hex-encoded" : "Proprietary";
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.warning + "40" }]}>
        <LinearGradient
          colors={[colors.warning + (isDark ? "18" : "0D"), "transparent"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.typeRow}>
          <LinearGradient colors={[colors.warning, colors.warningShade]} style={styles.typeIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Ionicons name="key-outline" size={18} color="#fff" />
          </LinearGradient>
          <Text style={[styles.typeLabel, { color: colors.text }]}>Encrypted Data</Text>
          <Pressable
            onPress={handleCopy}
            style={({ pressed }) => [
              styles.copyBtn,
              {
                backgroundColor: copied ? colors.safe + "18" : isDark ? colors.surfaceLight : colors.background,
                borderColor: copied ? colors.safe : colors.surfaceBorder,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <Ionicons name={copied ? "checkmark-circle" : "copy-outline"} size={15} color={copied ? colors.safe : colors.textMuted} />
            <Text style={[styles.copiedText, { color: copied ? colors.safe : colors.textMuted }]}>{copied ? "Copied!" : "Copy"}</Text>
          </Pressable>
        </View>
        <View style={[styles.encryptedInfoBox, { backgroundColor: colors.warning + "10", borderColor: colors.warning + "30" }]}>
          <View style={styles.encryptedBadgeRow}>
            <View style={[styles.encryptedBadge, { backgroundColor: colors.warning + "20" }]}>
              <Text style={[styles.encryptedBadgeText, { color: colors.warning }]}>{dataHint}</Text>
            </View>
            <Text style={[styles.encryptedByteHint, { color: colors.textMuted }]}>{content.length} chars</Text>
          </View>
          <Text style={[styles.encryptedDesc, { color: colors.textSecondary }]}>
            This QR code contains encrypted or proprietary data — likely from a government agency, bank, or private system (e.g. voter ID, ID card, access token). The content is intentionally unreadable without the issuer's private key.
          </Text>
        </View>
        <View style={[styles.contentBox, { backgroundColor: isDark ? colors.surfaceLight : colors.background, borderColor: colors.surfaceBorder }]}>
          <Text style={[styles.encryptedRaw, { color: colors.textMuted }]} selectable numberOfLines={2}>{preview}</Text>
        </View>
        <View style={[styles.encryptedTipRow, { borderColor: colors.surfaceBorder }]}>
          <Ionicons name="shield-checkmark-outline" size={14} color={colors.textMuted} />
          <Text style={[styles.encryptedTip, { color: colors.textMuted }]}>Only trust this QR if you received it from a verified official source.</Text>
        </View>
      </View>
    );
  }

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
        colors={[cfg.gradient[0] + (isDark ? "14" : "09"), "transparent"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Type header row */}
      <View style={styles.typeRow}>
        <LinearGradient colors={cfg.gradient} style={styles.typeIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Ionicons name={cfg.icon} size={15} color="#fff" />
        </LinearGradient>
        <Text style={[styles.typeLabel, { color: colors.text }]}>{cfg.label}</Text>
        <Pressable
          onPress={handleCopy}
          style={({ pressed }) => [
            styles.copyBtn,
            {
              backgroundColor: copied ? colors.safe + "18" : isDark ? colors.surfaceLight : colors.background,
              borderColor: copied ? colors.safe : colors.surfaceBorder,
              opacity: pressed ? 0.75 : 1,
            },
          ]}
        >
          <Ionicons name={copied ? "checkmark-circle" : "copy-outline"} size={15} color={copied ? colors.safe : colors.textMuted} />
          <Text style={[styles.copiedText, { color: copied ? colors.safe : colors.textMuted }]}>{copied ? "Copied!" : "Copy"}</Text>
        </Pressable>
      </View>

      {/* Content text — hidden for URL and event types */}
      {contentType !== "url" && contentType !== "event" && (
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

      {/* URL display */}
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
      {eventData && (
        <View style={{ gap: 10 }}>
          {eventOver && (
            <View style={[styles.eventOverBanner, { backgroundColor: colors.danger + "15", borderColor: colors.danger + "40" }]}>
              <Ionicons name="time-outline" size={15} color={colors.danger} />
              <Text style={[styles.eventOverText, { color: colors.danger }]}>This event has already ended</Text>
            </View>
          )}
          <View style={[styles.eventCard, { backgroundColor: isDark ? colors.surfaceLight : colors.background, borderColor: colors.surfaceBorder }]}>
            {eventData.summary ? (
              <Text style={[styles.eventTitle, { color: colors.text }]}>{eventData.summary}</Text>
            ) : null}
            {eventData.dtstart ? (
              <View style={styles.eventDetailRow}>
                <View style={[styles.eventDetailIcon, { backgroundColor: cfg.gradient[0] + "18" }]}>
                  <Ionicons name="calendar-outline" size={14} color={cfg.gradient[0]} />
                </View>
                <Text style={[styles.eventDetailText, { color: colors.textSecondary }]}>
                  {formatEventDate(eventData.dtstart)}
                </Text>
              </View>
            ) : null}
            {(eventData.dtstart || eventData.dtend) ? (
              <View style={styles.eventDetailRow}>
                <View style={[styles.eventDetailIcon, { backgroundColor: cfg.gradient[0] + "18" }]}>
                  <Ionicons name="time-outline" size={14} color={cfg.gradient[0]} />
                </View>
                <Text style={[styles.eventDetailText, { color: colors.textSecondary }]}>
                  {eventData.dtstart ? formatEventTime(eventData.dtstart) : ""}
                  {eventData.dtend && eventData.dtstart !== eventData.dtend
                    ? ` – ${formatEventTime(eventData.dtend)}`
                    : ""}
                </Text>
              </View>
            ) : null}
            {eventData.location ? (
              <View style={styles.eventDetailRow}>
                <View style={[styles.eventDetailIcon, { backgroundColor: cfg.gradient[0] + "18" }]}>
                  <Ionicons name="location-outline" size={14} color={cfg.gradient[0]} />
                </View>
                <Text style={[styles.eventDetailText, { color: colors.textSecondary }]} numberOfLines={2}>
                  {eventData.location}
                </Text>
              </View>
            ) : null}
            {eventData.description ? (
              <View style={styles.eventDetailRow}>
                <View style={[styles.eventDetailIcon, { backgroundColor: cfg.gradient[0] + "18" }]}>
                  <Ionicons name="information-circle-outline" size={14} color={cfg.gradient[0]} />
                </View>
                <Text style={[styles.eventDetailText, { color: colors.textSecondary }]} numberOfLines={3}>
                  {eventData.description}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      )}

      {/* Open action */}
      {hasOpenAction && (
        <Pressable onPress={onOpenContent} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
          <LinearGradient colors={cfg.gradient} style={styles.openBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Ionicons name="open-outline" size={14} color="#fff" />
            <Text style={styles.openBtnText}>{cfg.openLabel}</Text>
          </LinearGradient>
        </Pressable>
      )}
    </View>
  );
});

function InfoRow({ label, value, selectable, gradient, colors }: { label: string; value: string; selectable?: boolean; gradient: GradientPair; colors: any }) {
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
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    overflow: "hidden",
    gap: 10,
  },
  typeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  typeIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  typeLabel: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    flex: 1,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 28,
    paddingHorizontal: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  copiedText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  contentBox: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    gap: 6,
  },
  urlBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
  },
  urlText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium" },
  contentText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  expandBtn: { alignSelf: "flex-start" },
  expandBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  infoGrid: {
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  infoLabel: { fontSize: 13, fontFamily: "Inter_700Bold", minWidth: 72, letterSpacing: 0.2 },
  infoValue: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1, textAlign: "right" },
  openBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 11,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  openBtnText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#fff" },
  encryptedInfoBox: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 10,
  },
  encryptedBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  encryptedBadge: {
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  encryptedBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.4,
  },
  encryptedByteHint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  encryptedDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  encryptedRaw: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    letterSpacing: 0.2,
    fontVariant: ["tabular-nums"],
  },
  encryptedTipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  encryptedTip: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
    flex: 1,
  },
  eventOverBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
  eventOverText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  eventCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  eventTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    lineHeight: 24,
  },
  eventDetailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  eventDetailIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  eventDetailText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    flex: 1,
    lineHeight: 20,
  },
});
