import React from "react";
import { View, Text, StyleSheet, Pressable, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

interface Props {
  visible: boolean;
  onCamera: () => void;
  onGallery: () => void;
  onClose: () => void;
}

const PhotoModal = React.memo(function PhotoModal({ visible, onCamera, onGallery, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <Text style={styles.title}>Change Profile Photo</Text>
          <Pressable style={styles.option} onPress={onCamera}>
            <View style={[styles.optionIcon, { backgroundColor: Colors.dark.primaryDim }]}>
              <Ionicons name="camera-outline" size={22} color={Colors.dark.primary} />
            </View>
            <View>
              <Text style={styles.optionText}>Take Photo</Text>
              <Text style={styles.optionSub}>Use your camera</Text>
            </View>
          </Pressable>
          <View style={styles.divider} />
          <Pressable style={styles.option} onPress={onGallery}>
            <View style={[styles.optionIcon, { backgroundColor: Colors.dark.accentDim }]}>
              <Ionicons name="images-outline" size={22} color={Colors.dark.accent} />
            </View>
            <View>
              <Text style={styles.optionText}>Choose from Gallery</Text>
              <Text style={styles.optionSub}>Pick an existing photo</Text>
            </View>
          </Pressable>
          <Pressable style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
});

export default PhotoModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.dark.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 36, gap: 0,
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: Colors.dark.surfaceBorder, alignSelf: "center", marginBottom: 20,
  },
  title: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.dark.text, marginBottom: 20 },
  option: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12 },
  optionIcon: {
    width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center",
  },
  optionText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.dark.text },
  optionSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.dark.surfaceBorder, marginVertical: 4 },
  cancelBtn: {
    marginTop: 16, paddingVertical: 14, borderRadius: 14,
    backgroundColor: Colors.dark.surfaceLight, alignItems: "center",
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  cancelText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.dark.textSecondary },
});
