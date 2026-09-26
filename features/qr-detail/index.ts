export { default as QrDetailScreen } from "./QrDetailScreen";
export { default } from "./QrDetailScreen";
export { useQrDetail } from "./hooks/useQrDetail";
export { QrTypeIcon, QrTypeBadge } from "./components/QrTypeIcon";
export * from "./types";
export * from "./constants";
export {
  detectContentType,
  getQrTypeMeta,
  getDisplayLabel,
  getSubtitle,
  resolveEffectiveType,
  useQrMeta,
} from "@/shared/utils/qr-content";
export type {
  QrContentType,
  QrTypeDefinition,
} from "@/shared/utils/qr-content";
