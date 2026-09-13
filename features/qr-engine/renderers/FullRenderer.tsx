/**
 * QR Engine — FullRenderer
 *
 * Full-detail card mode. Wraps the existing ContentCard orchestrator so the
 * engine owns the "full" rendering surface without duplicating any card code.
 */

import React from "react";
import { ContentCard } from "@/features/qr-engine/content-cards";
import type { QrRenderProps } from "../types";

export default function FullRenderer({
  content,
  contentType,
  templateKey,
  onOpen,
  hideOpenAction,
  parsedPayment,
}: QrRenderProps) {
  return (
    <ContentCard
      content={content}
      contentType={contentType}
      templateKey={templateKey}
      onOpenContent={onOpen ?? (() => {})}
      hideOpenAction={hideOpenAction}
    />
  );
}
