import { db } from "@/lib/db/client";
import { authAdapter } from "@/lib/auth";
import { createLogger } from "@/lib/logger";

const log = createLogger("analytics");

type EventPayload = Record<string, string | number | boolean | null>;

function logEvent(eventName: string, params: EventPayload = {}): void {
  // Client analytics must be tied to an authenticated Firebase user. Anonymous
  // writes cannot satisfy Firestore rules and only create noisy permission
  // warnings, so anonymous events are intentionally not persisted here.
  const currentUser = authAdapter.getCurrentUser();
  if (!currentUser) return;

  db.add(["_analytics"], {
    event: eventName,
    userId: currentUser.uid,
    ...params,
    day: new Date().toISOString().slice(0, 10),
    ts: Date.now(),
  }).catch((e: any) => {
    // Analytics is best-effort and must never surface as an app error.
    if (e?.code === "permission-denied") {
      log.debug(`Analytics write rejected for "${eventName}"`);
      return;
    }
    log.warn(`Failed to record event "${eventName}"`, e);
  });
}

export function trackQrScanned(params: {
  contentType: string;
  verdict: "safe" | "flagged" | "unknown";
  scanSource: "camera" | "gallery" | "viewed";
  isAuthenticated: boolean;
}): void {
  logEvent("qr_scanned", {
    content_type: params.contentType,
    verdict: params.verdict,
    scan_source: params.scanSource,
    is_authenticated: params.isAuthenticated,
  });
}

export function trackQrGenerated(params: {
  qrType: string;
  contentType: string;
}): void {
  logEvent("qr_generated", {
    qr_type: params.qrType,
    content_type: params.contentType,
  });
}

export function trackFraudDetected(params: {
  reason: string;
  isAuthenticated: boolean;
}): void {
  logEvent("fraud_detected", {
    reason: params.reason,
    is_authenticated: params.isAuthenticated,
  });
}

export function trackLoginPromptShown(screen: string): void {
  logEvent("login_prompt_shown", { screen });
}

export function trackLoginCompleted(method: "email" | "google"): void {
  logEvent("login_completed", { method });
}
