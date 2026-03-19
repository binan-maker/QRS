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
  background: "#080E1B",
  surface: "#0F1B2D",
  surfaceLight: "#162232",
  surfaceBorder: "#1C2E48",
  surfaceOverlay: "rgba(8,14,27,0.93)",

  primary: "#00D4FF",
  primaryDim: "rgba(0,212,255,0.12)",
  primaryText: "#000000",

  accent: "#A78BFA",
  accentDim: "rgba(167,139,250,0.14)",

  danger: "#F05252",
  dangerDim: "rgba(240,82,82,0.14)",

  warning: "#F59E0B",
  warningDim: "rgba(245,158,11,0.14)",

  safe: "#10B981",
  safeDim: "rgba(16,185,129,0.14)",

  text: "#EEF4FF",
  textSecondary: "#8AA4C0",
  textMuted: "#4E6580",

  tabIconDefault: "#4E6580",
  tabIconSelected: "#00D4FF",
  tint: "#00D4FF",
  scanLine: "#00D4FF",
  cardGlow: "rgba(0,212,255,0.06)",

  inputBackground: "#112030",
  skeletonBase: "#152030",
  skeletonHighlight: "#1E304A",
  statusBar: "light",
  blurTint: "dark",

  isDark: true,
};

const light: AppColors = {
  background: "#EEF4FC",
  surface: "#FFFFFF",
  surfaceLight: "#E5EEF8",
  surfaceBorder: "#C5D5E8",
  surfaceOverlay: "rgba(238,244,252,0.96)",

  primary: "#0077CC",
  primaryDim: "rgba(0,119,204,0.10)",
  primaryText: "#FFFFFF",

  accent: "#6D28D9",
  accentDim: "rgba(109,40,217,0.10)",

  danger: "#DC2626",
  dangerDim: "rgba(220,38,38,0.08)",

  warning: "#D97706",
  warningDim: "rgba(217,119,6,0.08)",

  safe: "#059669",
  safeDim: "rgba(5,150,105,0.08)",

  text: "#0A1628",
  textSecondary: "#334E6B",
  textMuted: "#6B8CAE",

  tabIconDefault: "#6B8CAE",
  tabIconSelected: "#0077CC",
  tint: "#0077CC",
  scanLine: "#0077CC",
  cardGlow: "rgba(0,119,204,0.04)",

  inputBackground: "#F0F6FF",
  skeletonBase: "#D8E8F5",
  skeletonHighlight: "#E8F2FB",
  statusBar: "dark",
  blurTint: "light",

  isDark: false,
};

const Colors = { dark, light };

export default Colors;
