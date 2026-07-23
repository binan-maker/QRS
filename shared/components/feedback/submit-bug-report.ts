import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiUrl } from "@/config/api";

export async function submitBugReport(message: string, error: Error): Promise<void> {
  let deviceInfo = `Platform: ${Platform.OS}`;
  try {
    const stored = await AsyncStorage.getItem("qrguard_last_crash");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.count) deviceInfo += `, crash #${parsed.count}`;
    }
  } catch {}

  const body = {
    errorMessage: error.message || "Unknown error",
    errorStack:   (error.stack || "").slice(0, 2000),
    userMessage:  message || "",
    deviceInfo,
    appVersion:   "1.0.0",
  };

  const res = await fetch(apiUrl("/api/v1/feedback/bug-report"), {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to submit report (${res.status}): ${text}`);
  }
}
