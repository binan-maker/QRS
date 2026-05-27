import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Reanimated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";

interface Props {
  templateName: string;
  onChange:     () => void;
}

export default function TemplateReadyCard({ templateName, onChange }: Props) {
  const { colors } = useTheme();
  return (
    <Reanimated.View entering={FadeInDown.duration(260)} style={styles.wrap}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.primary + "40" }]}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primaryDim }]}>
          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
        </View>
        <View style={styles.textBlock}>
          <Text style={[styles.title, { color: colors.text }]}>{templateName}</Text>
          <Text style={[styles.sub,   { color: colors.textMuted }]}>
            Content ready · QR generating below
          </Text>
        </View>
        <Pressable
          onPress={onChange}
          style={({ pressed }) => [
            styles.changeBtn,
            { backgroundColor: colors.primaryDim, opacity: pressed ? 0.75 : 1 },
          ]}
        >
          <Text style={[styles.changeBtnText, { color: colors.primary }]}>Change</Text>
        </Pressable>
      </View>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 20, marginTop: 12 },
  card: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 16, borderWidth: 1.5, padding: 14,
  },
  iconWrap: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  textBlock: { flex: 1 },
  title:     { fontSize: 13, fontFamily: "Inter_700Bold" },
  sub:       { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },
  changeBtn: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  changeBtnText: { fontSize: 12, fontFamily: "Inter_700Bold" },
});
