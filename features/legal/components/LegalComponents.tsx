import React, { type ReactNode } from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { makeLegalStyles } from "@/features/legal/styles";

interface SectionCardProps {
  title: string;
  num?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  children: ReactNode;
  colors?: any;
}

export function LegalSectionCard({ title, num, icon, children }: SectionCardProps) {
  const { colors } = useTheme();
  const styles = makeLegalStyles(colors);

  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        {num && (
          <View style={styles.sectionNum}>
            <Text style={styles.sectionNumText}>{num}</Text>
          </View>
        )}
        {icon && (
          <View style={styles.sectionIcon}>
            <Ionicons name={icon} size={15} color={colors.textSecondary} />
          </View>
        )}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

export function LegalPara({ children }: { children: ReactNode; colors?: any }) {
  const { colors } = useTheme();
  const styles = makeLegalStyles(colors);
  return <Text style={styles.para}>{children}</Text>;
}

export function LegalSubHead({ text }: { text: string; colors?: any }) {
  const { colors } = useTheme();
  const styles = makeLegalStyles(colors);
  return <Text style={styles.subhead}>{text}</Text>;
}

export function LegalBullet({ text }: { text: string; colors?: any }) {
  const { colors } = useTheme();
  const styles = makeLegalStyles(colors);
  return (
    <View style={styles.bulletRow}>
      <View style={styles.bulletDot} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

export function LegalWarningBox({ text }: { text: string; colors?: any }) {
  const { colors } = useTheme();
  const styles = makeLegalStyles(colors);
  return (
    <View style={styles.warningBox}>
      <Ionicons name="warning" size={15} color={colors.warning} />
      <Text style={styles.warningText}>{text}</Text>
    </View>
  );
}

export function LegalDivider() {
  const { colors } = useTheme();
  const styles = makeLegalStyles(colors);
  return <View style={styles.divider} />;
}
