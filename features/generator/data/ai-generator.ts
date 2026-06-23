const BASE_URL = (() => {
  const raw = process.env.EXPO_PUBLIC_DOMAIN;
  if (raw) { const host = raw.split(":")[0]; if (host) return `https://${host}`; }
  return "http://localhost:5000";
})();

export const AI_EXAMPLES = [
  { label: "WiFi QR", prompt: "WiFi for MyShop, password: Secure@123" },
  { label: "UPI Payment", prompt: "UPI payment to john@paytm, ₹500, for groceries" },
  { label: "Website", prompt: "https://binance.com" },
  { label: "Contact card", prompt: "Contact card for Rahul Sharma, phone +91 9876543210, rahul@gmail.com" },
  { label: "SMS", prompt: "SMS to +91 9876543210 saying: Thanks for visiting!" },
  { label: "Email", prompt: "Email to support@example.com subject: Help needed" },
];

export function clientSmartParse(p: string): string {
  const lower = p.toLowerCase();

  const urlMatch = p.match(/https?:\/\/[^\s,]+/);
  if (urlMatch) return urlMatch[0];

  if (/whatsapp/i.test(lower)) {
    const phone = p.match(/[\+\d][\d\s\-()]{7,}/)?.[0]?.replace(/[^\d+]/g, "") ?? "";
    if (phone) return `https://wa.me/${phone.replace(/^\+/, "")}`;
  }

  if (/wi-?fi|ssid|network.*pass|pass.*network/i.test(lower)) {
    const ssid = (p.match(/(?:ssid|network(?:\s+name)?|named?|called?|for)\s*[:"']?\s*([^,\n"']+?)(?:\s*[,\n]|$)/i)?.[1]
      ?? p.match(/^([^,]+),/)?.[1] ?? "MyNetwork").trim();
    const pass = p.match(/(?:password|pwd|pass(?:word)?)\s*[:"']?\s*(\S+)/i)?.[1] ?? "";
    return `WIFI:S:${ssid};T:${pass ? "WPA" : "nopass"};P:${pass};;`;
  }

  if (/upi|gpay|paytm|pay.*@|@.*pay/i.test(lower)) {
    const vpa = p.match(/[\w.\-+]+@[\w]+/)?.[0] ?? "";
    const amount = p.match(/₹?\s*(\d+(?:\.\d+)?)/)?.[1] ?? "";
    if (vpa) {
      const base = `upi://pay?pa=${encodeURIComponent(vpa)}&cu=INR`;
      return amount ? `${base}&am=${amount}` : base;
    }
  }

  const telMatch = p.match(/(?:call|phone|tel(?:ephone)?|ring)[^0-9+]*([\+\d][\d\s\-()]{7,})/i);
  if (telMatch) return `tel:${telMatch[1].replace(/[^\d+]/g, "")}`;

  const emailMatch = p.match(/[\w.\-+]+@[\w.\-]+\.[a-z]{2,}/i);
  if (emailMatch) return `mailto:${emailMatch[0]}`;

  if (/sms|text me|message me/i.test(lower)) {
    const phone = p.match(/[\+\d][\d\s\-()]{7,}/)?.[0]?.replace(/[^\d+]/g, "") ?? "";
    if (phone) return `sms:${phone}`;
  }

  const domainMatch = p.match(/^(?:www\.)?[\w-]+\.(com|in|org|net|io|app|co|edu|gov|dev|ai|me)(?:\/[^\s]*)?$/i);
  if (domainMatch) return `https://${p}`;

  return p;
}

export async function callAiQrGenerate(prompt: string): Promise<string> {
  try {
    const res = await fetch(`${BASE_URL}/api/ai/qr-generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Server error ${res.status}`);
    const data = await res.json();
    if (!data.content) throw new Error("No content returned");
    return data.content as string;
  } catch {
    const result = clientSmartParse(prompt.trim());
    if (!result) throw new Error("Could not parse prompt");
    return result;
  }
}
