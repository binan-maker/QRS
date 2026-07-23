/**
 * Number formatting utilities — compact notation and Indian-style separators.
 */

/**
 * Compact notation: 1200 → "1.2K", 1500000 → "1.5M", 2000000000 → "2B"
 */
export function formatCompactNumber(num: number): string {
  if (!num || isNaN(num)) return "0";
  if (num < 1_000) return num.toString();
  if (num < 1_000_000) {
    const val = num / 1_000;
    return (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)) + "K";
  }
  if (num < 1_000_000_000) {
    const val = num / 1_000_000;
    return (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)) + "M";
  }
  const val = num / 1_000_000_000;
  return (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)) + "B";
}

/**
 * Standard comma separators: 1000000 → "1,000,000"
 */
export function formatIndianNumber(num: number): string {
  if (!num || isNaN(num)) return "0";
  return Math.floor(num).toLocaleString("en-US");
}

/**
 * Returns both a compact badge value and a full readable label.
 * e.g. { compact: "1.2K", full: "1,200" }
 */
export function formatFollowCount(num: number): { compact: string; full: string } {
  return {
    compact: formatCompactNumber(num),
    full: formatIndianNumber(num),
  };
}
