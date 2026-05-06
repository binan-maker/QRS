import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Global JavaScript error + unhandled promise rejection handlers.
 *
 * React error boundaries only catch errors thrown during render/lifecycle.
 * Most production crashes actually come from:
 *
 *   1. Unhandled promise rejections inside event handlers, timers, or
 *      Firebase callbacks (e.g. permission_denied, network timeouts).
 *   2. Native bridge errors that bubble up to the global ErrorUtils handler.
 *
 * Without these handlers the app either silently hangs (rejection lost) or
 * crashes outright with no telemetry. We:
 *   - Log the error.
 *   - Persist a small breadcrumb to AsyncStorage so the in-app bug-report
 *     screen can show context.
 *   - Swallow the failure so the JS thread keeps running.
 *
 * Call `setupGlobalErrorHandlers()` once at the very top of the root layout.
 */

const STORAGE_KEY = "qrguard_recent_errors";
const MAX_BREADCRUMBS = 10;

type Breadcrumb = {
  ts: number;
  source: string;
  message: string;
  stack?: string;
  screenName?: string;
};

let installed = false;

async function appendBreadcrumb(crumb: Breadcrumb): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const list: Breadcrumb[] = raw ? JSON.parse(raw) : [];
    list.unshift(crumb);
    const trimmed = list.slice(0, MAX_BREADCRUMBS);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Storage failures must NEVER crash the error handler itself.
  }
}

export function recordHandledError(
  error: unknown,
  context: {
    source: string;
    screenName?: string;
    componentStack?: string;
  },
): void {
  const err =
    error instanceof Error
      ? error
      : new Error(typeof error === "string" ? error : "Unknown error");

  // eslint-disable-next-line no-console
  console.warn(`[error:${context.source}]`, err.message);

  void appendBreadcrumb({
    ts: Date.now(),
    source: context.source,
    message: err.message?.slice(0, 500) || "Unknown error",
    stack: (err.stack || context.componentStack || "").slice(0, 1500),
    screenName: context.screenName,
  });
}

export async function getRecentErrorBreadcrumbs(): Promise<Breadcrumb[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Breadcrumb[]) : [];
  } catch {
    return [];
  }
}

export async function clearErrorBreadcrumbs(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function setupGlobalErrorHandlers(): void {
  if (installed) return;
  installed = true;

  // ---- Unhandled promise rejections ---------------------------------------
  // React Native ships with a global `process` that emits this event when
  // the promise polyfill spots an unhandled rejection. On web we hook the
  // window event of the same name. Both use the same event shape.
  const handleRejection = (reason: unknown) => {
    recordHandledError(reason, { source: "unhandled-rejection" });
  };

  try {
    if (typeof globalThis !== "undefined") {
      const g = globalThis as any;
      if (g.process && typeof g.process.on === "function") {
        g.process.on("unhandledRejection", (reason: unknown) =>
          handleRejection(reason),
        );
      }
      if (typeof g.addEventListener === "function") {
        g.addEventListener("unhandledrejection", (event: any) => {
          handleRejection(event?.reason ?? event);
        });
      }
    }
  } catch {
    // Defensive: never let handler installation crash app startup.
  }

  // ---- Native global JS errors --------------------------------------------
  // ErrorUtils exists on React Native's global. We chain into the existing
  // handler so the dev RedBox still appears in development builds.
  try {
    const g = globalThis as any;
    const errorUtils = g.ErrorUtils;
    if (errorUtils && typeof errorUtils.setGlobalHandler === "function") {
      const previous =
        typeof errorUtils.getGlobalHandler === "function"
          ? errorUtils.getGlobalHandler()
          : undefined;

      errorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
        recordHandledError(error, {
          source: isFatal ? "global-fatal" : "global-nonfatal",
        });
        if (typeof previous === "function") {
          try {
            previous(error, isFatal);
          } catch {
            // Swallow — we already recorded the original error.
          }
        }
      });
    }
  } catch {
    // No-op.
  }
}
