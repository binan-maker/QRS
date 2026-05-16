import type { QrTemplate, EncType } from "@/features/generator/types/template-types";
import {
  validateVpa, validateUrl, validatePhone,
  validateEmail, validateAmount,
} from "@/lib/utils/validators";

export const TEMPLATES: QrTemplate[] = [
  // ── PAYMENT ──
  {
    id: "upi_payment", name: "UPI Payment", emoji: "💳", color: "#3B82F6",
    icon: "card-outline", tagline: "Send money to anyone", category: "Payment",
    securityNote: "VPA format auto-validated. Warns if recipient pattern looks unusual.",
    securityIcon: "shield-checkmark-outline",
    fields: [
      { key: "vpa", label: "UPI ID (VPA)", placeholder: "name@upi", type: "text", hint: "e.g. john@paytm, 9876543210@upi", validate: validateVpa },
      { key: "name", label: "Payee Name", placeholder: "Recipient's name", type: "text", maxLength: 50 },
      { key: "amount", label: "Amount (₹)", placeholder: "Leave blank for any amount", type: "number", optional: true, validate: validateAmount },
      { key: "note", label: "Note", placeholder: "e.g. Bill payment, Table 5", type: "text", optional: true, maxLength: 80 },
    ],
    generate: (v) => {
      const parts: string[] = [`upi://pay?pa=${encodeURIComponent(v.vpa.trim())}&pn=${encodeURIComponent(v.name.trim())}&cu=INR`];
      if (v.amount?.trim()) parts.push(`&am=${v.amount.trim()}`);
      if (v.note?.trim()) parts.push(`&tn=${encodeURIComponent(v.note.trim())}`);
      return parts.join("");
    },
  },
  {
    id: "upi_merchant", name: "UPI Merchant", emoji: "🏪", color: "#10B981",
    icon: "storefront-outline", tagline: "Collect payments at your shop", category: "Payment",
    securityNote: "Add a fixed amount to prevent overcharging.",
    securityIcon: "ribbon-outline",
    fields: [
      { key: "vpa", label: "Your UPI ID (VPA)", placeholder: "yourshop@upi", type: "text", hint: "e.g. shopname@icici", validate: validateVpa },
      { key: "business_name", label: "Business Name", placeholder: "Your shop or brand name", type: "text", maxLength: 60 },
      { key: "amount", label: "Fixed Amount (₹)", placeholder: "Leave blank for custom amount", type: "number", optional: true, validate: validateAmount },
    ],
    generate: (v) => {
      const parts: string[] = [`upi://pay?pa=${encodeURIComponent(v.vpa.trim())}&pn=${encodeURIComponent(v.business_name.trim())}&cu=INR`];
      if (v.amount?.trim()) parts.push(`&am=${v.amount.trim()}`);
      return parts.join("");
    },
  },
  {
    id: "google_pay", name: "Google Pay", emoji: "💵", color: "#4285F4",
    icon: "card-outline", tagline: "GPay deep link for instant pay", category: "Payment",
    securityNote: "Generates a standard UPI URL compatible with Google Pay.",
    securityIcon: "shield-checkmark-outline",
    fields: [
      { key: "vpa", label: "UPI ID", placeholder: "you@okicici", type: "text", validate: validateVpa },
      { key: "name", label: "Payee Name", placeholder: "Your name", type: "text", maxLength: 50 },
      { key: "amount", label: "Amount (₹)", placeholder: "Optional fixed amount", type: "number", optional: true, validate: validateAmount },
    ],
    generate: (v) => {
      const parts: string[] = [`upi://pay?pa=${encodeURIComponent(v.vpa.trim())}&pn=${encodeURIComponent(v.name.trim())}&cu=INR`];
      if (v.amount?.trim()) parts.push(`&am=${v.amount.trim()}`);
      return parts.join("");
    },
  },

  // ── SOCIAL MEDIA ──
  {
    id: "whatsapp", name: "WhatsApp", emoji: "💬", color: "#25D366",
    icon: "chatbubble-ellipses-outline", tagline: "Open a chat with pre-filled message", category: "Social",
    securityNote: "Opens WhatsApp directly. Message is pre-filled but not sent until user taps.",
    securityIcon: "shield-outline",
    fields: [
      { key: "phone", label: "Phone Number", placeholder: "+91 9876543210", type: "phone", hint: "Include country code, no spaces", validate: validatePhone },
      { key: "message", label: "Pre-filled Message", placeholder: "Hi! I'd like to know more…", type: "multiline", optional: true, maxLength: 200 },
    ],
    generate: (v) => {
      const digits = v.phone.trim().replace(/[\s\-\+()]/g, "");
      const base = `https://wa.me/${digits}`;
      return v.message?.trim() ? `${base}?text=${encodeURIComponent(v.message.trim())}` : base;
    },
  },
  {
    id: "whatsapp_business", name: "WhatsApp Business", emoji: "🏢", color: "#128C7E",
    icon: "business-outline", tagline: "Business chat link with greeting", category: "Social",
    securityNote: "Standard wa.me link compatible with WhatsApp Business app.",
    securityIcon: "shield-outline",
    fields: [
      { key: "phone", label: "Business Phone", placeholder: "+91 9876543210", type: "phone", validate: validatePhone },
      { key: "greeting", label: "Greeting Message", placeholder: "Hello! How can I help you today?", type: "multiline", optional: true, maxLength: 200 },
    ],
    generate: (v) => {
      const digits = v.phone.trim().replace(/[\s\-\+()]/g, "");
      const base = `https://wa.me/${digits}`;
      return v.greeting?.trim() ? `${base}?text=${encodeURIComponent(v.greeting.trim())}` : base;
    },
  },
  {
    id: "instagram", name: "Instagram", emoji: "📸", color: "#E1306C",
    icon: "logo-instagram", tagline: "Link to your Instagram profile", category: "Social",
    securityNote: "Direct link to Instagram profile page.",
    securityIcon: "person-outline",
    fields: [
      { key: "username", label: "Instagram Username", placeholder: "yourhandle", type: "text", hint: "Without the @ symbol", maxLength: 30 },
    ],
    generate: (v) => `https://instagram.com/${v.username.trim().replace(/^@/, "")}`,
  },
  {
    id: "facebook", name: "Facebook", emoji: "👍", color: "#1877F2",
    icon: "logo-facebook", tagline: "Link to your Facebook page or profile", category: "Social",
    securityNote: "Direct link to Facebook page.",
    securityIcon: "person-outline",
    fields: [
      { key: "page", label: "Page Name or ID", placeholder: "YourPageName", type: "text", hint: "e.g. MyShopIndia or 12345678", maxLength: 60 },
    ],
    generate: (v) => `https://facebook.com/${v.page.trim()}`,
  },
  {
    id: "youtube_channel", name: "YouTube Channel", emoji: "▶️", color: "#FF0000",
    icon: "logo-youtube", tagline: "Drive subscribers to your channel", category: "Social",
    securityNote: "Direct link to YouTube channel.",
    securityIcon: "videocam-outline",
    fields: [
      { key: "handle", label: "Channel Handle", placeholder: "YourChannelName", type: "text", hint: "e.g. @MrBeast or just the name", maxLength: 60 },
    ],
    generate: (v) => {
      const h = v.handle.trim().replace(/^@/, "");
      return `https://youtube.com/@${h}`;
    },
  },
  {
    id: "youtube_video", name: "YouTube Video", emoji: "🎬", color: "#CC0000",
    icon: "play-circle-outline", tagline: "Share a specific YouTube video", category: "Social",
    securityNote: "Links directly to the video. Confirm the video ID is correct.",
    securityIcon: "videocam-outline",
    fields: [
      { key: "video_id", label: "Video ID or Full URL", placeholder: "dQw4w9WgXcQ", type: "text", hint: "Paste the full URL or just the video ID", maxLength: 100 },
    ],
    generate: (v) => {
      const raw = v.video_id.trim();
      const match = raw.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_\-]{11})/);
      return match ? `https://youtu.be/${match[1]}` : (raw.startsWith("http") ? raw : `https://youtu.be/${raw}`);
    },
  },
  {
    id: "linkedin", name: "LinkedIn", emoji: "💼", color: "#0A66C2",
    icon: "logo-linkedin", tagline: "Connect on LinkedIn", category: "Social",
    securityNote: "Direct link to your LinkedIn profile.",
    securityIcon: "person-outline",
    fields: [
      { key: "username", label: "LinkedIn Username", placeholder: "yourname", type: "text", hint: "From your profile URL: linkedin.com/in/yourname", maxLength: 60 },
    ],
    generate: (v) => `https://linkedin.com/in/${v.username.trim()}`,
  },
  {
    id: "twitter_x", name: "Twitter / X", emoji: "🐦", color: "#000000",
    icon: "logo-twitter", tagline: "Link to your Twitter/X profile", category: "Social",
    securityNote: "Direct link to your public Twitter/X profile.",
    securityIcon: "person-outline",
    fields: [
      { key: "username", label: "Username", placeholder: "yourhandle", type: "text", hint: "Without the @ symbol", maxLength: 50 },
    ],
    generate: (v) => `https://x.com/${v.username.trim().replace(/^@/, "")}`,
  },
  {
    id: "telegram", name: "Telegram", emoji: "✈️", color: "#26A5E4",
    icon: "paper-plane-outline", tagline: "Link to Telegram channel or profile", category: "Social",
    securityNote: "Opens Telegram app or web. Users can join your channel/group.",
    securityIcon: "shield-outline",
    fields: [
      { key: "username", label: "Telegram Username or Channel", placeholder: "yourchannel", type: "text", hint: "e.g. mychannel or myusername", maxLength: 50 },
    ],
    generate: (v) => `https://t.me/${v.username.trim().replace(/^@/, "")}`,
  },
  {
    id: "tiktok", name: "TikTok", emoji: "🎵", color: "#010101",
    icon: "musical-note-outline", tagline: "Link to your TikTok profile", category: "Social",
    securityNote: "Direct link to TikTok profile page.",
    securityIcon: "person-outline",
    fields: [
      { key: "username", label: "TikTok Username", placeholder: "yourusername", type: "text", hint: "Without the @ symbol", maxLength: 50 },
    ],
    generate: (v) => `https://tiktok.com/@${v.username.trim().replace(/^@/, "")}`,
  },
  {
    id: "snapchat", name: "Snapchat", emoji: "👻", color: "#FFFC00",
    icon: "chatbubble-ellipses-outline", tagline: "Add on Snapchat", category: "Social",
    securityNote: "Opens Snapchat's add-friend page.",
    securityIcon: "person-add-outline",
    fields: [
      { key: "username", label: "Snapchat Username", placeholder: "yourusername", type: "text", maxLength: 50 },
    ],
    generate: (v) => `https://snapchat.com/add/${v.username.trim()}`,
  },
  {
    id: "pinterest", name: "Pinterest", emoji: "📌", color: "#E60023",
    icon: "pin-outline", tagline: "Link to your Pinterest profile or board", category: "Social",
    securityNote: "Direct link to Pinterest page.",
    securityIcon: "person-outline",
    fields: [
      { key: "username", label: "Pinterest Username", placeholder: "yourusername", type: "text", maxLength: 50 },
    ],
    generate: (v) => `https://pinterest.com/${v.username.trim()}`,
  },
  {
    id: "discord", name: "Discord", emoji: "🎮", color: "#5865F2",
    icon: "headset-outline", tagline: "Invite to your Discord server", category: "Social",
    securityNote: "Invite link opens Discord app or browser.",
    securityIcon: "people-outline",
    fields: [
      { key: "invite", label: "Invite Code", placeholder: "abc123XY", type: "text", hint: "From discord.gg/YOURCODE — enter only the code", maxLength: 20 },
    ],
    generate: (v) => `https://discord.gg/${v.invite.trim()}`,
  },

  // ── COMMUNICATION ──
  {
    id: "sms", name: "SMS Message", emoji: "💬", color: "#6366F1",
    icon: "chatbubble-outline", tagline: "Open SMS with pre-filled text", category: "Comm",
    securityNote: "SMS is opened in the device's native messaging app. Message is editable.",
    securityIcon: "checkmark-circle-outline",
    fields: [
      { key: "phone", label: "Phone Number", placeholder: "+91 9876543210", type: "phone", validate: validatePhone },
      { key: "message", label: "Message (optional)", placeholder: "Hi! Scanning your QR code…", type: "multiline", optional: true, maxLength: 160 },
    ],
    generate: (v) => {
      const digits = v.phone.trim().replace(/[\s\-()]/g, "");
      return v.message?.trim() ? `sms:${digits}?body=${encodeURIComponent(v.message.trim())}` : `sms:${digits}`;
    },
  },
  {
    id: "email", name: "Email", emoji: "✉️", color: "#EC4899",
    icon: "mail-outline", tagline: "Pre-fill email compose", category: "Comm",
    securityNote: "Subject & body scanned for phishing keywords before generation.",
    securityIcon: "mail-open-outline",
    fields: [
      { key: "email", label: "To (Email address)", placeholder: "contact@example.com", type: "email", validate: validateEmail },
      { key: "subject", label: "Subject", placeholder: "e.g. Hello from QR Guard", type: "text", optional: true, maxLength: 100 },
      { key: "body", label: "Body", placeholder: "Message body (optional)", type: "multiline", optional: true, maxLength: 300 },
    ],
    generate: (v) => {
      const parts: string[] = [`mailto:${v.email.trim()}`];
      const params: string[] = [];
      if (v.subject?.trim()) params.push(`subject=${encodeURIComponent(v.subject.trim())}`);
      if (v.body?.trim()) params.push(`body=${encodeURIComponent(v.body.trim())}`);
      if (params.length > 0) parts.push(`?${params.join("&")}`);
      return parts.join("");
    },
  },
  {
    id: "phone_number", name: "Phone Number", emoji: "📞", color: "#22C55E",
    icon: "call-outline", tagline: "Instant call on scan", category: "Comm",
    securityNote: "Phone number format is validated before generation.",
    securityIcon: "checkmark-circle-outline",
    fields: [
      { key: "phone", label: "Phone Number", placeholder: "+91 98765 43210", type: "phone", hint: "Include country code for international", validate: validatePhone },
    ],
    generate: (v) => {
      const digits = v.phone.trim().replace(/[\s\-()]/g, "");
      return `tel:${digits}`;
    },
  },
  {
    id: "signal", name: "Signal", emoji: "🔒", color: "#3A76F0",
    icon: "lock-closed-outline", tagline: "Encrypted chat on Signal", category: "Comm",
    securityNote: "Opens Signal's secure messaging app for encrypted communication.",
    securityIcon: "shield-checkmark-outline",
    fields: [
      { key: "phone", label: "Phone Number", placeholder: "+91 9876543210", type: "phone", hint: "Include country code", validate: validatePhone },
    ],
    generate: (v) => {
      const digits = v.phone.trim().replace(/[\s\-()]/g, "");
      return `https://signal.me/#p/${digits}`;
    },
  },

  // ── MEETINGS & PRODUCTIVITY ──
  {
    id: "zoom", name: "Zoom Meeting", emoji: "📹", color: "#2D8CFF",
    icon: "videocam-outline", tagline: "Join a Zoom meeting instantly", category: "Work",
    securityNote: "Share meeting IDs carefully. Always use passwords on Zoom calls.",
    securityIcon: "lock-closed-outline",
    fields: [
      { key: "meeting_id", label: "Meeting ID", placeholder: "123 456 7890", type: "text", hint: "Zoom meeting ID (no spaces needed)", maxLength: 20 },
      { key: "password", label: "Password", placeholder: "meeting password", type: "text", optional: true, maxLength: 20 },
    ],
    generate: (v) => {
      const id = v.meeting_id.trim().replace(/\s/g, "");
      return v.password?.trim() ? `https://zoom.us/j/${id}?pwd=${encodeURIComponent(v.password.trim())}` : `https://zoom.us/j/${id}`;
    },
  },
  {
    id: "google_meet", name: "Google Meet", emoji: "📹", color: "#00897B",
    icon: "videocam-outline", tagline: "Join a Google Meet session", category: "Work",
    securityNote: "Google Meet links require a Google account to join by default.",
    securityIcon: "shield-outline",
    fields: [
      { key: "code", label: "Meeting Code or Full URL", placeholder: "abc-defg-hij", type: "text", hint: "e.g. abc-defg-hij or full meet.google.com URL", maxLength: 80 },
    ],
    generate: (v) => {
      const raw = v.code.trim();
      return raw.startsWith("http") ? raw : `https://meet.google.com/${raw}`;
    },
  },
  {
    id: "ms_teams", name: "Microsoft Teams", emoji: "👥", color: "#6264A7",
    icon: "people-outline", tagline: "Join a Teams meeting", category: "Work",
    securityNote: "Microsoft Teams meeting links are organisation-specific.",
    securityIcon: "shield-outline",
    fields: [
      { key: "url", label: "Meeting URL", placeholder: "https://teams.microsoft.com/l/meetup-join/…", type: "url", validate: validateUrl },
    ],
    generate: (v) => {
      const raw = v.url.trim();
      return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    },
  },
  {
    id: "calendly", name: "Calendly", emoji: "📅", color: "#006BFF",
    icon: "calendar-outline", tagline: "Let people book a slot with you", category: "Work",
    securityNote: "Links to your public Calendly scheduling page.",
    securityIcon: "calendar-outline",
    fields: [
      { key: "username", label: "Calendly Username", placeholder: "yourname", type: "text", hint: "From calendly.com/yourname", maxLength: 60 },
      { key: "event", label: "Event Type (optional)", placeholder: "30min", type: "text", optional: true, maxLength: 40 },
    ],
    generate: (v) => {
      const base = `https://calendly.com/${v.username.trim()}`;
      return v.event?.trim() ? `${base}/${v.event.trim()}` : base;
    },
  },
  {
    id: "github", name: "GitHub", emoji: "🐙", color: "#24292F",
    icon: "logo-github", tagline: "Link to a GitHub profile or repo", category: "Work",
    securityNote: "Public GitHub link — only share public repositories.",
    securityIcon: "code-outline",
    fields: [
      { key: "username", label: "GitHub Username", placeholder: "octocat", type: "text", maxLength: 40 },
      { key: "repo", label: "Repository (optional)", placeholder: "my-project", type: "text", optional: true, maxLength: 100 },
    ],
    generate: (v) => {
      const base = `https://github.com/${v.username.trim()}`;
      return v.repo?.trim() ? `${base}/${v.repo.trim()}` : base;
    },
  },

  // ── MUSIC & MEDIA ──
  {
    id: "spotify", name: "Spotify", emoji: "🎧", color: "#1DB954",
    icon: "musical-note-outline", tagline: "Share a song, album, or playlist", category: "Media",
    securityNote: "Links to Spotify's public share URL.",
    securityIcon: "musical-note-outline",
    fields: [
      { key: "url", label: "Spotify Share URL", placeholder: "https://open.spotify.com/track/…", type: "url", hint: "Copy from Spotify → Share → Copy Link", validate: validateUrl },
    ],
    generate: (v) => {
      const raw = v.url.trim();
      return /^https?:\/\//i.test(raw) ? raw : `https://open.spotify.com/${raw}`;
    },
  },
  {
    id: "app_store", name: "App Store", emoji: "📲", color: "#007AFF",
    icon: "phone-portrait-outline", tagline: "Link to your iOS or Android app", category: "Media",
    securityNote: "Direct link to the app listing page.",
    securityIcon: "shield-outline",
    fields: [
      { key: "url", label: "App Store or Play Store URL", placeholder: "https://play.google.com/store/apps/…", type: "url", hint: "Paste the full store link", validate: validateUrl },
    ],
    generate: (v) => {
      const raw = v.url.trim();
      return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    },
  },

  // ── BUSINESS ──
  {
    id: "website_url", name: "Website URL", emoji: "🌐", color: "#EF4444",
    icon: "globe-outline", tagline: "Link to any website or page", category: "Business",
    securityNote: "URL is mandatory-scanned for threats before QR is generated.",
    securityIcon: "shield-checkmark-outline",
    fields: [
      { key: "url", label: "URL", placeholder: "https://example.com", type: "url", validate: validateUrl },
    ],
    generate: (v) => {
      const raw = v.url.trim();
      return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    },
  },
  {
    id: "google_maps", name: "Google Maps", emoji: "📍", color: "#EA4335",
    icon: "map-outline", tagline: "Navigate to your location", category: "Business",
    securityNote: "Links to Google Maps for navigation.",
    securityIcon: "map-outline",
    fields: [
      { key: "query", label: "Location or Address", placeholder: "Connaught Place, New Delhi", type: "text", hint: "Address, landmark, or business name", maxLength: 150 },
    ],
    generate: (v) => `https://maps.google.com/?q=${encodeURIComponent(v.query.trim())}`,
  },
  {
    id: "google_review", name: "Google Review", emoji: "⭐", color: "#FBBC05",
    icon: "star-outline", tagline: "Get customers to review your business", category: "Business",
    securityNote: "Links to Google Maps business review page.",
    securityIcon: "star-outline",
    fields: [
      { key: "place_id", label: "Place ID or Maps URL", placeholder: "ChIJ…", type: "text", hint: "Get from Google Maps → Share → Embed a map", maxLength: 200 },
    ],
    generate: (v) => {
      const raw = v.place_id.trim();
      return raw.startsWith("http") ? raw : `https://g.page/r/${raw}/review`;
    },
  },
  {
    id: "contact_card", name: "Contact Card", emoji: "👤", color: "#8B5CF6",
    icon: "person-circle-outline", tagline: "Share your contact in one scan", category: "Business",
    securityNote: "Inputs are sanitized. No executable code is embedded.",
    securityIcon: "shield-outline",
    fields: [
      { key: "name", label: "Full Name", placeholder: "Your full name", type: "text", maxLength: 60 },
      { key: "phone", label: "Phone Number", placeholder: "+91 98765 43210", type: "phone", validate: validatePhone },
      { key: "email", label: "Email", placeholder: "you@example.com", type: "email", optional: true, validate: validateEmail },
      { key: "org", label: "Company / Org", placeholder: "Your company name", type: "text", optional: true, maxLength: 60 },
      { key: "website", label: "Website", placeholder: "https://yoursite.com", type: "url", optional: true, validate: validateUrl },
    ],
    generate: (v) => {
      const phone = v.phone.trim().replace(/[\s\-()]/g, "");
      const lines = ["BEGIN:VCARD", "VERSION:3.0", `FN:${v.name.trim()}`, `TEL;TYPE=CELL:${phone}`];
      if (v.email?.trim()) lines.push(`EMAIL;TYPE=INTERNET:${v.email.trim()}`);
      if (v.org?.trim()) lines.push(`ORG:${v.org.trim()}`);
      if (v.website?.trim()) lines.push(`URL:${v.website.trim()}`);
      lines.push("END:VCARD");
      return lines.join("\n");
    },
  },
  {
    id: "wifi", name: "WiFi Network", emoji: "📶", color: "#F59E0B",
    icon: "wifi-outline", tagline: "Share WiFi credentials instantly", category: "Business",
    securityNote: "Password hidden in QR display. Works with WPA2 & WPA3 networks.",
    securityIcon: "lock-closed-outline",
    fields: [
      { key: "ssid", label: "Network Name (SSID)", placeholder: "Your WiFi name", type: "text", maxLength: 60 },
      { key: "password", label: "Password", placeholder: "WiFi password", type: "password", maxLength: 63, optional: true },
    ],
    generate: (v, extras) => {
      const enc: EncType = extras?.encType ?? "WPA";
      const ssid = v.ssid.trim().replace(/[\\;,"]/g, (c: string) => `\\${c}`);
      const pwd = (v.password ?? "").trim().replace(/[\\;,"]/g, (c: string) => `\\${c}`);
      return `WIFI:S:${ssid};T:${enc};P:${pwd};;`;
    },
  },
  {
    id: "google_forms", name: "Google Forms", emoji: "📋", color: "#673AB7",
    icon: "clipboard-outline", tagline: "Link to a feedback or survey form", category: "Business",
    securityNote: "Links to a public Google Form.",
    securityIcon: "clipboard-outline",
    fields: [
      { key: "url", label: "Google Form URL", placeholder: "https://forms.gle/…", type: "url", validate: validateUrl },
    ],
    generate: (v) => {
      const raw = v.url.trim();
      return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    },
  },

  // ── MISC ──
  {
    id: "gps_location", name: "GPS Location", emoji: "🗺️", color: "#059669",
    icon: "location-outline", tagline: "Encode exact GPS coordinates", category: "Misc",
    securityNote: "Encodes latitude/longitude in standard geo: URI format.",
    securityIcon: "map-outline",
    fields: [
      { key: "lat", label: "Latitude", placeholder: "28.6139", type: "text", hint: "e.g. 28.6139 for New Delhi", maxLength: 20 },
      { key: "lng", label: "Longitude", placeholder: "77.2090", type: "text", hint: "e.g. 77.2090 for New Delhi", maxLength: 20 },
    ],
    generate: (v) => `geo:${v.lat.trim()},${v.lng.trim()}`,
  },
  {
    id: "plain_text", name: "Plain Text", emoji: "📝", color: "#64748B",
    icon: "document-text-outline", tagline: "Encode any message or info", category: "Misc",
    securityNote: "Content length limited to 500 chars.",
    securityIcon: "scan-outline",
    fields: [
      { key: "text", label: "Text Content", placeholder: "Type your message here…", type: "multiline", maxLength: 500 },
    ],
    generate: (v) => v.text.trim(),
  },
];
