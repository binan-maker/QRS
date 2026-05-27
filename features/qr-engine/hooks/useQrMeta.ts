/**
 * QR Engine — useQrMeta hook
 *
 * Returns visual metadata + display strings for any QR content/type pair.
 * Replaces ad-hoc calls to getContentTypeMeta + getContentDisplayLabel in
 * list-item components (HistoryItem, RecentScanCard, etc.).
 *
 * Example:
 *   const { meta, displayLabel, subtitle } = useQrMeta(item.content, item.contentType);
 */

import { useMemo } from "react";
import { getQrTypeMeta } from "../registry";
import {
  getContentDisplayLabel,
  getContentSubtitle,
} from "@/shared/utils/formatters/content-type";
import type { QrMeta } from "../types";

export function useQrMeta(content: string, contentType: string): QrMeta {
  return useMemo(() => ({
    typeMeta: getQrTypeMeta(contentType),
    displayLabel: getContentDisplayLabel(content, contentType),
    subtitle: getContentSubtitle(content, contentType),
  }), [content, contentType]);
}
