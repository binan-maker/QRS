/**
 * @infrastructure/push — Expo Push Notification adapter
 *
 * Wraps the Expo Push API.
 * Used by workers/push.worker.ts (BullMQ) in Phase 3.
 */

export interface PushMessage {
  to: string | string[];    // Expo push token(s)
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: "default" | null;
  badge?: number;
}

export interface IPushProvider {
  send(messages: PushMessage[]): Promise<void>;
}

// Placeholder — ExpoPushProvider implemented in Phase 3.
export {};
