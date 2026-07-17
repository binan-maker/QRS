/**
 * Re-export shim — logic has moved to the shared display service.
 * Import from "@/services/qr-display" for new code.
 */
export {
  getEffectiveContentType,
  extractSocialHandle,
  getDisplayText,
  getContentTypeMeta,
} from "@/services/qr-display";
