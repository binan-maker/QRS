import { Text, Pressable } from "react-native";
import Reanimated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTheme } from "@/contexts/ThemeContext";
import { useScaleFns } from "@/lib/utils/use-scale";

export function DonationBanner({
  visible,
  bottomOffset,
  onDismiss,
}: {
  visible: boolean;
  bottomOffset: number;
  onDismiss: () => void;
}) {
  const { colors } = useTheme();
  const { rf, sp } = useScaleFns();

  if (!visible) return null;

  return (
    <Reanimated.View
      entering={FadeInDown.duration(380).springify()}
      style={{
        position: "absolute",
        left: sp(16),
        right: sp(16),
        bottom: bottomOffset,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.surface,
        borderRadius: sp(14),
        borderWidth: 1,
        borderColor: colors.primary + "35",
        paddingVertical: sp(10),
        paddingLeft: sp(14),
        paddingRight: sp(8),
        gap: sp(8),
      }}
    >
      <Pressable
        onPress={() => router.push("/donation" as any)}
        style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: sp(8) }}
      >
        <Text style={{ fontSize: rf(14), color: "#FF6B8A" }}>❤</Text>
        <Text
          numberOfLines={1}
          style={{ flex: 1, fontSize: rf(13), fontFamily: "Inter_500Medium", color: colors.text }}
        >
          Enjoying QR Guard? Support us
        </Text>
      </Pressable>
      <Pressable
        onPress={onDismiss}
        style={{
          width: sp(26),
          height: sp(26),
          borderRadius: sp(13),
          backgroundColor: colors.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="close" size={rf(14)} color={colors.textMuted} />
      </Pressable>
    </Reanimated.View>
  );
}
