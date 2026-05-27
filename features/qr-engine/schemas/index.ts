/**
 * QR Engine — Schema Registry
 * ─────────────────────────────────────────────────────────────────────────────
 * All generator schemas in one place. Each schema defines:
 *   • primaryField + extraFields   — form inputs
 *   • build()                      — encodes inputs into QR payload string
 *   • validate()                   — validates inputs before encoding
 *   • trustRules                   — which trust flags to check on scan
 *
 * To add a new generator type: create a schema file and add it here.
 */

export { urlSchema } from "./url.schema";
export { wifiSchema } from "./wifi.schema";
export { upiSchema } from "./upi.schema";
export { contactSchema } from "./contact.schema";
export { emailSchema } from "./email.schema";
export { phoneSchema } from "./phone.schema";
export { smsSchema } from "./sms.schema";
export { textSchema } from "./text.schema";
export { cryptoSchema } from "./crypto.schema";
export { eventSchema } from "./event.schema";
export { locationSchema } from "./location.schema";
export { socialSchema, whatsappSchema } from "./social.schema";

import { urlSchema } from "./url.schema";
import { wifiSchema } from "./wifi.schema";
import { upiSchema } from "./upi.schema";
import { contactSchema } from "./contact.schema";
import { emailSchema } from "./email.schema";
import { phoneSchema } from "./phone.schema";
import { smsSchema } from "./sms.schema";
import { textSchema } from "./text.schema";
import { cryptoSchema } from "./crypto.schema";
import { eventSchema } from "./event.schema";
import { locationSchema } from "./location.schema";
import { socialSchema, whatsappSchema } from "./social.schema";
import type { QrSchema } from "../types";

export const SCHEMA_REGISTRY: QrSchema[] = [
  urlSchema,
  upiSchema,
  wifiSchema,
  contactSchema,
  whatsappSchema,
  emailSchema,
  phoneSchema,
  smsSchema,
  textSchema,
  locationSchema,
  eventSchema,
  cryptoSchema,
  socialSchema,
];

export function getSchemaByKey(key: string): QrSchema | undefined {
  return SCHEMA_REGISTRY.find((s) => s.key === key);
}

export const SCHEMA_CATEGORIES: {
  label: string;
  icon: string;
  keys: string[];
}[] = [
  {
    label: "Payments",
    icon: "card-outline",
    keys: ["upi", "crypto"],
  },
  {
    label: "Contact & Communication",
    icon: "person-outline",
    keys: ["contact", "phone", "sms", "email", "whatsapp"],
  },
  {
    label: "Web & Social",
    icon: "globe-outline",
    keys: ["url", "social"],
  },
  {
    label: "Utility",
    icon: "apps-outline",
    keys: ["wifi", "location", "event", "text"],
  },
];
