import React, { memo } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";

interface Props {
  qrValue: string;
  qrSize: number;
  onSizeIncrease: () => void;
  onSizeDecrease: () => void;
  onCopy: () => void;
  onShare: () => void;
  onDownload: () => void;
  onClear: () => void;
  sharingQr: boolean;
  downloadingPdf: boolean;
}

function QrOutputActions({
  qrValue, qrSize,
  onSizeIncrease, onSizeDecrease,
  onCopy, onShare, onDownload, onClear,
  sharingQr, downloadingPdf,
}: Props) {
  const { colors } = useTheme();

  const actions = [
    { icon: "copy-outline"     as const, label: "Copy",  color: colors.textSecondary, onPress: onCopy,     disabled: false,          loading: false          },
    { icon: "share-outline"    as const, label: "Share", color: colors.textSecondary, onPress: onShare,    disabled: sharingQr,      loading: sharingQr      },
    { icon: "download-outline" as const, label: "PDF",   color: colors.textSecondary, onPress: onDownload, disabled: downloadingPdf, loading: downloadingPdf },
    { icon: "trash-outline"    as const, label: "Clear", color: colors.textMuted,     onPress: onClear,    disabled: false,          loading: false          },
  ];

  return (
    <>
      <Text style={[styles.qrContentPreview, { color: colors.textMuted }]} numberOfLines={2}>
        {qrValue}
      </Text>

      <Animated.View entering={FadeInDown.delay(90).duration(260)} style={[styles.sizeRow, { borderTopColor: colors.surfaceBorder }]}>
        <Text style={[styles.sizeLabel, { color: colors.textSecondary }]}>Size</Text>
        <View style={styles.sizeButtons}>
          <Pressable onPress={onSizeDecrease} style={[styles.sizeBtn, { backgroundColor: colors.primaryDim }]}>
            <Ionicons name="remove" size={18} color={colors.primary} />
          </Pressable>
          <Text style={[styles.sizePx, { color: colors.text }]}>{qrSize}px</Text>
          <Pressable onPress={onSizeIncrease} style={[styles.sizeBtn, { backgroundColor: colors.primaryDim }]}>
            <Ionicons name="add" size={18} color={colors.primary} />
          </Pressable>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(100).duration(260)} style={[styles.qrActions, { borderTopColor: colors.surfaceBorder }]}>
        {actions.map(({ icon, label, color, onPress, disabled, loading }, idx) => (
          <Animated.View key={label} entering={FadeInDown.delay(60 + idx * 18).duration(260)} style={{ flex: 1 }}>
            <Pressable
              onPress={onPress}
              disabled={disabled}
              style={({ pressed }) => [
                styles.qrActionBtn,
                { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder, opacity: pressed || disabled ? 0.7 : 1 },
              ]}
            >
              {loading
                ? <ActivityIndicator size={16} color={color} />
                : <Ionicons name={icon} size={18} color={color} />}
              <Text style={[styles.qrActionText, { color }]}>{loading ? "…" : label}</Text>
            </Pressable>
          </Animated.View>
        ))}
      </Animated.View>
    </>
  );
}

export default memo(QrOutputActions);

const styles = StyleSheet.create({
  qrContentPreview: { fontSize: 12, fontFamily: "Inter_400Regular", paddingHorizontal: 16, paddingBottom: 8, textAlign: "center" },
  sizeRow:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1 },
  sizeLabel:  { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  sizeButtons:{ flexDirection: "row", alignItems: "center", gap: 12 },
  sizeBtn:    { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  sizePx:     { fontSize: 14, fontFamily: "Inter_700Bold", minWidth: 52, textAlign: "center" },
  qrActions:  { flexDirection: "row", gap: 8, padding: 16, borderTopWidth: 1 },
  qrActionBtn:{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 12, borderRadius: 14, borderWidth: 1 },
  qrActionText:{ fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
