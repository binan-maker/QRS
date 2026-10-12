import { useEffect, useState, useCallback, useMemo } from "react";
import { Share } from "react-native";
import { useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "@/shared/utils/haptics";
import { useAuth } from "@/shared/contexts/AuthContext";
import { useTabBarScroll } from "@/shared/contexts/TabBarContext";
import {
  getUserScratchCards,
  getApprovedRewardOffers,
  type ScratchCardItem,
  type RewardOffer,
} from "@/services/rewards";
import type { DisplayBonusCard } from "../types";

const SCRATCHED_STORAGE_KEY = "binro_scratched_cards_mobile";

export function useRewards() {
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

  const handleCardClick = useCallback((card: DisplayBonusCard) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (card.status === "unlocked") {
      setScratchModalCard(card);
    } else if (card.status === "scratched") {
      setDetailModalCard(card);
    } else if (card.status === "expired") {
      setDetailModalCard(card);
    }
  }, []);

  const handleScratchComplete = useCallback((card: DisplayBonusCard) => {
    void saveScratchedId(card.id);
  }, [saveScratchedId]);

  const handleNativeShare = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        title: "BinRo Rewards",
        message: "Check out exclusive partner vouchers and scratch cards on BinRo! https://www.binro.in/rewards",
      });
    } catch {}
  }, []);

  return {
    user,
    authLoading,
    cardsDeck,
    refreshing,
    onRefresh,
    onTabScroll,
    scratchModalCard,
    detailModalCard,
    setScratchModalCard,
    setDetailModalCard,
    handleCardClick,
    handleScratchComplete,
    handleNativeShare,
  };
}
