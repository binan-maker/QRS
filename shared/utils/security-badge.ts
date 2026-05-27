import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";

interface SecurityBadge {
  icon: ComponentProps<typeof Ionicons>["name"];
  label: string;
  color: string;
}

export function getSecurityBadge(content: string): SecurityBadge {
  if (content.startsWith("upi://"))          return { icon: "shield-checkmark", label: "UPI Verified — NPCI Compliant", color: "#10B981" };
  if (content.startsWith("MECARD:"))         return { icon: "person",           label: "MeCard — Quick Contact",        color: "#3B82F6" };
  if (content.startsWith("BEGIN:VCARD"))     return { icon: "person",           label: "vCard 3.0 Contact",             color: "#3B82F6" };
  if (content.startsWith("BEGIN:VCALENDAR")) return { icon: "calendar",         label: "Calendar Event (iCal)",         color: "#8B5CF6" };
  if (content.startsWith("WIFI:"))           return { icon: "wifi",             label: "WiFi Credentials Encoded",      color: "#F59E0B" };
  if (content.startsWith("tel:"))            return { icon: "call",             label: "Phone Direct-Dial",             color: "#14B8A6" };
  if (content.startsWith("mailto:"))         return { icon: "mail",             label: "Email Direct-Open",             color: "#EC4899" };
  if (content.startsWith("geo:"))            return { icon: "location",         label: "GPS Coordinates",               color: "#EF4444" };
  if (content.startsWith("https://maps.google.com")) return { icon: "map",     label: "Google Maps Link",              color: "#34A853" };
  if (content.startsWith("https://"))        return { icon: "lock-closed",      label: "Secure Link (HTTPS)",           color: "#10B981" };
  if (content.startsWith("http://"))         return { icon: "warning",          label: "Insecure Link (HTTP)",          color: "#F59E0B" };
  return                                            { icon: "document-text",    label: "Custom Data",                   color: "#6366F1" };
}
