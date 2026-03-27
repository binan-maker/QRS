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
  background: "#080F1C",
  surface: "#101929",
  surfaceLight: "#182234",
  surfaceBorder: "#1F2E45",
  surfaceOverlay: "rgba(8,15,28,0.96)",
  modalOverlay: "rgba(8,15,28,0.82)",

  primary: "#4B8EF5",
  primaryShade: "#2E6DE0",
  primaryDim: "rgba(75,142,245,0.12)",
  primaryText: "#FFFFFF",

  accent: "#4B8EF5",
  accentDim: "rgba(75,142,245,0.12)",

  danger: "#F87171",
  dangerShade: "#DC2626",
  dangerDim: "rgba(248,113,113,0.10)",

  warning: "#FBBF24",
  warningShade: "#D97706",
  warningDim: "rgba(251,191,36,0.10)",

  safe: "#34D399",
  safeShade: "#059669",
  safeDim: "rgba(52,211,153,0.10)",

  text: "#EDF2FF",
  textSecondary: "#8BA7C7",
  textMuted: "#3D5270",

  tabIconDefault: "#3D5270",
  tabIconSelected: "#4B8EF5",
  tint: "#4B8EF5",
  scanLine: "#4B8EF5",
  cardGlow: "rgba(75,142,245,0.06)",

  inputBackground: "#09132A",
  skeletonBase: "#121E33",
  skeletonHighlight: "#1A2B47",
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

  tabIconDefault: "#7A99BC",
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
