import type { KeyboardTypeOptions } from "react-native";

export type CustomFieldType = "text" | "url" | "phone" | "email" | "upi" | "number";

export interface CustomQrField {
  id: string;
  label: string;
  type: CustomFieldType;
}

export interface CustomQrType {
  id: string;
  name: string;
  fields: CustomQrField[];
  createdAt: number;
}

export const CUSTOM_TYPES_STORAGE_KEY = "custom_qr_types_v1";

export const FIELD_TYPE_DEFS: {
  value: CustomFieldType;
  label: string;
  icon: string;
  color: string;
}[] = [
  { value: "phone",  label: "Phone",  icon: "call-outline",       color: "#22C55E" },
  { value: "url",    label: "URL",    icon: "link-outline",        color: "#3B82F6" },
  { value: "text",   label: "Text",   icon: "text-outline",        color: "#6366F1" },
  { value: "email",  label: "Email",  icon: "mail-outline",        color: "#F59E0B" },
  { value: "upi",    label: "UPI",    icon: "card-outline",        color: "#EC4899" },
  { value: "number", label: "Number", icon: "calculator-outline",  color: "#8B5CF6" },
];

export function fieldTypeKeyboardType(type: CustomFieldType): KeyboardTypeOptions {
  switch (type) {
    case "phone":  return "phone-pad";
    case "url":    return "url";
    case "email":  return "email-address";
    case "number": return "number-pad";
    default:       return "default";
  }
}

export function filterCustomFieldValue(type: CustomFieldType, val: string): string {
  if (type === "phone")  return val.replace(/[^0-9+\-() ]/g, "");
  if (type === "number") return val.replace(/[^0-9.]/g, "");
  return val;
}

export function buildCustomQrContent(
  schema: CustomQrType,
  values: Record<string, string>,
): string {
  const fields = schema.fields;
  if (!fields.length) return "";

  const nameLower = schema.name.toLowerCase();

  if (nameLower.includes("whatsapp")) {
    const phoneField = fields.find(f => f.type === "phone");
    const textField  = fields.find(f => f.type === "text");
    const phone = (values[phoneField?.id ?? ""] ?? "")
      .replace(/[\s\-()+]/g, "");
    if (phone) {
      const msg = (values[textField?.id ?? ""] ?? "").trim();
      return msg
        ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
        : `https://wa.me/${phone}`;
    }
  }

  if (fields.length === 1) {
    return formatCustomFieldValue(fields[0].type, values[fields[0].id] ?? "");
  }

  const primary = fields[0];
  const primaryFormatted = formatCustomFieldValue(primary.type, values[primary.id] ?? "");

  if (primary.type === "url" && primaryFormatted.startsWith("http")) {
    const rest = fields.slice(1).map(f => {
      const v = (values[f.id] ?? "").trim();
      if (!v) return null;
      return `${encodeURIComponent(f.label)}=${encodeURIComponent(v)}`;
    }).filter(Boolean);
    return rest.length
      ? `${primaryFormatted}?${rest.join("&")}`
      : primaryFormatted;
  }

  const parts: string[] = [];
  for (const f of fields) {
    const v = (values[f.id] ?? "").trim();
    if (v) parts.push(`${f.label}: ${v}`);
  }
  return parts.join("\n");
}

export function formatCustomFieldValue(type: CustomFieldType, val: string): string {
  const v = val.trim();
  if (!v) return "";
  switch (type) {
    case "phone": return `tel:${v.replace(/\s/g, "")}`;
    case "url":   return v.startsWith("http") ? v : `https://${v}`;
    case "email": return v.startsWith("mailto:") ? v : `mailto:${v}`;
    case "upi":   return `upi://pay?pa=${encodeURIComponent(v)}&cu=INR`;
    default:      return v;
  }
}
