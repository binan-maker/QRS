import { useState } from "react";
import {
  View, Text, ScrollView, Pressable, Platform, Switch,
  TextInput, useWindowDimensions, ActivityIndicator, Modal,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import QRCode from "react-native-qrcode-svg";
import { useTheme } from "@/contexts/ThemeContext";
import { useMyQrDetail, FG_COLORS, BG_COLORS } from "@/features/my-qr/hooks/useMyQrDetail";
import DeactivateModal from "@/features/my-qr/components/DeactivateModal";
import GroupPickerModal from "@/components/groups/GroupPickerModal";

const CONTENT_TYPE_LABEL: Record<string, string> = {
  url: "URL", text: "Text", wifi: "WiFi", upi: "UPI", bharatqr: "BharatQR",
  contact: "Contact", email: "Email", phone: "Phone", whatsapp: "WhatsApp",
  instagram: "Instagram", twitter: "Twitter", youtube: "YouTube",
  linkedin: "LinkedIn", crypto: "Crypto", location: "Location",
  calendar: "Event", event: "Event", zoom: "Zoom", social: "Social",
  telegram: "Telegram", facebook: "Facebook", spotify: "Spotify",
  discord: "Discord", tiktok: "TikTok", media: "Media",
  payment: "Payment", paymentlink: "Payment", scantopay: "Scan-to-Pay",
  mobilepay: "Mobile Pay", grab: "GrabPay", bharatpay: "BharatPay",
  reviewpage: "Review", googlereview: "Review",
  restaurantmenu: "Menu", menucatalogue: "Menu",
  donation: "Donation", paypal: "PayPal", venmo: "Venmo",
  appdownload: "App", app: "App", sms: "SMS", document: "Document",
};

function getDetailContentType(item: any): string {
  const stored = item.contentType as string || "text";
  if (stored && stored !== "text") return stored;

  const displayDest = item.displayDestination as string | null;
  const content = item.content as string || "";
  const src = displayDest || content;

  if (!src) return stored;

  if (src.startsWith("tel:")) return "phone";
  if (src.startsWith("WIFI:")) return "wifi";
  if (src.startsWith("upi://")) return "upi";
  if (src.startsWith("BEGIN:VCALENDAR") || src.startsWith("BEGIN:VEVENT")) return "event";
  if (src.startsWith("BEGIN:VCARD")) return "contact";
  if (src.startsWith("SMSTO:") || src.startsWith("sms:")) return "sms";
  if (src.startsWith("mailto:")) return "email";
  if (src.includes("wa.me") || src.includes("whatsapp.com")) return "whatsapp";
  if (src.includes("instagram.com") || src.includes("instagr.am")) return "instagram";
  if (src.includes("twitter.com") || src.includes("x.com/")) return "twitter";
  if (src.includes("youtube.com") || src.includes("youtu.be")) return "youtube";
  if (src.includes("linkedin.com")) return "linkedin";
  if (src.includes("t.me/") || src.includes("telegram.me/")) return "telegram";
  if (src.includes("facebook.com") || src.includes("fb.com")) return "facebook";
  if (src.includes("open.spotify.com")) return "spotify";
  if (src.includes("discord.gg") || src.includes("discord.com")) return "discord";
  if (src.includes("tiktok.com")) return "tiktok";
  if (src.includes("paypal.me") || src.includes("paypal.com")) return "paypal";
  if (src.includes("venmo.com")) return "venmo";
  if (src.includes("zoom.us")) return "zoom";
  if (/^bitcoin:|^ethereum:|^litecoin:|^solana:/.test(src)) return "crypto";
  if (/^[\w.\-+]+@[\w]{2,}$/.test(src) && !/\.(com|in|org|net|io|co|app)$/.test(src.split("@")[1] || "")) return "upi";
  if (/^\+?[\d]{7,15}$/.test(src.replace(/[\s\-()]/g, ""))) return "phone";
  const withScheme = src.startsWith("http") ? src : `https://${src}`;
  try {
    const u = new URL(withScheme);
    const h = u.hostname;
    if (
      h.includes(".") && h.length >= 4 &&
      !/^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.|127\.|localhost)/.test(h) &&
      !u.pathname.startsWith("/guard/") && !u.pathname.startsWith("/go/")
    ) return "url";
  } catch {}
  return stored;
}

function getDetailDisplayTitle(item: any): string {
  if (item.businessName) return item.businessName;
  const lbl = item.label as string | null;
  if (lbl) return lbl;

  const contentType = getDetailContentType(item);
  const displayDest = item.displayDestination as string | null;
  const content = item.content as string || "";
  const src = displayDest || content;

  switch (contentType) {
    case "phone":
    case "mobilepay":
    case "grab":
      return src.replace(/^tel:/, "").trim();
    case "wifi": {
      const m = src.match(/S:([^;]+)/);
      if (m) return m[1];
      break;
    }
    case "upi":
    case "scantopay":
    case "bharatqr": {
      if (src.startsWith("upi://pay?")) {
        try { const pa = new URLSearchParams(src.replace("upi://pay?", "")).get("pa"); if (pa) return pa; } catch {}
      }
      if (/^[\w.\-+]+@[\w]+$/.test(src)) return src;
      break;
    }
    case "event":
    case "calendar": {
      if (src.startsWith("BEGIN:")) {
        const m = src.match(/SUMMARY:([^\r\n]+)/);
        if (m) return m[1].trim();
      }
      break;
    }
    case "contact": {
      const m = src.match(/FN:([^\r\n]+)/);
      if (m) return m[1].trim();
      break;
    }
    case "sms":
      return src.replace(/^SMSTO?:/i, "").split(":")[0].trim();
    case "email":
      return src.replace(/^mailto:/i, "").split("?")[0].trim();
    case "whatsapp": {
      try {
        const u = new URL(src.startsWith("http") ? src : `https://${src}`);
        if (u.hostname === "wa.me" || u.hostname === "api.whatsapp.com") {
          const phone = u.pathname.replace(/^\//, "");
          if (phone) return "+" + phone;
        }
      } catch {}
      break;
    }
    case "instagram":
    case "twitter":
    case "telegram": {
      const parts = src.replace(/\/$/, "").split("/");
      const handle = parts[parts.length - 1] || "";
      if (handle && !handle.includes(".")) return "@" + handle;
      break;
    }
    case "tiktok": {
      const handle = src.replace(/.*tiktok\.com\/@?/, "").replace(/\/$/, "");
      if (handle) return "@" + handle.replace(/^@/, "");
      break;
    }
    case "zoom": {
      if (src.includes("zoom.us/j/")) {
        return "Meeting " + (src.split("/j/")[1]?.split("?")[0] || "");
      }
      return "Zoom Meeting";
    }
  }

  if (src) {
    const isGuardOrGo = src.includes("/guard/") || src.includes("/go/");
    const withScheme = src.startsWith("http") ? src : `https://${src}`;
    try {
      const u = new URL(withScheme);
      const h = u.hostname.replace(/^www\./, "");
      const isLocal = /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.|127\.|localhost)/.test(h);
      if (!isLocal && !isGuardOrGo) {
        if (h === "wa.me" || h === "api.whatsapp.com") {
          const phone = u.pathname.replace(/^\//, "");
          if (phone) return "+" + phone;
        }
        return h;
      }
    } catch {}
    if (!isGuardOrGo) return src.length > 45 ? src.slice(0, 45) + "…" : src;
  }

  return "QR Code";
}

interface ContentDetailRow { label: string; value: string; icon: string; }

function parseQrContentDetails(item: any): ContentDetailRow[] {
  const contentType = getDetailContentType(item);
  const displayDest = item.displayDestination as string | null;
  const content = item.content as string || "";
  const src = displayDest || content;

  if (!src) return [];

  const isGuardOrGo = src.includes("/guard/") || src.includes("/go/");

  switch (contentType) {
    case "phone":
    case "mobilepay":
    case "grab": {
      const num = src.replace(/^tel:/, "").trim();
      if (!num || isGuardOrGo) return [];
      return [{ label: "Phone Number", value: num, icon: "call-outline" }];
    }
    case "wifi": {
      if (!src.startsWith("WIFI:")) return [];
      const ssid = src.match(/S:([^;]+)/)?.[1] || "";
      const sec = src.match(/T:([^;]+)/)?.[1] || "WPA";
      const hidden = src.includes("H:true");
      const rows: ContentDetailRow[] = [];
      if (ssid) rows.push({ label: "Network (SSID)", value: ssid, icon: "wifi-outline" });
      rows.push({ label: "Security", value: sec === "nopass" ? "Open" : sec, icon: "shield-outline" });
      if (hidden) rows.push({ label: "Hidden Network", value: "Yes", icon: "eye-off-outline" });
      return rows;
    }
    case "upi":
    case "scantopay":
    case "bharatqr": {
      if (src.startsWith("upi://pay?")) {
        try {
          const params = new URLSearchParams(src.replace("upi://pay?", ""));
          const rows: ContentDetailRow[] = [];
          const pa = params.get("pa"); const pn = params.get("pn"); const am = params.get("am");
          if (pa) rows.push({ label: "UPI ID", value: pa, icon: "card-outline" });
          if (pn) rows.push({ label: "Payee Name", value: pn, icon: "person-outline" });
          if (am) rows.push({ label: "Amount", value: "₹" + am, icon: "cash-outline" });
          if (rows.length > 0) return rows;
        } catch {}
      }
      if (/^[\w.\-+]+@[\w]+$/.test(src)) return [{ label: "UPI ID", value: src, icon: "card-outline" }];
      return [];
    }
    case "event":
    case "calendar": {
      if (!src.startsWith("BEGIN:")) return [];
      const title = src.match(/SUMMARY:([^\r\n]+)/)?.[1]?.trim() || "";
      const start = src.match(/DTSTART:([^\r\n]+)/)?.[1]?.trim() || "";
      const loc = src.match(/LOCATION:([^\r\n]+)/)?.[1]?.trim() || "";
      const desc = src.match(/DESCRIPTION:([^\r\n]+)/)?.[1]?.trim() || "";
      const rows: ContentDetailRow[] = [];
      if (title) rows.push({ label: "Event Title", value: title, icon: "calendar-outline" });
      if (start) {
        const ds = start.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2}).*/, "$3/$2/$1 $4:$5");
        rows.push({ label: "Start", value: ds, icon: "time-outline" });
      }
      if (loc) rows.push({ label: "Location", value: loc, icon: "location-outline" });
      if (desc) rows.push({ label: "Description", value: desc.length > 60 ? desc.slice(0, 60) + "…" : desc, icon: "document-text-outline" });
      return rows;
    }
    case "contact": {
      if (!src.startsWith("BEGIN:VCARD")) return [];
      const fn = src.match(/FN:([^\r\n]+)/)?.[1]?.trim() || "";
      const tel = src.match(/TEL[^:]*:([^\r\n]+)/)?.[1]?.trim() || "";
      const mail = src.match(/EMAIL[^:]*:([^\r\n]+)/)?.[1]?.trim() || "";
      const org = src.match(/ORG:([^\r\n]+)/)?.[1]?.trim() || "";
      const url = src.match(/URL:([^\r\n]+)/)?.[1]?.trim() || "";
      const rows: ContentDetailRow[] = [];
      if (fn) rows.push({ label: "Name", value: fn, icon: "person-circle-outline" });
      if (tel) rows.push({ label: "Phone", value: tel, icon: "call-outline" });
      if (mail) rows.push({ label: "Email", value: mail, icon: "mail-outline" });
      if (org) rows.push({ label: "Organisation", value: org, icon: "business-outline" });
      if (url) rows.push({ label: "Website", value: url.replace(/^www\./, ""), icon: "link-outline" });
      return rows;
    }
    case "sms": {
      if (!src.startsWith("SMSTO") && !src.startsWith("sms:")) return [];
      const phone = src.replace(/^SMSTO?:/i, "").split(":")[0].trim();
      const msg = src.split(":").slice(2).join(":");
      const rows: ContentDetailRow[] = [];
      if (phone) rows.push({ label: "Phone", value: phone, icon: "chatbubble-outline" });
      if (msg) rows.push({ label: "Message", value: msg.length > 60 ? msg.slice(0, 60) + "…" : msg, icon: "text-outline" });
      return rows;
    }
    case "email": {
      if (!src.startsWith("mailto:")) return [];
      const address = src.replace(/^mailto:/i, "").split("?")[0].trim();
      let subject = ""; let body = "";
      try { const u = new URL(src); subject = u.searchParams.get("subject") || ""; body = u.searchParams.get("body") || ""; } catch {}
      const rows: ContentDetailRow[] = [];
      if (address) rows.push({ label: "Email Address", value: address, icon: "mail-outline" });
      if (subject) rows.push({ label: "Subject", value: subject, icon: "text-outline" });
      if (body) rows.push({ label: "Body", value: body.length > 60 ? body.slice(0, 60) + "…" : body, icon: "document-text-outline" });
      return rows;
    }
    case "whatsapp": {
      try {
        const u = new URL(src.startsWith("http") ? src : `https://${src}`);
        if (u.hostname === "wa.me" || u.hostname === "api.whatsapp.com") {
          const phone = "+" + u.pathname.replace(/^\//, "");
          const msg = u.searchParams.get("text") || "";
          const rows: ContentDetailRow[] = [{ label: "WhatsApp Number", value: phone, icon: "logo-whatsapp" }];
          if (msg) rows.push({ label: "Pre-filled Message", value: msg.length > 60 ? msg.slice(0, 60) + "…" : msg, icon: "text-outline" });
          return rows;
        }
      } catch {}
      if (/^\+?[\d]{7,15}$/.test(src.replace(/[\s\-()]/g, ""))) {
        return [{ label: "WhatsApp Number", value: src, icon: "logo-whatsapp" }];
      }
      return [];
    }
    case "instagram": {
      const parts = src.replace(/\/$/, "").split("/");
      const handle = parts[parts.length - 1] || "";
      if (!handle || handle.includes(".")) return [];
      return [{ label: "Instagram", value: "@" + handle, icon: "logo-instagram" }];
    }
    case "twitter": {
      const parts = src.replace(/\/$/, "").split("/");
      const handle = parts[parts.length - 1] || "";
      if (!handle || handle.includes(".")) return [];
      return [{ label: "Twitter / X", value: "@" + handle, icon: "logo-twitter" }];
    }
    case "telegram": {
      const parts = src.replace(/\/$/, "").split("/");
      const handle = parts[parts.length - 1] || "";
      if (!handle || handle.includes(".")) return [];
      return [{ label: "Telegram", value: "@" + handle, icon: "send-outline" }];
    }
    case "tiktok": {
      const handle = src.replace(/.*tiktok\.com\/@?/, "").replace(/\/$/, "");
      if (!handle) return [];
      return [{ label: "TikTok", value: "@" + handle.replace(/^@/, ""), icon: "musical-note-outline" }];
    }
    case "youtube": {
      const rows: ContentDetailRow[] = [];
      try {
        const u = new URL(src.startsWith("http") ? src : `https://${src}`);
        const channel = u.pathname.replace(/^\/(c\/|channel\/|@)?/, "").replace(/\/$/, "");
        if (channel) rows.push({ label: "Channel", value: channel, icon: "logo-youtube" });
      } catch {}
      if (rows.length === 0) rows.push({ label: "YouTube", value: src, icon: "logo-youtube" });
      return rows;
    }
    case "linkedin": {
      const rows: ContentDetailRow[] = [];
      try {
        const u = new URL(src.startsWith("http") ? src : `https://${src}`);
        const profile = u.pathname.replace(/^\/(in\/|company\/)?/, "").replace(/\/$/, "");
        if (profile) rows.push({ label: "LinkedIn", value: profile, icon: "logo-linkedin" });
      } catch {}
      if (rows.length === 0) rows.push({ label: "LinkedIn", value: src, icon: "logo-linkedin" });
      return rows;
    }
    case "zoom": {
      let meetingId = "";
      if (src.includes("zoom.us/j/")) meetingId = src.split("/j/")[1]?.split("?")[0] || "";
      return meetingId ? [{ label: "Meeting ID", value: meetingId, icon: "videocam-outline" }] : [];
    }
    case "crypto": {
      const coin = src.split(":")[0] || "crypto";
      const address = src.split(":")[1]?.split("?")[0] || "";
      const rows: ContentDetailRow[] = [
        { label: "Coin", value: coin.charAt(0).toUpperCase() + coin.slice(1), icon: "logo-bitcoin" },
      ];
      if (address) rows.push({ label: "Wallet Address", value: address.length > 28 ? address.slice(0, 28) + "…" : address, icon: "copy-outline" });
      return rows;
    }
    case "location": {
      try {
        const u = new URL(src.startsWith("http") ? src : `https://${src}`);
        const q = u.searchParams.get("q") || u.searchParams.get("query") || "";
        if (q) return [{ label: "Location", value: q, icon: "location-outline" }];
      } catch {}
      return [];
    }
    case "url": {
      if (isGuardOrGo) return [];
      try {
        const u = new URL(src.startsWith("http") ? src : `https://${src}`);
        const h = u.hostname.replace(/^www\./, "");
        const isLocal = /^(192\.168\.|10\.|127\.|localhost)/.test(h);
        if (!isLocal) return [{ label: "URL", value: src, icon: "link-outline" }];
      } catch {}
      return [];
    }
    case "text": {
      if (src.length < 200 && !isGuardOrGo) return [{ label: "Text Content", value: src, icon: "text-outline" }];
      return [];
    }
    default:
      return [];
  }
}

function formatDate(iso: string) {
  try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return iso; }
}

export default function MyQrDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const s = Math.min(Math.max(width / 390, 0.82), 1.0);
  const rf = (n: number) => Math.round(n * s);
  const sp = (n: number) => Math.round(n * s);
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const tabBarHeight = 62 + insets.bottom + 8;

  const [groupPickerOpen, setGroupPickerOpen] = useState(false);

  const {
    user, svgRef, qrItem, loading,
    fgColor, setFgColor, bgColor, setBgColor,
    saving, designDirty, setDesignDirty, designOpen, setDesignOpen,
    togglingActive, deactivateModalOpen, setDeactivateModalOpen,
    deactivationMsgInput, setDeactivationMsgInput,
    guardLink, standardLink,
    editingDestination, setEditingDestination,
    newDestination, setNewDestination, savingDestination,
    destinationError, setDestinationError,
    editingSavedContent, setEditingSavedContent,
    newSavedContent, setNewSavedContent,
    savingSavedContent, savedContentError, setSavedContentError,
    isValidating,
    confirmModalOpen, confirmModalMessage,
    handleConfirmPendingAction, handleCancelPendingAction,
    handleUpdateDestination, handleUpdateStandardDestination, handleRequestSavedContentUpdate,
    handleSaveDesign, handleToggleActive,
    handleConfirmDeactivate, handleCopyContent, handleShare, handleDownloadPdf,
    sharingQr, downloadingPdf,
  } = useMyQrDetail(id as string);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!qrItem) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", paddingTop: topInset }}>
        <Pressable onPress={() => router.back()} style={{ position: "absolute", top: topInset + sp(12), left: sp(20), width: sp(38), height: sp(38), borderRadius: sp(19), backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="chevron-back" size={rf(20)} color={colors.text} />
        </Pressable>
        <MaterialCommunityIcons name="qrcode-remove" size={48} color={colors.textMuted} />
        <Text style={{ color: colors.textMuted, fontSize: rf(14), fontFamily: "Inter_500Medium", marginTop: 12 }}>QR code not found</Text>
      </View>
    );
  }

  const isBusiness = qrItem.qrType === "business";
  const isActive = qrItem.isActive !== false;
  const displayTitle = getDetailDisplayTitle(qrItem as any);
  const effectiveContentType = getDetailContentType(qrItem as any);
  const typeLabel = CONTENT_TYPE_LABEL[effectiveContentType] || effectiveContentType || "QR";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: sp(20), paddingTop: topInset + sp(6), paddingBottom: sp(12),
      }}>
        <Pressable
          onPress={() => router.back()}
          style={{ width: sp(38), height: sp(38), borderRadius: sp(19), backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder, alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="chevron-back" size={rf(20)} color={colors.text} />
        </Pressable>

        <Text style={{ fontSize: rf(16), fontFamily: "Inter_700Bold", color: colors.text }}>
          My QR Code
        </Text>

        <Pressable
          onPress={() => setGroupPickerOpen(true)}
          style={{ width: sp(38), height: sp(38), borderRadius: sp(19), backgroundColor: "#6366F1" + "15", borderWidth: 1, borderColor: "#6366F1" + "35", alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="folder-outline" size={rf(18)} color="#6366F1" />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: sp(20), paddingBottom: tabBarHeight + 20 }}
      >
        {/* QR Preview card */}
        <Animated.View entering={FadeIn.duration(350)}>
          <View style={{
            borderRadius: sp(24), borderWidth: 1, borderColor: colors.surfaceBorder,
            backgroundColor: colors.surface, padding: sp(20), marginBottom: sp(14),
            alignItems: "center",
          }}>
            {/* Type + status badges */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp(6), marginBottom: sp(16) }}>
              <View style={{
                flexDirection: "row", alignItems: "center", gap: sp(4),
                borderRadius: sp(8), paddingHorizontal: sp(8), paddingVertical: sp(3),
                backgroundColor: isBusiness ? colors.warningDim : colors.primaryDim,
              }}>
                <Ionicons name={isBusiness ? "storefront" : "person"} size={rf(10)} color={isBusiness ? colors.warning : colors.primary} />
                <Text style={{ fontSize: rf(10), fontFamily: "Inter_700Bold", color: isBusiness ? colors.warning : colors.primary }}>
                  {isBusiness ? "Business" : "Individual"}
                </Text>
              </View>
              <View style={{
                flexDirection: "row", alignItems: "center", gap: sp(4),
                borderRadius: sp(8), paddingHorizontal: sp(8), paddingVertical: sp(3),
                backgroundColor: isActive ? (colors as any).safeDim ?? colors.primaryDim : (colors as any).dangerDim ?? colors.surfaceLight,
              }}>
                <View style={{ width: sp(5), height: sp(5), borderRadius: sp(3), backgroundColor: isActive ? colors.safe : colors.danger }} />
                <Text style={{ fontSize: rf(10), fontFamily: "Inter_700Bold", color: isActive ? colors.safe : colors.danger }}>
                  {isActive ? "Active" : "Inactive"}
                </Text>
              </View>
              <Text style={{ fontSize: rf(10), fontFamily: "Inter_500Medium", color: colors.textMuted }}>{typeLabel}</Text>
            </View>

            {/* QR image */}
            <View style={{
              borderRadius: sp(20), overflow: "hidden", padding: sp(16),
              backgroundColor: bgColor,
              shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
            }}>
              <QRCode
                getRef={(ref: any) => { svgRef.current = ref; }}
                value={qrItem.content || "https://qrguard.app"}
                size={sp(180)}
                color={fgColor}
                backgroundColor={bgColor}
                quietZone={8}
                ecl="M"
              />
            </View>

            {/* Title */}
            <Text style={{ fontSize: rf(15), fontFamily: "Inter_700Bold", color: colors.text, marginTop: sp(14), textAlign: "center" }} numberOfLines={2}>
              {displayTitle.length > 50 ? displayTitle.slice(0, 50) + "…" : displayTitle}
            </Text>
            {qrItem.businessName && (
              (() => {
                const dest = guardLink?.currentDestination || null;
                const raw = qrItem.content || "";
                const isGuardUrl = raw.includes("/guard/");
                const isPrivateIpDest = dest ? /^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.|127\.|localhost)/.test(dest) || dest.includes("/guard/") : false;
                const subtitle = (dest && !isPrivateIpDest) ? dest : (isGuardUrl ? null : (raw !== qrItem.businessName ? raw : null));
                if (!subtitle) return null;
                return (
                  <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textMuted, marginTop: sp(3), textAlign: "center" }} numberOfLines={1}>
                    {subtitle.length > 44 ? subtitle.slice(0, 44) + "…" : subtitle}
                  </Text>
                );
              })()
            )}

            {/* Action buttons */}
            <View style={{ flexDirection: "row", gap: sp(10), marginTop: sp(18) }}>
              {([
                { icon: "share-outline", label: "Share", onPress: handleShare, busy: sharingQr },
                { icon: "download-outline", label: "Save", onPress: handleDownloadPdf, busy: downloadingPdf },
                { icon: "copy-outline", label: "Copy", onPress: handleCopyContent, busy: false },
              ] as const).map((btn) => (
                <Pressable
                  key={btn.label}
                  onPress={btn.onPress}
                  disabled={btn.busy}
                  style={({ pressed }) => [{
                    flex: 1, alignItems: "center", gap: sp(5),
                    borderRadius: sp(14), borderWidth: 1, borderColor: colors.surfaceBorder,
                    backgroundColor: colors.surfaceLight, paddingVertical: sp(11),
                    opacity: pressed || btn.busy ? 0.65 : 1,
                  }]}
                >
                  {btn.busy
                    ? <ActivityIndicator size="small" color={colors.textSecondary} />
                    : <Ionicons name={btn.icon as any} size={rf(20)} color={colors.textSecondary} />
                  }
                  <Text style={{ fontSize: rf(10), fontFamily: "Inter_600SemiBold", color: colors.textSecondary }}>{btn.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Animated.View>

        {/* Stats row */}
        <Animated.View entering={FadeInDown.duration(350).delay(50)}>
          <View style={{ flexDirection: "row", gap: sp(10), marginBottom: sp(14) }}>
            {([
              { icon: "scan-outline", label: "Scans", value: String(qrItem.scanCount ?? 0) },
              { icon: "chatbubble-outline", label: "Comments", value: String(qrItem.commentCount ?? 0) },
              { icon: "calendar-outline", label: "Created", value: formatDate(qrItem.createdAt) },
            ] as const).map((stat) => (
              <View key={stat.label} style={{
                flex: 1, borderRadius: sp(14), borderWidth: 1, borderColor: colors.surfaceBorder,
                backgroundColor: colors.surface, padding: sp(12), alignItems: "center", gap: sp(4),
              }}>
                <View style={{ width: sp(28), height: sp(28), borderRadius: sp(8), backgroundColor: colors.surfaceLight, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name={stat.icon as any} size={rf(13)} color={colors.textSecondary} />
                </View>
                <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: colors.text }} numberOfLines={1} adjustsFontSizeToFit>
                  {stat.value}
                </Text>
                <Text style={{ fontSize: rf(9), fontFamily: "Inter_400Regular", color: colors.textMuted, textAlign: "center" }}>
                  {stat.label}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* QR Content Details Card — shows human-readable parsed content for all types */}
        {(() => {
          const rows = parseQrContentDetails(qrItem as any);
          if (rows.length === 0) return null;
          return (
            <Animated.View entering={FadeInDown.duration(350).delay(65)}>
              <View style={{
                borderRadius: sp(18), borderWidth: 1, borderColor: colors.surfaceBorder,
                backgroundColor: colors.surface, padding: sp(16), marginBottom: sp(14),
              }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: sp(8), marginBottom: sp(12) }}>
                  <View style={{ width: sp(30), height: sp(30), borderRadius: sp(9), backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="information-circle-outline" size={rf(15)} color={colors.primary} />
                  </View>
                  <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: colors.text }}>
                    QR Content
                  </Text>
                  <View style={{ borderRadius: sp(6), paddingHorizontal: sp(6), paddingVertical: sp(2), backgroundColor: colors.primaryDim }}>
                    <Text style={{ fontSize: rf(9), fontFamily: "Inter_600SemiBold", color: colors.primary }}>
                      {CONTENT_TYPE_LABEL[effectiveContentType] || effectiveContentType?.toUpperCase() || "QR"}
                    </Text>
                  </View>
                </View>
                {rows.map((row, idx) => (
                  <View key={idx} style={{
                    flexDirection: "row", alignItems: "flex-start", gap: sp(10),
                    paddingVertical: sp(8),
                    borderTopWidth: idx === 0 ? 0 : 1,
                    borderTopColor: colors.surfaceBorder,
                  }}>
                    <View style={{ width: sp(28), height: sp(28), borderRadius: sp(8), backgroundColor: colors.surfaceLight, alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Ionicons name={row.icon as any} size={rf(13)} color={colors.textSecondary} />
                    </View>
                    <View style={{ flex: 1, gap: sp(2) }}>
                      <Text style={{ fontSize: rf(10), fontFamily: "Inter_600SemiBold", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.4 }}>
                        {row.label}
                      </Text>
                      <Text style={{ fontSize: rf(13), fontFamily: "Inter_500Medium", color: colors.text }} selectable>
                        {row.value}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </Animated.View>
          );
        })()}

        {/* Dynamic Destination — all QR types with a guard link */}
        {guardLink && (
          <Animated.View entering={FadeInDown.duration(350).delay(80)}>
            <View style={{
              borderRadius: sp(18), borderWidth: 1, borderColor: "#6366F1" + "40",
              backgroundColor: "#6366F1" + "0D", padding: sp(16), marginBottom: sp(14),
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp(8), marginBottom: sp(6) }}>
                <Ionicons name="git-branch-outline" size={rf(15)} color="#6366F1" />
                <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: "#6366F1" }}>
                  {isBusiness ? "Smart Redirect" : "Dynamic Destination"}
                </Text>
                <View style={{ borderRadius: sp(6), paddingHorizontal: sp(7), paddingVertical: sp(2), backgroundColor: "#6366F1" + "20" }}>
                  <Text style={{ fontSize: rf(9), fontFamily: "Inter_700Bold", color: "#6366F1" }}>DYNAMIC</Text>
                </View>
              </View>
              {(() => {
                const dest = guardLink.currentDestination || "";
                const isPrivate = /^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.|127\.|localhost)/.test(dest) || dest.includes("/guard/");
                if (isPrivate || !dest) return null;
                return (
                  <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textSecondary, marginBottom: sp(10) }} numberOfLines={2}>
                    {dest}
                  </Text>
                );
              })()}

              {editingDestination ? (
                <View style={{ gap: sp(8) }}>
                  <TextInput
                    value={newDestination}
                    onChangeText={(t) => { setNewDestination(t); setDestinationError(null); }}
                    placeholder="https://new-url.com"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                    keyboardType="url"
                    style={{
                      backgroundColor: colors.surface, borderRadius: sp(10), borderWidth: 1,
                      borderColor: destinationError ? colors.danger : colors.surfaceBorder,
                      paddingHorizontal: sp(12), paddingVertical: sp(9),
                      fontSize: rf(13), color: colors.text, fontFamily: "Inter_400Regular",
                    }}
                  />
                  {destinationError && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: sp(4) }}>
                      <Ionicons name="warning-outline" size={rf(12)} color={colors.danger} />
                      <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.danger, flex: 1 }}>
                        {destinationError}
                      </Text>
                    </View>
                  )}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: sp(6), backgroundColor: colors.surface, borderRadius: sp(8), padding: sp(8) }}>
                    <Ionicons name="shield-checkmark-outline" size={rf(12)} color={colors.textMuted} />
                    <Text style={{ fontSize: rf(10), fontFamily: "Inter_400Regular", color: colors.textMuted, flex: 1 }}>
                      New URL will be checked for threats before saving
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: sp(8) }}>
                    <Pressable onPress={() => { setEditingDestination(false); setDestinationError(null); }} style={{ flex: 1, borderRadius: sp(10), borderWidth: 1, borderColor: colors.surfaceBorder, padding: sp(9), alignItems: "center" }}>
                      <Text style={{ fontSize: rf(13), fontFamily: "Inter_600SemiBold", color: colors.textSecondary }}>Cancel</Text>
                    </Pressable>
                    <Pressable onPress={handleUpdateDestination} disabled={savingDestination || isValidating} style={{ flex: 2, borderRadius: sp(10), backgroundColor: "#6366F1", padding: sp(9), alignItems: "center", flexDirection: "row", justifyContent: "center", gap: sp(6) }}>
                      {(isValidating || savingDestination) && <ActivityIndicator size="small" color="#fff" />}
                      <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: "#fff" }}>
                        {isValidating ? "Scanning…" : savingDestination ? "Saving…" : "Update URL"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  onPress={() => setEditingDestination(true)}
                  style={({ pressed }) => [{
                    flexDirection: "row", alignItems: "center", gap: sp(6),
                    borderRadius: sp(10), backgroundColor: "#6366F1" + "20",
                    paddingHorizontal: sp(12), paddingVertical: sp(8), alignSelf: "flex-start",
                    opacity: pressed ? 0.8 : 1,
                  }]}
                >
                  <Ionicons name="pencil-outline" size={rf(13)} color="#6366F1" />
                  <Text style={{ fontSize: rf(12), fontFamily: "Inter_600SemiBold", color: "#6366F1" }}>Change Destination</Text>
                </Pressable>
              )}

              {/* Change history */}
              {!editingDestination && guardLink.changeLog && guardLink.changeLog.length > 0 && (
                <View style={{ marginTop: sp(12), gap: sp(6) }}>
                  <Text style={{ fontSize: rf(10), fontFamily: "Inter_600SemiBold", color: colors.textMuted }}>RECENT CHANGES</Text>
                  {guardLink.changeLog.slice(-3).reverse().map((entry, idx) => (
                    <View key={idx} style={{ flexDirection: "row", alignItems: "flex-start", gap: sp(6), backgroundColor: colors.surface, borderRadius: sp(8), padding: sp(8) }}>
                      <Ionicons name="time-outline" size={rf(11)} color={colors.textMuted} style={{ marginTop: 1 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: rf(10), fontFamily: "Inter_400Regular", color: colors.textMuted }}>
                          {new Date(entry.changedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </Text>
                        <Text style={{ fontSize: rf(10), fontFamily: "Inter_400Regular", color: colors.textSecondary }} numberOfLines={1}>
                          → {entry.to.length > 40 ? entry.to.slice(0, 40) + "…" : entry.to}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </Animated.View>
        )}

        {/* Standard Link — Dynamic Destination for Standard QR */}
        {!isBusiness && standardLink && (
          <Animated.View entering={FadeInDown.duration(350).delay(80)}>
            <View style={{
              borderRadius: sp(18), borderWidth: 1, borderColor: colors.primary + "40",
              backgroundColor: colors.primaryDim + "30", padding: sp(16), marginBottom: sp(14),
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp(8), marginBottom: sp(6) }}>
                <Ionicons name="git-branch-outline" size={rf(15)} color={colors.primary} />
                <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: colors.primary }}>
                  Dynamic Destination
                </Text>
                <View style={{ borderRadius: sp(6), paddingHorizontal: sp(7), paddingVertical: sp(2), backgroundColor: colors.primaryDim }}>
                  <Text style={{ fontSize: rf(9), fontFamily: "Inter_700Bold", color: colors.primary }}>DYNAMIC</Text>
                </View>
              </View>
              <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textSecondary, marginBottom: sp(10) }} numberOfLines={2}>
                {standardLink.rawContent}
              </Text>

              {editingDestination ? (
                <View style={{ gap: sp(8) }}>
                  <TextInput
                    value={newDestination}
                    onChangeText={(t) => { setNewDestination(t); setDestinationError(null); }}
                    placeholder="https://new-url.com"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                    keyboardType="url"
                    style={{
                      backgroundColor: colors.surface, borderRadius: sp(10), borderWidth: 1,
                      borderColor: destinationError ? colors.danger : colors.surfaceBorder,
                      paddingHorizontal: sp(12), paddingVertical: sp(9),
                      fontSize: rf(13), color: colors.text, fontFamily: "Inter_400Regular",
                    }}
                  />
                  {destinationError && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: sp(4) }}>
                      <Ionicons name="warning-outline" size={rf(12)} color={colors.danger} />
                      <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.danger, flex: 1 }}>
                        {destinationError}
                      </Text>
                    </View>
                  )}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: sp(6), backgroundColor: colors.surface, borderRadius: sp(8), padding: sp(8) }}>
                    <Ionicons name="shield-checkmark-outline" size={rf(12)} color={colors.textMuted} />
                    <Text style={{ fontSize: rf(10), fontFamily: "Inter_400Regular", color: colors.textMuted, flex: 1 }}>
                      New URL will be checked for threats before saving
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: sp(8) }}>
                    <Pressable onPress={() => { setEditingDestination(false); setDestinationError(null); }} style={{ flex: 1, borderRadius: sp(10), borderWidth: 1, borderColor: colors.surfaceBorder, padding: sp(9), alignItems: "center" }}>
                      <Text style={{ fontSize: rf(13), fontFamily: "Inter_600SemiBold", color: colors.textSecondary }}>Cancel</Text>
                    </Pressable>
                    <Pressable onPress={handleUpdateStandardDestination} disabled={savingDestination || isValidating} style={{ flex: 2, borderRadius: sp(10), backgroundColor: colors.primary, padding: sp(9), alignItems: "center", flexDirection: "row", justifyContent: "center", gap: sp(6) }}>
                      {(isValidating || savingDestination) && <ActivityIndicator size="small" color="#fff" />}
                      <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: "#fff" }}>
                        {isValidating ? "Scanning…" : savingDestination ? "Saving…" : "Update URL"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  onPress={() => { setNewDestination(standardLink.rawContent); setEditingDestination(true); }}
                  style={({ pressed }) => [{
                    flexDirection: "row", alignItems: "center", gap: sp(6),
                    borderRadius: sp(10), backgroundColor: colors.primaryDim,
                    paddingHorizontal: sp(12), paddingVertical: sp(8), alignSelf: "flex-start",
                    opacity: pressed ? 0.8 : 1,
                  }]}
                >
                  <Ionicons name="pencil-outline" size={rf(13)} color={colors.primary} />
                  <Text style={{ fontSize: rf(12), fontFamily: "Inter_600SemiBold", color: colors.primary }}>Change Destination</Text>
                </Pressable>
              )}
            </View>
          </Animated.View>
        )}

        {/* Edit Destination — saved QRs without a guard link or standard link */}
        {!isBusiness && !guardLink && !standardLink && (
          <Animated.View entering={FadeInDown.duration(350).delay(80)}>
            <View style={{
              borderRadius: sp(18), borderWidth: 1, borderColor: colors.primaryDim,
              backgroundColor: colors.primaryDim + "50", padding: sp(16), marginBottom: sp(14),
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp(8), marginBottom: sp(6) }}>
                <Ionicons name="create-outline" size={rf(15)} color={colors.primary} />
                <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: colors.primary }}>Edit Destination</Text>
              </View>

              {editingSavedContent ? (
                <View style={{ gap: sp(8) }}>
                  <TextInput
                    value={newSavedContent}
                    onChangeText={(t) => { setNewSavedContent(t); setSavedContentError(null); }}
                    placeholder={qrItem.content || "Enter new content…"}
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                    multiline={!qrItem.content?.startsWith("http")}
                    style={{
                      backgroundColor: colors.surface, borderRadius: sp(10), borderWidth: 1,
                      borderColor: savedContentError ? colors.danger : colors.surfaceBorder,
                      paddingHorizontal: sp(12), paddingVertical: sp(9),
                      fontSize: rf(13), color: colors.text, fontFamily: "Inter_400Regular",
                    }}
                  />
                  {savedContentError && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: sp(4) }}>
                      <Ionicons name="warning-outline" size={rf(12)} color={colors.danger} />
                      <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.danger, flex: 1 }}>
                        {savedContentError}
                      </Text>
                    </View>
                  )}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: sp(6), backgroundColor: colors.surface, borderRadius: sp(8), padding: sp(8) }}>
                    <Ionicons name="print-outline" size={rf(12)} color={colors.textMuted} />
                    <Text style={{ fontSize: rf(10), fontFamily: "Inter_400Regular", color: colors.textMuted, flex: 1 }}>
                      Printed copies of this QR will be outdated after updating
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: sp(8) }}>
                    <Pressable onPress={() => { setEditingSavedContent(false); setSavedContentError(null); }} style={{ flex: 1, borderRadius: sp(10), borderWidth: 1, borderColor: colors.surfaceBorder, padding: sp(9), alignItems: "center" }}>
                      <Text style={{ fontSize: rf(13), fontFamily: "Inter_600SemiBold", color: colors.textSecondary }}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      onPress={handleRequestSavedContentUpdate}
                      disabled={savingSavedContent || isValidating}
                      style={{ flex: 2, borderRadius: sp(10), backgroundColor: colors.primary, padding: sp(9), alignItems: "center", flexDirection: "row", justifyContent: "center", gap: sp(6) }}
                    >
                      {(isValidating || savingSavedContent) && <ActivityIndicator size="small" color="#fff" />}
                      <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: "#fff" }}>
                        {isValidating ? "Scanning…" : savingSavedContent ? "Saving…" : "Update Content"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View style={{ gap: sp(8) }}>
                  <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textSecondary }} numberOfLines={2}>
                    {qrItem.content || "No content"}
                  </Text>
                  <Pressable
                    onPress={() => { setNewSavedContent(qrItem.content || ""); setEditingSavedContent(true); }}
                    style={({ pressed }) => [{
                      flexDirection: "row", alignItems: "center", gap: sp(6),
                      borderRadius: sp(10), backgroundColor: colors.primaryDim,
                      paddingHorizontal: sp(12), paddingVertical: sp(8), alignSelf: "flex-start",
                      opacity: pressed ? 0.8 : 1,
                    }]}
                  >
                    <Ionicons name="pencil-outline" size={rf(13)} color={colors.primary} />
                    <Text style={{ fontSize: rf(12), fontFamily: "Inter_600SemiBold", color: colors.primary }}>Edit Content</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </Animated.View>
        )}

        {/* Design */}
        <Animated.View entering={FadeInDown.duration(350).delay(100)}>
          <Pressable
            onPress={() => setDesignOpen((v) => !v)}
            style={({ pressed }) => [{
              flexDirection: "row", alignItems: "center", justifyContent: "space-between",
              borderRadius: sp(18), borderWidth: 1, borderColor: colors.surfaceBorder,
              backgroundColor: colors.surface, padding: sp(16),
              marginBottom: designOpen ? sp(0) : sp(14),
              opacity: pressed ? 0.85 : 1,
            }]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp(10) }}>
              <View style={{ width: sp(34), height: sp(34), borderRadius: sp(10), backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="color-palette-outline" size={rf(16)} color={colors.primary} />
              </View>
              <Text style={{ fontSize: rf(14), fontFamily: "Inter_700Bold", color: colors.text }}>Customize Design</Text>
            </View>
            <Ionicons name={designOpen ? "chevron-up" : "chevron-down"} size={rf(16)} color={colors.textMuted} />
          </Pressable>

          {designOpen && (
            <Animated.View entering={FadeInDown.duration(200).springify()} style={{
              borderRadius: sp(18), borderTopLeftRadius: 0, borderTopRightRadius: 0,
              borderWidth: 1, borderTopWidth: 0, borderColor: colors.surfaceBorder,
              backgroundColor: colors.surface, padding: sp(16), marginBottom: sp(14),
            }}>
              <Text style={{ fontSize: rf(11), fontFamily: "Inter_600SemiBold", color: colors.textSecondary, marginBottom: sp(10) }}>QR Color</Text>
              <View style={{ flexDirection: "row", gap: sp(10), marginBottom: sp(16) }}>
                {FG_COLORS.map((c) => (
                  <Pressable key={c.color} onPress={() => { setFgColor(c.color); setDesignDirty(true); }}
                    style={{ width: sp(34), height: sp(34), borderRadius: sp(17), backgroundColor: c.color, borderWidth: fgColor === c.color ? 3 : 1, borderColor: fgColor === c.color ? colors.primary : colors.surfaceBorder, alignItems: "center", justifyContent: "center" }}>
                    {fgColor === c.color && <Ionicons name="checkmark" size={rf(14)} color="#fff" />}
                  </Pressable>
                ))}
              </View>
              <Text style={{ fontSize: rf(11), fontFamily: "Inter_600SemiBold", color: colors.textSecondary, marginBottom: sp(10) }}>Background</Text>
              <View style={{ flexDirection: "row", gap: sp(10), marginBottom: sp(16) }}>
                {BG_COLORS.map((c) => (
                  <Pressable key={c.color} onPress={() => { setBgColor(c.color); setDesignDirty(true); }}
                    style={{ width: sp(34), height: sp(34), borderRadius: sp(17), backgroundColor: c.color, borderWidth: bgColor === c.color ? 3 : 1, borderColor: bgColor === c.color ? colors.primary : colors.surfaceBorder, alignItems: "center", justifyContent: "center" }}>
                    {bgColor === c.color && <Ionicons name="checkmark" size={rf(14)} color={colors.text} />}
                  </Pressable>
                ))}
              </View>
              {designDirty && (
                <Pressable onPress={handleSaveDesign} disabled={saving} style={({ pressed }) => [{ opacity: pressed || saving ? 0.8 : 1 }]}>
                  <LinearGradient colors={[colors.primary, colors.primaryShade]} style={{ borderRadius: sp(12), paddingVertical: sp(11), alignItems: "center", flexDirection: "row", justifyContent: "center", gap: sp(6) }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    {saving ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark-circle-outline" size={rf(16)} color="#fff" />}
                    <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: "#fff" }}>{saving ? "Saving…" : "Save Design"}</Text>
                  </LinearGradient>
                </Pressable>
              )}
            </Animated.View>
          )}
        </Animated.View>

        {/* Active toggle */}
        <Animated.View entering={FadeInDown.duration(350).delay(120)}>
          <View style={{
            flexDirection: "row", alignItems: "center", justifyContent: "space-between",
            borderRadius: sp(18), borderWidth: 1, borderColor: colors.surfaceBorder,
            backgroundColor: colors.surface, padding: sp(16), marginBottom: sp(14),
          }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp(10) }}>
              <View style={{ width: sp(34), height: sp(34), borderRadius: sp(10), backgroundColor: isActive ? (colors as any).safeDim ?? colors.primaryDim : (colors as any).dangerDim ?? colors.surfaceLight, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name={isActive ? "radio-button-on-outline" : "pause-circle-outline"} size={rf(16)} color={isActive ? colors.safe : colors.danger} />
              </View>
              <View>
                <Text style={{ fontSize: rf(14), fontFamily: "Inter_700Bold", color: colors.text }}>{isActive ? "QR is Active" : "QR is Inactive"}</Text>
                <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textMuted }}>{isActive ? "Visible to scanners" : "Hidden from scanners"}</Text>
              </View>
            </View>
            {togglingActive ? <ActivityIndicator size="small" color={colors.primary} /> : (
              <Switch value={isActive} onValueChange={(v) => handleToggleActive(v)} trackColor={{ false: colors.surfaceBorder, true: colors.safe + "80" }} thumbColor={isActive ? colors.safe : colors.textMuted} />
            )}
          </View>
        </Animated.View>

        {/* View public page */}
        <Animated.View entering={FadeInDown.duration(350).delay(140)}>
          <Pressable
            onPress={() => {
              const qrCodeId = (qrItem as any).qrCodeId;
              const guardUuid = qrItem.guardUuid;
              const route = guardUuid && qrCodeId
                ? `/qr-detail/${qrCodeId}?guardUuid=${guardUuid}`
                : qrCodeId ? `/qr-detail/${qrCodeId}` : null;
              if (route) router.push(route as any);
            }}
            disabled={!((qrItem as any).qrCodeId)}
            style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1, marginBottom: sp(8), transform: [{ scale: pressed ? 0.98 : 1 }] }]}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryShade]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ borderRadius: sp(18), padding: sp(16), flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp(12) }}>
                <View style={{ width: sp(36), height: sp(36), borderRadius: sp(10), backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="globe-outline" size={rf(18)} color="#fff" />
                </View>
                <View>
                  <Text style={{ fontSize: rf(14), fontFamily: "Inter_700Bold", color: "#fff" }}>View Public Page</Text>
                  <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)" }}>See exactly what people see when they scan</Text>
                </View>
              </View>
              <Ionicons name="arrow-forward" size={rf(18)} color="rgba(255,255,255,0.8)" />
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </ScrollView>

      {/* Confirmation modal for destination / content changes */}
      <Modal
        visible={confirmModalOpen}
        transparent
        animationType="fade"
        onRequestClose={handleCancelPendingAction}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", alignItems: "center", padding: sp(24) }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: sp(22), padding: sp(24), width: "100%", maxWidth: 380 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp(10), marginBottom: sp(14) }}>
              <View style={{ width: sp(38), height: sp(38), borderRadius: sp(12), backgroundColor: colors.warningDim, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="warning-outline" size={rf(20)} color={colors.warning} />
              </View>
              <Text style={{ fontSize: rf(15), fontFamily: "Inter_700Bold", color: colors.text, flex: 1 }}>Confirm Update</Text>
            </View>
            <Text style={{ fontSize: rf(13), fontFamily: "Inter_400Regular", color: colors.textSecondary, lineHeight: rf(20), marginBottom: sp(20) }}>
              {confirmModalMessage}
            </Text>
            <View style={{ flexDirection: "row", gap: sp(10) }}>
              <Pressable
                onPress={handleCancelPendingAction}
                style={({ pressed }) => [{ flex: 1, borderRadius: sp(12), borderWidth: 1, borderColor: colors.surfaceBorder, paddingVertical: sp(12), alignItems: "center", opacity: pressed ? 0.75 : 1 }]}
              >
                <Text style={{ fontSize: rf(13), fontFamily: "Inter_600SemiBold", color: colors.textSecondary }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleConfirmPendingAction}
                style={({ pressed }) => [{ flex: 2, borderRadius: sp(12), backgroundColor: colors.primary, paddingVertical: sp(12), alignItems: "center", opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: "#fff" }}>Confirm Update</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <DeactivateModal
        visible={deactivateModalOpen}
        msgInput={deactivationMsgInput}
        onChangeMsgInput={setDeactivationMsgInput}
        onCancel={() => setDeactivateModalOpen(false)}
        onConfirm={handleConfirmDeactivate}
      />

      <GroupPickerModal
        visible={groupPickerOpen}
        onClose={() => setGroupPickerOpen(false)}
        qrDocId={qrItem.docId}
        qrLabel={displayTitle}
      />
    </View>
  );
}
