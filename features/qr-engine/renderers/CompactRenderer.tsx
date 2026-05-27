/**
 * QR Engine — CompactRenderer
 *
 * Compact info card that surfaces the most important fields for a given QR
 * type. Replaces the ad-hoc QrContentInfoCard pattern used in my-qr and
 * other owner-facing views.
 *
 * Usage:
 *   <QrRenderer mode="compact" content={content} contentType={contentType} />
 */

import React from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/shared/contexts/ThemeContext";
import {
  getContentDisplayLabel,
  getContentSubtitle,
} from "@/shared/utils/formatters/content-type";
import { getQrTypeMeta } from "../registry";
import type { QrRenderProps } from "../types";

interface CompactRow {
  icon: string;
  label: string;
  value: string;
}

function extractRows(content: string, contentType: string): CompactRow[] {
  try {
    switch (contentType) {
      case "wifi": {
        const ssid = content.match(/S:([^;]+)/)?.[1] ?? "";
        const security = content.match(/T:([^;]+)/)?.[1] ?? "WPA";
        const hidden = content.match(/H:([^;]+)/)?.[1] === "true";
        const rows: CompactRow[] = [
          { icon: "wifi-outline", label: "Network", value: ssid },
          { icon: "lock-closed-outline", label: "Security", value: security === "nopass" ? "Open" : security },
        ];
        if (hidden) rows.push({ icon: "eye-off-outline", label: "Hidden", value: "Yes" });
        return rows;
      }
      case "contact":
      case "mecard": {
        const fn = content.match(/FN:([^\r\n]+)/)?.[1]?.trim() ?? "";
        const tel = content.match(/TEL[^:]*:([^\r\n]+)/)?.[1]?.trim() ?? "";
        const email = content.match(/EMAIL[^:]*:([^\r\n]+)/)?.[1]?.trim() ?? "";
        const org = content.match(/ORG:([^\r\n]+)/)?.[1]?.trim() ?? "";
        const rows: CompactRow[] = [];
        if (fn) rows.push({ icon: "person-outline", label: "Name", value: fn });
        if (tel) rows.push({ icon: "call-outline", label: "Phone", value: tel });
        if (email) rows.push({ icon: "mail-outline", label: "Email", value: email });
        if (org) rows.push({ icon: "business-outline", label: "Organisation", value: org });
        return rows;
      }
      case "email": {
        const addr = content.replace(/^mailto:/i, "").split("?")[0].trim();
        const params = content.includes("?")
          ? new URLSearchParams(content.split("?")[1])
          : null;
        const subject = params?.get("subject") ?? "";
        const rows: CompactRow[] = [{ icon: "mail-outline", label: "Address", value: addr }];
        if (subject) rows.push({ icon: "text-outline", label: "Subject", value: subject });
        return rows;
      }
      case "phone":
        return [{ icon: "call-outline", label: "Number", value: content.replace(/^tel:/i, "").trim() }];
      case "sms": {
        const parts = content.replace(/^SMSTO?:/i, "").split(":");
        const rows: CompactRow[] = [{ icon: "call-outline", label: "To", value: parts[0] }];
        if (parts[1]) rows.push({ icon: "chatbubble-outline", label: "Message", value: parts.slice(1).join(":") });
        return rows;
      }
      case "whatsapp": {
        const rows: CompactRow[] = [];
        try {
          const u = new URL(content.startsWith("http") ? content : `https://${content}`);
          const phone = u.pathname.replace(/^\//, "").split("/")[0];
          if (phone) rows.push({ icon: "call-outline", label: "Number", value: phone });
          const msg = u.searchParams.get("text");
          if (msg) rows.push({ icon: "chatbubble-outline", label: "Message", value: msg });
        } catch {}
        return rows;
      }
      case "location":
      case "google_maps": {
        const geo = content.match(/geo:(-?[\d.]+),(-?[\d.]+)/);
        if (geo) {
          return [
            { icon: "location-outline", label: "Latitude", value: geo[1] },
            { icon: "location-outline", label: "Longitude", value: geo[2] },
          ];
        }
        return [{ icon: "link-outline", label: "URL", value: content }];
      }
      case "event":
      case "calendar": {
        const summary = content.match(/SUMMARY:([^\r\n]+)/)?.[1]?.trim() ?? "";
        const start = content.match(/DTSTART[^:]*:([^\r\n]+)/)?.[1]?.trim() ?? "";
        const location = content.match(/LOCATION:([^\r\n]+)/)?.[1]?.trim() ?? "";
        const rows: CompactRow[] = [];
        if (summary) rows.push({ icon: "text-outline", label: "Event", value: summary });
        if (start) rows.push({ icon: "time-outline", label: "Date", value: `${start.slice(6, 8)}/${start.slice(4, 6)}/${start.slice(0, 4)}` });
        if (location) rows.push({ icon: "location-outline", label: "Location", value: location });
        return rows;
      }
      case "payment":
      case "upi":
      case "paymentlink":
      case "scantopay": {
        if (content.startsWith("upi://pay?")) {
          try {
            const p = new URLSearchParams(content.replace("upi://pay?", ""));
            const rows: CompactRow[] = [];
            const pa = p.get("pa");
            const pn = p.get("pn");
            const am = p.get("am");
            if (pn) rows.push({ icon: "person-outline", label: "Payee", value: pn });
            if (pa) rows.push({ icon: "card-outline", label: "UPI ID", value: pa });
            if (am) rows.push({ icon: "cash-outline", label: "Amount", value: `₹${am}` });
            return rows;
          } catch {}
        }
        return [];
      }
      case "crypto": {
        const coin = content.split(":")[0];
        const address = content.split(":")[1]?.split("?")[0] ?? "";
        return [
          { icon: "logo-bitcoin", label: "Currency", value: coin.charAt(0).toUpperCase() + coin.slice(1) },
          { icon: "wallet-outline", label: "Address", value: address.slice(0, 20) + (address.length > 20 ? "…" : "") },
        ];
      }
      case "url": {
        try {
          const u = new URL(content.startsWith("http") ? content : `https://${content}`);
          return [{ icon: "globe-outline", label: "Domain", value: u.hostname }];
        } catch {
          return [];
        }
      }
      default:
        return [];
    }
  } catch {
    return [];
  }
}

interface CompactRendererProps extends QrRenderProps {
  isDynamic?: boolean;
  isBusiness?: boolean;
  isLoading?: boolean;
}

export default function CompactRenderer({
  content,
  contentType,
  templateKey,
  isDynamic = false,
  isBusiness = false,
  isLoading = false,
}: CompactRendererProps) {
  const { colors, isDark } = useTheme();
  const effectiveType = templateKey ?? contentType;
  const meta = getQrTypeMeta(effectiveType);
  const displayLabel = getContentDisplayLabel(content, effectiveType);
  const rows = extractRows(content, effectiveType);

  const description = isDynamic
    ? isBusiness
      ? "Smart Redirect — destination is updatable"
      : "Protected redirect — content is updatable"
    : "Content is directly encoded in this QR";

  return (
    <Animated.View entering={FadeInDown.duration(200)}>
      <View style={[
        styles.card,
        {
          borderColor: meta.color + "35",
          backgroundColor: isDark ? meta.color + "10" : meta.color + "08",
        },
      ]}>
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: meta.color + "18", borderColor: meta.color + "30" }]}>
            <Ionicons name={meta.icon as any} size={20} color={meta.color} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.typeLabel, { color: meta.color }]}>
              {meta.label} QR Code
            </Text>
            <Text style={[styles.description, { color: colors.textMuted }]}>
              {description}
            </Text>
          </View>
          {isDynamic && (
            <View style={[styles.dynamicBadge, { backgroundColor: "#6366F115", borderColor: "#6366F130" }]}>
              <Ionicons name="git-branch-outline" size={12} color="#6366F1" />
            </View>
          )}
        </View>

        {isLoading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={meta.color} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>
              Loading content details…
            </Text>
          </View>
        )}

        {rows.length > 0 ? (
          rows.map((row, idx) => (
            <View
              key={idx}
              style={[styles.row, { borderTopColor: meta.color + "22" }]}
            >
              <View style={[styles.rowIcon, { backgroundColor: meta.color + "15" }]}>
                <Ionicons name={row.icon as any} size={14} color={meta.color} />
              </View>
              <View style={styles.rowBody}>
                <Text style={[styles.rowLabel, { color: meta.color }]}>
                  {row.label.toUpperCase()}
                </Text>
                <Text style={[styles.rowValue, { color: colors.text }]} selectable>
                  {row.value}
                </Text>
              </View>
            </View>
          ))
        ) : !isLoading && (
          <View style={styles.emptyRow}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {contentType === "contact"
                ? "vCard contact — scan to save to contacts"
                : contentType === "event" || contentType === "calendar"
                  ? "Calendar event — scan to add to calendar"
                  : contentType === "text"
                    ? displayLabel
                    : "Content encoded directly in the QR code"}
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 14,
    gap: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  typeLabel: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  description: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  dynamicBadge: {
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderWidth: 1,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  rowBody: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  rowValue: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    lineHeight: 19,
  },
  emptyRow: {
    paddingVertical: 6,
    paddingLeft: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "transparent",
  },
  emptyText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
});
