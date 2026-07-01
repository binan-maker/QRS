import type { BusinessCategory } from "@/features/generator/components/BusinessTypeSelector";

export function buildBusinessContent(
  inputValue: string,
  businessCategory: BusinessCategory,
  extraFields: Record<string, string>,
): string | null {
  const v = inputValue.trim();
  if (!v) return null;

  switch (businessCategory) {
    case "website":
      return v.startsWith("http") ? v : `https://${v}`;

    case "whatsapp": {
      const phone = v.replace(/[\s\-()]/g, "").replace(/^\+/, "");
      const msg = extraFields.message?.trim() || "";
      return msg
        ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
        : `https://wa.me/${phone}`;
    }

    case "upi": {
      const params = new URLSearchParams({ pa: v, cu: "INR" });
      const name   = extraFields.name?.trim();
      const amount = extraFields.amount?.trim();
      const note   = extraFields.note?.trim();
      if (name)   params.set("pn", name);
      if (amount) params.set("am", amount);
      if (note)   params.set("tn", note);
      return `upi://pay?${params.toString()}`;
    }

    case "wifi": {
      const security = extraFields.security?.trim() || "WPA";
      const password = extraFields.password?.trim() || "";
      const secType  = security === "Open" ? "nopass" : security;
      return `WIFI:T:${secType};S:${v};P:${password};;`;
    }

    case "event": {
      const startDateStr = (extraFields.startDate ?? extraFields.date ?? "").trim();
      const endDateStr   = (extraFields.endDate   ?? extraFields.date ?? startDateStr).trim();
      const startH = String(extraFields.startHour ?? "9").padStart(2, "0");
      const startM = String(extraFields.startMin  ?? "0").padStart(2, "0");
      const endH   = String(extraFields.endHour   ?? "10").padStart(2, "0");
      const endM   = String(extraFields.endMin    ?? "0").padStart(2, "0");
      const location = extraFields.location?.trim() || "";
      if (startDateStr) {
        const ds = startDateStr.replace(/-/g, "");
        const de = endDateStr ? endDateStr.replace(/-/g, "") : ds;
        const lines = [
          "BEGIN:VCALENDAR", "VERSION:2.0", "BEGIN:VEVENT",
          `SUMMARY:${v}`,
          `DTSTART:${ds}T${startH}${startM}00`,
          `DTEND:${de}T${endH}${endM}00`,
          location ? `LOCATION:${location}` : "",
          "END:VEVENT", "END:VCALENDAR",
        ].filter(Boolean);
        return lines.join("\r\n");
      }
      return `https://calendar.google.com/calendar/r/eventedit?text=${encodeURIComponent(v)}`;
    }

    case "phone": {
      const cleaned = v.replace(/[\s\-()]/g, "");
      return `tel:${cleaned}`;
    }

    default:
      return v.startsWith("http") ? v : `https://${v}`;
  }
}

export function validateBusinessInput(
  inputValue: string,
  businessCategory: BusinessCategory,
): string | null {
  const v = inputValue.trim();
  if (!v) return "Please fill in the required field.";

  if (businessCategory === "whatsapp" || businessCategory === "phone") {
    const clean = v.replace(/[\s\-()]/g, "");
    if (!/^\+?\d{7,15}$/.test(clean))
      return "Please enter a valid phone number with country code (e.g. +91 9876543210).";
    return null;
  }

  if (businessCategory === "upi") {
    if (!/^[\w.\-+]+@[\w]+$/.test(v) && !/^\d{10,12}@/.test(v))
      return "Please enter a valid UPI ID (e.g. name@upi or 9876543210@paytm).";
    return null;
  }

  if (businessCategory === "wifi" || businessCategory === "event") return null;

  const withScheme = v.startsWith("http") ? v : `https://${v}`;
  try {
    const url = new URL(withScheme);
    if (!url.hostname.includes(".") || url.hostname.length < 4) return "Please enter a valid URL.";
  } catch {
    return "Please enter a valid URL.";
  }
  return null;
}

export function getBusinessContentType(category: BusinessCategory): string {
  switch (category) {
    case "website":  return "url";
    case "whatsapp": return "whatsapp";
    case "upi":      return "upi";
    case "wifi":     return "wifi";
    case "event":    return "event";
    case "phone":    return "phone";
    default:         return "url";
  }
}
