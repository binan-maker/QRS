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
import { sanitizeTextInput } from "@/lib/web-security";
import {
  sanitizeUsername,
  validateUsername,
  getRemainingUsernameCooldownDays,
  canUserChangeUsername,
} from "@shared/utils/username-rules";
import {
  checkUsernameAvailability,
  updateUsernamePermanently,
  type UsernameAvailabilityResult,
} from "@/lib/username-service";
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
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [nameInput, setNameInput] = useState(initialDisplayName);
  const [usernameInput, setUsernameInput] = useState(initialUsername);
  const [usernameValidationError, setUsernameValidationError] = useState<string | null>(null);
  const [usernameLastChangedAt, setUsernameLastChangedAt] = useState<string | null>(
    user?.user_metadata?.username_last_changed_at || null
  );
  const [pastUsernames, setPastUsernames] = useState<string[]>(
    user?.user_metadata?.past_usernames || []
  );
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState<UsernameAvailabilityResult>({
    available: true,
  });
  const [savingName, setSavingName] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [clearingData, setClearingData] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [userStats, setUserStats] = useState<{
    scanCount: number;
    commentCount: number;
    memberSince: string | null;
  }>({ scanCount: 0, commentCount: 0, memberSince: null });
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Google Pay Referral states
  const [menuOpen, setMenuOpen] = useState(false);
  const [referralModalOpen, setReferralModalOpen] = useState(false);
  const [rewardWallet, setRewardWallet] = useState<RewardWallet | null>(null);
  const [referralCodeInput, setReferralCodeInput] = useState("");
  const [referralApplying, setReferralApplying] = useState(false);
  const [referralFeedback, setReferralFeedback] = useState<{ text: string; isError: boolean } | null>(null);
  const [referralSuccess, setReferralSuccess] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

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

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

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

  const cooldownDays = getRemainingUsernameCooldownDays(usernameLastChangedAt);
  const canChangeUsername = cooldownDays === 0;

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
      setNameInput(name);
      setUsernameState(uName);
      setUsernameInput(uName);
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
            setUsernameInput(clean);
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

  // Real-time debounced username availability check against Supabase
  useEffect(() => {
    if (!isEditingUsername) {
      setAvailabilityStatus({ available: true });
      setCheckingAvailability(false);
      return;
    }

    const trimmed = usernameInput.trim();
    if (!trimmed) {
      setAvailabilityStatus({
        available: false,
        error: "Username cannot be empty.",
      });
      setCheckingAvailability(false);
      return;
    }

    const val = validateUsername(trimmed);
    if (!val.valid) {
      setAvailabilityStatus({
        available: false,
        error: val.error || "Invalid username format.",
      });
      setCheckingAvailability(false);
      return;
    }

    if (usernameState && trimmed.toLowerCase() === usernameState.toLowerCase()) {
      setAvailabilityStatus({
        available: true,
        isCurrent: true,
        message: "This is your current username.",
      });
      setCheckingAvailability(false);
      return;
    }

    setCheckingAvailability(true);
    const timer = setTimeout(async () => {
      try {
        const res = await checkUsernameAvailability(trimmed, user?.id, usernameState);
        setAvailabilityStatus(res);
      } catch {
        setAvailabilityStatus({
          available: false,
          error: "Unable to verify username right now.",
        });
      } finally {
        setCheckingAvailability(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [usernameInput, isEditingUsername, user?.id, usernameState]);

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

  const handleResendVerification = async () => {
    if (!user?.email || !isWebSupabaseConfigured()) return;
    setResendingVerification(true);
    try {
      const supabase = getWebSupabase();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: user.email,
      });
      if (error) throw error;
      showToast("Verification email sent! Check your inbox.");
    } catch (err: any) {
      showToast(err?.message || "Failed to resend verification email.", "error");
    } finally {
      setResendingVerification(false);
    }
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

  const handleSaveName = async () => {
    const trimmed = sanitizeTextInput(nameInput.trim(), 40);
    if (!trimmed) {
      showToast("Name cannot be empty.", "error");
      return;
    }
    setSavingName(true);
    try {
      setDisplayNameState(trimmed);
      setIsEditingName(false);
      if (isWebSupabaseConfigured()) {
        const supabase = getWebSupabase();
        await supabase.auth.updateUser({ data: { display_name: trimmed, full_name: trimmed } });
        if (user?.id) {
          const { error: updateErr } = await supabase
            .from("users")
            .update({ display_name: trimmed, updated_at: new Date().toISOString() })
            .eq("id", user.id);

          if (updateErr) {
            await supabase.from("users").upsert(
              {
                id: user.id,
                email: user.email || `${user.id}@binro.app`,
                display_name: trimmed,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "id" }
            );
          }
        }
      }
      showToast("Display name updated.");
    } catch {
      showToast("Failed to save display name.", "error");
    } finally {
      setSavingName(false);
    }
  };

  const handleSaveUsername = async () => {
    const sanitized = sanitizeUsername(usernameInput);
    const validation = validateUsername(sanitized);
    if (!validation.valid) {
      showToast(validation.error || "Invalid username format.", "error");
      return;
    }
    if (!canChangeUsername) {
      showToast(
        `Usernames can only be edited once every 15 days (${cooldownDays} day${
          cooldownDays === 1 ? "" : "s"
        } remaining).`,
        "error"
      );
      return;
    }
    if (!availabilityStatus.available && !availabilityStatus.isCurrent) {
      showToast(availabilityStatus.error || "This username is taken.", "error");
      return;
    }
    if (!user?.id) {
      showToast("Please sign in to update your username.", "error");
      return;
    }

    setSavingUsername(true);
    try {
      const result = await updateUsernamePermanently({
        userId: user.id,
        newUsername: sanitized,
        oldUsername: usernameState || null,
        lastChangedAt: usernameLastChangedAt,
        existingPastUsernames: pastUsernames,
      });

      setUsernameState(sanitized);
      setIsEditingUsername(false);
      setUsernameLastChangedAt(result.newChangedAt);
      setPastUsernames(result.pastUsernames);
      showToast("Username updated successfully. Can be edited again in 15 days.");
    } catch (err: any) {
      showToast(err?.message || "Failed to save username.", "error");
    } finally {
      setSavingUsername(false);
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
        {/* Top Bar with Settings and Google Pay Three-Dot Menu */}
        <header className={styles.topBar} style={{ position: "relative" }}>
          <h1 className={styles.pageTitle}>Profile</h1>
          <div className={styles.topBarActions} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {/* Google Pay Style Three Dots (⋮) Menu Button */}
            <div ref={menuRef} style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className={styles.iconBtn}
                title="More options"
                aria-label="More options"
              >
                <Ionicons name="ellipsis-vertical" size={17} />
              </button>

              {/* Google Pay Style Dropdown Popover */}
              {menuOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "42px",
                    right: "0px",
                    backgroundColor: "var(--surface, #ffffff)",
                    border: "1px solid var(--surface-border, #e2e8f0)",
                    borderRadius: "16px",
                    padding: "6px",
                    minWidth: "220px",
                    zIndex: 1000,
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.25)",
                  }}
                >
                  <Link
                    href="/rewards"
                    onClick={() => setMenuOpen(false)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <Ionicons name="gift-outline" size={18} color="var(--primary, #2563EB)" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text, #0f172a)" }}>
                        Scratch Cards
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted, #94a3b8)" }}>
                        Milestone vouchers &amp; coupons
                      </div>
                    </div>
                  </Link>

                  <Link
                    href="/referrals"
                    onClick={() => setMenuOpen(false)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <Ionicons name="people-outline" size={18} color="#F59E0B" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text, #0f172a)" }}>
                        Refer &amp; Earn
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted, #94a3b8)" }}>
                        Gold VIP cards &amp; invite tracking
                      </div>
                    </div>
                  </Link>

                  <Link
                    href="/settings"
                    onClick={() => setMenuOpen(false)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <Ionicons name="settings-outline" size={18} color="var(--text-muted, #64748b)" />
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text, #0f172a)" }}>
                      Settings
                    </div>
                  </Link>
                </div>
              )}
            </div>

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

            {/* Mobile External Section Label */}
            <div className={styles.mobileSectionHeading}>Account Details</div>

            {/* Account Information Card */}
            <div className={styles.infoCard}>
              <div className={`${styles.sectionHeader} ${styles.desktopOnlyHeader}`}>
                <span className={styles.sectionTitle}>Account Details</span>
              </div>

              {/* Display Name Edit Row */}
              <div className={styles.fieldItem}>
                {isEditingName ? (
                  <div className={styles.fieldEditContainer}>
                    <span className={styles.fieldLabel}>Display Name</span>
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveName();
                        if (e.key === "Escape") {
                          setNameInput(displayNameState);
                          setIsEditingName(false);
                        }
                      }}
                      placeholder="Your full name"
                      maxLength={40}
                      className={styles.fieldInput}
                      autoFocus
                    />
                    <div className={styles.fieldInputActions}>
                      <button
                        type="button"
                        onClick={() => {
                          setNameInput(displayNameState);
                          setIsEditingName(false);
                        }}
                        className={styles.fieldCancelBtn}
                        disabled={savingName}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveName}
                        className={styles.fieldSaveBtn}
                        disabled={savingName || !nameInput.trim()}
                      >
                        {savingName ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.compactFieldRow}>
                    <span className={styles.fieldLabel}>Display Name</span>
                    <div className={styles.compactFieldRight}>
                      <span className={styles.fieldValue}>{displayNameState}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setNameInput(displayNameState);
                          setIsEditingName(true);
                        }}
                        className={styles.fieldEditBtn}
                        aria-label="Edit display name"
                      >
                        <Ionicons name="pencil-outline" size={12} />
                        <span>Edit</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Username Row */}
              <div className={styles.fieldItem}>
                {isEditingUsername ? (
                  <div className={styles.fieldEditContainer}>
                    <span className={styles.fieldLabel}>Username</span>
                    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                      <span
                        style={{
                          position: "absolute",
                          left: "12px",
                          color: "var(--text-muted)",
                          fontSize: "var(--fs-base)",
                          pointerEvents: "none",
                        }}
                      >
                        @
                      </span>
                      <input
                        type="text"
                        value={usernameInput}
                        onChange={(e) => {
                          const sanitized = sanitizeUsername(e.target.value);
                          setUsernameInput(sanitized);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (availabilityStatus.available || availabilityStatus.isCurrent)) {
                            handleSaveUsername();
                          }
                          if (e.key === "Escape") {
                            setUsernameInput(usernameState);
                            setIsEditingUsername(false);
                          }
                        }}
                        placeholder="username"
                        maxLength={20}
                        className={styles.fieldInput}
                        style={{
                          paddingLeft: "28px",
                          paddingRight: "36px",
                          borderColor:
                            availabilityStatus.checked && !availabilityStatus.available
                              ? "var(--danger)"
                              : availabilityStatus.checked &&
                                availabilityStatus.available &&
                                !availabilityStatus.isCurrent
                              ? "var(--safe)"
                              : undefined,
                        }}
                        autoFocus
                      />
                      <div
                        style={{
                          position: "absolute",
                          right: "12px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {checkingAvailability ? (
                          <span
                            style={{
                              width: "14px",
                              height: "14px",
                              border: "2px solid var(--surface-border)",
                              borderTopColor: "var(--primary)",
                              borderRadius: "50%",
                              display: "inline-block",
                              animation: "spin 0.8s linear infinite",
                            }}
                          />
                        ) : availabilityStatus.checked ? (
                          availabilityStatus.available ? (
                            <Ionicons
                              name="checkmark-circle"
                              size={18}
                              color="var(--safe)"
                            />
                          ) : (
                            <Ionicons
                              name="close-circle"
                              size={18}
                              color="var(--danger)"
                            />
                          )
                        ) : null}
                      </div>
                    </div>

                    {/* Live Availability / Validation Message */}
                    <div style={{ marginTop: "6px" }} aria-live="polite">
                      {checkingAvailability ? (
                        <p style={{ color: "var(--text-muted)", fontSize: "var(--fs-xs)", margin: 0 }}>
                          Checking availability...
                        </p>
                      ) : availabilityStatus.checked ? (
                        availabilityStatus.available ? (
                          <p
                            style={{
                              color: availabilityStatus.isCurrent
                                ? "var(--text-muted)"
                                : "var(--safe)",
                              fontSize: "var(--fs-sm)",
                              margin: 0,
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              fontWeight: 600,
                            }}
                          >
                            <Ionicons
                              name={
                                availabilityStatus.isCurrent
                                  ? "information-circle-outline"
                                  : "checkmark"
                              }
                              size={14}
                            />
                            {availabilityStatus.message || "Username is available"}
                          </p>
                        ) : (
                          <p
                            style={{
                              color: "var(--danger)",
                              fontSize: "var(--fs-sm)",
                              margin: 0,
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              fontWeight: 600,
                            }}
                          >
                            <Ionicons name="close" size={14} />
                            {availabilityStatus.error || "This username is taken"}
                          </p>
                        )
                      ) : null}
                    </div>

                    {/* On-Demand Username Rules Box (Visible only while editing username) */}
                    <div className={styles.inlineUsernameRulesBox}>
                      <span className={styles.inlineRulesTitle}>Username Rules</span>
                      <ul className={styles.inlineRulesList}>
                        <li>3–20 lowercase letters, numbers, underscores, or periods</li>
                        <li>Can be changed once every 15 days</li>
                        <li>Past handles stay permanently reserved to your account</li>
                      </ul>
                    </div>

                    {/* Past handles list if any */}
                    {pastUsernames && pastUsernames.length > 0 && (
                      <div
                        style={{
                          marginTop: "6px",
                          fontSize: "var(--fs-xs)",
                          color: "var(--text-muted)",
                          lineHeight: "1.4",
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>Your past handles: </span>
                        {pastUsernames.map((u, i) => (
                          <span
                            key={u}
                            style={{
                              fontFamily: "monospace",
                              color: "var(--text-secondary)",
                            }}
                          >
                            @{u}
                            {i < pastUsernames.length - 1 ? ", " : ""}
                          </span>
                        ))}
                        <span style={{ marginLeft: "4px", opacity: 0.8 }}>
                          (permanently reserved to you)
                        </span>
                      </div>
                    )}

                    <div className={styles.fieldInputActions}>
                      <button
                        type="button"
                        onClick={() => {
                          setUsernameInput(usernameState);
                          setIsEditingUsername(false);
                        }}
                        className={styles.fieldCancelBtn}
                        disabled={savingUsername}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveUsername}
                        className={styles.fieldSaveBtn}
                        disabled={
                          savingUsername ||
                          checkingAvailability ||
                          !usernameInput.trim() ||
                          (!availabilityStatus.available && !availabilityStatus.isCurrent)
                        }
                      >
                        {savingUsername ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.compactFieldWrap}>
                    <div className={styles.compactFieldRow}>
                      <span className={styles.fieldLabel}>Username</span>
                      <div className={styles.compactFieldRight}>
                        <span className={styles.fieldValue}>
                          {usernameState ? `@${usernameState}` : "Not set"}
                        </span>
                        {canChangeUsername ? (
                          <button
                            type="button"
                            onClick={() => {
                              setUsernameInput(usernameState);
                              setIsEditingUsername(true);
                            }}
                            className={styles.fieldEditBtn}
                            aria-label="Edit username"
                          >
                            <Ionicons name="pencil-outline" size={12} />
                            <span>{usernameState ? "Edit" : "Set"}</span>
                          </button>
                        ) : (
                          <span className={styles.cooldownPill}>
                            <Ionicons name="time-outline" size={11} />
                            <span>{cooldownDays}d left</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className={styles.usernameSubMetaRow}>
                      {canChangeUsername ? (
                        <span className={styles.usernameSubStatus}>
                          Ready to change (15-day cooldown rule)
                        </span>
                      ) : (
                        <span className={styles.usernameSubStatusWarning}>
                          Can change again in {cooldownDays} day{cooldownDays === 1 ? "" : "s"} (15d rule)
                        </span>
                      )}

                      {pastUsernames && pastUsernames.length > 0 && (
                        <span className={styles.pastHandlesCompact}>
                          Past: {pastUsernames.map((u) => `@${u}`).join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Email Row */}
              <div className={styles.fieldItem}>
                <div className={styles.compactFieldRow}>
                  <span className={styles.fieldLabel}>Email</span>
                  <div className={styles.compactFieldRight}>
                    <span className={styles.fieldValue}>{user.email}</span>
                    {Boolean(user.email_confirmed_at || (user as any).confirmed_at) ? (
                      <span className={styles.verifiedBadge}>
                        <Ionicons name="checkmark-circle" size={12} color="var(--safe)" />
                        <span className={styles.badgeTextDesktop}>Verified</span>
                      </span>
                    ) : (
                      <div className={styles.unverifiedBadgeRow}>
                        <button
                          type="button"
                          onClick={handleResendVerification}
                          disabled={resendingVerification}
                          className={styles.resendBtn}
                          aria-label="Resend verification email"
                        >
                          {resendingVerification ? "Sending..." : "Verify"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: Appearance & Quick Actions ── */}
          <div className={styles.profileRightCol}>
            {/* Desktop-Only Appearance Theme Card */}
            <div className={`${styles.infoCard} ${styles.desktopThemeCard}`}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>Appearance & Theme</span>
              </div>
              <div className={styles.themeGrid}>
                <button
                  type="button"
                  onClick={() => setThemeMode("system")}
                  className={`${styles.themeCardBtn} ${themeMode === "system" ? styles.themeCardBtnActive : ""}`}
                  aria-pressed={themeMode === "system"}
                >
                  <Ionicons name="phone-portrait-outline" size={17} />
                  <span>System</span>
                </button>

                <button
                  type="button"
                  onClick={() => setThemeMode("light")}
                  className={`${styles.themeCardBtn} ${themeMode === "light" ? styles.themeCardBtnActive : ""}`}
                  aria-pressed={themeMode === "light"}
                >
                  <Ionicons name="sunny-outline" size={17} />
                  <span>Light</span>
                </button>

                <button
                  type="button"
                  onClick={() => setThemeMode("dark")}
                  className={`${styles.themeCardBtn} ${themeMode === "dark" ? styles.themeCardBtnActive : ""}`}
                  aria-pressed={themeMode === "dark"}
                >
                  <Ionicons name="moon-outline" size={17} />
                  <span>Dark</span>
                </button>
              </div>
            </div>

            {/* Mobile External Section Label */}
            <div className={styles.mobileSectionHeading}>Preferences & Shortcuts</div>

            {/* Quick Actions + Mobile Inline Theme Group */}
            <div className={styles.actionsGroup}>
              {/* Mobile-Only Inline Segmented Theme Control Row */}
              <div className={styles.mobileThemeRow}>
                <div className={styles.mobileThemeLeft}>
                  <div className={styles.actionIcon}>
                    <Ionicons name="color-palette-outline" size={18} />
                  </div>
                  <span className={styles.actionLabel}>Theme</span>
                </div>
                <div className={styles.segmentedThemeControl} role="group" aria-label="Theme selection">
                  <button
                    type="button"
                    onClick={() => setThemeMode("light")}
                    className={`${styles.segmentedThemeBtn} ${
                      themeMode === "light" ? styles.segmentedThemeBtnActive : ""
                    }`}
                    aria-pressed={themeMode === "light"}
                  >
                    <Ionicons name="sunny-outline" size={13} />
                    <span>Light</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setThemeMode("dark")}
                    className={`${styles.segmentedThemeBtn} ${
                      themeMode === "dark" ? styles.segmentedThemeBtnActive : ""
                    }`}
                    aria-pressed={themeMode === "dark"}
                  >
                    <Ionicons name="moon-outline" size={13} />
                    <span>Dark</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setThemeMode("system")}
                    className={`${styles.segmentedThemeBtn} ${
                      themeMode === "system" ? styles.segmentedThemeBtnActive : ""
                    }`}
                    aria-pressed={themeMode === "system"}
                  >
                    <Ionicons name="phone-portrait-outline" size={13} />
                    <span>Auto</span>
                  </button>
                </div>
              </div>

              {/* Scan History */}
              <Link href="/history" className={styles.actionItem}>
                <div className={styles.actionIcon}>
                  <Ionicons name="time-outline" size={18} />
                </div>
                <div className={styles.actionTextCol}>
                  <span className={styles.actionLabel}>Scan History</span>
                  <span className={styles.actionSub}>Review, search or delete your scans</span>
                </div>
                <Ionicons name="chevron-forward" size={16} color="var(--text-muted)" />
              </Link>

              {/* Scratch Cards */}
              <Link href="/rewards" className={styles.actionItem}>
                <div className={styles.actionIcon}>
                  <Ionicons name="gift-outline" size={18} />
                </div>
                <div className={styles.actionTextCol}>
                  <span className={styles.actionLabel}>Scratch Cards</span>
                  <span className={styles.actionSub}>Daily scan milestone vouchers &amp; coupons</span>
                </div>
                <Ionicons name="chevron-forward" size={16} color="var(--text-muted)" />
              </Link>

              {/* Refer & Earn */}
              <Link href="/referrals" className={styles.actionItem}>
                <div className={styles.actionIcon}>
                  <Ionicons name="people-outline" size={18} />
                </div>
                <div className={styles.actionTextCol}>
                  <span className={styles.actionLabel}>Refer &amp; Earn</span>
                  <span className={styles.actionSub}>Invite friends, give Silver &amp; earn Gold VIP cards</span>
                </div>
                <Ionicons name="chevron-forward" size={16} color="var(--text-muted)" />
              </Link>

              {/* Settings & Preferences */}
              <Link href="/settings" className={styles.actionItem}>
                <div className={styles.actionIcon}>
                  <Ionicons name="settings-outline" size={18} />
                </div>
                <div className={styles.actionTextCol}>
                  <span className={styles.actionLabel}>Settings & Preferences</span>
                  <span className={styles.actionSub}>Account management, legal policies & guide</span>
                </div>
                <Ionicons name="chevron-forward" size={16} color="var(--text-muted)" />
              </Link>

              {/* Support & Feedback */}
              <Link href="/feedback" className={styles.actionItem}>
                <div className={styles.actionIcon}>
                  <Ionicons name="chatbubble-outline" size={18} />
                </div>
                <div className={styles.actionTextCol}>
                  <span className={styles.actionLabel}>Support & Feedback</span>
                  <span className={styles.actionSub}>Report bugs or request new features</span>
                </div>
                <Ionicons name="chevron-forward" size={16} color="var(--text-muted)" />
              </Link>

              {/* Clear Local Cache */}
              <button
                type="button"
                onClick={handleClearData}
                disabled={clearingData}
                className={`${styles.actionItem} ${styles.actionItemDanger}`}
              >
                <div className={`${styles.actionIcon} ${styles.actionIconDanger}`}>
                  <Ionicons name="trash-outline" size={18} />
                </div>
                <div className={styles.actionTextCol}>
                  <span className={`${styles.actionLabel} ${styles.actionLabelDanger}`}>
                    {clearingData ? "Clearing Data..." : "Clear Local History"}
                  </span>
                  <span className={styles.actionSub}>Wipe cached scans from this device</span>
                </div>
                <Ionicons name="chevron-forward" size={16} color="var(--text-muted)" />
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
