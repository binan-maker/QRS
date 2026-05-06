import type { KeyboardTypeOptions } from "react-native";

export function buildQrContent(presetIdx: number, value: string, extra: Record<string, string>): string {
  const v = value.trim();
  if (!v) return "";
  switch (presetIdx) {
    case 0: return v;
    case 1: return v.startsWith("http") ? v : `https://${v}`;
    case 2: return `mailto:${v}`;
    case 3: return `tel:${v.replace(/\s/g, "")}`;
    case 4: {
      const cleanPhone = v.replace(/\s/g, "");
      const msg = extra.message?.trim() || "";
      return msg ? `SMSTO:${cleanPhone}:${msg}` : `SMSTO:${cleanPhone}`;
    }
    case 5: {
      const cleanPhone = v.replace(/[\s\-()]/g, "");
      const msg = extra.message?.trim() || "";
      const base = `https://wa.me/${cleanPhone.replace(/^\+/, "")}`;
      return msg ? `${base}?text=${encodeURIComponent(msg)}` : base;
    }
    case 6: {
      const ssid = v;
      const password = extra.password?.trim() || "";
      const enc = extra.encryption?.trim().toUpperCase() || "WPA";
      const hidden = extra.hidden?.trim().toLowerCase() === "true" ? "true" : "false";
      return `WIFI:T:${enc};S:${ssid};P:${password};H:${hidden};;`;
    }
    case 7: {
      const vpa = v;
      const name = extra.name?.trim() || "";
      const amount = extra.amount?.trim() || "";
      let url = `upi://pay?pa=${encodeURIComponent(vpa)}`;
      if (name) url += `&pn=${encodeURIComponent(name)}`;
      if (amount) url += `&am=${amount}&cu=INR`;
      return url;
    }
    case 8: {
      const lat = v;
      const lon = extra.lon?.trim() || "";
      const label = extra.label?.trim() || "";
      if (!lon) return `geo:${lat}`;
      return label ? `geo:${lat},${lon}?q=${encodeURIComponent(label)}` : `geo:${lat},${lon}`;
    }
    case 9: {
      const name = v;
      const phone = extra.phone?.trim() || "";
      const email = extra.email?.trim() || "";
      const org = extra.org?.trim() || "";
      const url = extra.url?.trim() || "";
      let vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\nN:${name};;;;\n`;
      if (phone) vcard += `TEL:${phone}\n`;
      if (email) vcard += `EMAIL:${email}\n`;
      if (org) vcard += `ORG:${org}\n`;
      if (url) vcard += `URL:${url}\n`;
      vcard += `END:VCARD`;
      return vcard;
    }
    case 10: {
      const coin = extra.coin?.trim().toLowerCase() || "bitcoin";
      const amount = extra.amount?.trim() || "";
      return amount ? `${coin}:${v}?amount=${amount}` : `${coin}:${v}`;
    }
    case 11: return `https://instagram.com/${v.replace(/^@/, "")}`;
    case 12: return `https://twitter.com/${v.replace(/^@/, "")}`;
    case 13: return v.startsWith("http") ? v : `https://${v}`;
    case 14: return v.startsWith("http") ? v : `https://${v}`;
    case 15: {
      if (v.startsWith("@")) return `https://t.me/${v.slice(1)}`;
      if (v.startsWith("+") || /^\d/.test(v)) return `https://t.me/${encodeURIComponent(v)}`;
      if (v.startsWith("http")) return v;
      return `https://t.me/${v}`;
    }
    case 16: return v.startsWith("http") ? v : `https://${v}`;
    case 17: return v.startsWith("http") ? v : `https://facebook.com/${v}`;
    case 18: {
      const username = v.replace(/^@/, "").replace(/^https?:\/\/paypal\.me\//i, "");
      const amount = extra.amount?.trim() || "";
      return amount ? `https://paypal.me/${username}/${amount}` : `https://paypal.me/${username}`;
    }
    case 19: {
      const username = v.replace(/^@/, "");
      const amount = extra.amount?.trim() || "";
      const note = extra.note?.trim() || "";
      let url = `https://venmo.com/${username}`;
      const params: string[] = [];
      if (amount) params.push(`txn=pay&amount=${amount}`);
      if (note) params.push(`note=${encodeURIComponent(note)}`);
      if (params.length) url += `?${params.join("&")}`;
      return url;
    }
    case 20: {
      const cleanPhone = v.replace(/[\s\-()]/g, "");
      return `https://grab.onelink.me/2695613898?af_dp=grab%3A%2F%2Fopen%3FscreenType%3DTRANSFER%26phone%3D${encodeURIComponent(cleanPhone)}`;
    }
    case 21: {
      const meetingId = v.replace(/\s/g, "");
      const password = extra.password?.trim() || "";
      return password
        ? `https://zoom.us/j/${meetingId}?pwd=${encodeURIComponent(password)}`
        : `https://zoom.us/j/${meetingId}`;
    }
    case 22: {
      const title = v;
      const start = extra.start?.trim() || "";
      const end = extra.end?.trim() || "";
      const location = extra.location?.trim() || "";
      const description = extra.description?.trim() || "";
      let cal = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:${title}\n`;
      if (start) cal += `DTSTART:${start}\n`;
      if (end) cal += `DTEND:${end}\n`;
      if (location) cal += `LOCATION:${location}\n`;
      if (description) cal += `DESCRIPTION:${description}\n`;
      cal += `END:VEVENT\nEND:VCALENDAR`;
      return cal;
    }
    case 23: return v.startsWith("http") ? v : `https://${v}`;
    case 24: {
      const name = extra.name?.trim() || "";
      const amount = extra.amount?.trim() || "";
      const ifsc = extra.ifsc?.trim() || "";
      const account = extra.account?.trim() || "";
      const mobile = extra.mobile?.trim() || "";
      let url = `upi://pay?pa=${encodeURIComponent(v)}`;
      if (name) url += `&pn=${encodeURIComponent(name)}`;
      if (amount) url += `&am=${amount}&cu=INR`;
      if (ifsc) url += `&bn=${encodeURIComponent(ifsc)}`;
      if (account) url += `&ac=${encodeURIComponent(account)}`;
      if (mobile) url += `&mc=${encodeURIComponent(mobile.replace(/[\s\-()]/g, ""))}`;
      url += `&mode=02&purpose=00`;
      return url;
    }
    case 25: {
      const base = v.startsWith("http") ? v : `https://${v}`;
      return base;
    }
    case 26: {
      const base = v.startsWith("http") ? v : `https://${v}`;
      const table = extra.table?.trim() || "";
      return table ? `${base}?table=${encodeURIComponent(table)}` : base;
    }
    case 27: {
      const base = v.startsWith("http") ? v : `https://${v}`;
      return base;
    }
    default: return v;
  }
}

export function getRawContent(presetIdx: number, value: string, extra: Record<string, string>): string {
  const v = value.trim();
  switch (presetIdx) {
    case 2: return v;
    case 3: return v;
    case 4: return v;
    case 5: return v;
    case 11: return `https://instagram.com/${v.replace(/^@/, "")}`;
    case 12: return `https://twitter.com/${v.replace(/^@/, "")}`;
    case 18: return `https://paypal.me/${v.replace(/^@/, "")}`;
    case 19: return `https://venmo.com/${v.replace(/^@/, "")}`;
    default: return buildQrContent(presetIdx, value, extra);
  }
}

export function filterByKeyboardType(text: string, keyboardType: KeyboardTypeOptions): string {
  if (keyboardType === "phone-pad") {
    return text.replace(/[^\d+\s\-().]/g, "");
  }
  if (keyboardType === "number-pad" || keyboardType === "numeric") {
    return text.replace(/[^\d]/g, "");
  }
  if (keyboardType === "decimal-pad") {
    const filtered = text.replace(/[^\d.]/g, "");
    const parts = filtered.split(".");
    if (parts.length > 2) return parts[0] + "." + parts.slice(1).join("");
    return filtered;
  }
  return text;
}

export function validateQrInput(presetIdx: number, value: string, extra: Record<string, string>): string | null {
  const v = value.trim();
  if (!v) {
    const labels: Record<number, string> = {
      0: "Please type some text first.",
      1: "Please enter a URL (e.g. example.com).",
      2: "Please enter an email address (e.g. name@example.com).",
      3: "Please enter a phone number with country code (e.g. +91 9876543210).",
      4: "Please enter the recipient's phone number.",
      5: "Please enter the recipient's WhatsApp number.",
      6: "Please enter the WiFi network name (SSID).",
      7: "Please enter the UPI VPA (e.g. merchant@upi).",
      8: "Please enter a latitude value.",
      9: "Please enter the contact's full name.",
      10: "Please enter the cryptocurrency wallet address.",
      11: "Please enter your Instagram username.",
      12: "Please enter your Twitter / X username.",
      13: "Please enter your YouTube channel or video URL.",
      14: "Please enter your LinkedIn profile URL.",
      15: "Please enter your Telegram username or phone number.",
      16: "Please enter a Spotify link.",
      17: "Please enter your Facebook profile or page URL.",
      18: "Please enter your PayPal.me username.",
      19: "Please enter your Venmo username.",
      20: "Please enter the phone number with country code (e.g. +65 91234567).",
      21: "Please enter the Zoom meeting ID.",
      22: "Please enter the event title.",
      23: "Please enter the app download URL.",
      24: "Please enter the BharatQR UPI VPA (e.g. merchant@upi).",
      25: "Please paste your Google Review link.",
      26: "Please enter your menu URL.",
      27: "Please enter the donation/payment link.",
    };
    return labels[presetIdx] ?? "Please enter some content first.";
  }
  switch (presetIdx) {
    case 1: {
      const withScheme = v.startsWith("http") ? v : `https://${v}`;
      try {
        const url = new URL(withScheme);
        if (!url.hostname.includes(".") || url.hostname.length < 4) return "Please enter a valid URL (e.g. https://example.com).";
      } catch {
        return "Please enter a valid URL (e.g. https://example.com).";
      }
      return null;
    }
    case 2:
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v))
        return "Invalid email address. Please enter a valid one (e.g. name@example.com).";
      return null;
    case 3:
      if (!/^[+\d][\d\s\-().]{5,19}$/.test(v))
        return "Please enter a valid phone number with country code (e.g. +91 9876543210).";
      return null;
    case 4:
      if (!/^[+\d][\d\s\-().]{5,19}$/.test(v))
        return "Please enter a valid phone number for the SMS recipient (e.g. +91 9876543210).";
      return null;
    case 5: {
      const cleaned = v.replace(/[\s\-()]/g, "");
      if (!/^\+?\d{7,15}$/.test(cleaned))
        return "Please enter a valid WhatsApp number with country code (e.g. +91 9876543210).";
      return null;
    }
    case 6:
      if (v.length < 1) return "Please enter the WiFi network name (SSID).";
      return null;
    case 7:
      if (!/^[\w.\-+]+@[\w]+$/.test(v))
        return "Please enter a valid UPI VPA (e.g. merchant@upi or 9876543210@paytm).";
      if (!extra.name?.trim()) return "Please enter the payee name for the UPI payment.";
      return null;
    case 8: {
      const lat = parseFloat(v);
      if (isNaN(lat) || lat < -90 || lat > 90)
        return "Latitude must be a number between -90 and 90 (e.g. 12.9716).";
      const lon = parseFloat(extra.lon || "");
      if (!extra.lon?.trim() || isNaN(lon) || lon < -180 || lon > 180)
        return "Please enter a valid longitude between -180 and 180 (e.g. 77.5946).";
      return null;
    }
    case 9:
      if (!extra.phone?.trim())
        return "Please enter at least a phone number for the contact.";
      return null;
    case 10:
      if (v.length < 20)
        return "Please enter a valid cryptocurrency wallet address (at least 20 characters).";
      return null;
    case 11:
      if (!/^@?[\w.]{1,30}$/.test(v))
        return "Please enter a valid Instagram username (letters, numbers, dots, underscores).";
      return null;
    case 12:
      if (!/^@?[\w]{1,15}$/.test(v))
        return "Please enter a valid Twitter / X username (letters, numbers, underscores — max 15).";
      return null;
    default: return null;
  }
}
