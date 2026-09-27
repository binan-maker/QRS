export function extractPaymentName(content: string): string | null {
  if (!content) return null;
  try {
    const lower = content.toLowerCase();
    if (lower.includes("upi://")) {
      const url = new URL(content);
      const name = url.searchParams.get("pn") || url.searchParams.get("tn") || url.searchParams.get("pa");
      return name ? decodeURIComponent(name) : null;
    }
    const match = content.match(/[?&](pn|tn)=([^&]+)/);
    if (match) return decodeURIComponent(match[2]);
  } catch {}
  return null;
}

export function extractPaymentAmount(content: string): string | null {
  try {
    if (!content) return null;
    const url = new URL(content);
    const amount = url.searchParams.get("am");
    if (!amount) return null;
    return `₹${amount}`;
  } catch {
    return null;
  }
}
