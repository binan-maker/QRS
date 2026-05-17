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

  const options = [
    {
      icon: "camera-outline" as const,
      label: "Take Photo",
      sub: "Use your camera",
      iconBg: colors.primaryDim,
      iconColor: colors.primary,
      onPress: onCamera,
      danger: false,
    },
    {
      icon: "images-outline" as const,
      label: "Choose from Gallery",
      sub: "Pick an existing photo",
      iconBg: colors.accentDim,
      iconColor: colors.accent,
      onPress: onGallery,
      danger: false,
    },
    ...(hasPhoto && onRemove
      ? [{
          icon: "trash-outline" as const,
          label: "Remove Photo",
          sub: "Revert to default avatar",
          iconBg: colors.dangerDim,
          iconColor: colors.danger,
          onPress: onRemove,
          danger: true,
        }]
      : []),
  ];

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: colors.primaryDim }]}>
          <Ionicons name="person-circle-outline" size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Profile Photo</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Choose how to update your photo</Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />

      {/* Options */}
      {options.map((opt, i) => (
        <React.Fragment key={opt.label}>
          <Pressable
            style={({ pressed }) => [styles.option, { opacity: pressed ? 0.72 : 1 }]}
            onPress={() => { opt.onPress?.(); onClose(); }}
          >
            <View style={[styles.optionIcon, { backgroundColor: opt.iconBg }]}>
              <Ionicons name={opt.icon} size={22} color={opt.iconColor} />
            </View>
            <View style={styles.optionText}>
              <Text style={[styles.optionLabel, { color: opt.danger ? colors.danger : colors.text }]}>
                {opt.label}
              </Text>
              <Text style={[styles.optionSub, { color: colors.textMuted }]}>{opt.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
          {i < options.length - 1 && (
            <View style={[styles.rowDivider, { backgroundColor: colors.surfaceBorder }]} />
          )}
        </React.Fragment>
      ))}
    </BottomSheet>
  );
});

export default PhotoModal;

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginBottom: 8,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: { flex: 1 },
  optionLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  optionSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  rowDivider: { height: StyleSheet.hairlineWidth, marginVertical: 2 },
});
