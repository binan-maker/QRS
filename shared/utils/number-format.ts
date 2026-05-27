/**
 * Format numbers in international dollar-style compact notation.
 * < 1,000          →  "999"
 * 1,000–999,999    →  "1.2K" / "500K"
 * 1,000,000+       →  "1.2M" / "10M"
 * 1,000,000,000+   →  "1.2B"
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
 * Format numbers with standard international comma separators.
 * 1000000 → "1,000,000"
 */
export function formatIndianNumber(num: number): string {
  if (!num || isNaN(num)) return "0";
  return Math.floor(num).toLocaleString("en-US");
}

/**
 * Returns a compact display value and a full readable label.
 */
export function formatFollowCount(num: number): { compact: string; full: string } {
  return {
    compact: formatCompactNumber(num),
    full: formatIndianNumber(num),
  };
}
