import React, { memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Svg, {
  Defs,
  LinearGradient as SvgGradient,
  Stop,
  Circle,
  Path,
  Polygon,
  G,
} from "react-native-svg";
import * as Haptics from "@/shared/utils/haptics";
import type { DisplayBonusCard } from "../types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
export const CARD_WIDTH = Math.floor((SCREEN_WIDTH - 44) / 2);
export const CARD_HEIGHT = 226;

// ── BinRo Metallic Shield Medallion (No "G", 100% BinRo brand) ──────────────
const BinRoEmblem = memo(function BinRoEmblem({ size = 56 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Defs>
        <SvgGradient id="silverRim" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <Stop offset="25%" stopColor="#E2E8F0" stopOpacity="0.8" />
          <Stop offset="65%" stopColor="#94A3B8" stopOpacity="0.9" />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.95" />
        </SvgGradient>
        <SvgGradient id="sapphireInner" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#0052CC" />
          <Stop offset="50%" stopColor="#003FA8" />
          <Stop offset="100%" stopColor="#002575" />
        </SvgGradient>
        <SvgGradient id="coreGlow" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#38BDF8" stopOpacity="0.45" />
          <Stop offset="100%" stopColor="#0052CC" stopOpacity="0" />
        </SvgGradient>
      </Defs>

      {/* Outer Metallic Ring */}
      <Circle
        cx="30"
        cy="30"
        r="28"
        fill="url(#sapphireInner)"
        stroke="url(#silverRim)"
        strokeWidth="2.5"
      />

      {/* Inner Glow Circle */}
      <Circle cx="30" cy="30" r="23" fill="url(#coreGlow)" />

      {/* BinRo Shield Outline */}
      <Path
        d="M30 14 L42 19.5 C42 30 36 38 30 43 C24 38 18 30 18 19.5 Z"
        fill="rgba(255,255,255,0.16)"
        stroke="#FFFFFF"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />

      {/* Stylized QR Scan Viewfinder Reticles */}
      <Path d="M24.5 23.5 H28 M24.5 23.5 V27" stroke="#38BDF8" strokeWidth="1.8" strokeLinecap="round" />
      <Path d="M35.5 23.5 H32 M35.5 23.5 V27" stroke="#38BDF8" strokeWidth="1.8" strokeLinecap="round" />
      <Circle cx="30" cy="29" r="2.3" fill="#FFFFFF" />
      <Path d="M27 34.5 L30 37 L33 34.5" stroke="#38BDF8" strokeWidth="1.6" strokeLinecap="round" />
    </Svg>
  );
});

// ── Faceted Metallic Foil Pattern for Unscratched Cards ──────────────────────
const FoilFacetPattern = memo(function FoilFacetPattern({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <Polygon points={`0,0 ${width * 0.55},0 ${width * 0.3},${height * 0.45} 0,${height * 0.3}`} fill="rgba(255,255,255,0.06)" />
      <Polygon points={`${width * 0.55},0 ${width},0 ${width},${height * 0.35} ${width * 0.3},${height * 0.45}`} fill="rgba(255,255,255,0.03)" />
      <Polygon points={`0,${height * 0.3} ${width * 0.3},${height * 0.45} 0,${height * 0.85}`} fill="rgba(0,0,0,0.12)" />
      <Polygon points={`${width * 0.3},${height * 0.45} ${width},${height * 0.35} ${width},${height * 0.75} ${width * 0.6},${height * 0.8}`} fill="rgba(255,255,255,0.04)" />
      <Polygon points={`0,${height * 0.85} ${width * 0.6},${height * 0.8} 0,${height}`} fill="rgba(0,0,0,0.18)" />
      <Polygon points={`${width * 0.6},${height * 0.8} ${width},${height * 0.75} ${width},${height} ${width * 0.25},${height}`} fill="rgba(255,255,255,0.05)" />

      {/* Decorative Sparkle Stars */}
      <G opacity={0.35}>
        <Path d="M22 34 L23.5 38 L27.5 39.5 L23.5 41 L22 45 L20.5 41 L16.5 39.5 L20.5 38 Z" fill="#FFFFFF" />
        <Path d={`M${width - 28} 68 L${width - 26.5} 71 L${width - 23} 72.5 L${width - 26.5} 74 L${width - 28} 77 L${width - 29.5} 74 L${width - 33} 72.5 L${width - 29.5} 71 Z`} fill="#FFFFFF" />
        <Path d={`M32 ${height - 44} L33.5 ${height - 41} L36.5 ${height - 39.5} L33.5 ${height - 38} L32 ${height - 35} L30.5 ${height - 38} L27.5 ${height - 39.5} L30.5 ${height - 41} Z`} fill="#FFFFFF" />
      </G>
    </Svg>
  );
});

import { MerchantLogo } from "./MerchantLogo";
export { MerchantLogo };

// ── Badge & Date Resolution Helper ──────────────────────────────────────────
export interface CardBadgeInfo {
  type: "expired" | "days_left" | "new" | "none";
  pillText: string | null;
  dateLabel: string | null;
  pillBg: string;
  pillColor: string;
}

export function getCardBadgeInfo(card: DisplayBonusCard): CardBadgeInfo {
  const expiresAt = card.expiresAt || card.offer?.expiresAt;
  const status = card.status;
  const scratchedAt = card.scratchedAt;
  const createdAt = card.createdAt || card.offer?.createdAt;

  const now = Date.now();

  // 1. Expired state
  if (status === "expired") {
    let dateStr = "Expired";
    if (expiresAt) {
      const expDate = new Date(expiresAt);
      if (!isNaN(expDate.getTime())) {
        const day = expDate.getDate();
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const month = monthNames[expDate.getMonth()];
        dateStr = `Expired on ${day} ${month}`;
      }
    }
    return {
      type: "expired",
      pillText: "Expired",
      dateLabel: dateStr,
      pillBg: "rgba(100, 116, 139, 0.14)",
      pillColor: "#64748B",
    };
  }

  // 2. Expiry check for active cards
  if (expiresAt) {
    const expTime = new Date(expiresAt).getTime();
    if (!isNaN(expTime)) {
      if (expTime <= now) {
        const expDate = new Date(expTime);
        const day = expDate.getDate();
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const month = monthNames[expDate.getMonth()];
        return {
          type: "expired",
          pillText: "Expired",
          dateLabel: `Expired on ${day} ${month}`,
          pillBg: "rgba(100, 116, 139, 0.14)",
          pillColor: "#64748B",
        };
      }

      const diffMs = expTime - now;
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      // "in upper right show how many days left if only that left 7 days left then start from there"
      if (diffDays <= 7 && diffDays > 0) {
        return {
          type: "days_left",
          pillText: `${diffDays}d left`,
          dateLabel: `${diffDays} day${diffDays > 1 ? "s" : ""} left`,
          pillBg: "rgba(245, 158, 11, 0.14)",
          pillColor: "#D97706",
        };
      }
    }
  }

  // 3. New card detection (unscratched, scratched within 24 hours, or recently created)
  const isUnscratched = status === "unlocked";
  const isRecentlyScratched =
    scratchedAt && now - new Date(scratchedAt).getTime() < 24 * 60 * 60 * 1000;
  const isRecentlyCreated =
    createdAt && now - new Date(createdAt).getTime() < 48 * 60 * 60 * 1000;

  if (isUnscratched || isRecentlyScratched || isRecentlyCreated) {
    return {
      type: "new",
      pillText: "NEW",
      dateLabel: "New reward",
      pillBg: isUnscratched ? "#FFFFFF" : "rgba(16, 185, 129, 0.14)",
      pillColor: isUnscratched ? "#0052CC" : "#059669",
    };
  }

  return {
    type: "none",
    pillText: null,
    dateLabel: null,
    pillBg: "transparent",
    pillColor: "transparent",
  };
}

// ── Main RewardCard Component ───────────────────────────────────────────────
export const RewardCard = memo(function RewardCard({
  card,
  onPress,
  isDark,
  colors,
}: {
  card: DisplayBonusCard;
  onPress: (card: DisplayBonusCard) => void;
  isDark: boolean;
  colors: any;
}) {
  const isUnscratched = card.status === "unlocked";
  const isExpired = card.status === "expired";
  const badgeInfo = getCardBadgeInfo(card);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(card);
  };

  // ── 1. UNSCRATCHED CARD FACE ──────────────────────────────────────────────
  if (isUnscratched) {
    return (
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.cardOuter,
          {
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
            transform: [{ scale: pressed ? 0.97 : 1 }],
          },
        ]}
      >
        <LinearGradient
          colors={["#0052CC", "#003FA8", "#00236F"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.unscratchedCardBody}
        >
          {/* Subtle Geometric Facet Pattern */}
          <FoilFacetPattern width={CARD_WIDTH} height={CARD_HEIGHT} />

          {/* Top-Right Badge: "NEW" or days left */}
          {badgeInfo.pillText && (
            <View
              style={[
                styles.unscratchedBadgePill,
                { backgroundColor: badgeInfo.pillBg },
              ]}
            >
              <Text
                style={[
                  styles.unscratchedBadgeText,
                  { color: badgeInfo.pillColor },
                ]}
              >
                {badgeInfo.pillText}
              </Text>
            </View>
          )}

          {/* Center BinRo Medallion */}
          <View style={styles.unscratchedCenterArea}>
            <BinRoEmblem size={56} />
            <Text style={styles.unscratchedBrandName}>BinRo</Text>
          </View>

          {/* Bottom Scratch Prompt Pill */}
          <View style={styles.unscratchedPromptPill}>
            <Ionicons name="flash" size={11} color="#38BDF8" />
            <Text style={styles.unscratchedPromptText}>Scratch to reveal</Text>
          </View>
        </LinearGradient>
      </Pressable>
    );
  }

  // ── 2. EXPIRED CARD FACE ──────────────────────────────────────────────────
  if (isExpired) {
    return (
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.cardOuter,
          styles.expiredCardBody,
          {
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
            backgroundColor: isDark ? "#0F141F" : "#F8FAFC",
            borderColor: isDark ? "rgba(255,255,255,0.06)" : "#E2E8F0",
            opacity: pressed ? 0.8 : 0.65,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
      >
        {/* Top Header Row */}
        <View style={styles.cardHeaderRow}>
          <View style={{ opacity: 0.55 }}>
            <MerchantLogo
              name={card.merchantName}
              url={card.merchantLogoUrl || card.offer?.merchantLogoUrl}
              size={32}
            />
          </View>

          <View style={[styles.badgePill, { backgroundColor: badgeInfo.pillBg }]}>
            <Text style={[styles.badgePillText, { color: badgeInfo.pillColor }]}>
              Expired
            </Text>
          </View>
        </View>

        {/* Text Block (Muted) */}
        <View style={styles.offerInfoBlock}>
          <Text style={[styles.offerHeadline, { color: colors.textMuted }]} numberOfLines={1}>
            {card.headline || card.offer?.title}
          </Text>
          <Text style={[styles.offerSubtitle, { color: colors.textMuted }]} numberOfLines={2}>
            {card.subtitle || card.offer?.description}
          </Text>
        </View>

        {/* Product Image (Desaturated) */}
        <View
          style={[
            styles.productImageWrapper,
            { backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "#F1F5F9" },
          ]}
        >
          <Image
            source={{ uri: card.bannerUrl || card.offer?.bannerUrl }}
            style={[styles.productImage, { opacity: 0.38 }]}
            resizeMode="cover"
          />
        </View>

        {/* Bottom Expiry Date Row */}
        <View style={styles.expiredFooterRow}>
          <Ionicons name="time-outline" size={11} color="#94A3B8" />
          <Text style={styles.expiredFooterText} numberOfLines={1}>
            {badgeInfo.dateLabel || "Offer expired"}
          </Text>
        </View>
      </Pressable>
    );
  }

  // ── 3. SCRATCHED / REVEALED CARD FACE ─────────────────────────────────────
  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.cardOuter,
        styles.scratchedCardBody,
        {
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          backgroundColor: isDark ? "#141A28" : "#FFFFFF",
          borderColor: isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0",
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      {/* Top Header Row: Company Logo (Left) + Days Left/New Badge (Right) */}
      <View style={styles.cardHeaderRow}>
        <MerchantLogo
          name={card.merchantName}
          url={card.merchantLogoUrl || card.offer?.merchantLogoUrl}
          size={34}
        />

        {badgeInfo.pillText && (
          <View style={[styles.badgePill, { backgroundColor: badgeInfo.pillBg }]}>
            {badgeInfo.type === "days_left" && (
              <Ionicons
                name="time-outline"
                size={11}
                color={badgeInfo.pillColor}
                style={{ marginRight: 2 }}
              />
            )}
            <Text style={[styles.badgePillText, { color: badgeInfo.pillColor }]}>
              {badgeInfo.pillText}
            </Text>
          </View>
        )}
      </View>

      {/* Offer Headline & Subtitle */}
      <View style={styles.offerInfoBlock}>
        <Text style={[styles.offerHeadline, { color: colors.text }]} numberOfLines={1}>
          {card.headline || card.offer?.title}
        </Text>
        <Text style={[styles.offerSubtitle, { color: colors.textSecondary }]} numberOfLines={2}>
          {card.subtitle || card.offer?.description}
        </Text>
      </View>

      {/* Product Image */}
      <View
        style={[
          styles.productImageWrapper,
          { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#F8FAFC" },
        ]}
      >
        <Image
          source={{ uri: card.bannerUrl || card.offer?.bannerUrl }}
          style={styles.productImage}
          resizeMode="cover"
        />
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  cardOuter: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  // Unscratched styles
  unscratchedCardBody: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    paddingBottom: 14,
    position: "relative",
  },
  unscratchedBadgePill: {
    position: "absolute",
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
    zIndex: 10,
  },
  unscratchedBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  unscratchedCenterArea: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
  },
  unscratchedBrandName: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginTop: 6,
    opacity: 0.95,
  },
  unscratchedPromptPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.28)",
  },
  unscratchedPromptText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },

  // Scratched & Expired card styles
  scratchedCardBody: {
    borderWidth: 1,
    padding: 11,
    justifyContent: "space-between",
  },
  expiredCardBody: {
    borderWidth: 1,
    padding: 11,
    justifyContent: "space-between",
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.08)",
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  logoFallbackText: {
    fontWeight: "800",
  },
  badgePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 100,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  offerInfoBlock: {
    marginTop: 6,
    marginBottom: 4,
  },
  offerHeadline: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  offerSubtitle: {
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 14.5,
    marginTop: 2,
  },
  productImageWrapper: {
    width: "100%",
    height: 98,
    borderRadius: 12,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  expiredFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  expiredFooterText: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "600",
  },
});
