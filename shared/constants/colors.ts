export type AppColors = {
  background: string;
  surface: string;
  surfaceLight: string;
  surfaceBorder: string;
  surfaceOverlay: string;
  modalOverlay: string;

  primary: string;
  primaryShade: string;
  primaryDim: string;
  primaryText: string;

  accent: string;
  accentDim: string;

  danger: string;
  dangerShade: string;
  dangerDim: string;

  warning: string;
  warningShade: string;
  warningDim: string;

  safe: string;
  safeShade: string;
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
  background: "#0A0A0A",
  surface: "#141414",
  surfaceLight: "#1C1C1C",
  surfaceBorder: "#272727",
  surfaceOverlay: "rgba(10,10,10,0.97)",
  modalOverlay: "rgba(0,0,0,0.80)",

  primary: "#3B82F6",
  primaryShade: "#2563EB",
  primaryDim: "rgba(59,130,246,0.12)",
  primaryText: "#FFFFFF",

  accent: "#3B82F6",
  accentDim: "rgba(59,130,246,0.12)",

  danger: "#F87171",
  dangerShade: "#DC2626",
  dangerDim: "rgba(248,113,113,0.10)",

  warning: "#FBBF24",
  warningShade: "#D97706",
  warningDim: "rgba(251,191,36,0.10)",

  safe: "#34D399",
  safeShade: "#059669",
  safeDim: "rgba(52,211,153,0.10)",

  text: "#E8E8E8",
  textSecondary: "#9CA3AF",
  textMuted: "#4B5563",

  tabIconDefault: "#4B5563",
  tabIconSelected: "#3B82F6",
  tint: "#3B82F6",
  scanLine: "#3B82F6",
  cardGlow: "rgba(59,130,246,0.04)",

  inputBackground: "#0F0F0F",
  skeletonBase: "#181818",
  skeletonHighlight: "#222222",
  statusBar: "light",
  blurTint: "dark",

  isDark: true,
};

const light: AppColors = {
  background: "#F5F8FF",
  surface: "#FFFFFF",
  surfaceLight: "#EBF1FF",
  surfaceBorder: "#D4E0F5",
  surfaceOverlay: "rgba(245,248,255,0.97)",
  modalOverlay: "rgba(8,15,28,0.55)",

  primary: "#0052CC",
  primaryShade: "#003A99",
  primaryDim: "rgba(0,82,204,0.07)",
  primaryText: "#FFFFFF",

  accent: "#0052CC",
  accentDim: "rgba(0,82,204,0.07)",

  danger: "#DC2626",
  dangerShade: "#991B1B",
  dangerDim: "rgba(220,38,38,0.07)",

  warning: "#D97706",
  warningShade: "#B45309",
  warningDim: "rgba(217,119,6,0.09)",

  safe: "#059669",
  safeShade: "#065F46",
  safeDim: "rgba(5,150,105,0.07)",

  text: "#0C1525",
  textSecondary: "#3A5278",
  textMuted: "#7A99BC",

  tabIconDefault: "#4A6E94",
  tabIconSelected: "#0052CC",
  tint: "#0052CC",
  scanLine: "#0052CC",
  cardGlow: "rgba(0,82,204,0.04)",

  inputBackground: "#EEF4FF",
  skeletonBase: "#D4E0F5",
  skeletonHighlight: "#E4EDF8",
  statusBar: "dark",
  blurTint: "light",

  isDark: false,
};

const Colors = { dark, light };

export default Colors;
