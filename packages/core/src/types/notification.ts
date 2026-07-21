// ── Notification ──────────────────────────────────────────────────────────────

export type NotificationType =
  | "mention"
  | "follow"
  | "friend_request"
  | "report"
  | "system"
  | "trust_update";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: number;
  /** Provider-agnostic payload — contents depend on `type`. */
  payload?: Record<string, unknown>;
}
