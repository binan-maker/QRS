import { View, Text, StyleSheet, Pressable, Modal, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";

interface Props {
  visible: boolean;
  msgInput: string;
  onChangeMsgInput: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function DeactivateModal({ visible, msgInput, onChangeMsgInput, onCancel, onConfirm }: Props) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <Text style={[styles.title, { color: colors.text }]}>Deactivate QR Code</Text>
          <Text style={[styles.sub, { color: colors.textMuted }]}>
            Scanners will not see any links or actions. You can add an optional message (max 100 chars).
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder, color: colors.text }]}
            placeholder="Optional message to show scanners…"
            placeholderTextColor={colors.textMuted}
            value={msgInput}
            onChangeText={(t) => onChangeMsgInput(t.slice(0, 100))}
            multiline
            maxLength={100}
          />
          <Text style={[styles.charCount, { color: colors.textMuted }]}>{msgInput.length}/100</Text>
          <View style={styles.btns}>
            <Pressable style={[styles.cancelBtn, { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder }]} onPress={onCancel}>
              <Text style={[styles.cancelText, { color: colors.textMuted }]}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.confirmBtn, { backgroundColor: colors.danger }]} onPress={onConfirm}>
              <Ionicons name="pause-circle" size={16} color={colors.primaryText} />
              <Text style={[styles.confirmText, { color: colors.primaryText }]}>Deactivate</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "transparent", alignItems: "center", justifyContent: "center", padding: 24 },
  modal: { borderRadius: 20, borderWidth: 1, padding: 24, width: "100%" },
  title: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 6 },
  sub: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 16 },
  input: { borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 14, fontFamily: "Inter_400Regular", minHeight: 64, textAlignVertical: "top" },
  charCount: { fontSize: 11, textAlign: "right", marginBottom: 12 },
  btns: { flexDirection: "row", gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  cancelText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  confirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  confirmText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
