import Animated, { FadeInDown } from "react-native-reanimated";
import { ContentCard } from "@/features/qr-engine/content-cards";

interface Props {
  content: string;
  contentType: string;
  parsedPayment: any;
  isDeactivated: boolean;
  onOpenContent: () => void;
  templateKey?: string;
}

export function QrContentSection({
  content,
  contentType,
  parsedPayment,
  isDeactivated,
  onOpenContent,
  templateKey,
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

    </>
  );
}
