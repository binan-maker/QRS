import React, { useCallback } from "react";
import { View, Pressable } from "react-native";
import QRCode from "react-native-qrcode-svg";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";
import { safePush } from "@/shared/utils/navigation";
import { styles } from "@/features/profile/styles";

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
  index?: number;
}

const QrPreviewCard = React.memo(function QrPreviewCard({ qr, colors, index = 0 }: Props) {
  const onPress = useCallback(() => safePush(`/my-qr/${qr.docId}`), [qr.docId]);

  return (
    <Animated.View
      entering={FadeIn.delay(0).duration(240)}
      style={{ flex: 1 }}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.qrCard,
          {
            backgroundColor: qr.bgColor || colors.surface,
            borderColor: colors.surfaceBorder,
            opacity: pressed ? 0.78 : 1,
            transform: [{ scale: pressed ? 0.96 : 1 }],
          },
        ]}
      >
        <View style={[styles.qrCodeWrap, { backgroundColor: qr.bgColor || "#F8FAFC" }]}>
          <QRCode
            value={qr.content || "https://qrguard.app"}
            size={58}
            color={qr.fgColor || "#0A0E17"}
            backgroundColor={qr.bgColor || "#F8FAFC"}
            quietZone={4}
            ecl="L"
          />
        </View>
      </Pressable>
    </Animated.View>
  );
});

export default QrPreviewCard;
