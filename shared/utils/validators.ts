export function validateVpa(v: string): string | null {
  if (!v.trim()) return null;
  if (!v.includes("@")) return "Must contain @ (e.g. name@paytm)";
  const [handle, provider] = v.split("@");
  if (!handle || handle.length < 1) return "Invalid UPI ID";
  if (!provider || provider.length < 2) return "Invalid UPI provider";
  return null;
}

export function validateUrl(v: string): string | null {
  if (!v.trim()) return null;
  const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try { new URL(withScheme); return null; }
  catch { return "Enter a valid URL (e.g. https://example.com)"; }
}

export function validatePhone(v: string): string | null {
  if (!v.trim()) return null;
  const digits = v.replace(/[\s\-().+]/g, "");
  if (!/^\d{7,15}$/.test(digits)) return "Enter a valid phone number (7–15 digits)";
  return null;
}

export function validateEmail(v: string): string | null {
  if (!v.trim()) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return "Enter a valid email address";
  return null;
}

export function validateAmount(v: string): string | null {
  if (!v.trim()) return null;
  if (isNaN(Number(v)) || Number(v) < 0) return "Enter a valid amount";
  return null;
}
