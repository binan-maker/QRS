import { View, Text, StyleSheet, Pressable, Modal, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

interface Props {
  visible: boolean;
  msgInput: string;
  onChangeMsgInput: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function DeactivateModal({ visible, msgInput, onChangeMsgInput, onCancel, onConfirm }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Deactivate QR Code</Text>
          <Text style={styles.sub}>
            Scanners will not see any links or actions. You can add an optional message (max 100 chars).
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Optional message to show scanners…"
            placeholderTextColor={Colors.dark.textMuted}
            value={msgInput}
            onChangeText={(t) => onChangeMsgInput(t.slice(0, 100))}
            multiline
            maxLength={100}
          />
          <Text style={styles.charCount}>{msgInput.length}/100</Text>
          <View style={styles.btns}>
            <Pressable style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.confirmBtn} onPress={onConfirm}>
              <Ionicons name="pause-circle" size={16} color="#fff" />
              <Text style={styles.confirmText}>Deactivate</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center", padding: 24 },
  modal: {
    backgroundColor: Colors.dark.surface, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder, padding: 24, width: "100%",
  },
  title: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.dark.text, marginBottom: 6 },
  sub: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted, marginBottom: 16 },
  input: {
    backgroundColor: Colors.dark.surfaceLight, borderRadius: 12, borderWidth: 1,
    borderColor: Colors.dark.surfaceBorder, padding: 12, fontSize: 14,
    fontFamily: "Inter_400Regular", color: Colors.dark.text, minHeight: 64, textAlignVertical: "top",
  },
  charCount: { fontSize: 11, color: Colors.dark.textMuted, textAlign: "right", marginBottom: 12 },
  btns: { flexDirection: "row", gap: 10 },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    backgroundColor: Colors.dark.surfaceLight, borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
    alignItems: "center",
  },
  cancelText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.dark.textMuted },
  confirmBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: Colors.dark.danger,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
  },
  confirmText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
