import { View, Text, StyleSheet, Pressable, Modal } from "react-native";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { LOGO_POSITIONS, type LogoPosition } from "@/hooks/useQrGenerator";

interface Props {
  visible: boolean;
  logoPosition: LogoPosition;
  onSelect: (pos: LogoPosition) => void;
  onClose: () => void;
}

export default function PositionModal({ visible, logoPosition, onSelect, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <Text style={styles.title}>Logo Position</Text>
          <Text style={styles.sub}>Choose where to place your logo on the QR code</Text>
          <View style={styles.grid}>
            {LOGO_POSITIONS.map((pos) => (
              <Pressable
                key={pos.key}
                onPress={() => {
                  onSelect(pos.key);
                  onClose();
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={[styles.gridBtn, logoPosition === pos.key && styles.gridBtnActive]}
              >
                <View style={[styles.gridPreview, logoPosition === pos.key && styles.gridPreviewActive]}>
                  <View
                    style={[
                      styles.dot,
                      pos.key === "center" && { alignSelf: "center", marginTop: "auto", marginBottom: "auto" },
                      pos.key === "top-left" && { position: "absolute", top: 4, left: 4 },
                      pos.key === "top-right" && { position: "absolute", top: 4, right: 4 },
                      pos.key === "bottom-left" && { position: "absolute", bottom: 4, left: 4 },
                      pos.key === "bottom-right" && { position: "absolute", bottom: 4, right: 4 },
                    ]}
                  />
                </View>
                <Text style={[styles.gridLabel, logoPosition === pos.key && styles.gridLabelActive]}>{pos.label}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>Done</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: Colors.dark.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingTop: 16,
  },
  handle: { width: 40, height: 4, backgroundColor: Colors.dark.surfaceBorder, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.dark.text, marginBottom: 4 },
  sub: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary, marginBottom: 20 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center", marginBottom: 20 },
  gridBtn: {
    width: "28%", alignItems: "center", gap: 8, padding: 10,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
    backgroundColor: Colors.dark.surfaceLight,
  },
  gridBtnActive: { borderColor: Colors.dark.primary, backgroundColor: Colors.dark.primaryDim },
  gridPreview: {
    width: 48, height: 48, borderRadius: 8, position: "relative",
    backgroundColor: Colors.dark.surface, borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  gridPreviewActive: { borderColor: Colors.dark.primary },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.dark.textMuted },
  gridLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.dark.textMuted, textAlign: "center" },
  gridLabelActive: { color: Colors.dark.primary, fontFamily: "Inter_600SemiBold" },
  doneBtn: {
    backgroundColor: Colors.dark.primary, paddingVertical: 14, borderRadius: 14, alignItems: "center",
  },
  doneBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#000" },
});
