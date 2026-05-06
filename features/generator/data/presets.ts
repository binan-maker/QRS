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
  {
    label: "BharatQR 🇮🇳", icon: "card-outline", placeholder: "merchant@upi",
    keyboardType: "email-address", contentType: "bharatqr",
    hint: "India BharatQR — accepted at all banks, ATMs & PoS. Works with GPay, PhonePe, BHIM, Paytm, NEFT & IMPS.",
    extraFields: [
      { key: "name", label: "Payee Name", placeholder: "Shop Name or Full Name", keyboardType: "default" },
      { key: "amount", label: "Amount ₹ (optional)", placeholder: "0.00", keyboardType: "decimal-pad", optional: true },
      { key: "ifsc", label: "IFSC Code (optional)", placeholder: "SBIN0001234", keyboardType: "default", optional: true },
      { key: "account", label: "Account No. (optional)", placeholder: "1234567890", keyboardType: "number-pad", optional: true },
      { key: "mobile", label: "Mobile (optional)", placeholder: "+91 9876543210", keyboardType: "phone-pad", optional: true },
    ],
  },
  {
    label: "Google Review", icon: "star-outline", placeholder: "https://g.page/r/...",
    keyboardType: "url", contentType: "googlereview",
    hint: "Paste your Google Maps review link — customers scan and leave a review instantly. Best for restaurants, hotels, clinics.",
    extraFields: [
      { key: "businessName", label: "Business Name (optional)", placeholder: "e.g. Raj Bakery", keyboardType: "default", optional: true },
    ],
  },
  {
    label: "Restaurant Menu", icon: "restaurant-outline", placeholder: "https://yourmenu.com",
    keyboardType: "url", contentType: "restaurantmenu",
    hint: "Link to your digital menu — works with Zomato, Swiggy, PDF menus, or any website.",
    extraFields: [
      { key: "table", label: "Table / Section (optional)", placeholder: "Table 7 or Outdoor", keyboardType: "default", optional: true },
    ],
  },
  {
    label: "Donation / Tip", icon: "heart-outline", placeholder: "https://...",
    keyboardType: "url", contentType: "donation",
    hint: "Create a QR for donations — paste a link to Razorpay, GPay, PayPal, UPI or any payment page.",
    extraFields: [
      { key: "cause", label: "Cause / Message (optional)", placeholder: "e.g. Support our NGO", keyboardType: "default", optional: true },
    ],
  },
];
