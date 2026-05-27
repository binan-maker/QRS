import Reanimated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { AppColors } from "@/shared/constants/colors";
import type { StarterTemplate } from "@/features/generator/data/starter-templates";

interface Props {
  colors: AppColors;
  STARTER_TEMPLATES: StarterTemplate[];
  applyTemplate: (t: StarterTemplate) => void;
  startBlank: () => void;
}

export function PickStep({ colors, STARTER_TEMPLATES, applyTemplate, startBlank }: Props) {
  return (
    <Reanimated.View entering={FadeInUp.duration(220)} style={{ gap: 10 }}>
      <View style={[ss.infoCard, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "30" }]}>
        <Ionicons name="bulb-outline" size={16} color={colors.primary} />
        <Text style={[ss.infoText, { color: colors.primary }]}>
          A Custom QR lets you build any format — payment links, menus, tickets, and more — using your own fields.
        </Text>
      </View>

      <Text style={[ss.sectionLabel, { color: colors.textMuted }]}>START WITH A TEMPLATE</Text>

      {STARTER_TEMPLATES.map((t, idx) => (
        <Reanimated.View key={t.id} entering={FadeInDown.duration(220).delay(Math.min(idx, 3) * 22)}>
          <Pressable
            onPress={() => applyTemplate(t)}
            style={({ pressed }) => [
              ss.templateCard,
              { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, opacity: pressed ? 0.78 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
            ]}
          >
            <View style={[ss.templateCardIcon, { backgroundColor: t.color + "18" }]}>
              <Text style={{ fontSize: 22 }}>{t.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[ss.templateCardName, { color: colors.text }]}>{t.name}</Text>
              <Text style={[ss.templateCardTagline, { color: t.color }]}>{t.tagline}</Text>
              <Text style={[ss.templateCardDesc, { color: colors.textMuted }]} numberOfLines={2}>{t.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        </Reanimated.View>
      ))}

      <Pressable
        onPress={startBlank}
        style={({ pressed }) => [ss.blankBtn, { borderColor: colors.surfaceBorder, opacity: pressed ? 0.7 : 1 }]}
      >
        <Ionicons name="add-circle-outline" size={18} color={colors.textMuted} />
        <Text style={[ss.blankBtnText, { color: colors.textMuted }]}>Start blank — build from scratch</Text>
      </Pressable>
    </Reanimated.View>
  );
}

const ss = StyleSheet.create({
  infoCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderRadius: 14, borderWidth: 1, padding: 12 },
  infoText: { flex: 1, fontSize: 12.5, fontFamily: "Inter_400Regular", lineHeight: 18 },
  sectionLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.8, marginBottom: 2, marginTop: 4 },
  templateCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
  templateCardIcon: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  templateCardName: { fontSize: 14, fontFamily: "Inter_700Bold" },
  templateCardTagline: { fontSize: 11.5, fontFamily: "Inter_600SemiBold", marginTop: 1 },
  templateCardDesc: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2, lineHeight: 15 },
  blankBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, borderWidth: 1, borderStyle: "dashed", paddingVertical: 14, marginTop: 4 },
  blankBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
