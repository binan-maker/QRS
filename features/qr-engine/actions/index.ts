/**
 * QR Engine — Actions
 *
 * Centralised action handlers for all QR types.
 * Pages call these instead of building their own open/copy/share logic.
 */

import { Linking, Platform } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "@/shared/utils/haptics";

export interface QrAction {
  key: string;
  label: string;
  icon: string;
  handler: () => void | Promise<void>;
}

export async function smartOpen(content: string, contentType: string): Promise<void> {
  const url = resolveOpenUrl(content, contentType);
  if (!url) return;
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      const fallback = getFallbackUrl(content, contentType);
      if (fallback) await Linking.openURL(fallback);
    }
  } catch {}
}

export async function smartCopy(content: string): Promise<void> {
  await Clipboard.setStringAsync(content);
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

export function getQrActions(
  content: string,
  contentType: string,
  options: { isDeactivated?: boolean; onOpen?: () => void } = {}
): QrAction[] {
  const actions: QrAction[] = [];
  if (!options.isDeactivated && options.onOpen) {
    const primary = getPrimaryAction(contentType);
    if (primary) {
      actions.push({
        key: "open",
        label: primary.label,
        icon: primary.icon,
        handler: options.onOpen,
      });
    }
  }
  actions.push({
    key: "copy",
    label: "Copy",
    icon: "copy-outline",
    handler: () => smartCopy(content),
  });
  return actions;
}

function getPrimaryAction(contentType: string): { label: string; icon: string } | null {
  const map: Record<string, { label: string; icon: string }> = {
    url:         { label: "Open Website",      icon: "globe-outline"          },
    email:       { label: "Send Email",        icon: "mail-outline"           },
    phone:       { label: "Call",              icon: "call-outline"           },
    sms:         { label: "Send SMS",          icon: "chatbubble-outline"     },
    whatsapp:    { label: "Open WhatsApp",     icon: "logo-whatsapp"          },
    wifi:        { label: "Connect to Wi-Fi",  icon: "wifi-outline"           },
    contact:     { label: "Save Contact",      icon: "person-add-outline"     },
    mecard:      { label: "Save Contact",      icon: "person-add-outline"     },
    location:    { label: "Open in Maps",      icon: "map-outline"            },
    google_maps: { label: "Open in Maps",      icon: "map-outline"            },
    event:       { label: "Add to Calendar",   icon: "calendar-outline"       },
    calendar:    { label: "Add to Calendar",   icon: "calendar-outline"       },
    payment:     { label: "Pay Now",           icon: "card-outline"           },
    upi:         { label: "Pay Now",           icon: "card-outline"           },
    paymentlink: { label: "Pay Now",           icon: "card-outline"           },
    crypto:      { label: "Open Wallet",       icon: "logo-bitcoin"           },
    instagram:   { label: "Open Instagram",    icon: "logo-instagram"         },
    twitter:     { label: "Open Twitter",      icon: "logo-twitter"           },
    youtube:     { label: "Watch on YouTube",  icon: "logo-youtube"           },
    linkedin:    { label: "Open LinkedIn",     icon: "logo-linkedin"          },
    telegram:    { label: "Open Telegram",     icon: "send-outline"           },
    facebook:    { label: "Open Facebook",     icon: "logo-facebook"          },
    spotify:     { label: "Open Spotify",      icon: "musical-notes-outline"  },
    discord:     { label: "Join Discord",      icon: "logo-discord"           },
    zoom:        { label: "Join Meeting",      icon: "videocam-outline"       },
    app:         { label: "Download App",      icon: "download-outline"       },
    appdownload: { label: "Download App",      icon: "download-outline"       },
  };
  return map[contentType] ?? { label: "Open", icon: "open-outline" };
}

function resolveOpenUrl(content: string, contentType: string): string | null {
  switch (contentType) {
    case "email":
      return content.startsWith("mailto:") ? content : `mailto:${content}`;
    case "phone":
      return content.startsWith("tel:") ? content : `tel:${content}`;
    case "sms":
      return content.startsWith("sms:") || content.startsWith("smsto:") ? content : `sms:${content}`;
    case "wifi":
      return Platform.OS === "android"
        ? `wifi://scan?ssid=${encodeURIComponent(content)}`
        : null;
    case "location":
    case "google_maps": {
      const geo = content.match(/geo:(-?[\d.]+),(-?[\d.]+)/);
      if (geo) {
        const [, lat, lng] = geo;
        return Platform.OS === "ios"
          ? `maps://?q=${lat},${lng}`
          : `geo:${lat},${lng}`;
      }
      return null;
    }
    default:
      return content.startsWith("http") ? content : null;
  }
}

function getFallbackUrl(content: string, contentType: string): string | null {
  if (contentType === "location" || contentType === "google_maps") {
    const geo = content.match(/geo:(-?[\d.]+),(-?[\d.]+)/);
    if (geo) return `https://maps.google.com/?q=${geo[1]},${geo[2]}`;
  }
  return null;
}
