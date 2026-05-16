export const CAT_COLOR: Record<string, string> = {
  text: "#6366F1",         url: "#3B82F6",       email: "#EC4899",
  phone: "#14B8A6",        sms: "#22C55E",        whatsapp: "#25D366",
  wifi: "#F59E0B",         upi: "#8B5CF6",        location: "#EF4444",
  contact: "#3B82F6",      crypto: "#F97316",     instagram: "#C13584",
  twitter: "#1DA1F2",      youtube: "#FF0000",    linkedin: "#0077B5",
  telegram: "#2CA5E0",     spotify: "#1DB954",    facebook: "#1877F2",
  paypal: "#003087",       venmo: "#3D95CE",      grab: "#00B14F",
  zoom: "#2D8CFF",         event: "#8B5CF6",      app_download: "#6366F1",
  bharat_qr: "#10B981",    google_review: "#F59E0B", restaurant_menu: "#F97316",
  donation: "#EF4444",     razorpay: "#3395FF",   google_maps: "#34A853",
  discord: "#5865F2",      tiktok: "#010101",     snapchat: "#FFFC00",
  google_pay: "#4285F4",   linktree: "#43E660",   mecard: "#8B5CF6",
};

export function catColor(id: string): string {
  return CAT_COLOR[id] ?? "#3B82F6";
}

export const POPULAR_IDS = ["google_pay", "upi", "whatsapp", "url", "wifi", "google_review"];

export const GROUPS: { emoji: string; label: string; ids: string[] }[] = [
  { emoji: "🇮🇳", label: "India First",  ids: ["upi", "bharat_qr", "google_pay", "google_review", "restaurant_menu", "razorpay"] },
  { emoji: "💳",  label: "Payments",     ids: ["paypal", "venmo", "crypto", "donation"] },
  { emoji: "📱",  label: "Social Media", ids: ["whatsapp", "instagram", "twitter", "youtube", "linkedin", "telegram", "spotify", "facebook", "tiktok", "discord", "snapchat"] },
  { emoji: "👤",  label: "Contact",      ids: ["contact", "mecard", "phone", "email", "sms"] },
  { emoji: "🔧",  label: "Utility",      ids: ["wifi", "event", "location", "google_maps", "zoom", "app_download"] },
  { emoji: "🌐",  label: "Web & Links",  ids: ["url", "text", "linktree"] },
];
