import React, { memo } from "react";
import { View, Text, ScrollView, Pressable, NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { HERO_SLIDES } from "../constants";
import { styles } from "../styles";

interface HeroCarouselProps {
  activeSlide: number;
  slideWidth: number;
  carouselScrollRef: React.RefObject<any>;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onSelectSlide: (idx: number) => void;
}

export const HeroCarousel = memo(function HeroCarousel({
  activeSlide,
  slideWidth,
  carouselScrollRef,
  onScroll,
  onSelectSlide,
}: HeroCarouselProps) {
  const { colors, isDark } = useTheme();

  return (
    <View style={styles.carouselWrapper}>
      <ScrollView
        ref={carouselScrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {HERO_SLIDES.map((item) => (
          <View key={item.id} style={[styles.slideCardWrap, { width: slideWidth }]}>
            <LinearGradient
              colors={
                isDark
                  ? ["#18181B", "#121214", "#0A0A0C"]
                  : ["#FFFFFF", "#F9FAFB", "#F1F5F9"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.heroSlide,
                {
                  borderColor: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)",
                  shadowColor: isDark ? "#000000" : "#64748B",
                },
              ]}
            >
              <View style={styles.slideTopRow}>
                <View style={styles.dotsRow}>
                  {HERO_SLIDES.map((slide, idx) => (
                    <Pressable
                      key={slide.id}
                      onPress={() => onSelectSlide(idx)}
                      hitSlop={8}
                      style={[
                        styles.dot,
                        activeSlide === idx
                          ? [styles.activeDot, { backgroundColor: colors.primary }]
                          : [styles.inactiveDot, { backgroundColor: isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.18)" }],
                      ]}
                    />
                  ))}
                </View>

                <View
                  style={[
                    styles.slideTagPill,
                    {
                      backgroundColor: `${colors.primary}14`,
                      borderColor: `${colors.primary}30`,
                    },
                  ]}
                >
                  <Ionicons name={item.badgeIcon} size={11} color={colors.primary} />
                  <Text style={[styles.slideTagText, { color: colors.primary }]}>
                    {item.badgeTag}
                  </Text>
                </View>
              </View>

              <View style={styles.slideBodyWrap}>
                <Text style={[styles.slideTitleTop, { color: colors.text }]}>
                  {item.titleTop}
                </Text>
                <Text style={[styles.slideTitleHighlight, { color: colors.primary }]}>
                  {item.titleHighlight}
                </Text>
                <Text style={[styles.slideSubtitle, { color: colors.textSecondary }]}>
                  {item.subtitle}
                </Text>
              </View>
            </LinearGradient>
          </View>
        ))}
      </ScrollView>
    </View>
  );
});
