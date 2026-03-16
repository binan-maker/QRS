import { useEffect } from "react";
import { router } from "expo-router";
import { View } from "react-native";
import Colors from "@/constants/colors";

export default function GenerateRedirect() {
  useEffect(() => {
    router.replace("/(tabs)/qr-generator");
  }, []);

  return <View style={{ flex: 1, backgroundColor: Colors.dark.background }} />;
}
