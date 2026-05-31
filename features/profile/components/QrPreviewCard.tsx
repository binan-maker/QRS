import React, { useCallback } from "react";
import { View, Text, Pressable } from "react-native";
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

const QrPreviewCard = React.memo(function QrPreviewCard({ qr, colors }: Props) {
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
            backgroundColor: colors.surface,
            borderColor: colors.surfaceBorder,
            opacity: pressed ? 0.78 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
      >
        {/* QR image */}
        <View style={[styles.qrCodeWrap, { backgroundColor: qr.bgColor || "#F8FAFC" }]}>
          <QRCode
            value={qr.content || "https://qrguard.app"}
            size={56}
            color={qr.fgColor || "#0A0E17"}
            backgroundColor={qr.bgColor || "#F8FAFC"}
            quietZone={4}
            ecl="L"
          />
        </View>

        {/* Name + scans */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={[styles.qrCardName, { color: colors.text }]}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Ionicons name="scan-outline" size={11} color={colors.textMuted} />
            <Text style={[styles.qrCardScans, { color: colors.textMuted }]}>
              {formatCompactNumber(scanCount)} scan{scanCount !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>

        {/* Chevron */}
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </Pressable>
    </Animated.View>
  );
});

export default QrPreviewCard;
