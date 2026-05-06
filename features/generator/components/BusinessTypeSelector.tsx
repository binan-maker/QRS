import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "@/lib/haptics";
import { useTheme } from "@/contexts/ThemeContext";

export type BusinessCategory = "website" | "whatsapp" | "upi" | "wifi" | "event" | "phone";

export interface BusinessCategoryDef {
  key: BusinessCategory;
  label: string;
  tagline: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor: string;
}

export const BUSINESS_CATEGORIES: BusinessCategoryDef[] = [
  {
    key: "website",
    label: "Website",
    tagline: "Link to any page",
    icon: "globe-outline",
    accentColor: "#3B82F6",
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    tagline: "Chat instantly",
    icon: "logo-whatsapp",
    accentColor: "#22C55E",
  },
  {
    key: "upi",
    label: "UPI Pay",
    tagline: "Accept payments",
    icon: "card-outline",
    accentColor: "#8B5CF6",
  },
  {
    key: "wifi",
    label: "WiFi",
    tagline: "Share network access",
    icon: "wifi-outline",
    accentColor: "#0EA5E9",
  },
  {
    key: "event",
    label: "Event",
    tagline: "Calendar invite",
    icon: "calendar-outline",
    accentColor: "#EC4899",
  },
  {
    key: "phone",
    label: "Phone Call",
    tagline: "Tap to call",
    icon: "call-outline",
    accentColor: "#F59E0B",
  },
];

interface Props {
  businessCategory: BusinessCategory;
  onSelect: (cat: BusinessCategory) => void;
}

export default function BusinessTypeSelector({ businessCategory, onSelect }: Props) {
  const { colors } = useTheme();

  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>QR Type</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.row}>
          {BUSINESS_CATEGORIES.map((cat) => {
            const active = businessCategory === cat.key;
            const accent = cat.accentColor;
            return (
              <Pressable
                key={cat.key}
                onPress={() => {
                  onSelect(cat.key);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={({ pressed }) => [
                  styles.chip,
                  {
                    backgroundColor: active ? accent + "18" : colors.surface,
                    borderColor: active ? accent + "80" : colors.surfaceBorder,
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
              >
                <View style={[styles.chipIcon, { backgroundColor: active ? accent + "25" : colors.surfaceLight }]}>
                  <Ionicons name={cat.icon} size={16} color={active ? accent : colors.textMuted} />
                </View>
                <View>
                  <Text style={[styles.chipLabel, { color: active ? accent : colors.text }]}>
                    {cat.label}
                  </Text>
                  <Text style={[styles.chipTagline, { color: active ? accent + "BB" : colors.textMuted }]}>
                    {cat.tagline}
                  </Text>
                </View>
                {active && <View style={[styles.activeDot, { backgroundColor: accent }]} />}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 12, fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10,
  },
  row: { flexDirection: "row", gap: 8, paddingBottom: 4 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 16, borderWidth: 1.5,
    position: "relative", minWidth: 120,
  },
  chipIcon: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  chipLabel: { fontSize: 13, fontFamily: "Inter_700Bold" },
  chipTagline: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 1 },
  activeDot: {
    position: "absolute", top: 8, right: 8,
    width: 6, height: 6, borderRadius: 3,
  },
});
