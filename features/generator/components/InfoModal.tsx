import { View, Text, StyleSheet, Pressable, Modal, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/contexts/ThemeContext";

interface Props {
  visible: boolean;
  onClose: () => void;
}

const FEATURES = [
  {
    icon: "shield-checkmark" as const,
    label: "Branded",
    desc: "Signed with your QR Guard ID and saved to your profile.",
    colorKey: "primary" as const,
    dimKey: "primaryDim" as const,
  },
  {
    icon: "eye-off-outline" as const,
    label: "Private",
    desc: "Fully local — no ID, no data sent or saved anywhere.",
    colorKey: "textSecondary" as const,
    dimKey: "surfaceLight" as const,
  },
  {
    icon: "card-outline" as const,
    label: "UPI",
    desc: "Generate payment QRs for PhonePe, GPay, Paytm & more.",
    colorKey: null,
    dimKey: null,
    iconColor: "#FBBF24",
    iconBg: "#FBBF2420",
  },
  {
    icon: "image-outline" as const,
    label: "Custom Logo",
    desc: "Add your own logo — place it center or in any corner.",
    colorKey: "accent" as const,
    dimKey: "accentDim" as const,
  },
];

export default function InfoModal({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              paddingBottom: Math.max(insets.bottom, 16) + 8,
            },
          ]}
          onPress={() => {}}
        >
          <View style={[styles.handle, { backgroundColor: colors.surfaceBorder }]} />

          <View style={styles.header}>
            <View style={[styles.headerIcon, { backgroundColor: colors.primaryDim }]}>
              <Ionicons name="information-circle" size={18} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>About QR Generation</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
            {FEATURES.map((f, i) => {
              const iconColor = f.iconColor ?? (f.colorKey ? (colors as any)[f.colorKey] : colors.primary);
              const iconBg = f.iconBg ?? (f.dimKey ? (colors as any)[f.dimKey] : colors.primaryDim);
              return (
                <View
                  key={i}
                  style={[
                    styles.item,
                    { borderBottomColor: colors.surfaceBorder },
                    i === FEATURES.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <View style={[styles.itemIcon, { backgroundColor: iconBg }]}>
                    <Ionicons name={f.icon} size={17} color={iconColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemLabel, { color: colors.text }]}>{f.label}</Text>
                    <Text style={[styles.itemDesc, { color: colors.textSecondary }]}>{f.desc}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <Pressable
            style={({ pressed }) => [
              styles.closeBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={onClose}
          >
            <Text style={[styles.closeBtnText, { color: colors.primaryText }]}>Got it</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    alignSelf: "center", marginBottom: 18,
  },
  header: {
    flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 18,
  },
  headerIcon: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  title: { fontSize: 16, fontFamily: "Inter_700Bold" },
  item: {
    flexDirection: "row", gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemIcon: {
    width: 38, height: 38, borderRadius: 11,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  itemLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  itemDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  closeBtn: {
    marginTop: 16, paddingVertical: 13,
    borderRadius: 14, alignItems: "center",
  },
  closeBtnText: { fontSize: 14, fontFamily: "Inter_700Bold" },
});
