import { useState, useCallback } from "react";
import {
  View, Text, ScrollView, Pressable, Platform, Switch,
  TextInput, useWindowDimensions, ActivityIndicator, Modal,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTopInset } from "@/lib/utils/platform";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import QRCode from "react-native-qrcode-svg";
import { useTheme } from "@/contexts/ThemeContext";
import { useMyQrDetail, FG_COLORS, BG_COLORS } from "@/features/my-qr/hooks/useMyQrDetail";
import DeactivateModal from "@/features/my-qr/components/DeactivateModal";
import GroupPickerModal from "@/components/groups/GroupPickerModal";

import { getContentTypeMeta as getCtMeta } from "@/constants/content-types";

// ─── Content-type detection ───────────────────────────────────────────────────
function getDetailContentType(item: any): string {
  const stored = item.contentType as string || "text";
  if (stored && stored !== "text" && stored !== "url") return stored;
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
  if (/^bitcoin:|^ethereum:|^litecoin:|^solana:/.test(src)) return "crypto";
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
  if (src.includes("paypal.me") || src.includes("paypal.com/paypalme")) return "paypal";
  if (src.includes("venmo.com")) return "venmo";
  if (src.includes("zoom.us")) return "zoom";
  if (src.includes("calendly.com")) return "calendly";
  if (src.includes("maps.google.com") || src.includes("goo.gl/maps") || src.includes("maps.app.goo.gl")) return "location";
  if (src.includes("apps.apple.com") || src.includes("play.google.com") || src.includes("appstore.com")) return "appdownload";
  if (src.includes("rzp.io") || src.includes("razorpay.com") || src.includes("paytm.com/pay")) return "paymentlink";
  if (/^[\w.\-+]+@[\w]{2,}$/.test(src) && !/\.(com|in|org|net|io|co|app)$/.test(src.split("@")[1] || "")) return "upi";
  if (/^\+?[\d]{7,15}$/.test(src.replace(/[\s\-()]/g, ""))) return "phone";
  const withScheme = src.startsWith("http") ? src : `https://${src}`;
  try {
    const u = new URL(withScheme);
    const h = u.hostname;
    if (h.includes(".") && h.length >= 4 && !/^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.|127\.|localhost)/.test(h) && !u.pathname.startsWith("/guard/") && !u.pathname.startsWith("/go/")) return "url";
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
    case "phone": case "mobilepay": case "grab":
      return src.replace(/^tel:/, "").trim();
    case "wifi": { const m = src.match(/S:([^;]+)/); if (m) return m[1]; break; }
    case "upi": case "scantopay": case "bharatqr": {
      if (src.startsWith("upi://pay?")) { try { const pa = new URLSearchParams(src.replace("upi://pay?", "")).get("pa"); if (pa) return pa; } catch {} }
      if (/^[\w.\-+]+@[\w]+$/.test(src)) return src;
      break;
    }
    case "event": case "calendar": {
      if (src.startsWith("BEGIN:")) { const m = src.match(/SUMMARY:([^\r\n]+)/); if (m) return m[1].trim(); }
      break;
    }
    case "contact": { const m = src.match(/FN:([^\r\n]+)/); if (m) return m[1].trim(); break; }
    case "sms": return src.replace(/^SMSTO?:/i, "").split(":")[0].trim();
    case "email": return src.replace(/^mailto:/i, "").split("?")[0].trim();
    case "whatsapp": {
      try { const u = new URL(src.startsWith("http") ? src : `https://${src}`); if (u.hostname === "wa.me" || u.hostname === "api.whatsapp.com") { const phone = u.pathname.replace(/^\//, ""); if (phone) return "+" + phone; } } catch {}
      break;
    }
    case "instagram": case "twitter": case "telegram": {
      const parts = src.replace(/\/$/, "").split("/");
      const handle = parts[parts.length - 1] || "";
      if (handle && !handle.includes(".")) return "@" + handle;
      break;
    }
    case "tiktok": { const handle = src.replace(/.*tiktok\.com\/@?/, "").replace(/\/$/, ""); if (handle) return "@" + handle.replace(/^@/, ""); break; }
    case "zoom": { if (src.includes("zoom.us/j/")) return "Meeting " + (src.split("/j/")[1]?.split("?")[0] || ""); return "Zoom Meeting"; }
  }
  if (src) {
    const isGuardOrGo = src.includes("/guard/") || src.includes("/go/");
    const withScheme = src.startsWith("http") ? src : `https://${src}`;
    try {
      const u = new URL(withScheme);
      const h = u.hostname.replace(/^www\./, "");
      const isLocal = /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.|127\.|localhost)/.test(h);
      if (!isLocal && !isGuardOrGo) return h;
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
    case "phone": case "mobilepay": case "grab": {
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
    case "upi": case "scantopay": case "bharatqr": {
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
    case "event": case "calendar": {
      if (!src.startsWith("BEGIN:")) return [];
      const title = src.match(/SUMMARY:([^\r\n]+)/)?.[1]?.trim() || "";
      const start = src.match(/DTSTART:([^\r\n]+)/)?.[1]?.trim() || "";
      const loc = src.match(/LOCATION:([^\r\n]+)/)?.[1]?.trim() || "";
      const desc = src.match(/DESCRIPTION:([^\r\n]+)/)?.[1]?.trim() || "";
      const rows: ContentDetailRow[] = [];
      if (title) rows.push({ label: "Event Title", value: title, icon: "calendar-outline" });
      if (start) { const ds = start.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2}).*/, "$3/$2/$1 $4:$5"); rows.push({ label: "Start", value: ds, icon: "time-outline" }); }
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
      if (/^\+?[\d]{7,15}$/.test(src.replace(/[\s\-()]/g, ""))) return [{ label: "WhatsApp Number", value: src, icon: "logo-whatsapp" }];
      return [];
    }
    case "instagram": { const parts = src.replace(/\/$/, "").split("/"); const handle = parts[parts.length - 1] || ""; if (!handle || handle.includes(".")) return []; return [{ label: "Instagram", value: "@" + handle, icon: "logo-instagram" }]; }
    case "twitter": { const parts = src.replace(/\/$/, "").split("/"); const handle = parts[parts.length - 1] || ""; if (!handle || handle.includes(".")) return []; return [{ label: "Twitter / X", value: "@" + handle, icon: "logo-twitter" }]; }
    case "telegram": { const parts = src.replace(/\/$/, "").split("/"); const handle = parts[parts.length - 1] || ""; if (!handle || handle.includes(".")) return []; return [{ label: "Telegram", value: "@" + handle, icon: "send-outline" }]; }
    case "tiktok": { const handle = src.replace(/.*tiktok\.com\/@?/, "").replace(/\/$/, ""); if (!handle) return []; return [{ label: "TikTok", value: "@" + handle.replace(/^@/, ""), icon: "musical-note-outline" }]; }
    case "youtube": { const rows: ContentDetailRow[] = []; try { const u = new URL(src.startsWith("http") ? src : `https://${src}`); const channel = u.pathname.replace(/^\/(c\/|channel\/|@)?/, "").replace(/\/$/, ""); if (channel) rows.push({ label: "Channel", value: channel, icon: "logo-youtube" }); } catch {} if (rows.length === 0) rows.push({ label: "YouTube", value: src, icon: "logo-youtube" }); return rows; }
    case "linkedin": { const rows: ContentDetailRow[] = []; try { const u = new URL(src.startsWith("http") ? src : `https://${src}`); const profile = u.pathname.replace(/^\/(in\/|company\/)?/, "").replace(/\/$/, ""); if (profile) rows.push({ label: "LinkedIn", value: profile, icon: "logo-linkedin" }); } catch {} if (rows.length === 0) rows.push({ label: "LinkedIn", value: src, icon: "logo-linkedin" }); return rows; }
    case "zoom": { let meetingId = ""; if (src.includes("zoom.us/j/")) meetingId = src.split("/j/")[1]?.split("?")[0] || ""; return meetingId ? [{ label: "Meeting ID", value: meetingId, icon: "videocam-outline" }] : []; }
    case "crypto": { const coin = src.split(":")[0] || "crypto"; const address = src.split(":")[1]?.split("?")[0] || ""; const rows: ContentDetailRow[] = [{ label: "Coin", value: coin.charAt(0).toUpperCase() + coin.slice(1), icon: "logo-bitcoin" }]; if (address) rows.push({ label: "Wallet Address", value: address.length > 28 ? address.slice(0, 28) + "…" : address, icon: "copy-outline" }); return rows; }
    case "location": { try { const u = new URL(src.startsWith("http") ? src : `https://${src}`); const q = u.searchParams.get("q") || u.searchParams.get("query") || ""; if (q) return [{ label: "Location", value: q, icon: "location-outline" }]; } catch {} return []; }
    case "url": { if (isGuardOrGo) return []; try { const u = new URL(src.startsWith("http") ? src : `https://${src}`); const h = u.hostname.replace(/^www\./, ""); const isLocal = /^(192\.168\.|10\.|127\.|localhost)/.test(h); if (!isLocal) return [{ label: "URL", value: src, icon: "link-outline" }]; } catch {} return []; }
    case "text": { if (src.length < 500 && !isGuardOrGo) return [{ label: "Text Content", value: src, icon: "text-outline" }]; return []; }
    case "calendly": { if (isGuardOrGo) return []; try { const u = new URL(src.startsWith("http") ? src : `https://${src}`); const parts = u.pathname.replace(/^\//, "").split("/").filter(Boolean); const username = parts[0] || ""; const eventType = parts[1] || ""; const rows: ContentDetailRow[] = []; if (username) rows.push({ label: "Calendly Username", value: username, icon: "person-outline" }); if (eventType) rows.push({ label: "Event Type", value: eventType, icon: "calendar-outline" }); if (rows.length > 0) return rows; } catch {} return []; }
    case "paymentlink": case "payment": { if (isGuardOrGo) return []; try { const u = new URL(src.startsWith("http") ? src : `https://${src}`); const domain = u.hostname.replace(/^www\./, ""); const rows: ContentDetailRow[] = [{ label: "Payment Page", value: domain, icon: "card-outline" }]; if (u.pathname && u.pathname !== "/") rows.push({ label: "Path", value: u.pathname, icon: "git-branch-outline" }); return rows; } catch {} return []; }
    case "reviewpage": case "googlereview": { if (isGuardOrGo) return []; try { const u = new URL(src.startsWith("http") ? src : `https://${src}`); return [{ label: "Review Page", value: u.hostname.replace(/^www\./, ""), icon: "star-outline" }]; } catch {} return []; }
    case "restaurantmenu": case "menucatalogue": { if (isGuardOrGo) return []; try { const u = new URL(src.startsWith("http") ? src : `https://${src}`); return [{ label: "Menu / Catalogue", value: u.hostname.replace(/^www\./, ""), icon: "list-outline" }]; } catch {} return []; }
    case "donation": { if (isGuardOrGo) return []; try { const u = new URL(src.startsWith("http") ? src : `https://${src}`); return [{ label: "Donation Page", value: u.hostname.replace(/^www\./, ""), icon: "heart-outline" }]; } catch {} return []; }
    case "appdownload": case "app": { if (isGuardOrGo) return []; const isApple = src.includes("apps.apple.com"); const store = isApple ? "App Store" : "Google Play"; try { const u = new URL(src.startsWith("http") ? src : `https://${src}`); const appName = u.pathname.split("/").filter(Boolean).pop()?.replace(/-/g, " ") || ""; const rows: ContentDetailRow[] = [{ label: "Store", value: store, icon: "download-outline" }]; if (appName) rows.push({ label: "App", value: appName, icon: "apps-outline" }); return rows; } catch {} return [{ label: "Store", value: store, icon: "download-outline" }]; }
    case "spotify": { try { const u = new URL(src.startsWith("http") ? src : `https://${src}`); const parts = u.pathname.split("/").filter(Boolean); if (parts.length >= 2) return [{ label: parts[0].charAt(0).toUpperCase() + parts[0].slice(1), value: parts[1].replace(/-/g, " "), icon: "musical-notes-outline" }]; } catch {} return []; }
    case "discord": { try { const u = new URL(src.startsWith("http") ? src : `https://${src}`); const invite = u.pathname.replace(/^\//, ""); if (invite) return [{ label: "Invite Code", value: invite, icon: "logo-discord" }]; } catch {} return []; }
    case "facebook": { try { const u = new URL(src.startsWith("http") ? src : `https://${src}`); const page = u.pathname.replace(/^\//, "").replace(/\/$/, ""); if (page) return [{ label: "Facebook Page", value: page, icon: "logo-facebook" }]; } catch {} return []; }
    case "paypal": { try { const u = new URL(src.startsWith("http") ? src : `https://${src}`); const username = u.pathname.replace(/^\//, ""); if (username) return [{ label: "PayPal.me", value: username, icon: "wallet-outline" }]; } catch {} return []; }
    default: return [];
  }
}

function formatDate(iso: string) {
  try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return iso; }
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function MyQrDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const s = Math.min(Math.max(width / 390, 0.82), 1.0);
  const rf = (n: number) => Math.round(n * s);
  const sp = (n: number) => Math.round(n * s);
  const topInset = useTopInset();
  const tabBarHeight = 62 + insets.bottom + 8;

  const [groupPickerOpen, setGroupPickerOpen] = useState(false);
  const [structuredFields, setStructuredFields] = useState<Record<string, string>>({});

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
    handleUpdateDestination, handleUpdateStandardDestination, handleUpdateRawContent, handleRequestSavedContentUpdate,
    handleSaveDesign, handleToggleActive,
    handleConfirmDeactivate, handleCopyContent, handleShare, handleDownloadPdf,
    sharingQr, downloadingPdf,
  } = useMyQrDetail(id as string);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <StatusBar style={isDark ? "light" : "dark"} backgroundColor={colors.background} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!qrItem) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", paddingTop: topInset }}>
        <StatusBar style={isDark ? "light" : "dark"} backgroundColor={colors.background} />
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

  // Determine the "live" source for content resolution
  const liveRaw = standardLink?.rawContent
    ?? (guardLink?.currentDestination && !guardLink.currentDestination.includes("/guard/") && !guardLink.currentDestination.includes("/go/")
      ? guardLink.currentDestination : null);
  const liveItem = liveRaw
    ? { ...(qrItem as any), content: liveRaw, displayDestination: liveRaw }
    : (qrItem as any);

  const effectiveContentType = getDetailContentType(liveItem);
  const ctMeta = getCtMeta(effectiveContentType);
  const displayTitle = getDetailDisplayTitle(liveItem);
  const contentRows = parseQrContentDetails(liveItem);

  // Is this a dynamic/branded QR?
  const hasGuardLink = !!guardLink;
  const hasStandardLink = !!standardLink;
  const isGuardQr = !!(qrItem as any).guardUuid;
  const isStandardQr = !isGuardQr && (qrItem.content || "").includes("/go/");
  const isDynamic = isGuardQr || isStandardQr;
  const guardDest = guardLink?.currentDestination || "";
  const isPrivateDest = /^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.|127\.|localhost)/.test(guardDest) || guardDest.includes("/guard/");

  // Input helpers
  const labelStyle = { fontSize: rf(11), fontFamily: "Inter_600SemiBold" as const, color: colors.textMuted, marginBottom: sp(5), textTransform: "uppercase" as const, letterSpacing: 0.5 };
  const inputStyle = { backgroundColor: colors.background, borderRadius: sp(10), borderWidth: 1, borderColor: colors.surfaceBorder, paddingHorizontal: sp(12), paddingVertical: sp(10), fontSize: rf(13), color: colors.text, fontFamily: "Inter_400Regular" as const };

  function renderStructuredFields() {
    const f = structuredFields;
    const set = (k: string, v: string) => setStructuredFields((prev) => ({ ...prev, [k]: v }));
    switch (effectiveContentType) {
      case "text": return (<View><Text style={labelStyle}>Text Content</Text><TextInput value={f.text || ""} onChangeText={(v) => set("text", v)} placeholder="Your text…" placeholderTextColor={colors.textMuted} multiline style={{ ...inputStyle, minHeight: sp(72), textAlignVertical: "top" }} /></View>);
      case "phone": case "mobilepay": case "grab": return (<View><Text style={labelStyle}>Phone Number</Text><TextInput value={f.phone || ""} onChangeText={(v) => set("phone", v)} placeholder="+1 555 000 0000" placeholderTextColor={colors.textMuted} keyboardType="phone-pad" style={inputStyle} /></View>);
      case "email": return (<View style={{ gap: sp(10) }}><View><Text style={labelStyle}>Email Address</Text><TextInput value={f.email || ""} onChangeText={(v) => set("email", v)} placeholder="name@example.com" placeholderTextColor={colors.textMuted} keyboardType="email-address" autoCapitalize="none" style={inputStyle} /></View><View><Text style={labelStyle}>Subject (optional)</Text><TextInput value={f.subject || ""} onChangeText={(v) => set("subject", v)} placeholder="Hello!" placeholderTextColor={colors.textMuted} style={inputStyle} /></View></View>);
      case "sms": return (<View style={{ gap: sp(10) }}><View><Text style={labelStyle}>Phone Number</Text><TextInput value={f.phone || ""} onChangeText={(v) => set("phone", v)} placeholder="+1 555 000 0000" placeholderTextColor={colors.textMuted} keyboardType="phone-pad" style={inputStyle} /></View><View><Text style={labelStyle}>Pre-filled Message (optional)</Text><TextInput value={f.message || ""} onChangeText={(v) => set("message", v)} placeholder="Hello!" placeholderTextColor={colors.textMuted} multiline style={{ ...inputStyle, minHeight: sp(60), textAlignVertical: "top" }} /></View></View>);
      case "upi": case "scantopay": case "bharatqr": return (<View style={{ gap: sp(10) }}><View><Text style={labelStyle}>UPI ID / Payment Handle</Text><TextInput value={f.pa || ""} onChangeText={(v) => set("pa", v)} placeholder="name@upi" placeholderTextColor={colors.textMuted} autoCapitalize="none" keyboardType="email-address" style={inputStyle} /></View><View><Text style={labelStyle}>Payee Name</Text><TextInput value={f.pn || ""} onChangeText={(v) => set("pn", v)} placeholder="Business or Person Name" placeholderTextColor={colors.textMuted} style={inputStyle} /></View><View><Text style={labelStyle}>Amount ₹ (optional)</Text><TextInput value={f.am || ""} onChangeText={(v) => set("am", v)} placeholder="0.00" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" style={inputStyle} /></View></View>);
      case "wifi": return (<View style={{ gap: sp(10) }}><View><Text style={labelStyle}>Network Name (SSID)</Text><TextInput value={f.ssid || ""} onChangeText={(v) => set("ssid", v)} placeholder="MyWiFiNetwork" placeholderTextColor={colors.textMuted} style={inputStyle} /></View><View><Text style={labelStyle}>Password</Text><TextInput value={f.password || ""} onChangeText={(v) => set("password", v)} placeholder="WiFi password" placeholderTextColor={colors.textMuted} secureTextEntry style={inputStyle} /></View><View><Text style={labelStyle}>Security Type</Text><TextInput value={f.security || ""} onChangeText={(v) => set("security", v)} placeholder="WPA" placeholderTextColor={colors.textMuted} autoCapitalize="characters" style={inputStyle} /></View></View>);
      case "calendly": return (<View style={{ gap: sp(10) }}><View><Text style={labelStyle}>Calendly Username</Text><TextInput value={f.username || ""} onChangeText={(v) => set("username", v)} placeholder="yourusername" placeholderTextColor={colors.textMuted} autoCapitalize="none" style={inputStyle} /></View><View><Text style={labelStyle}>Event Type Slug (optional)</Text><TextInput value={f.eventType || ""} onChangeText={(v) => set("eventType", v)} placeholder="30min" placeholderTextColor={colors.textMuted} autoCapitalize="none" style={inputStyle} /></View></View>);
      case "zoom": return (<View style={{ gap: sp(10) }}><View><Text style={labelStyle}>Meeting ID</Text><TextInput value={f.meetingId || ""} onChangeText={(v) => set("meetingId", v)} placeholder="123 456 7890" placeholderTextColor={colors.textMuted} keyboardType="number-pad" style={inputStyle} /></View><View><Text style={labelStyle}>Passcode (optional)</Text><TextInput value={f.passcode || ""} onChangeText={(v) => set("passcode", v)} placeholder="123456" placeholderTextColor={colors.textMuted} keyboardType="number-pad" style={inputStyle} /></View></View>);
      default: return null;
    }
  }

  function buildContent(f: Record<string, string>): string {
    switch (effectiveContentType) {
      case "text": return f.text || "";
      case "phone": case "mobilepay": case "grab": return "tel:" + (f.phone || "").replace(/^tel:/, "");
      case "email": { const addr = (f.email || "").replace(/^mailto:/, ""); const p = new URLSearchParams(); if (f.subject) p.set("subject", f.subject); if (f.body) p.set("body", f.body); const qs = p.toString(); return "mailto:" + addr + (qs ? "?" + qs : ""); }
      case "sms": return "SMSTO:" + (f.phone || "") + ":" + (f.message || "");
      case "upi": case "scantopay": case "bharatqr": { const p = new URLSearchParams(); if (f.pa) p.set("pa", f.pa); if (f.pn) p.set("pn", f.pn); if (f.am) p.set("am", f.am); p.set("cu", "INR"); return "upi://pay?" + p.toString(); }
      case "wifi": return `WIFI:T:${f.security || "WPA"};S:${f.ssid || ""};P:${f.password || ""};;`;
      case "calendly": { const username = f.username || ""; const eventType = f.eventType || ""; return `https://calendly.com/${username}${eventType ? "/" + eventType : ""}`; }
      case "zoom": { const base = `https://zoom.us/j/${(f.meetingId || "").replace(/\s/g, "")}`; return f.passcode ? base + `?pwd=${f.passcode}` : base; }
      default: return "";
    }
  }

  function initStructuredFields(): Record<string, string> {
    const rawContent = standardLink?.rawContent || qrItem.content || "";
    switch (effectiveContentType) {
      case "text": return { text: rawContent.replace(/^https?:\/\//, "") };
      case "phone": case "mobilepay": case "grab": return { phone: rawContent.replace(/^tel:/, "") };
      case "email": { const bare = rawContent.replace(/^mailto:/, ""); const [addr, qs = ""] = bare.split("?"); const p = new URLSearchParams(qs); return { email: addr, subject: p.get("subject") || "", body: p.get("body") || "" }; }
      case "sms": { const stripped = rawContent.replace(/^SMSTO?:/i, ""); const colonIdx = stripped.indexOf(":"); return colonIdx !== -1 ? { phone: stripped.slice(0, colonIdx), message: stripped.slice(colonIdx + 1) } : { phone: stripped, message: "" }; }
      case "upi": case "scantopay": case "bharatqr": { if (rawContent.startsWith("upi://pay?")) { const p = new URLSearchParams(rawContent.replace("upi://pay?", "")); return { pa: p.get("pa") || "", pn: p.get("pn") || "", am: p.get("am") || "" }; } return { pa: rawContent, pn: "", am: "" }; }
      case "wifi": return { ssid: rawContent.match(/S:([^;]+)/)?.[1] || "", password: rawContent.match(/P:([^;]+)/)?.[1] || "", security: rawContent.match(/T:([^;]+)/)?.[1] || "WPA" };
      case "calendly": { try { const u = new URL(rawContent.startsWith("http") ? rawContent : `https://${rawContent}`); const parts = u.pathname.replace(/^\//, "").split("/").filter(Boolean); return { username: parts[0] || "", eventType: parts[1] || "" }; } catch { return { username: "", eventType: "" }; } }
      case "zoom": { const meetingId = rawContent.includes("zoom.us/j/") ? rawContent.split("/j/")[1]?.split("?")[0] || "" : rawContent; let passcode = ""; try { passcode = new URL(rawContent).searchParams.get("pwd") || ""; } catch {} return { meetingId, passcode }; }
      default: return {};
    }
  }

  const STRUCTURED_TYPES = new Set(["text", "phone", "mobilepay", "grab", "email", "sms", "upi", "scantopay", "bharatqr", "wifi", "calendly", "zoom"]);
  const READONLY_TYPES = new Set(["contact", "event", "calendar"]);
  const isStructured = STRUCTURED_TYPES.has(effectiveContentType);
  const isReadOnly = !isStructured && READONLY_TYPES.has(effectiveContentType);

  const publicShortUuid: string | null = (() => {
    if (isBusiness) {
      return (qrItem as any).guardUuid || (qrItem as any).shortUuid || null;
    }
    const content = (qrItem as any).content || "";
    const match = content.match(/\/go\/([A-Za-z0-9_-]+)/);
    if (match) return match[1];
    return (qrItem as any).shortUuid || null;
  })();

  const handleViewPublic = () => {
    if (!publicShortUuid) return;
    if (isBusiness) {
      router.push(`/qr-detail/guard-${publicShortUuid}?guardUuid=${publicShortUuid}&ownerDocId=${id}` as any);
    } else {
      router.push(`/qr-detail/std-${publicShortUuid}?standardUuid=${publicShortUuid}&ownerDocId=${id}` as any);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? "light" : "dark"} backgroundColor={colors.background} />
      {/* ── Header ── */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: sp(20), paddingTop: topInset + sp(6), paddingBottom: sp(10) }}>
        <Pressable onPress={() => router.back()} style={{ width: sp(38), height: sp(38), borderRadius: sp(19), backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="chevron-back" size={rf(20)} color={colors.text} />
        </Pressable>
        <View style={{ alignItems: "center" }}>
          <Text style={{ fontSize: rf(16), fontFamily: "Inter_700Bold", color: colors.text }}>My QR Code</Text>
          <Text style={{ fontSize: rf(10), fontFamily: "Inter_500Medium", color: colors.textMuted, marginTop: 1 }}>{ctMeta.label}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: sp(8) }}>
          {publicShortUuid ? (
            <Pressable
              onPress={handleViewPublic}
              style={{ width: sp(38), height: sp(38), borderRadius: sp(19), backgroundColor: colors.primaryDim, borderWidth: 1, borderColor: colors.primary + "35", alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name="globe-outline" size={rf(18)} color={colors.primary} />
            </Pressable>
          ) : null}
          <Pressable onPress={() => setGroupPickerOpen(true)} style={{ width: sp(38), height: sp(38), borderRadius: sp(19), backgroundColor: "#6366F115", borderWidth: 1, borderColor: "#6366F135", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="folder-outline" size={rf(18)} color="#6366F1" />
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: sp(20), paddingBottom: tabBarHeight + 20 }}>

        {/* ── Hero QR Preview Card ── */}
        <Animated.View entering={FadeIn.duration(350)}>
          <View style={{ borderRadius: sp(24), borderWidth: 1, borderColor: colors.surfaceBorder, backgroundColor: colors.surface, marginBottom: sp(14), overflow: "hidden" }}>
            {/* Colored header strip matching content type */}
            <LinearGradient
              colors={[ctMeta.color + "22", ctMeta.color + "06"]}
              style={{ paddingTop: sp(20), paddingHorizontal: sp(20), paddingBottom: sp(14), alignItems: "center" }}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              {/* Status badges */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp(6), marginBottom: sp(16) }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: sp(4), borderRadius: sp(8), paddingHorizontal: sp(8), paddingVertical: sp(3), backgroundColor: ctMeta.color + "20", borderWidth: 1, borderColor: ctMeta.color + "30" }}>
                  <Ionicons name={ctMeta.icon as any} size={rf(10)} color={ctMeta.color} />
                  <Text style={{ fontSize: rf(10), fontFamily: "Inter_700Bold", color: ctMeta.color }}>{ctMeta.label}</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: sp(4), borderRadius: sp(8), paddingHorizontal: sp(8), paddingVertical: sp(3), backgroundColor: isBusiness ? colors.warningDim : colors.primaryDim }}>
                  <Ionicons name={isBusiness ? "storefront" : "person"} size={rf(10)} color={isBusiness ? colors.warning : colors.primary} />
                  <Text style={{ fontSize: rf(10), fontFamily: "Inter_700Bold", color: isBusiness ? colors.warning : colors.primary }}>{isBusiness ? "Business" : "Individual"}</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: sp(4), borderRadius: sp(8), paddingHorizontal: sp(8), paddingVertical: sp(3), backgroundColor: isActive ? "#22c55e18" : "#ef444418" }}>
                  <View style={{ width: sp(5), height: sp(5), borderRadius: sp(3), backgroundColor: isActive ? "#22c55e" : "#ef4444" }} />
                  <Text style={{ fontSize: rf(10), fontFamily: "Inter_700Bold", color: isActive ? "#22c55e" : "#ef4444" }}>{isActive ? "Active" : "Inactive"}</Text>
                </View>
                {isDynamic && (
                  <View style={{ borderRadius: sp(8), paddingHorizontal: sp(8), paddingVertical: sp(3), backgroundColor: "#6366F118", borderWidth: 1, borderColor: "#6366F130" }}>
                    <Text style={{ fontSize: rf(10), fontFamily: "Inter_700Bold", color: "#6366F1" }}>Dynamic</Text>
                  </View>
                )}
              </View>

              {/* QR Code */}
              <View style={{ borderRadius: sp(20), overflow: "hidden", padding: sp(16), backgroundColor: bgColor, shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 6 }}>
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
              <Text style={{ fontSize: rf(16), fontFamily: "Inter_700Bold", color: colors.text, marginTop: sp(14), textAlign: "center" }} numberOfLines={2}>
                {displayTitle.length > 50 ? displayTitle.slice(0, 50) + "…" : displayTitle}
              </Text>

              {/* Subtitle from live destination */}
              {isDynamic && guardLink && guardDest && !isPrivateDest && (
                <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textMuted, marginTop: sp(3), textAlign: "center" }} numberOfLines={1}>
                  → {guardDest.length > 44 ? guardDest.slice(0, 44) + "…" : guardDest}
                </Text>
              )}
              {isDynamic && standardLink?.rawContent && (
                <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textMuted, marginTop: sp(3), textAlign: "center" }} numberOfLines={1}>
                  → {standardLink.rawContent.length > 44 ? standardLink.rawContent.slice(0, 44) + "…" : standardLink.rawContent}
                </Text>
              )}
            </LinearGradient>

            {/* Action buttons */}
            <View style={{ flexDirection: "row", gap: sp(0), borderTopWidth: 1, borderTopColor: colors.surfaceBorder }}>
              {([
                { icon: "share-outline", label: "Share", onPress: handleShare, busy: sharingQr },
                { icon: "download-outline", label: "Save PDF", onPress: handleDownloadPdf, busy: downloadingPdf },
                { icon: "copy-outline", label: "Copy", onPress: handleCopyContent, busy: false },
              ] as const).map((btn, i) => (
                <Pressable
                  key={btn.label}
                  onPress={btn.onPress}
                  disabled={btn.busy}
                  style={({ pressed }) => [{
                    flex: 1, alignItems: "center", gap: sp(4), paddingVertical: sp(14),
                    borderRightWidth: i < 2 ? 1 : 0, borderRightColor: colors.surfaceBorder,
                    opacity: pressed || btn.busy ? 0.6 : 1,
                  }]}
                >
                  {btn.busy ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name={btn.icon as any} size={rf(19)} color={colors.primary} />}
                  <Text style={{ fontSize: rf(10), fontFamily: "Inter_600SemiBold", color: colors.primary }}>{btn.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Animated.View>

        {/* ── Stats Row ── */}
        <Animated.View entering={FadeInDown.duration(350).delay(50)}>
          <View style={{ flexDirection: "row", gap: sp(10), marginBottom: sp(14) }}>
            {([
              { icon: "scan-outline", label: "Scans", value: String(qrItem.scanCount ?? 0) },
              { icon: "chatbubble-outline", label: "Comments", value: String(qrItem.commentCount ?? 0) },
              { icon: "calendar-outline", label: "Created", value: formatDate(qrItem.createdAt) },
            ] as const).map((stat) => (
              <View key={stat.label} style={{ flex: 1, borderRadius: sp(14), borderWidth: 1, borderColor: colors.surfaceBorder, backgroundColor: colors.surface, padding: sp(12), alignItems: "center", gap: sp(4) }}>
                <View style={{ width: sp(28), height: sp(28), borderRadius: sp(8), backgroundColor: colors.surfaceLight, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name={stat.icon as any} size={rf(13)} color={colors.textSecondary} />
                </View>
                <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: colors.text }} numberOfLines={1} adjustsFontSizeToFit>{stat.value}</Text>
                <Text style={{ fontSize: rf(9), fontFamily: "Inter_400Regular", color: colors.textMuted, textAlign: "center" }}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* ── Content Info Card ── */}
        <Animated.View entering={FadeInDown.duration(350).delay(65)}>
          <View style={{ borderRadius: sp(18), borderWidth: 1.5, borderColor: ctMeta.color + "35", backgroundColor: isDark ? ctMeta.color + "10" : ctMeta.bg + "88", padding: sp(16), marginBottom: sp(14) }}>
            {/* Header */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp(10), marginBottom: sp(14) }}>
              <View style={{ width: sp(40), height: sp(40), borderRadius: sp(12), backgroundColor: ctMeta.color + "18", borderWidth: 1, borderColor: ctMeta.color + "30", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name={ctMeta.icon as any} size={rf(20)} color={ctMeta.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: ctMeta.color }}>{ctMeta.label} QR Code</Text>
                <Text style={{ fontSize: rf(10), fontFamily: "Inter_400Regular", color: colors.textMuted, marginTop: 1 }}>
                  {isDynamic
                    ? (isBusiness ? "Smart Redirect — destination is updatable" : "Protected redirect — content is updatable")
                    : "Content is directly encoded in this QR"}
                </Text>
              </View>
              {isDynamic && (
                <View style={{ borderRadius: sp(8), paddingHorizontal: sp(7), paddingVertical: sp(3), backgroundColor: "#6366F115", borderWidth: 1, borderColor: "#6366F130" }}>
                  <Ionicons name="git-branch-outline" size={rf(12)} color="#6366F1" />
                </View>
              )}
            </View>

            {/* Loading state for dynamic QRs */}
            {isDynamic && !liveRaw && (isGuardQr ? !guardLink : !standardLink) && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp(8), paddingVertical: sp(8) }}>
                <ActivityIndicator size="small" color={ctMeta.color} />
                <Text style={{ fontSize: rf(12), fontFamily: "Inter_400Regular", color: colors.textMuted }}>Loading content details…</Text>
              </View>
            )}

            {/* Content rows */}
            {contentRows.length > 0 ? (
              contentRows.map((row, idx) => (
                <View key={idx} style={{ flexDirection: "row", alignItems: "flex-start", gap: sp(10), paddingVertical: sp(10), borderTopWidth: idx === 0 ? StyleSheet.hairlineWidth : StyleSheet.hairlineWidth, borderTopColor: ctMeta.color + "25" }}>
                  <View style={{ width: sp(30), height: sp(30), borderRadius: sp(9), backgroundColor: ctMeta.color + "15", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: sp(1) }}>
                    <Ionicons name={row.icon as any} size={rf(14)} color={ctMeta.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: rf(10), fontFamily: "Inter_600SemiBold", color: ctMeta.color, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: sp(2) }}>{row.label}</Text>
                    <Text style={{ fontSize: rf(13), fontFamily: "Inter_500Medium", color: colors.text, lineHeight: rf(19) }} selectable>{row.value}</Text>
                  </View>
                </View>
              ))
            ) : (
              !isDynamic && (
                <View style={{ paddingVertical: sp(6), paddingLeft: sp(2) }}>
                  <Text style={{ fontSize: rf(12), fontFamily: "Inter_400Regular", color: colors.textMuted, lineHeight: rf(18) }}>
                    {effectiveContentType === "contact"
                      ? "vCard contact encoded in this QR — scan to save to contacts"
                      : effectiveContentType === "event" || effectiveContentType === "calendar"
                        ? "Calendar event encoded in this QR — scan to add to calendar"
                        : "Content encoded directly in the QR code"}
                  </Text>
                </View>
              )
            )}

            {/* For dynamic QRs: show destination when loaded */}
            {isDynamic && liveRaw && contentRows.length === 0 && (
              <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: ctMeta.color + "25", paddingTop: sp(10) }}>
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: sp(10) }}>
                  <View style={{ width: sp(30), height: sp(30), borderRadius: sp(9), backgroundColor: ctMeta.color + "15", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Ionicons name="link-outline" size={rf(14)} color={ctMeta.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: rf(10), fontFamily: "Inter_600SemiBold", color: ctMeta.color, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: sp(2) }}>Destination</Text>
                    <Text style={{ fontSize: rf(13), fontFamily: "Inter_500Medium", color: colors.text }} selectable numberOfLines={2}>{liveRaw}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </Animated.View>

        {/* ── Dynamic Destination Card (Business / Guard QRs) ── */}
        {hasGuardLink && (
          <Animated.View entering={FadeInDown.duration(350).delay(80)}>
            <View style={{ borderRadius: sp(18), borderWidth: 1, borderColor: "#6366F140", backgroundColor: isDark ? "#6366F10D" : "#F5F3FF", padding: sp(16), marginBottom: sp(14) }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp(8), marginBottom: sp(12) }}>
                <View style={{ width: sp(34), height: sp(34), borderRadius: sp(10), backgroundColor: "#6366F118", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="git-branch-outline" size={rf(16)} color="#6366F1" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: "#6366F1" }}>Smart Redirect</Text>
                  <Text style={{ fontSize: rf(10), fontFamily: "Inter_400Regular", color: colors.textMuted }}>Update destination without reprinting</Text>
                </View>
                <View style={{ borderRadius: sp(6), paddingHorizontal: sp(7), paddingVertical: sp(2), backgroundColor: "#6366F120" }}>
                  <Text style={{ fontSize: rf(9), fontFamily: "Inter_700Bold", color: "#6366F1" }}>DYNAMIC</Text>
                </View>
              </View>

              {!isPrivateDest && guardDest && !editingDestination && (
                <View style={{ backgroundColor: colors.surface, borderRadius: sp(10), borderWidth: 1, borderColor: colors.surfaceBorder, padding: sp(10), marginBottom: sp(10), flexDirection: "row", alignItems: "flex-start", gap: sp(8) }}>
                  <Ionicons name="arrow-forward-circle-outline" size={rf(15)} color={colors.textSecondary} style={{ marginTop: sp(1) }} />
                  <Text style={{ fontSize: rf(12), fontFamily: "Inter_400Regular", color: colors.textSecondary, flex: 1 }} numberOfLines={2}>{guardDest}</Text>
                </View>
              )}

              {guardLink.changeLog && guardLink.changeLog.length > 0 && !editingDestination && (
                <View style={{ marginBottom: sp(10), gap: sp(4) }}>
                  <Text style={{ fontSize: rf(9), fontFamily: "Inter_600SemiBold", color: colors.textMuted, letterSpacing: 0.5 }}>RECENT CHANGES</Text>
                  {guardLink.changeLog.slice(-2).reverse().map((entry, idx) => (
                    <View key={idx} style={{ flexDirection: "row", alignItems: "flex-start", gap: sp(6), backgroundColor: colors.surface, borderRadius: sp(8), padding: sp(8) }}>
                      <Ionicons name="time-outline" size={rf(11)} color={colors.textMuted} style={{ marginTop: 1 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: rf(10), fontFamily: "Inter_400Regular", color: colors.textMuted }}>{new Date(entry.changedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</Text>
                        <Text style={{ fontSize: rf(10), fontFamily: "Inter_400Regular", color: colors.textSecondary }} numberOfLines={1}>→ {entry.to.length > 40 ? entry.to.slice(0, 40) + "…" : entry.to}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {editingDestination ? (
                <View style={{ gap: sp(8) }}>
                  <TextInput value={newDestination} onChangeText={(t) => { setNewDestination(t); setDestinationError(null); }} placeholder="https://new-url.com" placeholderTextColor={colors.textMuted} autoCapitalize="none" keyboardType="url" style={{ ...inputStyle, borderColor: destinationError ? colors.danger : colors.surfaceBorder }} />
                  {destinationError && <View style={{ flexDirection: "row", alignItems: "center", gap: sp(4) }}><Ionicons name="warning-outline" size={rf(12)} color={colors.danger} /><Text style={{ fontSize: rf(11), color: colors.danger, flex: 1 }}>{destinationError}</Text></View>}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: sp(6), backgroundColor: colors.surface, borderRadius: sp(8), padding: sp(8) }}>
                    <Ionicons name="shield-checkmark-outline" size={rf(12)} color={colors.textMuted} />
                    <Text style={{ fontSize: rf(10), fontFamily: "Inter_400Regular", color: colors.textMuted, flex: 1 }}>URL will be scanned for threats before saving</Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: sp(8) }}>
                    <Pressable onPress={() => { setEditingDestination(false); setDestinationError(null); }} style={{ flex: 1, borderRadius: sp(10), borderWidth: 1, borderColor: colors.surfaceBorder, padding: sp(10), alignItems: "center" }}>
                      <Text style={{ fontSize: rf(13), fontFamily: "Inter_600SemiBold", color: colors.textSecondary }}>Cancel</Text>
                    </Pressable>
                    <Pressable onPress={handleUpdateDestination} disabled={savingDestination || isValidating} style={{ flex: 2, borderRadius: sp(10), backgroundColor: "#6366F1", padding: sp(10), alignItems: "center", flexDirection: "row", justifyContent: "center", gap: sp(6) }}>
                      {(isValidating || savingDestination) && <ActivityIndicator size="small" color="#fff" />}
                      <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: "#fff" }}>{isValidating ? "Scanning…" : savingDestination ? "Saving…" : "Update URL"}</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable onPress={() => setEditingDestination(true)} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: sp(6), borderRadius: sp(10), backgroundColor: "#6366F120", paddingHorizontal: sp(12), paddingVertical: sp(9), alignSelf: "flex-start", opacity: pressed ? 0.8 : 1 }]}>
                  <Ionicons name="pencil-outline" size={rf(13)} color="#6366F1" />
                  <Text style={{ fontSize: rf(12), fontFamily: "Inter_600SemiBold", color: "#6366F1" }}>Change Destination</Text>
                </Pressable>
              )}
            </View>
          </Animated.View>
        )}

        {/* ── Standard Link — Individual Protected QR ── */}
        {!isBusiness && hasStandardLink && (
          <Animated.View entering={FadeInDown.duration(350).delay(80)}>
            <View style={{ borderRadius: sp(18), borderWidth: 1, borderColor: colors.primary + "40", backgroundColor: isDark ? colors.primaryDim : colors.primaryDim + "60", padding: sp(16), marginBottom: sp(14) }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp(8), marginBottom: sp(12) }}>
                <View style={{ width: sp(34), height: sp(34), borderRadius: sp(10), backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name={isReadOnly ? "lock-closed-outline" : isStructured ? "create-outline" : "pencil-outline"} size={rf(16)} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: colors.primary }}>{isReadOnly ? "Encoded Content" : isStructured ? "Edit Content" : "Dynamic Destination"}</Text>
                  <Text style={{ fontSize: rf(10), fontFamily: "Inter_400Regular", color: colors.textMuted }}>
                    {isReadOnly ? "Content is read-only for this QR type" : "Update anytime without reprinting"}
                  </Text>
                </View>
                <View style={{ borderRadius: sp(6), paddingHorizontal: sp(7), paddingVertical: sp(2), backgroundColor: isReadOnly ? colors.surfaceBorder : colors.primaryDim }}>
                  <Text style={{ fontSize: rf(9), fontFamily: "Inter_700Bold", color: isReadOnly ? colors.textMuted : colors.primary }}>{isReadOnly ? "READ ONLY" : "EDITABLE"}</Text>
                </View>
              </View>

              {isReadOnly && (
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: sp(8), backgroundColor: colors.surface, borderRadius: sp(10), padding: sp(10) }}>
                  <Ionicons name="information-circle-outline" size={rf(14)} color={colors.textMuted} style={{ marginTop: 1 }} />
                  <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textSecondary, flex: 1, lineHeight: rf(17) }}>
                    {effectiveContentType === "contact"
                      ? "Contact (vCard) data is structured. To update, generate a new Contact QR."
                      : "Calendar event data is structured. To update, generate a new Event QR."}
                  </Text>
                </View>
              )}

              {isStructured && (
                editingDestination ? (
                  <View style={{ gap: sp(12) }}>
                    {renderStructuredFields()}
                    {destinationError && <View style={{ flexDirection: "row", alignItems: "center", gap: sp(4) }}><Ionicons name="warning-outline" size={rf(12)} color={colors.danger} /><Text style={{ fontSize: rf(11), color: colors.danger, flex: 1 }}>{destinationError}</Text></View>}
                    <View style={{ flexDirection: "row", gap: sp(8) }}>
                      <Pressable onPress={() => { setEditingDestination(false); setDestinationError(null); }} style={{ flex: 1, borderRadius: sp(10), borderWidth: 1, borderColor: colors.surfaceBorder, padding: sp(10), alignItems: "center" }}>
                        <Text style={{ fontSize: rf(13), fontFamily: "Inter_600SemiBold", color: colors.textSecondary }}>Cancel</Text>
                      </Pressable>
                      <Pressable onPress={() => { const built = buildContent(structuredFields); if (!built.trim()) { setDestinationError("Please fill in the required fields."); return; } handleUpdateRawContent(built); }} disabled={savingDestination || isValidating} style={{ flex: 2, borderRadius: sp(10), backgroundColor: colors.primary, padding: sp(10), alignItems: "center", flexDirection: "row", justifyContent: "center", gap: sp(6) }}>
                        {(savingDestination || isValidating) && <ActivityIndicator size="small" color="#fff" />}
                        <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: "#fff" }}>{isValidating ? "Checking…" : savingDestination ? "Saving…" : "Save Changes"}</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable onPress={() => { setStructuredFields(initStructuredFields()); setEditingDestination(true); setDestinationError(null); }} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: sp(6), borderRadius: sp(10), backgroundColor: colors.primaryDim, paddingHorizontal: sp(12), paddingVertical: sp(9), alignSelf: "flex-start", opacity: pressed ? 0.8 : 1 }]}>
                    <Ionicons name="pencil-outline" size={rf(13)} color={colors.primary} />
                    <Text style={{ fontSize: rf(12), fontFamily: "Inter_600SemiBold", color: colors.primary }}>Edit Content</Text>
                  </Pressable>
                )
              )}

              {!isStructured && !isReadOnly && (
                editingDestination ? (
                  <View style={{ gap: sp(8) }}>
                    <TextInput value={newDestination} onChangeText={(t) => { setNewDestination(t); setDestinationError(null); }} placeholder="https://new-url.com" placeholderTextColor={colors.textMuted} autoCapitalize="none" keyboardType="url" style={{ ...inputStyle, borderColor: destinationError ? colors.danger : colors.surfaceBorder }} />
                    {destinationError && <View style={{ flexDirection: "row", alignItems: "center", gap: sp(4) }}><Ionicons name="warning-outline" size={rf(12)} color={colors.danger} /><Text style={{ fontSize: rf(11), color: colors.danger, flex: 1 }}>{destinationError}</Text></View>}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: sp(6), backgroundColor: colors.surface, borderRadius: sp(8), padding: sp(8) }}>
                      <Ionicons name="shield-checkmark-outline" size={rf(12)} color={colors.textMuted} />
                      <Text style={{ fontSize: rf(10), fontFamily: "Inter_400Regular", color: colors.textMuted, flex: 1 }}>URL will be scanned for threats before saving</Text>
                    </View>
                    <View style={{ flexDirection: "row", gap: sp(8) }}>
                      <Pressable onPress={() => { setEditingDestination(false); setDestinationError(null); }} style={{ flex: 1, borderRadius: sp(10), borderWidth: 1, borderColor: colors.surfaceBorder, padding: sp(10), alignItems: "center" }}>
                        <Text style={{ fontSize: rf(13), fontFamily: "Inter_600SemiBold", color: colors.textSecondary }}>Cancel</Text>
                      </Pressable>
                      <Pressable onPress={handleUpdateStandardDestination} disabled={savingDestination || isValidating} style={{ flex: 2, borderRadius: sp(10), backgroundColor: colors.primary, padding: sp(10), alignItems: "center", flexDirection: "row", justifyContent: "center", gap: sp(6) }}>
                        {(isValidating || savingDestination) && <ActivityIndicator size="small" color="#fff" />}
                        <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: "#fff" }}>{isValidating ? "Scanning…" : savingDestination ? "Saving…" : "Update URL"}</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable onPress={() => { setNewDestination(standardLink.rawContent); setEditingDestination(true); setDestinationError(null); }} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: sp(6), borderRadius: sp(10), backgroundColor: colors.primaryDim, paddingHorizontal: sp(12), paddingVertical: sp(9), alignSelf: "flex-start", opacity: pressed ? 0.8 : 1 }]}>
                    <Ionicons name="pencil-outline" size={rf(13)} color={colors.primary} />
                    <Text style={{ fontSize: rf(12), fontFamily: "Inter_600SemiBold", color: colors.primary }}>Change Destination</Text>
                  </Pressable>
                )
              )}
            </View>
          </Animated.View>
        )}

        {/* ── Edit Static QR Content (no guard/standard link) ── */}
        {!isBusiness && !hasGuardLink && !hasStandardLink && (
          <Animated.View entering={FadeInDown.duration(350).delay(80)}>
            <View style={{ borderRadius: sp(18), borderWidth: 1, borderColor: colors.primaryDim, backgroundColor: isDark ? colors.primaryDim + "50" : colors.primaryDim + "80", padding: sp(16), marginBottom: sp(14) }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp(8), marginBottom: sp(10) }}>
                <View style={{ width: sp(34), height: sp(34), borderRadius: sp(10), backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="create-outline" size={rf(16)} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: colors.primary }}>Edit QR Content</Text>
                  <Text style={{ fontSize: rf(10), fontFamily: "Inter_400Regular", color: colors.textMuted }}>Note: existing prints will need reprinting</Text>
                </View>
              </View>
              {editingSavedContent ? (
                <View style={{ gap: sp(8) }}>
                  <TextInput value={newSavedContent} onChangeText={(t) => { setNewSavedContent(t); setSavedContentError(null); }} placeholder={qrItem.content || "Enter new content…"} placeholderTextColor={colors.textMuted} autoCapitalize="none" multiline={!qrItem.content?.startsWith("http")} style={{ ...inputStyle, borderColor: savedContentError ? colors.danger : colors.surfaceBorder }} />
                  {savedContentError && <View style={{ flexDirection: "row", alignItems: "center", gap: sp(4) }}><Ionicons name="warning-outline" size={rf(12)} color={colors.danger} /><Text style={{ fontSize: rf(11), color: colors.danger, flex: 1 }}>{savedContentError}</Text></View>}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: sp(6), backgroundColor: colors.surface, borderRadius: sp(8), padding: sp(8) }}>
                    <Ionicons name="print-outline" size={rf(12)} color={colors.textMuted} />
                    <Text style={{ fontSize: rf(10), fontFamily: "Inter_400Regular", color: colors.textMuted, flex: 1 }}>Printed copies will be outdated after updating</Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: sp(8) }}>
                    <Pressable onPress={() => { setEditingSavedContent(false); setSavedContentError(null); }} style={{ flex: 1, borderRadius: sp(10), borderWidth: 1, borderColor: colors.surfaceBorder, padding: sp(10), alignItems: "center" }}>
                      <Text style={{ fontSize: rf(13), fontFamily: "Inter_600SemiBold", color: colors.textSecondary }}>Cancel</Text>
                    </Pressable>
                    <Pressable onPress={handleRequestSavedContentUpdate} disabled={savingSavedContent || isValidating} style={{ flex: 2, borderRadius: sp(10), backgroundColor: colors.primary, padding: sp(10), alignItems: "center", flexDirection: "row", justifyContent: "center", gap: sp(6) }}>
                      {(isValidating || savingSavedContent) && <ActivityIndicator size="small" color="#fff" />}
                      <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: "#fff" }}>{isValidating ? "Scanning…" : savingSavedContent ? "Saving…" : "Update Content"}</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View style={{ gap: sp(8) }}>
                  {qrItem.content && !qrItem.content.includes("/guard/") && !qrItem.content.includes("/go/") && (
                    <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textSecondary }} numberOfLines={2}>{qrItem.content}</Text>
                  )}
                  <Pressable onPress={() => { setNewSavedContent(qrItem.content || ""); setEditingSavedContent(true); }} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: sp(6), borderRadius: sp(10), backgroundColor: colors.primaryDim, paddingHorizontal: sp(12), paddingVertical: sp(9), alignSelf: "flex-start", opacity: pressed ? 0.8 : 1 }]}>
                    <Ionicons name="pencil-outline" size={rf(13)} color={colors.primary} />
                    <Text style={{ fontSize: rf(12), fontFamily: "Inter_600SemiBold", color: colors.primary }}>Edit Content</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </Animated.View>
        )}

        {/* ── QR Control Card ── */}
        <Animated.View entering={FadeInDown.duration(350).delay(95)}>
          <View style={{ borderRadius: sp(18), borderWidth: 1, borderColor: colors.surfaceBorder, backgroundColor: colors.surface, padding: sp(16), marginBottom: sp(14), gap: sp(14) }}>
            <Text style={{ fontSize: rf(12), fontFamily: "Inter_700Bold", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.6 }}>QR Settings</Text>

            {/* Active toggle */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flex: 1, gap: sp(2) }}>
                <Text style={{ fontSize: rf(14), fontFamily: "Inter_600SemiBold", color: colors.text }}>QR Code Active</Text>
                <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textMuted }}>
                  {isActive ? "Scanners can access this QR code" : "This QR code is currently paused"}
                </Text>
              </View>
              {togglingActive ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Switch
                  value={isActive}
                  onValueChange={(v) => handleToggleActive(v)}
                  thumbColor={isActive ? colors.primary : "#f4f3f4"}
                  trackColor={{ false: isDark ? "#374151" : "#E5E7EB", true: colors.primary + "55" }}
                />
              )}
            </View>

            {/* Deactivation message */}
            {!isActive && qrItem.deactivationMessage && (
              <View style={{ backgroundColor: "#ef444410", borderRadius: sp(10), borderWidth: 1, borderColor: "#ef444428", padding: sp(10), flexDirection: "row", alignItems: "flex-start", gap: sp(8) }}>
                <Ionicons name="ban-outline" size={rf(14)} color="#ef4444" style={{ marginTop: sp(1) }} />
                <Text style={{ fontSize: rf(12), fontFamily: "Inter_400Regular", color: "#ef4444", flex: 1 }}>{qrItem.deactivationMessage}</Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* ── Design Customization ── */}
        <Animated.View entering={FadeInDown.duration(350).delay(110)}>
          <Pressable
            onPress={() => setDesignOpen((v) => !v)}
            style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: sp(18), borderBottomLeftRadius: designOpen ? 0 : sp(18), borderBottomRightRadius: designOpen ? 0 : sp(18), borderWidth: 1, borderColor: colors.surfaceBorder, backgroundColor: colors.surface, padding: sp(16), marginBottom: designOpen ? 0 : sp(14), opacity: pressed ? 0.85 : 1 }]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp(10) }}>
              <View style={{ width: sp(34), height: sp(34), borderRadius: sp(10), backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="color-palette-outline" size={rf(16)} color={colors.primary} />
              </View>
              <View>
                <Text style={{ fontSize: rf(14), fontFamily: "Inter_700Bold", color: colors.text }}>Customize Design</Text>
                <Text style={{ fontSize: rf(10), fontFamily: "Inter_400Regular", color: colors.textMuted }}>QR colors · preview updates live</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp(8) }}>
              <View style={{ width: sp(20), height: sp(20), borderRadius: sp(4), backgroundColor: fgColor, borderWidth: 1, borderColor: colors.surfaceBorder }} />
              <View style={{ width: sp(20), height: sp(20), borderRadius: sp(4), backgroundColor: bgColor, borderWidth: 1, borderColor: colors.surfaceBorder }} />
              <Ionicons name={designOpen ? "chevron-up" : "chevron-down"} size={rf(16)} color={colors.textMuted} />
            </View>
          </Pressable>

          {designOpen && (
            <Animated.View entering={FadeInDown.duration(200)} style={{ borderRadius: sp(18), borderTopLeftRadius: 0, borderTopRightRadius: 0, borderWidth: 1, borderTopWidth: 0, borderColor: colors.surfaceBorder, backgroundColor: colors.surface, padding: sp(16), marginBottom: sp(14) }}>
              <Text style={{ fontSize: rf(11), fontFamily: "Inter_600SemiBold", color: colors.textSecondary, marginBottom: sp(10) }}>QR Color</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: sp(10), marginBottom: sp(16) }}>
                {FG_COLORS.map((c) => (
                  <Pressable key={c.color} onPress={() => { setFgColor(c.color); setDesignDirty(true); }} style={{ width: sp(36), height: sp(36), borderRadius: sp(18), backgroundColor: c.color, borderWidth: fgColor === c.color ? 3 : 1, borderColor: fgColor === c.color ? colors.primary : colors.surfaceBorder, alignItems: "center", justifyContent: "center" }}>
                    {fgColor === c.color && <Ionicons name="checkmark" size={rf(14)} color="#fff" />}
                  </Pressable>
                ))}
              </View>
              <Text style={{ fontSize: rf(11), fontFamily: "Inter_600SemiBold", color: colors.textSecondary, marginBottom: sp(10) }}>Background</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: sp(10), marginBottom: sp(16) }}>
                {BG_COLORS.map((c) => (
                  <Pressable key={c.color} onPress={() => { setBgColor(c.color); setDesignDirty(true); }} style={{ width: sp(36), height: sp(36), borderRadius: sp(18), backgroundColor: c.color, borderWidth: bgColor === c.color ? 3 : 1, borderColor: bgColor === c.color ? colors.primary : colors.surfaceBorder, alignItems: "center", justifyContent: "center" }}>
                    {bgColor === c.color && <Ionicons name="checkmark" size={rf(14)} color={c.color === "#FFFFFF" ? "#94a3b8" : fgColor} />}
                  </Pressable>
                ))}
              </View>
              {designDirty && (
                <Pressable onPress={handleSaveDesign} disabled={saving} style={({ pressed }) => [{ borderRadius: sp(12), backgroundColor: colors.primary, paddingVertical: sp(12), alignItems: "center", flexDirection: "row", justifyContent: "center", gap: sp(8), opacity: pressed || saving ? 0.75 : 1 }]}>
                  {saving && <ActivityIndicator size="small" color="#fff" />}
                  <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: "#fff" }}>{saving ? "Saving…" : "Save Design"}</Text>
                </Pressable>
              )}
            </Animated.View>
          )}
        </Animated.View>

      </ScrollView>

      {/* ── Deactivate Modal ── */}
      <DeactivateModal
        visible={deactivateModalOpen}
        message={deactivationMsgInput}
        onChangeMessage={setDeactivationMsgInput}
        onConfirm={handleConfirmDeactivate}
        onCancel={() => setDeactivateModalOpen(false)}
      />

      {/* ── Group Picker Modal ── */}
      {qrItem && (
        <GroupPickerModal
          visible={groupPickerOpen}
          qrId={qrItem.docId}
          onClose={() => setGroupPickerOpen(false)}
        />
      )}

      {/* ── Confirm Action Modal ── */}
      <Modal visible={confirmModalOpen} transparent animationType="fade" onRequestClose={handleCancelPendingAction}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", padding: sp(20) }} onPress={handleCancelPendingAction}>
          <Pressable style={{ backgroundColor: colors.surface, borderRadius: sp(20), padding: sp(24), width: "100%", maxWidth: 360, gap: sp(14) }}>
            <View style={{ width: sp(48), height: sp(48), borderRadius: sp(14), backgroundColor: colors.warningDim, alignItems: "center", justifyContent: "center", alignSelf: "center" }}>
              <Ionicons name="warning-outline" size={rf(24)} color={colors.warning} />
            </View>
            <Text style={{ fontSize: rf(16), fontFamily: "Inter_700Bold", color: colors.text, textAlign: "center" }}>Confirm Update</Text>
            <Text style={{ fontSize: rf(13), fontFamily: "Inter_400Regular", color: colors.textSecondary, textAlign: "center", lineHeight: rf(20) }}>{confirmModalMessage}</Text>
            <View style={{ flexDirection: "row", gap: sp(10) }}>
              <Pressable onPress={handleCancelPendingAction} style={{ flex: 1, borderRadius: sp(12), borderWidth: 1, borderColor: colors.surfaceBorder, padding: sp(12), alignItems: "center" }}>
                <Text style={{ fontSize: rf(13), fontFamily: "Inter_600SemiBold", color: colors.textSecondary }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleConfirmPendingAction} style={{ flex: 1, borderRadius: sp(12), backgroundColor: colors.primary, padding: sp(12), alignItems: "center" }}>
                <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: "#fff" }}>Confirm</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// StyleSheet shim for hairlineWidth
const StyleSheet = { hairlineWidth: 0.5 };
