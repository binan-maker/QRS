import Animated, { FadeInDown } from "react-native-reanimated";
import TrustScoreCard from "@/features/qr-detail/components/TrustScoreCard";

interface Props {
  offlineMode: boolean;
  trust: any;
  reportCounts: any;
  totalScans: number;
  delay?: number;
}

export function QrTrustSection({
  offlineMode,
  trust,
  reportCounts,
  totalScans,
  delay = 90,
}: Props) {
  if (offlineMode) return null;

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(260)}>
      <TrustScoreCard
        trustInfo={trust}
        reportCounts={reportCounts}
        totalScans={totalScans}
      />
    </Animated.View>
  );
}
