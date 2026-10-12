import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "../styles";

interface ReferralToastProps {
  message: string | null;
}

export function ReferralToast({ message }: ReferralToastProps) {
  if (!message) return null;

  return (
    <View style={styles.toastPill}>
      <Ionicons name="checkmark-circle" size={16} color="#10B981" />
      <Text style={styles.toastText}>{message}</Text>
    </View>
  );
}
