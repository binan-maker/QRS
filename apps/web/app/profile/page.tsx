"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ionicons } from "@/lib/mobile-icons";
import { useAuth } from "@/lib/auth-context";
import { useAvatar, isUserUploadedPhoto } from "@/lib/avatar-context";
import { useTheme } from "@/lib/theme-context";
import { getWebSupabase, isWebSupabaseConfigured } from "@/lib/supabase";
import { clearAllUserScans } from "@/lib/scan-history";
import { sanitizeUsername } from "@shared/utils/username-rules";
import { syncStructuredUserProfile } from "@/lib/user-account";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import {
  getUserRewardWallet,
  applyReferralCodeForUser,
  type RewardWallet,
} from "@services/rewards";
import ProfileLoading from "./loading";
import styles from "./profile.module.css";

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const { cachedUrl, avatarUrl, uploadAvatar, removeAvatar, uploading } = useAvatar();
  const { mode: themeMode, setMode: setThemeMode } = useTheme();

  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Derive identity fields
  const initialDisplayName =
    user?.user_metadata?.display_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "User";

  const initialUsername = sanitizeUsername(
    user?.user_metadata?.username ||
    user?.email?.split("@")[0] ||
    user?.user_metadata?.user_name ||
    ""
  );

  // Editable states
  const [displayNameState, setDisplayNameState] = useState(initialDisplayName);
  const [usernameState, setUsernameState] = useState(initialUsername);
  const [usernameLastChangedAt, setUsernameLastChangedAt] = useState<string | null>(
    user?.user_metadata?.username_last_changed_at || null
  );
  const [pastUsernames, setPastUsernames] = useState<string[]>(
    user?.user_metadata?.past_usernames || []
  );
  const [clearingData, setClearingData] = useState(false);
  const [userStats, setUserStats] = useState<{
    scanCount: number;
    commentCount: number;
    memberSince: string | null;
  }>({ scanCount: 0, commentCount: 0, memberSince: null });
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Google Pay Referral states
  const [referralModalOpen, setReferralModalOpen] = useState(false);
  const [rewardWallet, setRewardWallet] = useState<RewardWallet | null>(null);
  const [referralCodeInput, setReferralCodeInput] = useState("");
  const [referralApplying, setReferralApplying] = useState(false);
  const [referralFeedback, setReferralFeedback] = useState<{ text: string; isError: boolean } | null>(null);
  const [referralSuccess, setReferralSuccess] = useState(false);

  const loadWallet = useCallback(async () => {
    if (user?.id) {
      try {
        const w = await getUserRewardWallet(user.id);
        setRewardWallet(w);
      } catch {}
    }
  }, [user?.id]);

  useEffect(() => {
    void loadWallet();
  }, [loadWallet]);

  const handleApplyReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = referralCodeInput.trim();
    if (!trimmed || !user?.id) return;
    setReferralApplying(true);
    setReferralFeedback(null);
    try {
      const res = await applyReferralCodeForUser(user.id, trimmed);
      if (res.ok) {
        setReferralSuccess(true);
        await loadWallet();
      } else {
        setReferralFeedback({ text: res.message, isError: true });
      }
    } catch {
      setReferralFeedback({ text: "Could not apply referral code. Please try again.", isError: true });
    } finally {
      setReferralApplying(false);
    }
  };


  // Cleanup toast timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Sync state if user metadata updates
  useEffect(() => {
    if (user) {
      const name =
        user?.user_metadata?.display_name ||
        user?.user_metadata?.full_name ||
        user?.email?.split("@")[0] ||
        "User";
      const uName = sanitizeUsername(
        user?.user_metadata?.username ||
        user?.email?.split("@")[0] ||
        user?.user_metadata?.user_name ||
        ""
      );
      setDisplayNameState(name);
      setUsernameState(uName);
      if (user?.user_metadata?.username_last_changed_at) {
        setUsernameLastChangedAt(user.user_metadata.username_last_changed_at);
      }
      if (Array.isArray(user?.user_metadata?.past_usernames)) {
        setPastUsernames(user.user_metadata.past_usernames);
      }

      // Member since date
      const createdAt = (user as any)?.created_at;
      if (createdAt) {
        const d = new Date(createdAt);
        setUserStats((prev) => ({
          ...prev,
          memberSince: d.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        }));
      }
    }
  }, [user]);

  // Query users table for stats, username_last_changed_at and past_usernames
  useEffect(() => {
    if (user?.id && isWebSupabaseConfigured()) {
      const supabase = getWebSupabase();
      Promise.all([
        supabase
          .from("users")
          .select("username, username_last_changed_at, past_usernames, scan_count, comment_count, created_at")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("qr_scans")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("is_deleted", false),
        supabase
          .from("qr_comments")
          .select("id, text")
          .eq("user_id", user.id)
          .eq("is_deleted", false)
          .limit(1000),
      ])
        .then(([{ data }, scansRes, commentsRes]) => {
          const liveScans = scansRes.count ?? 0;
          const liveComments = (commentsRes.data || []).filter(
            (c: any) => !String(c.text || "").startsWith("__qr_vote__:")
          ).length;

          if (data?.username) {
            const clean = sanitizeUsername(data.username);
            setUsernameState(clean);
          }
          if (data?.username_last_changed_at) {
            setUsernameLastChangedAt(data.username_last_changed_at);
          }
          if (Array.isArray(data?.past_usernames)) {
            setPastUsernames(data.past_usernames);
          }
          const scans = Math.max(data?.scan_count ?? 0, liveScans);
          const comments = Math.max(data?.comment_count ?? 0, liveComments);
          const joined = data?.created_at
            ? new Date(data.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })
            : null;

          setUserStats((prev) => ({
            scanCount: Math.max(scans, prev.scanCount),
            commentCount: Math.max(comments, prev.commentCount),
            memberSince: joined || prev.memberSince,
          }));

          if (!data && user?.id) {
            void syncStructuredUserProfile({
              id: user.id,
              email: user.email || `${user.id}@binro.app`,
              displayName: displayNameState,
              username: usernameState,
              photoUrl: photoURL,
              avatarUrl: photoURL,
              emailVerified: Boolean(user.email_confirmed_at),
              pastUsernames,
              usernameLastChangedAt,
              scanCount: scans,
              commentCount: comments,
            });
          } else if (
            data &&
            ((data.scan_count ?? 0) < scans || (data.comment_count ?? 0) < comments)
          ) {
            void supabase
              .from("users")
              .update({ scan_count: scans, comment_count: comments })
              .eq("id", user.id);
          }
        })
        .catch(() => {});

      // Fallback: check local scan history count if user has local scans
      try {
        const local = localStorage.getItem(`local_scan_history_${user.id}`);
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setUserStats((prev) => ({
              ...prev,
              scanCount: Math.max(prev.scanCount, parsed.length),
            }));
          }
        }
      } catch {}
    }
  }, [user?.id]);



  const initials =
    displayNameState
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p: string) => p.charAt(0).toUpperCase())
      .join("") || "?";

  const localCustom =
    typeof window !== "undefined" && user?.id
      ? localStorage.getItem(`user_custom_avatar_${user.id}`) ||
        localStorage.getItem(`user_avatar_${user.id}`)
      : null;

  // Prioritize user's uploaded avatar over provider default avatar
  const photoURL =
    avatarUrl ||
    cachedUrl ||
    (localCustom && isUserUploadedPhoto(localCustom) ? localCustom : null) ||
    user?.user_metadata?.custom_avatar_url ||
    user?.user_metadata?.photo_url ||
    null;

  // Reset photo error when photoURL changes
  useEffect(() => {
    setPhotoError(false);
  }, [photoURL]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 3200);
  };


  const handlePickPhoto = () => {
    setPhotoModalOpen(false);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoError(false);
      try {
        await uploadAvatar(file);
        showToast("Profile photo updated successfully.");
      } catch (err) {
        console.error("[profile] photo upload failed:", err);
        showToast("Failed to upload photo. Please try again.", "error");
      }
    }
    if (e.target) e.target.value = "";
  };

  const handleRemovePhoto = async () => {
    setPhotoModalOpen(false);
    try {
      await removeAvatar();
      showToast("Profile photo removed.");
    } catch {
      showToast("Could not remove photo.", "error");
    }
  };



  const handleClearData = async () => {
    setClearingData(true);
    try {
      await clearAllUserScans(user?.id);
      if (typeof window !== "undefined") {
        if (user?.id) {
          localStorage.removeItem(`user_custom_avatar_${user.id}`);
          localStorage.removeItem(`user_avatar_${user.id}`);
        }
        localStorage.removeItem("anon_scan_usage");
        localStorage.removeItem("anon_scan_count");
        localStorage.removeItem("recent_search_terms");
      }
      showToast("Local scan history & device cache cleared.");
    } catch {
      showToast("Could not clear local data.", "error");
    } finally {
      setClearingData(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  if (loading) {
    return <ProfileLoading />;
  }

  // ── GUEST VIEW (If not signed in) ──────────────────────────────────────────
  if (!user) {
    return (
      <main className={styles.container}>
        <div className={styles.inner}>
          <header className={styles.topBar}>
            <h1 className={styles.pageTitle}>Profile</h1>
          </header>

          <div className={styles.guestWrap}>
            <div className={styles.guestInner}>
              <div className={styles.guestIconRing}>
                <Ionicons name="person-outline" size={40} color="var(--primary)" />
              </div>
              <h2 className={styles.guestTitle}>Not signed in</h2>
              <p className={styles.guestSub}>
                Sign in to view your profile and activity
              </p>
              <Link
                href="/login?returnUrl=/profile"
                className={styles.guestSignInBtn}
              >
                Sign In
              </Link>
              <Link
                href="/register?returnUrl=/profile"
                className={styles.guestRegBtn}
              >
                Create Account
              </Link>
            </div>
          </div>
        </div>

        <BottomTabBar activeTab="profile" />
      </main>
    );
  }

  // ── AUTHENTICATED PROFILE DASHBOARD ────────────────────────────────────────
  return (
    <main className={styles.container}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        style={{ display: "none" }}
      />

      <div className={styles.inner}>
        {/* Top Bar with Settings */}
        <header className={styles.topBar}>
          <h1 className={styles.pageTitle}>Profile</h1>
          <div className={styles.topBarActions}>
            <Link
              href="/settings"
              className={styles.iconBtn}
              title="Settings"
              aria-label="Settings"
            >
              <Ionicons name="settings-outline" size={17} />
            </Link>
          </div>
        </header>

        {/* Global Toast Message */}
        {toast && (
          <div className={toast.type === "error" ? styles.toastError : styles.toastSuccess}>
            <Ionicons
              name={toast.type === "error" ? "alert-circle" : "checkmark-circle"}
              size={16}
            />
            <span>{toast.message}</span>
          </div>
        )}

        {/* Profile Content Grid */}
        <div className={styles.profileGrid}>
          {/* ── LEFT COLUMN: Avatar & Account Details ── */}
          <div className={styles.profileLeftCol}>
            {/* Unified Hero Identity + Activity Card */}
            <section className={styles.avatarSection}>
              <button
                type="button"
                onClick={() => setPhotoModalOpen(true)}
                className={styles.avatarPressable}
                aria-label="Change profile photo"
              >
                <div className={styles.avatarRing}>
                  <div className={styles.avatarInner}>
                    {uploading ? (
                      <div
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          border: "3px solid var(--primary-dim)",
                          borderTopColor: "var(--primary)",
                          animation: "spin 0.8s linear infinite",
                        }}
                      />
                    ) : photoURL && !photoError ? (
                      <img
                        src={photoURL}
                        alt={displayNameState}
                        referrerPolicy="no-referrer"
                        onError={() => setPhotoError(true)}
                        className={styles.avatarPhoto}
                      />
                    ) : (
                      <span className={styles.avatarInitials}>{initials}</span>
                    )}
                  </div>
                </div>
                <div className={styles.cameraBtn}>
                  <Ionicons name="camera" size={11} color="var(--primary-text)" />
                </div>
              </button>

              <h2 className={styles.displayName}>{displayNameState}</h2>

              <div className={styles.heroIdentityMeta}>
                {usernameState && (
                  <p className={styles.usernameText}>@{usernameState}</p>
                )}
                <span className={styles.heroMetaDot} aria-hidden="true">•</span>
                {Boolean(user.email_confirmed_at || (user as any).confirmed_at) ? (
                  <span className={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={11} color="var(--safe)" />
                    <span>Verified</span>
                  </span>
                ) : (
                  <span className={styles.unverifiedBadge}>
                    <Ionicons name="alert-circle-outline" size={11} color="var(--warning)" />
                    <span>Unverified</span>
                  </span>
                )}
              </div>
            </section>

            {/* ── Account Details Navigation Link Card (Settings) ── */}
            <Link
              href="/settings/account-details"
              className={styles.accountDetailsLinkCard}
              style={{ textDecoration: "none" }}
            >
              <div className={styles.accountDetailsLinkLeft}>
                <div className={styles.accountDetailsLinkIcon}>
                  <Ionicons name="person-circle-outline" size={20} color="var(--primary)" />
                </div>
                <div className={styles.accountDetailsLinkContent}>
                  <strong className={styles.accountDetailsLinkTitle}>Account Details</strong>
                  <span className={styles.accountDetailsLinkSub}>
                    Manage display name, @username &amp; email
                  </span>
                </div>
              </div>
              <div className={styles.accountDetailsLinkRight}>
                <Ionicons name="chevron-forward" size={16} color="var(--text-muted)" />
              </div>
            </Link>
          </div>

          {/* ── RIGHT COLUMN: Appearance & Quick Actions ── */}
          <div className={styles.profileRightCol}>
            {/* Unified Theme Preference Card */}
            <div className={styles.infoCard}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>Theme</span>
              </div>
              <div className={styles.themeGrid} role="group" aria-label="Theme selection">
                <button
                  type="button"
                  onClick={() => setThemeMode("light")}
                  className={`${styles.themeCardBtn} ${themeMode === "light" ? styles.themeCardBtnActive : ""}`}
                  aria-pressed={themeMode === "light"}
                >
                  <Ionicons name="sunny-outline" size={16} />
                  <span>Light</span>
                </button>

                <button
                  type="button"
                  onClick={() => setThemeMode("dark")}
                  className={`${styles.themeCardBtn} ${themeMode === "dark" ? styles.themeCardBtnActive : ""}`}
                  aria-pressed={themeMode === "dark"}
                >
                  <Ionicons name="moon-outline" size={16} />
                  <span>Dark</span>
                </button>

                <button
                  type="button"
                  onClick={() => setThemeMode("system")}
                  className={`${styles.themeCardBtn} ${themeMode === "system" ? styles.themeCardBtnActive : ""}`}
                  aria-pressed={themeMode === "system"}
                >
                  <Ionicons name="contrast-outline" size={16} />
                  <span>Auto</span>
                </button>
              </div>
            </div>

            {/* Action Cards with Distance across Mobile, Tablet, and Desktop */}
            <div className={styles.actionsGrid}>
              {/* Scan History */}
              <Link href="/history" className={styles.actionCard}>
                <div className={styles.actionIcon}>
                  <Ionicons name="time-outline" size={19} />
                </div>
                <div className={styles.actionTextCol}>
                  <span className={styles.actionLabel}>Scan History</span>
                  <span className={styles.actionSub}>Review, search or delete your scans</span>
                </div>
                <div className={styles.actionArrow}>
                  <Ionicons name="chevron-forward" size={16} />
                </div>
              </Link>

              {/* Scratch Cards */}
              <Link href="/rewards" className={styles.actionCard}>
                <div className={styles.actionIcon}>
                  <Ionicons name="gift-outline" size={19} />
                </div>
                <div className={styles.actionTextCol}>
                  <span className={styles.actionLabel}>Scratch Cards</span>
                  <span className={styles.actionSub}>Daily scan milestone vouchers &amp; coupons</span>
                </div>
                <div className={styles.actionArrow}>
                  <Ionicons name="chevron-forward" size={16} />
                </div>
              </Link>

              {/* Refer & Earn */}
              <Link href="/referrals" className={styles.actionCard}>
                <div className={styles.actionIcon}>
                  <Ionicons name="people-outline" size={19} />
                </div>
                <div className={styles.actionTextCol}>
                  <span className={styles.actionLabel}>Refer &amp; Earn</span>
                  <span className={styles.actionSub}>Invite friends, give Silver &amp; earn Gold VIP cards</span>
                </div>
                <div className={styles.actionArrow}>
                  <Ionicons name="chevron-forward" size={16} />
                </div>
              </Link>


              {/* Clear Local Cache */}
              <button
                type="button"
                onClick={handleClearData}
                disabled={clearingData}
                className={`${styles.actionCard} ${styles.actionCardDanger}`}
              >
                <div className={`${styles.actionIcon} ${styles.actionIconDanger}`}>
                  <Ionicons name="trash-outline" size={19} />
                </div>
                <div className={styles.actionTextCol}>
                  <span className={`${styles.actionLabel} ${styles.actionLabelDanger}`}>
                    {clearingData ? "Clearing Data..." : "Clear Local History"}
                  </span>
                  <span className={styles.actionSub}>Wipe cached scans from this device</span>
                </div>
                <div className={styles.actionArrow}>
                  <Ionicons name="chevron-forward" size={16} />
                </div>
              </button>
            </div>

            {/* Sign Out Button */}
            <button
              type="button"
              onClick={handleSignOut}
              className={styles.signOutBtn}
            >
              <Ionicons name="log-out-outline" size={16} color="var(--danger)" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Photo Picker Modal */}
      {photoModalOpen && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setPhotoModalOpen(false)}
        >
          <div
            className={styles.modalSheet}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h3 className={styles.modalTitle}>Profile Photo</h3>

            <button
              type="button"
              onClick={handlePickPhoto}
              className={styles.modalOptionBtn}
            >
              <Ionicons name="camera-outline" size={20} color="var(--primary)" />
              <span>Upload New Photo</span>
            </button>

            {photoURL && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className={`${styles.modalOptionBtn} ${styles.modalOptionDanger}`}
              >
                <Ionicons name="trash-outline" size={20} color="var(--danger)" />
                <span>Remove Photo</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setPhotoModalOpen(false)}
              className={styles.modalCancelBtn}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Google Pay Style Referral Code Modal */}
      {referralModalOpen && (
        <div
          className={styles.modalBackdrop}
          onClick={() => {
            setReferralModalOpen(false);
            setReferralCodeInput("");
            setReferralFeedback(null);
            setReferralSuccess(false);
          }}
          style={{ zIndex: 11000 }}
        >
          <div
            className={styles.modalSheet}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            style={{ maxWidth: "420px", padding: "24px" }}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    backgroundColor: "rgba(37, 99, 235, 0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--primary, #2563EB)",
                  }}
                >
                  <Ionicons name="gift" size={20} />
                </div>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "var(--text, #0f172a)" }}>
                  Referral code
                </h3>
              </div>

              <button
                type="button"
                onClick={() => {
                  setReferralModalOpen(false);
                  setReferralCodeInput("");
                  setReferralFeedback(null);
                  setReferralSuccess(false);
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted, #94a3b8)",
                  padding: "4px",
                  display: "flex",
                }}
                aria-label="Close"
              >
                <Ionicons name="close" size={22} />
              </button>
            </div>

            {/* Modal Body */}
            {referralSuccess ? (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <div
                  style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(16, 185, 129, 0.15)",
                    color: "#10B981",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 14px",
                  }}
                >
                  <Ionicons name="checkmark-circle" size={44} />
                </div>
                <h4 style={{ margin: "0 0 8px", fontSize: "17px", fontWeight: 700, color: "var(--text, #0f172a)" }}>
                  Referral code applied!
                </h4>
                <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary, #64748b)", lineHeight: 1.5 }}>
                  Your Silver Welcome Scratch Card is now linked. Scan your very first QR code to unlock and scratch your reward!
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setReferralModalOpen(false);
                    setReferralSuccess(false);
                    setReferralCodeInput("");
                  }}
                  className={styles.modalOptionBtn}
                  style={{ marginTop: "20px", justifyContent: "center", fontWeight: 700 }}
                >
                  Done
                </button>
              </div>
            ) : !rewardWallet?.isReferralEligible ? (
              <div style={{ textAlign: "center", padding: "12px 0" }}>
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(245, 158, 11, 0.15)",
                    color: "#F59E0B",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 12px",
                  }}
                >
                  <Ionicons name="lock-closed" size={32} />
                </div>
                <h4 style={{ margin: "0 0 8px", fontSize: "16px", fontWeight: 700, color: "var(--text, #0f172a)" }}>
                  {rewardWallet?.referredByCode
                    ? "Referral already applied"
                    : "No longer eligible for bonus"}
                </h4>
                <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary, #64748b)", lineHeight: 1.5 }}>
                  {rewardWallet?.referredByCode
                    ? `Your account is already linked to referral code "${rewardWallet.referredByCode}". Each user can only claim one referral code.`
                    : "In accordance with Google Pay referral rules, referral codes can only be entered before making your very first scan. Because you have already scanned a QR code with BinRo, this option is now permanently closed."}
                </p>
                <button
                  type="button"
                  onClick={() => setReferralModalOpen(false)}
                  className={styles.modalCancelBtn}
                  style={{ marginTop: "20px" }}
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyReferral}>
                <p style={{ margin: "0 0 16px", fontSize: "13px", color: "var(--text-secondary, #64748b)", lineHeight: 1.5 }}>
                  Type your friend&apos;s 7-character referral code into the box before your very first scan to claim your Silver Welcome Scratch Card.
                </p>

                <div style={{ position: "relative", marginBottom: "12px" }}>
                  <input
                    type="text"
                    value={referralCodeInput}
                    onChange={(e) => {
                      setReferralCodeInput(e.target.value.trim());
                      setReferralFeedback(null);
                    }}
                    placeholder="e.g. yn5i82v"
                    maxLength={10}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                    style={{
                      width: "100%",
                      height: "48px",
                      padding: "0 54px 0 14px",
                      borderRadius: "12px",
                      border: "1px solid var(--surface-border, #e2e8f0)",
                      backgroundColor: "var(--background, #f8fafc)",
                      color: "var(--text, #0f172a)",
                      fontSize: "15px",
                      fontWeight: 600,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: "11px",
                      color: "var(--text-muted, #94a3b8)",
                      pointerEvents: "none",
                    }}
                  >
                    {referralCodeInput.length}/7
                  </span>
                </div>

                {referralFeedback && (
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: referralFeedback.isError ? "var(--danger, #ef4444)" : "var(--safe, #10B981)",
                      marginBottom: "10px",
                    }}
                  >
                    {referralFeedback.text}
                  </div>
                )}

                <p style={{ margin: "0 0 16px", fontSize: "11px", color: "var(--text-muted, #94a3b8)", lineHeight: 1.4 }}>
                  ⚠️ Note: This input will be permanently disabled as soon as you scan your first QR code.
                </p>

                <button
                  type="submit"
                  disabled={referralApplying || !referralCodeInput.trim()}
                  className={styles.modalOptionBtn}
                  style={{
                    width: "100%",
                    justifyContent: "center",
                    fontWeight: 700,
                    backgroundColor: "var(--primary, #2563EB)",
                    color: "#ffffff",
                    opacity: referralApplying || !referralCodeInput.trim() ? 0.5 : 1,
                    cursor: referralApplying || !referralCodeInput.trim() ? "not-allowed" : "pointer",
                  }}
                >
                  {referralApplying ? "Applying..." : "Apply"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      <BottomTabBar activeTab="profile" />
    </main>
  );
}
