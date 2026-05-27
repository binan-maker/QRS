/**
 * QrContentInfoCard — owner-facing content preview card.
 *
 * Now delegates entirely to the centralised QR Engine CompactRenderer.
 * All display logic lives in features/qr-engine, not here.
 */
import React from "react";
import { CompactRenderer } from "@/features/qr-engine";
import type { ContentDetailRow } from "@/services/qr-display-utils";

interface ContentTypeMeta {
  color: string;
  icon: string;
  label: string;
}

interface Props {
  ctMeta: ContentTypeMeta;
  effectiveContentType: string;
  isDynamic: boolean;
  isBusiness: boolean;
  contentRows: ContentDetailRow[];
  liveRaw: string | null;
  isGuardQr: boolean;
  guardLink: any | null;
  standardLink: any | null;
}

export default function QrContentInfoCard({
  effectiveContentType,
  isDynamic,
  isBusiness,
  liveRaw,
  isGuardQr,
  guardLink,
  standardLink,
}: Props) {
  const isLoading =
    isDynamic && !liveRaw && (isGuardQr ? !guardLink : !standardLink);

  return (
    <CompactRenderer
      content={liveRaw ?? ""}
      contentType={effectiveContentType}
      isDynamic={isDynamic}
      isBusiness={isBusiness}
      isLoading={isLoading}
    />
  );
}
