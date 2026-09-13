/**
 * ContentCard — the two supported QR content cards.
 *
 * Website links get website actions. Every other payload is plain text.
 */

import React, { memo } from "react";
import type { ParsedPaymentQr } from "@/services/analysis";
import { TextCard, WebsiteCard } from "./cards";

interface Props {
  content: string;
  contentType: string;
  parsedPayment: ParsedPaymentQr | null;
  onOpenContent: () => void;
  hideOpenAction?: boolean;
  templateKey?: string;
}

const ContentCard = memo(function ContentCard({
  content,
  contentType,
  onOpenContent,
  hideOpenAction,
}: Props) {
  if (contentType === "url") {
    return (
      <WebsiteCard
        content={content}
        onOpenContent={onOpenContent}
        hideOpenAction={hideOpenAction}
      />
    );
  }

  return <TextCard content={content} />;
});

export default ContentCard;