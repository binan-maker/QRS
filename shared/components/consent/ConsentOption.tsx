import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

export interface ConsentOptionProps {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  required?: boolean;
  icon?: string;
}

export const ConsentOption: React.FC<ConsentOptionProps> = ({
  title,
  description,
  enabled,
  onToggle,
  required = false,
  icon,
}) => {
  return (
    <View style={styles.consentOption}>
      <View style={styles.optionHeader}>
        <View style={styles.optionTitleRow}>
          {icon && <Text style={styles.optionIcon}>{icon}</Text>}
          <View style={styles.optionTitleContainer}>
            <Text style={styles.optionTitle}>{title}</Text>
            {required && <Text style={styles.requiredBadge}>Required</Text>}
          </View>
        </View>
        <TouchableOpacity
          style={[styles.toggle, enabled && styles.toggleEnabled]}
          onPress={onToggle}
          activeOpacity={0.7}
        >
          <View style={[styles.toggleKnob, enabled && styles.toggleKnobEnabled]} />
        </TouchableOpacity>
      </View>
      <Text style={styles.optionDescription}>{description}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  consentOption: {
    marginBottom: 24,
  },
  optionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  optionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  optionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  optionTitleContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
  },
  requiredBadge: {
    fontSize: 10,
    backgroundColor: "#FEF3C7",
    color: "#D97706",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
    fontWeight: "600",
  },
  toggle: {
    width: 50,
    height: 28,
    backgroundColor: "#E5E7EB",
    borderRadius: 14,
    padding: 2,
    justifyContent: "center",
  },
  toggleEnabled: {
    backgroundColor: "#4F46E5",
  },
  toggleKnob: {
    width: 24,
    height: 24,
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleKnobEnabled: {
    alignSelf: "flex-end",
  },
  optionDescription: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
    marginLeft: 36,
  },
});
