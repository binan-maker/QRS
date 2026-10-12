import React, { memo } from "react";
import { View, Text } from "react-native";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { styles } from "../styles";

const STEPS = [
  { num: "1", title: "Share invite link", desc: "Send your unique code or link to friends" },
  { num: "2", title: "Friend joins & scans", desc: "Friend signs up and completes their first scan" },
  { num: "3", title: "Verified connection", desc: "Your referral network connects and builds trust" },
];

export const HowItWorksSteps = memo(function HowItWorksSteps() {
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
        {STEPS.map((step, idx) => (
          <React.Fragment key={step.num}>
            {idx > 0 && <View style={[styles.stepDivider, { backgroundColor: colors.surfaceBorder }]} />}
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
                <Text style={[styles.stepBadgeText, { color: colors.text }]}>{step.num}</Text>
              </View>
              <View style={styles.stepTextWrap}>
                <Text style={[styles.stepTitle, { color: colors.text }]}>
                  {step.title}
                </Text>
                <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
                  {step.desc}
                </Text>
              </View>
            </View>
          </React.Fragment>
        ))}
      </View>
    </View>
  );
});
