"use client";

import { useState, useEffect, useCallback } from "react";

const PERMISSION_KEY = "binro_camera_permission_granted";
const COOKIE_NAME = "binro_cam_granted";

function hasPermission(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem(PERMISSION_KEY) === "true") return true;
    if (sessionStorage.getItem(PERMISSION_KEY) === "true") return true;
    if (document.cookie.split(";").some((c) => c.trim().startsWith(`${COOKIE_NAME}=1`))) return true;
  } catch {}
  return false;
}

function persistPermission(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PERMISSION_KEY, "true");
    sessionStorage.setItem(PERMISSION_KEY, "true");
    document.cookie = `${COOKIE_NAME}=1; path=/; max-age=31536000; SameSite=Lax`;
  } catch {}
}

export function useCameraPermissions(): [{ granted: boolean; canAskAgain: boolean } | null, () => Promise<void>] {
  const [permission, setPermission] = useState<{ granted: boolean; canAskAgain: boolean } | null>(null);

  useEffect(() => {
    if (hasPermission()) {
      setPermission({ granted: true, canAskAgain: true });
    } else {
      setPermission({ granted: false, canAskAgain: true });
    }
  }, []);

  const requestPermission = useCallback(async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        stream.getTracks().forEach((t) => t.stop());
        persistPermission();
        setPermission({ granted: true, canAskAgain: true });
      } else {
        setPermission({ granted: false, canAskAgain: false });
      }
    } catch {
      setPermission({ granted: false, canAskAgain: true });
    }
  }, []);

  return [permission, requestPermission];
}
