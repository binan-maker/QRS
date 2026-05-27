import type { QrSchema } from "../types";

export const phoneSchema: QrSchema = {
  key: "phone",
  label: "Phone Call",
  icon: "call-outline",
  category: "communication",
  description: "Dial a phone number on scan",
  primaryField: {
    key: "number",
    label: "Phone Number",
    placeholder: "+91 98765 43210",
    type: "phone",
    required: true,
    hint: "Include country code for international numbers",
  },
  build: (v) => `tel:${v.replace(/\s/g, "")}`,
  validate: (v) => {
    const digits = v.replace(/[\s\-().+]/g, "");
    if (digits.length < 7) return "Please enter a valid phone number.";
    return null;
  },
};
