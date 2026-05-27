import type { QrSchema } from "../types";

export const textSchema: QrSchema = {
  key: "text",
  label: "Plain Text",
  icon: "document-text-outline",
  category: "text",
  description: "Encode any text message, code, or data",
  primaryField: {
    key: "content",
    label: "Text Content",
    placeholder: "Enter your message, coupon code, or any text…",
    type: "textarea",
    required: true,
    maxLength: 2000,
    hint: "Up to 2000 characters",
  },
  build: (v) => v.trim(),
  validate: (v) => {
    if (!v.trim()) return "Please enter some text.";
    if (v.length > 2000) return "Text must be under 2000 characters.";
    return null;
  },
};
