import { View, Text, StyleSheet, Pressable, Modal } from "react-native";
import * as Haptics from "@/lib/haptics";
import { useTheme } from "@/contexts/ThemeContext";
import { LOGO_POSITIONS, type LogoPosition } from "@/hooks/useQrGenerator";

interface Props {
  visible: boolean;
  logoPosition: LogoPosition;
  onSelect: (pos: LogoPosition) => void;
  onClose: () => void;
}

export default function PositionModal({ visible, logoPosition, onSelect, onClose }: Props) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={() => {}}>
          <View style={[styles.handle, { backgroundColor: colors.surfaceBorder }]} />
          <Text style={[styles.title, { color: colors.text }]}>Logo Position</Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>Choose where to place your logo on the QR code</Text>
          <View style={styles.grid}>
            {LOGO_POSITIONS.map((pos) => (
              <Pressable
                key={pos.key}
                onPress={() => {
                  onSelect(pos.key);
                  onClose();
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={[
                  styles.gridBtn,
                  { borderColor: colors.surfaceBorder, backgroundColor: colors.surfaceLight },
                  logoPosition === pos.key && { borderColor: colors.primary, backgroundColor: colors.primaryDim },
                ]}
              >
                <View style={[
                  styles.gridPreview,
                  { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
                  logoPosition === pos.key && { borderColor: colors.primary },
                ]}>
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: logoPosition === pos.key ? colors.primary : colors.textMuted },
                      pos.key === "center" && { alignSelf: "center", marginTop: "auto", marginBottom: "auto" },
                      pos.key === "top-left" && { position: "absolute", top: 4, left: 4 },
                      pos.key === "top-right" && { position: "absolute", top: 4, right: 4 },
                      pos.key === "bottom-left" && { position: "absolute", bottom: 4, left: 4 },
                      pos.key === "bottom-right" && { position: "absolute", bottom: 4, right: 4 },
                    ]}
                  />
                </View>
                <Text style={[
                  styles.gridLabel,
                  { color: logoPosition === pos.key ? colors.primary : colors.textMuted },
                  logoPosition === pos.key && { fontFamily: "Inter_600SemiBold" },
                ]}>{pos.label}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={[styles.doneBtn, { backgroundColor: colors.primary }]} onPress={onClose}>
            <Text style={[styles.doneBtnText, { color: colors.primaryText }]}>Done</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(5,11,24,0.82)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingTop: 16 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 4 },
  sub: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 20 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center", marginBottom: 20 },
  gridBtn: {
    width: "28%", alignItems: "center", gap: 8, padding: 10,
    borderRadius: 12, borderWidth: 1,
  },
  gridPreview: {
    width: 48, height: 48, borderRadius: 8, position: "relative",
    borderWidth: 1,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  gridLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "center" },
  doneBtn: { paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  doneBtnText: { fontSize: 16, fontFamily: "Inter_700Bold" },
});
