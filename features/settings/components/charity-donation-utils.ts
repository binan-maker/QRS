export const PRESET_AMOUNTS = [500, 2000, 10000, 50000, 100000];

export const AMOUNT_LABELS: Record<number, string> = {
  500: "Contributor",
  2000: "Supporter",
  10000: "Patron",
  50000: "Benefactor",
  100000: "Founding Donor",
};

export function formatAmount(amount: number): string {
  if (amount >= 100000) return `₹1L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}K`;
  return `₹${amount}`;
}

export function formatDate(ts: any): string {
  try {
    const d: Date = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}
