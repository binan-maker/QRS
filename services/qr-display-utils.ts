// ─── QR Display Utilities ────────────────────────────────────────────────────
// Derives display title and structured content rows from a QR item.
// Used by both MyQrDetailScreen and any other owner-facing detail views.
// No database access, no side-effects.

export interface ContentDetailRow {
  label: string;
  value: string;
  icon: string;
}

const GENERIC_STORED = new Set(["text", "url", "link", "biolink", "social"]);

export function getDetailContentType(item: any): string {
  const stored = (item.contentType as string) || "text";
  const templateKey = (item.templateKey as string) || "";
  // templateKey is the authoritative generator label — prefer it when non-generic.
  if (templateKey && !GENERIC_STORED.has(templateKey)) return templateKey;
  // Non-generic stored type wins next.
  if (stored && !GENERIC_STORED.has(stored)) return stored;
  const displayDest = item.displayDestination as string | null;
  const content = (item.content as string) || "";
  const src = displayDest || content;
  if (!src) return stored;
  if (src.startsWith("tel:")) return "phone";
  if (src.startsWith("WIFI:")) return "wifi";
  if (src.startsWith("upi://")) return "upi";
  if (src.startsWith("BEGIN:VCALENDAR") || src.startsWith("BEGIN:VEVENT")) return "event";
  if (src.startsWith("BEGIN:VCARD")) return "contact";
  if (src.startsWith("SMSTO:") || src.startsWith("sms:")) return "sms";
  if (src.startsWith("mailto:")) return "email";
  if (/^bitcoin:|^ethereum:|^litecoin:|^solana:/.test(src)) return "crypto";
  if (src.includes("wa.me") || src.includes("whatsapp.com")) return "whatsapp";
  if (src.includes("instagram.com") || src.includes("instagr.am")) return "instagram";
  if (src.includes("twitter.com") || src.includes("x.com/")) return "twitter";
  if (src.includes("youtube.com") || src.includes("youtu.be")) return "youtube";
  if (src.includes("linkedin.com")) return "linkedin";
  if (src.includes("t.me/") || src.includes("telegram.me/")) return "telegram";
  if (src.includes("facebook.com") || src.includes("fb.com")) return "facebook";
  if (src.includes("open.spotify.com")) return "spotify";
  if (src.includes("discord.gg") || src.includes("discord.com")) return "discord";
  if (src.includes("tiktok.com")) return "tiktok";
  if (src.includes("paypal.me") || src.includes("paypal.com/paypalme")) return "paypal";
  if (src.includes("venmo.com")) return "venmo";
  if (src.includes("zoom.us")) return "zoom";
  if (src.includes("calendly.com")) return "calendly";
  if (
    src.includes("maps.google.com") ||
    src.includes("goo.gl/maps") ||
    src.includes("maps.app.goo.gl")
  )
    return "location";
  if (
    src.includes("apps.apple.com") ||
    src.includes("play.google.com") ||
    src.includes("appstore.com")
  )
    return "appdownload";
  if (
    src.includes("rzp.io") ||
    src.includes("razorpay.com") ||
    src.includes("paytm.com/pay")
  )
    return "paymentlink";
  if (
    /^[\w.\-+]+@[\w]{2,}$/.test(src) &&
    !/\.(com|in|org|net|io|co|app)$/.test(src.split("@")[1] || "")
  )
    return "upi";
  if (/^\+?[\d]{7,15}$/.test(src.replace(/[\s\-()]/g, ""))) return "phone";
  const withScheme = src.startsWith("http") ? src : `https://${src}`;
  try {
    const u = new URL(withScheme);
    const h = u.hostname;
    if (
      h.includes(".") &&
      h.length >= 4 &&
      !/^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.|127\.|localhost)/.test(h) &&
      !u.pathname.startsWith("/guard/") &&
      !u.pathname.startsWith("/go/")
    )
      return "url";
  } catch {}
  return stored;
}

export function getDetailDisplayTitle(item: any): string {
  if (item.businessName) return item.businessName;
  const lbl = item.label as string | null;
  if (lbl) return lbl;
  const contentType = getDetailContentType(item);
  const displayDest = item.displayDestination as string | null;
  const content = (item.content as string) || "";
  const src = displayDest || content;
  switch (contentType) {
    case "phone":
    case "mobilepay":
    case "grab":
      return src.replace(/^tel:/, "").trim();
    case "wifi": {
      const m = src.match(/S:([^;]+)/);
      if (m) return m[1];
      break;
    }
    case "upi":
    case "scantopay":
    case "bharatqr": {
      if (src.startsWith("upi://pay?")) {
        try {
          const pa = new URLSearchParams(src.replace("upi://pay?", "")).get("pa");
          if (pa) return pa;
        } catch {}
      }
      if (/^[\w.\-+]+@[\w]+$/.test(src)) return src;
      break;
    }
    case "event":
    case "calendar": {
      if (src.startsWith("BEGIN:")) {
        const m = src.match(/SUMMARY:([^\r\n]+)/);
        if (m) return m[1].trim();
      }
      break;
    }
    case "contact": {
      const m = src.match(/FN:([^\r\n]+)/);
      if (m) return m[1].trim();
      break;
    }
    case "sms":
      return src.replace(/^SMSTO?:/i, "").split(":")[0].trim();
    case "email":
      return "Email QR Code";
    case "whatsapp": {
      try {
        const u = new URL(src.startsWith("http") ? src : `https://${src}`);
        if (u.hostname === "wa.me" || u.hostname === "api.whatsapp.com") {
          const phone = u.pathname.replace(/^\//, "");
          if (phone) return "+" + phone;
        }
      } catch {}
      break;
    }
    case "instagram":
    case "twitter":
    case "telegram": {
      const parts = src.replace(/\/$/, "").split("/");
      const handle = parts[parts.length - 1] || "";
      if (handle && !handle.includes(".")) return "@" + handle;
      break;
    }
    case "tiktok": {
      const handle = src.replace(/.*tiktok\.com\/@?/, "").replace(/\/$/, "");
      if (handle) return "@" + handle.replace(/^@/, "");
      break;
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

export function parseQrContentDetails(item: any): ContentDetailRow[] {
  const contentType = getDetailContentType(item);
  const displayDest = item.displayDestination as string | null;
  const content = (item.content as string) || "";
  const src = displayDest || content;
  if (!src) return [];
  const isGuardOrGo = src.includes("/guard/") || src.includes("/go/");
  switch (contentType) {
    case "phone":
    case "mobilepay":
    case "grab": {
      const num = src.replace(/^tel:/, "").trim();
      if (!num || isGuardOrGo) return [];
      return [{ label: "Phone Number", value: num, icon: "call-outline" }];
    }
    case "wifi": {
      if (!src.startsWith("WIFI:")) return [];
      const ssid = src.match(/S:([^;]+)/)?.[1] || "";
      const sec = src.match(/T:([^;]+)/)?.[1] || "WPA";
      const hidden = src.includes("H:true");
      const rows: ContentDetailRow[] = [];
      if (ssid) rows.push({ label: "Network (SSID)", value: ssid, icon: "wifi-outline" });
      rows.push({ label: "Security", value: sec === "nopass" ? "Open" : sec, icon: "shield-outline" });
      if (hidden) rows.push({ label: "Hidden Network", value: "Yes", icon: "eye-off-outline" });
      return rows;
    }
    case "upi":
    case "scantopay":
    case "bharatqr": {
      if (src.startsWith("upi://pay?")) {
        try {
          const params = new URLSearchParams(src.replace("upi://pay?", ""));
          const rows: ContentDetailRow[] = [];
          const pa = params.get("pa");
          const pn = params.get("pn");
          const am = params.get("am");
          if (pa) rows.push({ label: "UPI ID", value: pa, icon: "card-outline" });
          if (pn) rows.push({ label: "Payee Name", value: pn, icon: "person-outline" });
          if (am) rows.push({ label: "Amount", value: "₹" + am, icon: "cash-outline" });
          if (rows.length > 0) return rows;
        } catch {}
      }
      if (/^[\w.\-+]+@[\w]+$/.test(src))
        return [{ label: "UPI ID", value: src, icon: "card-outline" }];
      return [];
    }
    case "event":
    case "calendar": {
      if (!src.startsWith("BEGIN:")) return [];
      const title = src.match(/SUMMARY:([^\r\n]+)/)?.[1]?.trim() || "";
      const start = src.match(/DTSTART:([^\r\n]+)/)?.[1]?.trim() || "";
      const loc = src.match(/LOCATION:([^\r\n]+)/)?.[1]?.trim() || "";
      const desc = src.match(/DESCRIPTION:([^\r\n]+)/)?.[1]?.trim() || "";
      const rows: ContentDetailRow[] = [];
      if (title) rows.push({ label: "Event Title", value: title, icon: "calendar-outline" });
      if (start) {
        const ds = start.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2}).*/, "$3/$2/$1 $4:$5");
        rows.push({ label: "Start", value: ds, icon: "time-outline" });
      }
      if (loc) rows.push({ label: "Location", value: loc, icon: "location-outline" });
      if (desc)
        rows.push({
          label: "Description",
          value: desc.length > 60 ? desc.slice(0, 60) + "…" : desc,
          icon: "document-text-outline",
        });
      return rows;
    }
    case "contact": {
      if (!src.startsWith("BEGIN:VCARD")) return [];
      const fn = src.match(/FN:([^\r\n]+)/)?.[1]?.trim() || "";
      const tel = src.match(/TEL[^:]*:([^\r\n]+)/)?.[1]?.trim() || "";
      const mail = src.match(/EMAIL[^:]*:([^\r\n]+)/)?.[1]?.trim() || "";
      const org = src.match(/ORG:([^\r\n]+)/)?.[1]?.trim() || "";
      const url = src.match(/URL:([^\r\n]+)/)?.[1]?.trim() || "";
      const rows: ContentDetailRow[] = [];
      if (fn) rows.push({ label: "Name", value: fn, icon: "person-circle-outline" });
      if (tel) rows.push({ label: "Phone", value: tel, icon: "call-outline" });
      if (mail) rows.push({ label: "Email", value: mail, icon: "mail-outline" });
      if (org) rows.push({ label: "Organisation", value: org, icon: "business-outline" });
      if (url)
        rows.push({ label: "Website", value: url.replace(/^www\./, ""), icon: "link-outline" });
      return rows;
    }
    case "sms": {
      if (!src.startsWith("SMSTO") && !src.startsWith("sms:")) return [];
      const phone = src.replace(/^SMSTO?:/i, "").split(":")[0].trim();
      const msg = src.split(":").slice(2).join(":");
      const rows: ContentDetailRow[] = [];
      if (phone) rows.push({ label: "Phone", value: phone, icon: "chatbubble-outline" });
      if (msg)
        rows.push({
          label: "Message",
          value: msg.length > 60 ? msg.slice(0, 60) + "…" : msg,
          icon: "text-outline",
        });
      return rows;
    }
    case "email": {
      if (!src.startsWith("mailto:")) return [];
      const address = src.replace(/^mailto:/i, "").split("?")[0].trim();
      let subject = "";
      let body = "";
      try {
        const u = new URL(src);
        subject = u.searchParams.get("subject") || "";
        body = u.searchParams.get("body") || "";
      } catch {}
      const rows: ContentDetailRow[] = [];
      if (address) rows.push({ label: "Email Address", value: address, icon: "mail-outline" });
      if (subject) rows.push({ label: "Subject", value: subject, icon: "text-outline" });
      if (body)
        rows.push({
          label: "Body",
          value: body.length > 60 ? body.slice(0, 60) + "…" : body,
          icon: "document-text-outline",
        });
      return rows;
    }
    case "whatsapp": {
      try {
        const u = new URL(src.startsWith("http") ? src : `https://${src}`);
        if (u.hostname === "wa.me" || u.hostname === "api.whatsapp.com") {
          const phone = "+" + u.pathname.replace(/^\//, "");
          const msg = u.searchParams.get("text") || "";
          const rows: ContentDetailRow[] = [
            { label: "WhatsApp Number", value: phone, icon: "logo-whatsapp" },
          ];
          if (msg)
            rows.push({
              label: "Pre-filled Message",
              value: msg.length > 60 ? msg.slice(0, 60) + "…" : msg,
              icon: "text-outline",
            });
          return rows;
        }
      } catch {}
      if (/^\+?[\d]{7,15}$/.test(src.replace(/[\s\-()]/g, "")))
        return [{ label: "WhatsApp Number", value: src, icon: "logo-whatsapp" }];
      return [];
    }
    case "instagram": {
      const parts = src.replace(/\/$/, "").split("/");
      const handle = parts[parts.length - 1] || "";
      if (!handle || handle.includes(".")) return [];
      return [{ label: "Instagram", value: "@" + handle, icon: "logo-instagram" }];
    }
    case "twitter": {
      const parts = src.replace(/\/$/, "").split("/");
      const handle = parts[parts.length - 1] || "";
      if (!handle || handle.includes(".")) return [];
      return [{ label: "Twitter / X", value: "@" + handle, icon: "logo-twitter" }];
    }
    case "telegram": {
      const parts = src.replace(/\/$/, "").split("/");
      const handle = parts[parts.length - 1] || "";
      if (!handle || handle.includes(".")) return [];
      return [{ label: "Telegram", value: "@" + handle, icon: "send-outline" }];
    }
    case "tiktok": {
      const handle = src.replace(/.*tiktok\.com\/@?/, "").replace(/\/$/, "");
      if (!handle) return [];
      return [{ label: "TikTok", value: "@" + handle.replace(/^@/, ""), icon: "musical-note-outline" }];
    }
    case "youtube": {
      const rows: ContentDetailRow[] = [];
      try {
        const u = new URL(src.startsWith("http") ? src : `https://${src}`);
        const channel = u.pathname.replace(/^\/(c\/|channel\/|@)?/, "").replace(/\/$/, "");
        if (channel) rows.push({ label: "Channel", value: channel, icon: "logo-youtube" });
      } catch {}
      if (rows.length === 0) rows.push({ label: "YouTube", value: src, icon: "logo-youtube" });
      return rows;
    }
    case "linkedin": {
      const rows: ContentDetailRow[] = [];
      try {
        const u = new URL(src.startsWith("http") ? src : `https://${src}`);
        const profile = u.pathname.replace(/^\/(in\/|company\/)?/, "").replace(/\/$/, "");
        if (profile) rows.push({ label: "LinkedIn", value: profile, icon: "logo-linkedin" });
      } catch {}
      if (rows.length === 0) rows.push({ label: "LinkedIn", value: src, icon: "logo-linkedin" });
      return rows;
    }
    case "zoom": {
      let meetingId = "";
      if (src.includes("zoom.us/j/")) meetingId = src.split("/j/")[1]?.split("?")[0] || "";
      return meetingId ? [{ label: "Meeting ID", value: meetingId, icon: "videocam-outline" }] : [];
    }
    case "crypto": {
      const coin = src.split(":")[0] || "crypto";
      const address = src.split(":")[1]?.split("?")[0] || "";
      const rows: ContentDetailRow[] = [
        { label: "Coin", value: coin.charAt(0).toUpperCase() + coin.slice(1), icon: "logo-bitcoin" },
      ];
      if (address)
        rows.push({
          label: "Wallet Address",
          value: address.length > 28 ? address.slice(0, 28) + "…" : address,
          icon: "copy-outline",
        });
      return rows;
    }
    case "location": {
      try {
        const u = new URL(src.startsWith("http") ? src : `https://${src}`);
        const q = u.searchParams.get("q") || u.searchParams.get("query") || "";
        if (q) return [{ label: "Location", value: q, icon: "location-outline" }];
      } catch {}
      return [];
    }
    case "url": {
      if (isGuardOrGo) return [];
      try {
        const u = new URL(src.startsWith("http") ? src : `https://${src}`);
        const h = u.hostname.replace(/^www\./, "");
        const isLocal = /^(192\.168\.|10\.|127\.|localhost)/.test(h);
        if (!isLocal) return [{ label: "URL", value: src, icon: "link-outline" }];
      } catch {}
      return [];
    }
    case "text": {
      if (src.length < 500 && !isGuardOrGo)
        return [{ label: "Text Content", value: src, icon: "text-outline" }];
      return [];
    }
    case "calendly": {
      if (isGuardOrGo) return [];
      try {
        const u = new URL(src.startsWith("http") ? src : `https://${src}`);
        const parts = u.pathname
          .replace(/^\//, "")
          .split("/")
          .filter(Boolean);
        const username = parts[0] || "";
        const eventType = parts[1] || "";
        const rows: ContentDetailRow[] = [];
        if (username) rows.push({ label: "Calendly Username", value: username, icon: "person-outline" });
        if (eventType) rows.push({ label: "Event Type", value: eventType, icon: "calendar-outline" });
        if (rows.length > 0) return rows;
      } catch {}
      return [];
    }
    case "paymentlink":
    case "payment": {
      if (isGuardOrGo) return [];
      try {
        const u = new URL(src.startsWith("http") ? src : `https://${src}`);
        const domain = u.hostname.replace(/^www\./, "");
        const rows: ContentDetailRow[] = [{ label: "Payment Page", value: domain, icon: "card-outline" }];
        if (u.pathname && u.pathname !== "/")
          rows.push({ label: "Path", value: u.pathname, icon: "git-branch-outline" });
        return rows;
      } catch {}
      return [];
    }
    case "reviewpage":
    case "googlereview": {
      if (isGuardOrGo) return [];
      try {
        const u = new URL(src.startsWith("http") ? src : `https://${src}`);
        return [{ label: "Review Page", value: u.hostname.replace(/^www\./, ""), icon: "star-outline" }];
      } catch {}
      return [];
    }
    case "restaurantmenu":
    case "menucatalogue": {
      if (isGuardOrGo) return [];
      try {
        const u = new URL(src.startsWith("http") ? src : `https://${src}`);
        return [
          { label: "Menu / Catalogue", value: u.hostname.replace(/^www\./, ""), icon: "list-outline" },
        ];
      } catch {}
      return [];
    }
    case "donation": {
      if (isGuardOrGo) return [];
      try {
        const u = new URL(src.startsWith("http") ? src : `https://${src}`);
        return [{ label: "Donation Page", value: u.hostname.replace(/^www\./, ""), icon: "heart-outline" }];
      } catch {}
      return [];
    }
    case "appdownload":
    case "app": {
      if (isGuardOrGo) return [];
      const isApple = src.includes("apps.apple.com");
      const store = isApple ? "App Store" : "Google Play";
      try {
        const u = new URL(src.startsWith("http") ? src : `https://${src}`);
        const appName =
          u.pathname
            .split("/")
            .filter(Boolean)
            .pop()
            ?.replace(/-/g, " ") || "";
        const rows: ContentDetailRow[] = [{ label: "Store", value: store, icon: "download-outline" }];
        if (appName) rows.push({ label: "App", value: appName, icon: "apps-outline" });
        return rows;
      } catch {}
      return [{ label: "Store", value: store, icon: "download-outline" }];
    }
    case "spotify": {
      try {
        const u = new URL(src.startsWith("http") ? src : `https://${src}`);
        const parts = u.pathname.split("/").filter(Boolean);
        if (parts.length >= 2)
          return [
            {
              label: parts[0].charAt(0).toUpperCase() + parts[0].slice(1),
              value: parts[1].replace(/-/g, " "),
              icon: "musical-notes-outline",
            },
          ];
      } catch {}
      return [];
    }
    case "discord": {
      try {
        const u = new URL(src.startsWith("http") ? src : `https://${src}`);
        const invite = u.pathname.replace(/^\//, "");
        if (invite) return [{ label: "Invite Code", value: invite, icon: "logo-discord" }];
      } catch {}
      return [];
    }
    case "facebook": {
      try {
        const u = new URL(src.startsWith("http") ? src : `https://${src}`);
        const page = u.pathname.replace(/^\//, "").replace(/\/$/, "");
        if (page) return [{ label: "Facebook Page", value: page, icon: "logo-facebook" }];
      } catch {}
      return [];
    }
    case "paypal": {
      try {
        const u = new URL(src.startsWith("http") ? src : `https://${src}`);
        const username = u.pathname.replace(/^\//, "");
        if (username) return [{ label: "PayPal.me", value: username, icon: "wallet-outline" }];
      } catch {}
      return [];
    }
    default:
      return [];
  }
}
