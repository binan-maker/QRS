import Animated, { FadeInDown } from "react-native-reanimated";
import { VerdictBanner } from "@/features/qr-detail/components/VerdictBanner";
import AdvisoryDisclaimer from "@/features/qr-detail/components/AdvisoryDisclaimer";
import OwnerCircleRow from "@/features/qr-detail/components/OwnerCircleRow";

interface Props {
  verdict: any;
  offlineMode: boolean;
  ownerInfo: any;
  onOpenOwnerSheet: () => void;
}

export function QrVerdictSection({ verdict, offlineMode, ownerInfo, onOpenOwnerSheet }: Props) {
  return (
    <>
      <Animated.View entering={FadeInDown.delay(40).duration(260)}>
        <VerdictBanner verdict={verdict} offlineMode={offlineMode} />
      </Animated.View>

      {ownerInfo?.isBranded && (
        <OwnerCircleRow
          ownerInfo={ownerInfo as any}
          onPress={onOpenOwnerSheet}
        />
      )}

      <Animated.View entering={FadeInDown.delay(60).duration(260)}>
        <AdvisoryDisclaimer />
      </Animated.View>
    </>
  );
}
