import Animated, { FadeInDown } from "react-native-reanimated";
import TrustScoreCard from "@/features/qr-detail/components/TrustScoreCard";

interface Props {
  offlineMode: boolean;
  trust: any;
  reportCounts: any;
  totalScans: number;
  isQrOwner: boolean;
  ownerScanCount?: number;
  user: any;
  hasOwner?: boolean;
  delay?: number;
}

export function QrTrustSection({
  offlineMode,
  trust,
  reportCounts,
  totalScans,
  isQrOwner,
  ownerScanCount,
  user,
  hasOwner = false,
  delay = 90,
}: Props) {
  if (offlineMode) return null;

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(260)}>
      <TrustScoreCard
        trustInfo={trust}
        reportCounts={reportCounts}
        totalScans={totalScans}
        isQrOwner={user ? isQrOwner : false}
        ownerScanCount={user && isQrOwner ? ownerScanCount : undefined}
        hasOwner={hasOwner}
      />
    </Animated.View>
  );
}
