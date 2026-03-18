import { useEffect } from "react";
import { router } from "expo-router";
import { View } from "react-native";
import Colors from "@/constants/colors";

export default function TabSettingsRedirect() {
  useEffect(() => {
    router.replace("/settings");
  }, []);
  return <View style={{ flex: 1, backgroundColor: Colors.dark.background }} />;
}
