"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { Ionicons } from "@/lib/mobile-icons";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import {
  savePendingReferralCode,
  applyReferralCodeForUser,
  getUserRewardWallet,
  type RewardWallet,
} from "@services/rewards";
import styles from "../../home.module.css";

interface InviteLandingClientProps {
  code: string;
}

export default function InviteLandingClient({ code }: InviteLandingClientProps) {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { colors, isDark } = useTheme();

  const cleanCode = useMemo(() => {
    return (code || "").trim().replace(/^@/, "").toLowerCase();
  }, [code]);

  const [wallet, setWallet] = useState<RewardWallet | null>(null);
  const [claimStatus, setClaimStatus] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Automatically save pending referral code on load so scanning or signing in associates the code
  useEffect(() => {
    if (cleanCode) {
      savePendingReferralCode(cleanCode).catch(() => {});
    }
  }, [cleanCode]);

  // Load wallet if user is signed in
  useEffect(() => {
    if (!user?.id) {
      setWallet(null);
      return;
    }
    getUserRewardWallet(user.id).then(setWallet).catch(() => {});
  }, [user?.id]);

  const handleClaim = useCallback(async () => {
    if (!user?.id || claiming) return;
    setClaiming(true);
    setClaimStatus(null);
    try {
      const res = await applyReferralCodeForUser(user.id, cleanCode);
      setClaimStatus(res.message);
      if (res.ok) {
        const updated = await getUserRewardWallet(user.id);
        setWallet(updated);
      }
    } catch {
      setClaimStatus("Could not apply referral. Please try again.");
    } finally {
      setClaiming(false);
    }
  }, [user?.id, cleanCode, claiming]);

  const handleCopyInvite = useCallback(async () => {
    if (typeof window !== "undefined" && navigator?.clipboard) {
      await navigator.clipboard.writeText(window.location.href).catch(() => {});
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  }, []);

  const isSelf = useMemo(() => {
    if (!user || !cleanCode) return false;
    const myUsername = (profile?.username || "").toLowerCase().replace(/^@/, "");
    return myUsername === cleanCode;
  }, [user, profile, cleanCode]);

  const alreadyClaimed = useMemo(() => {
    return Boolean(wallet?.referredByCode || wallet?.referredByUserId);
  }, [wallet]);

  return (
    <main className={styles.appFrame}>
      <div className={styles.page}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  backgroundColor: colors.primary,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: "bold",
                  fontSize: "18px",
                }}
              >
                B
              </div>
              <span style={{ fontSize: "19px", fontWeight: 700, color: colors.text }}>BinRo</span>
            </Link>
          </div>
          <div className={styles.headerRight}>
            <Link href="/rewards" className={styles.signInPill}>
              <Ionicons name="gift-outline" size={16} color={colors.primary} />
              <span>Rewards</span>
            </Link>
          </div>
        </header>

        {/* Hero Card */}
        <div
          style={{
            marginTop: "16px",
            padding: "28px 22px",
            borderRadius: "24px",
            background: isDark
              ? "linear-gradient(135deg, rgba(30,41,59,0.9), rgba(15,23,42,0.95))"
              : "linear-gradient(135deg, #eff6ff, #f8fafc)",
            border: `1px solid ${colors.surfaceBorder}`,
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              padding: "4px 14px",
              borderRadius: "9999px",
              backgroundColor: `${colors.primary}18`,
              color: colors.primary,
              fontSize: "12px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Ionicons name="sparkles" size={14} color={colors.primary} />
            <span>VIP Referral Invite</span>
          </div>

          <h1
            style={{
              fontSize: "26px",
              fontWeight: 800,
              color: colors.text,
              margin: 0,
              lineHeight: 1.25,
            }}
          >
            You&apos;re Invited with Code{" "}
            <span style={{ color: colors.primary, fontFamily: "monospace", letterSpacing: "1px" }}>
              {cleanCode.toUpperCase()}
            </span>
          </h1>

          <p
            style={{
              fontSize: "15px",
              color: colors.textSecondary,
              maxWidth: "480px",
              lineHeight: 1.55,
              margin: 0,
            }}
          >
            Scan any QR code safely with BinRo. Unpack destination links, inspect UPI payment recipients, and unlock your <strong>Silver Welcome Scratch Card</strong> on your first scan!
          </p>

          {/* Silver Card Gift Preview */}
          <div
            style={{
              width: "100%",
              maxWidth: "420px",
              marginTop: "8px",
              padding: "20px",
              borderRadius: "18px",
              background: isDark
                ? "linear-gradient(135deg, #1e293b, #334155)"
                : "linear-gradient(135deg, #f1f5f9, #e2e8f0)",
              border: `2px dashed ${colors.primary}50`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                backgroundColor: `${colors.primary}20`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="gift" size={32} color={colors.primary} />
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "16px", fontWeight: 700, color: colors.text }}>
                Silver Welcome Scratch Card
              </div>
              <div style={{ fontSize: "13px", color: colors.textSecondary, marginTop: "2px" }}>
                Curated offers from AJIO, boAt, Nykaa &amp; Flipkart
              </div>
            </div>
            <div
              style={{
                fontSize: "12px",
                color: colors.textMuted,
                backgroundColor: `${colors.surface}`,
                padding: "4px 10px",
                borderRadius: "8px",
              }}
            >
              🔒 Unlocks automatically on your 1st verified QR scan
            </div>
          </div>

          {/* Action Area */}
          <div style={{ width: "100%", maxWidth: "420px", marginTop: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {user ? (
              <>
                {isSelf ? (
                  <div
                    style={{
                      padding: "12px",
                      borderRadius: "12px",
                      backgroundColor: `${colors.warning}15`,
                      color: colors.warning,
                      fontSize: "13px",
                      fontWeight: 600,
                    }}
                  >
                    This is your personal referral link! Share it with friends to earn Gold VIP Cards.
                  </div>
                ) : alreadyClaimed ? (
                  <div
                    style={{
                      padding: "12px",
                      borderRadius: "12px",
                      backgroundColor: `${colors.safe}15`,
                      color: colors.safe,
                      fontSize: "13px",
                      fontWeight: 600,
                    }}
                  >
                    ✓ Referral linked to code {wallet?.referredByCode || cleanCode}. Scan any QR to unlock your card!
                  </div>
                ) : (wallet?.lifetimeEligibleScans || 0) > 0 || (wallet?.dailyEligibleScans || 0) > 0 ? (
                  <div
                    style={{
                      padding: "14px",
                      borderRadius: "14px",
                      backgroundColor: `${colors.textMuted}15`,
                      border: `1px solid ${colors.surfaceBorder}`,
                      color: colors.textSecondary,
                      fontSize: "13px",
                      lineHeight: "1.5",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      textAlign: "left",
                    }}
                  >
                    <Ionicons name="lock-closed" size={20} color={colors.textMuted} />
                    <div>
                      <strong style={{ color: colors.text, display: "block" }}>Referral Bonus Window Closed</strong>
                      In accordance with Google Pay referral rules, codes can only be entered before making your very first QR scan. Because you have already scanned with BinRo, this bonus cannot be applied.
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleClaim}
                    disabled={claiming}
                    style={{
                      padding: "14px 20px",
                      borderRadius: "14px",
                      backgroundColor: colors.primary,
                      color: "#fff",
                      border: "none",
                      fontSize: "15px",
                      fontWeight: 700,
                      cursor: claiming ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                    }}
                  >
                    <Ionicons name="checkmark-circle" size={18} color="#fff" />
                    <span>{claiming ? "Applying Gift..." : `Claim Silver Gift with Code ${cleanCode.toUpperCase()}`}</span>
                  </button>
                )}

                {claimStatus && (
                  <div style={{ fontSize: "13px", color: colors.primary, fontWeight: 600 }}>
                    {claimStatus}
                  </div>
                )}

                <Link
                  href="/scanner"
                  style={{
                    padding: "14px 20px",
                    borderRadius: "14px",
                    backgroundColor: colors.surface,
                    border: `1px solid ${colors.surfaceBorder}`,
                    color: colors.text,
                    fontSize: "15px",
                    fontWeight: 700,
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  <Ionicons name="scan-outline" size={18} color={colors.primary} />
                  <span>Open Scanner &amp; Scan 1st QR</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/scanner"
                  style={{
                    padding: "14px 20px",
                    borderRadius: "14px",
                    backgroundColor: colors.primary,
                    color: "#fff",
                    border: "none",
                    fontSize: "15px",
                    fontWeight: 700,
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  <Ionicons name="scan-outline" size={18} color="#fff" />
                  <span>Start Scanning (Web Camera)</span>
                </Link>

                <Link
                  href="/download"
                  style={{
                    padding: "14px 20px",
                    borderRadius: "14px",
                    backgroundColor: colors.surface,
                    border: `1px solid ${colors.surfaceBorder}`,
                    color: colors.text,
                    fontSize: "15px",
                    fontWeight: 700,
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  <Ionicons name="logo-android" size={18} color={colors.safe} />
                  <span>Download Android Native App</span>
                </Link>
              </>
            )}

            <button
              onClick={handleCopyInvite}
              style={{
                background: "none",
                border: "none",
                color: colors.textSecondary,
                fontSize: "13px",
                cursor: "pointer",
                padding: "8px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <Ionicons name="copy-outline" size={14} color={colors.textSecondary} />
              <span>{copiedLink ? "Link Copied!" : "Copy Invite Link"}</span>
            </button>
          </div>
        </div>

        {/* Value Proposition Highlights */}
        <section style={{ marginTop: "28px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: colors.text, margin: "0 0 4px" }}>
            Why Scan With BinRo?
          </h2>

          <div
            style={{
              padding: "16px",
              borderRadius: "16px",
              backgroundColor: colors.surface,
              border: `1px solid ${colors.surfaceBorder}`,
              display: "flex",
              alignItems: "flex-start",
              gap: "14px",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                backgroundColor: `${colors.safe}18`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Ionicons name="shield-checkmark" size={22} color={colors.safe} />
            </div>
            <div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: colors.text }}>
                Zero-Trust Link Inspection
              </div>
              <div style={{ fontSize: "13px", color: colors.textSecondary, marginTop: "2px", lineHeight: 1.4 }}>
                Unmask hidden redirects and shortened links before your browser opens them, stopping quishing scams.
              </div>
            </div>
          </div>

          <div
            style={{
              padding: "16px",
              borderRadius: "16px",
              backgroundColor: colors.surface,
              border: `1px solid ${colors.surfaceBorder}`,
              display: "flex",
              alignItems: "flex-start",
              gap: "14px",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                backgroundColor: `${colors.primary}18`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Ionicons name="card-outline" size={22} color={colors.primary} />
            </div>
            <div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: colors.text }}>
                Payment Recipient Validation
              </div>
              <div style={{ fontSize: "13px", color: colors.textSecondary, marginTop: "2px", lineHeight: 1.4 }}>
                Inspect UPI, SEPA, and BharatQR payloads so you know exactly who you are paying before sending money.
              </div>
            </div>
          </div>

          <div
            style={{
              padding: "16px",
              borderRadius: "16px",
              backgroundColor: colors.surface,
              border: `1px solid ${colors.surfaceBorder}`,
              display: "flex",
              alignItems: "flex-start",
              gap: "14px",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                backgroundColor: `${colors.warning}18`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Ionicons name="gift-outline" size={22} color={colors.warning} />
            </div>
            <div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: colors.text }}>
                Scratch Cards &amp; Partner Deals
              </div>
              <div style={{ fontSize: "13px", color: colors.textSecondary, marginTop: "2px", lineHeight: 1.4 }}>
                Unlock daily rewards and exclusive partner savings as you scan QR codes and help keep the community safe.
              </div>
            </div>
          </div>
        </section>

        <div style={{ height: "90px" }} />
      </div>

      <BottomTabBar />
    </main>
  );
}
