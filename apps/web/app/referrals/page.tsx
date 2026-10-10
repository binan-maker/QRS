"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { Ionicons } from "@/lib/mobile-icons";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import {
  getUserRewardWallet,
  getUserReferralsDashboard,
  applyReferralCodeForUser,
  buildReferralShareMessage,
  getWhatsAppShareUrl,
  getTelegramShareUrl,
  type RewardWallet,
  type UserReferralsDashboard,
} from "@services/rewards";
import styles from "./referrals.module.css";

type LedgerFilter = "all" | "pending" | "qualified";

export default function ReferralsPage() {
  const router = useRouter();
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const { colors } = useTheme();

  const [wallet, setWallet] = useState<RewardWallet | null>(null);
  const [refDashboard, setRefDashboard] = useState<UserReferralsDashboard>(() => {
    let guestCode = "binro7x";
    if (typeof window !== "undefined") {
      try {
        const cached =
          localStorage.getItem("binro_guest_ref_code") ||
          localStorage.getItem("binro_user_ref_code");
        if (cached) guestCode = cached;
      } catch {}
    }
    return {
      referralCode: guestCode,
      referralLink: `https://www.binro.in/invite/${guestCode}`,
      shortLink: `https://www.binro.in/r/${guestCode}`,
      totalInvited: 0,
      totalQualified: 0,
      totalPending: 0,
      goldCardsEarned: 0,
      referrals: [],
    };
  });
  const [ledgerFilter, setLedgerFilter] = useState<LedgerFilter>("all");
  const [referralInput, setReferralInput] = useState("");
  const [referralStatus, setReferralStatus] = useState<string | null>(null);
  const [applyingCode, setApplyingCode] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);

  const handleBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/rewards");
    }
  }, [router]);

  // Load wallet & referral data
  const loadData = useCallback(async () => {
    if (!user?.id) {
      // Guest fallback: quick local code
      let guestCode = "binro7x";
      if (typeof window !== "undefined") {
        try {
          const cached = localStorage.getItem("binro_guest_ref_code");
          if (cached) guestCode = cached;
          else {
            guestCode = `binro${Math.random().toString(36).substring(2, 5)}`;
            localStorage.setItem("binro_guest_ref_code", guestCode);
          }
        } catch {}
      }
      setRefDashboard((prev) => ({
        ...prev,
        referralCode: guestCode,
        referralLink: `https://www.binro.in/invite/${guestCode}`,
        shortLink: `https://www.binro.in/r/${guestCode}`,
      }));
      return;
    }

    setIsDataLoading(true);
    try {
      const [w, rd] = await Promise.all([
        getUserRewardWallet(user.id).catch(() => null),
        getUserReferralsDashboard(user.id).catch(() => null),
      ]);
      if (w) setWallet(w);
      if (rd) setRefDashboard(rd);
    } catch {
      // Graceful fallback
    } finally {
      setIsDataLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const inviteCode =
    wallet?.ownReferralCode || refDashboard?.referralCode || "binro7x";
  const inviteUrl = `https://www.binro.in/invite/${inviteCode}`;

  const handleCopyCode = useCallback(async () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(inviteCode.toUpperCase()).catch(() => {});
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2200);
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

  const handleApplyReferral = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const code = referralInput.trim();
      if (!code) return;

      if (!user?.id) {
        // Save pending referral code so it applies immediately on sign-in
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("binro_pending_referral_code", code);
          } catch {}
        }
        setReferralStatus("Saved! Sign in with your Google account to claim your Silver Welcome Card.");
        return;
      }

      setApplyingCode(true);
      setReferralStatus(null);
      try {
        const res = await applyReferralCodeForUser(user.id, code);
        setReferralStatus(res.message);
        if (res.ok) {
          setReferralInput("");
          await loadData();
        }
      } catch {
        setReferralStatus("Could not apply referral code. Please try again.");
      } finally {
        setApplyingCode(false);
      }
    },
    [user?.id, referralInput, loadData]
  );

  const filteredReferrals = useMemo(() => {
    if (!refDashboard?.referrals) return [];
    if (ledgerFilter === "pending") {
      return refDashboard.referrals.filter((r) => r.status === "pending_first_scan");
    }
    if (ledgerFilter === "qualified") {
      return refDashboard.referrals.filter((r) => r.status === "qualified");
    }
    return refDashboard.referrals;
  }, [refDashboard, ledgerFilter]);

  return (
    <div className={styles.pageFrame}>
      <main className={styles.container}>
        {/* ── Top Navigation Bar ────────────────────────────────────────────── */}
        <header className={styles.topBar}>
          <div className={styles.topBarLeft}>
            <button
              type="button"
              onClick={handleBack}
              className={styles.backBtn}
              aria-label="Back"
              title="Back"
            >
              <Ionicons name="chevron-back" size={22} color="currentColor" />
            </button>
            <div className={styles.headingBlock}>
              <h1 className={styles.pageTitle}>Refer &amp; Earn</h1>
              <p className={styles.pageSubtitle}>
                Give Silver Welcome Cards, unlock Gold VIP Cards
              </p>
            </div>
          </div>

          <div className={styles.topBarRight}>
            <Link
              href="/rewards"
              className={styles.topActionBtn}
              aria-label="Go to Scratch Cards"
            >
              <Ionicons name="gift-outline" size={16} />
              <span>Scratch Cards</span>
            </Link>
          </div>
        </header>

        {/* ── Guest Banner if Not Signed In ─────────────────────────────────── */}
        {!user && !authLoading && (
          <div
            style={{
              marginBottom: "20px",
              padding: "16px 20px",
              borderRadius: "18px",
              backgroundColor: "var(--surface)",
              border: "1.5px solid rgba(0, 82, 204, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: "260px", flex: 1 }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  backgroundColor: "var(--primary-dim)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  color: "var(--primary)",
                }}
              >
                <Ionicons name="trophy" size={24} />
              </div>
              <div>
                <strong style={{ fontSize: "14px", color: "var(--text)", display: "block" }}>
                  Sign in to get your permanent invite link
                </strong>
                <span style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                  Track invited friends, receive live scan notifications &amp; unlock Gold VIP Scratch Cards.
                </span>
              </div>
            </div>

            <Link
              href="/profile"
              style={{
                padding: "9px 18px",
                minHeight: "40px",
                borderRadius: "10px",
                backgroundColor: "var(--primary)",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "13px",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                whiteSpace: "nowrap",
              }}
            >
              <span>Sign In / Profile</span>
              <Ionicons name="chevron-forward" size={14} />
            </Link>
          </div>
        )}

        {/* ── Responsive 2-Column Grid Layout ───────────────────────────────── */}
        <div className={styles.referralLayoutGrid}>
          {/* ── LEFT COLUMN: VIP Hero + Code + Sharing + Code Claim ────────── */}
          <div className={styles.columnLeft}>
            {/* Two-Sided VIP Referral Hero */}
            <section className={styles.heroCard} aria-labelledby="referral-hero-title">
              <div className={styles.kickerRow}>
                <Ionicons name="trophy" size={14} color="#F59E0B" />
                <span>Two-Sided VIP Referral Engine</span>
              </div>

              <h2 id="referral-hero-title" className={styles.heroHeading}>
                Give Silver, Get Gold VIP
              </h2>
              <p className={styles.heroBody}>
                When friends join with your code, they immediately receive a Silver Welcome Scratch Card with exclusive boAt &amp; AJIO coupons. When they complete their first verified QR scan, you unlock a Gold VIP Scratch Card!
              </p>

              {/* Referral Code Box */}
              <div className={styles.codeCard}>
                <div>
                  <span className={styles.codeLabel}>
                    {user ? "Your Permanent Invite Code" : "Sample Invite Code"}
                  </span>
                  <div className={styles.codeValue}>{inviteCode.toUpperCase()}</div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className={styles.copyCodeBtn}
                  aria-label="Copy referral code"
                >
                  <Ionicons
                    name={codeCopied ? "checkmark" : "copy-outline"}
                    size={16}
                    color="#FFFFFF"
                  />
                  <span>{codeCopied ? "COPIED! ✓" : "COPY CODE"}</span>
                </button>
              </div>

              {/* Social Sharing Row */}
              <div className={styles.shareRow}>
                <a
                  href={getWhatsAppShareUrl(inviteCode)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${styles.shareBtn} ${styles.shareWhatsApp}`}
                  aria-label="Share invite via WhatsApp"
                >
                  <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
                  <span>WhatsApp</span>
                </a>

                <a
                  href={getTelegramShareUrl(inviteCode)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${styles.shareBtn} ${styles.shareTelegram}`}
                  aria-label="Share invite via Telegram"
                >
                  <Ionicons name="paper-plane" size={18} color="#FFFFFF" />
                  <span>Telegram</span>
                </a>

                <button
                  type="button"
                  onClick={handleNativeShare}
                  className={`${styles.shareBtn} ${styles.shareNative}`}
                  aria-label="Share invite link"
                >
                  <Ionicons name="share-social" size={18} color="#FFFFFF" />
                  <span>Share</span>
                </button>
              </div>
            </section>

            {/* Have a Referral Code Claim Card */}
            <section className={styles.claimCard} aria-labelledby="claim-title">
              <h3 id="claim-title" className={styles.claimTitle}>
                Have a Referral Code?
              </h3>
              <p className={styles.claimDesc}>
                {wallet?.referredByCode
                  ? `Your account is successfully linked to friend code ${wallet.referredByCode}.`
                  : (wallet?.lifetimeEligibleScans || 0) > 0 || (wallet?.dailyEligibleScans || 0) > 0
                    ? "In accordance with Google Pay referral rules, codes can only be claimed before making your first QR scan."
                    : "Enter your friend's 7-character code to claim your Silver Welcome Scratch Card before your first scan."}
              </p>

              {wallet?.referredByCode ? (
                <div className={styles.claimLinkedNotice}>
                  <Ionicons name="checkmark-circle" size={18} color="#059669" />
                  <span>Linked to referral code: {wallet.referredByCode}</span>
                </div>
              ) : (wallet?.lifetimeEligibleScans || 0) > 0 || (wallet?.dailyEligibleScans || 0) > 0 ? (
                <div className={styles.claimDisabledNotice}>
                  <Ionicons name="lock-closed" size={18} color="var(--text-muted)" />
                  <div>
                    <strong style={{ fontSize: "13px", color: "var(--text)" }}>
                      Referral Entry Locked
                    </strong>
                    <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "2px 0 0", lineHeight: 1.4 }}>
                      Because you have already scanned your first QR code with BinRo, friend referral codes can no longer be applied to this account.
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleApplyReferral} className={styles.claimForm}>
                  <input
                    type="text"
                    value={referralInput}
                    onChange={(e) => setReferralInput(e.target.value)}
                    placeholder="e.g. yn5i82v"
                    maxLength={10}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                    className={styles.claimInput}
                  />
                  <button
                    type="submit"
                    disabled={!referralInput.trim() || applyingCode}
                    className={styles.claimBtn}
                  >
                    {applyingCode ? "Applying..." : "Apply Code"}
                  </button>
                </form>
              )}

              {referralStatus && (
                <div className={styles.claimFeedback}>{referralStatus}</div>
              )}
            </section>
          </div>

          {/* ── RIGHT COLUMN: Analytics Grid + Invited Friends Ledger ─────── */}
          <div className={styles.columnRight}>
            {/* Analytics 4-Grid */}
            <section className={styles.metricsGrid} aria-label="Referral metrics">
              <div className={styles.metricCard}>
                <span className={styles.metricValue} style={{ color: "var(--primary)" }}>
                  {refDashboard?.totalInvited ?? 0}
                </span>
                <span className={styles.metricLabel}>Friends Joined</span>
              </div>

              <div className={styles.metricCard}>
                <span className={styles.metricValue} style={{ color: "#F59E0B" }}>
                  {refDashboard?.totalPending ?? 0}
                </span>
                <span className={styles.metricLabel}>Pending 1st Scan</span>
              </div>

              <div className={styles.metricCard}>
                <span className={styles.metricValue} style={{ color: "#059669" }}>
                  {refDashboard?.totalQualified ?? 0}
                </span>
                <span className={styles.metricLabel}>Completed Scans</span>
              </div>

              <div className={styles.metricCard}>
                <span className={styles.metricValue} style={{ color: "#8B5CF6" }}>
                  {refDashboard?.goldCardsEarned ?? 0}
                </span>
                <span className={styles.metricLabel}>Gold VIP Cards</span>
              </div>
            </section>

            {/* Invited Friends Ledger */}
            <section className={styles.ledgerCard} aria-labelledby="ledger-title">
              <div className={styles.ledgerHeader}>
                <h3 id="ledger-title" className={styles.ledgerTitle}>
                  Invited Friends Ledger
                </h3>
                <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600 }}>
                  Live Status
                </span>
              </div>

              {/* Filter Controls */}
              <div className={styles.ledgerFilterBar} role="group" aria-label="Filter ledger">
                <button
                  type="button"
                  onClick={() => setLedgerFilter("all")}
                  className={`${styles.ledgerFilterBtn} ${
                    ledgerFilter === "all" ? styles.ledgerFilterBtnActive : ""
                  }`}
                >
                  All ({refDashboard?.totalInvited ?? 0})
                </button>

                <button
                  type="button"
                  onClick={() => setLedgerFilter("pending")}
                  className={`${styles.ledgerFilterBtn} ${
                    ledgerFilter === "pending" ? styles.ledgerFilterBtnActive : ""
                  }`}
                >
                  Pending ({refDashboard?.totalPending ?? 0})
                </button>

                <button
                  type="button"
                  onClick={() => setLedgerFilter("qualified")}
                  className={`${styles.ledgerFilterBtn} ${
                    ledgerFilter === "qualified" ? styles.ledgerFilterBtnActive : ""
                  }`}
                >
                  Qualified ({refDashboard?.totalQualified ?? 0})
                </button>
              </div>

              {/* Friends List */}
              {filteredReferrals.length === 0 ? (
                <div className={styles.ledgerEmpty}>
                  <Ionicons name="people-outline" size={36} />
                  <p className={styles.ledgerEmptyText}>
                    {ledgerFilter === "all"
                      ? "No friends invited yet. Share your code above to start earning Gold VIP cards!"
                      : `No ${ledgerFilter} referrals found.`}
                  </p>
                </div>
              ) : (
                <div className={styles.ledgerList}>
                  {filteredReferrals.map((friend) => {
                    const isQualified = friend.status === "qualified";
                    const username = friend.invitedUserUsername || "friend";
                    return (
                      <div key={friend.id} className={styles.ledgerRow}>
                        <div className={styles.ledgerUserCol}>
                          <div
                            className={styles.ledgerAvatar}
                            style={{
                              backgroundColor: isQualified
                                ? "rgba(16, 185, 129, 0.15)"
                                : "rgba(245, 158, 11, 0.15)",
                              color: isQualified ? "#059669" : "#D97706",
                            }}
                          >
                            {username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className={styles.ledgerUserName}>
                              {friend.invitedUserDisplayName || `@${username}`}
                            </div>
                            <div className={styles.ledgerUserDate}>
                              Joined {new Date(friend.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        <div className={styles.ledgerStatusCol}>
                          {isQualified ? (
                            <span className={styles.badgeQualified}>
                              <Ionicons name="checkmark-circle" size={12} color="#059669" />
                              <span>Gold Unlocked</span>
                            </span>
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span className={styles.badgePending}>Pending Scan</span>
                              <a
                                href={getWhatsAppShareUrl(inviteCode)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.remindBtn}
                                title="Remind friend to make their first scan"
                              >
                                Remind
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Tab Bar */}
      <BottomTabBar />
    </div>
  );
}
