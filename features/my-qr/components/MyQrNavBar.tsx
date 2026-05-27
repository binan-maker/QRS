import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useScaleFns } from "@/shared/utils/use-scale";

interface Props {
  isBusiness: boolean;
  docId: string;
}

export default function MyQrNavBar({ isBusiness, docId }: Props) {
  const { colors } = useTheme();
  const { rf, sp } = useScaleFns();

  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: sp(20), paddingTop: sp(6), paddingBottom: sp(10) }}>
      <Pressable
        onPress={() => router.back()}
        style={{ width: sp(38), height: sp(38), borderRadius: sp(19), backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder, alignItems: "center", justifyContent: "center" }}
      >
        <Ionicons name="chevron-back" size={rf(20)} color={colors.text} />
      </Pressable>

      <Text style={{ fontSize: rf(16), fontFamily: "Inter_700Bold", color: colors.text }}>My QR Code</Text>

      <View style={{ width: sp(38) }} />
    </View>
  );
}
