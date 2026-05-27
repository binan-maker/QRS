export function tsToMs(ts: any): number {
  if (!ts) return 0;
  if (ts.toDate) return ts.toDate().getTime();
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === "number") return ts;
  return new Date(ts).getTime();
}

export function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return "a moment";
  const totalSeconds = Math.ceil(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds} second${totalSeconds === 1 ? "" : "s"}`;
  const totalMinutes = Math.ceil(totalSeconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} minute${totalMinutes === 1 ? "" : "s"}`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) return `${hours} hour${hours === 1 ? "" : "s"}`;
  return `${hours} hour${hours === 1 ? "" : "s"} ${minutes} minute${minutes === 1 ? "" : "s"}`;
}

export function timeUntilWindowReset(windowStartMs: number): number {
  return Math.max(0, windowStartMs + 86400000 - Date.now());
}

export function isWithin24h(tsMs: number): boolean {
  return Date.now() - tsMs < 86400000;
}

export function isWithinSeconds(tsMs: number, seconds: number): boolean {
  return Date.now() - tsMs < seconds * 1000;
}

export function isWithinMs(tsMs: number, ms: number): boolean {
  return Date.now() - tsMs < ms;
}
