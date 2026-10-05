import { Redirect, useLocalSearchParams } from "expo-router";
import { QrDetailScreen } from "@/features/qr-detail";
import { decodeQrShareCode } from "@/shared/utils/qr-share";

export default function SharedQrDetailRoute() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const shareCode = Array.isArray(code) ? code[0] : code;
  const qrId = shareCode ? decodeQrShareCode(shareCode) : null;

  if (!qrId) return <Redirect href="/" />;
  return <QrDetailScreen id={qrId} />;
}