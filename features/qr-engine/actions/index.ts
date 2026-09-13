/**
 * QR Engine — actions for the two supported QR types.
 */

import { Linking } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "@/shared/utils/haptics";

export interface QrAction {
  key: string;
  label: string;
  icon: string;
  handler: () => void | Promise<void>;
}

export async function smartOpen(content: string, contentType: string): Promise<void> {
  if (contentType !== "url") return;
  const url = content.startsWith("http") ? content : `https://${content}`;
  try {
    if (await Linking.canOpenURL(url)) await Linking.openURL(url);
  } catch {
    // The caller still has the copy action available when a link cannot open.
  }
}

export async function smartCopy(content: string): Promise<void> {
  await Clipboard.setStringAsync(content);
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

export function getQrActions(
  content: string,
  contentType: string,
  options: { isDeactivated?: boolean; onOpen?: () => void } = {},
): QrAction[] {
  const actions: QrAction[] = [];
  if (!options.isDeactivated && options.onOpen && (contentType === "url" || contentType === "text")) {
    actions.push({
      key: "open",
      label: contentType === "url" ? "Open Website" : "Copy Text",
      icon: contentType === "url" ? "globe-outline" : "copy-outline",
      handler: contentType === "url" ? options.onOpen : () => smartCopy(content),
    });
  }
  if (contentType === "url" || contentType === "text") {
    actions.push({
      key: "copy",
      label: "Copy",
      icon: "copy-outline",
      handler: () => smartCopy(content),
    });
  }
  return actions;
}