import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useScaleFns } from "@/shared/utils/use-scale";

interface Props {
  docId: string;
}

export default function MyQrNavBar({ docId }: Props) {
  const { colors } = useTheme();
  const { rf, sp } = useScaleFns();

  return (
    <View style={{
      flexDirection: "row", alignItems: "center",
      paddingHorizontal: sp(20), paddingTop: sp(8), paddingBottom: sp(12),
      gap: sp(12),
    }}>
      <Pressable
        onPress={() => router.back()}
        style={({ pressed }) => [{
          width: sp(38), height: sp(38), borderRadius: sp(12),
          backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder,
          alignItems: "center", justifyContent: "center",
          opacity: pressed ? 0.7 : 1,
        }]}
      >
        <Ionicons name="chevron-back" size={rf(20)} color={colors.text} />
      </Pressable>

      <Text style={{
        flex: 1,
        fontSize: rf(16), fontFamily: "Inter_700Bold", color: colors.text,
        letterSpacing: -0.3,
      }}>
        My QR Code
      </Text>
    </View>
  );
}
