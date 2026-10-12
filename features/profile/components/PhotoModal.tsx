import React, { memo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/shared/contexts/ThemeContext";
import BottomSheet from "@/shared/components/ui/BottomSheet";

interface Props {
  visible: boolean;
  onCamera: () => void;
  onGallery: () => void;
  onRemove?: () => void;
  canRemove?: boolean;
  hasPhoto?: boolean;
  hasGooglePhoto?: boolean;
  onClose: () => void;
  extraBottomPadding?: number;
}

const PhotoModal = memo(function PhotoModal({
  visible,
  onCamera,
  onGallery,
  onRemove,
  canRemove = false,
  hasGooglePhoto,
  onClose,
  extraBottomPadding = 0,
}: Props) {
  const { colors } = useTheme();

  const removeSub = hasGooglePhoto
    ? "Default Google photo cannot be removed"
    : canRemove
    ? "Revert to default avatar"
    : "No profile photo to remove";

  const options = [
    { icon: "camera-outline" as const, label: "Take Photo", sub: "Use your camera", bg: colors.primaryDim, fg: colors.primary, action: onCamera, disabled: false, danger: false },
    { icon: "images-outline" as const, label: "Choose from Gallery", sub: "Pick an existing photo", bg: colors.accentDim, fg: colors.accent, action: onGallery, disabled: false, danger: false },
    { icon: "trash-outline" as const, label: "Remove Photo", sub: removeSub, bg: !canRemove ? (colors.isDark ? "#262626" : "#F2F4F7") : colors.dangerDim, fg: !canRemove ? colors.textMuted : colors.danger, action: onRemove, disabled: !canRemove, danger: canRemove },
  ];

  return (
    <BottomSheet visible={visible} onClose={onClose} extraBottomPadding={extraBottomPadding}>
      {options.map((opt, i) => (
        <React.Fragment key={opt.label}>
          <Pressable
            disabled={opt.disabled}
            style={({ pressed }) => [styles.option, opt.disabled ? { opacity: 0.38 } : { opacity: pressed ? 0.72 : 1 }]}
            onPress={() => {
              if (opt.disabled) return;
              onClose();
              setTimeout(() => opt.action?.(), 250);
            }}
          >
            <View style={[styles.iconWrap, { backgroundColor: opt.bg }]}>
              <Ionicons name={opt.icon} size={22} color={opt.fg} />
            </View>
            <View style={styles.textCol}>
              <Text style={[styles.label, { color: opt.disabled ? colors.textMuted : opt.danger ? colors.danger : colors.text }]}>{opt.label}</Text>
              <Text style={[styles.sub, { color: colors.textMuted }]}>{opt.sub}</Text>
            </View>
            {!opt.disabled && <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />}
          </Pressable>
          {i < options.length - 1 && <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />}
        </React.Fragment>
      ))}
    </BottomSheet>
  );
});

export default PhotoModal;

const styles = StyleSheet.create({
  option: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14 },
  iconWrap: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  textCol: { flex: 1 },
  label: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  sub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 2 },
});
