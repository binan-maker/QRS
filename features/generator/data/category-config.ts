export const CAT_COLOR: Record<string, string> = {
  url:     "#3B82F6",
  email:   "#EC4899",
  wifi:    "#F59E0B",
  upi:     "#8B5CF6",
  contact: "#3B82F6",
};

export function catColor(id: string): string {
  return CAT_COLOR[id] ?? "#3B82F6";
}

export const POPULAR_IDS = ["upi", "wifi", "url", "email", "contact"];

export const GROUPS: { emoji: string; label: string; ids: string[] }[] = [
  { emoji: "💳", label: "Payment",  ids: ["upi"] },
  { emoji: "👤", label: "Contact",  ids: ["contact", "email"] },
  { emoji: "🔧", label: "Utility",  ids: ["wifi", "url"] },
];
