export interface ContentTypeMeta {
  label: string;
  icon: string;
  color: string;
  bg: string;
}

export const CONTENT_TYPE_META: Record<string, ContentTypeMeta> = {
  url:            { label: "URL",           icon: "link-outline",             color: "#1D4ED8", bg: "#EFF6FF" },
  text:           { label: "Text",          icon: "text-outline",             color: "#6B7280", bg: "#F9FAFB" },
  wifi:           { label: "WiFi",          icon: "wifi-outline",             color: "#059669", bg: "#ECFDF5" },
  upi:            { label: "UPI Payment",   icon: "card-outline",             color: "#F59E0B", bg: "#FFFBEB" },
  bharatqr:       { label: "BharatQR",      icon: "shield-checkmark-outline", color: "#10B981", bg: "#ECFDF5" },
  payment:        { label: "Payment",       icon: "card-outline",             color: "#F59E0B", bg: "#FFFBEB" },
  paymentlink:    { label: "Payment Link",  icon: "card-outline",             color: "#F59E0B", bg: "#FFFBEB" },
  scantopay:      { label: "Scan-to-Pay",   icon: "qr-code-outline",          color: "#F59E0B", bg: "#FFFBEB" },
  mobilepay:      { label: "Mobile Pay",    icon: "phone-portrait-outline",   color: "#10B981", bg: "#ECFDF5" },
  grab:           { label: "GrabPay",       icon: "car-outline",              color: "#00B14F", bg: "#F0FDF4" },
  contact:        { label: "Contact",       icon: "person-circle-outline",    color: "#8B5CF6", bg: "#F5F3FF" },
  email:          { label: "Email",         icon: "mail-outline",             color: "#3B82F6", bg: "#EFF6FF" },
  phone:          { label: "Phone",         icon: "call-outline",             color: "#10B981", bg: "#ECFDF5" },
  social:         { label: "Social",        icon: "share-social-outline",     color: "#EC4899", bg: "#FDF2F8" },
  whatsapp:       { label: "WhatsApp",      icon: "logo-whatsapp",            color: "#22C55E", bg: "#F0FDF4" },
  instagram:      { label: "Instagram",     icon: "logo-instagram",           color: "#E1306C", bg: "#FFF1F2" },
  twitter:        { label: "Twitter",       icon: "logo-twitter",             color: "#1DA1F2", bg: "#EFF6FF" },
  youtube:        { label: "YouTube",       icon: "logo-youtube",             color: "#FF0000", bg: "#FFF1F2" },
  linkedin:       { label: "LinkedIn",      icon: "logo-linkedin",            color: "#0A66C2", bg: "#EFF6FF" },
  telegram:       { label: "Telegram",      icon: "send-outline",             color: "#0088CC", bg: "#EFF6FF" },
  facebook:       { label: "Facebook",      icon: "logo-facebook",            color: "#1877F2", bg: "#EFF6FF" },
  spotify:        { label: "Spotify",       icon: "musical-notes-outline",    color: "#1DB954", bg: "#F0FDF4" },
  discord:        { label: "Discord",       icon: "logo-discord",             color: "#5865F2", bg: "#F5F3FF" },
  tiktok:         { label: "TikTok",        icon: "musical-note-outline",     color: "#010101", bg: "#F9FAFB" },
  media:          { label: "Media",         icon: "play-circle-outline",      color: "#8B5CF6", bg: "#F5F3FF" },
  crypto:         { label: "Crypto",        icon: "logo-bitcoin",             color: "#F7931A", bg: "#FFFBEB" },
  location:       { label: "Location",      icon: "location-outline",         color: "#EF4444", bg: "#FFF1F2" },
  calendar:       { label: "Event",         icon: "calendar-outline",         color: "#8B5CF6", bg: "#F5F3FF" },
  event:          { label: "Event",         icon: "calendar-outline",         color: "#8B5CF6", bg: "#F5F3FF" },
  zoom:           { label: "Zoom",          icon: "videocam-outline",         color: "#2D8CFF", bg: "#EFF6FF" },
  app:            { label: "App",           icon: "download-outline",         color: "#10B981", bg: "#ECFDF5" },
  appdownload:    { label: "App Download",  icon: "download-outline",         color: "#10B981", bg: "#ECFDF5" },
  googlereview:   { label: "Review Page",   icon: "star-outline",             color: "#F59E0B", bg: "#FFFBEB" },
  reviewpage:     { label: "Review Page",   icon: "star-outline",             color: "#F59E0B", bg: "#FFFBEB" },
  calendly:       { label: "Calendly",      icon: "calendar-outline",         color: "#006BFF", bg: "#EFF6FF" },
  restaurantmenu: { label: "Menu",          icon: "restaurant-outline",       color: "#EF4444", bg: "#FFF1F2" },
  menucatalogue:  { label: "Menu",          icon: "list-outline",             color: "#EF4444", bg: "#FFF1F2" },
  donation:       { label: "Donation",      icon: "heart-outline",            color: "#F43F5E", bg: "#FFF1F2" },
  paypal:         { label: "PayPal",        icon: "wallet-outline",           color: "#003087", bg: "#EFF6FF" },
  venmo:          { label: "Venmo",         icon: "people-outline",           color: "#008CFF", bg: "#EFF6FF" },
  sms:            { label: "SMS",           icon: "chatbubble-outline",       color: "#6B7280", bg: "#F9FAFB" },
  document:       { label: "Document",      icon: "document-outline",         color: "#3B82F6", bg: "#EFF6FF" },
  otp:            { label: "OTP / 2FA",     icon: "key-outline",              color: "#8B5CF6", bg: "#F5F3FF" },
  boarding:       { label: "Boarding Pass", icon: "airplane-outline",         color: "#0284C7", bg: "#E0F2FE" },
  product:        { label: "Product",       icon: "barcode-outline",          color: "#6B7280", bg: "#F9FAFB" },
};

export const DEFAULT_CONTENT_TYPE_META: ContentTypeMeta = {
  label: "QR Code",
  icon: "qr-code-outline",
  color: "#6B7280",
  bg: "#F9FAFB",
};

export function getContentTypeMeta(contentType: string): ContentTypeMeta {
  return CONTENT_TYPE_META[contentType] ?? DEFAULT_CONTENT_TYPE_META;
}
