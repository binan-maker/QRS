import React, { memo } from "react";
import {
  View, Text, Pressable, ScrollView, StyleSheet,
  useWindowDimensions, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Reanimated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";
import * as Haptics from "@/lib/haptics";

interface QuickType {
  presetIdx: number;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  badge?: string;
  badgeColor?: string;
  color?: string;
}

const HERO_TYPES: QuickType[] = [
  { presetIdx: 1,  label: "Link / URL",       icon: "link-outline",             color: "#3B82F6" },
  { presetIdx: 7,  label: "UPI Payment 🇮🇳",   icon: "card-outline",             color: "#8B5CF6", badge: "NPCI",      badgeColor: "#8B5CF6" },
  { presetIdx: 5,  label: "WhatsApp",          icon: "logo-whatsapp",            color: "#22C55E" },
];

const GRID_TYPES: QuickType[] = [
  { presetIdx: 6,  label: "WiFi",         icon: "wifi-outline"              },
  { presetIdx: 9,  label: "Contact",      icon: "person-circle-outline"     },
  { presetIdx: 24, label: "BharatQR",     icon: "shield-checkmark-outline", badge: "Certified", badgeColor: "#10B981" },
  { presetIdx: 25, label: "Google Review",icon: "star-outline",             badge: "Google",    badgeColor: "#F59E0B" },
  { presetIdx: 3,  label: "Phone",        icon: "call-outline"              },
  { presetIdx: 26, label: "Menu",         icon: "restaurant-outline"        },
  { presetIdx: 0,  label: "Text",         icon: "text-outline"              },
  { presetIdx: 22, label: "Event",        icon: "calendar-outline"          },
];

interface Props {
  onSelectPreset: (idx: number) => void;
  onOpenTemplates: () => void;
  onOpenCustom: () => void;
  user: any;
}

function TypePickerHome({ onSelectPreset, onOpenTemplates, onOpenCustom, user }: Props) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();

  const gridCols = width > 400 ? 4 : 4;
  const gridItemWidth = (width - 40 - (gridCols - 1) * 10) / gridCols;

  function pick(idx: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelectPreset(idx);
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
    >
      {/* Hero heading */}
      <Reanimated.View entering={FadeInDown.duration(300)}>
        <Text style={[styles.heroTitle, { color: colors.text }]}>
          What are you creating?
        </Text>
        <Text style={[styles.heroSub, { color: colors.textMuted }]}>
          Pick a type — your QR generates instantly
        </Text>
      </Reanimated.View>

      {/* Hero cards */}
      <Reanimated.View entering={FadeInDown.duration(350).delay(50)} style={styles.heroRow}>
        {HERO_TYPES.map((t, i) => {
          const c = t.color ?? colors.primary;
          const isFirst = i === 0;
          return (
            <Pressable
              key={t.presetIdx}
              onPress={() => pick(t.presetIdx)}
              style={({ pressed }) => [
                styles.heroCard,
                isFirst ? styles.heroCardLarge : styles.heroCardSmall,
                { borderColor: c + "30", opacity: pressed ? 0.82 : 1 },
              ]}
            >
              <LinearGradient
                colors={isFirst ? [c, c + "CC"] : [c + "22", c + "11"]}
                style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <View style={[styles.heroIconBox, { backgroundColor: isFirst ? "#fff3" : c + "30" }]}>
                <Ionicons name={t.icon} size={22} color={isFirst ? "#fff" : c} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.heroCardLabel, { color: isFirst ? "#fff" : colors.text }]} numberOfLines={2}>
                  {t.label}
                </Text>
                {t.badge && (
                  <View style={[styles.heroBadge, { backgroundColor: isFirst ? "#fff4" : t.badgeColor + "22" }]}>
                    <Text style={[styles.heroBadgeText, { color: isFirst ? "#fff" : t.badgeColor }]}>
                      {t.badge}
                    </Text>
                  </View>
                )}
              </View>
              <Ionicons name="chevron-forward" size={16} color={isFirst ? "#fff8" : colors.textMuted} />
            </Pressable>
          );
        })}
      </Reanimated.View>

      {/* Quick grid */}
      <Reanimated.View entering={FadeInDown.duration(380).delay(100)}>
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>More Types</Text>
        <View style={styles.grid}>
          {GRID_TYPES.map(t => (
            <Pressable
              key={t.presetIdx}
              onPress={() => pick(t.presetIdx)}
              style={({ pressed }) => [
                styles.gridItem,
                {
                  width: gridItemWidth,
                  backgroundColor: colors.surface,
                  borderColor: colors.surfaceBorder,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <View style={[styles.gridIconBox, { backgroundColor: colors.surfaceLight }]}>
                <Ionicons name={t.icon} size={18} color={colors.textSecondary} />
              </View>
              <Text style={[styles.gridLabel, { color: colors.text }]} numberOfLines={2}>
                {t.label}
              </Text>
              {t.badge && (
                <View style={[styles.gridBadge, { backgroundColor: (t.badgeColor ?? colors.primary) + "22" }]}>
                  <Text style={[styles.gridBadgeText, { color: t.badgeColor ?? colors.primary }]}>
                    {t.badge}
                  </Text>
                </View>
              )}
            </Pressable>
          ))}

          {/* Browse all tile */}
          <Pressable
            onPress={onOpenTemplates}
            style={({ pressed }) => [
              styles.gridItem,
              {
                width: gridItemWidth,
                backgroundColor: colors.primaryDim,
                borderColor: colors.primary + "30",
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <View style={[styles.gridIconBox, { backgroundColor: colors.primary + "25" }]}>
              <Ionicons name="apps-outline" size={18} color={colors.primary} />
            </View>
            <Text style={[styles.gridLabel, { color: colors.primary }]} numberOfLines={2}>
              Browse All
            </Text>
          </Pressable>
        </View>
      </Reanimated.View>

      {/* Custom QR builder card */}
      <Reanimated.View entering={FadeInDown.duration(400).delay(150)}>
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Build Your Own</Text>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onOpenCustom();
          }}
          style={({ pressed }) => [
            styles.customCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.primary + "40",
              opacity: pressed ? 0.82 : 1,
            },
          ]}
        >
          <View style={[styles.customIconCircle, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "40" }]}>
            <Ionicons name="add" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.customTitle, { color: colors.text }]}>
              Custom QR Template
            </Text>
            <Text style={[styles.customSub, { color: colors.textMuted }]}>
              Define your own fields and output — save for reuse
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </Pressable>
      </Reanimated.View>

      {/* India trust strip */}
      <Reanimated.View entering={FadeInDown.duration(420).delay(200)}>
        <View style={[styles.trustStrip, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <Text style={styles.trustFlag}>🇮🇳</Text>
          <Text style={[styles.trustText, { color: colors.textMuted }]}>
            India-first · UPI NPCI standard · All QRs scanned for threats
          </Text>
          <Ionicons name="shield-checkmark" size={14} color="#10B981" />
        </View>
      </Reanimated.View>
    </ScrollView>
  );
}

export default memo(TypePickerHome);

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 40 },
  heroTitle: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 4 },
  heroSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 20 },
  heroRow: { gap: 10, marginBottom: 20 },
  heroCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    padding: 16, borderRadius: 20, borderWidth: 1, overflow: "hidden",
  },
  heroCardLarge: { minHeight: 76 },
  heroCardSmall: { minHeight: 64 },
  heroIconBox: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  heroCardLabel: { fontSize: 15, fontFamily: "Inter_700Bold", lineHeight: 20 },
  heroBadge: {
    borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
    alignSelf: "flex-start", marginTop: 4,
  },
  heroBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.4 },
  sectionLabel: {
    fontSize: 11, fontFamily: "Inter_700Bold",
    textTransform: "uppercase", letterSpacing: 1.0,
    marginBottom: 10,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  gridItem: {
    borderRadius: 16, borderWidth: 1,
    paddingVertical: 14, paddingHorizontal: 10,
    alignItems: "center", gap: 6,
  },
  gridIconBox: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  gridLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  gridBadge: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  gridBadgeText: { fontSize: 8, fontFamily: "Inter_700Bold" },
  customCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    padding: 18, borderRadius: 20, borderWidth: 1,
    borderStyle: Platform.OS === "ios" ? "solid" : "dashed",
    marginBottom: 20,
  },
  customIconCircle: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: "center", justifyContent: "center", borderWidth: 1.5,
    flexShrink: 0,
  },
  customTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  customSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 3, lineHeight: 17 },
  trustStrip: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  trustFlag: { fontSize: 14 },
  trustText: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },
});
