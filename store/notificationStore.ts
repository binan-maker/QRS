import { create } from "zustand";

interface NotificationState {
  unreadCount: number;
  hasUnread: boolean;
  lastCheckedAt: number | null;
  setUnreadCount: (count: number) => void;
  incrementUnread: () => void;
  markAllRead: () => void;
  setLastChecked: (ts: number) => void;
  reset: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  hasUnread: false,
  lastCheckedAt: null,
  setUnreadCount: (count) => set({ unreadCount: count, hasUnread: count > 0 }),
  incrementUnread: () =>
    set((s) => ({ unreadCount: s.unreadCount + 1, hasUnread: true })),
  markAllRead: () => set({ unreadCount: 0, hasUnread: false }),
  setLastChecked: (ts) => set({ lastCheckedAt: ts }),
  reset: () => set({ unreadCount: 0, hasUnread: false, lastCheckedAt: null }),
}));

export const selectUnreadCount = (s: NotificationState) => s.unreadCount;
export const selectHasUnread = (s: NotificationState) => s.hasUnread;
