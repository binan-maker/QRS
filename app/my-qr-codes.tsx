import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  View, Text, Pressable, Platform,
  RefreshControl, useWindowDimensions, ScrollView,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "@/lib/haptics";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import SkeletonBox from "@/components/ui/SkeletonBox";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  getUserGeneratedQrs,
  type GeneratedQrItem,
} from "@/lib/firestore-service";

const MY_QRS_CACHE_TTL = 5 * 60 * 1000;

async function readCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const { value, expiresAt } = JSON.parse(raw);
    if (expiresAt <= Date.now()) { AsyncStorage.removeItem(key).catch(() => {}); return null; }
    return value as T;
  } catch { return null; }
}

async function writeCache<T>(key: string, value: T, ttlMs: number): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify({ value, expiresAt: Date.now() + ttlMs }));
  } catch {}
}

function qrsCacheKey(userId: string) { return `myqrs_v1_${userId}`; }

type SortKey = "newest" | "oldest" | "mostScanned";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "newest",      label: "Newest"       },
  { key: "mostScanned", label: "Most Scanned" },
  { key: "oldest",      label: "Oldest"       },
];

const CONTENT_TYPE_META: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  url:            { label: "URL",          icon: "link-outline",            color: "#1D4ED8", bg: "#EFF6FF" },
  text:           { label: "Text",         icon: "text-outline",            color: "#6B7280", bg: "#F9FAFB" },
  wifi:           { label: "WiFi",         icon: "wifi-outline",            color: "#059669", bg: "#ECFDF5" },
  upi:            { label: "UPI",          icon: "card-outline",            color: "#F59E0B", bg: "#FFFBEB" },
  bharatqr:       { label: "BharatQR",    icon: "shield-checkmark-outline", color: "#10B981", bg: "#ECFDF5" },
  payment:        { label: "Payment",      icon: "card-outline",            color: "#F59E0B", bg: "#FFFBEB" },
  paymentlink:    { label: "Payment",      icon: "card-outline",            color: "#F59E0B", bg: "#FFFBEB" },
  scantopay:      { label: "Scan-to-Pay",  icon: "qr-code-outline",         color: "#F59E0B", bg: "#FFFBEB" },
  mobilepay:      { label: "Mobile Pay",   icon: "phone-portrait-outline",  color: "#10B981", bg: "#ECFDF5" },
  grab:           { label: "GrabPay",      icon: "car-outline",             color: "#00B14F", bg: "#F0FDF4" },
  contact:        { label: "Contact",      icon: "person-circle-outline",   color: "#8B5CF6", bg: "#F5F3FF" },
  email:          { label: "Email",        icon: "mail-outline",            color: "#3B82F6", bg: "#EFF6FF" },
  phone:          { label: "Phone",        icon: "call-outline",            color: "#10B981", bg: "#ECFDF5" },
  social:         { label: "Social",       icon: "share-social-outline",    color: "#EC4899", bg: "#FDF2F8" },
  whatsapp:       { label: "WhatsApp",     icon: "logo-whatsapp",           color: "#22C55E", bg: "#F0FDF4" },
  instagram:      { label: "Instagram",    icon: "logo-instagram",          color: "#E1306C", bg: "#FFF1F2" },
  twitter:        { label: "Twitter",      icon: "logo-twitter",            color: "#1DA1F2", bg: "#EFF6FF" },
  youtube:        { label: "YouTube",      icon: "logo-youtube",            color: "#FF0000", bg: "#FFF1F2" },
  linkedin:       { label: "LinkedIn",     icon: "logo-linkedin",           color: "#0A66C2", bg: "#EFF6FF" },
  telegram:       { label: "Telegram",     icon: "send-outline",            color: "#0088CC", bg: "#EFF6FF" },
  facebook:       { label: "Facebook",     icon: "logo-facebook",           color: "#1877F2", bg: "#EFF6FF" },
  spotify:        { label: "Spotify",      icon: "musical-notes-outline",   color: "#1DB954", bg: "#F0FDF4" },
  discord:        { label: "Discord",      icon: "logo-discord",            color: "#5865F2", bg: "#F5F3FF" },
  tiktok:         { label: "TikTok",       icon: "musical-note-outline",    color: "#010101", bg: "#F9FAFB" },
  media:          { label: "Media",        icon: "play-circle-outline",     color: "#8B5CF6", bg: "#F5F3FF" },
  crypto:         { label: "Crypto",       icon: "logo-bitcoin",            color: "#F7931A", bg: "#FFFBEB" },
  location:       { label: "Location",     icon: "location-outline",        color: "#EF4444", bg: "#FFF1F2" },
  calendar:       { label: "Event",        icon: "calendar-outline",        color: "#8B5CF6", bg: "#F5F3FF" },
  event:          { label: "Event",        icon: "calendar-outline",        color: "#8B5CF6", bg: "#F5F3FF" },
  zoom:           { label: "Zoom",         icon: "videocam-outline",        color: "#2D8CFF", bg: "#EFF6FF" },
  app:            { label: "App",          icon: "download-outline",        color: "#10B981", bg: "#ECFDF5" },
  appdownload:    { label: "App Download",  icon: "download-outline",        color: "#10B981", bg: "#ECFDF5" },
  googlereview:   { label: "Review Page",  icon: "star-outline",            color: "#F59E0B", bg: "#FFFBEB" },
  reviewpage:     { label: "Review Page",  icon: "star-outline",            color: "#F59E0B", bg: "#FFFBEB" },
  calendly:       { label: "Calendly",     icon: "calendar-outline",        color: "#006BFF", bg: "#EFF6FF" },
  restaurantmenu: { label: "Menu",         icon: "restaurant-outline",      color: "#EF4444", bg: "#FFF1F2" },
  menucatalogue:  { label: "Menu",         icon: "list-outline",            color: "#EF4444", bg: "#FFF1F2" },
  donation:       { label: "Donation",     icon: "heart-outline",           color: "#F43F5E", bg: "#FFF1F2" },
  paypal:         { label: "PayPal",       icon: "wallet-outline",          color: "#003087", bg: "#EFF6FF" },
  venmo:          { label: "Venmo",        icon: "people-outline",          color: "#008CFF", bg: "#EFF6FF" },
  sms:            { label: "SMS",          icon: "chatbubble-outline",      color: "#6B7280", bg: "#F9FAFB" },
  document:       { label: "Document",     icon: "document-outline",        color: "#3B82F6", bg: "#EFF6FF" },
};

function getContentTypeMeta(contentType: string) {
  return CONTENT_TYPE_META[contentType] ?? { label: "QR Code", icon: "qr-code-outline", color: "#6B7280", bg: "#F9FAFB" };
}

function getEffectiveContentType(item: GeneratedQrItem): string {
  const stored = (item as any).contentType as string || "text";
  // Only return early for specific non-URL stored types.
  // For "url" and "text", run content detection so service-specific URLs
  // (e.g. calendly.com saved as generic "url") get their own type.
  if (stored && stored !== "text" && stored !== "url") return stored;

  const displayDest = (item as any).displayDestination as string | null;
  const content = item.content || "";
  const src = displayDest || content;

  if (!src) return stored;

  // Protocol-based detection
  if (src.startsWith("tel:")) return "phone";
  if (src.startsWith("WIFI:")) return "wifi";
  if (src.startsWith("upi://")) return "upi";
  if (src.startsWith("BEGIN:VCALENDAR") || src.startsWith("BEGIN:VEVENT")) return "event";
  if (src.startsWith("BEGIN:VCARD")) return "contact";
  if (src.startsWith("SMSTO:") || src.startsWith("sms:")) return "sms";
  if (src.startsWith("mailto:")) return "email";
  if (/^bitcoin:|^ethereum:|^litecoin:|^solana:/.test(src)) return "crypto";

  // Service-specific URL detection
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
  if (src.includes("rzp.io") || src.includes("razorpay.com")) return "payment";
  if (src.includes("zoom.us")) return "zoom";
  if (src.includes("calendly.com")) return "calendly";
  if (src.includes("maps.google.com") || src.includes("goo.gl/maps") || src.includes("maps.app.goo.gl")) return "location";
  if (src.includes("apps.apple.com") || src.includes("play.google.com") || src.includes("appstore.com")) return "appdownload";

  if (/^[\w.\-+]+@[\w]{2,}$/.test(src) && !/\.(com|in|org|net|io|co|app)$/.test(src.split("@")[1] || "")) return "upi";
  if (/^\+?[\d]{7,15}$/.test(src.replace(/[\s\-()]/g, ""))) return "phone";

  const withScheme = src.startsWith("http") ? src : `https://${src}`;
  try {
    const u = new URL(withScheme);
    const h = u.hostname;
    if (
      h.includes(".") && h.length >= 4 &&
      !/^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.|127\.|localhost)/.test(h) &&
      !u.pathname.startsWith("/guard/") &&
      !u.pathname.startsWith("/go/")
    ) {
      return "url";
    }
  } catch {}

  return stored;
}

function getDisplayText(item: GeneratedQrItem): string {
  const contentType = getEffectiveContentType(item);
  const displayDest = (item as any).displayDestination as string | null;
  const content = item.content || "";
  const lbl = (item as any).label as string | null;
  const bName = (item as any).businessName as string | null;
  const src = displayDest || content;

  switch (contentType) {
    case "phone": {
      if (src.startsWith("tel:")) return src.replace("tel:", "").trim();
      if (/^\+?[\d\s\-()]{7,}$/.test(src)) return src.trim();
      break;
    }
    case "mobilepay":
    case "grab": {
      const num = src.replace(/^tel:/, "").trim();
      return num || src;
    }
    case "wifi": {
      const m = src.match(/S:([^;]+)/);
      if (m) return m[1];
      break;
    }
    case "upi": {
      if (src.startsWith("upi://pay?")) {
        try {
          const pa = new URLSearchParams(src.replace("upi://pay?", "")).get("pa");
          if (pa) return pa;
        } catch {}
      }
      if (/^[\w.\-+]+@[\w]+$/.test(src)) return src;
      break;
    }
    case "scantopay":
    case "bharatqr": {
      if (src.startsWith("upi://pay?")) {
        try {
          const pa = new URLSearchParams(src.replace("upi://pay?", "")).get("pa");
          if (pa) return pa;
        } catch {}
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
      try {
        const u = new URL(src.startsWith("http") ? src : `https://${src}`);
        const title = u.searchParams.get("text");
        if (title) return title;
      } catch {}
      break;
    }
    case "contact": {
      const fnMatch = src.match(/FN:([^\r\n]+)/);
      if (fnMatch) return fnMatch[1].trim();
      const nMatch = src.match(/N:([^\r\n]+)/);
      if (nMatch) return nMatch[1].replace(/;+/g, " ").trim();
      break;
    }
    case "sms": {
      return src.replace(/^SMSTO?:/i, "").split(":")[0].trim();
    }
    case "email": {
      return src.replace(/^mailto:/i, "").split("?")[0].trim();
    }
    case "whatsapp": {
      try {
        const u = new URL(src.startsWith("http") ? src : `https://${src}`);
        if (u.hostname === "wa.me" || u.hostname === "api.whatsapp.com") {
          const phone = u.pathname.replace(/^\//, "");
          if (phone) return "+" + phone;
        }
      } catch {}
      if (/^\+?[\d\s\-()]{7,}$/.test(src)) return src.trim();
      break;
    }
    case "instagram": {
      if (src.includes("instagram.com")) {
        const parts = src.replace(/\/$/, "").split("/");
        const handle = parts[parts.length - 1] || parts[parts.length - 2] || "";
        if (handle) return "@" + handle;
      }
      return src.startsWith("@") ? src : "@" + src;
    }
    case "twitter": {
      if (src.includes("twitter.com") || src.includes("x.com")) {
        const parts = src.replace(/\/$/, "").split("/");
        const handle = parts[parts.length - 1] || "";
        if (handle && handle !== "twitter.com" && handle !== "x.com") return "@" + handle;
      }
      return src.startsWith("@") ? src : "@" + src;
    }
    case "telegram": {
      if (src.includes("t.me") || src.includes("telegram.me")) {
        const parts = src.replace(/\/$/, "").split("/");
        const handle = parts[parts.length - 1] || "";
        if (handle) return "@" + handle;
      }
      return src.startsWith("@") ? src : "@" + src;
    }
    case "tiktok": {
      const handle = src.replace(/.*tiktok\.com\/@?/, "").replace(/\/$/, "");
      if (handle) return "@" + handle.replace(/^@/, "");
      return src.startsWith("@") ? src : "@" + src;
    }
    case "zoom": {
      if (src.includes("zoom.us/j/")) {
        const id = src.split("/j/")[1]?.split("?")[0] || "";
        if (id) return "Meeting " + id;
      }
      return "Zoom Meeting";
    }
    case "crypto": {
      const address = src.split(":")[1]?.split("?")[0] || src;
      return address.length > 22 ? address.slice(0, 22) + "…" : address;
    }
    case "location": {
      try {
        const u = new URL(src.startsWith("http") ? src : `https://${src}`);
        const q = u.searchParams.get("q") || u.searchParams.get("query") || "";
        if (q) return q;
        return u.hostname.replace(/^www\./, "");
      } catch {}
      break;
    }
    case "calendly": {
      try {
        const u = new URL(src.startsWith("http") ? src : `https://${src}`);
        const parts = u.pathname.replace(/^\//, "").split("/").filter(Boolean);
        const username = parts[0] || "";
        const eventType = parts[1] || "";
        if (username) return username + (eventType ? " / " + eventType : "");
      } catch {}
      return "Calendly";
    }
    case "appdownload":
    case "app": {
      try {
        const u = new URL(src.startsWith("http") ? src : `https://${src}`);
        const appName = u.pathname.split("/").filter(Boolean).pop()?.replace(/-/g, " ") || "";
        if (appName && appName.length < 40) return appName;
        return u.hostname.includes("apple") ? "App Store" : "Google Play";
      } catch {}
      return "App Download";
    }
    case "paymentlink":
    case "payment":
    case "reviewpage":
    case "googlereview":
    case "menucatalogue":
    case "restaurantmenu":
    case "donation": {
      try {
        const u = new URL(src.startsWith("http") ? src : `https://${src}`);
        return u.hostname.replace(/^www\./, "");
      } catch {}
      break;
    }
    case "text": {
      if (!src) return "Text QR";
      // Strip any accidental https:// that may have been prepended to plain text
      const cleaned = src.replace(/^https?:\/\//, "");
      return cleaned.length > 50 ? cleaned.slice(0, 50) + "…" : cleaned;
    }
  }

  if (src) {
    const isGuardOrGo = src.includes("/guard/") || src.includes("/go/");
    const isLocal = /^https?:\/\/(192\.168\.|10\.|127\.|localhost)/.test(src);

    if (isGuardOrGo || isLocal) {
      if (lbl) return lbl;
      if (bName) return bName;
      return contentType === "business" ? "Business QR" : "QR Code";
    }

    const withScheme = src.startsWith("http") ? src : `https://${src}`;
    try {
      const u = new URL(withScheme);
      const h = u.hostname.replace(/^www\./, "");
      if (h.includes(".") && h.length >= 4) return h;
    } catch {}

    if (lbl) return lbl;
    if (bName) return bName;
    return src.length > 45 ? src.slice(0, 45) + "…" : src;
  }

  if (lbl) return lbl;
  if (bName) return bName;
  return "QR Code";
}

function getSubtitleText(item: GeneratedQrItem): string | null {
  const contentType = getEffectiveContentType(item);
  const displayDest = (item as any).displayDestination as string | null;
  const content = item.content || "";
  const src = displayDest || content;

  switch (contentType) {
    case "upi":
    case "scantopay": {
      if (src.startsWith("upi://pay?")) {
        try {
          const params = new URLSearchParams(src.replace("upi://pay?", ""));
          const pn = params.get("pn");
          const am = params.get("am");
          if (pn && am) return `${pn} · ₹${am}`;
          if (pn) return pn;
          if (am) return `₹${am}`;
        } catch {}
      }
      break;
    }
    case "wifi": {
      const sec = src.match(/T:([^;]+)/)?.[1] || "WPA";
      const pw = src.match(/P:([^;]+)/)?.[1];
      if (pw && pw.length > 0) return `${sec === "nopass" ? "Open" : sec} · Password set`;
      return `${sec === "nopass" ? "Open network" : sec}`;
    }
    case "contact": {
      const phone = src.match(/TEL[^:]*:([^\r\n]+)/)?.[1]?.trim();
      if (phone) return phone;
      break;
    }
    case "whatsapp": {
      try {
        const u = new URL(src.startsWith("http") ? src : `https://${src}`);
        const msg = u.searchParams.get("text");
        if (msg) return msg.length > 40 ? msg.slice(0, 40) + "…" : msg;
      } catch {}
      break;
    }
    case "sms": {
      const msg = src.split(":").slice(2).join(":");
      if (msg) return msg.length > 40 ? msg.slice(0, 40) + "…" : msg;
      break;
    }
    case "event":
    case "calendar": {
      if (src.startsWith("BEGIN:")) {
        const start = src.match(/DTSTART:([^\r\n]+)/)?.[1]?.trim();
        if (start) {
          const ds = start.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2}).*/, "$3/$2/$1 $4:$5");
          return ds;
        }
      }
      break;
    }
    case "location": {
      try {
        const u = new URL(src.startsWith("http") ? src : `https://${src}`);
        const lat = u.searchParams.get("lat");
        const lng = u.searchParams.get("lng") || u.searchParams.get("lon");
        if (lat && lng) return `${lat}, ${lng}`;
      } catch {}
      break;
    }
    case "url":
    case "reviewpage":
    case "googlereview":
    case "restaurantmenu":
    case "menucatalogue":
    case "donation":
    case "appdownload":
    case "app":
    case "paymentlink":
    case "facebook":
    case "youtube":
    case "linkedin":
    case "spotify":
    case "discord": {
      try {
        const u = new URL(src.startsWith("http") ? src : `https://${src}`);
        const path = u.pathname.replace(/\/$/, "");
        if (path && path.length > 1 && !path.startsWith("/guard/") && !path.startsWith("/go/")) {
          return (u.hostname.replace(/^www\./, "") + path).length > 45
            ? (u.hostname.replace(/^www\./, "") + path).slice(0, 45) + "…"
            : u.hostname.replace(/^www\./, "") + path;
        }
      } catch {}
      break;
    }
  }
  return null;
}

function SkeletonQrCard() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const sp = (v: number) => Math.round(v * Math.min(Math.max(width / 390, 0.82), 1.0));
  return (
    <View style={{
      backgroundColor: colors.surface, borderRadius: sp(18), borderWidth: 1,
      borderColor: colors.surfaceBorder, padding: sp(14), marginBottom: sp(10),
      flexDirection: "row", alignItems: "center", gap: sp(14),
    }}>
      <SkeletonBox width={64} height={64} borderRadius={12} />
      <View style={{ flex: 1, gap: 8 }}>
        <SkeletonBox width="35%" height={9} borderRadius={4} />
        <SkeletonBox width="70%" height={13} borderRadius={4} />
        <SkeletonBox width="55%" height={9} borderRadius={4} />
      </View>
    </View>
  );
}

export default function MyQrCodesScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const s  = Math.min(Math.max(width / 390, 0.82), 1.0);
  const rf = (size: number) => Math.round(size * s);
  const sp = (v: number)    => Math.round(v * s);

  const topInset          = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset       = insets.bottom;
  const contentPaddingBottom = bottomInset + sp(36);

  const [qrCodes, setQrCodes] = useState<GeneratedQrItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortKey,  setSortKey]  = useState<SortKey>("newest");
  const [sortOpen, setSortOpen] = useState(false);
  const hasLoadedRef = useRef(false);

  const fetchQrCodes = useCallback(async (forceRefresh = false) => {
    if (!user) return;
    if (!forceRefresh) {
      const cached = await readCache<GeneratedQrItem[]>(qrsCacheKey(user.id));
      if (cached) { setQrCodes(cached); setLoading(false); hasLoadedRef.current = true; return; }
    }
    if (!hasLoadedRef.current) setLoading(true);
    try {
      const items = await getUserGeneratedQrs(user.id);
      setQrCodes(items);
      hasLoadedRef.current = true;
      writeCache(qrsCacheKey(user.id), items, MY_QRS_CACHE_TTL);
    } catch (e) {
      console.warn("[my-qr-codes] fetchQrCodes error:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchQrCodes();
  }, [user?.id]);

  function handleRefresh() {
    setRefreshing(true);
    fetchQrCodes(true).finally(() => setRefreshing(false));
  }

  const sorted = useMemo(() => {
    let list = [...qrCodes];
    if (sortKey === "mostScanned") list.sort((a, b) => (b.scanCount || 0) - (a.scanCount || 0));
    else if (sortKey === "oldest") list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return list;
  }, [qrCodes, sortKey]);

  function renderQrItem({ item, index }: { item: GeneratedQrItem; index: number }) {
    const displayText = getDisplayText(item);
    const subtitle    = getSubtitleText(item);
    const ctMeta      = getContentTypeMeta(getEffectiveContentType(item));
    const labelText   = (item as any).label as string | undefined;
    const isBusiness  = (item as any).qrType === "business";

    return (
      <Animated.View entering={FadeInDown.duration(320).delay(index * 35).springify()}>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/my-qr/${item.docId}` as any); }}
          style={({ pressed }) => [{
            flexDirection: "row", alignItems: "center", gap: sp(12),
            borderRadius: sp(16), borderWidth: 1,
            borderColor: colors.surfaceBorder, backgroundColor: colors.surface,
            padding: sp(12), marginBottom: sp(10),
            opacity: pressed ? 0.88 : 1,
            transform: [{ scale: pressed ? 0.988 : 1 }],
          }]}
        >
          <View style={{
            width: sp(56), height: sp(56), borderRadius: sp(12),
            backgroundColor: ctMeta.bg,
            alignItems: "center", justifyContent: "center", flexShrink: 0,
            borderWidth: 1,
            borderColor: ctMeta.color + "28",
          }}>
            <Ionicons name={ctMeta.icon as any} size={sp(26)} color={ctMeta.color} />
          </View>

          <View style={{ flex: 1, minWidth: 0, gap: sp(3) }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp(4), flexWrap: "wrap" }}>
              <View style={{
                flexDirection: "row", alignItems: "center", gap: 3,
                borderRadius: sp(6), paddingHorizontal: sp(6), paddingVertical: sp(2),
                backgroundColor: ctMeta.bg,
              }}>
                <Ionicons name={ctMeta.icon as any} size={rf(9)} color={ctMeta.color} />
                <Text style={{ fontSize: rf(10), fontFamily: "Inter_600SemiBold", color: ctMeta.color }}>{ctMeta.label}</Text>
              </View>
              {isBusiness && (
                <View style={{ borderRadius: sp(6), paddingHorizontal: sp(6), paddingVertical: sp(2), backgroundColor: "#F59E0B" + "18" }}>
                  <Text style={{ fontSize: rf(9), fontFamily: "Inter_600SemiBold", color: "#B45309" }}>Business</Text>
                </View>
              )}
              {item.isActive === false && (
                <View style={{ borderRadius: sp(6), paddingHorizontal: sp(6), paddingVertical: sp(2), backgroundColor: colors.dangerDim }}>
                  <Text style={{ fontSize: rf(10), fontFamily: "Inter_600SemiBold", color: colors.danger }}>Inactive</Text>
                </View>
              )}
            </View>

            {labelText ? (
              <Text style={{ fontSize: rf(10), fontFamily: "Inter_500Medium", color: colors.primary, marginTop: sp(1) }} numberOfLines={1}>
                🏷️ {labelText}
              </Text>
            ) : null}

            <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: colors.text }} numberOfLines={1}>
              {displayText.length > 45 ? displayText.slice(0, 45) + "…" : displayText}
            </Text>

            {subtitle && (
              <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textSecondary }} numberOfLines={1}>
                {subtitle}
              </Text>
            )}

            <View style={{ flexDirection: "row", alignItems: "center", gap: sp(8), marginTop: sp(1) }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp(3) }}>
                <Ionicons name="scan-outline" size={rf(10)} color={colors.textMuted} />
                <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textMuted }}>
                  {item.scanCount} {item.scanCount === 1 ? "scan" : "scans"}
                </Text>
              </View>
            </View>
          </View>

          <Ionicons name="chevron-forward" size={rf(15)} color={colors.textMuted} style={{ flexShrink: 0 }} />
        </Pressable>
      </Animated.View>
    );
  }

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: sp(20), paddingTop: topInset + sp(6), paddingBottom: sp(12) }}>
          <Pressable onPress={() => router.back()} style={{ width: sp(38), height: sp(38), borderRadius: sp(19), alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder }}>
            <Ionicons name="chevron-back" size={rf(20)} color={colors.text} />
          </Pressable>
          <Text style={{ fontSize: rf(17), fontFamily: "Inter_700Bold", color: colors.text }}>My QR Codes</Text>
          <View style={{ width: sp(38) }} />
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: sp(40), gap: sp(12) }}>
          <MaterialCommunityIcons name="qrcode-plus" size={rf(48)} color={colors.textMuted} />
          <Text style={{ fontSize: rf(16), fontFamily: "Inter_700Bold", color: colors.text, textAlign: "center" }}>Sign in required</Text>
          <Text style={{ fontSize: rf(13), fontFamily: "Inter_400Regular", color: colors.textSecondary, textAlign: "center", lineHeight: rf(19) }}>
            Sign in to manage and view your generated QR codes
          </Text>
          <Pressable onPress={() => router.push("/(auth)/login")} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, marginTop: sp(4) }]}>
            <LinearGradient colors={[colors.primary, colors.primaryShade]} style={{ paddingHorizontal: sp(28), paddingVertical: sp(12), borderRadius: sp(16) }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: "#fff" }}>Sign In</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: sp(20), paddingTop: topInset + sp(6), paddingBottom: sp(12) }}>
        <Pressable
          onPress={() => router.back()}
          style={{ width: sp(38), height: sp(38), borderRadius: sp(19), alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder }}
        >
          <Ionicons name="chevron-back" size={rf(20)} color={colors.text} />
        </Pressable>

        <Text style={{ fontSize: rf(17), fontFamily: "Inter_700Bold", color: colors.text }}>My QR Codes</Text>

        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/(tabs)/qr-generator"); }}
          style={({ pressed }) => [{ opacity: pressed ? 0.82 : 1 }]}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryShade]}
            style={{ flexDirection: "row", alignItems: "center", gap: sp(5), borderRadius: sp(14), paddingHorizontal: sp(14), paddingVertical: sp(9) }}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <Ionicons name="add" size={rf(15)} color="#fff" />
            <Text style={{ fontSize: rf(12), fontFamily: "Inter_700Bold", color: "#fff" }}>New QR</Text>
          </LinearGradient>
        </Pressable>
      </View>

      <View style={{ paddingBottom: sp(10) }}>
        <View style={{ paddingHorizontal: sp(20), marginBottom: sp(4) }}>
          <Pressable
            onPress={() => { setSortOpen((v) => !v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            style={({ pressed }) => [{
              flexDirection: "row", alignItems: "center", gap: sp(4),
              alignSelf: "flex-start",
              paddingHorizontal: sp(10), paddingVertical: sp(7),
              borderRadius: sp(20), borderWidth: 1,
              backgroundColor: sortOpen ? colors.primaryDim : colors.surface,
              borderColor: sortOpen ? colors.primary + "50" : colors.surfaceBorder,
              opacity: pressed ? 0.8 : 1,
            }]}
          >
            <Ionicons name="swap-vertical-outline" size={rf(11)} color={sortOpen ? colors.primary : colors.textMuted} />
            <Text style={{ fontSize: rf(11), fontFamily: "Inter_600SemiBold", color: sortOpen ? colors.primary : colors.textMuted }}>
              Sort{sortKey !== "newest" ? `: ${SORT_OPTIONS.find((o) => o.key === sortKey)?.label}` : ""}
            </Text>
          </Pressable>
        </View>

        {sortOpen && (
          <Animated.View entering={FadeIn.duration(200)}>
            <View style={{
              flexDirection: "row", gap: sp(6), flexWrap: "wrap",
              marginHorizontal: sp(20),
              borderRadius: sp(14), borderWidth: 1, borderColor: colors.surfaceBorder,
              backgroundColor: colors.surface, padding: sp(10),
            }}>
              {SORT_OPTIONS.map((opt) => {
                const active = sortKey === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => { setSortKey(opt.key); setSortOpen(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    style={[{
                      borderRadius: sp(10), paddingHorizontal: sp(12), paddingVertical: sp(7), borderWidth: 1,
                    }, active
                      ? { backgroundColor: colors.primaryDim, borderColor: colors.primary + "50" }
                      : { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder }
                    ]}
                  >
                    <Text style={{ fontSize: rf(12), fontFamily: "Inter_600SemiBold", color: active ? colors.primary : colors.textMuted }}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        )}
      </View>

      {loading && qrCodes.length === 0 ? (
        <View style={{ paddingHorizontal: sp(20), paddingTop: sp(4) }}>
          <SkeletonQrCard /><SkeletonQrCard /><SkeletonQrCard /><SkeletonQrCard />
        </View>
      ) : sorted.length === 0 ? (
        <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: sp(40), gap: sp(12) }}>
          <MaterialCommunityIcons name="qrcode-plus" size={rf(48)} color={colors.textMuted} />
          <Text style={{ fontSize: rf(16), fontFamily: "Inter_700Bold", color: colors.text, textAlign: "center" }}>No QR codes yet</Text>
          <Text style={{ fontSize: rf(13), fontFamily: "Inter_400Regular", color: colors.textSecondary, textAlign: "center", lineHeight: rf(19) }}>
            Create your first QR code using the generator
          </Text>
          <Pressable onPress={() => router.push("/(tabs)/qr-generator")} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, marginTop: sp(4) }]}>
            <LinearGradient colors={[colors.primary, colors.primaryShade]} style={{ flexDirection: "row", alignItems: "center", gap: sp(7), paddingHorizontal: sp(24), paddingVertical: sp(12), borderRadius: sp(16) }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Ionicons name="add" size={rf(16)} color="#fff" />
              <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: "#fff" }}>Create QR Code</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      ) : (
        <FlashList
          data={sorted}
          keyExtractor={(item) => item.docId}
          renderItem={renderQrItem}
          estimatedItemSize={100}
          contentContainerStyle={{ paddingHorizontal: sp(20), paddingTop: sp(2), paddingBottom: contentPaddingBottom }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
          ListHeaderComponent={
            <Text style={{ fontSize: rf(12), fontFamily: "Inter_500Medium", color: colors.textMuted, marginBottom: sp(10) }}>
              {sorted.length} {sorted.length === 1 ? "code" : "codes"}
              {sortKey !== "newest" && ` · sorted by ${SORT_OPTIONS.find((o) => o.key === sortKey)?.label.toLowerCase()}`}
            </Text>
          }
        />
      )}
    </View>
  );
}
