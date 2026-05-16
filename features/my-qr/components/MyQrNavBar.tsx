import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTheme } from "@/contexts/ThemeContext";
import { useScaleFns } from "@/lib/utils/use-scale";

interface Props {
  ctLabel: string;
  publicShortUuid: string | null;
  isBusiness: boolean;
  docId: string;
  onGroupPicker: () => void;
  onViewPublic: () => void;
}

export default function MyQrNavBar({ ctLabel, publicShortUuid, isBusiness, docId, onGroupPicker, onViewPublic }: Props) {
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

      <View style={{ alignItems: "center" }}>
        <Text style={{ fontSize: rf(16), fontFamily: "Inter_700Bold", color: colors.text }}>My QR Code</Text>
        <Text style={{ fontSize: rf(10), fontFamily: "Inter_500Medium", color: colors.textMuted, marginTop: 1 }}>{ctLabel}</Text>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: sp(8) }}>
        {publicShortUuid ? (
          <Pressable
            onPress={onViewPublic}
            style={{ width: sp(38), height: sp(38), borderRadius: sp(19), backgroundColor: colors.primaryDim, borderWidth: 1, borderColor: colors.primary + "35", alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="globe-outline" size={rf(18)} color={colors.primary} />
          </Pressable>
        ) : null}
        <Pressable
          onPress={onGroupPicker}
          style={{ width: sp(38), height: sp(38), borderRadius: sp(19), backgroundColor: "#6366F115", borderWidth: 1, borderColor: "#6366F135", alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="folder-outline" size={rf(18)} color="#6366F1" />
        </Pressable>
      </View>
    </View>
  );
}
