"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ionicons } from "@/lib/mobile-icons";
import { useAuth } from "@/lib/auth-context";
import { useAvatar, isUserUploadedPhoto } from "@/lib/avatar-context";
import { UserAvatar } from "@/components/avatar/UserAvatar";
import { deleteUserAccountPermanently } from "@/lib/user-account";
import { getWebSupabase, isWebSupabaseConfigured } from "@/lib/supabase";
import {
  sanitizeUsername,
  validateUsername,
  getRemainingUsernameCooldownDays,
} from "@shared/utils/username-rules";
import {
  checkUsernameAvailability,
  updateUsernamePermanently,
  UsernameAvailabilityResult,
} from "@/lib/username-service";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import AccountDetailsLoading from "./loading";
import styles from "./account-details.module.css";

function sanitizeTextInput(val: string, maxLen = 40): string {
  return val.replace(/[<>'"`;]/g, "").slice(0, maxLen);
}

function AccountDetailsContent() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const { cachedUrl, avatarUrl, uploadAvatar, removeAvatar, uploading } = useAvatar();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const photoURL = React.useMemo(() => {
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

  const handlePickPhoto = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await uploadAvatar(file);
        showToast("Profile photo updated.");
      } catch {
        showToast("Failed to upload photo.", "error");
      }
    }
    if (e.target) e.target.value = "";
  };

  const handleRemovePhoto = async () => {
    try {
      await removeAvatar();
      showToast("Profile photo removed.");
    } catch {
      showToast("Could not remove photo.", "error");
    }
  };

  // Delete Account State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleDeleteAccountConfirm = async () => {
    if (deleteConfirmText.trim() !== "DELETE" || !user?.id || deletingAccount) return;
    setDeletingAccount(true);
    setDeleteError("");
    try {
      await deleteUserAccountPermanently(user.id);
      await signOut().catch(() => {});
      setDeleteModalOpen(false);
      showToast("Account deleted.");
      router.replace("/");
    } catch (err: any) {
      setDeleteError(
        err?.message || "Failed to delete account. Please try again."
      );
    } finally {
      setDeletingAccount(false);
    }
  };

  const [displayNameState, setDisplayNameState] = useState("");
  const [usernameState, setUsernameState] = useState("");
  const [usernameLastChangedAt, setUsernameLastChangedAt] = useState<string | null>(null);
  const [pastUsernames, setPastUsernames] = useState<string[]>([]);

  // Edit Name State
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);

  // Edit Username State
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState<UsernameAvailabilityResult>({
    available: true,
  });

  // Email verification resend state
  const [resendingVerification, setResendingVerification] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 3200);
  };

  // Populate from user metadata initially
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
    }
  }, [user]);

  // Query Supabase users table for fresh info
  useEffect(() => {
    if (!user?.id || !isWebSupabaseConfigured()) return;
    const fetchUserData = async () => {
      try {
        const supabase = getWebSupabase();
        const { data } = await supabase
          .from("users")
          .select("username, username_last_changed_at, past_usernames, display_name")
          .eq("id", user.id)
          .maybeSingle();

        if (data) {
          if (data.username) {
            const clean = sanitizeUsername(data.username);
            setUsernameState(clean);
            setUsernameInput(clean);
          }
          if (data.display_name) {
            setDisplayNameState(data.display_name);
            setNameInput(data.display_name);
          }
          if (data.username_last_changed_at) {
            setUsernameLastChangedAt(data.username_last_changed_at);
          }
          if (Array.isArray(data.past_usernames)) {
            setPastUsernames(data.past_usernames);
          }
        }
      } catch (err) {
        console.warn("[account-details] error fetching user info:", err);
      }
    };
    void fetchUserData();
  }, [user?.id]);

  // Real-time debounced username availability check
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
        message: "Current username.",
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

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/settings");
  };

  const handleSaveName = async () => {
    const trimmed = sanitizeTextInput(nameInput.trim(), 40);
    if (!trimmed) {
      showToast("Display name cannot be empty.", "error");
      return;
    }
    setSavingName(true);
    try {
      setDisplayNameState(trimmed);
      setIsEditingName(false);
      if (isWebSupabaseConfigured()) {
        const supabase = getWebSupabase();
        await supabase.auth.updateUser({
          data: { display_name: trimmed, full_name: trimmed },
        });
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
    } catch (err: any) {
      console.error("[account-details] error updating display name:", err);
      showToast(err?.message || "Failed to update display name.", "error");
    } finally {
      setSavingName(false);
    }
  };

  // Cooldown calculation
  const cooldownDays = usernameLastChangedAt
    ? getRemainingUsernameCooldownDays(usernameLastChangedAt)
    : 0;
  const canChangeUsername = cooldownDays <= 0;

  const handleSaveUsername = async () => {
    const trimmed = sanitizeUsername(usernameInput.trim());
    if (!trimmed) {
      showToast("Username cannot be empty.", "error");
      return;
    }
    if (trimmed.length < 3 || trimmed.length > 20) {
      showToast("Username must be between 3 and 20 characters.", "error");
      return;
    }
    if (usernameState && trimmed.toLowerCase() === usernameState.toLowerCase()) {
      setIsEditingUsername(false);
      return;
    }
    if (!canChangeUsername) {
      showToast(
        `Can change again in ${cooldownDays} day${cooldownDays === 1 ? "" : "s"}.`,
        "error"
      );
      return;
    }

    setSavingUsername(true);
    try {
      const res = await updateUsernamePermanently({
        userId: user!.id,
        newUsername: trimmed,
        oldUsername: usernameState || null,
        lastChangedAt: usernameLastChangedAt,
        existingPastUsernames: pastUsernames,
      });

      setUsernameState(trimmed);
      setUsernameLastChangedAt(res.newChangedAt);
      setPastUsernames(res.pastUsernames);
      setIsEditingUsername(false);
      showToast("Username updated.");
    } catch (err: any) {
      showToast(err?.message || "Failed to update username.", "error");
    } finally {
      setSavingUsername(false);
    }
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
      showToast("Verification email sent.");
    } catch (err: any) {
      showToast(err?.message || "Failed to send verification email.", "error");
    } finally {
      setResendingVerification(false);
    }
  };

  if (loading) {
    return <AccountDetailsLoading />;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GUEST / UNAUTHENTICATED STATE
  // ═══════════════════════════════════════════════════════════════════════════
  if (!user) {
    return (
      <main className={styles.container}>
        <div className={styles.inner}>
          <header className={styles.navBar}>
            <button
              type="button"
              onClick={handleBack}
              className={styles.navBackBtn}
              aria-label="Back"
            >
              <Ionicons name="chevron-back" size={20} />
            </button>
            <h1 className={styles.navTitle}>Account Details</h1>
            <div className={styles.navSpacer} />
          </header>

          <div className={styles.guestContainer}>
            <div className={styles.guestIcon}>
              <Ionicons name="lock-closed-outline" size={32} />
            </div>
            <h2 className={styles.guestTitle}>Sign In Required</h2>
            <p className={styles.guestDesc}>
              Account details are available to registered users.
            </p>
            <Link
              href="/login?returnUrl=/settings/account-details"
              className={styles.guestSignInBtn}
            >
              Sign In
            </Link>
          </div>
        </div>
        <BottomTabBar activeTab="profile" />
      </main>
    );
  }

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

      <div className={styles.inner}>
        {/* Navigation Bar */}
        <header className={styles.navBar}>
          <button
            type="button"
            onClick={handleBack}
            className={styles.navBackBtn}
            aria-label="Back"
          >
            <Ionicons name="chevron-back" size={20} />
          </button>
          <h1 className={styles.navTitle}>Account Details</h1>
          <div className={styles.navSpacer} />
        </header>

        {/* Global Toast */}
        {toast && (
          <div className={toast.type === "error" ? styles.toastError : styles.toastSuccess}>
            <Ionicons
              name={toast.type === "error" ? "alert-circle" : "checkmark-circle"}
              size={16}
            />
            <span>{toast.message}</span>
          </div>
        )}

        {/* ── Clean Unified Account Details Card ── */}
        <div className={styles.card}>
          {/* ── Row 0: Profile Photo ── */}
          <div className={styles.avatarSection}>
            <div className={styles.avatarLeft}>
              <div className={styles.avatarWrapper}>
                <UserAvatar
                  src={photoURL}
                  name={displayNameState || "User"}
                  size={52}
                  showRing={true}
                />
              </div>
              <div className={styles.avatarMeta}>
                <h3 className={styles.avatarTitle}>Profile Photo</h3>
                <p className={styles.avatarSubtext}>
                  {uploading ? "Uploading..." : "JPG, PNG or WebP image"}
                </p>
              </div>
            </div>
            <div className={styles.avatarActions}>
              <button
                type="button"
                onClick={handlePickPhoto}
                disabled={uploading}
                className={styles.avatarChangeBtn}
              >
                <Ionicons name="camera-outline" size={14} />
                <span>{photoURL ? "Change" : "Upload"}</span>
              </button>
              {photoURL && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  disabled={uploading}
                  className={styles.avatarRemoveBtn}
                  aria-label="Remove profile photo"
                  title="Remove photo"
                >
                  <Ionicons name="trash-outline" size={15} />
                </button>
              )}
            </div>
          </div>

          <div className={styles.divider} />

          {/* ── Row 1: Display Name ── */}
          {isEditingName ? (
            <div className={styles.editContainer}>
              <div className={styles.editHeader}>
                <span className={styles.label}>Display Name</span>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  {nameInput.length}/40
                </span>
              </div>
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
                placeholder="Full name"
                maxLength={40}
                className={styles.input}
                autoFocus
              />
              <div className={styles.editActions}>
                <button
                  type="button"
                  onClick={() => {
                    setNameInput(displayNameState);
                    setIsEditingName(false);
                  }}
                  className={styles.cancelBtn}
                  disabled={savingName}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveName}
                  className={styles.saveBtn}
                  disabled={savingName || !nameInput.trim()}
                >
                  {savingName ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.row}>
              <div className={styles.rowMain}>
                <span className={styles.label}>Display Name</span>
                <span className={styles.value}>{displayNameState}</span>
              </div>
              <div className={styles.rowAction}>
                <button
                  type="button"
                  onClick={() => {
                    setNameInput(displayNameState);
                    setIsEditingName(true);
                  }}
                  className={styles.actionBtn}
                >
                  Edit
                </button>
              </div>
            </div>
          )}

          <div className={styles.divider} />

          {/* ── Row 2: Username ── */}
          {isEditingUsername ? (
            <div className={styles.editContainer}>
              <div className={styles.editHeader}>
                <span className={styles.label}>Username</span>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  {usernameInput.length}/20
                </span>
              </div>
              <div className={styles.inputWrapper}>
                <span className={styles.inputPrefix}>@</span>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => {
                    const sanitized = sanitizeUsername(e.target.value);
                    setUsernameInput(sanitized);
                  }}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      (availabilityStatus.available || availabilityStatus.isCurrent)
                    ) {
                      handleSaveUsername();
                    }
                    if (e.key === "Escape") {
                      setUsernameInput(usernameState);
                      setIsEditingUsername(false);
                    }
                  }}
                  placeholder="username"
                  maxLength={20}
                  className={`${styles.input} ${styles.inputWithPrefix}`}
                  autoFocus
                />
              </div>

              {/* Status Message */}
              {checkingAvailability ? (
                <p className={styles.editFeedback} style={{ color: "var(--text-muted)" }}>
                  Checking availability...
                </p>
              ) : availabilityStatus.checked ? (
                availabilityStatus.available ? (
                  <p
                    className={styles.editFeedback}
                    style={{
                      color: availabilityStatus.isCurrent
                        ? "var(--text-muted)"
                        : "var(--safe)",
                    }}
                  >
                    {availabilityStatus.message || "Available"}
                  </p>
                ) : (
                  <p className={styles.editFeedback} style={{ color: "var(--danger)" }}>
                    {availabilityStatus.error || "Taken"}
                  </p>
                )
              ) : null}

              <div className={styles.editActions}>
                <button
                  type="button"
                  onClick={() => {
                    setUsernameInput(usernameState);
                    setIsEditingUsername(false);
                  }}
                  className={styles.cancelBtn}
                  disabled={savingUsername}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveUsername}
                  className={styles.saveBtn}
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
            <div className={styles.row}>
              <div className={styles.rowMain}>
                <span className={styles.label}>Username</span>
                <span className={styles.value}>
                  {usernameState ? `@${usernameState}` : "Not set"}
                </span>
                {!canChangeUsername && (
                  <span className={styles.subtext}>
                    Can change again in {cooldownDays} day{cooldownDays === 1 ? "" : "s"}
                  </span>
                )}
              </div>
              <div className={styles.rowAction}>
                {canChangeUsername ? (
                  <button
                    type="button"
                    onClick={() => {
                      setUsernameInput(usernameState);
                      setIsEditingUsername(true);
                    }}
                    className={styles.actionBtn}
                  >
                    {usernameState ? "Edit" : "Set"}
                  </button>
                ) : (
                  <span className={styles.lockedText}>
                    <Ionicons name="lock-closed" size={12} />
                    <span>Locked</span>
                  </span>
                )}
              </div>
            </div>
          )}

          <div className={styles.divider} />

          {/* ── Row 3: Email Address ── */}
          <div className={styles.row}>
            <div className={styles.rowMain}>
              <span className={styles.label}>Email</span>
              <span className={styles.value}>{user.email}</span>
              {isEmailVerified ? (
                <span className={styles.statusText}>
                  <Ionicons name="checkmark-circle" size={13} color="var(--safe)" />
                  <span>Verified</span>
                </span>
              ) : (
                <span className={styles.statusTextUnverified}>
                  <Ionicons name="alert-circle-outline" size={13} color="var(--warning)" />
                  <span>Unverified</span>
                </span>
              )}
            </div>
            {!isEmailVerified && (
              <div className={styles.rowAction}>
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendingVerification}
                  className={styles.actionBtn}
                >
                  {resendingVerification ? "Sending..." : "Verify"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Danger Zone (Isolated at bottom) ── */}
        <section className={styles.dangerSection} aria-label="Danger zone">
          <div className={styles.dangerSectionHeader}>
            <span className={styles.dangerSectionLabel}>Danger Zone</span>
          </div>

          <div className={styles.dangerCard}>
            <div className={styles.dangerMeta}>
              <h3 className={styles.dangerTitle}>Delete Account</h3>
              <p className={styles.dangerDesc}>
                Permanently delete your profile, scan history, and all associated account data. This action cannot be undone.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setDeleteModalOpen(true);
                setDeleteConfirmText("");
                setDeleteError("");
              }}
              className={styles.dangerBtn}
            >
              <Ionicons name="alert-circle-outline" size={16} />
              <span>Delete Account</span>
            </button>
          </div>
        </section>
      </div>

      {/* ── Delete Account Confirmation Modal ── */}
      {deleteModalOpen && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
        >
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <div className={styles.modalIconRing}>
                <Ionicons name="alert-circle-outline" size={22} />
              </div>
              <h2 id="delete-modal-title" className={styles.modalTitle}>
                Delete Account
              </h2>
            </div>
            <p className={styles.modalDesc}>
              This will permanently delete your account, scan histories, votes,
              and reputation data. This action is irreversible.
            </p>

            {deleteError && (
              <p style={{ color: "var(--danger)", fontSize: 13, margin: 0 }}>
                {deleteError}
              </p>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label
                htmlFor="confirm-delete-input"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                }}
              >
                Type &quot;DELETE&quot; to confirm:
              </label>
              <input
                id="confirm-delete-input"
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                autoComplete="off"
                disabled={deletingAccount}
                className={styles.modalInput}
                autoFocus
              />
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setDeleteConfirmText("");
                  setDeleteError("");
                }}
                disabled={deletingAccount}
                className={styles.modalCancelBtn}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccountConfirm}
                disabled={
                  deleteConfirmText.trim() !== "DELETE" || deletingAccount
                }
                className={styles.modalConfirmDangerBtn}
              >
                {deletingAccount ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomTabBar activeTab="profile" />
    </main>
  );
}

export default function AccountDetailsPage() {
  return (
    <Suspense fallback={<AccountDetailsLoading />}>
      <AccountDetailsContent />
    </Suspense>
  );
}
