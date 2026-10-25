/**
 * Background Scheduler
 *
 * Runs lightweight scheduled tasks in the background for the API service:
 * - Syncs verified merchant coupons from Cuelinks V3 on startup and every 6 hours
 * - Manages concurrent execution prevention and graceful error recovery
 */

import { syncCuelinksOffers, isCuelinksConfigured } from "./services/cuelinks-service";

const SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
const STARTUP_DELAY_MS = 8 * 1000; // 8 seconds after boot to allow DB/network readiness

let schedulerTimer: NodeJS.Timeout | null = null;
let isSyncInProgress = false;

async function executeCuelinksSync(triggerSource: "startup" | "interval" | "manual") {
  if (isSyncInProgress) {
    console.log(`[scheduler] Cuelinks sync (${triggerSource}) skipped: previous sync still running`);
    return;
  }

  if (!isCuelinksConfigured()) {
    console.warn(
      `[scheduler] Cuelinks sync (${triggerSource}) skipped: CUELINKS_API_KEY environment variable is not set`
    );
    return;
  }

  isSyncInProgress = true;
  console.log(`[scheduler] Starting Cuelinks coupon sync (${triggerSource})...`);

  try {
    const result = await syncCuelinksOffers();
    if (result.success) {
      console.log(
        `[scheduler] Cuelinks sync succeeded: ${result.totalFetched} fetched, ${result.newOffers} new, ${result.updatedOffers} updated, ${result.deactivatedCount} deactivated.`
      );
    } else {
      console.warn(`[scheduler] Cuelinks sync completed with warning: ${result.error}`);
    }
  } catch (err: any) {
    console.error(`[scheduler] Unexpected error during Cuelinks sync:`, err?.message || err);
  } finally {
    isSyncInProgress = false;
  }
}

/**
 * Initializes and starts the background tasks.
 */
export function startScheduler() {
  console.log("[scheduler] Background scheduler initialized. Interval: 6 hours.");

  // 1. Initial startup sync after short warm-up delay
  setTimeout(() => {
    void executeCuelinksSync("startup");
  }, STARTUP_DELAY_MS);

  // 2. Periodic sync every 6 hours
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
  }

  schedulerTimer = setInterval(() => {
    void executeCuelinksSync("interval");
  }, SYNC_INTERVAL_MS);
}

/**
 * Stops the background scheduler timers (for tests or clean shutdowns).
 */
export function stopScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
    console.log("[scheduler] Background scheduler stopped");
  }
}

/**
 * Trigger an immediate out-of-band sync run.
 */
export async function triggerImmediateCuelinksSync() {
  await executeCuelinksSync("manual");
}

