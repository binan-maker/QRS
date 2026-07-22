/**
 * QrContentInfoCard — owner-facing content preview card.
 *
 * Delegates entirely to the centralised QR Engine CompactRenderer.
 * All display logic lives in features/qr-engine, not here.
 */
import { CompactRenderer } from "@/features/qr-engine";

interface Props {
  effectiveContentType: string;
  isDynamic: boolean;
  liveRaw: string | null;
  isGuardQr: boolean;
  guardLink: any | null;
  standardLink: any | null;
}

export default function QrContentInfoCard({
  effectiveContentType,
  isDynamic,
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
      isBusiness={false}
      isLoading={isLoading}
    />
  );
}
