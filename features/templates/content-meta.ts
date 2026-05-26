/**
 * Maps each of the 35 template IDs to the content-type key used by
 * CONTENT_TYPE_META, My QR Codes, and My QR Details for display.
 */
export const TEMPLATE_CONTENT_TYPE_MAP: Record<string, string> = {
  upi_payment:      "upi",
  upi_merchant:     "upi",
  google_pay:       "upi",
  whatsapp:         "whatsapp",
  whatsapp_business:"whatsapp",
  instagram:        "instagram",
  facebook:         "facebook",
  youtube_channel:  "youtube",
  youtube_video:    "youtube",
  linkedin:         "linkedin",
  twitter_x:        "twitter",
  telegram:         "telegram",
  tiktok:           "tiktok",
  snapchat:         "snapchat",
  pinterest:        "social",
  discord:          "discord",
  sms:              "sms",
  email:            "email",
  phone_number:     "phone",
  signal:           "phone",
  zoom:             "zoom",
  google_meet:      "zoom",
  ms_teams:         "zoom",
  calendly:         "calendly",
  github:           "social",
  spotify:          "spotify",
  app_store:        "appdownload",
  website_url:      "social",
  google_maps:      "location",
  google_review:    "googlereview",
  contact_card:     "contact",
  wifi:             "contact",
  google_forms:     "social",
  gps_location:     "location",
  plain_text:       "text",
};

/**
 * Returns the display content-type key for a given template ID.
 * Falls back to "url" for unknown template IDs.
 */
export function getContentTypeForTemplate(templateId: string): string {
  return TEMPLATE_CONTENT_TYPE_MAP[templateId] ?? "url";
}
