/**
 * QR Engine — Universal Renderer
 * ─────────────────────────────────────────────────────────────────────────────
 * THE single component all pages use to display QR content.
 * Dispatches to the correct renderer based on `mode`.
 *
 * Modes:
 *   full       — rich detail card (qr-detail page)
 *   history    — not rendered directly; use QrTypeIcon + useQrMeta instead
 *   minimal    — tiny type pill / badge
 *   feed       — social-style card (home feed, search results, favorites)
 *   hero       — large scan-result card shown immediately after scanning
 *
 * Example:
 *   <QrRenderer content={qr.rawContent} contentType={qr.contentType} mode="feed" />
 *   <QrRenderer content={qr.rawContent} contentType={qr.contentType} mode="hero" onOpen={handleOpen} />
 */

import React from "react";
import type { QrRenderProps } from "../types";
import FullRenderer from "./FullRenderer";
import MinimalRenderer from "./MinimalRenderer";
import FeedRenderer from "./FeedRenderer";
import HeroRenderer from "./HeroRenderer";

export default function QrRenderer(props: QrRenderProps) {
  const mode = props.mode ?? "full";

  switch (mode) {
    case "full":      return <FullRenderer      {...props} />;
    case "minimal":   return <MinimalRenderer   {...props} />;
    case "feed":      return <FeedRenderer      {...props} />;
    case "hero":      return <HeroRenderer      {...props} />;
    default:          return <FullRenderer      {...props} />;
  }
}
