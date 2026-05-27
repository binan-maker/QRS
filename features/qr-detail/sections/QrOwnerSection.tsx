import Animated, { FadeInDown } from "react-native-reanimated";
import OwnerCard from "@/features/qr-detail/components/OwnerCard";
import { SectionHeader } from "@/features/qr-detail/components/SectionHeader";

interface Props {
  user: any;
  ownerInfo: any;
  isQrOwner: boolean;
  followCount: number;
  unreadMessages?: number;
  colors: any;
  onOpenFollowers: () => void;
  onOpenMessages?: () => void;
  delay?: number;
}

export function QrOwnerSection({
  user,
  ownerInfo,
  isQrOwner,
  followCount,
  unreadMessages,
  colors,
  onOpenFollowers,
  onOpenMessages,
  delay = 110,
}: Props) {
  if (!user || !ownerInfo) return null;

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(260)}>
      <SectionHeader
        icon="storefront-outline"
        label="Creator"
        gradient={[colors.primary, colors.primaryShade]}
      />
      <OwnerCard
        ownerInfo={ownerInfo}
        isQrOwner={isQrOwner}
        followCount={followCount}
        unreadMessages={unreadMessages}
        onOpenFollowers={onOpenFollowers}
        onOpenMessages={onOpenMessages}
      />
    </Animated.View>
  );
}
