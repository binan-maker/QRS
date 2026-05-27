import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export async function submitBugReport(message: string, error: Error): Promise<void> {
  const FIREBASE_PROJECT_ID =
    (typeof process !== "undefined" && (process.env?.EXPO_PUBLIC_FIREBASE_PROJECT_ID || process.env?.FIREBASE_PROJECT_ID)) ||
    "";
  const FIREBASE_API_KEY =
    (typeof process !== "undefined" && (process.env?.EXPO_PUBLIC_FIREBASE_API_KEY || process.env?.FIREBASE_API_KEY)) ||
    "";

  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/bugReports?key=${FIREBASE_API_KEY}`;

  let deviceInfo = `Platform: ${Platform.OS}`;
  try {
    const stored = await AsyncStorage.getItem("qrguard_last_crash");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.count) deviceInfo += `, crash #${parsed.count}`;
    }
  } catch {}

  const body = {
    fields: {
      errorMessage: { stringValue: error.message || "Unknown error" },
      errorStack: { stringValue: (error.stack || "").slice(0, 2000) },
      userMessage: { stringValue: message || "" },
      deviceInfo: { stringValue: deviceInfo },
      reportedAt: { timestampValue: new Date().toISOString() },
      appVersion: { stringValue: "1.0.0" },
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to submit report (${res.status}): ${text}`);
  }
}
