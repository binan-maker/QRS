import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "@/lib/haptics";
import { useTheme } from "@/contexts/ThemeContext";

export type BusinessCategory = "dynamic" | "smartmenu" | "review" | "whatsapp" | "event" | "upi";

export interface BusinessCategoryDef {
  key: BusinessCategory;
  label: string;
  tagline: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor: string;
  inputLabel: string;
  inputPlaceholder: string;
  inputKeyboard: "default" | "url" | "phone-pad";
}

export const BUSINESS_CATEGORIES: BusinessCategoryDef[] = [
  {
    key: "dynamic",
    label: "Dynamic URL",
    tagline: "Change destination anytime",
    icon: "refresh-circle-outline",
    accentColor: "#3B82F6",
    inputLabel: "Destination URL",
    inputPlaceholder: "https://your-website.com",
    inputKeyboard: "url",
  },
  {
    key: "smartmenu",
    label: "Smart Menu",
    tagline: "Digital menu, always fresh",
    icon: "restaurant-outline",
    accentColor: "#F59E0B",
    inputLabel: "Menu / Catalog URL",
    inputPlaceholder: "https://menu.example.com",
    inputKeyboard: "url",
  },
  {
    key: "review",
    label: "Review Boost",
    tagline: "More 5-star reviews, effortlessly",
    icon: "star-outline",
    accentColor: "#EF4444",
    inputLabel: "Review Page URL",
    inputPlaceholder: "https://g.page/your-business/review",
    inputKeyboard: "url",
  },
  {
    key: "whatsapp",
    label: "WhatsApp Direct",
    tagline: "Chat-first customer support",
    icon: "logo-whatsapp",
    accentColor: "#22C55E",
    inputLabel: "WhatsApp Number",
    inputPlaceholder: "+91 9876543210",
    inputKeyboard: "phone-pad",
  },
  {
    key: "upi",
    label: "UPI Payment",
    tagline: "Tap-to-pay for your shop",
    icon: "card-outline",
    accentColor: "#8B5CF6",
    inputLabel: "UPI ID",
    inputPlaceholder: "yourname@upi or 9876543210@paytm",
    inputKeyboard: "default",
  },
  {
    key: "event",
    label: "Event & RSVP",
    tagline: "Instant calendar sync",
    icon: "calendar-outline",
    accentColor: "#EC4899",
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

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Business Type</Text>
      <View style={styles.grid}>
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
                styles.card,
                {
                  backgroundColor: active ? accent + "18" : colors.surface,
                  borderColor: active ? accent + "70" : colors.surfaceBorder,
                  opacity: pressed ? 0.78 : 1,
                },
              ]}
            >
              <View style={[styles.iconBox, { backgroundColor: active ? accent + "25" : colors.surfaceLight }]}>
                <Ionicons name={cat.icon} size={20} color={active ? accent : colors.textMuted} />
              </View>
              <Text
                style={[styles.cardLabel, { color: active ? accent : colors.text }]}
                numberOfLines={1}
              >
                {cat.label}
              </Text>
              <Text
                style={[styles.cardTagline, { color: active ? accent + "CC" : colors.textMuted }]}
                numberOfLines={2}
              >
                {cat.tagline}
              </Text>
              {active && (
                <View style={[styles.activeDot, { backgroundColor: accent }]} />
              )}
            </Pressable>
          );
        })}
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
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },
  card: {
    width: "48%",
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 13,
    gap: 6,
    position: "relative",
    overflow: "hidden",
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  cardLabel: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  cardTagline: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    lineHeight: 15,
  },
  activeDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});
