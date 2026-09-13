import { useLocalSearchParams } from "expo-router";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useAndroidNavBarScreen } from "@/shared/hooks/useAndroidNavBar";
import { normalizeQrDetailContentType } from "./content-types";
import StaticQrDetailScreen from "./static/StaticQrDetailScreen";

export default function QrDetailScreen() {
  const { colors, isDark } = useTheme();
  useAndroidNavBarScreen(colors.background, isDark);

  const { id, hintContent, hintContentType } = useLocalSearchParams<{
    id: string;
    hintContent?: string;
    hintContentType?: string;
  }>();

  const hint = hintContent
    ? { content: hintContent, contentType: normalizeQrDetailContentType(hintContentType) }
    : undefined;

  return <StaticQrDetailScreen id={id} hint={hint} />;
}
