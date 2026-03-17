import { View, Text, StyleSheet, Pressable, Modal, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

interface Props {
  visible: boolean;
  target: "fg" | "bg";
  colorInput: string;
  onChangeInput: (v: string) => void;
  onCancel: () => void;
  onApply: () => void;
}

export default function CustomColorModal({ visible, target, colorInput, onChangeInput, onCancel, onApply }: Props) {
  const previewColor = (() => {
    let h = colorInput.trim();
    if (!h.startsWith("#")) h = "#" + h;
    return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(h) ? h : Colors.dark.surfaceLight;
  })();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Pressable style={styles.overlay} onPress={onCancel}>
          <Pressable style={[styles.modal, { gap: 16 }]} onPress={() => {}}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <Ionicons name="color-palette-outline" size={22} color={Colors.dark.primary} />
              <Text style={styles.title}>Custom {target === "fg" ? "Dot" : "Background"} Color</Text>
            </View>
            <Text style={{ fontSize: 13, color: Colors.dark.textMuted, fontFamily: "Inter_400Regular" }}>
              Enter any hex color code (e.g. #FF5500 or #F50)
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: previewColor, borderWidth: 2, borderColor: Colors.dark.surfaceBorder }} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="#000000"
                placeholderTextColor={Colors.dark.textMuted}
                value={colorInput}
                onChangeText={onChangeInput}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={7}
              />
            </View>
            <View style={styles.btns}>
              <Pressable style={styles.cancelBtn} onPress={onCancel}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.applyBtn} onPress={onApply}>
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text style={styles.applyText}>Apply</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center", padding: 24 },
  modal: { backgroundColor: Colors.dark.surface, borderRadius: 20, borderWidth: 1, borderColor: Colors.dark.surfaceBorder, padding: 24, width: "100%" },
  title: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.dark.text },
  input: {
    backgroundColor: Colors.dark.surfaceLight, borderRadius: 12, borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
    padding: 12, fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.dark.text, letterSpacing: 1,
  },
  btns: { flexDirection: "row", gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: Colors.dark.surfaceLight, borderWidth: 1, borderColor: Colors.dark.surfaceBorder, alignItems: "center" },
  cancelText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.dark.textMuted },
  applyBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: Colors.dark.danger, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  applyText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
