/**
 * Format numbers using the Indian number system.
 * < 1,000       →  "999"
 * 1,000–99,999  →  "1.2K"
 * 1,00,000+     →  "1.2L"  (Lakh)
 * 1,00,00,000+  →  "1.2Cr" (Crore)
 */
export function formatCompactNumber(num: number): string {
  if (!num || isNaN(num)) return "0";
  if (num < 1000) return num.toString();
  if (num < 100000) {
    const val = num / 1000;
    return (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)) + "K";
  }
  if (num < 10000000) {
    const val = num / 100000;
    return (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)) + "L";
  }
  const val = num / 10000000;
  return (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)) + "Cr";
}

/**
 * Format numbers with Indian comma separators.
 * 100000 → "1,00,000"
 */
export function formatIndianNumber(num: number): string {
  if (!num || isNaN(num)) return "0";
  const str = Math.floor(num).toString();
  if (str.length <= 3) return str;
  const last3 = str.slice(-3);
  const rest = str.slice(0, -3);
  const groups = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return groups + "," + last3;
}

/**
 * Returns a full readable label such as "1,00,000 followers"
 * together with a compact display value for tight UI spaces.
 */
export function formatFollowCount(num: number): { compact: string; full: string } {
  return {
    compact: formatCompactNumber(num),
    full: formatIndianNumber(num),
  };
}
