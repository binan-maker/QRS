import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/shared/contexts/ThemeContext";

const TOOLTIP_TEXT =
  "This QR code has no verified owner. Content is shown as-is — trust the community score, not the source.";

export default function ExternalQrBanner() {
  const { colors, isDark } = useTheme();
  const [tooltipVisible, setTooltipVisible] = useState(false);

  return (
    <View style={styles.wrapper}>
      {/* ── Main row: "Anonymous QR Code" + info icon ─────────── */}
      <View style={[styles.row, {
        backgroundColor: isDark ? colors.surface : "#F8FAFC",
        borderColor:     isDark ? colors.surfaceBorder : "#E2E8F0",
      }]}>
        <Text style={[styles.label, { color: colors.text }]}>
          Anonymous QR Code
        </Text>

        <Pressable
          onPress={() => setTooltipVisible((v) => !v)}
          hitSlop={10}
          style={[styles.infoBtn, {
            backgroundColor: tooltipVisible
              ? (isDark ? "#334155" : "#E2E8F0")
              : "transparent",
          }]}
        >
          <Ionicons
            name={tooltipVisible ? "information-circle" : "information-circle-outline"}
            size={18}
            color={colors.textSecondary}
          />
        </Pressable>
      </View>

      {/* ── Floating tooltip ──────────────────────────────────── */}
      {tooltipVisible && (
        <Animated.View
          entering={FadeInDown.duration(180)}
          style={[styles.tooltip, {
            backgroundColor: isDark ? "#1E293B" : "#fff",
            borderColor:     isDark ? "#334155" : "#E2E8F0",
            shadowColor:     "#000",
          }]}
        >
          <Text style={[styles.tooltipText, { color: colors.textSecondary }]}>
            {TOOLTIP_TEXT}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 10,
  },
  row: {
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "space-between",
    borderRadius:      12,
    borderWidth:       1,
    paddingHorizontal: 14,
    paddingVertical:   11,
  },
  label: {
    fontSize:   13,
    fontFamily: "Inter_600SemiBold",
  },
  infoBtn: {
    borderRadius: 20,
    padding:      3,
  },
  tooltip: {
    marginTop:         6,
    borderRadius:      12,
    borderWidth:       1,
    paddingHorizontal: 14,
    paddingVertical:   12,
    shadowOffset:      { width: 0, height: 2 },
    shadowOpacity:     0.08,
    shadowRadius:      8,
    elevation:         3,
  },
  tooltipText: {
    fontSize:   13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
});
