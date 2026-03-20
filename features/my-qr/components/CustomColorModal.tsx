import { View, Text, StyleSheet, Pressable, Modal, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";

interface Props {
  visible: boolean;
  target: "fg" | "bg";
  colorInput: string;
  onChangeInput: (v: string) => void;
  onCancel: () => void;
  onApply: () => void;
}

export default function CustomColorModal({ visible, target, colorInput, onChangeInput, onCancel, onApply }: Props) {
  const { colors } = useTheme();

  const previewColor = (() => {
    let h = colorInput.trim();
    if (!h.startsWith("#")) h = "#" + h;
    return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(h) ? h : colors.surfaceLight;
  })();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Pressable style={styles.overlay} onPress={onCancel}>
          <Pressable style={[styles.modal, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, gap: 16 }]} onPress={() => {}}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <Ionicons name="color-palette-outline" size={22} color={colors.primary} />
              <Text style={[styles.title, { color: colors.text }]}>Custom {target === "fg" ? "Dot" : "Background"} Color</Text>
            </View>
            <Text style={{ fontSize: 13, color: colors.textMuted, fontFamily: "Inter_400Regular" }}>
              Enter any hex color code (e.g. #FF5500 or #F50)
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: previewColor, borderWidth: 2, borderColor: colors.surfaceBorder }} />
              <TextInput
                style={[styles.input, { flex: 1, backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder, color: colors.text }]}
                placeholder="#000000"
                placeholderTextColor={colors.textMuted}
                value={colorInput}
                onChangeText={onChangeInput}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={7}
              />
            </View>
            <View style={styles.btns}>
              <Pressable style={[styles.cancelBtn, { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder }]} onPress={onCancel}>
                <Text style={[styles.cancelText, { color: colors.textMuted }]}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.applyBtn, { backgroundColor: colors.primary }]} onPress={onApply}>
                <Ionicons name="checkmark" size={16} color={colors.primaryText} />
                <Text style={[styles.applyText, { color: colors.primaryText }]}>Apply</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(5,11,24,0.82)", alignItems: "center", justifyContent: "center", padding: 24 },
  modal: { borderRadius: 20, borderWidth: 1, padding: 24, width: "100%" },
  title: { fontSize: 17, fontFamily: "Inter_700Bold" },
  input: { borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 14, fontFamily: "Inter_500Medium", letterSpacing: 1 },
  btns: { flexDirection: "row", gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  cancelText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  applyBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  applyText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
