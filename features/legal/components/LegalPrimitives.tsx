import React, { type ReactNode } from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { getLegalStyles } from "@/features/legal/styles";

export function LegalPara({ children }: { children: ReactNode; colors?: any }) {
  const { colors } = useTheme();
  const styles = getLegalStyles(colors);
  return <Text style={styles.para}>{children}</Text>;
}

export function LegalSubHead({ text }: { text: string; colors?: any }) {
  const { colors } = useTheme();
  const styles = getLegalStyles(colors);
  return <Text style={styles.subhead}>{text}</Text>;
}

export function LegalBullet({ text }: { text: string; colors?: any }) {
  const { colors } = useTheme();
  const styles = getLegalStyles(colors);
  return (
    <View style={styles.bulletRow}>
      <View style={styles.bulletDot} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

export function LegalWarningBox({ text }: { text: string; colors?: any }) {
  const { colors } = useTheme();
  const styles = getLegalStyles(colors);
  return (
    <View style={styles.warningBox}>
      <Ionicons name="warning" size={15} color={colors.warning} />
      <Text style={styles.warningText}>{text}</Text>
    </View>
  );
}

export function LegalDivider() {
  const { colors } = useTheme();
  const styles = getLegalStyles(colors);
  return <View style={styles.divider} />;
}
