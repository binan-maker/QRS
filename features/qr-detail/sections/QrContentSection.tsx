import Animated, { FadeInDown } from "react-native-reanimated";
import ContentCard from "@/features/qr-detail/components/ContentCard";
import SafetyWarningCard from "@/features/qr-detail/components/SafetyWarningCard";
import EvidenceCard from "@/features/qr-detail/components/EvidenceCard";
import ExternalQrBanner from "@/features/qr-detail/components/ExternalQrBanner";

interface Props {
  content: string;
  contentType: string;
  parsedPayment: any;
  isDeactivated: boolean;
  onOpenContent: () => void;
  templateKey?: string;
  paymentSafety?: any;
  urlSafety?: any;
  offlineBlacklistMatch?: { matched: boolean; reason?: string };
  isBranded?: boolean;
  offlineMode?: boolean;
  hasOwner?: boolean;
  user?: any;
}

export function QrContentSection({
  content,
  contentType,
  parsedPayment,
  isDeactivated,
  onOpenContent,
  templateKey,
  paymentSafety,
  urlSafety,
  offlineBlacklistMatch,
  isBranded,
  offlineMode,
  hasOwner,
  user,
}: Props) {
  const paymentWarnings = (paymentSafety?.warnings ?? []).filter(
    (w: string) => !w.toLowerCase().startsWith("pre-filled amount")
  );

  return (
    <>
      <Animated.View entering={FadeInDown.delay(70).duration(260)}>
        <ContentCard
          content={content}
          contentType={contentType}
          parsedPayment={parsedPayment}
          isDeactivated={isDeactivated}
          onOpenContent={onOpenContent}
          hideOpenAction={false}
          templateKey={templateKey}
        />
      </Animated.View>

      {contentType === "payment" && paymentSafety?.isSuspicious && paymentWarnings.length > 0 && (
        <Animated.View entering={FadeInDown.delay(80).duration(260)}>
          <SafetyWarningCard
            riskLevel={paymentSafety.riskLevel as "caution" | "dangerous"}
            warnings={paymentWarnings}
            title={paymentSafety.riskLevel === "dangerous" ? "Payment Security Warning" : "Payment Security Notice"}
          />
        </Animated.View>
      )}

      {contentType === "payment" && paymentSafety?.evidence && paymentSafety.evidence.length > 0 && (
        <Animated.View entering={FadeInDown.delay(80).duration(260)}>
          <EvidenceCard title="Payment Analysis" evidence={paymentSafety.evidence} />
        </Animated.View>
      )}

      {urlSafety?.isSuspicious && (
        <Animated.View entering={FadeInDown.delay(80).duration(260)}>
          <SafetyWarningCard
            riskLevel={urlSafety.riskLevel as "caution" | "dangerous"}
            warnings={urlSafety.warnings}
            title={urlSafety.riskLevel === "dangerous" ? "Destination Warning" : "Proceed with Caution"}
          />
        </Animated.View>
      )}

      {urlSafety?.evidence && urlSafety.evidence.length > 0 && (
        <Animated.View entering={FadeInDown.delay(90).duration(260)}>
          <EvidenceCard title="URL Analysis" evidence={urlSafety.evidence} />
        </Animated.View>
      )}

      {!isBranded && !offlineMode && !hasOwner && (
        <Animated.View entering={FadeInDown.delay(80).duration(260)}>
          <ExternalQrBanner />
        </Animated.View>
      )}
    </>
  );
}
