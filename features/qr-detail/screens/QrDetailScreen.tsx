import { useLocalSearchParams } from "expo-router";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useAndroidNavBarScreen } from "@/shared/utils/use-android-nav-bar";
import StaticQrDetailScreen from "./StaticQrDetailScreen";
import GuardQrDetailScreen from "./GuardQrDetailScreen";
import StandardQrDetailScreen from "./StandardQrDetailScreen";

export default function QrDetailScreen() {
  const { colors, isDark } = useTheme();
  useAndroidNavBarScreen(colors.background, isDark);

  const { id, guardUuid, standardUuid, ownerDocId } = useLocalSearchParams<{
    id: string;
    guardUuid?: string;
    standardUuid?: string;
    ownerDocId?: string;
  }>();

  if (guardUuid) {
    return <GuardQrDetailScreen id={id} guardUuid={guardUuid} ownerDocId={ownerDocId} />;
  }

  if (standardUuid) {
    return <StandardQrDetailScreen id={id} standardUuid={standardUuid} ownerDocId={ownerDocId} />;
  }

  return <StaticQrDetailScreen id={id} ownerDocId={ownerDocId} />;
}
