import type { QrTemplate, EncType } from "@/features/generator/types/template-types";
import {
  validateUrl,
  validateEmail,
} from "@/shared/utils/validators";

/**
 * TEMPLATES — the five supported QR code types.
 * This is the single source of truth for the template picker UI.
 */
export const TEMPLATES: QrTemplate[] = [
  // ── 1. Contact / vCard
  {
    id: "contact_card", name: "Contact / vCard", emoji: "👤", color: "#8B5CF6",
    icon: "person-circle-outline", tagline: "Share your contact in one scan", category: "Contact",
    securityNote: "Inputs are sanitized. No executable code is embedded.",
    securityIcon: "shield-outline",
    fields: [
      { key: "name", label: "Full Name", placeholder: "Your full name", type: "text", maxLength: 60 },
      { key: "phone", label: "Phone Number", placeholder: "+91 98765 43210", type: "phone" },
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

  // ── 3. WiFi
  {
    id: "wifi", name: "WiFi Network", emoji: "📶", color: "#F59E0B",
    icon: "wifi-outline", tagline: "Share WiFi credentials instantly", category: "Utility",
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

  // ── 4. Website URL
  {
    id: "website_url", name: "Website URL", emoji: "🌐", color: "#EF4444",
    icon: "globe-outline", tagline: "Link to any website or page", category: "Web",
    securityNote: "URL is scanned for threats before QR is generated.",
    securityIcon: "shield-checkmark-outline",
    fields: [
      { key: "url", label: "URL", placeholder: "https://example.com", type: "url", validate: validateUrl },
    ],
    generate: (v) => {
      const raw = v.url.trim();
      return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    },
  },

  // ── 5. Email
  {
    id: "email", name: "Email", emoji: "✉️", color: "#EC4899",
    icon: "mail-outline", tagline: "Pre-fill email compose", category: "Contact",
    securityNote: "Subject & body scanned for phishing keywords before generation.",
    securityIcon: "mail-open-outline",
    fields: [
      { key: "email", label: "To (Email address)", placeholder: "contact@example.com", type: "email", validate: validateEmail },
      { key: "subject", label: "Subject", placeholder: "e.g. Hello from BinRo", type: "text", optional: true, maxLength: 100 },
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
];
