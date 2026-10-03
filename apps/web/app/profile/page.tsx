"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ionicons } from "@/lib/mobile-icons";
import { useAuth } from "@/lib/auth-context";
import { useAvatar, isUserUploadedPhoto } from "@/lib/avatar-context";
import { useTheme } from "@/lib/theme-context";
import { getWebSupabase, isWebSupabaseConfigured } from "@/lib/supabase";
import { clearAllUserScans } from "@/lib/scan-history";
import { sanitizeTextInput, isValidUsername } from "@/lib/web-security";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
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

  const initialUsername =
    user?.user_metadata?.username ||
    user?.user_metadata?.user_name ||
    user?.email?.split("@")[0] ||
    "";

  // Editable states
  const [displayNameState, setDisplayNameState] = useState(initialDisplayName);
  const [usernameState, setUsernameState] = useState(initialUsername);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [nameInput, setNameInput] = useState(initialDisplayName);
  const [usernameInput, setUsernameInput] = useState(initialUsername);
  const [savingName, setSavingName] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [clearingData, setClearingData] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Sync state if user metadata updates
  useEffect(() => {
    if (user) {
      const name =
        user?.user_metadata?.display_name ||
        user?.user_metadata?.full_name ||
        user?.email?.split("@")[0] ||
        "User";
      const uName =
        user?.user_metadata?.username ||
        user?.user_metadata?.user_name ||
        user?.email?.split("@")[0] ||
        "";
      setDisplayNameState(name);
      setNameInput(name);
      setUsernameState(uName);
      setUsernameInput(uName);
    }
  }, [user]);

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

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
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
          await supabase
            .from("users")
            .upsert({ id: user.id, display_name: trimmed, updated_at: new Date().toISOString() });
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
    const trimmed = sanitizeTextInput(usernameInput.trim().toLowerCase(), 20);
    if (!trimmed || !isValidUsername(trimmed)) {
      showToast("Username must be 3-20 letters/numbers/underscores.", "error");
      return;
    }
    setSavingUsername(true);
    try {
      setUsernameState(trimmed);
      setIsEditingUsername(false);
      if (isWebSupabaseConfigured()) {
        const supabase = getWebSupabase();
        await supabase.auth.updateUser({ data: { username: trimmed, user_name: trimmed } });
        if (user?.id) {
          await supabase
            .from("users")
            .upsert({ id: user.id, username: trimmed, updated_at: new Date().toISOString() });
        }
      }
      showToast("Username updated.");
    } catch {
      showToast("Failed to save username.", "error");
    } finally {
      setSavingUsername(false);
    }
  };

  const handleClearData = async () => {
    setClearingData(true);
    try {
      await clearAllUserScans(user?.id);
      showToast("Local scan history cleared from device.");
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
        </div>
      </main>
    );
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
        {/* Top Bar with Settings access */}
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
          <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
            {/* Avatar & User Header Card */}
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

              {usernameState && (
                <p className={styles.usernameText}>@{usernameState}</p>
              )}
            </section>

            {/* Account Information Card */}
            <div className={styles.infoCard}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>Account Details</span>
              </div>

              {/* Email Row */}
              <div className={styles.fieldItem}>
                <span className={styles.fieldLabel}>Email Address</span>
                <div className={styles.fieldValueRow}>
                  <span className={styles.fieldValue}>{user.email}</span>
                  <span className={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={12} color="var(--safe)" />
                    <span>Verified</span>
                  </span>
                </div>
              </div>

              {/* Display Name Edit Row */}
              <div className={styles.fieldItem}>
                <span className={styles.fieldLabel}>Display Name</span>
                {isEditingName ? (
                  <div>
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
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
                  <div className={styles.fieldValueRow}>
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
                )}
              </div>

              {/* Username Edit Row */}
              <div className={styles.fieldItem}>
                <span className={styles.fieldLabel}>Username</span>
                {isEditingUsername ? (
                  <div>
                    <input
                      type="text"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value.toLowerCase())}
                      placeholder="username"
                      maxLength={20}
                      className={styles.fieldInput}
                      autoFocus
                    />
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
                        disabled={savingUsername || !usernameInput.trim()}
                      >
                        {savingUsername ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.fieldValueRow}>
                    <span className={styles.fieldValue}>
                      {usernameState ? `@${usernameState}` : "Not set"}
                    </span>
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
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: Appearance & Quick Actions ── */}
          <div className={styles.profileRightCol}>
            {/* Appearance Theme Card */}
            <div className={styles.infoCard} style={{ marginTop: 0 }}>
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

            {/* Quick Actions Group */}
            <div className={styles.actionsGroup}>
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
                    {clearingData ? "Clearing Data..." : "Clear Local Data"}
                  </span>
                  <span className={styles.actionSub}>Wipe cached scans from this device</span>
                </div>
                <Ionicons name="chevron-forward" size={16} color="var(--text-muted)" />
              </button>

              {/* Full Settings */}
              <Link href="/settings" className={styles.actionItem}>
                <div className={styles.actionIcon}>
                  <Ionicons name="settings-outline" size={18} />
                </div>
                <div className={styles.actionTextCol}>
                  <span className={styles.actionLabel}>Full Settings</span>
                  <span className={styles.actionSub}>Account management, legal policies & guide</span>
                </div>
                <Ionicons name="chevron-forward" size={16} color="var(--text-muted)" />
              </Link>
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

      <BottomTabBar activeTab="profile" />
    </main>
  );
}
