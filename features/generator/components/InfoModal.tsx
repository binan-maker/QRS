import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
import BottomSheet from "@/components/ui/BottomSheet";

interface Props {
  visible: boolean;
  onClose: () => void;
}

const MODES = [
  {
    icon: "shield-checkmark" as const,
    label: "Standard QR",
    desc: "The sticker encodes a QR Guard URL — not the real content. Only our database reveals the destination. Other scanners just see our web page. You own this link forever.",
    iconColor: "#6366F1",
    iconBg: "#6366F115",
    accent: "#6366F1",
  },
  {
    icon: "storefront-outline" as const,
    label: "Business QR",
    desc: "Same database-lock as Standard, plus you can change the destination any time without reprinting. Perfect for menus, landing pages, and campaigns.",
    iconColor: "#F59E0B",
    iconBg: "#F59E0B15",
    accent: "#F59E0B",
  },
  {
    icon: "eye-off-outline" as const,
    label: "Private QR",
    desc: "100% offline — raw content is baked directly into the sticker. No database entry, no scan tracking, no account required. Zero trace.",
    iconColor: "#94A3B8",
    iconBg: "#94A3B815",
    accent: "#94A3B8",
  },
];

const EXTRAS = [
  {
    icon: "image-outline" as const,
    label: "Custom Logo",
    desc: "Place your own logo at the center or any corner of the QR code.",
    iconColor: "#22D3EE",
    iconBg: "#22D3EE15",
  },
  {
    icon: "lock-closed-outline" as const,
    label: "Database Licensing",
    desc: "Third-party apps can't decode a Standard or Business QR without our database — enabling B2B licensing revenue for QR Guard.",
    iconColor: "#A78BFA",
    iconBg: "#A78BFA15",
  },
];

export default function InfoModal({ visible, onClose }: Props) {
  const { colors } = useTheme();

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: colors.primaryDim }]}>
          <Ionicons name="information-circle" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>About QR Generation</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Three modes — one powerful platform</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>MODES</Text>

        {MODES.map((f, i) => (
          <View
            key={i}
            style={[
              styles.item,
              { borderBottomColor: colors.surfaceBorder },
              i === MODES.length - 1 && { borderBottomWidth: 0, marginBottom: 12 },
            ]}
          >
            <View style={[styles.itemIcon, { backgroundColor: f.iconBg }]}>
              <Ionicons name={f.icon} size={17} color={f.iconColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemLabel, { color: f.accent }]}>{f.label}</Text>
              <Text style={[styles.itemDesc, { color: colors.textSecondary }]}>{f.desc}</Text>
            </View>
          </View>
        ))}

        <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: 4 }]}>FEATURES</Text>

        {EXTRAS.map((f, i) => (
          <View
            key={i}
            style={[
              styles.item,
              { borderBottomColor: colors.surfaceBorder },
              i === EXTRAS.length - 1 && { borderBottomWidth: 0 },
            ]}
          >
            <View style={[styles.itemIcon, { backgroundColor: f.iconBg }]}>
              <Ionicons name={f.icon} size={17} color={f.iconColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemLabel, { color: colors.text }]}>{f.label}</Text>
              <Text style={[styles.itemDesc, { color: colors.textSecondary }]}>{f.desc}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <Pressable
        style={({ pressed }) => [
          styles.closeBtn,
          { backgroundColor: colors.primary, opacity: pressed ? 0.82 : 1 },
        ]}
        onPress={onClose}
      >
        <Text style={[styles.closeBtnText, { color: colors.primaryText }]}>Got it</Text>
      </Pressable>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12,
  },
  headerIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  title: { fontSize: 16, fontFamily: "Inter_700Bold", lineHeight: 20 },
  subtitle: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  sectionLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.1,
    marginBottom: 4,
    marginLeft: 2,
  },
  item: {
    flexDirection: "row", gap: 12,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemIcon: {
    width: 38, height: 38, borderRadius: 11,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  itemLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  itemDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  closeBtn: {
    marginTop: 14, marginBottom: 4, paddingVertical: 13,
    borderRadius: 14, alignItems: "center",
  },
  closeBtnText: { fontSize: 14, fontFamily: "Inter_700Bold" },
});
