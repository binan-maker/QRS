/**
 * @infrastructure/push — Expo Push Notification adapter implementation
 *
 * Wraps lib/expo-push.ts behind the IPushProvider interface so the
 * application layer never imports Expo specifics directly.
 * In Phase 6 this can be swapped for FCM, APNs, or OneSignal.
 */

import { sendExpoPush, isValidExpoPushToken } from "../../lib/expo-push";

// ─── Interface ────────────────────────────────────────────────────────────────

export interface PushMessage {
  /** One or more Expo push tokens. */
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: "default" | null;
  badge?: number;
}

export interface IPushProvider {
  send(messages: PushMessage[]): Promise<void>;
}

// ─── ExpoPushProvider ─────────────────────────────────────────────────────────

export class ExpoPushProvider implements IPushProvider {
  /**
   * Sends push messages via Expo's push gateway.
   * Filters out invalid tokens before sending — never throws on delivery failure.
   */
  async send(messages: PushMessage[]): Promise<void> {
    if (!messages.length) return;

    // Explode multi-token messages into individual sends (Expo limit: 100/request)
    const flat = messages.flatMap((m) => {
      const tokens = Array.isArray(m.to) ? m.to : [m.to];
      return tokens
        .filter(isValidExpoPushToken)
        .map((token) => ({ ...m, to: token }));
    });

    if (!flat.length) return;

    // Expo supports up to 100 messages per request
    const BATCH = 100;
    for (let i = 0; i < flat.length; i += BATCH) {
      await sendExpoPush(flat.slice(i, i + BATCH) as any);
    }
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _instance: ExpoPushProvider | null = null;

export function getPushProvider(): ExpoPushProvider {
  if (!_instance) _instance = new ExpoPushProvider();
  return _instance;
}
