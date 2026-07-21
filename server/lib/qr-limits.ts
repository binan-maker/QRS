/**
 * Shared QR limit/expiry check.
 * Returns true when the QR should be blocked (expired OR scan count hit).
 * Pass expiryDate=null or scanLimit=null to skip that check.
 */
export function isLimitExceeded(
  expiryDate: string | null,
  scanLimit: number | null,
  scanCount: number,
): boolean {
  if (expiryDate && new Date(expiryDate).getTime() < Date.now()) return true;
  if (scanLimit !== null && scanCount >= scanLimit) return true;
  return false;
}
