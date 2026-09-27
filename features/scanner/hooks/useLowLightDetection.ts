// ─── Low-Light Detection ──────────────────────────────────────────────────────
// expo-camera's CameraView does not expose ambient-light or ISO callbacks in the
// current API. The most reliable cross-platform proxy is scan latency: if the
// camera has been live for SUGGEST_DELAY_MS without a successful QR decode AND
// the torch is off AND we're on the back camera, the most common cause is
// insufficient light. We surface a gentle, non-blocking suggestion to the user.
//
// The suggestion:
//   • Never fires automatically on front camera (no torch).
//   • Is suppressed immediately when the user turns on the torch.
//   • Is suppressed immediately when a scan succeeds.
//   • Auto-dismisses after AUTO_DISMISS_MS even if ignored.
//   • Has a per-session cooldown so it does not nag.
//   • Never blocks or slows scanning.

import { useState, useEffect, useRef } from "react";

const SUGGEST_DELAY_MS  = 8_000;   // idle time before suggestion appears
const AUTO_DISMISS_MS   = 5_000;   // how long the suggestion stays visible
const COOLDOWN_MS       = 90_000;  // minimum gap between successive suggestions

interface Options {
  cameraLive: boolean;
  scanned:    boolean;
  flashOn:    boolean;
  facing:     "back" | "front";
}

export function useLowLightDetection({ cameraLive, scanned, flashOn, facing }: Options) {
  const [suggested, setSuggested] = useState(false);

  const suggestTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastShownAtRef   = useRef(0);

  function _clearTimers() {
    if (suggestTimerRef.current) { clearTimeout(suggestTimerRef.current); suggestTimerRef.current = null; }
    if (dismissTimerRef.current) { clearTimeout(dismissTimerRef.current); dismissTimerRef.current = null; }
  }

  function dismiss() {
    setSuggested(false);
    _clearTimers();
  }

  useEffect(() => {
    // Conditions that make the suggestion irrelevant — cancel and hide immediately
    if (!cameraLive || flashOn || scanned || facing !== "back") {
      if (suggested) setSuggested(false);
      _clearTimers();
      return;
    }

    // Cooldown guard: don't re-suggest within COOLDOWN_MS of the last one
    const now = Date.now();
    if (lastShownAtRef.current > 0 && now - lastShownAtRef.current < COOLDOWN_MS) {
      return;
    }

    // Start the idle timer
    _clearTimers();
    suggestTimerRef.current = setTimeout(() => {
      suggestTimerRef.current = null;
      lastShownAtRef.current  = Date.now();
      setSuggested(true);

      // Auto-dismiss after the display window
      dismissTimerRef.current = setTimeout(() => {
        dismissTimerRef.current = null;
        setSuggested(false);
      }, AUTO_DISMISS_MS);
    }, SUGGEST_DELAY_MS);

    return _clearTimers;
  }, [cameraLive, scanned, flashOn, facing]);

  return { suggested, dismiss };
}
