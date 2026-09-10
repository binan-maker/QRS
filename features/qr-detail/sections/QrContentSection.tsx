import Animated, { FadeInDown } from "react-native-reanimated";
import { ContentCard } from "@/features/qr-engine/content-cards";
import ExternalQrBanner from "@/features/qr-detail/components/ExternalQrBanner";

interface Props {
  content: string;
  contentType: string;
  parsedPayment: any;
  isDeactivated: boolean;
  onOpenContent: () => void;
  templateKey?: string;
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
  isBranded,
  offlineMode,
  hasOwner,
  user,
}: Props) {
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

      {!isBranded && !offlineMode && !hasOwner && (
        <Animated.View entering={FadeInDown.delay(80).duration(260)}>
          <ExternalQrBanner />
        </Animated.View>
      )}
    </>
  );
}
