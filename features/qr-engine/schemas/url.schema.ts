import type { QrSchema } from "../types";

export const urlSchema: QrSchema = {
  key: "url",
  label: "Website URL",
  icon: "globe-outline",
  category: "web",
  description: "Link to any website or web page",
  primaryField: {
    key: "url",
    label: "Website URL",
    placeholder: "https://example.com",
    type: "url",
    required: true,
    hint: "Enter a full website address",
  },
  build: (v) => (v.startsWith("http") ? v : `https://${v}`),
  validate: (v) => {
    const withScheme = v.startsWith("http") ? v : `https://${v}`;
    try {
      const url = new URL(withScheme);
      if (!url.hostname.includes(".") || url.hostname.length < 4)
        return "Please enter a valid URL (e.g. https://example.com).";
    } catch {
      return "Please enter a valid URL (e.g. https://example.com).";
    }
    return null;
  },
  trustRules: ["url_shortener", "redirect_chain", "suspicious_domain"],
};
