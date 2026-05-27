/**
 * smart-open.ts
 *
 * Universal "open content" utility.  Instead of writing an if/else chain in
 * every feature, import `smartOpenContent` and pass it the raw content string
 * plus the resolved contentType (and optional templateKey).
 *
 * Routing order:
 *  1. Structured schemes (tel:, mailto:, sms:, geo:, upi:, vCard…)
 *  2. Types with an appScheme → canOpenURL check → offer browser fallback
 *  3. Everything else → plain Linking.openURL with https:// normalisation
 *
 * NOTE: payment / EMV handling is intentionally NOT here — it relies on
 * parsedPayment state from the QR detail hook and is kept in useQrDetail.ts.
 */

import { Alert, Linking } from "react-native";
import { getQrTypeStyle } from "@/shared/config/qr-type-styles";

export async function smartOpenContent(
  content: string,
  contentType: string,
  templateKey?: string
): Promise<void> {
  if (!content) return;
  const lower = content.toLowerCase();
  const style = getQrTypeStyle(contentType, templateKey);

  // ── Phone ────────────────────────────────────────────────────────────────
  if (contentType === "phone") {
    const cleaned = content.replace(/^(tel:|callto:|facetime:)/i, "");
    Linking.openURL(`tel:${cleaned}`).catch(() =>
      Alert.alert("Error", "Could not open the phone app.")
    );
    return;
  }

  // ── Email ─────────────────────────────────────────────────────────────────
  if (contentType === "email") {
    const mail = lower.startsWith("mailto:") ? content : `mailto:${content}`;
    Linking.openURL(mail).catch(() =>
      Alert.alert("Error", "Could not open the email app.")
    );
    return;
  }

  // ── SMS ───────────────────────────────────────────────────────────────────
  if (contentType === "sms") {
    const sms = lower.startsWith("sms:") || lower.startsWith("smsto:") ? content : `sms:${content}`;
    Linking.openURL(sms).catch(() =>
      Alert.alert("Error", "Could not open the SMS app.")
    );
    return;
  }

  // ── Contact / MeCard ──────────────────────────────────────────────────────
  if (contentType === "contact" || contentType === "mecard") {
    const phone =
      content.match(/^TEL[^:\r\n]*:(.+)$/m)?.[1]?.trim() ||
      content.match(/TEL:([^;]+)/)?.[1]?.trim();
    const email =
      content.match(/^EMAIL[^:\r\n]*:(.+)$/m)?.[1]?.trim() ||
      content.match(/EMAIL:([^;]+)/)?.[1]?.trim();
    if (phone) {
      Linking.openURL(`tel:${phone}`).catch(() =>
        Alert.alert("Error", "Could not open the phone app.")
      );
    } else if (email) {
      Linking.openURL(`mailto:${email}`).catch(() =>
        Alert.alert("Error", "Could not open the email app.")
      );
    } else {
      Alert.alert("Contact", "No phone number or email found in this contact.");
    }
    return;
  }

  // ── Wi-Fi ─────────────────────────────────────────────────────────────────
  if (contentType === "wifi") {
    Alert.alert(
      "Wi-Fi Network",
      "Scan this QR code with your device's camera app to automatically connect to the Wi-Fi network.",
      [{ text: "OK" }]
    );
    return;
  }

  // ── Location ──────────────────────────────────────────────────────────────
  if (contentType === "location" || contentType === "google_maps") {
    let mapsUrl = content;
    if (lower.startsWith("geo:")) {
      const afterGeo = content.slice(4);
      const coords = afterGeo.split("?")[0];
      const qParam = afterGeo.includes("q=")
        ? afterGeo.split("q=")[1]?.split("&")[0]
        : "";
      mapsUrl = qParam
        ? `https://maps.google.com/?q=${encodeURIComponent(qParam)}`
        : `https://maps.google.com/?q=${coords}`;
    } else if (lower.startsWith("comgooglemaps://")) {
      mapsUrl = content.replace("comgooglemaps://", "https://maps.google.com/");
    } else if (!lower.startsWith("http")) {
      mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(content)}`;
    }
    Linking.openURL(mapsUrl).catch(() =>
      Alert.alert("Error", "Could not open Maps.")
    );
    return;
  }

  // ── Calendar / Event ──────────────────────────────────────────────────────
  if (contentType === "calendar" || contentType === "event") {
    const gcalBase = "https://calendar.google.com/calendar/r/eventedit";
    Linking.openURL(gcalBase).catch(() =>
      Alert.alert("Error", "Could not open the calendar app.")
    );
    return;
  }

  // ── Types with app-scheme deep-link + web fallback ────────────────────────
  if (style.appScheme && style.webFallback) {
    const webUrl = lower.startsWith("http") ? content : `https://${content}`;
    const appInstalled = await Linking.canOpenURL(style.appScheme).catch(() => false);

    if (appInstalled) {
      // App is installed — open via universal/app link; OS routes to native app
      Linking.openURL(webUrl).catch(() =>
        Alert.alert("Error", `Could not open ${style.label}.`)
      );
    } else {
      Alert.alert(
        `${style.label} Not Installed`,
        `${style.label} doesn't appear to be installed on your device. Open in your browser instead?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Open in Browser",
            onPress: () => Linking.openURL(webUrl).catch(() => {}),
          },
        ]
      );
    }
    return;
  }

  // ── OTP / deep-link apps ──────────────────────────────────────────────────
  if (contentType === "otp" || contentType === "app") {
    Linking.openURL(content).catch(() =>
      Alert.alert("App Not Found", "Could not open the link. Make sure the required app is installed.")
    );
    return;
  }

  // ── Generic URL / media / document / everything else ─────────────────────
  const webUrl = lower.startsWith("http") ? content : `https://${content}`;
  Linking.openURL(webUrl).catch(() =>
    Alert.alert("Error", `Could not open this ${style.openLabel.toLowerCase()}.`)
  );
}
