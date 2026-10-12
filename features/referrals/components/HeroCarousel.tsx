import React from "react";
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

export function HeroCarousel({
  activeSlide,
  slideWidth,
  carouselScrollRef,
  onScroll,
  onSelectSlide,
}: HeroCarouselProps) {
  const { isDark } = useTheme();

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
        {HERO_SLIDES.map((item) => {
          const isGold = item.themeType === "gold";
          return (
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
                    borderColor: isDark
                      ? "rgba(255, 255, 255, 0.12)"
                      : "rgba(0, 0, 0, 0.08)",
                    shadowColor: isDark ? "#000000" : "#64748B",
                  },
                ]}
              >
                {/* Top Row: Clickable Slide Dots (Left) and Tag Pill (Right) */}
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
                            ? [
                                styles.activeDot,
                                { backgroundColor: isDark ? "#FFFFFF" : "#09090B" },
                              ]
                            : [
                                styles.inactiveDot,
                                {
                                  backgroundColor: isDark
                                    ? "rgba(255, 255, 255, 0.28)"
                                    : "rgba(0, 0, 0, 0.2)",
                                },
                              ],
                        ]}
                      />
                    ))}
                  </View>

                  <View
                    style={[
                      styles.slideTagPill,
                      {
                        backgroundColor: isDark
                          ? isGold
                            ? "rgba(245, 158, 11, 0.16)"
                            : "rgba(255, 255, 255, 0.08)"
                          : isGold
                          ? "rgba(245, 158, 11, 0.12)"
                          : "rgba(0, 0, 0, 0.05)",
                        borderColor: isDark
                          ? isGold
                            ? "rgba(245, 158, 11, 0.35)"
                            : "rgba(255, 255, 255, 0.2)"
                          : isGold
                          ? "rgba(245, 158, 11, 0.25)"
                          : "rgba(0, 0, 0, 0.1)",
                      },
                    ]}
                  >
                    <Ionicons
                      name={item.badgeIcon}
                      size={11}
                      color={
                        isGold
                          ? isDark
                            ? "#FDE047"
                            : "#D97706"
                          : isDark
                          ? "#F8FAFC"
                          : "#09090B"
                      }
                    />
                    <Text
                      style={[
                        styles.slideTagText,
                        {
                          color: isGold
                            ? isDark
                              ? "#FDE047"
                              : "#D97706"
                            : isDark
                            ? "#F8FAFC"
                            : "#09090B",
                        },
                      ]}
                    >
                      {item.badgeTag}
                    </Text>
                  </View>
                </View>

                <View style={styles.slideBodyWrap}>
                  <Text
                    style={[
                      styles.slideTitleTop,
                      { color: isDark ? "#FFFFFF" : "#09090B" },
                    ]}
                  >
                    {item.titleTop}
                  </Text>
                  <Text
                    style={[
                      styles.slideTitleHighlight,
                      {
                        color: isGold
                          ? isDark
                            ? "#FDE047"
                            : "#D97706"
                          : isDark
                          ? "#FFFFFF"
                          : "#09090B",
                      },
                    ]}
                  >
                    {item.titleHighlight}
                  </Text>
                  <Text
                    style={[
                      styles.slideSubtitle,
                      {
                        color: isDark
                          ? "rgba(255, 255, 255, 0.72)"
                          : "#64748B",
                      },
                    ]}
                  >
                    {item.subtitle}
                  </Text>
                </View>
              </LinearGradient>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
