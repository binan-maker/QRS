import { useEffect } from "react";
import { router } from "expo-router";
import { View } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";

export default function GenerateRedirect() {
  const { colors } = useTheme();
  useEffect(() => {
    router.replace("/(tabs)/qr-generator");
  }, []);

  return <View style={{ flex: 1, backgroundColor: colors.background }} />;
}
