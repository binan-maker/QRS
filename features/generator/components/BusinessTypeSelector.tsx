import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "@/lib/haptics";
import { useTheme } from "@/contexts/ThemeContext";

export type BusinessCategory = "dynamic" | "smartmenu" | "review" | "whatsapp" | "event";

export interface BusinessCategoryDef {
  key: BusinessCategory;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
  inputLabel: string;
  inputPlaceholder: string;
  inputKeyboard: "default" | "url" | "phone-pad";
}

export const BUSINESS_CATEGORIES: BusinessCategoryDef[] = [
  {
    key: "dynamic",
    label: "Dynamic URL",
    icon: "link-outline",
    description: "Point to any URL. Change the destination anytime without reprinting.",
    inputLabel: "Destination URL",
    inputPlaceholder: "https://your-website.com",
    inputKeyboard: "url",
  },
  {
    key: "smartmenu",
    label: "Smart Menu",
    icon: "restaurant-outline",
    description: "Digital menu or catalog. Optionally set business hours for a \"Closed\" message.",
    inputLabel: "Menu / Catalog URL",
    inputPlaceholder: "https://menu.example.com",
    inputKeyboard: "url",
  },
  {
    key: "review",
    label: "Review & Feedback",
    icon: "star-outline",
    description: "Send customers directly to your Google Maps or Yelp review page.",
    inputLabel: "Review Page URL",
    inputPlaceholder: "https://g.page/your-business/review",
    inputKeyboard: "url",
  },
  {
    key: "whatsapp",
    label: "WhatsApp Chat",
    icon: "logo-whatsapp",
    description: "Click-to-chat with a pre-filled opening message for instant support.",
    inputLabel: "WhatsApp Number",
    inputPlaceholder: "+91 9876543210",
    inputKeyboard: "phone-pad",
  },
  {
    key: "event",
    label: "Event & RSVP",
    icon: "calendar-outline",
    description: "Share your event details and let attendees add it to their calendar.",
    inputLabel: "Event Name",
    inputPlaceholder: "Grand Opening Night",
    inputKeyboard: "default",
  },
];

interface Props {
  businessCategory: BusinessCategory;
  onSelect: (cat: BusinessCategory) => void;
}

export default function BusinessTypeSelector({ businessCategory, onSelect }: Props) {
  const { colors } = useTheme();
  const selected = BUSINESS_CATEGORIES.find((c) => c.key === businessCategory) ?? BUSINESS_CATEGORIES[0];

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Business QR Type</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        <View style={styles.row}>
          {BUSINESS_CATEGORIES.map((cat) => {
            const active = businessCategory === cat.key;
            return (
              <Pressable
                key={cat.key}
                onPress={() => {
                  onSelect(cat.key);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={[
                  styles.chip,
                  { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
                  active && { backgroundColor: colors.warningDim, borderColor: colors.warning + "60" },
                ]}
              >
                <Ionicons
                  name={cat.icon}
                  size={14}
                  color={active ? colors.warning : colors.textMuted}
                />
                <Text
                  style={[styles.chipText, { color: active ? colors.warning : colors.textMuted }]}
                  maxFontSizeMultiplier={1}
                >
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      <View style={[styles.descBanner, { backgroundColor: colors.warningDim, borderColor: colors.warning + "30" }]}>
        <Ionicons name={selected.icon} size={14} color={colors.warning} />
        <Text style={[styles.descText, { color: colors.warning }]} maxFontSizeMultiplier={1}>
          {selected.description}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  row: { flexDirection: "row", gap: 8, paddingRight: 4 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  descBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderWidth: 1,
  },
  descText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular" },
});
