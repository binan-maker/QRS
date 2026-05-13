import type { KeyboardTypeOptions } from "react-native";

export interface ExtraFieldDef {
  key: string;
  label: string;
  placeholder: string;
  keyboardType?: KeyboardTypeOptions;
  optional?: boolean;
  secureText?: boolean;
}

export interface PresetDef {
  label: string;
  icon: string;
  placeholder: string;
  keyboardType: KeyboardTypeOptions;
  multiline?: boolean;
  hint?: string;
  extraFields?: ExtraFieldDef[];
  contentType: string;
}

export const PRESET_CATEGORIES: { label: string; icon: string; presets: number[] }[] = [
  { label: "Basic",                  icon: "document-text-outline",  presets: [0, 1] },
  { label: "Contact & Messaging",    icon: "chatbubbles-outline",     presets: [2, 3, 4, 5, 9, 15] },
  { label: "Social Media",           icon: "heart-outline",           presets: [11, 12, 13, 14, 16, 17] },
  { label: "Payments",               icon: "card-outline",            presets: [7, 18, 19, 20, 10, 24] },
  { label: "Utility",                icon: "construct-outline",       presets: [6, 8, 21, 22, 23] },
  { label: "Business & Growth",      icon: "trending-up-outline",     presets: [25, 26, 27] },
];

export const QR_PRESETS: PresetDef[] = [
  // 0
  {
    label: "Text", icon: "text-outline", placeholder: "Type any text or message...",
    keyboardType: "default", multiline: true, contentType: "text",
  },
  // 1
  {
    label: "URL", icon: "link-outline", placeholder: "https://example.com",
    keyboardType: "url", contentType: "url",
    hint: "Enter a full website URL",
  },
  // 2
  {
    label: "Email", icon: "mail-outline", placeholder: "email@example.com",
    keyboardType: "email-address", contentType: "email",
    hint: "Enter a valid email address (e.g. name@example.com)",
  },
  // 3
  {
    label: "Phone", icon: "call-outline", placeholder: "+1 555 000 0000",
    keyboardType: "phone-pad", contentType: "phone",
    hint: "Include country code (e.g. +1, +44, +61)",
  },
  // 4
  {
    label: "SMS", icon: "chatbubble-outline", placeholder: "+1 555 000 0000",
    keyboardType: "phone-pad", contentType: "sms",
    hint: "Include country code — scanning opens a pre-filled SMS",
    extraFields: [
      { key: "message", label: "Message (optional)", placeholder: "Hello!", keyboardType: "default", optional: true },
    ],
  },
  // 5  — formerly WhatsApp, now generic Chat Link
  {
    label: "Chat Link", icon: "chatbubble-ellipses-outline", placeholder: "+1 555 000 0000",
    keyboardType: "phone-pad", contentType: "whatsapp",
    hint: "Include country code — opens a direct chat with this number",
    extraFields: [
      { key: "message", label: "Pre-filled message (optional)", placeholder: "Hi there!", keyboardType: "default", optional: true },
    ],
  },
  // 6
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
  // 7  — formerly UPI, now generic Payment Link
  {
    label: "Payment Link", icon: "card-outline", placeholder: "https://pay.example.com",
    keyboardType: "url", contentType: "paymentlink",
    hint: "Paste any payment page URL — scanning opens the payment page directly",
    extraFields: [
      { key: "name", label: "Payee / Business Name (optional)", placeholder: "My Store", keyboardType: "default", optional: true },
      { key: "amount", label: "Amount (optional)", placeholder: "10.00", keyboardType: "decimal-pad", optional: true },
    ],
  },
  // 8
  {
    label: "Location", icon: "location-outline", placeholder: "12.9716",
    keyboardType: "decimal-pad", contentType: "location",
    hint: "Enter latitude — compatible with all major map apps",
    extraFields: [
      { key: "lon", label: "Longitude", placeholder: "77.5946", keyboardType: "decimal-pad" },
      { key: "label", label: "Location label (optional)", placeholder: "My Office", keyboardType: "default", optional: true },
    ],
  },
  // 9
  {
    label: "Contact", icon: "person-circle-outline", placeholder: "Full Name",
    keyboardType: "default", contentType: "contact",
    hint: "Creates a vCard — scanners can save directly to their address book",
    extraFields: [
      { key: "phone", label: "Phone", placeholder: "+1 555 000 0000", keyboardType: "phone-pad" },
      { key: "email", label: "Email (optional)", placeholder: "name@example.com", keyboardType: "email-address", optional: true },
      { key: "org", label: "Organisation (optional)", placeholder: "Company Name", keyboardType: "default", optional: true },
      { key: "url", label: "Website (optional)", placeholder: "https://example.com", keyboardType: "url", optional: true },
    ],
  },
  // 10
  {
    label: "Crypto Wallet", icon: "logo-bitcoin", placeholder: "bc1qxy2kgdygjrsqtzq2n0yrf...",
    keyboardType: "default", contentType: "crypto",
    hint: "Crypto wallet address — supports BTC, ETH, LTC, SOL and more",
    extraFields: [
      { key: "amount", label: "Amount (optional)", placeholder: "0.001", keyboardType: "decimal-pad", optional: true },
      { key: "coin", label: "Coin (bitcoin / ethereum / litecoin / solana)", placeholder: "bitcoin", keyboardType: "default", optional: true },
    ],
  },
  // 11
  {
    label: "Instagram", icon: "logo-instagram", placeholder: "yourusername",
    keyboardType: "default", contentType: "instagram",
    hint: "Enter your Instagram username (without @)",
  },
  // 12
  {
    label: "Twitter / X", icon: "logo-twitter", placeholder: "yourusername",
    keyboardType: "default", contentType: "twitter",
    hint: "Enter your Twitter / X username (without @)",
  },
  // 13
  {
    label: "YouTube", icon: "logo-youtube", placeholder: "https://youtube.com/@channel",
    keyboardType: "url", contentType: "youtube",
    hint: "Paste your YouTube channel or video URL",
  },
  // 14
  {
    label: "LinkedIn", icon: "logo-linkedin", placeholder: "https://linkedin.com/in/username",
    keyboardType: "url", contentType: "linkedin",
    hint: "Paste your LinkedIn profile or company page URL",
  },
  // 15
  {
    label: "Telegram", icon: "paper-plane-outline", placeholder: "@username",
    keyboardType: "default", contentType: "telegram",
    hint: "Enter @username or full t.me link",
  },
  // 16
  {
    label: "Spotify", icon: "musical-notes-outline", placeholder: "https://open.spotify.com/track/...",
    keyboardType: "url", contentType: "spotify",
    hint: "Paste a Spotify track, album or playlist link",
  },
  // 17
  {
    label: "Facebook", icon: "logo-facebook", placeholder: "https://facebook.com/pagename",
    keyboardType: "url", contentType: "facebook",
    hint: "Paste your Facebook profile or page URL",
  },
  // 18
  {
    label: "PayPal", icon: "wallet-outline", placeholder: "yourusername",
    keyboardType: "default", contentType: "paypal",
    hint: "Enter your PayPal.me username",
    extraFields: [
      { key: "amount", label: "Amount (optional)", placeholder: "10.00", keyboardType: "decimal-pad", optional: true },
    ],
  },
  // 19
  {
    label: "Venmo", icon: "people-outline", placeholder: "yourusername",
    keyboardType: "default", contentType: "venmo",
    hint: "Enter your Venmo username",
    extraFields: [
      { key: "amount", label: "Amount (optional)", placeholder: "10.00", keyboardType: "decimal-pad", optional: true },
      { key: "note", label: "Note (optional)", placeholder: "For lunch", keyboardType: "default", optional: true },
    ],
  },
  // 20  — formerly GrabPay, now generic Mobile Pay
  {
    label: "Mobile Pay", icon: "phone-portrait-outline", placeholder: "+65 9123 4567",
    keyboardType: "phone-pad", contentType: "mobilepay",
    hint: "Enter a phone number — opens your region's default mobile payment app",
  },
  // 21
  {
    label: "Zoom", icon: "videocam-outline", placeholder: "123 456 7890",
    keyboardType: "phone-pad", contentType: "zoom",
    hint: "Enter your Zoom meeting ID (numbers only)",
    extraFields: [
      { key: "password", label: "Passcode (optional)", placeholder: "123456", keyboardType: "number-pad", optional: true },
    ],
  },
  // 22
  {
    label: "Calendar", icon: "calendar-outline", placeholder: "Event Title",
    keyboardType: "default", contentType: "calendar",
    hint: "Creates a calendar event — scanners can add it directly to their calendar",
    extraFields: [
      { key: "start", label: "Start (YYYYMMDDTHHMMSS)", placeholder: "20260401T090000", keyboardType: "default" },
      { key: "end", label: "End (YYYYMMDDTHHMMSS)", placeholder: "20260401T100000", keyboardType: "default" },
      { key: "location", label: "Location (optional)", placeholder: "Conference Room", keyboardType: "default", optional: true },
      { key: "description", label: "Description (optional)", placeholder: "Meeting details...", keyboardType: "default", optional: true },
    ],
  },
  // 23
  {
    label: "App Download", icon: "download-outline", placeholder: "https://...",
    keyboardType: "url", contentType: "appdownload",
    hint: "Paste your app store link — scanning takes users directly to download",
  },
  // 24  — formerly BharatQR, now generic Scan-to-Pay (account-based)
  {
    label: "Scan-to-Pay", icon: "qr-code-outline", placeholder: "account@provider",
    keyboardType: "email-address", contentType: "scantopay",
    hint: "Enter a payment handle or account ID — creates a standard payment QR",
    extraFields: [
      { key: "name", label: "Payee Name", placeholder: "Business or Person Name", keyboardType: "default" },
      { key: "amount", label: "Amount (optional)", placeholder: "0.00", keyboardType: "decimal-pad", optional: true },
    ],
  },
  // 25  — formerly Google Review, now generic Review Page
  {
    label: "Review Page", icon: "star-outline", placeholder: "https://your-review-page.com",
    keyboardType: "url", contentType: "reviewpage",
    hint: "Paste your review page URL — scanning takes customers directly to leave a review",
    extraFields: [
      { key: "businessName", label: "Business Name (optional)", placeholder: "e.g. My Bakery", keyboardType: "default", optional: true },
    ],
  },
  // 26  — formerly Restaurant Menu, now generic Menu Page
  {
    label: "Menu / Catalogue", icon: "list-outline", placeholder: "https://yourmenu.com",
    keyboardType: "url", contentType: "menucatalogue",
    hint: "Link to your digital menu, product catalogue or PDF — works with any URL",
    extraFields: [
      { key: "table", label: "Table / Section (optional)", placeholder: "Table 7 or Outdoor", keyboardType: "default", optional: true },
    ],
  },
  // 27
  {
    label: "Donation / Tip", icon: "heart-outline", placeholder: "https://...",
    keyboardType: "url", contentType: "donation",
    hint: "Paste any donation or tip page URL — no payment provider restrictions",
    extraFields: [
      { key: "cause", label: "Cause / Message (optional)", placeholder: "e.g. Support our cause", keyboardType: "default", optional: true },
    ],
  },
];
