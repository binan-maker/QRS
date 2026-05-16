import React, { useCallback, useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { safePush } from "@/lib/utils/navigation";
import { styles } from "@/features/profile/styles";

export interface QrItem {
  docId: string;
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
  const label = useMemo(() => {
    if (qr.businessName) return qr.businessName;
    const content = qr.content || "";
    try {
      const url = new URL(content.startsWith("http") ? content : `https://${content}`);
      const host = url.hostname.replace(/^www\./, "");
      const isLocal = /^(192\.168\.|10\.|127\.|localhost)/.test(host);
      if (isLocal || url.pathname.startsWith("/guard/")) {
        return qr.businessName || "Business QR";
      }
      if (host.includes(".") && host.length >= 4) return host;
    } catch {}
    if (content.startsWith("/guard/") || content.includes("/guard/")) return "Business QR";
    return content.length > 14 ? content.slice(0, 14) + "…" : content || "QR Code";
  }, [qr.businessName, qr.content]);

  const onPress = useCallback(() => safePush(`/my-qr/${qr.docId}`), [qr.docId]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.qrCard,
        { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <View style={[styles.qrCodeWrap, { backgroundColor: qr.bgColor || "#F8FAFC" }]}>
        <QRCode
          value={qr.content || "https://qrguard.app"}
          size={52}
          color={qr.fgColor || "#0A0E17"}
          backgroundColor={qr.bgColor || "#F8FAFC"}
          quietZone={3}
          ecl="L"
        />
      </View>
      <Text style={[styles.qrCardLabel, { color: colors.textSecondary }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
});

export default QrPreviewCard;
