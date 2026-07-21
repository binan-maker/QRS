import React, { type ReactNode } from "react";
import { Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type FieldType = "text" | "number" | "url" | "phone" | "email" | "amount" | "upi" | "date";

export interface CustomField {
  id: string;
  key: string;
  label: string;
  type: FieldType;
  hint?: string;
}

export interface StarterTemplate {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  emoji: string;
  tagline: string;
  desc: string;
  template: string;
  fields: Omit<CustomField, "id">[];
}

export const FIELD_TYPES: { value: FieldType; label: string; icon: keyof typeof Ionicons.glyphMap; color: string; desc: string }[] = [
  { value: "text",   label: "Text",   icon: "text-outline",      color: "#6366F1", desc: "Any text or message" },
  { value: "url",    label: "Link",   icon: "link-outline",       color: "#3B82F6", desc: "Website URL" },
  { value: "phone",  label: "Phone",  icon: "call-outline",       color: "#22C55E", desc: "Phone number" },
  { value: "email",  label: "Email",  icon: "mail-outline",       color: "#F59E0B", desc: "Email address" },
  { value: "number", label: "Number", icon: "calculator-outline", color: "#8B5CF6", desc: "Any number" },
  { value: "amount", label: "Amount", icon: "cash-outline",       color: "#10B981", desc: "Payment amount" },
  { value: "upi",    label: "UPI ID", icon: "card-outline",       color: "#EC4899", desc: "UPI payment ID" },
  { value: "date",   label: "Date",   icon: "calendar-outline",   color: "#F97316", desc: "Date value" },
];

export const FIELD_TYPE_MAP = Object.fromEntries(FIELD_TYPES.map(t => [t.value, t]));

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: "url",
    name: "URL / Link",
    icon: "globe-outline",
    color: "#3B82F6",
    emoji: "🌐",
    tagline: "Direct link to any website",
    desc: "Encode any URL directly into a QR code — no setup needed.",
    template: "{{url}}",
    fields: [
      { key: "url", label: "URL", type: "url", hint: "https://example.com" },
    ],
  },
  {
    id: "upi",
    name: "UPI Payment",
    icon: "card-outline",
    color: "#EC4899",
    emoji: "💳",
    tagline: "Accept payments instantly",
    desc: "Generates a UPI deep-link — customers can pay you with any app.",
    template: "upi://pay?pa={{upi_id}}&pn={{name}}&am={{amount}}&tn={{note}}&cu=INR",
    fields: [
      { key: "upi_id",  label: "UPI ID",      type: "upi",    hint: "e.g. yourname@upi" },
      { key: "name",    label: "Payee Name",  type: "text",   hint: "Your name or shop name" },
      { key: "amount",  label: "Amount (₹)",  type: "amount", hint: "Leave blank for custom" },
      { key: "note",    label: "Note",         type: "text",   hint: "e.g. Table 5 Order" },
    ],
  },
  {
    id: "table_order",
    name: "Table / Menu",
    icon: "restaurant-outline",
    color: "#F59E0B",
    emoji: "🍽️",
    tagline: "Contactless menu for any table",
    desc: "Each table gets its own QR that passes the table number to your website.",
    template: "https://{{website}}/menu?table={{table}}&section={{section}}",
    fields: [
      { key: "website",  label: "Your Website", type: "url",    hint: "yourmenu.com" },
      { key: "table",    label: "Table Number", type: "number", hint: "e.g. 5" },
      { key: "section",  label: "Section",      type: "text",   hint: "e.g. Ground Floor" },
    ],
  },
  {
    id: "event_pass",
    name: "Event / Ticket",
    icon: "ticket-outline",
    color: "#8B5CF6",
    emoji: "🎟️",
    tagline: "Entry pass or RSVP link",
    desc: "A scannable ticket QR with attendee name and ticket code.",
    template: "https://{{website}}/entry?name={{name}}&ticket={{ticket_id}}&gate={{gate}}",
    fields: [
      { key: "website",   label: "Event Website", type: "url",  hint: "event.example.com" },
      { key: "name",      label: "Attendee Name", type: "text", hint: "Full name" },
      { key: "ticket_id", label: "Ticket Code",   type: "text", hint: "e.g. TKT-001" },
      { key: "gate",      label: "Gate / Hall",   type: "text", hint: "e.g. Gate A" },
    ],
  },
  {
    id: "redirect",
    name: "Smart Link",
    icon: "arrow-forward-circle-outline",
    color: "#3B82F6",
    emoji: "🔗",
    tagline: "Any URL with dynamic params",
    desc: "Pass any data as URL parameters — product IDs, promo codes, tracking tags.",
    template: "https://{{website}}?ref={{ref}}&code={{code}}",
    fields: [
      { key: "website", label: "Base URL",     type: "url",  hint: "yoursite.com/page" },
      { key: "ref",     label: "Source / Ref", type: "text", hint: "e.g. store_entrance" },
      { key: "code",    label: "Promo Code",   type: "text", hint: "e.g. SAVE10" },
    ],
  },
  {
    id: "feedback",
    name: "Feedback Form",
    icon: "star-outline",
    color: "#F97316",
    emoji: "⭐",
    tagline: "Collect reviews in one tap",
    desc: "Direct customers to your review page with location or order info pre-filled.",
    template: "https://{{website}}/review?location={{location}}&order={{order_id}}",
    fields: [
      { key: "website",   label: "Review URL",    type: "url",  hint: "yoursite.com/review" },
      { key: "location",  label: "Location",      type: "text", hint: "e.g. Main Branch" },
      { key: "order_id",  label: "Order / Table", type: "text", hint: "e.g. T12 or ORD-99" },
    ],
  },
];

export function uid(): string {
  return Math.random().toString(36).slice(2, 8);
}

export function buildOutput(template: string, fields: CustomField[], values: Record<string, string>): string {
  if (!template) return "";
  let out = template;
  for (const f of fields) {
    out = out.replaceAll(`{{${f.key}}}`, values[f.key] ?? "");
  }
  return out;
}

export function parseTemplateTokens(template: string, fields: CustomField[], colors: any): ReactNode[] | null {
  if (!template) return null;
  const parts: ReactNode[] = [];
  const regex = /\{\{(\w+)\}\}/g;
  let last = 0;
  let match;
  let i = 0;
  while ((match = regex.exec(template)) !== null) {
    if (match.index > last) {
      parts.push(
        <Text key={`txt-${i}`} style={{ color: colors.textSecondary, fontSize: 12, fontFamily: "Inter_400Regular" }}>
          {template.slice(last, match.index)}
        </Text>
      );
    }
    const key = match[1];
    const field = fields.find(f => f.key === key);
    const ftColor = field ? (FIELD_TYPE_MAP[field.type]?.color ?? colors.primary) : colors.danger;
    parts.push(
      <Text key={`tok-${i}`} style={{
        color: ftColor,
        fontFamily: "Inter_700Bold",
        fontSize: 12,
        backgroundColor: ftColor + "18",
        borderRadius: 4,
        paddingHorizontal: 4,
        paddingVertical: 1,
        overflow: "hidden",
      }}>
        {`{{${key}}}`}
      </Text>
    );
    last = match.index + match[0].length;
    i++;
  }
  if (last < template.length) {
    parts.push(
      <Text key="txt-end" style={{ color: colors.textSecondary, fontSize: 12, fontFamily: "Inter_400Regular" }}>
        {template.slice(last)}
      </Text>
    );
  }
  return parts;
}
