import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
import BottomSheet from "@/components/ui/BottomSheet";

interface Props {
  visible: boolean;
  onCamera: () => void;
  onGallery: () => void;
  onRemove?: () => void;
  hasPhoto?: boolean;
  onClose: () => void;
}

const PhotoModal = React.memo(function PhotoModal({
  visible,
  onCamera,
  onGallery,
  onRemove,
  hasPhoto,
  onClose,
}: Props) {
  const { colors } = useTheme();

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={[styles.title, { color: colors.text }]}>Profile Photo</Text>

      <Pressable
        style={({ pressed }) => [styles.option, { opacity: pressed ? 0.7 : 1 }]}
        onPress={onCamera}
      >
        <View style={[styles.optionIcon, { backgroundColor: colors.primaryDim }]}>
          <Ionicons name="camera-outline" size={22} color={colors.primary} />
        </View>
        <View style={styles.optionText}>
          <Text style={[styles.optionLabel, { color: colors.text }]}>Take Photo</Text>
          <Text style={[styles.optionSub, { color: colors.textSecondary }]}>Use your camera</Text>
        </View>
      </Pressable>

      <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />

      <Pressable
        style={({ pressed }) => [styles.option, { opacity: pressed ? 0.7 : 1 }]}
        onPress={onGallery}
      >
        <View style={[styles.optionIcon, { backgroundColor: colors.accentDim }]}>
          <Ionicons name="images-outline" size={22} color={colors.accent} />
        </View>
        <View style={styles.optionText}>
          <Text style={[styles.optionLabel, { color: colors.text }]}>Choose from Gallery</Text>
          <Text style={[styles.optionSub, { color: colors.textSecondary }]}>Pick an existing photo</Text>
        </View>
      </Pressable>

      {hasPhoto && onRemove && (
        <>
          <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />
          <Pressable
            style={({ pressed }) => [styles.option, { opacity: pressed ? 0.7 : 1 }]}
            onPress={onRemove}
          >
            <View style={[styles.optionIcon, { backgroundColor: colors.dangerDim }]}>
              <Ionicons name="trash-outline" size={22} color={colors.danger} />
            </View>
            <View style={styles.optionText}>
              <Text style={[styles.optionLabel, { color: colors.danger }]}>Remove Photo</Text>
              <Text style={[styles.optionSub, { color: colors.textSecondary }]}>Revert to default avatar</Text>
            </View>
          </Pressable>
        </>
      )}

      <Pressable
        style={({ pressed }) => [
          styles.cancelBtn,
          { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder, opacity: pressed ? 0.7 : 1 },
        ]}
        onPress={onClose}
      >
        <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
      </Pressable>
    </BottomSheet>
  );
});

export default PhotoModal;

const styles = StyleSheet.create({
  title: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    marginBottom: 16,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 11,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: { flex: 1 },
  optionLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  optionSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  divider: { height: 1, marginVertical: 4 },
  cancelBtn: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  cancelText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
