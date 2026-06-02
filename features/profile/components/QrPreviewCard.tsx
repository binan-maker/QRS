import React, { useCallback } from "react";
import { View, Pressable } from "react-native";
import QRCode from "react-native-qrcode-svg";
import Animated, { FadeIn } from "react-native-reanimated";
import { safePush } from "@/shared/utils/navigation";

export interface QrItem {
  docId?: string;
  id?: string;
  content: string;
  scanCount?: number;
  bgColor?: string;
  fgColor?: string;
  businessName?: string;
}

interface Props {
  qr: QrItem;
  colors: any;
  tileSize: number;
}

const QrPreviewCard = React.memo(function QrPreviewCard({ qr, colors, tileSize }: Props) {
  const onPress = useCallback(() => safePush(`/my-qr/${qr.docId}`), [qr.docId]);

  const thumbBg = qr.bgColor || colors.surface;
  const qrSize  = Math.floor(tileSize * 0.7);

  return (
    <Animated.View entering={FadeIn.duration(220)}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          width: tileSize,
          height: tileSize,
          borderRadius: 16,
          borderWidth: 1,
          overflow: "hidden",
          backgroundColor: thumbBg,
          borderColor: colors.surfaceBorder,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.78 : 1,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        })}
      >
        <QRCode
          value={qr.content || "https://qrguard.app"}
          size={qrSize}
          color={qr.fgColor || "#0A0E17"}
          backgroundColor={thumbBg}
          quietZone={4}
          ecl="L"
        />
      </Pressable>
    </Animated.View>
  );
});

export default QrPreviewCard;
