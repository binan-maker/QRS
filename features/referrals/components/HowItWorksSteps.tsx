import React from "react";
import { View, Text } from "react-native";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { styles } from "../styles";

export function HowItWorksSteps() {
  const { colors, isDark } = useTheme();

  return (
    <View style={styles.sectionBlock}>
      <Text style={[styles.sectionHeading, { color: colors.text }]}>
        How it works
      </Text>

      <View
        style={[
          styles.stepsCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.surfaceBorder,
          },
        ]}
      >
        {/* Step 1 */}
        <View style={styles.stepItemRow}>
          <View
            style={[
              styles.stepBadge,
              {
                backgroundColor: isDark ? "rgba(255, 255, 255, 0.08)" : "#F1F5F9",
                borderColor: colors.surfaceBorder,
              },
            ]}
          >
            <Text style={[styles.stepBadgeText, { color: colors.text }]}>1</Text>
          </View>
          <View style={styles.stepTextWrap}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>
              Share invite link
            </Text>
            <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
              Send your code or link to friends
            </Text>
          </View>
        </View>

        <View style={[styles.stepDivider, { backgroundColor: colors.surfaceBorder }]} />

        {/* Step 2 */}
        <View style={styles.stepItemRow}>
          <View
            style={[
              styles.stepBadge,
              {
                backgroundColor: isDark ? "rgba(255, 255, 255, 0.08)" : "#F1F5F9",
                borderColor: colors.surfaceBorder,
              },
            ]}
          >
            <Text style={[styles.stepBadgeText, { color: colors.text }]}>2</Text>
          </View>
          <View style={styles.stepTextWrap}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>
              Friend scans QR
            </Text>
            <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
              Friend signs up and completes 1st scan
            </Text>
          </View>
        </View>

        <View style={[styles.stepDivider, { backgroundColor: colors.surfaceBorder }]} />

        {/* Step 3 */}
        <View style={styles.stepItemRow}>
          <View
            style={[
              styles.stepBadge,
              {
                backgroundColor: isDark ? "rgba(255, 255, 255, 0.08)" : "#F1F5F9",
                borderColor: colors.surfaceBorder,
              },
            ]}
          >
            <Text style={[styles.stepBadgeText, { color: colors.text }]}>3</Text>
          </View>
          <View style={styles.stepTextWrap}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>
              Get rewards
            </Text>
            <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
              You get Gold VIP, friend gets Silver
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
