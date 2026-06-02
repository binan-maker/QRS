import React, { useCallback } from "react";
import { View, Text, Pressable } from "react-native";
import QRCode from "react-native-qrcode-svg";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { safePush } from "@/shared/utils/navigation";
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
  index?: number;
}

const QR_THUMB = 46;

const QrPreviewCard = React.memo(function QrPreviewCard({ qr, colors, index = 0 }: Props) {
  const onPress = useCallback(() => safePush(`/my-qr/${qr.docId}`), [qr.docId]);

  const displayName = qr.businessName?.trim() || "QR Code";
  const scanCount   = qr.scanCount ?? 0;

  const thumbBg = qr.bgColor || colors.surface;

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 8) * 40).duration(280)}
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.09,
        shadowRadius: 8,
        elevation: 3,
        marginBottom: -6,
      }}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          borderRadius: 18,
          borderWidth: 1,
          paddingHorizontal: 14,
          paddingVertical: 12,
          backgroundColor: colors.surface,
          borderColor: colors.surfaceBorder,
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.984 : 1 }],
        })}
      >
        {/* QR thumbnail */}
        <View
          style={{
            width: QR_THUMB + 16,
            height: QR_THUMB + 16,
            borderRadius: 14,
            backgroundColor: thumbBg,
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            overflow: "hidden",
          }}
        >
          <QRCode
            value={qr.content || "https://qrguard.app"}
            size={QR_THUMB}
            color={qr.fgColor || "#0A0E17"}
            backgroundColor={thumbBg}
            quietZone={2}
            ecl="L"
          />
        </View>

        {/* Info */}
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <Text
            style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: colors.text, letterSpacing: -0.1 }}
            numberOfLines={1}
            maxFontSizeMultiplier={1}
          >
            {displayName}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Ionicons name="scan-outline" size={11} color={colors.textMuted} />
            <Text
              style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.textMuted }}
              maxFontSizeMultiplier={1}
            >
              {formatCompactNumber(scanCount)} scans
            </Text>
          </View>
        </View>

        {/* Chevron */}
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 9,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.primaryDim,
            flexShrink: 0,
          }}
        >
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </View>
      </Pressable>
    </Animated.View>
  );
});

export default QrPreviewCard;
