import { View, Text, Pressable, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
import { useScaleFns } from "@/lib/utils/use-scale";

interface Props {
  visible: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmActionModal({ visible, message, onConfirm, onCancel }: Props) {
  const { colors } = useTheme();
  const { rf, sp } = useScaleFns();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", padding: sp(20) }}
        onPress={onCancel}
      >
        <Pressable style={{ backgroundColor: colors.surface, borderRadius: sp(20), padding: sp(24), width: "100%", maxWidth: 360, gap: sp(14) }}>
          <View style={{ width: sp(48), height: sp(48), borderRadius: sp(14), backgroundColor: colors.warningDim, alignItems: "center", justifyContent: "center", alignSelf: "center" }}>
            <Ionicons name="warning-outline" size={rf(24)} color={colors.warning} />
          </View>
          <Text style={{ fontSize: rf(16), fontFamily: "Inter_700Bold", color: colors.text, textAlign: "center" }}>Confirm Update</Text>
          <Text style={{ fontSize: rf(13), fontFamily: "Inter_400Regular", color: colors.textSecondary, textAlign: "center", lineHeight: rf(20) }}>
            {message}
          </Text>
          <View style={{ flexDirection: "row", gap: sp(10) }}>
            <Pressable
              onPress={onCancel}
              style={{ flex: 1, borderRadius: sp(12), borderWidth: 1, borderColor: colors.surfaceBorder, padding: sp(12), alignItems: "center" }}
            >
              <Text style={{ fontSize: rf(13), fontFamily: "Inter_600SemiBold", color: colors.textSecondary }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              style={{ flex: 1, borderRadius: sp(12), backgroundColor: colors.primary, padding: sp(12), alignItems: "center" }}
            >
              <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: "#fff" }}>Confirm</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
