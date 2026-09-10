import { useLocalSearchParams } from "expo-router";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useAndroidNavBarScreen } from "@/shared/hooks/useAndroidNavBar";
import StaticQrDetailScreen from "./static/StaticQrDetailScreen";

export default function QrDetailScreen() {
  const { colors, isDark } = useTheme();
  useAndroidNavBarScreen(colors.background, isDark);

  const { id, hintContent, hintContentType } = useLocalSearchParams<{
    id: string;
    hintContent?: string;
    hintContentType?: string;
  }>();

  const hint = hintContent ? { content: hintContent, contentType: hintContentType || "text" } : undefined;

  return <StaticQrDetailScreen id={id} hint={hint} />;
}
