import { useLocalSearchParams } from "expo-router";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useAndroidNavBarScreen } from "@/shared/hooks/useAndroidNavBar";
import StaticQrDetailScreen from "./static/StaticQrDetailScreen";
import GuardQrDetailScreen from "./dynamic/guard/GuardQrDetailScreen";
import StandardQrDetailScreen from "./dynamic/standard/StandardQrDetailScreen";

export default function QrDetailScreen() {
  const { colors, isDark } = useTheme();
  useAndroidNavBarScreen(colors.background, isDark);

  const { id, guardUuid, standardUuid, ownerDocId, hintContent, hintContentType } = useLocalSearchParams<{
    id: string;
    guardUuid?: string;
    standardUuid?: string;
    ownerDocId?: string;
    hintContent?: string;
    hintContentType?: string;
  }>();

  const hint = hintContent ? { content: hintContent, contentType: hintContentType || "text" } : undefined;

  if (guardUuid) {
    return <GuardQrDetailScreen id={id} guardUuid={guardUuid} ownerDocId={ownerDocId} hint={hint} />;
  }

  if (standardUuid) {
    return <StandardQrDetailScreen id={id} standardUuid={standardUuid} ownerDocId={ownerDocId} hint={hint} />;
  }

  return <StaticQrDetailScreen id={id} hint={hint} />;
}
