import { getDetailContentType } from "./type-detection";

export function getDetailDisplayTitle(item: any): string {
  const contentType = getDetailContentType(item);
  const displayDest = item.displayDestination as string | null;
  const content = (item.content as string) || "";
  const src = displayDest || content;
  switch (contentType) {
    case "phone":
    case "mobilepay":
    case "grab": {
      const num = src.replace(/^tel:/, "").trim();
      return num || "Phone Number";
    }
    case "wifi": {
      const ssid = src.match(/S:([^;]+)/)?.[1];
      return ssid ? `Wi-Fi: ${ssid}` : "Wi-Fi Network";
    }
    case "upi":
    case "scantopay":
    case "bharatqr": {
      if (src.startsWith("upi://pay?")) {
        try {
          const params = new URLSearchParams(src.replace("upi://pay?", ""));
          const pn = params.get("pn");
          const pa = params.get("pa");
          if (pn) return decodeURIComponent(pn);
          if (pa) return pa;
        } catch {}
      }
      if (/^[\w.\-+]+@[\w]+$/.test(src)) return src;
      return "UPI Payment";
    }
    case "event":
    case "calendar": {
      const title = src.match(/SUMMARY:([^\r\n]+)/)?.[1]?.trim();
      return title || "Calendar Event";
    }
    case "contact": {
      const fn = src.match(/FN:([^\r\n]+)/)?.[1]?.trim();
      return fn || "Contact Card";
    }
    case "sms": {
      const phone = src.replace(/^SMSTO?:/i, "").split(":")[0].trim();
      return phone ? `SMS to ${phone}` : "SMS";
    }
    case "email": {
      const address = src.replace(/^mailto:/i, "").split("?")[0].trim();
      return address || "Email";
    }
    case "whatsapp": {
      try {
        const u = new URL(src.startsWith("http") ? src : `https://${src}`);
        if (u.hostname === "wa.me" || u.hostname === "api.whatsapp.com") {
          const phone = "+" + u.pathname.replace(/^\//, "");
          return phone || "WhatsApp";
        }
      } catch {}
      if (/^\+?[\d]{7,15}$/.test(src.replace(/[\s\-()]/g, ""))) return src;
      return "WhatsApp";
    }
    case "instagram": {
      const parts = src.replace(/\/$/, "").split("/");
      const handle = parts[parts.length - 1] || "";
      if (handle && !handle.includes(".")) return "@" + handle;
      return "Instagram";
    }
    case "twitter": {
      const parts = src.replace(/\/$/, "").split("/");
      const handle = parts[parts.length - 1] || "";
      if (handle && !handle.includes(".")) return "@" + handle;
      return "Twitter / X";
    }
    case "telegram": {
      const parts = src.replace(/\/$/, "").split("/");
      const handle = parts[parts.length - 1] || "";
      if (handle && !handle.includes(".")) return "@" + handle;
      return "Telegram";
    }
    case "tiktok": {
      const handle = src.replace(/.*tiktok\.com\/@?/, "").replace(/\/$/, "");
      if (handle) return "@" + handle.replace(/^@/, "");
      return "TikTok";
    }
    case "youtube": {
      try {
        const u = new URL(src.startsWith("http") ? src : `https://${src}`);
        const parts = u.pathname.replace(/\/$/, "").split("/").filter(Boolean);
        const special = ["c", "channel", "user"];
        const name = special.includes(parts[0]) ? parts[1] || parts[0] : parts[0];
        if (name) return "@" + name.replace(/^@/, "");
      } catch {}
      return "YouTube Channel";
    }
    case "linkedin": {
      const parts = src.replace(/\/$/, "").split("/").filter(Boolean);
      const last = parts[parts.length - 1];
      if (last && !last.includes(".")) return last;
      return "LinkedIn Profile";
    }
    case "facebook": {
      try {
        const u = new URL(src.startsWith("http") ? src : `https://${src}`);
        const parts = u.pathname.replace(/\/$/, "").split("/").filter(Boolean);
        const last = parts[parts.length - 1];
        if (last && !last.includes(".") && last !== "pages" && last !== "groups") return last;
      } catch {}
      return "Facebook Page";
    }
    case "spotify": {
      try {
        const u = new URL(src.startsWith("http") ? src : `https://${src}`);
        const parts = u.pathname.replace(/\/$/, "").split("/").filter(Boolean);
        if (parts[1]) return parts[1];
      } catch {}
      return "Spotify";
    }
    case "discord":
      return "Discord Server";
    case "snapchat": {
      const parts = src.replace(/\/$/, "").split("/").filter(Boolean);
      const last = parts[parts.length - 1];
      if (last && !last.includes(".")) return "@" + last.replace(/^@/, "");
      return "Snapchat";
    }
    case "zoom": {
      if (src.includes("zoom.us/j/"))
        return "Meeting " + (src.split("/j/")[1]?.split("?")[0] || "");
      return "Zoom Meeting";
    }
    case "calendly": {
      try {
        const u = new URL(src.startsWith("http") ? src : `https://${src}`);
        const parts = u.pathname.replace(/\/$/, "").split("/").filter(Boolean);
        if (parts[0]) return "Calendly: " + parts[0];
      } catch {}
      return "Calendly";
    }
    case "reviewpage":
    case "googlereview":
      return "Google Review Page";
    case "menucatalogue":
    case "restaurantmenu":
      return "Menu / Catalogue";
    case "donation":
      return "Donation Link";
    case "paypal": {
      const me = src.match(/paypal\.me\/([^/?#]+)/i);
      if (me) return "PayPal: " + me[1];
      return "PayPal";
    }
    case "venmo": {
      const me = src.match(/venmo\.com\/(?:u\/)?([^/?#]+)/i);
      if (me) return "Venmo: " + me[1];
      return "Venmo";
    }
    case "razorpay":
    case "paymentlink": {
      try { return new URL(src.startsWith("http") ? src : `https://${src}`).hostname.replace(/^www\./, ""); } catch {}
      return "Payment Link";
    }
    case "appdownload":
      return "App Download";
  }
  if (src) {
    const isGuardOrGo = src.includes("/guard/") || src.includes("/go/");
    const withScheme = src.startsWith("http") ? src : `https://${src}`;
    try {
      const u = new URL(withScheme);
      const h = u.hostname.replace(/^www\./, "");
      const isLocal = /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.|127\.|localhost)/.test(h);
      if (!isLocal && !isGuardOrGo) return h;
    } catch {}
    if (!isGuardOrGo) return src.length > 45 ? src.slice(0, 45) + "…" : src;
  }
  return "QR Code";
}
