export { default as QrDetailScreen } from "./QrDetailScreen";
export { useQrDetail } from "./hooks/useQrDetail";
export { QrTypeIcon, QrTypeBadge } from "./components/QrTypeIcon";
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
