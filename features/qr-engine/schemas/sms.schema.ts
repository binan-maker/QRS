import type { QrSchema } from "../types";

export const smsSchema: QrSchema = {
  key: "sms",
  label: "SMS Message",
  icon: "chatbubble-outline",
  category: "communication",
  description: "Send a pre-filled SMS on scan",
  primaryField: {
    key: "number",
    label: "Phone Number",
    placeholder: "+91 98765 43210",
    type: "phone",
    required: true,
  },
  extraFields: [
    {
      key: "message",
      label: "Message",
      placeholder: "Your message here…",
      type: "textarea",
      optional: true,
    },
  ],
  build: (v, extra) => {
    const msg = extra.message?.trim() ?? "";
    return `SMSTO:${v.replace(/\s/g, "")}:${msg}`;
  },
  validate: (v) => {
    const digits = v.replace(/[\s\-().+]/g, "");
    if (digits.length < 7) return "Please enter a valid phone number.";
    return null;
  },
};
