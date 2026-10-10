"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Ionicons } from "@/lib/mobile-icons";
import { useAuth } from "@/lib/auth-context";
import { useTheme, type ThemeMode } from "@/lib/theme-context";
import { useAvatar, isUserUploadedPhoto } from "@/lib/avatar-context";
import { UserAvatar } from "@/components/avatar/UserAvatar";
import { clearAllUserScans } from "@/lib/scan-history";
import { deleteUserAccountPermanently } from "@/lib/user-account";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import SettingsLoading from "./loading";
import styles from "./settings.module.css";

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, signOut } = useAuth();
  const { mode: themeMode, setMode: setThemeMode } = useTheme();
  const { cachedUrl, avatarUrl } = useAvatar();

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

  const displayName = useMemo(() => {
    return (
      user?.user_metadata?.display_name ||
      user?.user_metadata?.full_name ||
      user?.email?.split("@")[0] ||
      "User"
    );
  }, [user]);

  const username = useMemo(() => {
    return (
      user?.user_metadata?.username ||
      user?.email?.split("@")[0] ||
      ""
    );
  }, [user]);

  // Modal dialog states
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [clearingData, setClearingData] = useState(false);

  const [signOutModalOpen, setSignOutModalOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // Back action
  const handleBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/");
  }, [router]);

  // Theme change
  const handleSelectTheme = useCallback(
    (newMode: ThemeMode) => {
      setThemeMode(newMode);
      showToast(
        newMode === "system"
          ? "Theme set to System Default."
          : newMode === "dark"
          ? "Dark mode enabled."
          : "Light mode enabled."
      );
    },
    [setThemeMode, showToast]
  );

  // Clear local scan cache
  const handleClearLocalData = useCallback(async () => {
    setClearingData(true);
    try {
      await clearAllUserScans(user?.id);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("binro:scan_cleared"));
        window.dispatchEvent(new CustomEvent("binro:scan_added"));
      }
      setClearModalOpen(false);
      showToast("Local scan history cleared.");
    } catch {
      showToast("Could not clear scan history.");
    } finally {
      setClearingData(false);
    }
  }, [user?.id, showToast]);

  // Sign out
  const handleSignOutConfirm = useCallback(async () => {
    setSigningOut(true);
    try {
      await signOut();
      setSignOutModalOpen(false);
      showToast("Signed out successfully.");
      router.replace("/");
    } catch {
      showToast("Could not sign out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  }, [signOut, showToast, router]);

  // Delete account
  const handleDeleteAccountConfirm = useCallback(async () => {
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
  }, [deleteConfirmText, user?.id, deletingAccount, signOut, showToast, router]);

  if (authLoading) {
    return <SettingsLoading />;
  }

  return (
    <main className={styles.container}>
      {/* Toast Feedback */}
      {toastMessage && (
        <div className={styles.toastPill} role="status" aria-live="polite">
          <Ionicons name="checkmark-circle" size={16} color="var(--primary)" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Clear Local Data Modal */}
      {clearModalOpen && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-modal-title"
        >
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <div
                className={styles.modalIconRing}
                style={{
                  backgroundColor: "var(--danger-dim)",
                  color: "var(--danger)",
                }}
              >
                <Ionicons name="trash-outline" size={20} />
              </div>
              <h2 id="clear-modal-title" className={styles.modalTitle}>
                Clear Local History
              </h2>
            </div>
            <p className={styles.modalDesc}>
              This will remove cached scan entries from this browser. Your cloud
              account and submitted reports will not be removed.
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={() => setClearModalOpen(false)}
                disabled={clearingData}
                className={styles.modalCancelBtn}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearLocalData}
                disabled={clearingData}
                className={styles.modalConfirmDangerBtn}
              >
                {clearingData ? "Clearing..." : "Clear History"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sign Out Modal */}
      {signOutModalOpen && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="signout-modal-title"
        >
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <div
                className={styles.modalIconRing}
                style={{
                  backgroundColor: "var(--primary-dim)",
                  color: "var(--primary)",
                }}
              >
                <Ionicons name="log-out-outline" size={20} />
              </div>
              <h2 id="signout-modal-title" className={styles.modalTitle}>
                Sign Out
              </h2>
            </div>
            <p className={styles.modalDesc}>
              Are you sure you want to sign out of BinRo on this device?
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={() => setSignOutModalOpen(false)}
                disabled={signingOut}
                className={styles.modalCancelBtn}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSignOutConfirm}
                disabled={signingOut}
                className={styles.modalConfirmBtn}
              >
                {signingOut ? "Signing out..." : "Sign Out"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {deleteModalOpen && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
        >
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <div
                className={styles.modalIconRing}
                style={{
                  backgroundColor: "var(--danger-dim)",
                  color: "var(--danger)",
                }}
              >
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

      <div className={styles.inner}>
        {/* Top Navigation */}
        <header className={styles.navBar}>
          <button
            type="button"
            onClick={handleBack}
            className={styles.navBackBtn}
            aria-label="Back"
          >
            <Ionicons name="chevron-back" size={20} />
          </button>
          <h1 className={styles.navTitle}>Settings</h1>
          <div className={styles.navSpacer} aria-hidden="true" />
        </header>

        {/* ── SECTION 1: ACCOUNT ── */}
        <section className={styles.section} aria-label="Account">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>Account</span>
          </div>

          {user ? (
            <>
              {/* Account Profile Card */}
              <div className={styles.accountCard}>
                <div className={styles.accountInfo}>
                  <UserAvatar
                    src={photoURL}
                    name={displayName}
                    size={46}
                    showRing={true}
                  />
                  <div className={styles.accountMeta}>
                    <strong className={styles.accountName}>{displayName}</strong>
                    <span className={styles.accountEmail}>{user.email}</span>
                    <div className={styles.accountTag}>
                      {username && <span>@{username}</span>}
                      {username && <span aria-hidden="true">·</span>}
                      <span>Verified</span>
                    </div>
                  </div>
                </div>

                <Link
                  href="/settings/account-details"
                  className={styles.editAccountBtn}
                  aria-label="Edit account details"
                >
                  Edit
                </Link>
              </div>

              {/* Account Rows */}
              <div className={styles.cardGroup}>
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
              </div>
            </>
          ) : (
            /* Guest Sign In */
            <div className={styles.guestCard}>
              <div className={styles.guestInfo}>
                <div className={styles.guestIconWrap}>
                  <Ionicons name="person-outline" size={20} />
                </div>
                <div className={styles.guestTextCol}>
                  <strong className={styles.guestTitle}>
                    Sign in to your account
                  </strong>
                  <span className={styles.guestSub}>
                    Sync scan history and community reputation
                  </span>
                </div>
              </div>
              <Link
                href="/login?returnUrl=/settings"
                className={styles.guestSignInBtn}
              >
                Sign In
              </Link>
            </div>
          )}
        </section>

        {/* ── SECTION 2: PREFERENCES (THEME) ── */}
        <section className={styles.section} aria-label="Appearance">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>Appearance</span>
          </div>

          <div className={styles.themeCard}>
            <p className={styles.themePrompt}>Choose how BinRo looks on your device</p>

            <div className={styles.themeRow} role="radiogroup" aria-label="Theme selection">
              <button
                type="button"
                role="radio"
                aria-checked={themeMode === "system"}
                onClick={() => handleSelectTheme("system")}
                className={`${styles.themeOption} ${
                  themeMode === "system" ? styles.themeOptionActive : ""
                }`}
              >
                <Ionicons
                  name="desktop-outline"
                  size={16}
                  color={themeMode === "system" ? "var(--primary)" : "var(--text-secondary)"}
                />
                <span>System</span>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={themeMode === "light"}
                onClick={() => handleSelectTheme("light")}
                className={`${styles.themeOption} ${
                  themeMode === "light" ? styles.themeOptionActive : ""
                }`}
              >
                <Ionicons
                  name="sunny-outline"
                  size={16}
                  color={themeMode === "light" ? "var(--primary)" : "var(--text-secondary)"}
                />
                <span>Light</span>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={themeMode === "dark"}
                onClick={() => handleSelectTheme("dark")}
                className={`${styles.themeOption} ${
                  themeMode === "dark" ? styles.themeOptionActive : ""
                }`}
              >
                <Ionicons
                  name="moon-outline"
                  size={15}
                  color={themeMode === "dark" ? "var(--primary)" : "var(--text-secondary)"}
                />
                <span>Dark</span>
              </button>
            </div>
          </div>
        </section>

        {/* ── SECTION 3: DATA & PRIVACY ── */}
        <section className={styles.section} aria-label="Data">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>Data &amp; Storage</span>
          </div>

          <div className={styles.cardGroup}>
            <button
              type="button"
              onClick={() => setClearModalOpen(true)}
              className={styles.menuItem}
            >
              <div className={styles.menuIconWrap}>
                <Ionicons name="trash-outline" size={18} />
              </div>
              <div className={styles.menuTextCol}>
                <span className={styles.menuLabel}>Clear Local History</span>
                <span className={styles.menuSublabel}>
                  Remove cached scan records from this browser
                </span>
              </div>
              <Ionicons
                name="chevron-forward"
                size={16}
                color="var(--text-muted)"
              />
            </button>
          </div>
        </section>

        {/* ── SECTION 4: TRUST & SAFETY ── */}
        <section className={styles.section} aria-label="Trust and safety">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>Trust &amp; Safety</span>
          </div>

          <div className={styles.cardGroup}>
            {/* Trust & Safety Scores */}
            <Link href="/trust-scores" className={styles.menuItem}>
              <div className={styles.menuIconWrap}>
                <Ionicons name="shield-checkmark-outline" size={19} />
              </div>
              <div className={styles.menuTextCol}>
                <span className={styles.menuLabel}>Trust &amp; Safety</span>
                <span className={styles.menuSublabel}>
                  Verification metrics and reputation scoring
                </span>
              </div>
              <Ionicons
                name="chevron-forward"
                size={16}
                color="var(--text-muted)"
              />
            </Link>

            <div className={styles.divider} />

            {/* Help & Safety Hub */}
            <Link href="/settings/help-safety" className={styles.menuItem}>
              <div className={styles.menuIconWrap}>
                <Ionicons name="help-buoy-outline" size={19} />
              </div>
              <div className={styles.menuTextCol}>
                <span className={styles.menuLabel}>Help &amp; Safety</span>
                <span className={styles.menuSublabel}>
                  Safety guide, trust scores, feedback, and about BinRo
                </span>
              </div>
              <Ionicons
                name="chevron-forward"
                size={16}
                color="var(--text-muted)"
              />
            </Link>
          </div>
        </section>

        {/* ── SECTION 5: LEGAL & ABOUT ── */}
        <section className={styles.section} aria-label="Legal and about">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>Legal &amp; About</span>
          </div>

          <div className={styles.cardGroup}>
            <Link href="/terms" className={styles.menuItem}>
              <div className={styles.menuIconWrap}>
                <Ionicons name="document-text-outline" size={18} />
              </div>
              <div className={styles.menuTextCol}>
                <span className={styles.menuLabel}>Terms of Service</span>
                <span className={styles.menuSublabel}>
                  Rules, disclaimers, and service terms
                </span>
              </div>
              <Ionicons
                name="chevron-forward"
                size={16}
                color="var(--text-muted)"
              />
            </Link>

            <div className={styles.divider} />

            <Link href="/privacy" className={styles.menuItem}>
              <div className={styles.menuIconWrap}>
                <Ionicons name="lock-closed-outline" size={18} />
              </div>
              <div className={styles.menuTextCol}>
                <span className={styles.menuLabel}>Privacy Policy</span>
                <span className={styles.menuSublabel}>
                  Zero data-selling guarantee and local camera processing
                </span>
              </div>
              <Ionicons
                name="chevron-forward"
                size={16}
                color="var(--text-muted)"
              />
            </Link>
          </div>
        </section>

        {/* ── SECTION 6: ACTIONS & DANGER ZONE (Logged In Only) ── */}
        {user && (
          <section className={styles.section} aria-label="Account management">
            <div className={styles.sectionHeader}>
              <span className={styles.sectionLabel}>Session &amp; Security</span>
            </div>

            <div className={styles.cardGroup}>
              {/* Sign Out */}
              <button
                type="button"
                onClick={() => setSignOutModalOpen(true)}
                className={styles.menuItem}
              >
                <div className={styles.menuIconWrap}>
                  <Ionicons name="log-out-outline" size={18} />
                </div>
                <div className={styles.menuTextCol}>
                  <span className={styles.menuLabel}>Sign Out</span>
                  <span className={styles.menuSublabel}>
                    End your active session on this device
                  </span>
                </div>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color="var(--text-muted)"
                />
              </button>
            </div>

            {/* Danger Zone: Delete Account */}
            <div className={styles.dangerGroup}>
              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(true);
                  setDeleteConfirmText("");
                  setDeleteError("");
                }}
                className={styles.menuItem}
              >
                <div
                  className={`${styles.menuIconWrap} ${styles.menuIconWrapDanger}`}
                >
                  <Ionicons name="alert-circle-outline" size={19} />
                </div>
                <div className={styles.menuTextCol}>
                  <span
                    className={`${styles.menuLabel} ${styles.menuLabelDanger}`}
                  >
                    Delete Account
                  </span>
                  <span className={styles.menuSublabel}>
                    Permanently delete your profile and all associated data
                  </span>
                </div>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color="var(--danger)"
                />
              </button>
            </div>
          </section>
        )}

        {/* ── FOOTER ── */}
        <footer className={styles.footer}>
          <div className={styles.footerBrand}>
            Bin<span style={{ color: "var(--primary)" }}>Ro</span>
          </div>
          <div className={styles.footerMeta}>
            <span>Version 1.0.0</span>
            <span aria-hidden="true">·</span>
            <span>Know Before You Scan</span>
          </div>
          <p className={styles.footerNote}>
            Trust scores reflect community signals and security heuristics.
          </p>
        </footer>
      </div>

      <BottomTabBar activeTab="profile" />
    </main>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsLoading />}>
      <SettingsContent />
    </Suspense>
  );
}
