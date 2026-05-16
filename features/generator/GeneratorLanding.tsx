import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTopInset } from "@/lib/utils/platform";
import Reanimated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";
import { LANDING_MODES } from "@/features/generator/data/landing-modes";
import ModeCard from "@/features/generator/components/ModeCard";

export default function GeneratorLanding() {
  const insets    = useSafeAreaInsets();
  const { colors } = useTheme();
  const topInset  = useTopInset();
  const tabBarHeight = 62 + insets.bottom + 8;

  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topInset }]}>
      <View style={styles.navBar}>
        <View>
          <Text style={[styles.navTitle,    { color: colors.text      }]}>QR Generator</Text>
          <Text style={[styles.navSubtitle, { color: colors.textMuted }]}>
            Create secure, verifiable codes
          </Text>
        </View>
        <View style={[styles.navBadge, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "40" }]}>
          <MaterialCommunityIcons name="qrcode-edit" size={16} color={colors.primary} />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 24 }]}
      >
        <Reanimated.View entering={FadeIn.duration(150)} style={styles.cardList}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
            Choose a type to get started
          </Text>

          {LANDING_MODES.map((m) => (
            <Reanimated.View key={m.key} entering={FadeInDown.duration(160)}>
              <ModeCard mode={m} />
            </Reanimated.View>
          ))}
        </Reanimated.View>
      </ScrollView>
    </View>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container:    { flex: 1 },
    navBar:       { paddingHorizontal: 22, paddingVertical: 14, paddingBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    navTitle:     { fontSize: 17, fontFamily: "Inter_700Bold" },
    navSubtitle:  { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
    navBadge:     { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },
    scrollContent:{ paddingTop: 4 },
    cardList:     { paddingHorizontal: 18, paddingTop: 4, gap: 16 },
    sectionLabel: { fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 0.4, marginBottom: 2, textTransform: "uppercase" },
  });
}
