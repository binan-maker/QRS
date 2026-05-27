/**
 * QR Engine — FullRenderer
 *
 * Full-detail card mode. Wraps the existing ContentCard orchestrator so the
 * engine owns the "full" rendering surface without duplicating any card code.
 */

import React from "react";
import ContentCard from "@/features/qr-detail/content-cards";
import type { QrRenderProps } from "../types";

export default function FullRenderer({
  content,
  contentType,
  templateKey,
  isDeactivated = false,
  onOpen,
  hideOpenAction,
  parsedPayment,
}: QrRenderProps) {
  return (
    <ContentCard
      content={content}
      contentType={contentType}
      templateKey={templateKey}
      isDeactivated={isDeactivated}
      onOpenContent={onOpen ?? (() => {})}
      hideOpenAction={hideOpenAction}
      parsedPayment={parsedPayment ?? null}
    />
  );
}
