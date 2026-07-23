import type { QrSchema } from "../types";
import { EXTERNAL } from "@/config/app";

export const socialSchema: QrSchema = {
  key: "social",
  label: "Social Profile",
  icon: "share-social-outline",
  category: "social",
  description: "Link to any social media profile or handle",
  primaryField: {
    key: "url",
    label: "Profile URL",
    placeholder: "https://instagram.com/yourhandle",
    type: "url",
    required: true,
    hint: "Paste the full link to your social media profile",
  },
  build: (v) => (v.startsWith("http") ? v : `https://${v}`),
  validate: (v) => {
    if (!v.trim()) return "Please enter a profile URL.";
    return null;
  },
};

export const whatsappSchema: QrSchema = {
  key: "whatsapp",
  label: "WhatsApp",
  icon: "logo-whatsapp",
  category: "communication",
  description: "Open a WhatsApp chat with a pre-filled message",
  primaryField: {
    key: "number",
    label: "Phone Number (with country code)",
    placeholder: "+919876543210",
    type: "phone",
    required: true,
    hint: "Include country code, no spaces (e.g. +919876543210)",
  },
  extraFields: [
    {
      key: "message",
      label: "Pre-filled Message (optional)",
      placeholder: "Hello! I scanned your QR code.",
      type: "textarea",
      optional: true,
    },
  ],
  build: (v, extra) => {
    const cleaned = v.replace(/[\s\-().]/g, "").replace(/^\+/, "");
    const msg = extra.message?.trim() ?? "";
    let url = `${EXTERNAL.WHATSAPP}${cleaned}`;
    if (msg) url += `?text=${encodeURIComponent(msg)}`;
    return url;
  },
  validate: (v) => {
    const digits = v.replace(/[\s\-().+]/g, "");
    if (digits.length < 10) return "Please enter a valid phone number with country code.";
    return null;
  },
};
