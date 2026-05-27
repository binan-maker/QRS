export interface EventData {
  summary: string;
  dtstart: string;
  dtend: string;
  location: string;
  description: string;
}

export function parseEvent(content: string): EventData {
  return {
    summary:     content.match(/SUMMARY:([^\r\n]+)/)?.[1] ?? "",
    dtstart:     content.match(/DTSTART[^:]*:([^\r\n]+)/)?.[1] ?? "",
    dtend:       content.match(/DTEND[^:]*:([^\r\n]+)/)?.[1] ?? "",
    location:    content.match(/LOCATION:([^\r\n]+)/)?.[1] ?? "",
    description: content.match(/DESCRIPTION:([^\r\n]+)/)?.[1] ?? "",
  };
}

function icalToDate(dt: string): Date | null {
  if (!dt) return null;
  try {
    const y  = dt.slice(0, 4), mo = dt.slice(4, 6), d = dt.slice(6, 8);
    const h  = dt.slice(9, 11) || "00", mi = dt.slice(11, 13) || "00";
    return new Date(`${y}-${mo}-${d}T${h}:${mi}:00`);
  } catch { return null; }
}

export function formatEventDate(dt: string): string {
  if (!dt) return "";
  const date = icalToDate(dt);
  if (!date) return dt;
  return date.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

export function formatEventTime(dt: string): string {
  if (!dt) return "";
  const date = icalToDate(dt);
  if (!date) return "";
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function isEventPast(dtend: string, dtstart: string): boolean {
  const ref = dtend || dtstart;
  if (!ref) return false;
  const date = icalToDate(ref);
  return date ? date < new Date() : false;
}
