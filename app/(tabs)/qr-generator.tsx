import { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Platform,
  Alert,
  Image,
  Modal,
  Animated,
  KeyboardTypeOptions,
} from "react-native";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import ReanimatedAnimated, { FadeIn, FadeInDown } from "react-native-reanimated";
import Colors from "@/constants/colors";
import QRCode from "react-native-qrcode-svg";
import { useAuth } from "@/contexts/AuthContext";
import { saveGeneratedQr, saveGuardLink, type QrType } from "@/lib/firestore-service";
import { getApiUrl } from "@/lib/query-client";

// ─── Content Type Definitions ──────────────────────────────────────────────

interface ExtraFieldDef {
  key: string;
  label: string;
  placeholder: string;
  keyboardType?: KeyboardTypeOptions;
  optional?: boolean;
  secureText?: boolean;
}

interface PresetDef {
  label: string;
  icon: string;
  placeholder: string;
  keyboardType: KeyboardTypeOptions;
  multiline?: boolean;
  hint?: string;
  extraFields?: ExtraFieldDef[];
  contentType: string;
}

const QR_PRESETS: PresetDef[] = [
  {
    label: "Text", icon: "text-outline", placeholder: "Type any text or message...",
    keyboardType: "default", multiline: true, contentType: "text",
  },
  {
    label: "URL", icon: "link-outline", placeholder: "https://example.com",
    keyboardType: "url", contentType: "url",
    hint: "Enter a full website URL",
  },
  {
    label: "Email", icon: "mail-outline", placeholder: "email@example.com",
    keyboardType: "email-address", contentType: "email",
    hint: "Enter a valid email address (e.g. name@example.com)",
  },
  {
    label: "Phone", icon: "call-outline", placeholder: "+91 9876543210",
    keyboardType: "phone-pad", contentType: "phone",
    hint: "Numbers and + only — include country code",
  },
  {
    label: "SMS", icon: "chatbubble-outline", placeholder: "+91 9876543210",
    keyboardType: "phone-pad", contentType: "sms",
    hint: "Numbers and + only — scanning opens a pre-filled SMS",
    extraFields: [
      { key: "message", label: "Message (optional)", placeholder: "Hello!", keyboardType: "default", optional: true },
    ],
  },
  {
    label: "WhatsApp", icon: "logo-whatsapp", placeholder: "+91 9876543210",
    keyboardType: "phone-pad", contentType: "whatsapp",
    hint: "Numbers and + only — include country code (e.g. +91)",
    extraFields: [
      { key: "message", label: "Pre-filled message (optional)", placeholder: "Hi there!", keyboardType: "default", optional: true },
    ],
  },
  {
    label: "WiFi", icon: "wifi-outline", placeholder: "NetworkName",
    keyboardType: "default", contentType: "wifi",
    hint: "Scanning will auto-connect to this WiFi network",
    extraFields: [
      { key: "password", label: "Password", placeholder: "WiFi password", keyboardType: "default", secureText: true },
      { key: "encryption", label: "Security (WPA / WEP / nopass)", placeholder: "WPA", keyboardType: "default", optional: true },
      { key: "hidden", label: "Hidden network? (true / false)", placeholder: "false", keyboardType: "default", optional: true },
    ],
  },
  {
    label: "UPI 🇮🇳", icon: "card-outline", placeholder: "merchant@upi",
    keyboardType: "email-address", contentType: "upi",
    hint: "India UPI — works with PhonePe, GPay, Paytm, BHIM",
    extraFields: [
      { key: "name", label: "Payee Name", placeholder: "John Doe or Store Name", keyboardType: "default" },
      { key: "amount", label: "Amount ₹ (optional)", placeholder: "100.00", keyboardType: "decimal-pad", optional: true },
    ],
  },
  {
    label: "Location", icon: "location-outline", placeholder: "12.9716",
    keyboardType: "decimal-pad", contentType: "location",
    hint: "Enter latitude — Google Maps compatible",
    extraFields: [
      { key: "lon", label: "Longitude", placeholder: "77.5946", keyboardType: "decimal-pad" },
      { key: "label", label: "Location label (optional)", placeholder: "My Office", keyboardType: "default", optional: true },
    ],
  },
  {
    label: "Contact", icon: "person-circle-outline", placeholder: "Full Name",
    keyboardType: "default", contentType: "contact",
    hint: "Creates a vCard — scanners can save directly to address book",
    extraFields: [
      { key: "phone", label: "Phone", placeholder: "+91 9876543210", keyboardType: "phone-pad" },
      { key: "email", label: "Email (optional)", placeholder: "name@example.com", keyboardType: "email-address", optional: true },
      { key: "org", label: "Organisation (optional)", placeholder: "Company Name", keyboardType: "default", optional: true },
      { key: "url", label: "Website (optional)", placeholder: "https://example.com", keyboardType: "url", optional: true },
    ],
  },
  {
    label: "Bitcoin", icon: "logo-bitcoin", placeholder: "bc1qxy2kgdygjrsqtzq2n0yrf...",
    keyboardType: "default", contentType: "crypto",
    hint: "Crypto wallet — supports BTC, ETH, LTC, SOL and more",
    extraFields: [
      { key: "amount", label: "Amount (optional)", placeholder: "0.001", keyboardType: "decimal-pad", optional: true },
      { key: "coin", label: "Coin (bitcoin / ethereum / litecoin / solana)", placeholder: "bitcoin", keyboardType: "default", optional: true },
    ],
  },
  {
    label: "Instagram", icon: "logo-instagram", placeholder: "yourusername",
    keyboardType: "default", contentType: "instagram",
    hint: "Enter your Instagram username (without @)",
  },
  {
    label: "Twitter/X", icon: "logo-twitter", placeholder: "yourusername",
    keyboardType: "default", contentType: "twitter",
    hint: "Enter your Twitter / X username (without @)",
  },
  {
    label: "YouTube", icon: "logo-youtube", placeholder: "https://youtube.com/@channel",
    keyboardType: "url", contentType: "youtube",
    hint: "Paste your YouTube channel or video URL",
  },
  {
    label: "LinkedIn", icon: "logo-linkedin", placeholder: "https://linkedin.com/in/username",
    keyboardType: "url", contentType: "linkedin",
    hint: "Paste your LinkedIn profile or company page URL",
  },
  {
    label: "Telegram", icon: "paper-plane-outline", placeholder: "@username",
    keyboardType: "default", contentType: "telegram",
    hint: "Enter @username or full t.me link",
  },
  {
    label: "Spotify", icon: "musical-notes-outline", placeholder: "https://open.spotify.com/track/...",
    keyboardType: "url", contentType: "spotify",
    hint: "Paste a Spotify track, album or playlist link",
  },
  {
    label: "Facebook", icon: "logo-facebook", placeholder: "https://facebook.com/pagename",
    keyboardType: "url", contentType: "facebook",
    hint: "Paste your Facebook profile or page URL",
  },
  {
    label: "PayPal", icon: "wallet-outline", placeholder: "yourusername",
    keyboardType: "default", contentType: "paypal",
    hint: "Enter your PayPal.me username",
    extraFields: [
      { key: "amount", label: "Amount (optional)", placeholder: "10.00", keyboardType: "decimal-pad", optional: true },
    ],
  },
  {
    label: "Venmo 🇺🇸", icon: "people-outline", placeholder: "yourusername",
    keyboardType: "default", contentType: "venmo",
    hint: "Enter your Venmo username — US only",
    extraFields: [
      { key: "amount", label: "Amount $ (optional)", placeholder: "10.00", keyboardType: "decimal-pad", optional: true },
      { key: "note", label: "Note (optional)", placeholder: "For lunch", keyboardType: "default", optional: true },
    ],
  },
  {
    label: "GrabPay 🌏", icon: "phone-portrait-outline", placeholder: "+65 9123 4567",
    keyboardType: "phone-pad", contentType: "grabpay",
    hint: "SE Asia — Singapore, Malaysia, Philippines, Thailand (+country code)",
  },
  {
    label: "Zoom", icon: "videocam-outline", placeholder: "123 456 7890",
    keyboardType: "phone-pad", contentType: "zoom",
    hint: "Enter your Zoom meeting ID (numbers only)",
    extraFields: [
      { key: "password", label: "Passcode (optional)", placeholder: "123456", keyboardType: "number-pad", optional: true },
    ],
  },
  {
    label: "Calendar", icon: "calendar-outline", placeholder: "Event Title",
    keyboardType: "default", contentType: "calendar",
    hint: "Creates a calendar event — scanners can add it directly",
    extraFields: [
      { key: "start", label: "Start (YYYYMMDDTHHMMSS)", placeholder: "20260401T090000", keyboardType: "default" },
      { key: "end", label: "End (YYYYMMDDTHHMMSS)", placeholder: "20260401T100000", keyboardType: "default" },
      { key: "location", label: "Location (optional)", placeholder: "Conference Room", keyboardType: "default", optional: true },
      { key: "description", label: "Description (optional)", placeholder: "Meeting details...", keyboardType: "default", optional: true },
    ],
  },
  {
    label: "App Download", icon: "download-outline", placeholder: "https://apps.apple.com/... or https://play.google.com/...",
    keyboardType: "url", contentType: "appdownload",
    hint: "Paste your App Store or Play Store link",
  },
];

// ─── Build QR content from inputs ─────────────────────────────────────────

function buildQrContent(presetIdx: number, value: string, extra: Record<string, string>): string {
  const v = value.trim();
  if (!v) return "";
  switch (presetIdx) {
    case 0: return v; // text
    case 1: return v.startsWith("http") ? v : `https://${v}`; // URL
    case 2: return `mailto:${v}`; // email
    case 3: return `tel:${v.replace(/\s/g, "")}`; // phone
    case 4: { // SMS
      const cleanPhone = v.replace(/\s/g, "");
      const msg = extra.message?.trim() || "";
      return msg ? `SMSTO:${cleanPhone}:${msg}` : `SMSTO:${cleanPhone}`;
    }
    case 5: { // WhatsApp
      const cleanPhone = v.replace(/[\s\-()]/g, "");
      const msg = extra.message?.trim() || "";
      const base = `https://wa.me/${cleanPhone.replace(/^\+/, "")}`;
      return msg ? `${base}?text=${encodeURIComponent(msg)}` : base;
    }
    case 6: { // WiFi
      const ssid = v;
      const password = extra.password?.trim() || "";
      const enc = (extra.encryption?.trim().toUpperCase() || "WPA");
      const hidden = extra.hidden?.trim().toLowerCase() === "true" ? "true" : "false";
      return `WIFI:T:${enc};S:${ssid};P:${password};H:${hidden};;`;
    }
    case 7: { // UPI
      const vpa = v;
      const name = extra.name?.trim() || "";
      const amount = extra.amount?.trim() || "";
      let url = `upi://pay?pa=${encodeURIComponent(vpa)}`;
      if (name) url += `&pn=${encodeURIComponent(name)}`;
      if (amount) url += `&am=${amount}&cu=INR`;
      return url;
    }
    case 8: { // Location
      const lat = v;
      const lon = extra.lon?.trim() || "";
      const label = extra.label?.trim() || "";
      if (!lon) return `geo:${lat}`;
      return label ? `geo:${lat},${lon}?q=${encodeURIComponent(label)}` : `geo:${lat},${lon}`;
    }
    case 9: { // Contact / vCard
      const name = v;
      const phone = extra.phone?.trim() || "";
      const email = extra.email?.trim() || "";
      const org = extra.org?.trim() || "";
      const url = extra.url?.trim() || "";
      let vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\nN:${name};;;;\n`;
      if (phone) vcard += `TEL:${phone}\n`;
      if (email) vcard += `EMAIL:${email}\n`;
      if (org) vcard += `ORG:${org}\n`;
      if (url) vcard += `URL:${url}\n`;
      vcard += `END:VCARD`;
      return vcard;
    }
    case 10: { // Bitcoin/crypto
      const coin = extra.coin?.trim().toLowerCase() || "bitcoin";
      const amount = extra.amount?.trim() || "";
      return amount ? `${coin}:${v}?amount=${amount}` : `${coin}:${v}`;
    }
    case 11: { // Instagram
      const username = v.replace(/^@/, "");
      return `https://instagram.com/${username}`;
    }
    case 12: { // Twitter/X
      const username = v.replace(/^@/, "");
      return `https://twitter.com/${username}`;
    }
    case 13: { // YouTube
      return v.startsWith("http") ? v : `https://${v}`;
    }
    case 14: { // LinkedIn
      return v.startsWith("http") ? v : `https://${v}`;
    }
    case 15: { // Telegram
      if (v.startsWith("@")) return `https://t.me/${v.slice(1)}`;
      if (v.startsWith("+") || /^\d/.test(v)) return `https://t.me/${encodeURIComponent(v)}`;
      if (v.startsWith("http")) return v;
      return `https://t.me/${v}`;
    }
    case 16: { // Spotify
      return v.startsWith("http") ? v : `https://${v}`;
    }
    case 17: { // Facebook
      return v.startsWith("http") ? v : `https://facebook.com/${v}`;
    }
    case 18: { // PayPal
      const username = v.replace(/^@/, "").replace(/^https?:\/\/paypal\.me\//i, "");
      const amount = extra.amount?.trim() || "";
      return amount ? `https://paypal.me/${username}/${amount}` : `https://paypal.me/${username}`;
    }
    case 19: { // Venmo
      const username = v.replace(/^@/, "");
      const amount = extra.amount?.trim() || "";
      const note = extra.note?.trim() || "";
      let url = `https://venmo.com/${username}`;
      const params: string[] = [];
      if (amount) params.push(`txn=pay&amount=${amount}`);
      if (note) params.push(`note=${encodeURIComponent(note)}`);
      if (params.length) url += `?${params.join("&")}`;
      return url;
    }
    case 20: { // GrabPay
      const cleanPhone = v.replace(/[\s\-()]/g, "");
      return `https://grab.onelink.me/2695613898?af_dp=grab%3A%2F%2Fopen%3FscreenType%3DTRANSFER%26phone%3D${encodeURIComponent(cleanPhone)}`;
    }
    case 21: { // Zoom
      const meetingId = v.replace(/\s/g, "");
      const password = extra.password?.trim() || "";
      return password
        ? `https://zoom.us/j/${meetingId}?pwd=${encodeURIComponent(password)}`
        : `https://zoom.us/j/${meetingId}`;
    }
    case 22: { // Calendar / iCal
      const title = v;
      const start = extra.start?.trim() || "";
      const end = extra.end?.trim() || "";
      const location = extra.location?.trim() || "";
      const description = extra.description?.trim() || "";
      let cal = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:${title}\n`;
      if (start) cal += `DTSTART:${start}\n`;
      if (end) cal += `DTEND:${end}\n`;
      if (location) cal += `LOCATION:${location}\n`;
      if (description) cal += `DESCRIPTION:${description}\n`;
      cal += `END:VEVENT\nEND:VCALENDAR`;
      return cal;
    }
    case 23: { // App Download
      return v.startsWith("http") ? v : `https://${v}`;
    }
    default: return v;
  }
}

// Raw readable content for clipboard
function getRawContent(presetIdx: number, value: string, extra: Record<string, string>): string {
  const v = value.trim();
  switch (presetIdx) {
    case 2: return v; // just the email
    case 3: return v; // just the phone
    case 4: return v; // phone
    case 5: return v; // phone
    case 11: return `https://instagram.com/${v.replace(/^@/, "")}`;
    case 12: return `https://twitter.com/${v.replace(/^@/, "")}`;
    case 18: return `https://paypal.me/${v.replace(/^@/, "")}`;
    case 19: return `https://venmo.com/${v.replace(/^@/, "")}`;
    default: return buildQrContent(presetIdx, value, extra);
  }
}

// Filter input text based on keyboard type to enforce numeric-only fields
function filterByKeyboardType(text: string, keyboardType: KeyboardTypeOptions): string {
  if (keyboardType === "phone-pad") {
    return text.replace(/[^\d+\s\-().]/g, "");
  }
  if (keyboardType === "number-pad" || keyboardType === "numeric") {
    return text.replace(/[^\d]/g, "");
  }
  if (keyboardType === "decimal-pad") {
    const filtered = text.replace(/[^\d.]/g, "");
    const parts = filtered.split(".");
    if (parts.length > 2) return parts[0] + "." + parts.slice(1).join("");
    return filtered;
  }
  return text;
}

// ─── Validation ────────────────────────────────────────────────────────────

function validate(presetIdx: number, value: string, extra: Record<string, string>): string | null {
  const v = value.trim();
  if (!v) {
    const labels: Record<number, string> = {
      0: "Please type some text first.",
      1: "Please enter a URL (e.g. example.com).",
      2: "Please enter an email address (e.g. name@example.com).",
      3: "Please enter a phone number with country code (e.g. +91 9876543210).",
      4: "Please enter the recipient's phone number.",
      5: "Please enter the recipient's WhatsApp number.",
      6: "Please enter the WiFi network name (SSID).",
      7: "Please enter the UPI VPA (e.g. merchant@upi).",
      8: "Please enter a latitude value.",
      9: "Please enter the contact's full name.",
      10: "Please enter the cryptocurrency wallet address.",
      11: "Please enter your Instagram username.",
      12: "Please enter your Twitter / X username.",
      13: "Please enter your YouTube channel or video URL.",
      14: "Please enter your LinkedIn profile URL.",
      15: "Please enter your Telegram username or phone number.",
      16: "Please enter a Spotify link.",
      17: "Please enter your Facebook profile or page URL.",
      18: "Please enter your PayPal.me username.",
      19: "Please enter your Venmo username.",
      20: "Please enter the phone number with country code (e.g. +65 91234567).",
      21: "Please enter the Zoom meeting ID.",
      22: "Please enter the event title.",
      23: "Please enter the app download URL.",
    };
    return labels[presetIdx] ?? "Please enter some content first.";
  }
  switch (presetIdx) {
    case 1: { // URL
      const withScheme = v.startsWith("http") ? v : `https://${v}`;
      try {
        const url = new URL(withScheme);
        if (!url.hostname.includes(".") || url.hostname.length < 4) return "Please enter a valid URL (e.g. https://example.com).";
      } catch {
        return "Please enter a valid URL (e.g. https://example.com).";
      }
      return null;
    }
    case 2: { // Email
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v))
        return "Invalid email address. Please enter a valid one (e.g. name@example.com).";
      return null;
    }
    case 3: { // Phone
      if (!/^[+\d][\d\s\-().]{5,19}$/.test(v))
        return "Please enter a valid phone number with country code (e.g. +91 9876543210).";
      return null;
    }
    case 4: { // SMS
      if (!/^[+\d][\d\s\-().]{5,19}$/.test(v))
        return "Please enter a valid phone number for the SMS recipient (e.g. +91 9876543210).";
      return null;
    }
    case 5: { // WhatsApp
      const cleaned = v.replace(/[\s\-()]/g, "");
      if (!/^\+?\d{7,15}$/.test(cleaned))
        return "Please enter a valid WhatsApp number with country code (e.g. +91 9876543210).";
      return null;
    }
    case 6: { // WiFi
      if (v.length < 1) return "Please enter the WiFi network name (SSID).";
      return null;
    }
    case 7: { // UPI
      if (!/^[\w.\-+]+@[\w]+$/.test(v))
        return "Please enter a valid UPI VPA (e.g. merchant@upi or 9876543210@paytm).";
      if (!extra.name?.trim()) return "Please enter the payee name for the UPI payment.";
      return null;
    }
    case 8: { // Location
      const lat = parseFloat(v);
      if (isNaN(lat) || lat < -90 || lat > 90)
        return "Latitude must be a number between -90 and 90 (e.g. 12.9716).";
      const lon = parseFloat(extra.lon || "");
      if (!extra.lon?.trim() || isNaN(lon) || lon < -180 || lon > 180)
        return "Please enter a valid longitude between -180 and 180 (e.g. 77.5946).";
      return null;
    }
    case 9: { // Contact
      if (!extra.phone?.trim())
        return "Please enter at least a phone number for the contact.";
      return null;
    }
    case 10: { // Bitcoin/Crypto
      if (v.length < 20)
        return "Please enter a valid cryptocurrency wallet address (at least 20 characters).";
      return null;
    }
    case 11: { // Instagram
      if (!/^@?[\w.]{1,30}$/.test(v))
        return "Please enter a valid Instagram username (letters, numbers, dots, underscores).";
      return null;
    }
    case 12: { // Twitter/X
      if (!/^@?[\w]{1,15}$/.test(v))
        return "Please enter a valid Twitter / X username (letters, numbers, underscores — max 15).";
      return null;
    }
    case 13: { // YouTube
      const yt = v.startsWith("http") ? v : `https://${v}`;
      if (!yt.includes("youtube.com") && !yt.includes("youtu.be"))
        return "Please enter a valid YouTube URL (e.g. https://youtube.com/@channel).";
      return null;
    }
    case 14: { // LinkedIn
      const li = v.startsWith("http") ? v : `https://${v}`;
      if (!li.includes("linkedin.com"))
        return "Please enter a valid LinkedIn URL (e.g. https://linkedin.com/in/username).";
      return null;
    }
    case 15: { // Telegram
      if (!v.startsWith("@") && !v.startsWith("+") && !/^\d/.test(v) && !v.startsWith("http"))
        return "Please enter a Telegram @username, phone number with country code, or t.me link.";
      return null;
    }
    case 16: { // Spotify
      const sp = v.startsWith("http") ? v : `https://${v}`;
      if (!sp.includes("spotify.com") && !sp.includes("spotify:"))
        return "Please enter a valid Spotify link (e.g. https://open.spotify.com/track/...).";
      return null;
    }
    case 17: { // Facebook
      const fb = v.startsWith("http") ? v : `https://facebook.com/${v}`;
      try { new URL(fb); } catch { return "Please enter a valid Facebook URL or page name."; }
      return null;
    }
    case 18: { // PayPal
      if (v.length < 2)
        return "Please enter your PayPal.me username (e.g. johnsmith).";
      return null;
    }
    case 19: { // Venmo
      if (v.length < 2)
        return "Please enter your Venmo username (e.g. johnsmith).";
      return null;
    }
    case 20: { // GrabPay
      const cleaned = v.replace(/[\s\-()]/g, "");
      if (!/^\+?\d{7,15}$/.test(cleaned))
        return "Please enter a valid phone number with country code (e.g. +65 91234567).";
      return null;
    }
    case 21: { // Zoom
      const meetId = v.replace(/\s/g, "");
      if (!/^\d{9,11}$/.test(meetId))
        return "Please enter a valid Zoom meeting ID (9–11 digits, no spaces).";
      return null;
    }
    case 22: { // Calendar
      if (!extra.start?.trim())
        return "Please enter a start date/time (e.g. 20260401T090000).";
      if (!/^\d{8}T\d{6}$/.test(extra.start.trim()))
        return "Start date/time must be in format YYYYMMDDTHHMMSS (e.g. 20260401T090000).";
      return null;
    }
    case 23: { // App Download
      const withScheme = v.startsWith("http") ? v : `https://${v}`;
      try { new URL(withScheme); } catch {
        return "Please enter a valid App Store or Play Store URL.";
      }
      return null;
    }
    default: return null; // Text — anything goes
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function getFirestoreContentType(presetIdx: number): string {
  return QR_PRESETS[presetIdx]?.contentType ?? "text";
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

type LogoPosition = "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right";

const LOGO_POSITIONS: { key: LogoPosition; label: string }[] = [
  { key: "center", label: "Center" },
  { key: "top-left", label: "Top Left" },
  { key: "top-right", label: "Top Right" },
  { key: "bottom-left", label: "Bot. Left" },
  { key: "bottom-right", label: "Bot. Right" },
];

// ─── Component ─────────────────────────────────────────────────────────────

export default function QrGeneratorScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const svgRef = useRef<any>(null);

  const [selectedPreset, setSelectedPreset] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [extraFields, setExtraFields] = useState<Record<string, string>>({});
  const [qrValue, setQrValue] = useState("");
  const [qrSize, setQrSize] = useState(220);
  const [qrMode, setQrMode] = useState<"individual" | "business" | "private">("individual");
  const [businessName, setBusinessName] = useState("");
  const [customLogoUri, setCustomLogoUri] = useState<string | null>(null);
  const [customLogoBase64, setCustomLogoBase64] = useState<string | null>(null);
  const [logoPosition, setLogoPosition] = useState<LogoPosition>("center");
  const [generatedUuid, setGeneratedUuid] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [positionModalOpen, setPositionModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedToProfile, setSavedToProfile] = useState(false);

  // Toast
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const tabBarHeight = 60 + insets.bottom;

  const preset = QR_PRESETS[selectedPreset];
  const privateMode = qrMode === "private";
  const isBranded = !!user && !privateMode;

  function showToast(msg: string, type: "success" | "error" = "success") {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMsg(msg);
    setToastType(type);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(toastAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
    toastTimer.current = setTimeout(() => setToastMsg(""), 2400);
  }

  function setExtraField(key: string, val: string) {
    setExtraFields((prev) => ({ ...prev, [key]: val }));
  }

  function switchPreset(idx: number) {
    setSelectedPreset(idx);
    setInputValue("");
    setExtraFields({});
    setQrValue("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function handleGenerate() {
    // For business mode — always URL based
    if (qrMode === "business" && isBranded) {
      const v = inputValue.trim();
      if (!v) { showToast("Please enter a destination URL.", "error"); return; }
      const withScheme = v.startsWith("http") ? v : `https://${v}`;
      try {
        const url = new URL(withScheme);
        if (!url.hostname.includes(".") || url.hostname.length < 4) {
          showToast("Please enter a valid URL for the business QR.", "error"); return;
        }
      } catch {
        showToast("Please enter a valid URL for the business QR.", "error"); return;
      }
    } else {
      const error = validate(selectedPreset, inputValue, extraFields);
      if (error) {
        showToast(error, "error");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
    }

    const builtContent = qrMode === "business" && isBranded
      ? (inputValue.trim().startsWith("http") ? inputValue.trim() : `https://${inputValue.trim()}`)
      : buildQrContent(selectedPreset, inputValue, extraFields);

    const uuid = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      builtContent + Date.now()
    );
    const shortUuid = uuid.slice(0, 16).toUpperCase().match(/.{1,4}/g)?.join("-") || uuid.slice(0, 16);

    const isBusinessMode = qrMode === "business" && isBranded && !!user;

    let encodedValue = builtContent;
    if (isBusinessMode) {
      const base = getApiUrl().replace(/\/$/, "");
      encodedValue = `${base}/guard/${shortUuid}`;
    }

    setQrValue(encodedValue);
    setGeneratedUuid(isBranded ? shortUuid : null);
    setGeneratedAt(new Date());
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (isBranded && user) {
      setSaving(true);
      setSavedToProfile(false);
      try {
        const qt: QrType = qrMode === "business" ? "business" : "individual";
        const logoToStore = qrMode === "business" && customLogoBase64 ? customLogoBase64 : null;
        const bName = qrMode === "business" ? (businessName.trim() || null) : null;

        if (isBusinessMode) {
          await saveGuardLink(shortUuid, builtContent, bName, user.displayName, user.id);
        }

        await saveGeneratedQr(
          user.id,
          user.displayName,
          encodedValue,
          getFirestoreContentType(selectedPreset),
          shortUuid,
          true,
          qt,
          bName,
          logoToStore,
          isBusinessMode ? shortUuid : null
        );
        setSavedToProfile(true);
        setTimeout(() => setSavedToProfile(false), 4000);
      } catch (err: any) {
        showToast(err?.message || "Could not save QR code. Please try again.", "error");
      }
      setSaving(false);
    }
  }

  async function handlePickCustomLogo() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { showToast("Gallery permission is required.", "error"); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3,
      base64: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      setCustomLogoUri(result.assets[0].uri);
      if (result.assets[0].base64) {
        setCustomLogoBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
      } else {
        setCustomLogoBase64(null);
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }

  async function handleCopy() {
    if (!qrValue) return;
    // Copy the readable raw content, not the redirect URL
    const rawContent = qrMode === "business" && isBranded
      ? inputValue.trim()
      : getRawContent(selectedPreset, inputValue, extraFields);
    await Clipboard.setStringAsync(rawContent || qrValue);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast("Copied to clipboard!", "success");
  }

  async function handleShare() {
    if (!qrValue || !svgRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Web fallback
    if (Platform.OS === "web") {
      showToast("Download the QR image by long-pressing it.", "success");
      return;
    }

    // Native: share only the QR image, no text
    svgRef.current.toDataURL(async (dataUrl: string) => {
      try {
        const rawBase64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
        const fileName = `qrguard_${Date.now()}.png`;
        const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? "";
        const fileUri = dir + fileName;
        await FileSystem.writeAsStringAsync(fileUri, rawBase64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, {
            mimeType: "image/png",
            dialogTitle: "Share QR Code Image",
            UTI: "public.png",
          });
        } else {
          showToast("Sharing is not available on this device.", "error");
        }
      } catch {
        showToast("Could not share the QR code image.", "error");
      }
    });
  }

  function handleClear() {
    setInputValue("");
    setExtraFields({});
    setQrValue("");
    setGeneratedUuid(null);
    setGeneratedAt(null);
    setCustomLogoUri(null);
    setCustomLogoBase64(null);
    setLogoPosition("center");
    setSavedToProfile(false);
    setBusinessName("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  const logoSource = customLogoUri
    ? { uri: customLogoUri }
    : isBranded
    ? require("../../assets/images/icon.png")
    : undefined;

  function getLogoPositionLabel(pos: LogoPosition): string {
    return LOGO_POSITIONS.find((p) => p.key === pos)?.label || "Center";
  }

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.navBar}>
        <Text style={styles.navTitle}>QR Generator</Text>
        <Pressable onPress={() => setInfoModalOpen(true)} style={styles.infoBtn}>
          <Ionicons name="information-circle-outline" size={22} color={Colors.dark.textSecondary} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 20 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Mode toggle */}
        <ReanimatedAnimated.View entering={FadeInDown.duration(400)}>
          {user ? (
            <View style={styles.modeRow}>
              <Pressable
                onPress={() => { setQrMode("individual"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={[styles.modeBtn, qrMode === "individual" && styles.modeBtnActive]}
              >
                <Ionicons name="person" size={15} color={qrMode === "individual" ? Colors.dark.primary : Colors.dark.textMuted} />
                <Text style={[styles.modeBtnText, qrMode === "individual" && styles.modeBtnTextActive]}>Individual</Text>
              </Pressable>
              <Pressable
                onPress={() => { setQrMode("business"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={[styles.modeBtn, qrMode === "business" && styles.modeBtnBusiness]}
              >
                <Ionicons name="storefront" size={15} color={qrMode === "business" ? "#FBBF24" : Colors.dark.textMuted} />
                <Text style={[styles.modeBtnText, qrMode === "business" && styles.modeBtnTextBusiness]}>Business</Text>
              </Pressable>
              <Pressable
                onPress={() => { setQrMode("private"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={[styles.modeBtn, qrMode === "private" && styles.modeBtnPrivate]}
              >
                <Ionicons name="eye-off-outline" size={15} color={qrMode === "private" ? "#F8FAFC" : Colors.dark.textMuted} />
                <Text style={[styles.modeBtnText, qrMode === "private" && styles.modeBtnTextPrivate]}>Private</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.modeRow}>
              <Pressable
                onPress={() => { setQrMode("individual"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={[styles.modeBtn, qrMode !== "private" && styles.modeBtnActive]}
              >
                <Ionicons name="shield-checkmark" size={15} color={qrMode !== "private" ? Colors.dark.primary : Colors.dark.textMuted} />
                <Text style={[styles.modeBtnText, qrMode !== "private" && styles.modeBtnTextActive]}>Standard</Text>
              </Pressable>
              <Pressable
                onPress={() => { setQrMode("private"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={[styles.modeBtn, qrMode === "private" && styles.modeBtnPrivate]}
              >
                <Ionicons name="eye-off-outline" size={15} color={qrMode === "private" ? "#F8FAFC" : Colors.dark.textMuted} />
                <Text style={[styles.modeBtnText, qrMode === "private" && styles.modeBtnTextPrivate]}>Private</Text>
              </Pressable>
            </View>
          )}

          {qrMode === "individual" && user ? (
            <View style={styles.brandedBanner}>
              <Ionicons name="person" size={14} color={Colors.dark.safe} />
              <Text style={styles.brandedBannerText}>
                Branded with your QR Guard identity — saved to your profile with a unique ID
              </Text>
            </View>
          ) : qrMode === "business" && user ? (
            <View style={[styles.brandedBanner, { borderColor: "#FBBF2440", backgroundColor: "#FBBF2410" }]}>
              <Ionicons name="shield" size={14} color="#FBBF24" />
              <Text style={[styles.brandedBannerText, { color: "#FBBF24" }]}>
                Living Shield — QR encodes a redirect you can update anytime without reprinting
              </Text>
            </View>
          ) : qrMode === "private" ? (
            <View style={styles.privateBanner}>
              <Ionicons name="eye-off-outline" size={14} color={Colors.dark.textMuted} />
              <Text style={styles.privateBannerText}>No-trace mode — nothing is recorded. Fully local QR code.</Text>
            </View>
          ) : (
            <Pressable style={styles.signInPrompt} onPress={() => router.push("/(auth)/login")}>
              <Ionicons name="sparkles-outline" size={14} color={Colors.dark.accent} />
              <Text style={styles.signInPromptText}>Sign in to create branded QR codes with your QR Guard identity</Text>
              <Ionicons name="chevron-forward" size={14} color={Colors.dark.accent} />
            </Pressable>
          )}

          {qrMode === "business" && user && (
            <View style={styles.businessNameRow}>
              <Ionicons name="business-outline" size={16} color="#FBBF24" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.businessNameInput}
                placeholder="Store or organisation name (optional)"
                placeholderTextColor={Colors.dark.textMuted}
                value={businessName}
                onChangeText={setBusinessName}
                maxLength={60}
              />
            </View>
          )}
        </ReanimatedAnimated.View>

        {/* Content type — hidden in business mode */}
        {qrMode !== "business" && (
          <ReanimatedAnimated.View entering={FadeInDown.duration(400).delay(80)}>
            <Text style={styles.sectionLabel}>Content Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
              <View style={styles.presetRow}>
                {QR_PRESETS.map((p, idx) => (
                  <Pressable
                    key={idx}
                    onPress={() => switchPreset(idx)}
                    style={[styles.presetBtn, selectedPreset === idx && styles.presetBtnActive]}
                  >
                    <Ionicons name={p.icon as any} size={16} color={selectedPreset === idx ? Colors.dark.primary : Colors.dark.textMuted} />
                    <Text style={[styles.presetBtnText, selectedPreset === idx && styles.presetBtnTextActive]}>{p.label}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            {preset.hint && (
              <View style={styles.hintBanner}>
                <Ionicons name="information-circle-outline" size={14} color={Colors.dark.primary} />
                <Text style={styles.hintText}>{preset.hint}</Text>
              </View>
            )}
          </ReanimatedAnimated.View>
        )}

        {/* Input */}
        <ReanimatedAnimated.View entering={FadeInDown.duration(400).delay(140)}>
          <Text style={styles.sectionLabel}>
            {qrMode === "business" && isBranded
              ? "Destination URL"
              : preset.extraFields
              ? preset.extraFields[0]?.optional === false
                ? preset.label
                : preset.label
              : "Content"}
          </Text>

          {/* Main input */}
          <View style={styles.inputCard}>
            <TextInput
              style={styles.textInput}
              value={inputValue}
              onChangeText={(t) => {
                const kt = qrMode === "business" && isBranded ? "url" : preset.keyboardType;
                setInputValue(filterByKeyboardType(t, kt));
              }}
              placeholder={
                qrMode === "business" && isBranded
                  ? "https://your-website.com"
                  : selectedPreset === 9
                  ? "Full Name"
                  : preset.placeholder
              }
              placeholderTextColor={Colors.dark.textMuted}
              multiline={preset.multiline && !preset.extraFields}
              maxLength={500}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType={qrMode === "business" && isBranded ? "url" : preset.keyboardType}
            />
            {inputValue.length > 0 ? (
              <Pressable onPress={() => { setInputValue(""); setQrValue(""); }} style={styles.clearBtn}>
                <Ionicons name="close-circle" size={20} color={Colors.dark.textMuted} />
              </Pressable>
            ) : null}
          </View>

          {/* Extra fields for structured types */}
          {qrMode !== "business" && preset.extraFields?.map((field) => (
            <View key={field.key} style={[styles.inputCard, { marginTop: 10 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.extraFieldLabel}>
                  {field.label}{field.optional ? "" : " *"}
                </Text>
                <TextInput
                  style={[styles.textInput, { minHeight: 36 }]}
                  value={extraFields[field.key] ?? ""}
                  onChangeText={(t) => setExtraField(field.key, filterByKeyboardType(t, field.keyboardType ?? "default"))}
                  placeholder={field.placeholder}
                  placeholderTextColor={Colors.dark.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType={field.keyboardType ?? "default"}
                  secureTextEntry={field.secureText}
                />
              </View>
            </View>
          ))}

          <Text style={styles.charCount}>{inputValue.length}/500</Text>
        </ReanimatedAnimated.View>

        {/* Logo + Position */}
        <ReanimatedAnimated.View entering={FadeInDown.duration(400).delay(180)}>
          <Text style={styles.sectionLabel}>Logo (Optional)</Text>
          <View style={styles.logoRow}>
            <Pressable onPress={handlePickCustomLogo} style={styles.logoPicker}>
              {customLogoUri ? (
                <Image source={{ uri: customLogoUri }} style={styles.logoPreview} />
              ) : isBranded ? (
                <Image source={require("../../assets/images/icon.png")} style={styles.logoPreview} />
              ) : (
                <>
                  <Ionicons name="image-outline" size={20} color={Colors.dark.textMuted} />
                  <Text style={styles.logoPickerText}>Add Logo</Text>
                </>
              )}
            </Pressable>

            <View style={styles.logoOptions}>
              {(customLogoUri || isBranded) && (
                <Pressable
                  onPress={() => { setPositionModalOpen(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  style={styles.positionBtn}
                >
                  <Ionicons name="move-outline" size={16} color={Colors.dark.primary} />
                  <Text style={styles.positionBtnText}>Position: {getLogoPositionLabel(logoPosition)}</Text>
                  <Ionicons name="chevron-forward" size={14} color={Colors.dark.textMuted} />
                </Pressable>
              )}
              {customLogoUri ? (
                <Pressable onPress={() => setCustomLogoUri(null)} style={styles.removeLogoBtn}>
                  <Ionicons name="close" size={16} color={Colors.dark.danger} />
                  <Text style={styles.removeLogoText}>Remove Custom Logo</Text>
                </Pressable>
              ) : isBranded ? (
                <View style={styles.defaultLogoInfo}>
                  <Ionicons name="shield-checkmark" size={14} color={Colors.dark.safe} />
                  <Text style={styles.defaultLogoText}>QR Guard logo — tap image to replace</Text>
                </View>
              ) : (
                <Text style={styles.logoHint}>Custom logo appears in the center of your QR code</Text>
              )}
            </View>
          </View>
        </ReanimatedAnimated.View>

        {/* Generate button */}
        <ReanimatedAnimated.View entering={FadeInDown.duration(400).delay(220)}>
          <Pressable
            onPress={handleGenerate}
            style={({ pressed }) => [styles.generateBtn, { opacity: pressed ? 0.8 : 1 }]}
          >
            <MaterialCommunityIcons name="qrcode-edit" size={22} color="#000" />
            <Text style={styles.generateBtnText}>Generate QR Code</Text>
          </Pressable>
        </ReanimatedAnimated.View>

        {/* QR display */}
        {qrValue ? (
          <ReanimatedAnimated.View entering={FadeIn.duration(400)} style={styles.qrCard}>
            <View style={styles.qrWrapper}>
              <View style={styles.qrBg}>
                <QRCode
                  value={qrValue}
                  size={qrSize}
                  color="#0A0E17"
                  backgroundColor="#F8FAFC"
                  getRef={(ref: any) => { svgRef.current = ref; }}
                  logo={logoPosition === "center" ? logoSource : undefined}
                  logoSize={customLogoUri ? 54 : isBranded ? 48 : undefined}
                  logoBackgroundColor="#F8FAFC"
                  logoBorderRadius={customLogoUri ? 27 : 10}
                  logoMargin={4}
                  quietZone={10}
                  ecl="H"
                />
                {logoSource && logoPosition !== "center" && (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.cornerLogoWrapper,
                      logoPosition === "top-left" && { top: 10, left: 10 },
                      logoPosition === "top-right" && { top: 10, right: 10 },
                      logoPosition === "bottom-left" && { bottom: 10, left: 10 },
                      logoPosition === "bottom-right" && { bottom: 10, right: 10 },
                    ]}
                  >
                    <Image
                      source={customLogoUri ? { uri: customLogoUri } : require("../../assets/images/icon.png")}
                      style={styles.cornerLogoImage}
                    />
                  </View>
                )}
              </View>
            </View>

            {logoPosition !== "center" && logoSource && (
              <View style={styles.positionNote}>
                <Ionicons name="information-circle-outline" size={13} color={Colors.dark.primary} />
                <Text style={styles.positionNoteText}>Logo placed at {getLogoPositionLabel(logoPosition).toLowerCase()} corner</Text>
              </View>
            )}

            {savedToProfile && (
              <Pressable onPress={() => router.push("/(tabs)/profile")} style={styles.savedBanner}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.dark.safe} />
                <Text style={styles.savedBannerText}>Saved to your profile! Tap to view →</Text>
              </Pressable>
            )}

            {isBranded && generatedUuid ? (
              <View style={styles.brandedFooter}>
                <View style={styles.brandedHeader}>
                  <Image source={require("../../assets/images/icon.png")} style={styles.brandLogo} />
                  <Text style={styles.brandName}>QR Guard</Text>
                  <View style={styles.secureBadge}>
                    <Ionicons name="shield-checkmark" size={11} color={Colors.dark.safe} />
                    <Text style={styles.secureText}>Verified</Text>
                  </View>
                  {saving && <Text style={styles.savingText}>Saving…</Text>}
                </View>
                <View style={styles.brandedMeta}>
                  <View style={styles.brandedMetaItem}>
                    <Text style={styles.brandedMetaLabel}>QR ID</Text>
                    <Text style={styles.brandedMetaValue} numberOfLines={1}>{generatedUuid}</Text>
                  </View>
                  <View style={styles.brandedMetaItem}>
                    <Text style={styles.brandedMetaLabel}>Created by</Text>
                    <Text style={styles.brandedMetaValue} numberOfLines={1}>{user?.displayName}</Text>
                  </View>
                  {generatedAt ? (
                    <View style={styles.brandedMetaItem}>
                      <Text style={styles.brandedMetaLabel}>Date</Text>
                      <Text style={styles.brandedMetaValue}>{formatShortDate(generatedAt)}</Text>
                    </View>
                  ) : null}
                </View>
                {qrMode === "business" ? (
                  <View style={[styles.ownershipNote, { borderColor: "#FBBF2430", backgroundColor: "#FBBF2408" }]}>
                    <Ionicons name="shield" size={12} color="#FBBF24" />
                    <Text style={[styles.ownershipNoteText, { color: "#FBBF24" }]}>
                      Living Shield active — update the destination anytime from My QR Codes without reprinting.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.ownershipNote}>
                    <Ionicons name="lock-closed" size={12} color={Colors.dark.primary} />
                    <Text style={styles.ownershipNoteText}>
                      This QR is registered to your account. Only you can manage its comments and view followers.
                    </Text>
                  </View>
                )}
              </View>
            ) : privateMode ? (
              <View style={styles.privateFooter}>
                <Ionicons name="eye-off-outline" size={14} color={Colors.dark.textMuted} />
                <Text style={styles.privateFooterText}>No-trace QR — not recorded anywhere</Text>
              </View>
            ) : null}

            {qrMode !== "business" && (
              <Text style={styles.qrContentPreview} numberOfLines={2}>{qrValue}</Text>
            )}

            {/* Size control */}
            <View style={styles.sizeRow}>
              <Text style={styles.sizeLabel}>Size</Text>
              <View style={styles.sizeButtons}>
                <Pressable onPress={() => setQrSize(Math.max(160, qrSize - 20))} style={styles.sizeBtn}>
                  <Ionicons name="remove" size={18} color={Colors.dark.primary} />
                </Pressable>
                <Text style={styles.sizePx}>{qrSize}px</Text>
                <Pressable onPress={() => setQrSize(Math.min(320, qrSize + 20))} style={styles.sizeBtn}>
                  <Ionicons name="add" size={18} color={Colors.dark.primary} />
                </Pressable>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.qrActions}>
              <Pressable onPress={handleCopy} style={styles.qrActionBtn}>
                <Ionicons name="copy-outline" size={19} color={Colors.dark.primary} />
                <Text style={styles.qrActionText}>Copy</Text>
              </Pressable>
              <Pressable onPress={handleShare} style={styles.qrActionBtn}>
                <Ionicons name="share-outline" size={19} color={Colors.dark.primary} />
                <Text style={styles.qrActionText}>Share</Text>
              </Pressable>
              <Pressable onPress={handleClear} style={[styles.qrActionBtn, { borderColor: Colors.dark.danger + "50" }]}>
                <Ionicons name="trash-outline" size={19} color={Colors.dark.danger} />
                <Text style={[styles.qrActionText, { color: Colors.dark.danger }]}>Clear</Text>
              </Pressable>
            </View>
          </ReanimatedAnimated.View>
        ) : (
          <ReanimatedAnimated.View entering={FadeIn.duration(400)} style={styles.emptyQr}>
            <View style={styles.emptyQrPlaceholder}>
              <MaterialCommunityIcons name="qrcode-scan" size={64} color={Colors.dark.textMuted} />
            </View>
            <Text style={styles.emptyQrText}>Your QR code will appear here</Text>
            <Text style={styles.emptyQrSub}>Enter content above and tap Generate</Text>
          </ReanimatedAnimated.View>
        )}
      </ScrollView>

      {/* Toast overlay */}
      {toastMsg ? (
        <Animated.View
          style={[
            styles.toast,
            toastType === "error" ? styles.toastError : styles.toastSuccess,
            { opacity: toastAnim, transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] },
          ]}
          pointerEvents="none"
        >
          <Ionicons
            name={toastType === "error" ? "alert-circle" : "checkmark-circle"}
            size={18}
            color={toastType === "error" ? Colors.dark.danger : Colors.dark.safe}
          />
          <Text style={[styles.toastText, toastType === "error" ? { color: Colors.dark.danger } : { color: Colors.dark.safe }]}>
            {toastMsg}
          </Text>
        </Animated.View>
      ) : null}

      {/* Logo Position Modal */}
      <Modal visible={positionModalOpen} transparent animationType="slide" onRequestClose={() => setPositionModalOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setPositionModalOpen(false)}>
          <Pressable style={styles.infoSheet} onPress={() => {}}>
            <View style={styles.infoSheetHandle} />
            <Text style={styles.infoSheetTitle}>Logo Position</Text>
            <Text style={styles.infoSheetSub}>Choose where to place your logo on the QR code</Text>
            <View style={styles.positionGrid}>
              {LOGO_POSITIONS.map((pos) => (
                <Pressable
                  key={pos.key}
                  onPress={() => { setLogoPosition(pos.key); setPositionModalOpen(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  style={[styles.positionGridBtn, logoPosition === pos.key && styles.positionGridBtnActive]}
                >
                  <View style={[styles.positionGridPreview, logoPosition === pos.key && styles.positionGridPreviewActive]}>
                    <View
                      style={[
                        styles.positionDot,
                        pos.key === "center" && { alignSelf: "center", marginTop: "auto", marginBottom: "auto" },
                        pos.key === "top-left" && { position: "absolute", top: 4, left: 4 },
                        pos.key === "top-right" && { position: "absolute", top: 4, right: 4 },
                        pos.key === "bottom-left" && { position: "absolute", bottom: 4, left: 4 },
                        pos.key === "bottom-right" && { position: "absolute", bottom: 4, right: 4 },
                      ]}
                    />
                  </View>
                  <Text style={[styles.positionGridLabel, logoPosition === pos.key && styles.positionGridLabelActive]}>{pos.label}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={styles.infoClose} onPress={() => setPositionModalOpen(false)}>
              <Text style={styles.infoCloseText}>Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Info modal */}
      <Modal visible={infoModalOpen} transparent animationType="slide" onRequestClose={() => setInfoModalOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setInfoModalOpen(false)}>
          <Pressable style={styles.infoSheet} onPress={() => {}}>
            <View style={styles.infoSheetHandle} />
            <Text style={styles.infoSheetTitle}>About QR Generation</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              <View style={styles.infoItem}>
                <View style={[styles.infoItemIcon, { backgroundColor: Colors.dark.primaryDim }]}>
                  <Ionicons name="shield-checkmark" size={20} color={Colors.dark.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoItemTitle}>Branded QR (Signed In)</Text>
                  <Text style={styles.infoItemDesc}>Includes the QR Guard logo, a unique ID, your name, and creation date. Saved and registered to your account.</Text>
                </View>
              </View>
              <View style={styles.infoItem}>
                <View style={[styles.infoItemIcon, { backgroundColor: "rgba(100,116,139,0.15)" }]}>
                  <Ionicons name="eye-off-outline" size={20} color={Colors.dark.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoItemTitle}>Private / No-Trace QR</Text>
                  <Text style={styles.infoItemDesc}>Completely local. No logo, no ID, no data sent or recorded anywhere. Ideal for personal use.</Text>
                </View>
              </View>
              <View style={styles.infoItem}>
                <View style={[styles.infoItemIcon, { backgroundColor: "#FBBF2420" }]}>
                  <Ionicons name="card-outline" size={20} color="#FBBF24" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoItemTitle}>UPI 🇮🇳 (India)</Text>
                  <Text style={styles.infoItemDesc}>Generate UPI payment QRs for PhonePe, Google Pay, Paytm, BHIM, and any UPI app.</Text>
                </View>
              </View>
              <View style={styles.infoItem}>
                <View style={[styles.infoItemIcon, { backgroundColor: Colors.dark.accentDim }]}>
                  <Ionicons name="image-outline" size={20} color={Colors.dark.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoItemTitle}>Custom Logo & Position</Text>
                  <Text style={styles.infoItemDesc}>Add your own image or logo. Place it in the center or any corner of the QR code.</Text>
                </View>
              </View>
            </ScrollView>
            <Pressable style={styles.infoClose} onPress={() => setInfoModalOpen(false)}>
              <Text style={styles.infoCloseText}>Got it</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  navBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.dark.surfaceBorder,
  },
  navTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.dark.text },
  infoBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.dark.surface, borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
    alignItems: "center", justifyContent: "center",
  },
  scrollContent: { padding: 20 },

  modeRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  modeBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 12, borderRadius: 14,
    backgroundColor: Colors.dark.surface, borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  modeBtnActive: { backgroundColor: Colors.dark.primaryDim, borderColor: Colors.dark.primary },
  modeBtnPrivate: { backgroundColor: "#1E293B", borderColor: "#334155" },
  modeBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.dark.textMuted },
  modeBtnTextActive: { color: Colors.dark.primary },
  modeBtnTextPrivate: { color: "#F8FAFC" },
  modeBtnBusiness: { backgroundColor: "#FBBF2420", borderColor: "#FBBF2460" },
  modeBtnTextBusiness: { color: "#FBBF24" },
  businessNameRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.dark.surface, borderRadius: 14,
    borderWidth: 1, borderColor: "#FBBF2440",
    paddingHorizontal: 14, paddingVertical: 10,
    marginTop: 10, marginBottom: 10,
  },
  businessNameInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.dark.text },

  brandedBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.dark.safeDim, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: Colors.dark.safe + "40", marginBottom: 20,
  },
  brandedBannerText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.safe },
  privateBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(30,41,59,0.8)", borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: Colors.dark.surfaceLight, marginBottom: 20,
  },
  privateBannerText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted },
  signInPrompt: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.dark.accentDim, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: Colors.dark.accent + "40", marginBottom: 20,
  },
  signInPromptText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.accent },

  hintBanner: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: Colors.dark.primaryDim, borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: Colors.dark.primary + "30", marginBottom: 12,
  },
  hintText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.primary },

  sectionLabel: {
    fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.dark.textMuted,
    textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10,
  },
  presetRow: { flexDirection: "row", gap: 8, paddingRight: 4 },
  presetBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
    backgroundColor: Colors.dark.surface, borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  presetBtnActive: { backgroundColor: Colors.dark.primaryDim, borderColor: Colors.dark.primary },
  presetBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.dark.textMuted },
  presetBtnTextActive: { color: Colors.dark.primary },

  inputCard: {
    backgroundColor: Colors.dark.surface, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
    paddingHorizontal: 16, paddingVertical: 12,
    flexDirection: "row", alignItems: "flex-start", marginBottom: 4,
  },
  textInput: {
    flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.dark.text,
    minHeight: 48, maxHeight: 120,
  },
  extraFieldLabel: {
    fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.dark.textMuted,
    textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4,
  },
  clearBtn: { padding: 4, marginTop: 4 },
  charCount: { fontSize: 11, color: Colors.dark.textMuted, textAlign: "right", marginBottom: 16 },

  logoRow: { flexDirection: "row", gap: 12, marginBottom: 20, alignItems: "flex-start" },
  logoPicker: {
    width: 72, height: 72, borderRadius: 16,
    backgroundColor: Colors.dark.surface, borderWidth: 1.5,
    borderColor: Colors.dark.surfaceBorder, borderStyle: "dashed",
    alignItems: "center", justifyContent: "center", gap: 4, flexShrink: 0,
  },
  logoPreview: { width: 68, height: 68, borderRadius: 14 },
  logoPickerText: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.dark.textMuted },
  logoOptions: { flex: 1, gap: 8 },
  positionBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.dark.primaryDim, paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.dark.primary + "40",
  },
  positionBtnText: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.dark.primary },
  removeLogoBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: Colors.dark.dangerDim, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, alignSelf: "flex-start",
    borderWidth: 1, borderColor: Colors.dark.danger + "30",
  },
  removeLogoText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.dark.danger },
  defaultLogoInfo: { flexDirection: "row", alignItems: "center", gap: 6 },
  defaultLogoText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.safe },
  logoHint: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted },

  generateBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: Colors.dark.primary, paddingVertical: 16, borderRadius: 16, marginBottom: 24,
  },
  generateBtnText: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#000" },

  qrCard: {
    backgroundColor: Colors.dark.surface, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder, overflow: "hidden", marginBottom: 8,
  },
  qrWrapper: { alignItems: "center", paddingVertical: 24, paddingHorizontal: 16 },
  qrBg: {
    backgroundColor: "#F8FAFC", borderRadius: 16, padding: 12, position: "relative",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 10, elevation: 6,
  },
  cornerLogoWrapper: {
    position: "absolute", width: 40, height: 40, borderRadius: 10,
    backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(0,0,0,0.08)",
  },
  cornerLogoImage: { width: 34, height: 34, borderRadius: 8 },
  positionNote: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginHorizontal: 16, marginTop: -8, marginBottom: 8,
    backgroundColor: Colors.dark.primaryDim, padding: 8, borderRadius: 8,
  },
  positionNoteText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.primary },
  brandedFooter: { borderTopWidth: 1, borderTopColor: Colors.dark.surfaceBorder, padding: 16 },
  brandedHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  brandLogo: { width: 24, height: 24, borderRadius: 6 },
  brandName: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.dark.text },
  secureBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: Colors.dark.safeDim, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  secureText: { fontSize: 11, fontFamily: "Inter_700Bold", color: Colors.dark.safe },
  savingText: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted, marginLeft: 4 },
  brandedMeta: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 10 },
  brandedMetaItem: { minWidth: 80 },
  brandedMetaLabel: { fontSize: 10, fontFamily: "Inter_500Medium", color: Colors.dark.textMuted, marginBottom: 2 },
  brandedMetaValue: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.dark.text },
  ownershipNote: {
    flexDirection: "row", alignItems: "flex-start", gap: 6,
    backgroundColor: Colors.dark.primaryDim, padding: 10, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.dark.primary + "30",
  },
  ownershipNoteText: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.dark.primary, lineHeight: 16 },
  privateFooter: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderTopWidth: 1, borderTopColor: Colors.dark.surfaceBorder, padding: 14,
  },
  privateFooterText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted },
  savedBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.dark.safeDim, borderRadius: 10, padding: 10, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.dark.safe + "40",
  },
  savedBannerText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.dark.safe, flex: 1 },
  qrContentPreview: {
    fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted,
    paddingHorizontal: 16, paddingBottom: 8, textAlign: "center",
  },
  sizeRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: Colors.dark.surfaceBorder,
  },
  sizeLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.dark.textSecondary },
  sizeButtons: { flexDirection: "row", alignItems: "center", gap: 12 },
  sizeBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.dark.primaryDim, alignItems: "center", justifyContent: "center",
  },
  sizePx: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.dark.text, minWidth: 52, textAlign: "center" },
  qrActions: {
    flexDirection: "row", gap: 10, padding: 16,
    borderTopWidth: 1, borderTopColor: Colors.dark.surfaceBorder,
  },
  qrActionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 12, borderRadius: 14,
    backgroundColor: Colors.dark.primaryDim, borderWidth: 1, borderColor: Colors.dark.primary + "40",
  },
  qrActionText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.dark.primary },

  emptyQr: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyQrPlaceholder: {
    width: 120, height: 120, borderRadius: 20,
    backgroundColor: Colors.dark.surface, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder, marginBottom: 8,
  },
  emptyQrText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.dark.textSecondary },
  emptyQrSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted },

  toast: {
    position: "absolute", bottom: 100, left: 24, right: 24,
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  toastSuccess: { backgroundColor: Colors.dark.safeDim, borderWidth: 1, borderColor: Colors.dark.safe + "50" },
  toastError: { backgroundColor: Colors.dark.dangerDim, borderWidth: 1, borderColor: Colors.dark.danger + "50" },
  toastText: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  infoSheet: {
    backgroundColor: Colors.dark.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 36, paddingTop: 12,
    borderTopWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  infoSheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.dark.surfaceLight, alignSelf: "center", marginBottom: 16,
  },
  infoSheetTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.dark.text, paddingHorizontal: 20, marginBottom: 4 },
  infoSheetSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted, paddingHorizontal: 20, marginBottom: 16 },
  infoItem: { flexDirection: "row", alignItems: "flex-start", gap: 14, paddingHorizontal: 20, paddingVertical: 12 },
  infoItemIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  infoItemTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.dark.text, marginBottom: 3 },
  infoItemDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary, lineHeight: 18 },
  infoClose: {
    marginHorizontal: 20, marginTop: 16, paddingVertical: 14, borderRadius: 14,
    backgroundColor: Colors.dark.primary, alignItems: "center",
  },
  infoCloseText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#000" },

  positionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, paddingHorizontal: 20, marginBottom: 8 },
  positionGridBtn: { alignItems: "center", gap: 6, width: "18%" },
  positionGridBtnActive: {},
  positionGridPreview: {
    width: 48, height: 48, borderRadius: 10,
    backgroundColor: Colors.dark.surfaceLight, borderWidth: 2, borderColor: Colors.dark.surfaceBorder, position: "relative",
  },
  positionGridPreviewActive: { borderColor: Colors.dark.primary, backgroundColor: Colors.dark.primaryDim },
  positionDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.dark.primary },
  positionGridLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: Colors.dark.textMuted, textAlign: "center" },
  positionGridLabelActive: { color: Colors.dark.primary },
});
