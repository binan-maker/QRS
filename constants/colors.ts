export type AppColors = {
  background: string;
  surface: string;
  surfaceLight: string;
  surfaceBorder: string;
  surfaceOverlay: string;

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
  background: "#090F1C",
  surface: "#101C2E",
  surfaceLight: "#172538",
  surfaceBorder: "#1E3252",
  surfaceOverlay: "rgba(9,15,28,0.92)",

  primary: "#00CFFF",
  primaryDim: "rgba(0,207,255,0.14)",
  primaryText: "#000000",

  accent: "#8B5CF6",
  accentDim: "rgba(139,92,246,0.14)",

  danger: "#F04444",
  dangerDim: "rgba(240,68,68,0.14)",

  warning: "#F5A623",
  warningDim: "rgba(245,166,35,0.14)",

  safe: "#10B981",
  safeDim: "rgba(16,185,129,0.14)",

  text: "#EFF6FF",
  textSecondary: "#8BA5C0",
  textMuted: "#4E6580",

  tabIconDefault: "#4E6580",
  tabIconSelected: "#00CFFF",
  tint: "#00CFFF",
  scanLine: "#00CFFF",
  cardGlow: "rgba(0,207,255,0.07)",

  inputBackground: "#132030",
  skeletonBase: "#162030",
  skeletonHighlight: "#1F3048",
  statusBar: "light",
  blurTint: "dark",

  isDark: true,
};

const light: AppColors = {
  background: "#F0F5FC",
  surface: "#FFFFFF",
  surfaceLight: "#E6EFF8",
  surfaceBorder: "#C8D8EA",
  surfaceOverlay: "rgba(240,245,252,0.95)",

  primary: "#0284C7",
  primaryDim: "rgba(2,132,199,0.10)",
  primaryText: "#FFFFFF",

  accent: "#7C3AED",
  accentDim: "rgba(124,58,237,0.10)",

  danger: "#DC2626",
  dangerDim: "rgba(220,38,38,0.10)",

  warning: "#D97706",
  warningDim: "rgba(217,119,6,0.10)",

  safe: "#059669",
  safeDim: "rgba(5,150,105,0.10)",

  text: "#0B1929",
  textSecondary: "#3B5370",
  textMuted: "#7A96AC",

  tabIconDefault: "#7A96AC",
  tabIconSelected: "#0284C7",
  tint: "#0284C7",
  scanLine: "#0284C7",
  cardGlow: "rgba(2,132,199,0.05)",

  inputBackground: "#FFFFFF",
  skeletonBase: "#DCE8F5",
  skeletonHighlight: "#EBF3FA",
  statusBar: "dark",
  blurTint: "light",

  isDark: false,
};

const Colors = { dark, light };

export default Colors;
