import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "@/lib/haptics";
import { useTheme } from "@/contexts/ThemeContext";
import { useScaleFns } from "@/shared/utils/use-scale";
import { getFirstName } from "@/features/home/utils";

interface Props {
  user:     { displayName: string; id: string } | null;
  photoURL: string | null;
}

export function HomeHeader({ user, photoURL }: Props) {
  const { colors } = useTheme();
  const { s } = useScaleFns();
  const styles = useMemo(() => makeStyles(colors, s), [colors, s]);

  return (
    <Animated.View entering={FadeInDown.duration(260)} style={styles.header}>
      <View style={styles.headerLeft}>
        {user ? (
          <Text style={styles.greeting} numberOfLines={1} ellipsizeMode="tail">
            {"👋 Hey, "}
            <Text style={{ color: colors.primary }}>{getFirstName(user.displayName)}</Text>
          </Text>
        ) : (
          <Text style={styles.greeting}>Welcome</Text>
        )}
      </View>

      <View style={styles.headerRight}>
        {user ? (
          <Pressable onPress={() => router.push("/(tabs)/profile")} style={styles.avatarRing}>
            <LinearGradient
              colors={[colors.primary, colors.primaryShade]}
              style={styles.avatarRingGradient}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <View style={[styles.avatarInner, { backgroundColor: colors.surface }]}>
                {photoURL ? (
                  <Image
                    source={{ uri: photoURL }}
                    style={styles.avatarImg}
                    cachePolicy="memory-disk"
                    contentFit="cover"
                    key={photoURL}
                  />
                ) : (
                  <Text style={[styles.avatarInitial, { color: colors.primary }]}>
                    {user.displayName.charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>
            </LinearGradient>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(auth)/login");
            }}
            style={[styles.signInPill, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "50" }]}
          >
            <Ionicons name="log-in-outline" size={16} color={colors.primary} />
            <Text style={[styles.signInPillText, { color: colors.primary }]}>Sign In</Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

function makeStyles(c: any, s: number) {
  const rf = (n: number) => Math.round(n * s);
  return StyleSheet.create({
    header:             { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 22, gap: 8 },
    headerLeft:         { flex: 1, minWidth: 0 },
    headerRight:        { flexDirection: "row", alignItems: "center", gap: 10 },
    greeting:           { fontSize: rf(22), fontFamily: "Inter_700Bold", color: c.text, flexShrink: 1 },
    avatarRing:         { width: 46, height: 46, borderRadius: 23 },
    avatarRingGradient: { width: 46, height: 46, borderRadius: 23, padding: 2, alignItems: "center", justifyContent: "center" },
    avatarInner:        { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", overflow: "hidden" },
    avatarImg:          { width: 42, height: 42, borderRadius: 21 },
    avatarInitial:      { fontSize: rf(17), fontFamily: "Inter_700Bold" },
    signInPill:         { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 22, borderWidth: 1 },
    signInPillText:     { fontFamily: "Inter_600SemiBold", fontSize: rf(13) },
  });
}
