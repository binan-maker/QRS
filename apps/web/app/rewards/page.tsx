"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { Ionicons } from "@/lib/mobile-icons";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import {
  getUserRewardWallet,
  getUserScratchCards,
  getUserReferralsDashboard,
  scratchRewardCard,
  recordOfferRedemption,
  applyReferralCodeForUser,
  buildReferralShareMessage,
  getWhatsAppShareUrl,
  getTelegramShareUrl,
  getTwitterShareUrl,
  type RewardWallet,
  type ScratchCardItem,
  type UserReferralsDashboard,
  type ReferralRecord,
} from "@services/rewards";
import styles from "../home.module.css";

type WebRewardsTab = "cards" | "referrals";
type WebRefFilter = "all" | "pending" | "qualified";

export default function WebRewardsPage() {
  const { user, profile } = useAuth();
  const { colors, isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<WebRewardsTab>("cards");
  const [wallet, setWallet] = useState<RewardWallet | null>(null);
  const [cards, setCards] = useState<ScratchCardItem[]>([]);
  const [refDashboard, setRefDashboard] = useState<UserReferralsDashboard | null>(null);
  const [refFilter, setRefFilter] = useState<WebRefFilter>("all");
  const [referralInput, setReferralInput] = useState("");
  const [referralStatus, setReferralStatus] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  const inviteCode =
    wallet?.ownReferralCode || refDashboard?.referralCode || "binro7x";

  const inviteUrl = `https://www.binro.in/invite/${inviteCode}`;

  const loadData = useCallback(async () => {
    if (!user?.id) {
      setWallet(null);
      setCards([]);
      setRefDashboard(null);
      return;
    }
    const [w, c, rd] = await Promise.all([
      getUserRewardWallet(user.id),
      getUserScratchCards(user.id),
      getUserReferralsDashboard(user.id),
    ]);
    setWallet(w);
    setCards(c);
    setRefDashboard(rd);
  }, [user?.id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleScratch = useCallback(
    async (card: ScratchCardItem) => {
      if (!user?.id || card.status === "locked") return;
      await scratchRewardCard(user.id, card.id);
      await loadData();
    },
    [user?.id, loadData]
  );

  const handleRedeem = useCallback(
    async (card: ScratchCardItem) => {
      if (!user?.id) return;
      if (card.offer.couponCode && typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(card.offer.couponCode).catch(() => {});
        setCopiedId(card.id);
        setTimeout(() => setCopiedId(null), 2500);
      }
      await recordOfferRedemption(user.id, card.id);
      await loadData();
      window.location.href = card.offer.destinationUrl;
    },
    [user?.id, loadData]
  );

  const handleApplyReferral = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user?.id || !referralInput.trim()) return;
      const res = await applyReferralCodeForUser(user.id, referralInput);
      setReferralStatus(res.message);
      if (res.ok) {
        setReferralInput("");
        await loadData();
      }
    },
    [user?.id, referralInput, loadData]
  );

  const handleCopyCode = useCallback(async () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(inviteCode.toUpperCase()).catch(() => {});
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  }, [inviteCode]);

  const handleNativeShare = useCallback(async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Join BinRo — VIP Invite",
          text: buildReferralShareMessage(inviteCode),
          url: inviteUrl,
        });
        return;
      } catch {}
    }
    await handleCopyCode();
  }, [inviteCode, inviteUrl, handleCopyCode]);

  const dailyScans = wallet?.dailyEligibleScans ?? 0;
  const nextTarget = wallet?.nextMilestoneTarget ?? 3;
  const progressPct = wallet?.dailyCapReached
    ? 100
    : Math.min(100, Math.round((dailyScans / Math.max(1, nextTarget)) * 100));

  const filteredReferrals = useMemo(() => {
    if (!refDashboard?.referrals) return [];
    if (refFilter === "pending") return refDashboard.referrals.filter((r) => r.status === "pending_first_scan");
    if (refFilter === "qualified") return refDashboard.referrals.filter((r) => r.status === "qualified");
    return refDashboard.referrals;
  }, [refDashboard, refFilter]);

  return (
    <main className={styles.appFrame}>
      <div className={styles.page}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <h1 className={styles.greeting}>BinRo Rewards</h1>
            <p style={{ fontSize: "13px", color: colors.textSecondary, margin: "2px 0 0" }}>
              Scan safely, unlock coupons &amp; earn VIP cards
            </p>
          </div>
          <div className={styles.headerRight}>
            <Link href="/scanner" className={styles.signInPill}>
              <Ionicons name="scan" size={16} color={colors.primary} />
              <span>Scan QR</span>
            </Link>
          </div>
        </header>

        {/* Tab Segment Controls */}
        <div
          style={{
            display: "flex",
            borderRadius: "14px",
            border: `1px solid ${colors.surfaceBorder}`,
            backgroundColor: colors.surface,
            padding: "4px",
            marginBottom: "16px",
            gap: "4px",
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("cards")}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "10px",
              borderRadius: "10px",
              border: "none",
              backgroundColor: activeTab === "cards" ? colors.primary : "transparent",
              color: activeTab === "cards" ? "#ffffff" : colors.textSecondary,
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <Ionicons name="gift" size={15} color={activeTab === "cards" ? "#ffffff" : colors.textSecondary} />
            <span>Scratch Cards ({cards.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("referrals")}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "10px",
              borderRadius: "10px",
              border: "none",
              backgroundColor: activeTab === "referrals" ? colors.primary : "transparent",
              color: activeTab === "referrals" ? "#ffffff" : colors.textSecondary,
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <Ionicons name="people" size={15} color={activeTab === "referrals" ? "#ffffff" : colors.textSecondary} />
            <span>Refer &amp; Earn ({refDashboard?.totalInvited ?? 0})</span>
          </button>
        </div>

        {!user ? (
          <div
            style={{
              padding: "36px 20px",
              borderRadius: "20px",
              backgroundColor: colors.surface,
              border: `1px solid ${colors.surfaceBorder}`,
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <Ionicons name="gift-outline" size={48} color={colors.primary} />
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: colors.text, margin: 0 }}>
              Sign In to Unlock Rewards
            </h2>
            <p style={{ fontSize: "14px", color: colors.textSecondary, maxWidth: "340px", margin: 0, lineHeight: 1.5 }}>
              Sign in with Google to earn Welcome scratch cards, collect partner deals, and invite friends.
            </p>
            <Link
              href="/profile"
              style={{
                marginTop: "12px",
                padding: "12px 24px",
                borderRadius: "12px",
                backgroundColor: colors.primary,
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "14px",
                textDecoration: "none",
              }}
            >
              Sign In with Google
            </Link>
          </div>
        ) : activeTab === "cards" ? (
          <>
            {/* Daily Milestone Progress Card */}
            <div
              style={{
                padding: "18px",
                borderRadius: "20px",
                backgroundColor: colors.surface,
                border: `1px solid ${colors.surfaceBorder}`,
                marginBottom: "14px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: colors.text }}>
                    Today&apos;s Scan Progress
                  </div>
                  <div style={{ fontSize: "13px", color: colors.textSecondary, marginTop: "2px" }}>
                    {wallet?.dailyCapReached
                      ? "Daily reward cap reached (3/3 cards unlocked)"
                      : `${dailyScans} of ${nextTarget} eligible scans for next card`}
                  </div>
                </div>
                <div
                  style={{
                    padding: "4px 10px",
                    borderRadius: "10px",
                    backgroundColor: `${colors.primary}18`,
                    color: colors.primary,
                    fontSize: "12px",
                    fontWeight: 700,
                  }}
                >
                  {wallet?.dailyCardsUnlocked || 0} / 3 Cards
                </div>
              </div>

              {/* Progress Bar */}
              <div
                style={{
                  height: "10px",
                  borderRadius: "6px",
                  backgroundColor: isDark ? colors.surfaceLight : "#E2E8F0",
                  marginTop: "14px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${progressPct}%`,
                    borderRadius: "6px",
                    background: "linear-gradient(90deg, #0066FF, #38BDF8)",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
                <span style={{ fontSize: "11px", color: colors.textMuted, fontWeight: 500 }}>
                  Milestones: 3 scans → 8 scans → 15 scans
                </span>
                <span style={{ fontSize: "11px", color: colors.textMuted, fontWeight: 500 }}>
                  {wallet?.scansUntilNextCard ? `${wallet.scansUntilNextCard} more to go` : "Completed"}
                </span>
              </div>
            </div>

            {/* Quick Switch to Referrals Banner */}
            <button
              type="button"
              onClick={() => setActiveTab("referrals")}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderRadius: "18px",
                border: `1px solid ${colors.primary}30`,
                backgroundColor: isDark ? "rgba(30, 41, 59, 0.7)" : "#EFF6FF",
                padding: "14px",
                marginBottom: "16px",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "12px",
                    backgroundColor: `${colors.primary}20`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Ionicons name="sparkles" size={20} color={colors.primary} />
                </div>
                <div>
                  <div style={{ fontSize: "15px", fontWeight: 700, color: colors.text }}>
                    Want a Gold VIP Card?
                  </div>
                  <div style={{ fontSize: "12px", color: colors.textSecondary, marginTop: "2px" }}>
                    Invite a friend. When they scan 1 QR code, you unlock a Gold VIP Card!
                  </div>
                </div>
              </div>
              <Ionicons name="chevron-forward" size={18} color={colors.primary} />
            </button>

            {/* Cards Grid */}
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: 800, color: colors.text, margin: "0 0 12px" }}>
                Your Scratch Cards
              </h2>

              {cards.length === 0 ? (
                <div
                  style={{
                    padding: "36px 20px",
                    borderRadius: "20px",
                    backgroundColor: colors.surface,
                    border: `1px solid ${colors.surfaceBorder}`,
                    textAlign: "center",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <Ionicons name="scan-outline" size={40} color={colors.textMuted} />
                  <div style={{ fontSize: "16px", fontWeight: 700, color: colors.text }}>
                    No scratch cards yet
                  </div>
                  <div style={{ fontSize: "13px", color: colors.textSecondary, maxWidth: "280px", lineHeight: 1.5 }}>
                    Scan your 1st verified QR code or invite a friend to unlock your first card!
                  </div>
                  <Link
                    href="/scanner"
                    style={{
                      marginTop: "12px",
                      padding: "10px 20px",
                      borderRadius: "12px",
                      backgroundColor: colors.primary,
                      color: "#ffffff",
                      fontSize: "14px",
                      fontWeight: 700,
                      textDecoration: "none",
                    }}
                  >
                    Open Scanner
                  </Link>
                </div>
              ) : (
                <div style={{ display: "grid", gap: "14px" }}>
                  {cards.map((card) => {
                    const isLocked = card.status === "locked";
                    const isUnscratched = card.status === "unlocked";

                    return (
                      <div
                        key={card.id}
                        style={{
                          borderRadius: "20px",
                          border: `1.5px solid ${
                            card.tier === "gold"
                              ? "#F59E0B"
                              : card.tier === "silver"
                                ? "#94A3B8"
                                : colors.surfaceBorder
                          }`,
                          backgroundColor: colors.surface,
                          padding: "16px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "12px",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span
                            style={{
                              padding: "3px 8px",
                              borderRadius: "8px",
                              fontSize: "11px",
                              fontWeight: 800,
                              letterSpacing: "0.5px",
                              backgroundColor:
                                card.tier === "gold"
                                  ? "#F59E0B20"
                                  : card.tier === "silver"
                                    ? "#94A3B820"
                                    : `${colors.primary}18`,
                              color:
                                card.tier === "gold"
                                  ? "#F59E0B"
                                  : card.tier === "silver"
                                    ? "#94A3B8"
                                    : colors.primary,
                            }}
                          >
                            {card.tier.toUpperCase()} TIER
                          </span>
                          <span style={{ fontSize: "12px", color: colors.textMuted, fontWeight: 500 }}>
                            {card.sourceLabel}
                          </span>
                        </div>

                        {isLocked ? (
                          <div
                            style={{
                              padding: "24px",
                              textAlign: "center",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <Ionicons name="lock-closed" size={28} color={colors.textMuted} />
                            <div style={{ fontSize: "13px", color: colors.textSecondary, fontWeight: 500 }}>
                              {card.unlockRequirementText || "Complete 1 scan to unlock"}
                            </div>
                          </div>
                        ) : isUnscratched ? (
                          <button
                            type="button"
                            onClick={() => handleScratch(card)}
                            style={{
                              border: "none",
                              borderRadius: "14px",
                              padding: "28px",
                              background:
                                card.tier === "gold"
                                  ? "linear-gradient(135deg, #F59E0B, #D97706)"
                                  : card.tier === "silver"
                                    ? "linear-gradient(135deg, #64748B, #475569)"
                                    : "linear-gradient(135deg, #2563EB, #1D4ED8)",
                              color: "#ffffff",
                              cursor: "pointer",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <Ionicons name="sparkles" size={28} color="#FFFFFF" />
                            <span style={{ fontSize: "13px", fontWeight: 800, letterSpacing: "0.8px" }}>
                              TAP TO SCRATCH &amp; REVEAL
                            </span>
                          </button>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            <div style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", color: colors.textMuted }}>
                              {card.offer.merchantName}
                            </div>
                            <div style={{ fontSize: "17px", fontWeight: 800, color: colors.text, lineHeight: 1.3 }}>
                              {card.offer.title}
                            </div>
                            <div style={{ fontSize: "13px", color: colors.textSecondary, lineHeight: 1.4 }}>
                              {card.offer.description}
                            </div>

                            {card.offer.couponCode && (
                              <div
                                style={{
                                  padding: "12px",
                                  borderRadius: "12px",
                                  backgroundColor: isDark ? colors.surfaceLight : "#F1F5F9",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  marginTop: "4px",
                                }}
                              >
                                <span style={{ fontSize: "16px", fontWeight: 800, letterSpacing: "1px", color: colors.text }}>
                                  {card.offer.couponCode}
                                </span>
                                <span style={{ fontSize: "11px", fontWeight: 700, color: colors.primary }}>
                                  {copiedId === card.id ? "COPIED!" : "TAP REDEEM TO COPY"}
                                </span>
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => handleRedeem(card)}
                              style={{
                                marginTop: "6px",
                                padding: "13px",
                                borderRadius: "12px",
                                backgroundColor: colors.primary,
                                color: "#ffffff",
                                border: "none",
                                fontSize: "14px",
                                fontWeight: 700,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "8px",
                              }}
                            >
                              <Ionicons name="open-outline" size={15} color="#FFFFFF" />
                              <span>Copy Code &amp; Redeem</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Refer & Earn — Production Zerodha/Upstox Style Dashboard */
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* VIP Referral Hero */}
            <div
              style={{
                borderRadius: "22px",
                border: `1px solid ${colors.primary}40`,
                background: isDark
                  ? "linear-gradient(135deg, #1E293B, #0F172A)"
                  : "linear-gradient(135deg, #EFF6FF, #DBEAFE)",
                padding: "22px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Ionicons name="trophy" size={14} color="#F59E0B" />
                <span style={{ color: "#F59E0B", fontSize: "11px", fontWeight: 800, letterSpacing: "0.6px" }}>
                  TWO-SIDED VIP REFERRAL ENGINE
                </span>
              </div>

              <h2 style={{ fontSize: "22px", fontWeight: 800, color: colors.text, margin: 0 }}>
                Give Silver, Get Gold VIP
              </h2>
              <p style={{ fontSize: "13px", color: colors.textSecondary, margin: 0, lineHeight: 1.5 }}>
                Friends get a Silver Welcome Card with AJIO &amp; boAt coupons upon joining. When they complete their first verified QR scan, you unlock a Gold VIP Scratch Card!
              </p>

              {/* Code Chip & Copy */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px",
                  borderRadius: "14px",
                  backgroundColor: isDark ? "rgba(0,0,0,0.4)" : "#FFFFFF",
                  marginTop: "4px",
                }}
              >
                <div>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: colors.textMuted, letterSpacing: "0.5px" }}>
                    YOUR REFERRAL CODE
                  </div>
                  <div style={{ fontSize: "20px", fontWeight: 900, letterSpacing: "1.5px", color: colors.text, marginTop: "2px" }}>
                    {inviteCode.toUpperCase()}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "9px 14px",
                    borderRadius: "10px",
                    backgroundColor: colors.primary,
                    color: "#ffffff",
                    border: "none",
                    fontSize: "12px",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  <Ionicons name={codeCopied ? "checkmark" : "copy-outline"} size={16} color="#FFFFFF" />
                  <span>{codeCopied ? "COPIED!" : "COPY"}</span>
                </button>
              </div>

              {/* Social Share Buttons */}
              <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                <a
                  href={getWhatsAppShareUrl(inviteCode)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    padding: "12px",
                    borderRadius: "12px",
                    backgroundColor: "#25D366",
                    color: "#ffffff",
                    textDecoration: "none",
                    fontSize: "13px",
                    fontWeight: 700,
                  }}
                >
                  <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
                  <span>WhatsApp</span>
                </a>

                <a
                  href={getTelegramShareUrl(inviteCode)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    padding: "12px",
                    borderRadius: "12px",
                    backgroundColor: "#229ED9",
                    color: "#ffffff",
                    textDecoration: "none",
                    fontSize: "13px",
                    fontWeight: 700,
                  }}
                >
                  <Ionicons name="paper-plane" size={18} color="#FFFFFF" />
                  <span>Telegram</span>
                </a>

                <button
                  type="button"
                  onClick={handleNativeShare}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    padding: "12px",
                    borderRadius: "12px",
                    backgroundColor: colors.primary,
                    color: "#ffffff",
                    border: "none",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <Ionicons name="share-social" size={18} color="#FFFFFF" />
                  <span>Share</span>
                </button>
              </div>
            </div>

            {/* Analytics Metric Grid (Zerodha / Upstox Style) */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
              <div
                style={{
                  padding: "16px",
                  borderRadius: "16px",
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.surfaceBorder}`,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "26px", fontWeight: 800, color: colors.primary }}>
                  {refDashboard?.totalInvited ?? 0}
                </div>
                <div style={{ fontSize: "12px", fontWeight: 600, color: colors.textSecondary, marginTop: "2px" }}>
                  Friends Joined
                </div>
              </div>

              <div
                style={{
                  padding: "16px",
                  borderRadius: "16px",
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.surfaceBorder}`,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "26px", fontWeight: 800, color: "#F59E0B" }}>
                  {refDashboard?.totalPending ?? 0}
                </div>
                <div style={{ fontSize: "12px", fontWeight: 600, color: colors.textSecondary, marginTop: "2px" }}>
                  Pending 1st Scan
                </div>
              </div>

              <div
                style={{
                  padding: "16px",
                  borderRadius: "16px",
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.surfaceBorder}`,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "26px", fontWeight: 800, color: "#10B981" }}>
                  {refDashboard?.totalQualified ?? 0}
                </div>
                <div style={{ fontSize: "12px", fontWeight: 600, color: colors.textSecondary, marginTop: "2px" }}>
                  Completed Scans
                </div>
              </div>

              <div
                style={{
                  padding: "16px",
                  borderRadius: "16px",
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.surfaceBorder}`,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "26px", fontWeight: 800, color: "#8B5CF6" }}>
                  {refDashboard?.goldCardsEarned ?? 0}
                </div>
                <div style={{ fontSize: "12px", fontWeight: 600, color: colors.textSecondary, marginTop: "2px" }}>
                  Gold VIP Cards
                </div>
              </div>
            </div>

            {/* Invited Friends Ledger */}
            <div
              style={{
                borderRadius: "20px",
                border: `1px solid ${colors.surfaceBorder}`,
                backgroundColor: colors.surface,
                padding: "18px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: colors.text }}>
                    Invited Friends Ledger
                  </div>
                  <div style={{ fontSize: "13px", color: colors.textSecondary, marginTop: "2px" }}>
                    Live attribution &amp; qualification status
                  </div>
                </div>
              </div>

              {/* Filter pills */}
              <div style={{ display: "flex", gap: "8px", margin: "14px 0" }}>
                <button
                  type="button"
                  onClick={() => setRefFilter("all")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: refFilter === "all" ? colors.primary : `${colors.textMuted}15`,
                    color: refFilter === "all" ? "#FFFFFF" : colors.textSecondary,
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  All ({refDashboard?.totalInvited ?? 0})
                </button>

                <button
                  type="button"
                  onClick={() => setRefFilter("pending")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: refFilter === "pending" ? "#F59E0B" : `${colors.textMuted}15`,
                    color: refFilter === "pending" ? "#FFFFFF" : colors.textSecondary,
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Pending ({refDashboard?.totalPending ?? 0})
                </button>

                <button
                  type="button"
                  onClick={() => setRefFilter("qualified")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: refFilter === "qualified" ? "#10B981" : `${colors.textMuted}15`,
                    color: refFilter === "qualified" ? "#FFFFFF" : colors.textSecondary,
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Qualified ({refDashboard?.totalQualified ?? 0})
                </button>
              </div>

              {/* List */}
              {filteredReferrals.length === 0 ? (
                <div
                  style={{
                    padding: "28px",
                    textAlign: "center",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <Ionicons name="people-outline" size={32} color={colors.textMuted} />
                  <div style={{ fontSize: "13px", color: colors.textSecondary, maxWidth: "260px" }}>
                    {refFilter === "all"
                      ? "No friends invited yet. Share your code above to start earning!"
                      : `No ${refFilter} referrals right now.`}
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {filteredReferrals.map((friend) => {
                    const isQualified = friend.status === "qualified";
                    return (
                      <div
                        key={friend.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "12px 0",
                          borderBottom: `1px solid ${colors.surfaceBorder}`,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div
                            style={{
                              width: "38px",
                              height: "38px",
                              borderRadius: "12px",
                              backgroundColor: isQualified ? "#10B98120" : "#F59E0B20",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "16px",
                              fontWeight: 800,
                              color: isQualified ? "#10B981" : "#F59E0B",
                            }}
                          >
                            {(friend.invitedUserUsername || "F").slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: "14px", fontWeight: 700, color: colors.text }}>
                              @{friend.invitedUserUsername || "friend"}
                            </div>
                            <div style={{ fontSize: "11px", color: colors.textMuted, marginTop: "1px" }}>
                              Joined {new Date(friend.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        <div>
                          {isQualified ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "5px 10px",
                                borderRadius: "8px",
                                backgroundColor: "#10B98120",
                                color: "#10B981",
                                fontSize: "11px",
                                fontWeight: 700,
                              }}
                            >
                              <Ionicons name="checkmark-circle" size={13} color="#10B981" />
                              <span>Gold Card Issued</span>
                            </span>
                          ) : (
                            <a
                              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                                `Hey @${friend.invitedUserUsername || "friend"}! Your BinRo Silver Welcome Scratch Card is waiting in your account. Scan any QR code with BinRo to unlock it right away: https://www.binro.in/invite/${inviteCode}`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "6px 10px",
                                borderRadius: "8px",
                                backgroundColor: `${colors.primary}18`,
                                color: colors.primary,
                                fontSize: "12px",
                                fontWeight: 700,
                                textDecoration: "none",
                              }}
                            >
                              <Ionicons name="logo-whatsapp" size={13} color={colors.primary} />
                              <span>Remind</span>
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Were You Invited Manual Entry */}
            <div
              style={{
                borderRadius: "20px",
                border: `1px solid ${colors.surfaceBorder}`,
                backgroundColor: colors.surface,
                padding: "18px",
              }}
            >
              <div style={{ fontSize: "16px", fontWeight: 700, color: colors.text }}>
                Have a Referral Code?
              </div>
              <div style={{ fontSize: "13px", color: colors.textSecondary, marginTop: "2px" }}>
                {wallet?.referredByCode
                  ? `Active gift linked to referral code ${wallet.referredByCode}.`
                  : (wallet?.lifetimeEligibleScans || 0) > 0 || (wallet?.dailyEligibleScans || 0) > 0
                    ? "In accordance with Google Pay referral rules, codes can only be claimed before making your very first QR scan."
                    : "Type your friend's 7-character code to claim your Silver Welcome Scratch Card before your first scan."}
              </div>

              {wallet?.referredByCode ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "12px",
                    borderRadius: "12px",
                    backgroundColor: `${colors.safe}15`,
                    color: colors.safe,
                    fontSize: "13px",
                    fontWeight: 700,
                    marginTop: "12px",
                  }}
                >
                  <Ionicons name="checkmark-circle" size={16} color={colors.safe} />
                  <span>Linked to code: {wallet.referredByCode}</span>
                </div>
              ) : (wallet?.lifetimeEligibleScans || 0) > 0 || (wallet?.dailyEligibleScans || 0) > 0 ? (
                <div
                  style={{
                    marginTop: "12px",
                    padding: "14px",
                    borderRadius: "14px",
                    backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#F1F5F9",
                    border: `1px solid ${colors.surfaceBorder}`,
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <Ionicons name="lock-closed" size={20} color={colors.textMuted} />
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: colors.text }}>
                      Referral Code Input Disabled
                    </div>
                    <div style={{ fontSize: "12px", color: colors.textSecondary, marginTop: "2px", lineHeight: "1.4" }}>
                      Because you have already scanned your first QR code with BinRo, friend referral codes can no longer be applied to this account.
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleApplyReferral} style={{ marginTop: "12px" }}>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <input
                      type="text"
                      value={referralInput}
                      onChange={(e) => setReferralInput(e.target.value)}
                      placeholder="e.g. yn5i82v"
                      maxLength={10}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck="false"
                      style={{
                        flex: 1,
                        height: "46px",
                        borderRadius: "12px",
                        border: `1px solid ${colors.surfaceBorder}`,
                        backgroundColor: isDark ? colors.surfaceLight : "#F1F5F9",
                        color: colors.text,
                        padding: "0 14px",
                        fontSize: "14px",
                        outline: "none",
                      }}
                    />
                    <button
                      type="submit"
                      disabled={!referralInput.trim()}
                      style={{
                        padding: "0 20px",
                        borderRadius: "12px",
                        backgroundColor: colors.primary,
                        color: "#ffffff",
                        border: "none",
                        fontSize: "14px",
                        fontWeight: 700,
                        cursor: !referralInput.trim() ? "not-allowed" : "pointer",
                        opacity: !referralInput.trim() ? 0.5 : 1,
                      }}
                    >
                      Apply
                    </button>
                  </div>
                  <div style={{ fontSize: "11px", color: colors.textMuted, marginTop: "6px" }}>
                    ⚠️ Note: This input will be permanently disabled once you scan your first QR code.
                  </div>
                  {referralStatus && (
                    <div style={{ fontSize: "12px", fontWeight: 600, color: colors.primary, marginTop: "8px" }}>
                      {referralStatus}
                    </div>
                  )}
                </form>
              )}
            </div>
          </div>
        )}

        <div style={{ height: "90px" }} />
      </div>

      <BottomTabBar />
    </main>
  );
}
