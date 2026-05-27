import React from "react";
import { View, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTopInset } from "@/shared/utils/platform";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useAvatar } from "@/shared/contexts/AvatarContext";
import { useHome } from "@/features/home/hooks/useHome";
import { HomeHeader } from "@/features/home/components/HomeHeader";
import { HeroScanCard } from "@/features/home/components/HeroScanCard";
import { StatsRow } from "@/features/home/components/StatsRow";
import { RecentScansList } from "@/features/home/components/RecentScansList";

function HomeScreen() {
  const insets   = useSafeAreaInsets();
  const topInset = useTopInset();
  const { colors } = useTheme();
  const { cachedUrl: photoURL } = useAvatar();
  const { user, recentScans, isLoading, refreshing, onRefresh, deleteScan } = useHome();

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topInset }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <HomeHeader user={user} photoURL={photoURL} />

        <HeroScanCard />

        <StatsRow />

        <RecentScansList
          recentScans={recentScans}
          isLoading={isLoading}
          onDelete={deleteScan}
        />

        <View style={{ height: Math.max(160, 110 + insets.bottom) }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1 },
  scrollContent: { paddingHorizontal: 18, paddingTop: 6 },
});

export default React.memo(HomeScreen);
