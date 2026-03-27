export function formatRelativeTime(isoStringOrTimestamp: string | number): string {
  const date = typeof isoStringOrTimestamp === "number"
    ? new Date(isoStringOrTimestamp)
    : new Date(isoStringOrTimestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins === 1) return "1 minute ago";
  if (mins < 60) return `${mins} minutes ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs === 1) return "1 hour ago";
  if (hrs < 24) return `${hrs} hours ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return "1 week ago";
  if (weeks < 5) return `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return "1 month ago";
  if (months < 12) return `${months} months ago`;
  const years = Math.floor(days / 365);
  if (years === 1) return "1 year ago";
  return `${years} years ago`;
}

export function formatFirstName(name: string): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  return parts[0].length > 10 ? parts[0].substring(0, 9) + "…" : parts[0];
}

export function smartName(name: string): string {
  if (!name) return "User";
  const parts = name.trim().split(/\s+/);
  const first = parts[0];
  if (name.length <= 18) return name;
  if (first.length <= 18) return first;
  return first.substring(0, 16) + "…";
}

export function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + "..." : s;
}

export function getContentTypeIcon(type: string): string {
  switch (type) {
    case "url": return "link";
    case "phone": return "call";
    case "email": return "mail";
    case "wifi": return "wifi";
    case "location": return "location";
    case "payment": return "card";
    default: return "document-text";
  }
}

export function detectContentType(content: string): string {
  if (!content) return "text";
  const lower = content.toLowerCase().trim();
  if (
    lower.startsWith("upi://") || lower.startsWith("paytm://") ||
    lower.startsWith("phonepe://") || lower.startsWith("bitcoin:") ||
    lower.startsWith("ethereum:") || lower.startsWith("wxp://") ||
    lower.startsWith("gpay://") || lower.startsWith("tez://") ||
    lower.includes("upi://pay")
  ) return "payment";
  if (lower.startsWith("tel:")) return "phone";
  if (lower.startsWith("mailto:")) return "email";
  if (lower.startsWith("wifi:")) return "wifi";
  if (lower.startsWith("geo:")) return "location";
  try { new URL(content); return "url"; } catch {}
  return "text";
}

export function getNotifIcon(type: string): string {
  if (type === "new_comment") return "chatbubble";
  if (type === "mention") return "at";
  if (type === "new_follow") return "person-add";
  return "warning";
}

export function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function extractPaymentName(content: string): string | null {
  if (!content) return null;

  try {
    const lower = content.toLowerCase();

    // UPI QR
    if (lower.includes("upi://")) {
      const url = new URL(content);
      const name =
        url.searchParams.get("pn") || // person name
        url.searchParams.get("tn") || // transaction note
        url.searchParams.get("pa");   // fallback = UPI ID

      return name ? decodeURIComponent(name) : null;
    }

    // fallback simple regex (in case URL fails)
    const match = content.match(/[?&](pn|tn)=([^&]+)/);
    if (match) return decodeURIComponent(match[2]);

  } catch (e) {}

  return null;
}
export function extractPaymentAmount(content: string): string | null {
  try {
    if (!content) return null;

    const url = new URL(content);
    const amount = url.searchParams.get("am");

    if (!amount) return null;

    return `₹${amount}`; // Indian format
  } catch {
    return null;
  }
}