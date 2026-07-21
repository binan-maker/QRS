const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: "default" | null;
  badge?: number;
  priority?: "default" | "normal" | "high";
  channelId?: string;
}

/** Sends one or many push messages via Expo's push gateway. Fire-and-forget. */
export async function sendExpoPush(
  messages: PushMessage | PushMessage[]
): Promise<void> {
  const payload = Array.isArray(messages) ? messages : [messages];
  const valid = payload.filter((m) => isValidExpoPushToken(m.to));
  if (valid.length === 0) return;

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(valid),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[ExpoPush] HTTP error:", res.status, text.slice(0, 200));
    }
  } catch (e) {
    console.error("[ExpoPush] Failed to deliver push:", e);
  }
}

export function isValidExpoPushToken(token: string): boolean {
  return (
    typeof token === "string" &&
    (token.startsWith("ExponentPushToken[") ||
      token.startsWith("ExpoPushToken["))
  );
}
