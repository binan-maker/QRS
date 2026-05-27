export interface SmsData { to: string; body: string; }
export interface WhatsAppData { phone: string; text: string; }
export interface EmailData { email: string; subject: string; body: string; }

export function parseSms(content: string): SmsData {
  const smsto = content.match(/^SMSTO:([^:]*):?(.*)?$/i);
  if (smsto) return { to: smsto[1]?.trim() ?? "", body: smsto[2]?.trim() ?? "" };
  try {
    const url = new URL(content);
    const to = url.pathname.replace(/^\//, "");
    const body = url.searchParams.get("body") ?? "";
    return { to, body };
  } catch { return { to: content.replace(/^sms[to]*:/i, "").split("?")[0], body: "" }; }
}

export function parseWhatsApp(content: string): WhatsAppData {
  try {
    const u = new URL(content.startsWith("http") ? content : `https://${content}`);
    const phone = u.pathname.replace(/^\//, "").replace(/\D/g, "");
    const text = u.searchParams.get("text") ?? "";
    return { phone: phone ? "+" + phone : content, text };
  } catch { return { phone: content, text: "" }; }
}

export function parseEmail(content: string): EmailData {
  try {
    const bare = content.replace(/^mailto:/i, "");
    const [addr, qs = ""] = bare.split("?");
    const p = new URLSearchParams(qs);
    return { email: addr || "", subject: p.get("subject") ?? "", body: p.get("body") ?? "" };
  } catch { return { email: content, subject: "", body: "" }; }
}

export function parsePhone(content: string): string {
  return content.replace(/^(tel:|callto:|facetime:)/i, "").trim();
}
