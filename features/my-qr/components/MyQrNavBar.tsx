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

  const pillBase = {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: sp(5),
    paddingHorizontal: sp(12),
    paddingVertical: sp(7),
    borderRadius: sp(20),
    borderWidth: 1,
  };

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
            style={({ pressed }) => ([
              pillBase,
              {
                backgroundColor: colors.accentDim,
                borderColor: colors.accent + "40",
                opacity: pressed ? 0.75 : 1,
                transform: [{ scale: pressed ? 0.96 : 1 }],
              },
            ])}
          >
            <Ionicons name="bar-chart-outline" size={rf(13)} color={colors.accent} />
            <Text style={{ fontSize: rf(12), fontFamily: "Inter_600SemiBold", color: colors.accent }}>Analytics</Text>
          </Pressable>
        )}

        {publicShortUuid ? (
          <Pressable
            onPress={onViewPublic}
            style={({ pressed }) => ([
              pillBase,
              {
                backgroundColor: colors.primaryDim,
                borderColor: colors.primary + "40",
                opacity: pressed ? 0.75 : 1,
                transform: [{ scale: pressed ? 0.96 : 1 }],
              },
            ])}
          >
            <Ionicons name="globe-outline" size={rf(13)} color={colors.primary} />
            <Text style={{ fontSize: rf(12), fontFamily: "Inter_600SemiBold", color: colors.primary }}>Public</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
