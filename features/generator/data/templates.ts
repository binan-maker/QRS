import type { QrTemplate } from "@/features/generator/types/template-types";
import { validateUrlField } from "@/validators";

/**
 * TEMPLATES — supported QR code types for the private (guard) generator.
 * Single source of truth for the template picker UI.
 */
export const TEMPLATES: QrTemplate[] = [
  // ── Website URL
  {
    id: "website_url", name: "Website URL", emoji: "🌐", color: "#3B82F6",
    icon: "globe-outline", tagline: "", category: "Web",
    securityNote: "URL is scanned for threats before QR is generated.",
    securityIcon: "shield-checkmark-outline",
    fields: [
      { key: "url", label: "URL", placeholder: "https://example.com", type: "url", validate: validateUrlField },
    ],
    generate: (v) => {
      const raw = v.url.trim();
      return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    },
  },
];
