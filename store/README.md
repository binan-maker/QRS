# 📦 Global State Stores (`/store`)

Lightweight, reactive client-side state management powered by **Zustand**. Designed for maximum performance with fine-grained selectors to eliminate unnecessary component re-renders.

---

## Store Modules

| Store | Purpose | Primary Selectors |
| :--- | :--- | :--- |
| `authStore.ts` | Authenticated session state, current user metadata, and auth token access. | `selectUser`, `selectIsAuthenticated`, `selectUid` |
| `notificationStore.ts` | Unread notifications count and badge presence indicators. | `selectUnreadCount`, `selectHasUnread` |
| `uiStore.ts` | Transient UI states, modal dialogues, toasts, and loading spinners. | `selectGlobalLoading`, `selectToast`, `showToast` |

---

## Performance Pattern

Always utilize memoized or shallow selectors when subscribing to state updates:

```typescript
import { useAuthStore, selectIsAuthenticated } from "@/store";

// Efficient: component only re-renders when authentication status changes
const isAuthenticated = useAuthStore(selectIsAuthenticated);
```
