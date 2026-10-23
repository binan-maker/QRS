import React from "react";
import { View, Text, Modal, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/shared/contexts/ThemeContext";
import type { UserScratchCard } from "@/services/rewards/types";
import { ScratchCardView } from "./ScratchCardView";

interface ScratchModalProps {
  visible: boolean;
  card: UserScratchCard | null;
  onClose: () => void;
  onReveal: (cardId: string) => Promise<void> | void;
  onOpenDetails: (card: UserScratchCard) => void;
}

export function ScratchModal({
  visible,
  card,
  onClose,
  onReveal,
  onOpenDetails,
}: ScratchModalProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  if (!card) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View
          style={[
            styles.content,
            {
              backgroundColor: colors.background,
              borderColor: colors.surfaceBorder,
              paddingTop: insets.top + 16,
              paddingBottom: insets.bottom + 20,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.topBar}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>
                {card.status === "revealed" ? "Your Coupon" : "Scratch & Win"}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {card.status === "revealed"
                  ? "Copy code or visit the merchant to redeem"
                  : "Rub to scratch or tap reveal"}
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              style={[
                styles.closeBtn,
                { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
              ]}
              hitSlop={8}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </Pressable>
          </View>

          {/* Card Presentation */}
          <View style={styles.cardWrapper}>
            <ScratchCardView
              card={card}
              onReveal={onReveal}
              onOpenDetails={onOpenDetails}
            />
          </View>

          {/* Bottom Info Note */}
          <View style={styles.noteBox}>
            <Ionicons
              name="shield-checkmark-outline"
              size={15}
              color={colors.primary}
            />
            <Text style={[styles.noteText, { color: colors.textMuted }]}>
              Coupon-only reward. No cash, points, or purchase required.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: "space-between",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
  },
  subtitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cardWrapper: {
    flex: 1,
    justifyContent: "center",
  },
  noteBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  noteText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
});
