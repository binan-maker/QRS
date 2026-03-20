import React from "react";
import { View, Text, StyleSheet, Pressable, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";

interface Props {
  visible: boolean;
  onCamera: () => void;
  onGallery: () => void;
  onClose: () => void;
}

const PhotoModal = React.memo(function PhotoModal({ visible, onCamera, onGallery, onClose }: Props) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]} onPress={() => {}}>
          <View style={[styles.handle, { backgroundColor: colors.surfaceBorder }]} />
          <Text style={[styles.title, { color: colors.text }]}>Change Profile Photo</Text>
          <Pressable style={styles.option} onPress={onCamera}>
            <View style={[styles.optionIcon, { backgroundColor: colors.primaryDim }]}>
              <Ionicons name="camera-outline" size={22} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.optionText, { color: colors.text }]}>Take Photo</Text>
              <Text style={[styles.optionSub, { color: colors.textSecondary }]}>Use your camera</Text>
            </View>
          </Pressable>
          <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />
          <Pressable style={styles.option} onPress={onGallery}>
            <View style={[styles.optionIcon, { backgroundColor: colors.accentDim }]}>
              <Ionicons name="images-outline" size={22} color={colors.accent} />
            </View>
            <View>
              <Text style={[styles.optionText, { color: colors.text }]}>Choose from Gallery</Text>
              <Text style={[styles.optionSub, { color: colors.textSecondary }]}>Pick an existing photo</Text>
            </View>
          </Pressable>
          <Pressable style={[styles.cancelBtn, { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder }]} onPress={onClose}>
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
});

export default PhotoModal;

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(5,11,24,0.82)", justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 36, borderWidth: 1,
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 20 },
  option: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12 },
  optionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  optionText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  optionSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  divider: { height: 1, marginVertical: 4 },
  cancelBtn: {
    marginTop: 16, paddingVertical: 14, borderRadius: 14, alignItems: "center", borderWidth: 1,
  },
  cancelText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
