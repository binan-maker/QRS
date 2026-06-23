/**
 * Client-side push notification registration and handling.
 *
 * - Requests permission from the user (once, gracefully)
 * - Gets the Expo push token and saves it to the server
 * - Tracks the last app-open timestamp (used by the re-engagement scheduler)
 * - Sets up a tap handler so tapping a notification navigates to the right screen
 */

import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { router } from "expo-router";

// ── Foreground notification behaviour ────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const SERVER_BASE = (() => {
  const raw = process.env.EXPO_PUBLIC_DOMAIN;
  if (raw) { const host = raw.split(":")[0]; if (host) return `https://${host}`; }
  return __DEV__ ? "http://localhost:5000" : "";
})();

async function post(path: string, body: object): Promise<void> {
  try {
    await fetch(`${SERVER_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {}
}

// ── Push token registration ───────────────────────────────────────────────────
export async function registerForPushNotifications(
  userId: string
): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    // Request permission — iOS will prompt, Android 13+ requires it too
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") return; // User declined — respect it

    // Get the Expo push token (works in physical builds; no-op in Expo Go dev)
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as any).easConfig?.projectId;

    const tokenResult = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenResult.data;
    if (!token) return;

    // Save to server → Firestore via Admin SDK
    await post("/api/push/register", { userId, token });
  } catch (e) {
    // Non-critical — app works without push
    console.warn("[Push] Registration failed:", e);
  }
}

// ── Track app-open (feeds the re-engagement scheduler) ───────────────────────
export async function trackAppOpen(userId: string): Promise<void> {
  try {
    await post("/api/push/track-open", { userId });
  } catch {}
}

// ── Notification tap handler (navigate to the right screen) ──────────────────
let _tapSubscription: Notifications.Subscription | null = null;

export function setupNotificationTapHandler(): () => void {
  // Remove any existing listener first
  _tapSubscription?.remove();

  _tapSubscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data as any;

      if (!data) return;

      try {
        if (data.screen === "scanner") {
          router.push("/(tabs)/scanner");
        } else if (data.screen === "history") {
          router.push("/(tabs)/history");
        } else if (data.screen === "qr-detail" && data.qrId) {
          router.push(`/qr-detail/${data.qrId}`);
        } else if (data.screen === "profile") {
          router.push("/(tabs)/profile");
        } else {
          router.push("/(tabs)");
        }
      } catch {}
    }
  );

  return () => {
    _tapSubscription?.remove();
    _tapSubscription = null;
  };
}
