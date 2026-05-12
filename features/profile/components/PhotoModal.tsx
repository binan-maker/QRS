import React, { useEffect } from "react";
import { View, Text, StyleSheet, Pressable, Modal } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/contexts/ThemeContext";

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
  const insets = useSafeAreaInsets();

  // ── Animation ──────────────────────────────────────────────────────────────
  const backdropOpacity = useSharedValue(0);
  const sheetTranslateY = useSharedValue(300);

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.ease) });
      sheetTranslateY.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.exp) });
    } else {
      backdropOpacity.value = withTiming(0, { duration: 180, easing: Easing.in(Easing.ease) });
      sheetTranslateY.value = withTiming(300, { duration: 200, easing: Easing.in(Easing.ease) });
    }
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* ── Dark backdrop ── */}
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View style={[styles.backdrop, backdropStyle]} />
      </Pressable>

      {/* ── Bottom sheet ── */}
      <Animated.View
        style={[
          styles.sheet,
          sheetStyle,
          {
            backgroundColor: colors.surface,
            borderColor: colors.surfaceBorder,
            paddingBottom: Math.max(insets.bottom, 28),
          },
        ]}
        pointerEvents="box-none"
      >
        <View style={[styles.handle, { backgroundColor: colors.surfaceBorder }]} />
        <Text style={[styles.title, { color: colors.text }]}>Profile Photo</Text>

        {/* Take Photo */}
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

        {/* Choose from Gallery */}
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

        {/* Remove Photo — only shown if user has an app-uploaded photo */}
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
      </Animated.View>
    </Modal>
  );
});

export default PhotoModal;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.52)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
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
