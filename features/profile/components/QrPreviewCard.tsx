import React, { useCallback } from "react";
import { View, Text, Pressable, useWindowDimensions } from "react-native";
import QRCode from "react-native-qrcode-svg";
import Animated, { FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { safePush } from "@/shared/utils/navigation";
import { styles } from "@/features/profile/styles";
import { formatCompactNumber } from "@/shared/utils/number-format";

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
}

// Horizontal padding of the scroll view (20 each side) + row gap (8 * 2 gaps)
const H_PADDING = 40;
const GAP = 8;
const COLS = 3;

const QrPreviewCard = React.memo(function QrPreviewCard({ qr, colors }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const tileSize = Math.floor((screenWidth - H_PADDING - GAP * (COLS - 1)) / COLS);
  const qrSize = Math.floor(tileSize * 0.52);

  const onPress = useCallback(() => safePush(`/my-qr/${qr.docId}`), [qr.docId]);

  const displayName = qr.businessName?.trim() || "QR Code";
  const scanCount   = qr.scanCount ?? 0;

  return (
    <Animated.View entering={FadeIn.duration(240)}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.qrCard,
          {
            width: tileSize,
            height: tileSize,
            backgroundColor: colors.surface,
            borderColor: colors.surfaceBorder,
            opacity: pressed ? 0.78 : 1,
            transform: [{ scale: pressed ? 0.97 : 1 }],
          },
        ]}
      >
        {/* QR code — centred, takes up most of the tile */}
        <View style={[styles.qrCodeWrap, { backgroundColor: qr.bgColor || colors.surface }]}>
          <QRCode
            value={qr.content || "https://qrguard.app"}
            size={qrSize}
            color={qr.fgColor || "#0A0E17"}
            backgroundColor={qr.bgColor || "transparent"}
            quietZone={3}
            ecl="L"
          />
        </View>

        {/* Name + scan count pinned to bottom */}
        <View style={styles.qrCardFooter}>
          <Text
            style={[styles.qrCardName, { color: colors.text }]}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <Ionicons name="scan-outline" size={10} color={colors.textMuted} />
            <Text style={[styles.qrCardScans, { color: colors.textMuted }]}>
              {formatCompactNumber(scanCount)}
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
});

export default QrPreviewCard;
