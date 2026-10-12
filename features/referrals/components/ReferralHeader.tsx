import React, { memo } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { styles } from "../styles";

interface ReferralHeaderProps {
  onBack: () => void;
  onShare: () => void;
}

export const ReferralHeader = memo(function ReferralHeader({ onBack, onShare }: ReferralHeaderProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 16) }]}>
      <Pressable
        onPress={onBack}
        hitSlop={12}
        style={({ pressed }) => [
          styles.circleBtn,
          { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <Ionicons name="chevron-back" size={20} color={colors.text} />
      </Pressable>

      <Text style={[styles.topBarTitle, { color: colors.text }]}>Invite Friends</Text>

      <Pressable
        onPress={onShare}
        hitSlop={12}
        style={({ pressed }) => [
          styles.circleBtn,
          { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <Ionicons name="share-social-outline" size={19} color={colors.text} />
      </Pressable>
    </View>
  );
});
