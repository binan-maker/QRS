import { router } from "expo-router";

let lastNavTime = 0;
const NAV_GUARD_MS = 700;

function canNavigate(): boolean {
  const now = Date.now();
  if (now - lastNavTime < NAV_GUARD_MS) return false;
  lastNavTime = now;
  return true;
}

export function safePush(href: Parameters<typeof router.push>[0]) {
  if (!canNavigate()) return;
  router.push(href);
}

export function safeReplace(href: Parameters<typeof router.replace>[0]) {
  if (!canNavigate()) return;
  router.replace(href);
}

export function safeBack() {
  if (!canNavigate()) return;
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace("/(tabs)" as any);
  }
}
