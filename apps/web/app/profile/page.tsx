"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ionicons } from "@/lib/mobile-icons";
import { useAuth } from "@/lib/auth-context";
import { useAvatar, isUserUploadedPhoto } from "@/lib/avatar-context";
import { getWebSupabase, isWebSupabaseConfigured } from "@/lib/supabase";
import { sanitizeUsername } from "@shared/utils/username-rules";
import { syncStructuredUserProfile } from "@/lib/user-account";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import ProfileLoading from "./loading";
import styles from "./profile.module.css";

function ProfileContent() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const { cachedUrl, avatarUrl, uploadAvatar, removeAvatar, uploading } = useAvatar();

  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Derive identity fields
  const displayName = useMemo(() => {
    return (
      user?.user_metadata?.display_name ||
      user?.user_metadata?.full_name ||
      user?.email?.split("@")[0] ||
      "User"
    );
  }, [user]);

  const rawUsername = useMemo(() => {
    return sanitizeUsername(
      user?.user_metadata?.username ||
      user?.email?.split("@")[0] ||
      user?.user_metadata?.user_name ||
      ""
    );
  }, [user]);

  const [usernameState, setUsernameState] = useState(rawUsername);
  const [userStats, setUserStats] = useState<{
    scanCount: number;
    commentCount: number;
    memberSince: string | null;
  }>({ scanCount: 0, commentCount: 0, memberSince: null });

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2600);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // Sync user state on update
  useEffect(() => {
    if (user) {
      const uName = sanitizeUsername(
        user?.user_metadata?.username ||
        user?.email?.split("@")[0] ||
        user?.user_metadata?.user_name ||
        ""
      );
      setUsernameState(uName);

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

  // Query Supabase for real live stats
  useEffect(() => {
    if (user?.id && isWebSupabaseConfigured()) {
      const supabase = getWebSupabase();
      Promise.all([
        supabase
          .from("users")
          .select("username, scan_count, comment_count, created_at")
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
            setUsernameState(sanitizeUsername(data.username));
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
              displayName,
              username: usernameState,
              emailVerified: Boolean(user.email_confirmed_at),
              scanCount: scans,
              commentCount: comments,
            });
          }
        })
        .catch(() => {});

      // Fallback local scan history count
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
  }, [user?.id, displayName, usernameState]);

  // Avatar resolution
  const [localCustom, setLocalCustom] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && user?.id) {
      try {
        const stored =
          localStorage.getItem(`user_custom_avatar_${user.id}`) ||
          localStorage.getItem(`user_avatar_${user.id}`);
        setLocalCustom(stored);
      } catch {}
    }
  }, [user?.id]);

  const photoURL = useMemo(() => {
    return (
      (cachedUrl && isUserUploadedPhoto(cachedUrl) ? cachedUrl : null) ||
      (avatarUrl && isUserUploadedPhoto(avatarUrl) ? avatarUrl : null) ||
      (localCustom && isUserUploadedPhoto(localCustom) ? localCustom : null) ||
      user?.user_metadata?.custom_avatar_url ||
      cachedUrl ||
      avatarUrl ||
      localCustom ||
      user?.user_metadata?.avatar_url ||
      user?.user_metadata?.picture ||
      user?.user_metadata?.photo_url ||
      null
    );
  }, [cachedUrl, avatarUrl, localCustom, user]);

  const initials = useMemo(() => {
    return (
      displayName
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((p: string) => p.charAt(0).toUpperCase())
        .join("") || "?"
    );
  }, [displayName]);

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
        showToast("Profile photo updated");
      } catch {
        showToast("Failed to upload photo");
      }
    }
    if (e.target) e.target.value = "";
  };

  const handleRemovePhoto = async () => {
    setPhotoModalOpen(false);
    try {
      await removeAvatar();
      showToast("Profile photo removed");
    } catch {
      showToast("Could not remove photo");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace("/");
    } catch {
      showToast("Could not sign out");
    }
  };

  if (authLoading) {
    return <ProfileLoading />;
  }

  // ── GUEST / UNAUTHENTICATED STATE ──
  if (!user) {
    return (
      <main className={styles.container}>
        <div className={styles.inner}>
          <header className={styles.topBar}>
            <h1 className={styles.pageTitle}>Profile</h1>
            <div className={styles.headerActions}>
              <Link
                href="/settings"
                className={styles.iconBtn}
                aria-label="Settings"
                title="Settings"
              >
                <Ionicons name="settings-outline" size={18} />
              </Link>
            </div>
          </header>

          <div className={styles.guestCard}>
            <div className={styles.guestIconWrap}>
              <Ionicons name="person-outline" size={26} />
            </div>
            <h2 className={styles.guestTitle}>Sign in to BinRo</h2>
            <p className={styles.guestDesc}>
              Access your verified scan history, manage your identity, and contribute
              to community QR safety ratings.
            </p>

            <div className={styles.guestActions}>
              <Link
                href="/login?returnUrl=/profile"
                className={styles.guestPrimaryBtn}
              >
                Sign In
              </Link>
              <Link
                href="/register?returnUrl=/profile"
                className={styles.guestSecondaryBtn}
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

  // ── AUTHENTICATED PROFILE VIEW ──
  const isEmailVerified = Boolean(user.email_confirmed_at || (user as any).confirmed_at);

  return (
    <main className={styles.container}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        style={{ display: "none" }}
      />

      {/* Toast Feedback */}
      {toastMessage && (
        <div className={styles.toastPill} role="status" aria-live="polite">
          <Ionicons name="checkmark-circle" size={16} color="var(--primary)" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Photo Picker Modal */}
      {photoModalOpen && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="photo-modal-title"
          onClick={() => setPhotoModalOpen(false)}
        >
          <div
            className={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="photo-modal-title" className={styles.modalTitle}>
              Profile Photo
            </h3>

            <button
              type="button"
              onClick={handlePickPhoto}
              className={styles.modalOptionBtn}
            >
              <Ionicons name="camera-outline" size={18} color="var(--primary)" />
              <span>Upload Photo</span>
            </button>

            {photoURL && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className={`${styles.modalOptionBtn} ${styles.modalOptionDanger}`}
              >
                <Ionicons name="trash-outline" size={18} color="var(--danger)" />
                <span>Remove Current Photo</span>
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

      <div className={styles.inner}>
        {/* Top Header Bar */}
        <header className={styles.topBar}>
          <h1 className={styles.pageTitle}>Profile</h1>
          <div className={styles.headerActions}>
            <Link
              href="/settings"
              className={styles.iconBtn}
              aria-label="Settings"
              title="Settings"
            >
              <Ionicons name="settings-outline" size={18} />
            </Link>
          </div>
        </header>

        {/* ── Responsive Desktop / Tablet / Mobile Container ── */}
        <div className={styles.desktopLayout}>
          {/* Left Column (Sticky Sidebar on Desktop) */}
          <aside className={styles.sidebarCol}>
            {/* Identity Hero Card */}
            <section className={styles.heroCard} aria-label="User profile overview">
              <div className={styles.avatarContainer}>
                <button
                  type="button"
                  onClick={() => setPhotoModalOpen(true)}
                  className={styles.avatarPressable}
                  aria-label="Change profile photo"
                  title="Change profile photo"
                >
                  <div className={styles.avatarRing}>
                    <div className={styles.avatarInner}>
                      {uploading ? (
                        <div
                          style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            border: "2.5px solid var(--primary-dim)",
                            borderTopColor: "var(--primary)",
                            animation: "spin 0.8s linear infinite",
                          }}
                        />
                      ) : photoURL && !photoError ? (
                        <img
                          src={photoURL}
                          alt={displayName}
                          referrerPolicy="no-referrer"
                          onError={() => setPhotoError(true)}
                          className={styles.avatarPhoto}
                        />
                      ) : (
                        <span className={styles.avatarInitials}>{initials}</span>
                      )}
                    </div>
                  </div>
                  <span className={styles.avatarBadgeBtn} aria-hidden="true">
                    <Ionicons name="camera-outline" size={14} />
                  </span>
                </button>
              </div>

              <div className={styles.identityMeta}>
                <h2 className={styles.displayName}>{displayName}</h2>
                <div className={styles.identitySubRow}>
                  {usernameState && (
                    <span className={styles.usernameText}>@{usernameState}</span>
                  )}
                  {usernameState && userStats.memberSince && (
                    <span className={styles.dotDivider} aria-hidden="true">·</span>
                  )}
                  {userStats.memberSince && (
                    <span className={styles.memberSinceText}>
                      Joined {userStats.memberSince}
                    </span>
                  )}
                </div>

              </div>

              {/* Account Quick Action */}
              <div className={styles.heroActions}>
                <Link
                  href="/settings/account-details"
                  className={styles.heroActionBtn}
                >
                  <Ionicons name="create-outline" size={14} />
                  <span>Edit Profile</span>
                </Link>
              </div>
            </section>
          </aside>

          {/* Right Column (Management Sections) */}
          <section className={styles.mainCol}>
            {/* Account & Identity Section */}
            <div className={styles.section} aria-label="Account management">
              <div className={styles.sectionHeader}>
                <span className={styles.sectionLabel}>Account &amp; Activity</span>
              </div>

              <div className={styles.cardGroup}>
                {/* Account Details */}
                <Link href="/settings/account-details" className={styles.menuItem}>
                  <div className={styles.menuIconWrap}>
                    <Ionicons name="person-circle-outline" size={20} />
                  </div>
                  <div className={styles.menuTextCol}>
                    <span className={styles.menuLabel}>Account Details</span>
                    <span className={styles.menuSublabel}>
                      Display name, @username, and email
                    </span>
                  </div>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color="var(--text-muted)"
                  />
                </Link>

                <div className={styles.divider} />

                {/* Scan History */}
                <Link href="/history" className={styles.menuItem}>
                  <div className={styles.menuIconWrap}>
                    <Ionicons name="time-outline" size={19} />
                  </div>
                  <div className={styles.menuTextCol}>
                    <span className={styles.menuLabel}>Scan History</span>
                    <span className={styles.menuSublabel}>
                      Past security scans, safety verdicts, and logs
                    </span>
                  </div>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color="var(--text-muted)"
                  />
                </Link>
              </div>
            </div>


            {/* Community & Rewards Section */}
            <div className={styles.section} aria-label="Community and rewards">
              <div className={styles.sectionHeader}>
                <span className={styles.sectionLabel}>Community &amp; Rewards</span>
              </div>

              <div className={styles.cardGroup}>
                {/* Rewards */}
                <Link href="/rewards" className={styles.menuItem}>
                  <div className={styles.menuIconWrap}>
                    <Ionicons name="gift-outline" size={19} />
                  </div>
                  <div className={styles.menuTextCol}>
                    <span className={styles.menuLabel}>Milestones &amp; Rewards</span>
                    <span className={styles.menuSublabel}>
                      Daily scan milestones and community incentives
                    </span>
                  </div>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color="var(--text-muted)"
                  />
                </Link>

                <div className={styles.divider} />

                {/* Referrals */}
                <Link href="/referrals" className={styles.menuItem}>
                  <div className={styles.menuIconWrap}>
                    <Ionicons name="people-outline" size={19} />
                  </div>
                  <div className={styles.menuTextCol}>
                    <span className={styles.menuLabel}>Refer &amp; Earn</span>
                    <span className={styles.menuSublabel}>
                      Invite friends and earn Gold VIP rewards
                    </span>
                  </div>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color="var(--text-muted)"
                  />
                </Link>
              </div>
            </div>

            {/* Sign Out Action */}
            <button
              type="button"
              onClick={handleSignOut}
              className={styles.signOutBtn}
            >
              <Ionicons name="log-out-outline" size={16} />
              <span>Sign Out</span>
            </button>
          </section>
        </div>
      </div>

      <BottomTabBar activeTab="profile" />
    </main>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileLoading />}>
      <ProfileContent />
    </Suspense>
  );
}
