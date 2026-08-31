export type ExpiryPreset = "never" | "1d" | "7d" | "30d" | "90d";

export function resolveExpiryDate(preset: ExpiryPreset, _customDate: string): string | null {
  if (preset === "never") return null;
  const now = new Date();
  if (preset === "1d") now.setDate(now.getDate() + 1);
  if (preset === "7d") now.setDate(now.getDate() + 7);
  if (preset === "30d") now.setDate(now.getDate() + 30);
  if (preset === "90d") now.setDate(now.getDate() + 90);
  return now.toISOString();
}