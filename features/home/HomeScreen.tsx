import React, { useCallback, memo } from "react";
import { View, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import { useTopInset } from "@/shared/utils/platform";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useAvatar } from "@/shared/contexts/AvatarContext";
import { useHome } from "@/features/home/hooks/useHome";
import { HomeHeader } from "@/features/home/components/HomeHeader";
import { HeroScanCard } from "@/features/home/components/HeroScanCard";
import { RecentScansList } from "@/features/home/components/RecentScansList";
import { useTabBarScroll } from "@/shared/contexts/TabBarContext";

function HomeScreen() {
  const insets   = useSafeAreaInsets();
  const topInset = useTopInset();
  const { colors } = useTheme();
  const { cachedUrl: photoURL } = useAvatar();
  const { user, recentScans, isLoading, refreshing, onRefresh, deleteScan } = useHome();
  const { onTabScroll, resetTabBar } = useTabBarScroll();

  useFocusEffect(
    useCallback(() => {
      resetTabBar();
    }, [resetTabBar])
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: topInset + 6 }]}
        onScroll={onTabScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/*
         * Single unified entrance for the whole screen.
         * All sections (Header, Hero, Scans) appear together as one cohesive
         * frame instead of cascading in separately. This is the key to making
         * the page feel instantaneous — the layout is already complete, it just
         * fades in as a whole. FadeIn fires once on true first-mount only.
         */}
        <Animated.View entering={FadeIn.duration(280)}>
          <HomeHeader user={user} photoURL={photoURL} />

          <HeroScanCard />

          <RecentScansList
            recentScans={recentScans}
            isLoading={isLoading}
            onDelete={deleteScan}
          />

          <View style={{ height: Math.max(160, 110 + insets.bottom) }} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1 },
  scrollContent: { paddingHorizontal: 18, paddingTop: 6 },
});

export default memo(HomeScreen);
