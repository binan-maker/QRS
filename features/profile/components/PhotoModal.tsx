import React, { memo, Fragment } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/shared/contexts/ThemeContext";
import BottomSheet from "@/shared/components/ui/BottomSheet";

interface Props {
  visible:             boolean;
  onCamera:            () => void;
  onGallery:           () => void;
  onRemove?:           () => void;
  canRemove?:          boolean;
  hasPhoto?:           boolean;
  hasGooglePhoto?:     boolean;
  onClose:             () => void;
  extraBottomPadding?: number;
}

const PhotoModal = memo(function PhotoModal({
  visible,
  onCamera,
  onGallery,
  onRemove,
  canRemove = false,
  hasPhoto,
  hasGooglePhoto,
  onClose,
  extraBottomPadding = 0,
}: Props) {
  const { colors } = useTheme();

  const isRemoveDisabled = !canRemove;
  const removeSub = hasGooglePhoto
    ? "Default Google photo cannot be removed"
    : canRemove
    ? "Revert to default avatar"
    : "No profile photo to remove";

  const options = [
    {
      icon: "camera-outline" as const,
      label: "Take Photo",
      sub: "Use your camera",
      iconBg: colors.primaryDim,
      iconColor: colors.primary,
      onPress: onCamera,
      danger: false,
      disabled: false,
    },
    {
      icon: "images-outline" as const,
      label: "Choose from Gallery",
      sub: "Pick an existing photo",
      iconBg: colors.accentDim,
      iconColor: colors.accent,
      onPress: onGallery,
      danger: false,
      disabled: false,
    },
    {
      icon: "trash-outline" as const,
      label: "Remove Photo",
      sub: removeSub,
      iconBg: isRemoveDisabled
        ? colors.isDark ? "#262626" : "#F2F4F7"
        : colors.dangerDim,
      iconColor: isRemoveDisabled ? colors.textMuted : colors.danger,
      onPress: isRemoveDisabled ? undefined : onRemove,
      danger: !isRemoveDisabled,
      disabled: isRemoveDisabled,
    },
  ];

  return (
    <BottomSheet visible={visible} onClose={onClose} extraBottomPadding={extraBottomPadding}>
      {options.map((opt, i) => (
        <Fragment key={opt.label}>
          <Pressable
            disabled={opt.disabled}
            style={({ pressed }) => [
              styles.option,
              opt.disabled ? { opacity: 0.38 } : { opacity: pressed ? 0.72 : 1 },
            ]}
            onPress={() => {
              if (opt.disabled) return;
              onClose();
              // Wait for the bottom sheet close animation to complete (220 ms)
              // before launching system UI. A small extra buffer ensures the
              // modal is fully dismissed on slower devices.
              setTimeout(() => opt.onPress?.(), 250);
            }}
          >
            <View style={[styles.optionIcon, { backgroundColor: opt.iconBg }]}>
              <Ionicons name={opt.icon} size={22} color={opt.iconColor} />
            </View>
            <View style={styles.optionText}>
              <Text
                style={[
                  styles.optionLabel,
                  { color: opt.disabled ? colors.textMuted : opt.danger ? colors.danger : colors.text },
                ]}
              >
                {opt.label}
              </Text>
              <Text style={[styles.optionSub, { color: colors.textMuted }]}>{opt.sub}</Text>
            </View>
            {!opt.disabled && (
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            )}
          </Pressable>
          {i < options.length - 1 && (
            <View style={[styles.rowDivider, { backgroundColor: colors.surfaceBorder }]} />
          )}
        </Fragment>
      ))}
    </BottomSheet>
  );
});

export default PhotoModal;

const styles = StyleSheet.create({
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
  },
  optionIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: { flex: 1 },
  optionLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  optionSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  rowDivider: { height: StyleSheet.hairlineWidth, marginVertical: 2 },
});
