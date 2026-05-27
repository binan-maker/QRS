/**
 * QR Engine — Universal Renderer
 *
 * The single component all pages use to display QR content.
 * Dispatches to the correct renderer based on `mode`.
 *
 * Modes:
 *   full     — rich detail card (default, used on qr-detail page)
 *   compact  — owner-facing info card with key fields
 *   history  — not rendered directly; use QrTypeIcon + useQrMeta instead
 *   minimal  — tiny type pill / badge
 *
 * Example:
 *   <QrRenderer content={qr.rawContent} contentType={qr.contentType} mode="compact" />
 *   <QrRenderer content={qr.rawContent} contentType={qr.contentType} mode="full" onOpen={handleOpen} />
 */

import React from "react";
import type { QrRenderProps } from "../types";
import FullRenderer from "./FullRenderer";
import CompactRenderer from "./CompactRenderer";
import MinimalRenderer from "./MinimalRenderer";

export default function QrRenderer(props: QrRenderProps) {
  const mode = props.mode ?? "full";

  switch (mode) {
    case "full":    return <FullRenderer    {...props} />;
    case "compact": return <CompactRenderer {...props} />;
    case "minimal": return <MinimalRenderer {...props} />;
    default:        return <FullRenderer    {...props} />;
  }
}
