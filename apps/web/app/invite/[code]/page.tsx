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
  scratchRewardCard,
  recordOfferRedemption,
  applyReferralCodeForUser,
  type RewardWallet,
  type ScratchCardItem,
} from "@services/rewards";
import styles from "../home.module.css";

export default function WebRewardsPage() {
  const { user, profile } = useAuth();
  const { colors, isDark } = useTheme();

  const [wallet, setWallet] = useState<RewardWallet | null>(null);
  const [cards, setCards] = useState<ScratchCardItem[]>([]);
  const [referralInput, setReferralInput] = useState("");
  const [referralStatus, setReferralStatus] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.id) {
      setWallet(null);
      setCards([]);
      return;
    }
    const [w, c] = await Promise.all([
      getUserRewardWallet(user.id),
      getUserScratchCards(user.id),
    ]);
    setWallet(w);
    setCards(c);
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

  const inviteCode = useMemo(() => {
    const raw =
      profile?.username ||
      profile?.displayName?.replace(/\s+/g, "").toLowerCase() ||
      user?.email?.split("@")[0]?.toLowerCase() ||
      "binro";
    return raw.replace(/[^a-z0-9_]/gi, "").toLowerCase() || "binro";
  }, [profile, user]);

  const inviteUrl = `https://www.binro.in/invite/${inviteCode}`;

  const handleCopyInvite = useCallback(async () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(inviteUrl).catch(() => {});
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2500);
    }
  }, [inviteUrl]);

  const dailyScans = wallet?.dailyEligibleScans ?? 0;
  const nextTarget = wallet?.nextMilestoneTarget ?? 3;
  const progressPct = wallet?.dailyCapReached
    ? 100
    : Math.min(100, Math.round((dailyScans / Math.max(1, nextTarget)) * 100));

  return (
    <main className={styles.appFrame}>
      <div className={styles.page}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <h1 className={styles.greeting}>BinRo Rewards</h1>
          </div>
          <div className={styles.headerRight}>
            <Link href="/scanner" className={styles.signInPill}>
              <Ionicons name="scan" size={16} color={colors.primary} />
              <span>Scan QR</span>
            </Link>
          </div>
        </header>

        {!user ? (
          <div
            style={{
              padding: "28px 22px",
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
            <Ionicons name="gift-outline" size={34} color={colors.primary} />
            <h2 style={{ margin: 0, fontSize: "20px", color: colors.text }}>
              Unlock Scratch Cards When You Scan QR Codes Safely
            </h2>
            <p
              style={{
                margin: 0,
                maxWidth: "520px",
                fontSize: "14px",
                lineHeight: 1.6,
                color: colors.textSecondary,
              }}
            >
              Sign in with Google to receive a Welcome Scratch Card on your first unique QR scan,
              earn progressive daily milestone cards (3, 8, and 15 unique scans), and invite friends
              for Gold VIP partner offers.
            </p>
            <Link
              href="/login"
              style={{
                marginTop: "8px",
                padding: "12px 22px",
                borderRadius: "12px",
                backgroundColor: colors.primary,
                color: colors.primaryText,
                fontWeight: 600,
                fontSize: "14px",
                textDecoration: "none",
              }}
            >
              Sign In to Claim Rewards
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Milestone Tracker */}
            <section
              style={{
                padding: "20px",
                borderRadius: "18px",
                backgroundColor: colors.surface,
                border: `1px solid ${colors.surfaceBorder}`,
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "12px",
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      color: colors.primary,
                    }}
                  >
                    PROGRESSIVE DAILY MILESTONES (3 • 8 • 15 SCANS)
                  </span>
                  <h2 style={{ margin: "4px 0 0", fontSize: "17px", color: colors.text }}>
                    {!wallet?.welcomeCardClaimed
                      ? "Scan your first QR code to unlock your Welcome Scratch Card!"
                      : wallet?.dailyCapReached
                        ? "Daily Cap Reached (3/3 Scratch Cards Unlocked Today)"
                        : `${wallet?.scansUntilNextCard ?? 3} more unique QR scan${
                            (wallet?.scansUntilNextCard ?? 3) === 1 ? "" : "s"
                          } until your next Scratch Card`}
                  </h2>
                </div>
                <span
                  style={{
                    padding: "6px 10px",
                    borderRadius: "8px",
                    backgroundColor: colors.primaryDim,
                    color: colors.primary,
                    fontSize: "12px",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                  }}
                >
                  {wallet?.dailyCardsUnlocked ?? 0}/3 Today
                </span>
              </div>

              <div
                style={{
                  height: "10px",
                  borderRadius: "6px",
                  backgroundColor: isDark ? "#1E293B" : "#E2E8F0",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${progressPct}%`,
                    height: "100%",
                    backgroundColor: colors.primary,
                    borderRadius: "6px",
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "8px",
                  fontSize: "12px",
                  color: colors.textSecondary,
                }}
              >
                <span>
                  Today: {dailyScans} unique scans • Lifetime: {wallet?.lifetimeEligibleScans ?? 0}{" "}
                  scans
                </span>
                <span>Safety verdicts are 100% independent of rewards</span>
              </div>
            </section>

            {/* Scratch Cards */}
            <section style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <h3 style={{ margin: 0, fontSize: "17px", color: colors.text }}>
                Your Scratch Cards ({cards.length})
              </h3>

              {cards.length === 0 ? (
                <div
                  style={{
                    padding: "24px",
                    borderRadius: "16px",
                    backgroundColor: colors.surface,
                    border: `1px solid ${colors.surfaceBorder}`,
                    textAlign: "center",
                    color: colors.textSecondary,
                    fontSize: "14px",
                  }}
                >
                  No Scratch Cards unlocked yet. Scan a unique QR code or apply a friend&apos;s
                  invite code below!
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: "14px",
                  }}
                >
                  {cards.map((card) => {
                    const isLocked = card.status === "locked";
                    const isUnscratched = card.status === "unlocked";
                    const bgGradient =
                      card.tier === "gold"
                        ? "linear-gradient(135deg, #B45309 0%, #F59E0B 100%)"
                        : card.tier === "silver"
                          ? "linear-gradient(135deg, #334155 0%, #64748B 100%)"
                          : "linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)";

                    return (
                      <div
                        key={card.id}
                        style={{
                          borderRadius: "16px",
                          overflow: "hidden",
                          backgroundColor: colors.surface,
                          border: `1px solid ${colors.surfaceBorder}`,
                        }}
                      >
                        {isLocked || isUnscratched ? (
                          <div
                            style={{
                              padding: "20px",
                              background: bgGradient,
                              color: "#FFFFFF",
                              display: "flex",
                              flexDirection: "column",
                              gap: "10px",
                              minHeight: "170px",
                              justifyContent: "space-between",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  letterSpacing: "0.08em",
                                }}
                              >
                                {card.tier.toUpperCase()} SCRATCH CARD
                              </span>
                              <Ionicons
                                name={isLocked ? "lock-closed" : "sparkles"}
                                size={18}
                                color="#FFFFFF"
                              />
                            </div>

                            <strong style={{ fontSize: "16px" }}>{card.sourceLabel}</strong>

                            {isLocked ? (
                              <span style={{ fontSize: "13px", opacity: 0.92 }}>
                                {card.unlockRequirementText ||
                                  "Scan 1 unique QR code to unlock this card"}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleScratch(card)}
                                style={{
                                  padding: "10px 14px",
                                  borderRadius: "10px",
                                  border: "none",
                                  backgroundColor: "#FFFFFF",
                                  color: "#0F172A",
                                  fontWeight: 700,
                                  fontSize: "13px",
                                  cursor: "pointer",
                                }}
                              >
                                Tap to Scratch &amp; Reveal Offer
                              </button>
                            )}
                          </div>
                        ) : (
                          <div
                            style={{
                              padding: "18px",
                              display: "flex",
                              flexDirection: "column",
                              gap: "10px",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                gap: "8px",
                              }}
                            >
                              <div>
                                <span
                                  style={{
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    color: colors.primary,
                                  }}
                                >
                                  {card.offer.merchantName} • {card.tier.toUpperCase()} TIER
                                </span>
                                <h4
                                  style={{
                                    margin: "2px 0 0",
                                    fontSize: "15px",
                                    color: colors.text,
                                  }}
                                >
                                  {card.offer.title}
                                </h4>
                              </div>
                            </div>

                            <p
                              style={{
                                margin: 0,
                                fontSize: "13px",
                                color: colors.textSecondary,
                                lineHeight: 1.5,
                              }}
                            >
                              {card.offer.description}
                            </p>

                            {card.offer.couponCode ? (
                              <div
                                style={{
                                  padding: "10px 12px",
                                  borderRadius: "10px",
                                  border: `1px dashed ${colors.surfaceBorder}`,
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                              >
                                <span style={{ fontSize: "11px", color: colors.textMuted }}>
                                  COUPON CODE
                                </span>
                                <strong
                                  style={{
                                    fontSize: "14px",
                                    letterSpacing: "0.08em",
                                    color: colors.text,
                                  }}
                                >
                                  {card.offer.couponCode}
                                </strong>
                              </div>
                            ) : null}

                            <button
                              type="button"
                              onClick={() => handleRedeem(card)}
                              style={{
                                padding: "11px 14px",
                                borderRadius: "10px",
                                border: "none",
                                backgroundColor: colors.primary,
                                color: colors.primaryText,
                                fontWeight: 600,
                                fontSize: "13px",
                                cursor: "pointer",
                              }}
                            >
                              {copiedId === card.id
                                ? "Code Copied! Opening Partner..."
                                : card.offer.couponCode
                                  ? "Copy Code & Redeem Offer"
                                  : "Redeem Partner Offer"}
                            </button>

                            <small style={{ fontSize: "11px", color: colors.textMuted }}>
                              {card.offer.termsText}
                            </small>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Two-Sided Referral Section */}
            <section
              style={{
                padding: "20px",
                borderRadius: "18px",
                backgroundColor: colors.surface,
                border: `1px solid ${colors.surfaceBorder}`,
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "16px", color: colors.text }}>
                Invite Friends • Two-Sided Scratch Card Rewards
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: "13px",
                  lineHeight: 1.5,
                  color: colors.textSecondary,
                }}
              >
                Share your invite link <strong>{inviteUrl}</strong>. When your friend signs up and
                scans their first QR code, they unlock a Silver Welcome Card and you earn a Gold VIP
                Scratch Card!
              </p>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={handleCopyInvite}
                  style={{
                    padding: "10px 16px",
                    borderRadius: "10px",
                    border: "none",
                    backgroundColor: colors.primary,
                    color: colors.primaryText,
                    fontWeight: 600,
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  {inviteCopied ? "Invite Link Copied!" : `Copy Invite Link (@${inviteCode})`}
                </button>
              </div>

              {!wallet?.referredByCode && (
                <form
                  onSubmit={handleApplyReferral}
                  style={{ display: "flex", gap: "8px", marginTop: "6px" }}
                >
                  <input
                    type="text"
                    value={referralInput}
                    onChange={(e) => setReferralInput(e.target.value)}
                    placeholder="Invited by a friend? Enter their @username"
                    style={{
                      flex: 1,
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: `1px solid ${colors.surfaceBorder}`,
                      backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
                      color: colors.text,
                      fontSize: "13px",
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      padding: "10px 16px",
                      borderRadius: "10px",
                      border: "none",
                      backgroundColor: colors.primaryDim,
                      color: colors.primary,
                      fontWeight: 700,
                      fontSize: "13px",
                      cursor: "pointer",
                    }}
                  >
                    Apply
                  </button>
                </form>
              )}

              {referralStatus ? (
                <span style={{ fontSize: "12px", fontWeight: 600, color: colors.primary }}>
                  {referralStatus}
                </span>
              ) : null}
            </section>
          </div>
        )}
      </div>

      <BottomTabBar activeTab="rewards" />
    </main>
  );
}
