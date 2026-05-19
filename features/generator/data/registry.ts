/**
 * QR Type Registry — single source of truth for all QR code types.
 *
 * HOW TO ADD A NEW QR TYPE (3 steps, one file):
 * ─────────────────────────────────────────────
 * 1. Add a new entry to QR_REGISTRY at the END of the array.
 *    Fill in: key, label, icon, placeholder, keyboardType, contentType,
 *    emptyMessage, build() and optionally: hint, multiline, extraFields,
 *    validate(), getRaw().
 *
 * 2. Add the entry's `key` string to the correct group in QR_CATEGORY_KEYS.
 *
 * 3. Done. No other files need to change.
 */

import type { KeyboardTypeOptions } from "react-native";

export interface ExtraFieldDef {
  key: string;
  label: string;
  placeholder: string;
  keyboardType?: KeyboardTypeOptions;
  optional?: boolean;
  secureText?: boolean;
  maxLength?: number;
}

export interface QrTypeEntry {
  key: string;
  label: string;
  icon: string;
  placeholder: string;
  keyboardType: KeyboardTypeOptions;
  multiline?: boolean;
  hint?: string;
  contentType: string;
  extraFields?: ExtraFieldDef[];
  emptyMessage: string;
  build: (value: string, extra: Record<string, string>) => string;
  getRaw?: (value: string, extra: Record<string, string>) => string;
  validate?: (value: string, extra: Record<string, string>) => string | null;
}

// ─── Registry ──────────────────────────────────────────────────────────────
// ADD NEW TYPES AT THE END — never insert in the middle (indices are stable).
export const QR_REGISTRY: QrTypeEntry[] = [
  // ── index 0
  {
    key: "text",
    label: "Text", icon: "text-outline", placeholder: "Type any text or message...",
    keyboardType: "default", multiline: true, contentType: "text",
    emptyMessage: "Please type some text first.",
    build: (v) => v,
  },
  // ── index 1
  {
    key: "url",
    label: "URL", icon: "link-outline", placeholder: "https://example.com",
    keyboardType: "url", contentType: "url",
    hint: "Enter a full website URL",
    emptyMessage: "Please enter a URL (e.g. example.com).",
    build: (v) => v.startsWith("http") ? v : `https://${v}`,
    validate: (v) => {
      const withScheme = v.startsWith("http") ? v : `https://${v}`;
      try {
        const url = new URL(withScheme);
        if (!url.hostname.includes(".") || url.hostname.length < 4)
          return "Please enter a valid URL (e.g. https://example.com).";
      } catch {
        return "Please enter a valid URL (e.g. https://example.com).";
      }
      return null;
    },
  },
  // ── index 2
  {
    key: "email",
    label: "Email", icon: "mail-outline", placeholder: "email@example.com",
    keyboardType: "email-address", contentType: "email",
    hint: "Enter a valid email address (e.g. name@example.com)",
    emptyMessage: "Please enter an email address (e.g. name@example.com).",
    build: (v) => `mailto:${v}`,
    getRaw: (v) => v,
    validate: (v) => {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v))
        return "Invalid email address. Please enter a valid one (e.g. name@example.com).";
      return null;
    },
  },
  // ── index 3
  {
    key: "phone",
    label: "Phone", icon: "call-outline", placeholder: "+1 555 000 0000",
    keyboardType: "phone-pad", contentType: "phone",
    hint: "Include country code (e.g. +1, +44, +61)",
    emptyMessage: "Please enter a phone number with country code (e.g. +91 9876543210).",
    build: (v) => `tel:${v.replace(/\s/g, "")}`,
    getRaw: (v) => v,
    validate: (v) => {
      if (!/^[+\d][\d\s\-().]{5,19}$/.test(v))
        return "Please enter a valid phone number with country code (e.g. +91 9876543210).";
      return null;
    },
  },
  // ── index 4
  {
    key: "sms",
    label: "SMS", icon: "chatbubble-outline", placeholder: "+1 555 000 0000",
    keyboardType: "phone-pad", contentType: "sms",
    hint: "Include country code — scanning opens a pre-filled SMS",
    emptyMessage: "Please enter the recipient's phone number.",
    extraFields: [
      { key: "message", label: "Message (optional)", placeholder: "Hello!", keyboardType: "default", optional: true, maxLength: 500 },
    ],
    build: (v, extra) => {
      const cleanPhone = v.replace(/\s/g, "");
      const msg = extra.message?.trim() || "";
      return msg ? `SMSTO:${cleanPhone}:${msg}` : `SMSTO:${cleanPhone}`;
    },
    getRaw: (v) => v,
    validate: (v) => {
      if (!/^[+\d][\d\s\-().]{5,19}$/.test(v))
        return "Please enter a valid phone number for the SMS recipient (e.g. +91 9876543210).";
      return null;
    },
  },
  // ── index 5  (Chat Link / WhatsApp)
  {
    key: "whatsapp",
    label: "Chat Link", icon: "chatbubble-ellipses-outline", placeholder: "+1 555 000 0000",
    keyboardType: "phone-pad", contentType: "whatsapp",
    hint: "Include country code — opens a direct chat with this number",
    emptyMessage: "Please enter the recipient's WhatsApp number.",
    extraFields: [
      { key: "message", label: "Pre-filled message (optional)", placeholder: "Hi there!", keyboardType: "default", optional: true, maxLength: 500 },
    ],
    build: (v, extra) => {
      const cleanPhone = v.replace(/[\s\-()]/g, "").replace(/^\+/, "");
      const msg = extra.message?.trim() || "";
      const base = `https://wa.me/${cleanPhone}`;
      return msg ? `${base}?text=${encodeURIComponent(msg)}` : base;
    },
    getRaw: (v) => v,
    validate: (v) => {
      const cleaned = v.replace(/[\s\-()]/g, "");
      if (!/^\+?\d{7,15}$/.test(cleaned))
        return "Please enter a valid WhatsApp number with country code (e.g. +91 9876543210).";
      return null;
    },
  },
  // ── index 6
  {
    key: "wifi",
    label: "WiFi", icon: "wifi-outline", placeholder: "NetworkName",
    keyboardType: "default", contentType: "wifi",
    hint: "Scanning will auto-connect to this WiFi network",
    emptyMessage: "Please enter the WiFi network name (SSID).",
    extraFields: [
      { key: "password", label: "Password", placeholder: "WiFi password", keyboardType: "default", secureText: true, maxLength: 63 },
      { key: "encryption", label: "Security (WPA / WEP / nopass)", placeholder: "WPA", keyboardType: "default", optional: true },
      { key: "hidden", label: "Hidden network? (true / false)", placeholder: "false", keyboardType: "default", optional: true },
    ],
    build: (v, extra) => {
      const password = extra.password?.trim() || "";
      const enc = extra.encryption?.trim().toUpperCase() || "WPA";
      const hidden = extra.hidden?.trim().toLowerCase() === "true" ? "true" : "false";
      return `WIFI:T:${enc};S:${v};P:${password};H:${hidden};;`;
    },
    validate: (v) => {
      if (v.length < 1) return "Please enter the WiFi network name (SSID).";
      return null;
    },
  },
  // ── index 7  (Payment Link / UPI)
  {
    key: "paymentlink",
    label: "Payment Link", icon: "card-outline", placeholder: "https://pay.example.com",
    keyboardType: "url", contentType: "paymentlink",
    hint: "Paste any payment page URL — scanning opens the payment page directly",
    emptyMessage: "Please enter a payment URL.",
    extraFields: [
      { key: "name", label: "Payee / Business Name (optional)", placeholder: "My Store", keyboardType: "default", optional: true },
      { key: "amount", label: "Amount (optional)", placeholder: "10.00", keyboardType: "decimal-pad", optional: true },
    ],
    build: (v, extra) => {
      const name = extra.name?.trim() || "";
      const amount = extra.amount?.trim() || "";
      let url = `upi://pay?pa=${encodeURIComponent(v)}`;
      if (name) url += `&pn=${encodeURIComponent(name)}`;
      if (amount) url += `&am=${amount}&cu=INR`;
      return url;
    },
  },
  // ── index 8
  {
    key: "location",
    label: "Location", icon: "location-outline", placeholder: "12.9716",
    keyboardType: "decimal-pad", contentType: "location",
    hint: "Enter latitude — compatible with all major map apps",
    emptyMessage: "Please enter a latitude value.",
    extraFields: [
      { key: "lon", label: "Longitude", placeholder: "77.5946", keyboardType: "decimal-pad" },
      { key: "label", label: "Location label (optional)", placeholder: "My Office", keyboardType: "default", optional: true },
    ],
    build: (v, extra) => {
      const lon = extra.lon?.trim() || "";
      const label = extra.label?.trim() || "";
      if (!lon) return `geo:${v}`;
      return label ? `geo:${v},${lon}?q=${encodeURIComponent(label)}` : `geo:${v},${lon}`;
    },
    validate: (v, extra) => {
      const lat = parseFloat(v);
      if (isNaN(lat) || lat < -90 || lat > 90)
        return "Latitude must be a number between -90 and 90 (e.g. 12.9716).";
      const lon = parseFloat(extra.lon || "");
      if (!extra.lon?.trim() || isNaN(lon) || lon < -180 || lon > 180)
        return "Please enter a valid longitude between -180 and 180 (e.g. 77.5946).";
      return null;
    },
  },
  // ── index 9
  {
    key: "contact",
    label: "Contact", icon: "person-circle-outline", placeholder: "Full Name",
    keyboardType: "default", contentType: "contact",
    hint: "Creates a vCard — scanners can save directly to their address book",
    emptyMessage: "Please enter the contact's full name.",
    extraFields: [
      { key: "phone", label: "Phone", placeholder: "+1 555 000 0000", keyboardType: "phone-pad" },
      { key: "email", label: "Email (optional)", placeholder: "name@example.com", keyboardType: "email-address", optional: true },
      { key: "org", label: "Organisation (optional)", placeholder: "Company Name", keyboardType: "default", optional: true },
      { key: "url", label: "Website (optional)", placeholder: "https://example.com", keyboardType: "url", optional: true },
    ],
    build: (v, extra) => {
      const phone = extra.phone?.trim() || "";
      const email = extra.email?.trim() || "";
      const org = extra.org?.trim() || "";
      const url = extra.url?.trim() || "";
      let vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${v}\nN:${v};;;;\n`;
      if (phone) vcard += `TEL:${phone}\n`;
      if (email) vcard += `EMAIL:${email}\n`;
      if (org) vcard += `ORG:${org}\n`;
      if (url) vcard += `URL:${url}\n`;
      vcard += `END:VCARD`;
      return vcard;
    },
    validate: (_v, extra) => {
      if (!extra.phone?.trim()) return "Please enter at least a phone number for the contact.";
      return null;
    },
  },
  // ── index 10
  {
    key: "crypto",
    label: "Crypto Wallet", icon: "logo-bitcoin", placeholder: "bc1qxy2kgdygjrsqtzq2n0yrf...",
    keyboardType: "default", contentType: "crypto",
    hint: "Crypto wallet address — supports BTC, ETH, LTC, SOL and more",
    emptyMessage: "Please enter the cryptocurrency wallet address.",
    extraFields: [
      { key: "amount", label: "Amount (optional)", placeholder: "0.001", keyboardType: "decimal-pad", optional: true },
      { key: "coin", label: "Coin (bitcoin / ethereum / litecoin / solana)", placeholder: "bitcoin", keyboardType: "default", optional: true },
    ],
    build: (v, extra) => {
      const coin = extra.coin?.trim().toLowerCase() || "bitcoin";
      const amount = extra.amount?.trim() || "";
      return amount ? `${coin}:${v}?amount=${amount}` : `${coin}:${v}`;
    },
    validate: (v) => {
      if (v.length < 20) return "Please enter a valid cryptocurrency wallet address (at least 20 characters).";
      return null;
    },
  },
  // ── index 11
  {
    key: "instagram",
    label: "Instagram", icon: "logo-instagram", placeholder: "yourusername",
    keyboardType: "default", contentType: "instagram",
    hint: "Enter your Instagram username (without @)",
    emptyMessage: "Please enter your Instagram username.",
    build: (v) => `https://instagram.com/${v.replace(/^@/, "")}`,
    getRaw: (v) => `https://instagram.com/${v.replace(/^@/, "")}`,
    validate: (v) => {
      if (!/^@?[\w.]{1,30}$/.test(v))
        return "Please enter a valid Instagram username (letters, numbers, dots, underscores).";
      return null;
    },
  },
  // ── index 12
  {
    key: "twitter",
    label: "Twitter / X", icon: "logo-twitter", placeholder: "yourusername",
    keyboardType: "default", contentType: "twitter",
    hint: "Enter your Twitter / X username (without @)",
    emptyMessage: "Please enter your Twitter / X username.",
    build: (v) => `https://twitter.com/${v.replace(/^@/, "")}`,
    getRaw: (v) => `https://twitter.com/${v.replace(/^@/, "")}`,
    validate: (v) => {
      if (!/^@?[\w]{1,15}$/.test(v))
        return "Please enter a valid Twitter / X username (letters, numbers, underscores — max 15).";
      return null;
    },
  },
  // ── index 13
  {
    key: "youtube",
    label: "YouTube", icon: "logo-youtube", placeholder: "https://youtube.com/@channel",
    keyboardType: "url", contentType: "youtube",
    hint: "Paste your YouTube channel or video URL",
    emptyMessage: "Please enter your YouTube channel or video URL.",
    build: (v) => v.startsWith("http") ? v : `https://${v}`,
  },
  // ── index 14
  {
    key: "linkedin",
    label: "LinkedIn", icon: "logo-linkedin", placeholder: "https://linkedin.com/in/username",
    keyboardType: "url", contentType: "linkedin",
    hint: "Paste your LinkedIn profile or company page URL",
    emptyMessage: "Please enter your LinkedIn profile URL.",
    build: (v) => v.startsWith("http") ? v : `https://${v}`,
  },
  // ── index 15
  {
    key: "telegram",
    label: "Telegram", icon: "paper-plane-outline", placeholder: "@username",
    keyboardType: "default", contentType: "telegram",
    hint: "Enter @username or full t.me link",
    emptyMessage: "Please enter your Telegram username or phone number.",
    build: (v) => {
      if (v.startsWith("@")) return `https://t.me/${v.slice(1)}`;
      if (v.startsWith("+") || /^\d/.test(v)) return `https://t.me/${encodeURIComponent(v)}`;
      if (v.startsWith("http")) return v;
      return `https://t.me/${v}`;
    },
  },
  // ── index 16
  {
    key: "spotify",
    label: "Spotify", icon: "musical-notes-outline", placeholder: "https://open.spotify.com/track/...",
    keyboardType: "url", contentType: "spotify",
    hint: "Paste a Spotify track, album or playlist link",
    emptyMessage: "Please enter a Spotify link.",
    build: (v) => v.startsWith("http") ? v : `https://${v}`,
  },
  // ── index 17
  {
    key: "facebook",
    label: "Facebook", icon: "logo-facebook", placeholder: "https://facebook.com/pagename",
    keyboardType: "url", contentType: "facebook",
    hint: "Paste your Facebook profile or page URL",
    emptyMessage: "Please enter your Facebook profile or page URL.",
    build: (v) => v.startsWith("http") ? v : `https://facebook.com/${v}`,
  },
  // ── index 18
  {
    key: "paypal",
    label: "PayPal", icon: "wallet-outline", placeholder: "yourusername",
    keyboardType: "default", contentType: "paypal",
    hint: "Enter your PayPal.me username",
    emptyMessage: "Please enter your PayPal.me username.",
    extraFields: [
      { key: "amount", label: "Amount (optional)", placeholder: "10.00", keyboardType: "decimal-pad", optional: true },
    ],
    build: (v, extra) => {
      const username = v.replace(/^@/, "").replace(/^https?:\/\/paypal\.me\//i, "");
      const amount = extra.amount?.trim() || "";
      return amount ? `https://paypal.me/${username}/${amount}` : `https://paypal.me/${username}`;
    },
    getRaw: (v) => `https://paypal.me/${v.replace(/^@/, "")}`,
  },
  // ── index 19
  {
    key: "venmo",
    label: "Venmo", icon: "people-outline", placeholder: "yourusername",
    keyboardType: "default", contentType: "venmo",
    hint: "Enter your Venmo username",
    emptyMessage: "Please enter your Venmo username.",
    extraFields: [
      { key: "amount", label: "Amount (optional)", placeholder: "10.00", keyboardType: "decimal-pad", optional: true },
      { key: "note", label: "Note (optional)", placeholder: "For lunch", keyboardType: "default", optional: true },
    ],
    build: (v, extra) => {
      const username = v.replace(/^@/, "");
      const amount = extra.amount?.trim() || "";
      const note = extra.note?.trim() || "";
      let url = `https://venmo.com/${username}`;
      const params: string[] = [];
      if (amount) params.push(`txn=pay&amount=${amount}`);
      if (note) params.push(`note=${encodeURIComponent(note)}`);
      if (params.length) url += `?${params.join("&")}`;
      return url;
    },
    getRaw: (v) => `https://venmo.com/${v.replace(/^@/, "")}`,
  },
  // ── index 20  (Mobile Pay / GrabPay)
  {
    key: "mobilepay",
    label: "Mobile Pay", icon: "phone-portrait-outline", placeholder: "+65 9123 4567",
    keyboardType: "phone-pad", contentType: "mobilepay",
    hint: "Enter a phone number — opens your region's default mobile payment app",
    emptyMessage: "Please enter the phone number with country code (e.g. +65 91234567).",
    build: (v) => {
      const cleanPhone = v.replace(/[\s\-()]/g, "");
      return `https://grab.onelink.me/2695613898?af_dp=grab%3A%2F%2Fopen%3FscreenType%3DTRANSFER%26phone%3D${encodeURIComponent(cleanPhone)}`;
    },
  },
  // ── index 21
  {
    key: "zoom",
    label: "Zoom", icon: "videocam-outline", placeholder: "123 456 7890",
    keyboardType: "phone-pad", contentType: "zoom",
    hint: "Enter your Zoom meeting ID (numbers only)",
    emptyMessage: "Please enter the Zoom meeting ID.",
    extraFields: [
      { key: "password", label: "Passcode (optional)", placeholder: "123456", keyboardType: "number-pad", optional: true },
    ],
    build: (v, extra) => {
      const meetingId = v.replace(/\s/g, "");
      const password = extra.password?.trim() || "";
      return password
        ? `https://zoom.us/j/${meetingId}?pwd=${encodeURIComponent(password)}`
        : `https://zoom.us/j/${meetingId}`;
    },
  },
  // ── index 22
  {
    key: "calendar",
    label: "Calendar", icon: "calendar-outline", placeholder: "Event Title",
    keyboardType: "default", contentType: "calendar",
    hint: "Creates a calendar event — scanners can add it directly to their calendar",
    emptyMessage: "Please enter the event title.",
    extraFields: [
      { key: "start", label: "Start (YYYYMMDDTHHMMSS)", placeholder: "20260401T090000", keyboardType: "default" },
      { key: "end", label: "End (YYYYMMDDTHHMMSS)", placeholder: "20260401T100000", keyboardType: "default" },
      { key: "location", label: "Location (optional)", placeholder: "Conference Room", keyboardType: "default", optional: true },
      { key: "description", label: "Description (optional)", placeholder: "Meeting details...", keyboardType: "default", optional: true },
    ],
    build: (v, extra) => {
      const start = extra.start?.trim() || "";
      const end = extra.end?.trim() || "";
      const location = extra.location?.trim() || "";
      const description = extra.description?.trim() || "";
      let cal = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:${v}\n`;
      if (start) cal += `DTSTART:${start}\n`;
      if (end) cal += `DTEND:${end}\n`;
      if (location) cal += `LOCATION:${location}\n`;
      if (description) cal += `DESCRIPTION:${description}\n`;
      cal += `END:VEVENT\nEND:VCALENDAR`;
      return cal;
    },
  },
  // ── index 23
  {
    key: "appdownload",
    label: "App Download", icon: "download-outline", placeholder: "https://...",
    keyboardType: "url", contentType: "appdownload",
    hint: "Paste your app store link — scanning takes users directly to download",
    emptyMessage: "Please enter the app download URL.",
    build: (v) => v.startsWith("http") ? v : `https://${v}`,
  },
  // ── index 24  (Scan-to-Pay / BharatQR)
  {
    key: "scantopay",
    label: "Scan-to-Pay", icon: "qr-code-outline", placeholder: "account@provider",
    keyboardType: "email-address", contentType: "scantopay",
    hint: "Enter a payment handle or account ID — creates a standard payment QR",
    emptyMessage: "Please enter the BharatQR UPI VPA (e.g. merchant@upi).",
    extraFields: [
      { key: "name", label: "Payee Name", placeholder: "Business or Person Name", keyboardType: "default" },
      { key: "amount", label: "Amount (optional)", placeholder: "0.00", keyboardType: "decimal-pad", optional: true },
    ],
    build: (v, extra) => {
      const name = extra.name?.trim() || "";
      const amount = extra.amount?.trim() || "";
      const ifsc = extra.ifsc?.trim() || "";
      const account = extra.account?.trim() || "";
      const mobile = extra.mobile?.trim() || "";
      let url = `upi://pay?pa=${encodeURIComponent(v)}`;
      if (name) url += `&pn=${encodeURIComponent(name)}`;
      if (amount) url += `&am=${amount}&cu=INR`;
      if (ifsc) url += `&bn=${encodeURIComponent(ifsc)}`;
      if (account) url += `&ac=${encodeURIComponent(account)}`;
      if (mobile) url += `&mc=${encodeURIComponent(mobile.replace(/[\s\-()]/g, ""))}`;
      url += `&mode=02&purpose=00`;
      return url;
    },
  },
  // ── index 25  (Review Page / Google Review)
  {
    key: "reviewpage",
    label: "Review Page", icon: "star-outline", placeholder: "https://your-review-page.com",
    keyboardType: "url", contentType: "reviewpage",
    hint: "Paste your review page URL — scanning takes customers directly to leave a review",
    emptyMessage: "Please paste your Google Review link.",
    extraFields: [
      { key: "businessName", label: "Business Name (optional)", placeholder: "e.g. My Bakery", keyboardType: "default", optional: true },
    ],
    build: (v) => v.startsWith("http") ? v : `https://${v}`,
  },
  // ── index 26  (Menu / Restaurant)
  {
    key: "menucatalogue",
    label: "Menu / Catalogue", icon: "list-outline", placeholder: "https://yourmenu.com",
    keyboardType: "url", contentType: "menucatalogue",
    hint: "Link to your digital menu, product catalogue or PDF — works with any URL",
    emptyMessage: "Please enter your menu URL.",
    extraFields: [
      { key: "table", label: "Table / Section (optional)", placeholder: "Table 7 or Outdoor", keyboardType: "default", optional: true },
    ],
    build: (v, extra) => {
      const base = v.startsWith("http") ? v : `https://${v}`;
      const table = extra.table?.trim() || "";
      return table ? `${base}?table=${encodeURIComponent(table)}` : base;
    },
  },
  // ── index 27
  {
    key: "donation",
    label: "Donation / Tip", icon: "heart-outline", placeholder: "https://...",
    keyboardType: "url", contentType: "donation",
    hint: "Paste any donation or tip page URL — no payment provider restrictions",
    emptyMessage: "Please enter the donation/payment link.",
    extraFields: [
      { key: "cause", label: "Cause / Message (optional)", placeholder: "e.g. Support our cause", keyboardType: "default", optional: true },
    ],
    build: (v) => v.startsWith("http") ? v : `https://${v}`,
  },
  // ── index 28
  {
    key: "razorpay",
    label: "Razorpay", icon: "card-outline", placeholder: "https://rzp.io/l/yourlink",
    keyboardType: "url", contentType: "razorpay",
    hint: "Get your Razorpay Payment Link from Dashboard → Payment Links",
    emptyMessage: "Please paste your Razorpay payment link.",
    extraFields: [
      { key: "note", label: "Description (optional)", placeholder: "e.g. Invoice #1234", keyboardType: "default", optional: true },
    ],
    build: (v, extra) => {
      const base = v.startsWith("http") ? v : `https://${v}`;
      const note = extra.note?.trim() || "";
      return note ? `${base}?description=${encodeURIComponent(note)}` : base;
    },
  },
  // ── index 29
  {
    key: "google_maps",
    label: "Google Maps", icon: "map-outline", placeholder: "India Gate, New Delhi",
    keyboardType: "default", contentType: "location",
    hint: "Landmark, business name, or full address — opens directly in Google Maps",
    emptyMessage: "Please enter a place name or address.",
    extraFields: [
      { key: "lat", label: "Latitude (optional)", placeholder: "28.6129", keyboardType: "decimal-pad", optional: true },
      { key: "lng", label: "Longitude (optional)", placeholder: "77.2295", keyboardType: "decimal-pad", optional: true },
    ],
    build: (v, extra) => {
      const lat = extra.lat?.trim() || "";
      const lng = extra.lng?.trim() || "";
      if (lat && lng) return `https://maps.google.com/?q=${lat},${lng}`;
      return `https://maps.google.com/?q=${encodeURIComponent(v)}`;
    },
  },
  // ── index 30
  {
    key: "discord",
    label: "Discord", icon: "logo-discord", placeholder: "https://discord.gg/yourserver",
    keyboardType: "url", contentType: "discord",
    hint: "Right-click your server → Invite People to get the link",
    emptyMessage: "Please enter your Discord server invite or profile URL.",
    build: (v) => v.startsWith("http") ? v : `https://discord.gg/${v}`,
  },
  // ── index 31
  {
    key: "tiktok",
    label: "TikTok", icon: "musical-note-outline", placeholder: "@yourusername",
    keyboardType: "default", contentType: "tiktok",
    hint: "Your TikTok handle (with or without @)",
    emptyMessage: "Please enter your TikTok username.",
    build: (v) => `https://www.tiktok.com/@${v.replace(/^@/, "")}`,
  },
  // ── index 32
  {
    key: "snapchat",
    label: "Snapchat", icon: "camera-outline", placeholder: "yourusername",
    keyboardType: "default", contentType: "snapchat",
    hint: "Enter your Snapchat username (without @)",
    emptyMessage: "Please enter your Snapchat username.",
    build: (v) => `https://www.snapchat.com/add/${v.replace(/^@/, "")}`,
  },
  // ── index 33
  {
    key: "googlepay",
    label: "Google Pay", icon: "card-outline", placeholder: "name@upi",
    keyboardType: "email-address", contentType: "upi",
    hint: "Enter your UPI ID — optimised for Google Pay (GPay)",
    emptyMessage: "Please enter your UPI VPA.",
    extraFields: [
      { key: "name", label: "Payee Name (optional)", placeholder: "Your Name", keyboardType: "default", optional: true },
      { key: "amount", label: "Amount ₹ (optional)", placeholder: "0.00", keyboardType: "decimal-pad", optional: true },
    ],
    build: (v, extra) => {
      const name = extra.name?.trim() || "";
      const amount = extra.amount?.trim() || "";
      let url = `upi://pay?pa=${encodeURIComponent(v)}`;
      if (name) url += `&pn=${encodeURIComponent(name)}`;
      if (amount) url += `&am=${amount}&cu=INR`;
      return url;
    },
  },
  // ── index 34
  {
    key: "biolink",
    label: "Bio Link", icon: "link-outline", placeholder: "https://linktr.ee/yourname",
    keyboardType: "url", contentType: "url",
    hint: "Paste any bio link page — Linktree, Bento, Carrd, etc.",
    emptyMessage: "Please enter your bio link URL.",
    build: (v) => v.startsWith("http") ? v : `https://${v}`,
  },
  // ── index 35
  {
    key: "mecard",
    label: "MeCard", icon: "person-outline", placeholder: "Full Name",
    keyboardType: "default", contentType: "contact",
    hint: "Lightweight contact card format — works with most QR scanners",
    emptyMessage: "Please enter your name.",
    extraFields: [
      { key: "phone", label: "Phone (optional)", placeholder: "+1 555 000 0000", keyboardType: "phone-pad", optional: true },
      { key: "email", label: "Email (optional)", placeholder: "name@example.com", keyboardType: "email-address", optional: true },
      { key: "note", label: "Note (optional)", placeholder: "e.g. Software Engineer", keyboardType: "default", optional: true },
    ],
    build: (v, extra) => {
      const phone = extra.phone?.trim() || "";
      const email = extra.email?.trim() || "";
      const note = extra.note?.trim() || "";
      let card = `MECARD:N:${v};`;
      if (phone) card += `TEL:${phone.replace(/[\s\-()]/g, "")};`;
      if (email) card += `EMAIL:${email};`;
      if (note) card += `NOTE:${note};`;
      card += `;`;
      return card;
    },
  },

  // ────────────────────────────────────────────────────────────────────────────
  // ADD NEW TYPES BELOW THIS LINE — never change indices above
  // Template:
  //   {
  //     key: "mytype",
  //     label: "My Type", icon: "icon-name-outline", placeholder: "Enter value...",
  //     keyboardType: "default", contentType: "mytype",
  //     hint: "Short helper text shown under the input",
  //     emptyMessage: "Please enter a value.",
  //     extraFields: [ /* optional extra inputs */ ],
  //     build: (v, extra) => { /* return the final QR content string */ return v; },
  //     validate: (v, extra) => { /* return error string or null */ return null; },
  //   },
  // Then add the key to QR_CATEGORY_KEYS below.
  // ────────────────────────────────────────────────────────────────────────────
];

// ─── Categories ────────────────────────────────────────────────────────────
// Add a new type's key here to make it appear in the template picker UI.
export const QR_CATEGORY_KEYS: { label: string; icon: string; keys: string[] }[] = [
  {
    label: "Basic",
    icon: "document-text-outline",
    keys: ["text", "url"],
  },
  {
    label: "Contact & Messaging",
    icon: "chatbubbles-outline",
    keys: ["contact", "phone", "email", "sms", "whatsapp", "telegram", "mecard"],
  },
  {
    label: "Social Media",
    icon: "heart-outline",
    keys: ["instagram", "twitter", "youtube", "linkedin", "facebook", "spotify", "discord", "tiktok", "snapchat", "biolink"],
  },
  {
    label: "Payments",
    icon: "card-outline",
    keys: ["paymentlink", "paypal", "venmo", "mobilepay", "crypto", "scantopay", "razorpay", "googlepay"],
  },
  {
    label: "Utility",
    icon: "construct-outline",
    keys: ["wifi", "location", "google_maps", "zoom", "calendar", "appdownload"],
  },
  {
    label: "Business & Growth",
    icon: "trending-up-outline",
    keys: ["reviewpage", "menucatalogue", "donation"],
  },
];

// ─── Lookup helpers ─────────────────────────────────────────────────────────
export function getRegistryEntryByKey(key: string): QrTypeEntry | undefined {
  return QR_REGISTRY.find((e) => e.key === key);
}

export function getRegistryEntryByIndex(idx: number): QrTypeEntry | undefined {
  return QR_REGISTRY[idx];
}
