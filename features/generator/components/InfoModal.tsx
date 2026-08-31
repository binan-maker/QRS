import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/shared/contexts/ThemeContext";
import BottomSheet from "@/shared/components/ui/BottomSheet";

interface Props {
  visible: boolean;
  onClose: () => void;
}

const MODES = [
  {
    icon: "shield-checkmark-outline" as const,
    label: "Standard QR",
    tagline: "Protected & tracked",
    bullets: [
      "Encodes a BinRo URL, not your real content",
      "Only our database knows the destination",
      "Saved to your account with analytics",
    ],
  },
  {
    icon: "eye-off-outline" as const,
    label: "Private QR",
    tagline: "Offline & anonymous",
    bullets: [
      "Content baked directly into the sticker",
      "Nothing stored — no account needed",
      "Instant, zero trace",
    ],
  },
];

export default function InfoModal({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const { height: screenH } = useWindowDimensions();

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      {/* ── Header ─────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: colors.primaryDim }]}>
          <Ionicons name="qr-code-outline" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>QR Modes</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Choose the right type for your use case
          </Text>
        </View>
      </View>

      {/* ── Mode cards ─────────────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ maxHeight: screenH * 0.5 }}
        contentContainerStyle={styles.cardsWrap}
      >
        {MODES.map((m, idx) => (
          <View
            key={m.label}
            style={[
              styles.card,
              {
                backgroundColor: colors.surfaceLight,
                borderColor: colors.surfaceBorder,
              },
              idx < MODES.length - 1 && styles.cardGap,
            ]}
          >
            {/* Card header */}
            <View style={styles.cardHead}>
              <View style={[styles.cardIcon, { backgroundColor: colors.primaryDim }]}>
                <Ionicons name={m.icon} size={16} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardLabel, { color: colors.text }]}>{m.label}</Text>
                <Text style={[styles.cardTagline, { color: colors.primary }]}>{m.tagline}</Text>
              </View>
            </View>

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />

            {/* Bullets */}
            <View style={styles.bullets}>
              {m.bullets.map((b) => (
                <View key={b} style={styles.bulletRow}>
                  <View style={[styles.bulletDot, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.bulletText, { color: colors.textSecondary }]}>{b}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    lineHeight: 22,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
    lineHeight: 16,
  },

  cardsWrap: { gap: 10 },
  cardGap: { marginBottom: 0 },

  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardLabel: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    lineHeight: 18,
  },
  cardTagline: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    marginTop: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  bullets: { gap: 8 },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 5,
    flexShrink: 0,
    opacity: 0.7,
  },
  bulletText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    flex: 1,
  },
});
