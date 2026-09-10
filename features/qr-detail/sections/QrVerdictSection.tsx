import Animated, { FadeInDown } from "react-native-reanimated";
import { VerdictBanner } from "@/features/qr-detail/components/VerdictBanner";
import AdvisoryDisclaimer from "@/features/qr-detail/components/AdvisoryDisclaimer";

interface Props {
  verdict: any;
  offlineMode: boolean;
}

export function QrVerdictSection({ verdict, offlineMode }: Props) {
  return (
    <>
      <Animated.View entering={FadeInDown.delay(40).duration(260)}>
        <VerdictBanner verdict={verdict} offlineMode={offlineMode} />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(60).duration(260)}>
        <AdvisoryDisclaimer />
      </Animated.View>
    </>
  );
}
