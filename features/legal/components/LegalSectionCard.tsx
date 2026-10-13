import React, { type ReactNode } from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { getLegalStyles } from "@/features/legal/styles";

export interface LegalSectionCardProps {
  title: string;
  num?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  children: ReactNode;
  colors?: any;
}

export function LegalSectionCard({ title, num, icon, children }: LegalSectionCardProps) {
  const { colors } = useTheme();
  const styles = getLegalStyles(colors);

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

export default LegalSectionCard;
