import type { Filter } from "@/features/history/types";

export const SKELETON_COUNT = 8;
export const PAGE_SIZE      = 20;
export const STALE_MS       = 15 * 60 * 1000;

export const FILTERS: { key: Filter; label: string }[] = [
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
];

export const SOCIAL_TYPES   = ["instagram", "twitter", "youtube", "linkedin", "facebook", "spotify", "discord", "tiktok", "snapchat"] as const;
export const PAYMENT_TYPES  = ["payment", "paymentlink", "paypal", "venmo", "mobilepay", "scantopay", "razorpay", "upi", "crypto", "donation"] as const;
export const CONTACT_TYPES  = ["contact", "phone", "email", "sms", "whatsapp", "telegram"] as const;
export const UTILITY_TYPES  = ["calendar", "zoom", "appdownload"] as const;
export const BUSINESS_TYPES = ["reviewpage", "menucatalogue"] as const;
