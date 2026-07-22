/**
 * Template content-type metadata
 *
 * Maps every supported template ID to the content-type key used by
 * CONTENT_TYPE_META, My QR Codes, and QR Detail for icon/label display.
 *
 * This is the single source of truth for that mapping — do not duplicate
 * it in individual screens. When a new template is added to
 * features/generator/data/templates.ts, add its ID here too.
 */

// ── Template ID registry ───────────────────────────────────────────────────────
// Kept as a const tuple so TemplateId can be derived automatically.
// Add new IDs here first; the compiler will then flag any missing map entries.

const TEMPLATE_IDS = [
  "upi_payment",
  "upi_merchant",
  "google_pay",
  "whatsapp",
  "whatsapp_business",
  "instagram",
  "facebook",
  "youtube_channel",
  "youtube_video",
  "linkedin",
  "twitter_x",
  "telegram",
  "tiktok",
  "snapchat",
  "pinterest",
  "discord",
  "sms",
  "email",
  "phone_number",
  "signal",
  "zoom",
  "google_meet",
  "ms_teams",
  "calendly",
  "github",
  "spotify",
  "app_store",
  "website_url",
  "google_maps",
  "google_review",
  "contact_card",
  "wifi",
  "google_forms",
  "gps_location",
  "plain_text",
] as const;

/** Union of every supported template ID. Extend TEMPLATE_IDS to widen this. */
export type TemplateId = (typeof TEMPLATE_IDS)[number];

// ── Mapping ────────────────────────────────────────────────────────────────────

export const TEMPLATE_CONTENT_TYPE_MAP: Record<TemplateId, string> = {
  upi_payment:       "upi",
  upi_merchant:      "upi",
  google_pay:        "upi",
  whatsapp:          "whatsapp",
  whatsapp_business: "whatsapp",
  instagram:         "instagram",
  facebook:          "facebook",
  youtube_channel:   "youtube",
  youtube_video:     "youtube",
  linkedin:          "linkedin",
  twitter_x:         "twitter",
  telegram:          "telegram",
  tiktok:            "tiktok",
  snapchat:          "snapchat",
  pinterest:         "social",
  discord:           "discord",
  sms:               "sms",
  email:             "email",
  phone_number:      "phone",
  signal:            "phone",
  zoom:              "zoom",
  google_meet:       "zoom",
  ms_teams:          "zoom",
  calendly:          "calendly",
  github:            "social",
  spotify:           "spotify",
  app_store:         "appdownload",
  website_url:       "social",
  google_maps:       "location",
  google_review:     "googlereview",
  contact_card:      "contact",
  wifi:              "contact",
  google_forms:      "social",
  gps_location:      "location",
  plain_text:        "text",
};

// ── Lookup ─────────────────────────────────────────────────────────────────────

/**
 * Returns the display content-type key for a given template ID.
 * Accepts `string` (not just `TemplateId`) so callers can pass raw API values
 * without casting; unknown IDs fall back to "url".
 */
export function getContentTypeForTemplate(templateId: string): string {
  return (TEMPLATE_CONTENT_TYPE_MAP as Record<string, string>)[templateId] ?? "url";
}
