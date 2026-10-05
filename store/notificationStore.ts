// ── Notification store ────────────────────────────────────────────────────────
// Tracks the unread notification count for the badge indicator.
// hasUnread is derived at read time (unreadCount > 0) — not stored as state —
// to prevent it from ever drifting out of sync with unreadCount.

import { create } from "zustand";

interface NotificationState {
  unreadCount: number;
  lastCheckedAt: number | null;
  setUnreadCount: (count: number) => void;
  incrementUnread: () => void;
  markAllRead: () => void;
  setLastChecked: (ts: number) => void;
  reset: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  lastCheckedAt: null,
  setUnreadCount: (count) => set({ unreadCount: count }),
  incrementUnread: () => set((s) => ({ unreadCount: s.unreadCount + 1 })),
  markAllRead: () => set({ unreadCount: 0 }),
  setLastChecked: (ts) => set({ lastCheckedAt: ts }),
  reset: () => set({ unreadCount: 0, lastCheckedAt: null }),
}));

// ── Selectors ─────────────────────────────────────────────────────────────────

export const selectUnreadCount = (s: NotificationState) => s.unreadCount;
/** Derived — always consistent with unreadCount. No stale-state risk. */
export const selectHasUnread   = (s: NotificationState) => s.unreadCount > 0;
