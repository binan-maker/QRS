export interface UrlDisplayField {
  label: string;
  value: string;
  icon: string;
}

export interface WebsiteData {
  protocol: string;
  isSecure: boolean;
  hostname: string;
  path: string;
  hasQuery: boolean;
  queryCount: number;
  fullUrl: string;
}

export function parseWebsite(content: string): WebsiteData | null {
  try {
    const withScheme = content.startsWith("http") ? content : `https://${content}`;
    const u = new URL(withScheme);
    const isPrivate = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(u.hostname);
    const isGuard = u.pathname.startsWith("/guard/") || u.pathname.startsWith("/go/");
    if (isPrivate || isGuard) return null;
    const params = [...u.searchParams];
    return {
      protocol:   u.protocol.replace(":", "").toUpperCase(),
      isSecure:   u.protocol === "https:",
      hostname:   u.hostname.replace(/^www\./, ""),
      path:       u.pathname !== "/" ? u.pathname : "",
      hasQuery:   params.length > 0,
      queryCount: params.length,
      fullUrl:    content.startsWith("http") ? content : `https://${content}`,
    };
  } catch { return null; }
}

export function extractSocialFields(contentType: string, content: string): UrlDisplayField[] {
  const fields: UrlDisplayField[] = [];
  try {
    switch (contentType) {
      case "instagram": {
        const m = content.match(/instagram\.com\/([^/?#\s]+)/);
        if (m?.[1] && m[1] !== "p" && m[1] !== "reel")
          fields.push({ label: "Profile", value: `@${m[1]}`, icon: "person-outline" });
        break;
      }
      case "twitter": {
        const m = content.match(/(?:twitter|x)\.com\/([^/?#\s]+)/);
        if (m?.[1] && !["i", "intent", "home", "explore"].includes(m[1]))
          fields.push({ label: "Username", value: `@${m[1]}`, icon: "person-outline" });
        break;
      }
      case "tiktok": {
        const m = content.match(/tiktok\.com\/@([^/?#\s]+)/);
        if (m?.[1]) fields.push({ label: "Username", value: `@${m[1]}`, icon: "person-outline" });
        break;
      }
      case "snapchat": {
        const m = content.match(/snapchat\.com\/add\/([^/?#\s]+)/);
        if (m?.[1]) fields.push({ label: "Username", value: m[1], icon: "person-outline" });
        break;
      }
      case "youtube": {
        const channel = content.match(/youtube\.com\/@([^/?#\s]+)/)?.[1]
          ?? content.match(/youtube\.com\/channel\/([^/?#\s]+)/)?.[1]
          ?? content.match(/youtube\.com\/c\/([^/?#\s]+)/)?.[1];
        const video = content.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&/?#\s]+)/)?.[1];
        if (channel) fields.push({ label: "Channel", value: `@${channel}`, icon: "play-circle-outline" });
        if (video)   fields.push({ label: "Video ID", value: video, icon: "play-outline" });
        break;
      }
      case "spotify": {
        const track    = content.match(/spotify\.com\/track\/([^/?#\s]+)/)?.[1];
        const album    = content.match(/spotify\.com\/album\/([^/?#\s]+)/)?.[1];
        const playlist = content.match(/spotify\.com\/playlist\/([^/?#\s]+)/)?.[1];
        const artist   = content.match(/spotify\.com\/artist\/([^/?#\s]+)/)?.[1];
        if (track)         fields.push({ label: "Track", value: track, icon: "musical-note-outline" });
        else if (album)    fields.push({ label: "Album", value: album, icon: "disc-outline" });
        else if (playlist) fields.push({ label: "Playlist", value: playlist, icon: "musical-notes-outline" });
        else if (artist)   fields.push({ label: "Artist", value: artist, icon: "person-outline" });
        break;
      }
      case "linkedin": {
        const m = content.match(/linkedin\.com\/(?:in|company|school)\/([^/?#\s]+)/);
        if (m?.[1]) fields.push({ label: "Profile", value: m[1], icon: "person-outline" });
        break;
      }
      case "telegram": {
        const m = content.match(/t\.me\/([^/?#\s]+)/);
        if (m?.[1]) fields.push({ label: "Username", value: `@${m[1]}`, icon: "paper-plane-outline" });
        break;
      }
      case "discord": {
        const m = content.match(/discord\.(?:gg|com\/invite)\/([^/?#\s]+)/);
        if (m?.[1]) fields.push({ label: "Invite", value: m[1], icon: "link-outline" });
        break;
      }
      case "facebook": {
        const u = new URL(content.startsWith("http") ? content : `https://${content}`);
        const path = u.pathname.replace(/^\/|\/$/g, "");
        if (path && !["pages", "groups", "events", "login"].includes(path.split("/")[0]))
          fields.push({ label: "Page", value: path, icon: "person-outline" });
        break;
      }
      case "paypal": {
        const username = content.match(/paypal\.me\/([^/?#\s/]+)/)?.[1];
        const amount   = content.match(/paypal\.me\/[^/]+\/([^/?#\s]+)/)?.[1];
        if (username) fields.push({ label: "Username", value: username, icon: "person-outline" });
        if (amount)   fields.push({ label: "Amount", value: amount, icon: "cash-outline" });
        break;
      }
      case "venmo": {
        const u = new URL(content.startsWith("http") ? content : `https://${content}`);
        const username = u.pathname.replace(/^\/@?|\/$/g, "") || u.searchParams.get("user") || "";
        const amount   = u.searchParams.get("amount") ?? "";
        const note     = u.searchParams.get("note") ?? "";
        if (username) fields.push({ label: "Username", value: `@${username}`, icon: "person-outline" });
        if (amount)   fields.push({ label: "Amount", value: amount, icon: "cash-outline" });
        if (note)     fields.push({ label: "Note", value: note, icon: "document-text-outline" });
        break;
      }
      case "zoom": {
        const meetingId = content.includes("zoom.us/j/") ? content.split("/j/")[1]?.split("?")[0] ?? "" : "";
        let pwd = "";
        try { pwd = new URL(content).searchParams.get("pwd") ?? ""; } catch {}
        if (meetingId) fields.push({ label: "Meeting ID", value: meetingId, icon: "videocam-outline" });
        if (pwd)       fields.push({ label: "Passcode", value: pwd, icon: "key-outline" });
        break;
      }
      case "calendly": {
        const u = new URL(content.startsWith("http") ? content : `https://${content}`);
        const parts = u.pathname.replace(/^\/|\/$/g, "").split("/").filter(Boolean);
        if (parts[0]) fields.push({ label: "Username", value: parts[0], icon: "person-outline" });
        if (parts[1]) fields.push({ label: "Event", value: parts[1].replace(/-/g, " "), icon: "calendar-outline" });
        break;
      }
      case "razorpay":
      case "donation":
      case "reviewpage":
      case "menucatalogue": {
        const u = new URL(content.startsWith("http") ? content : `https://${content}`);
        fields.push({ label: "Link", value: u.hostname.replace(/^www\./, "") + u.pathname.replace(/\/$/, ""), icon: "link-outline" });
        break;
      }
      case "appdownload":
      case "app": {
        const isApple = content.includes("apps.apple.com");
        fields.push({ label: "Store", value: isApple ? "App Store" : "Google Play", icon: "download-outline" });
        try {
          const u = new URL(content.startsWith("http") ? content : `https://${content}`);
          const appName = u.pathname.split("/").filter(Boolean).pop()?.replace(/-/g, " ") || "";
          if (appName) fields.push({ label: "App", value: appName, icon: "apps-outline" });
        } catch {}
        break;
      }
      default:
        break;
    }
  } catch {}
  return fields;
}

export function extractBasicPaymentInfo(content: string) {
  try {
    return {
      vpa:      content.match(/pa=([^&\s]+)/i)?.[1] ? decodeURIComponent(content.match(/pa=([^&\s]+)/i)![1]) : undefined,
      name:     content.match(/pn=([^&\s]+)/i)?.[1] ? decodeURIComponent(content.match(/pn=([^&\s]+)/i)![1]) : undefined,
      amount:   content.match(/(?:\bam|amount)=([^&\s]+)/i)?.[1] ? decodeURIComponent(content.match(/(?:\bam|amount)=([^&\s]+)/i)![1]) : undefined,
      currency: content.match(/cu=([^&\s]+)/i)?.[1] ? decodeURIComponent(content.match(/cu=([^&\s]+)/i)![1]) : undefined,
    };
  } catch { return {}; }
}
