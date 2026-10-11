import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Share,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "@/shared/utils/haptics";
import { useTopInset } from "@/shared/utils/platform";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useAuth } from "@/shared/contexts/AuthContext";
import { useTabBarScroll } from "@/shared/contexts/TabBarContext";
import {
  getUserScratchCards,
  getApprovedRewardOffers,
  type ScratchCardItem,
  type RewardOffer,
} from "@/services/rewards";
import {
  RewardCard,
  ScratchModal,
  BonusDetailModal,
  type DisplayBonusCard,
} from "@/features/rewards";

const SCRATCHED_STORAGE_KEY = "binro_scratched_cards_mobile";

export default function RewardsScreen() {
  const insets = useSafeAreaInsets();
  const topInset = useTopInset();
  const { colors, isDark } = useTheme();
  const { user, isLoading: authLoading } = useAuth();
  const { onTabScroll, resetTabBar } = useTabBarScroll();

  const [userScratchCards, setUserScratchCards] = useState<ScratchCardItem[]>([]);
  const [approvedOffers, setApprovedOffers] = useState<RewardOffer[]>([]);
  const [scratchedCardIds, setScratchedCardIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  // Active Modals
  const [scratchModalCard, setScratchModalCard] = useState<DisplayBonusCard | null>(null);
  const [detailModalCard, setDetailModalCard] = useState<DisplayBonusCard | null>(null);

  // Load locally saved scratched card IDs
  useEffect(() => {
    AsyncStorage.getItem(SCRATCHED_STORAGE_KEY)
      .then((val) => {
        if (val) {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) {
            setScratchedCardIds(new Set(parsed));
          }
        }
      })
      .catch(() => {});
  }, []);

  const saveScratchedId = useCallback(async (id: string) => {
    setScratchedCardIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      AsyncStorage.setItem(SCRATCHED_STORAGE_KEY, JSON.stringify(Array.from(next))).catch(() => {});
      return next;
    });
  }, []);

  // Background auto-load: fetch both user's earned scratch cards and all approved coupons dynamically from Supabase
  const loadData = useCallback(async () => {
    try {
      const [cards, liveCoupons] = await Promise.all([
        user?.id ? getUserScratchCards(user.id).catch(() => []) : Promise.resolve([]),
        getApprovedRewardOffers().catch(() => []),
      ]);
      if (Array.isArray(cards)) {
        setUserScratchCards(cards);
      }
      if (Array.isArray(liveCoupons)) {
        setApprovedOffers(liveCoupons);
      }
    } catch {}
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      resetTabBar();
      void loadData();
    }, [resetTabBar, loadData])
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Combined cards deck: Real approved coupons + user cards with precise status
  const cardsDeck = useMemo((): DisplayBonusCard[] => {
    const list: DisplayBonusCard[] = [];
    const addedOfferIds = new Set<string>();

    // 1. User's personal earned scratch cards (from QR scans / milestone streaks / referrals)
    for (const uc of userScratchCards) {
      const isScratched = uc.status === "scratched" || scratchedCardIds.has(uc.id);
      list.push({
        id: uc.id,
        headline: uc.offer.title,
        merchantName: uc.offer.merchantName,
        subtitle: uc.offer.description,
        status: uc.status === "locked" ? "locked" : isScratched ? "scratched" : "unlocked",
        validityText: uc.status === "scratched" ? "Code ready" : "Valid for 7 days",
        bannerUrl: uc.offer.bannerUrl,
        merchantLogoUrl: uc.offer.merchantLogoUrl,
        badgeType: "brand",
        createdAt: uc.createdAt,
        scratchedAt: uc.scratchedAt,
        expiresAt: uc.expiresAt || uc.offer?.expiresAt,
        offer: uc.offer,
      });
      if (uc.offer?.id) addedOfferIds.add(uc.offer.id);
    }

    // 2. Original vCommission coupons pulled from Supabase (rewards_deals table) & catalog
    for (let i = 0; i < approvedOffers.length; i++) {
      const offer = approvedOffers[i];
      if (!addedOfferIds.has(offer.id)) {
        const cardId = `card_${offer.id}`;
        const isLocallyScratched = scratchedCardIds.has(cardId);
        const isOfferExpired = offer.expiresAt
          ? new Date(offer.expiresAt).getTime() < Date.now()
          : false;

        let status: "unlocked" | "scratched" | "expired" = "scratched";
        if (isOfferExpired) {
          status = "expired";
        } else if (isLocallyScratched) {
          status = "scratched";
        } else if (i === 0) {
          // First active card is an unscratched card (covered with BinRo sapphire foil)
          status = "unlocked";
        }

        list.push({
          id: cardId,
          headline: offer.title,
          merchantName: offer.merchantName,
          subtitle: offer.description,
          status,
          validityText:
            status === "scratched"
              ? "Code ready"
              : status === "expired"
              ? "Not applicable"
              : "Valid for 14 days",
          bannerUrl: offer.bannerUrl,
          merchantLogoUrl: offer.merchantLogoUrl,
          badgeType: "brand",
          expiresAt: offer.expiresAt,
          offer,
        });
        addedOfferIds.add(offer.id);
      }
    }

    return list;
  }, [userScratchCards, approvedOffers, scratchedCardIds]);

  const handleCardClick = (card: DisplayBonusCard) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (card.status === "unlocked") {
      // Unscratched card -> open interactive scratch modal!
      setScratchModalCard(card);
    } else if (card.status === "scratched") {
      // Scratched card -> open voucher detail view directly!
      setDetailModalCard(card);
    } else if (card.status === "expired") {
      // Expired card -> open terms/archive view
      setDetailModalCard(card);
    }
  };

  const handleScratchComplete = (card: DisplayBonusCard) => {
    void saveScratchedId(card.id);
  };

  const handleNativeShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        title: "BinRo Rewards",
        message: "Check out exclusive partner vouchers and scratch cards on BinRo! https://www.binro.in/rewards",
      });
    } catch {}
  };

  if (authLoading) {
    return <View style={[styles.container, { backgroundColor: colors.background }]} />;
  }

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* ── Header ("Rewards") ── */}
        <View style={[styles.header, { paddingTop: topInset + 8 }]}>
          <Pressable
            onPress={() => router.push("/(tabs)")}
            hitSlop={12}
            style={({ pressed }) => [
              styles.headerCircleBtn,
              { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F1F5F9", opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>

          <Text style={[styles.headerTitle, { color: colors.text }]}>Rewards</Text>

          <View style={styles.headerRightGroup}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/referrals");
              }}
              hitSlop={8}
              style={({ pressed }) => [
                styles.referPillBtn,
                {
                  backgroundColor: isDark ? "rgba(59, 130, 246, 0.15)" : "rgba(0, 82, 204, 0.1)",
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Ionicons name="people-outline" size={14} color={colors.primary} />
              <Text style={[styles.referPillText, { color: colors.primary }]}>Referral</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.guestWrap}>
          <Animated.View entering={FadeInDown.duration(260)} style={styles.guestInner}>
            <View style={[styles.guestIconRing, { backgroundColor: colors.primaryDim }]}>
              <Ionicons name="gift-outline" size={40} color={colors.primary} />
            </View>
            <Text style={[styles.guestTitle, { color: colors.text }]}>Not signed in</Text>
            <Text style={[styles.guestSub, { color: colors.textSecondary }]}>
              Sign in to earn rewards
            </Text>
            <Pressable
              onPress={() => router.push("/(auth)/login")}
              style={({ pressed }) => [
                styles.guestSignInBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 },
              ]}
            >
              <Text style={[styles.guestSignInText, { color: colors.primaryText }]}>Sign In</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("/(auth)/register")}
              style={styles.guestRegBtn}
            >
              <Text style={[styles.guestRegText, { color: colors.primary }]}>Create Account</Text>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ("Rewards") ── */}
      <View style={[styles.header, { paddingTop: topInset + 8 }]}>
        <Pressable
          onPress={() => router.push("/(tabs)")}
          hitSlop={12}
          style={({ pressed }) => [
            styles.headerCircleBtn,
            { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F1F5F9", opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>

        <Text style={[styles.headerTitle, { color: colors.text }]}>Rewards</Text>

        <View style={styles.headerRightGroup}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/referrals");
            }}
            hitSlop={8}
            style={({ pressed }) => [
              styles.referPillBtn,
              {
                backgroundColor: isDark ? "rgba(59, 130, 246, 0.15)" : "rgba(0, 82, 204, 0.1)",
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Ionicons name="people-outline" size={14} color={colors.primary} />
            <Text style={[styles.referPillText, { color: colors.primary }]}>Referral</Text>
          </Pressable>
          <Pressable
            onPress={handleNativeShare}
            hitSlop={12}
            style={({ pressed }) => [
              styles.headerCircleBtn,
              { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F1F5F9", opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name="share-social-outline" size={18} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        onScroll={onTabScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* ── 2-Column Responsive Scratch Cards Grid ── */}
        {cardsDeck.length > 0 ? (
          <View style={styles.cardsGrid}>
            {cardsDeck.map((card) => (
              <RewardCard
                key={card.id}
                card={card}
                onPress={handleCardClick}
                isDark={isDark}
                colors={colors}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="gift-outline" size={44} color={colors.primary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Partner Bonuses Yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Active scratch cards and affiliate deals will appear here dynamically once loaded from Supabase & vCommission.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ── Interactive Scratch Modal ── */}
      <ScratchModal
        card={scratchModalCard}
        userId={user?.id}
        onClose={() => setScratchModalCard(null)}
        onScratchComplete={handleScratchComplete}
        onOpenDetails={(card) => {
          setScratchModalCard(null);
          setDetailModalCard(card);
        }}
      />

      {/* ── Full Voucher Details Modal ── */}
      <BonusDetailModal
        card={detailModalCard}
        userId={user?.id}
        onClose={() => setDetailModalCard(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  headerRightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  referPillBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 100,
  },
  referPillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  cardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 56,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  // ── Guest / unauthenticated ──
  guestWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  guestInner: {
    alignItems: "center",
    gap: 12,
    width: "100%",
  },
  guestIconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  guestTitle: {
    fontSize: 19,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  guestSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 19,
  },
  guestSignInBtn: {
    paddingVertical: 13,
    paddingHorizontal: 40,
    borderRadius: 14,
    marginTop: 6,
    width: "100%",
    alignItems: "center",
  },
  guestSignInText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  guestRegBtn: {
    paddingVertical: 10,
  },
  guestRegText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
