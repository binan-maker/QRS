"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ionicons } from "@/lib/mobile-icons";
import { useAuth } from "@/lib/auth-context";
import { useAvatar, isUserUploadedPhoto } from "@/lib/avatar-context";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import styles from "./profile.module.css";

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const { cachedUrl, avatarUrl, uploadAvatar, removeAvatar, uploading } = useAvatar();

  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Derive identity fields (1:1 with features/profile/hooks/useProfile.ts)
  const displayName =
    user?.user_metadata?.display_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "User";

  const username =
    user?.user_metadata?.username ||
    user?.user_metadata?.user_name ||
    user?.email?.split("@")[0] ||
    "";

  const initials =
    displayName
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
    user?.user_metadata?.photoURL ||
    null;

  // Reset photo error when photoURL changes
  useEffect(() => {
    setPhotoError(false);
  }, [photoURL]);

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
      } catch (err) {
        console.error("[profile] photo upload failed:", err);
      }
    }
    if (e.target) e.target.value = "";
  };

  const handleRemovePhoto = async () => {
    setPhotoModalOpen(false);
    await removeAvatar();
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  if (loading) {
    return (
      <main className={styles.container}>
        <div className={styles.inner} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              border: "3px solid var(--primary-dim)",
              borderTopColor: "var(--primary)",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </main>
    );
  }

  // ── GUEST VIEW (1:1 with features/profile/components/GuestView.tsx) ──────
  // If user is not signed in: NO settings button or settings access is shown!
  if (!user) {
    return (
      <main className={styles.container}>
        <div className={styles.inner}>
          {/* Top Bar with title only (no settings icon for guests) */}
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

  // ── AUTHENTICATED PROFILE (1:1 with features/profile/ProfileScreen.tsx) ───
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
        {/* Top Bar with Settings access for signed-in users */}
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

        {/* Profile Content Grid for Desktop & Mobile */}
        <div className={styles.profileGrid}>
          {/* Avatar + Identity (1:1 with mobile avatarSection) */}
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
              <div className={styles.cameraBtn}>
                <Ionicons name="camera" size={11} color="var(--primary-text)" />
              </div>
            </button>

            <h2 className={styles.displayName}>{displayName}</h2>

            {username && (
              <p className={styles.usernameText}>@{username}</p>
            )}

            <Link
              href="/settings?section=profile"
              className={styles.editProfileBtn}
            >
              Edit Profile
            </Link>
          </section>

          {/* Right Column: Actions & Sign Out */}
          <div className={styles.profileRightCol}>
            {/* History Action Card (1:1 with mobile profileActions) */}
            <div className={styles.profileActions}>
              <Link
                href="/history"
                className={styles.profileActionBtn}
              >
                <div className={styles.profileActionIcon}>
                  <Ionicons name="time-outline" size={18} color="var(--accent)" />
                </div>
                <div className={styles.profileActionCol}>
                  <span className={styles.profileActionLabel}>History</span>
                  <span className={styles.profileActionSubtext}>Review or remove scans</span>
                </div>
                <Ionicons name="chevron-forward" size={16} color="var(--text-muted)" />
              </Link>
            </div>

            {/* Sign Out Button (1:1 with mobile signOutBtn) */}
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

      {/* Photo Picker Modal (1:1 with mobile PhotoModal) */}
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

      <BottomTabBar activeTab="profile" />
    </main>
  );
}
