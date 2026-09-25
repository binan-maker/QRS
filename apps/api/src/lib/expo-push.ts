type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default";
};

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export function isValidExpoPushToken(token: unknown): token is string {
  return (
    typeof token === "string" &&
    /^(ExpoPushToken|ExponentPushToken)\[[^\]]+\]$/.test(token)
  );
}

export async function sendExpoPush(
  messages: ExpoPushMessage | ExpoPushMessage[],
): Promise<void> {
  const payload = Array.isArray(messages) ? messages : [messages];
  const validMessages = payload.filter((message) => isValidExpoPushToken(message.to));
  if (validMessages.length === 0) return;

  const response = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(validMessages),
  });

  if (!response.ok) {
    throw new Error(`Expo push service returned HTTP ${response.status}`);
  }
}