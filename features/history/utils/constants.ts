import type { FilterKey } from "@/features/history/types";

export const SKELETON_COUNT = 8;
export const PAGE_SIZE      = 20;
export const STALE_MS       = 2 * 60 * 1000;

export const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all",     label: "All"     },
  { key: "payment", label: "Payment" },
  { key: "url",     label: "URL"     },
  { key: "contact", label: "Contact" },
  { key: "wifi",    label: "WiFi"    },
  { key: "others",  label: "Others"  },
];

export const PAYMENT_TYPES  = [
  "payment", "paymentlink", "paypal", "venmo", "mobilepay",
  "scantopay", "razorpay", "upi", "crypto", "donation",
] as const;

export const CONTACT_TYPES  = [
  "contact", "phone", "email", "sms", "whatsapp", "telegram",
] as const;

/** Every contentType that belongs to a named filter category.
 *  Anything NOT in this set falls under "others". Social, location,
 *  utility, business, and text types are intentionally excluded so they
 *  surface under "others" rather than a dedicated chip. */
export const ALL_KNOWN_TYPES = new Set<string>([
  "url",
  "wifi",
  ...PAYMENT_TYPES,
  ...CONTACT_TYPES,
]);
