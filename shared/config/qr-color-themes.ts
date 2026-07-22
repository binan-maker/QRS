export interface QrColorTheme {
  name: string;
  fg: string;
  bg: string;
  accent?: string;
}

/**
 * Built-in QR colour palettes — shared across the Generator and My QR features.
 * Source of truth: edit here; both features import from this file.
 */
export const QR_COLOR_THEMES: QrColorTheme[] = [
  { name: "Classic",    fg: "#0A0E17", bg: "#F8FAFC" },
  { name: "Ocean",      fg: "#1D4ED8", bg: "#EFF6FF" },
  { name: "Midnight",   fg: "#E0F2FE", bg: "#0A0E17" },
  { name: "Forest",     fg: "#166534", bg: "#F0FDF4" },
  { name: "Saffron 🇮🇳", fg: "#C2410C", bg: "#FFF7ED" },
  { name: "Rose",       fg: "#BE123C", bg: "#FFF1F2" },
  { name: "Teal",       fg: "#0D9488", bg: "#F0FDFA" },
  { name: "Royal",      fg: "#7C3AED", bg: "#F5F3FF" },
];
