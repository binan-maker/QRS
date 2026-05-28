import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useTopInset } from "@/shared/utils/platform";
import Reanimated, { FadeInDown } from "react-native-reanimated";
import ComingSoonBanner from "@/features/generator/components/ComingSoonBanner";
import ModeCard from "@/features/generator/components/ModeCard";
import { LANDING_MODES } from "@/features/generator/data/landing-modes";

export default function GeneratorLanding() {
  const { colors } = useTheme();
  const insets    = useSafeAreaInsets();
  const topInset  = useTopInset();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={colors.isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      <View style={[styles.header, { paddingTop: topInset + 6 }]}>
        <Reanimated.View entering={FadeInDown.delay(0).duration(240)}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>QR Generator</Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>
            Create protected QR codes
          </Text>
        </Reanimated.View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 110 }]}
      >
        <Reanimated.View entering={FadeInDown.delay(60).duration(300)}>
          <ComingSoonBanner />
        </Reanimated.View>

        <Reanimated.View entering={FadeInDown.delay(140).duration(300)} style={styles.modesSection}>
          <View style={styles.modesSectionHeader}>
            <Text style={[styles.modesSectionTitle, { color: colors.textSecondary }]}>
              PREVIEW — PHASE 2 FEATURES
            </Text>
          </View>

          <View style={styles.modeCards}>
            {LANDING_MODES.map((mode) => (
              <View key={mode.key} style={styles.modeCardWrap}>
                <View style={styles.modeCardOverlay} pointerEvents="none">
                  <View style={[styles.lockBadge, { backgroundColor: "#0008" }]}>
                    <Text style={styles.lockBadgeText}>PHASE 2</Text>
                  </View>
                </View>
                <View style={{ opacity: 0.45 }} pointerEvents="none">
                  <ModeCard mode={mode} />
                </View>
              </View>
            ))}
          </View>
        </Reanimated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  scroll: {
    paddingTop: 4,
    gap: 20,
  },
  modesSection: {
    marginHorizontal: 20,
    gap: 12,
  },
  modesSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modesSectionTitle: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  modeCards: {
    gap: 14,
  },
  modeCardWrap: {
    position: "relative",
  },
  modeCardOverlay: {
    position: "absolute",
    inset: 0,
    zIndex: 10,
    borderRadius: 24,
    overflow: "hidden",
    alignItems: "flex-end",
    justifyContent: "flex-start",
    padding: 14,
  },
  lockBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  lockBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 1,
  },
});
