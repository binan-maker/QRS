import { universalAsyncStorage as AsyncStorage } from "@shared/utils/universal-storage";
import { castFeatureVote } from "../votes/feature-vote-service";
import { submitFeedback } from "../user/profile";

export type OfflineActionType =
  | "SCAN_RECORD"
  | "FEATURE_VOTE"
  | "FEEDBACK_SUBMIT"
  | "CUSTOM";

export interface OfflineAction<T = any> {
  id: string;
  type: OfflineActionType;
  payload: T;
  timestamp: number;
  attempts: number;
  lastError?: string;
  idempotencyKey?: string;
}

export interface OfflineSyncReport {
  synced: number;
  failed: number;
  remaining: number;
  errors: Array<{ id: string; error: string }>;
}

const UNIVERSAL_QUEUE_KEY = "offline_pending_actions_v2";
const MAX_RETRY_ATTEMPTS = 5;

type QueueListener = (pendingCount: number) => void;
const listeners = new Set<QueueListener>();

function notifyListeners(count: number) {
  listeners.forEach((fn) => {
    try {
      fn(count);
    } catch {}
  });
}

export function subscribeOfflineQueue(listener: QueueListener): () => void {
  listeners.add(listener);
  getPendingOfflineCount().then((count) => listener(count)).catch(() => {});
  return () => {
    listeners.delete(listener);
  };
}

export async function getPendingOfflineActions(): Promise<OfflineAction[]> {
  try {
    const raw = await AsyncStorage.getItem(UNIVERSAL_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function getPendingOfflineCount(): Promise<number> {
  try {
    const actions = await getPendingOfflineActions();
    return actions.length;
  } catch {
    return 0;
  }
}

export async function clearOfflineQueue(): Promise<void> {
  try {
    await AsyncStorage.removeItem(UNIVERSAL_QUEUE_KEY);
    notifyListeners(0);
  } catch {}
}

export async function queueOfflineAction<T = any>(
  type: OfflineActionType,
  payload: T,
  options?: { idempotencyKey?: string }
): Promise<string> {
  try {
    const queue = await getPendingOfflineActions();
    const actionId = `act_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const idempotencyKey =
      options?.idempotencyKey ||
      `${type}_${JSON.stringify(payload).slice(0, 64)}`;

    // Remove duplicates if the exact same pending action exists
    const filtered = queue.filter((item) => item.idempotencyKey !== idempotencyKey);

    const action: OfflineAction<T> = {
      id: actionId,
      type,
      payload,
      timestamp: Date.now(),
      attempts: 0,
      idempotencyKey,
    };

    filtered.push(action);
    await AsyncStorage.setItem(UNIVERSAL_QUEUE_KEY, JSON.stringify(filtered));
    notifyListeners(filtered.length);
    return actionId;
  } catch {
    return "";
  }
}

// ─── Universal Sync Dispatcher ────────────────────────────────────────────────

async function executeAction(action: OfflineAction): Promise<void> {
  switch (action.type) {
    case "FEATURE_VOTE": {
      const p = action.payload as { email: string; vote: "need" | "not_need" };
      await castFeatureVote(p.email, p.vote);
      break;
    }
    case "FEEDBACK_SUBMIT": {
      const p = action.payload as { userId: string | null; email: string | null; message: string };
      await submitFeedback(p.userId, p.email, p.message);
      break;
    }
    case "SCAN_RECORD": {
      // Handled via scan-crud sync
      break;
    }
    default:
      break;
  }
}

export async function syncAllOfflineActions(): Promise<OfflineSyncReport> {
  const queue = await getPendingOfflineActions();
  const report: OfflineSyncReport = {
    synced: 0,
    failed: 0,
    remaining: 0,
    errors: [],
  };

  if (queue.length === 0) {
    return report;
  }

  const remaining: OfflineAction[] = [];

  for (const action of queue) {
    try {
      await executeAction(action);
      report.synced++;
    } catch (err: any) {
      action.attempts++;
      action.lastError = err?.message || "Sync execution failed";

      // Keep in queue if retry limit not exceeded
      if (action.attempts < MAX_RETRY_ATTEMPTS) {
        remaining.push(action);
      } else {
        report.failed++;
        report.errors.push({ id: action.id, error: action.lastError });
      }
    }
  }

  await AsyncStorage.setItem(UNIVERSAL_QUEUE_KEY, JSON.stringify(remaining));
  report.remaining = remaining.length;
  notifyListeners(remaining.length);

  return report;
}
