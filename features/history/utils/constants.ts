import type { FilterKey } from "@/features/history/types";

export const SKELETON_COUNT = 8;
export const PAGE_SIZE      = 20;
export const STALE_MS       = 2 * 60 * 1000;

export const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all",      label: "All"      },
  { key: "url",      label: "URL"      },
  { key: "social",   label: "Social"   },
  { key: "payment",  label: "Payment"  },
  { key: "contact",  label: "Contact"  },
  { key: "wifi",     label: "WiFi"     },
  { key: "location", label: "Location" },
  { key: "utility",  label: "Utility"  },
  { key: "business", label: "Business" },
  { key: "text",     label: "Text"     },
  { key: "others",   label: "Others"   },
];

export const SOCIAL_TYPES   = [
  "instagram", "twitter", "youtube", "linkedin", "facebook",
  "spotify", "discord", "tiktok", "snapchat", "reddit", "pinterest",
  "threads", "mastodon",
] as const;

export const PAYMENT_TYPES  = [
  "payment", "paymentlink", "paypal", "venmo", "mobilepay",
  "scantopay", "razorpay", "upi", "crypto", "donation",
] as const;

export const CONTACT_TYPES  = [
  "contact", "phone", "email", "sms", "whatsapp", "telegram",
] as const;

export const UTILITY_TYPES  = [
  "calendar", "zoom", "appdownload",
] as const;

export const BUSINESS_TYPES = [
  "reviewpage", "menucatalogue",
] as const;

/** Every contentType that belongs to a named category. Anything NOT in this
 *  set falls under the "others" filter. */
export const ALL_KNOWN_TYPES = new Set<string>([
  "url",
  "text",
  "wifi",
  "location",
  ...SOCIAL_TYPES,
  ...PAYMENT_TYPES,
  ...CONTACT_TYPES,
  ...UTILITY_TYPES,
  ...BUSINESS_TYPES,
]);
