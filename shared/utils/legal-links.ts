import { Linking } from "react-native";
import {
  ONLINE_PRIVACY_URL,
  ONLINE_TERMS_URL,
  LEGAL_CONTACT_EMAIL,
} from "@/shared/constants/legal";

/**
 * Safely opens any external URL in device browser or system viewer
 */
export async function openExternalUrl(url: string): Promise<boolean> {
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return true;
    }
    await Linking.openURL(url);
    return true;
  } catch {
    try {
      await Linking.openURL(url);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Opens the official web Privacy Policy (https://wbsite.com/privacy)
 */
export function openOnlinePrivacyPolicy(): Promise<boolean> {
  return openExternalUrl(ONLINE_PRIVACY_URL);
}

/**
 * Opens the official web Terms of Service (https://website.com/terms)
 */
export function openOnlineTerms(): Promise<boolean> {
  return openExternalUrl(ONLINE_TERMS_URL);
}

/**
 * Initiates an email draft via mailto: protocol
 */
export function openContactEmail(email: string = LEGAL_CONTACT_EMAIL, subject?: string): Promise<boolean> {
  const query = subject ? `?subject=${encodeURIComponent(subject)}` : "";
  return openExternalUrl(`mailto:${email}${query}`);
}
