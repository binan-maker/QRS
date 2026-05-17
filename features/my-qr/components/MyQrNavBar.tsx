import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTheme } from "@/contexts/ThemeContext";
import { useScaleFns } from "@/lib/utils/use-scale";

interface Props {
  publicShortUuid: string | null;
  isBusiness: boolean;
  docId: string;
  onViewPublic: () => void;
  onViewAnalytics?: () => void;
}

export default function MyQrNavBar({ publicShortUuid, isBusiness, docId, onViewPublic, onViewAnalytics }: Props) {
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

      <View style={{ flexDirection: "row", alignItems: "center", gap: sp(8) }}>
        {onViewAnalytics && (
          <Pressable
            onPress={onViewAnalytics}
            style={({ pressed }) => ({ width: sp(38), height: sp(38), borderRadius: sp(19), backgroundColor: colors.accentDim, borderWidth: 1, borderColor: colors.accent + "35", alignItems: "center", justifyContent: "center", opacity: pressed ? 0.75 : 1 })}
          >
            <Ionicons name="bar-chart-outline" size={rf(17)} color={colors.accent} />
          </Pressable>
        )}
        {publicShortUuid ? (
          <Pressable
            onPress={onViewPublic}
            style={({ pressed }) => ({ width: sp(38), height: sp(38), borderRadius: sp(19), backgroundColor: colors.primaryDim, borderWidth: 1, borderColor: colors.primary + "35", alignItems: "center", justifyContent: "center", opacity: pressed ? 0.75 : 1 })}
          >
            <Ionicons name="globe-outline" size={rf(18)} color={colors.primary} />
          </Pressable>
        ) : (
          <View style={{ width: sp(38) }} />
        )}
      </View>
    </View>
  );
}
