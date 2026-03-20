export type AppColors = {
  background: string;
  surface: string;
  surfaceLight: string;
  surfaceBorder: string;
  surfaceOverlay: string;
  modalOverlay: string;

  primary: string;
  primaryDim: string;
  primaryText: string;

  accent: string;
  accentDim: string;

  danger: string;
  dangerDim: string;

  warning: string;
  warningDim: string;

  safe: string;
  safeDim: string;

  text: string;
  textSecondary: string;
  textMuted: string;

  tabIconDefault: string;
  tabIconSelected: string;
  tint: string;
  scanLine: string;
  cardGlow: string;

  inputBackground: string;
  skeletonBase: string;
  skeletonHighlight: string;
  statusBar: "light" | "dark";
  blurTint: "dark" | "light";

  isDark: boolean;
};

const dark: AppColors = {
  background: "#050B18",
  surface: "#0C1526",
  surfaceLight: "#132035",
  surfaceBorder: "#1A2D4A",
  surfaceOverlay: "rgba(5,11,24,0.95)",
  modalOverlay: "rgba(5,11,24,0.82)",

  primary: "#00E5FF",
  primaryDim: "rgba(0,229,255,0.10)",
  primaryText: "#000814",

  accent: "#B060FF",
  accentDim: "rgba(176,96,255,0.12)",

  danger: "#FF4D6A",
  dangerDim: "rgba(255,77,106,0.12)",

  warning: "#FFB800",
  warningDim: "rgba(255,184,0,0.12)",

  safe: "#00D68F",
  safeDim: "rgba(0,214,143,0.12)",

  text: "#F0F8FF",
  textSecondary: "#7BA7CC",
  textMuted: "#3D6080",

  tabIconDefault: "#3D6080",
  tabIconSelected: "#00E5FF",
  tint: "#00E5FF",
  scanLine: "#00E5FF",
  cardGlow: "rgba(0,229,255,0.07)",

  inputBackground: "#0A1828",
  skeletonBase: "#0E1F35",
  skeletonHighlight: "#162840",
  statusBar: "light",
  blurTint: "dark",

  isDark: true,
};

const light: AppColors = {
  background: "#F4F8FF",
  surface: "#FFFFFF",
  surfaceLight: "#EBF2FF",
  surfaceBorder: "#C8D9F0",
  surfaceOverlay: "rgba(244,248,255,0.97)",
  modalOverlay: "rgba(5,11,24,0.55)",

  primary: "#006FFF",
  primaryDim: "rgba(0,111,255,0.08)",
  primaryText: "#FFFFFF",

  accent: "#7C3AED",
  accentDim: "rgba(124,58,237,0.08)",

  danger: "#E8002D",
  dangerDim: "rgba(232,0,45,0.07)",

  warning: "#E68900",
  warningDim: "rgba(230,137,0,0.07)",

  safe: "#00A67E",
  safeDim: "rgba(0,166,126,0.07)",

  text: "#050B18",
  textSecondary: "#2D4A6B",
  textMuted: "#6B8EAE",

  tabIconDefault: "#6B8EAE",
  tabIconSelected: "#006FFF",
  tint: "#006FFF",
  scanLine: "#006FFF",
  cardGlow: "rgba(0,111,255,0.04)",

  inputBackground: "#EEF4FF",
  skeletonBase: "#DDE8F8",
  skeletonHighlight: "#EAF2FF",
  statusBar: "dark",
  blurTint: "light",

  isDark: false,
};

const Colors = { dark, light };

export default Colors;
