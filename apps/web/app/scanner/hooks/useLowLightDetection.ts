"use client";

import { useState, useEffect, useRef } from "react";

const SUGGEST_DELAY_MS = 8_000;
const AUTO_DISMISS_MS  = 5_000;
const COOLDOWN_MS      = 90_000;

interface Options {
  cameraLive: boolean;
  scanned:    boolean;
  flashOn:    boolean;
  facing:     "back" | "front";
}

export function useLowLightDetection({ cameraLive, scanned, flashOn, facing }: Options) {
  const [suggested, setSuggested] = useState(false);

  const suggestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastShownAtRef  = useRef(0);

  function _clearTimers() {
    if (suggestTimerRef.current) {
      clearTimeout(suggestTimerRef.current);
      suggestTimerRef.current = null;
    }
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }

  function dismiss() {
    setSuggested(false);
    _clearTimers();
  }

  useEffect(() => {
    if (!cameraLive || flashOn || scanned || facing !== "back") {
      if (suggested) setSuggested(false);
      _clearTimers();
      return;
    }

    const now = Date.now();
    if (lastShownAtRef.current > 0 && now - lastShownAtRef.current < COOLDOWN_MS) {
      return;
    }

    suggestTimerRef.current = setTimeout(() => {
      suggestTimerRef.current = null;
      lastShownAtRef.current  = Date.now();
      setSuggested(true);

      dismissTimerRef.current = setTimeout(() => {
        dismissTimerRef.current = null;
        setSuggested(false);
      }, AUTO_DISMISS_MS);
    }, SUGGEST_DELAY_MS);

    return _clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraLive, flashOn, scanned, facing]);

  return { suggested, dismiss };
}
