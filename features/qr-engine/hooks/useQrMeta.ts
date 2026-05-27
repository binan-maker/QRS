/**
 * QR Engine — useQrMeta hook
 *
 * Returns visual metadata + display strings for any QR content/type pair.
 * All data flows from the single centralized engine registry.
 */

import { useMemo } from "react";
import { getQrTypeDef, getDisplayLabel, getSubtitle } from "../registry";
import type { QrMeta } from "../types";

export function useQrMeta(content: string, contentType: string, templateKey?: string): QrMeta {
  return useMemo(() => {
    const typeMeta = getQrTypeDef(contentType, templateKey);
    return {
      typeMeta,
      displayLabel: getDisplayLabel(content, contentType, templateKey),
      subtitle: getSubtitle(content, contentType, templateKey),
    };
  }, [content, contentType, templateKey]);
}
