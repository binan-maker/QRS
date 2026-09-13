export { default as QrDetailScreen } from "./QrDetailScreen";
export { useQrDetail } from "./hooks/useQrDetail";

export { default as QrRenderer } from "./renderers/QrRenderer";
export { QrTypeIcon, QrTypeBadge } from "./renderers/HistoryRenderer";
export { default as MinimalRenderer } from "./renderers/MinimalRenderer";
export { default as FeedRenderer } from "./renderers/FeedRenderer";
export { default as HeroRenderer } from "./renderers/HeroRenderer";

export {
  getQrTypeDef,
  getQrTypeMeta,
  getQrTypeStyle,
  getQrTypeCategory,
  resolveEffectiveType,
  getDisplayLabel,
  getSubtitle,
  QR_REGISTRY,
} from "./registry";

export { detectContentType } from "./detector";
export {
  computeTrustScore,
  scoreToLevel,
  trustLevelColor,
  trustLevelLabel,
  trustLevelIcon,
} from "./trust-scorer";
export { useQrMeta } from "./useQrMeta";
export { smartOpen, smartCopy, getQrActions } from "./actions";
export type { QrAction } from "./actions";
export { default as ContentCard } from "./components/ContentCard";
export { default as WebsiteCard } from "./components/WebsiteCard";
export { default as TextCard } from "./components/TextCard";
export { CardHeader } from "./components/CardHeader";
export { OpenButton } from "./components/OpenButton";
export { QrAnalyticsCard } from "./components/QrAnalyticsCard";
export * from "./analytics";
export type {
  QrRenderMode,
  QrTypeDefinition,
  QrTypeMeta,
  QrMeta,
  QrRenderProps,
  QrTypeCategory,
  QrTrustSummary,
  TrustLevel,
  TrustFlag,
} from "./types";
