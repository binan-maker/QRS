export interface ContactData {
  name: string;
  phone: string;
  email: string;
  org: string;
  url: string;
  title: string;
  note: string;
}

export function parseContact(content: string): ContactData {
  const r: ContactData = { name: "", phone: "", email: "", org: "", url: "", title: "", note: "" };
  if (content.startsWith("BEGIN:VCARD")) {
    const fn = content.match(/^FN:(.+)$/m)?.[1]?.trim() ?? "";
    if (fn) {
      r.name = fn;
    } else {
      const nField = content.match(/^N:(.+)$/m)?.[1]?.trim() ?? "";
      const [last = "", first = ""] = nField.split(";");
      r.name = [first.trim(), last.trim()].filter(Boolean).join(" ");
    }
    r.phone = (content.match(/^TEL[^:\r\n]*:(.+)$/m)?.[1] ?? "").trim();
    r.email = (content.match(/^EMAIL[^:\r\n]*:(.+)$/m)?.[1] ?? "").trim();
    r.org   = (content.match(/^ORG:(.+)$/m)?.[1] ?? "").trim().split(";")[0].trim();
    r.url   = (content.match(/^URL:(.+)$/m)?.[1] ?? "").trim();
    r.title = (content.match(/^TITLE:(.+)$/m)?.[1] ?? "").trim();
    r.note  = (content.match(/^NOTE:(.+)$/m)?.[1] ?? "").trim().slice(0, 120);
  } else if (content.toLowerCase().startsWith("mecard:")) {
    r.name  = content.match(/N:([^;]+)/)?.[1]?.trim() ?? "";
    r.phone = content.match(/TEL:([^;]+)/)?.[1]?.trim() ?? "";
    r.email = content.match(/EMAIL:([^;]+)/)?.[1]?.trim() ?? "";
  }
  return r;
}
