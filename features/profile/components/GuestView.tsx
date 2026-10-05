import React, { memo } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { styles } from "@/features/profile/styles";

interface Props {
  colors: any;
  topInset: number;
  onSignIn: () => void;
  onRegister: () => void;
}

const GuestView = memo(function GuestView({ colors, topInset, onSignIn, onRegister }: Props) {
  return (
    <View style={[styles.container, { paddingTop: topInset, backgroundColor: colors.background }]}>
      <View style={styles.guestWrap}>
        <Animated.View entering={FadeInDown.duration(260)} style={styles.guestInner}>
          <View style={[styles.guestIconRing, { backgroundColor: colors.primaryDim }]}>
            <Ionicons name="person-outline" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.guestTitle, { color: colors.text }]}>Not signed in</Text>
          <Text style={[styles.guestSub, { color: colors.textSecondary }]}>
            Sign in to view your profile and activity
          </Text>
          <Pressable
            onPress={onSignIn}
            style={({ pressed }) => [
              styles.guestSignInBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 },
            ]}
          >
            <Text style={[styles.guestSignInText, { color: colors.primaryText }]}>Sign In</Text>
          </Pressable>
          <Pressable onPress={onRegister} style={styles.guestRegBtn}>
            <Text style={[styles.guestRegText, { color: colors.primary }]}>Create Account</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
});

export default GuestView;
