"use client";

import React, { useState, useEffect, Suspense, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Ionicons } from "@/lib/mobile-icons";
import { useAuth } from "@/lib/auth-context";
import { useAvatar, isUserUploadedPhoto } from "@/lib/avatar-context";
import { UserAvatar } from "@/components/avatar/UserAvatar";
import { deleteUserAccountPermanently } from "@/lib/user-account";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import SettingsLoading from "./loading";
import styles from "./settings.module.css";

type SectionType =
  | "main"
  | "account"
  | "guide"
  | "feedback"
  | "trust-scores"
  | "terms"
  | "privacy";

const SECTION_TITLES: Record<SectionType, string> = {
  main: "Settings",
  account: "Account Management",
  guide: "Manual Guide",
  feedback: "Send Feedback",
  "trust-scores": "About Trust Scores",
  terms: "Terms of Service",
  privacy: "Privacy Policy",
};

const EXTERNAL_REDIRECT_SECTIONS: ReadonlySet<string> = new Set([
  "guide",
  "feedback",
  "trust-scores",
  "terms",
  "privacy",
]);

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, signOut } = useAuth();
  const { cachedUrl, avatarUrl } = useAvatar();

  const [, startTransition] = useTransition();

  // Safe client-side hydration for localStorage avatar
  const [localCustom, setLocalCustom] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && user?.id) {
      try {
        const stored =
          localStorage.getItem(`user_custom_avatar_${user.id}`) ||
          localStorage.getItem(`user_avatar_${user.id}`);
        setLocalCustom(stored);
      } catch {
        // Local storage inaccessible
      }
    }
  }, [user?.id]);

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

  const initialSectionParam = (searchParams.get("section") as SectionType) || "main";
  const [section, setSection] = useState<SectionType>(initialSectionParam);

  const displayName =
    user?.user_metadata?.display_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "User";

  // Delete account confirmation states
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Keep section in sync if query param changes
  useEffect(() => {
    const param = searchParams.get("section") as SectionType;
    if (param && SECTION_TITLES[param]) {
      setSection(param);
    } else if (!param) {
      setSection("main");
    }
  }, [searchParams]);

  // Pure React effect: Handle full-page dedicated route redirects without render side-effects
  useEffect(() => {
    if (section === "guide") {
      router.replace("/guide");
    } else if (section === "feedback") {
      router.replace("/feedback");
    } else if (section === "trust-scores") {
      router.replace("/trust-scores");
    } else if (section === "terms") {
      router.replace("/terms");
    } else if (section === "privacy") {
      router.replace("/privacy");
    }
  }, [section, router]);

  const handleBack = () => {
    if (section !== "main") {
      setSection("main");
      startTransition(() => {
        router.replace("/settings");
      });
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/profile");
  };

  const openAccountSection = () => {
    setSection("account");
    startTransition(() => {
      router.push("/settings?section=account");
    });
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim() !== "DELETE" || !user?.id || deletingAccount) return;
    setDeletingAccount(true);
    setDeleteError("");
    try {
      await deleteUserAccountPermanently(user.id);
      await signOut().catch(() => {});
      router.replace("/");
    } catch (e: any) {
      console.error("[settings] account deletion error:", e);
      setDeleteError(
        e?.message || "Failed to delete account. Please try again or contact support."
      );
      setDeletingAccount(false);
    }
  };

  if (loading) {
    return <SettingsLoading />;
  }

  // If redirecting to full dedicated page, render loading indicator cleanly
  if (EXTERNAL_REDIRECT_SECTIONS.has(section)) {
    return <SettingsLoading />;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUB-SECTION: ACCOUNT MANAGEMENT (DANGER ZONE)
  // ═══════════════════════════════════════════════════════════════════════════
  if (section === "account") {
    // If an unauthenticated user somehow opens account management directly
    if (!user) {
      return (
        <main className={styles.container}>
          <div className={styles.inner}>
            <header className={styles.navBar}>
              <button
                type="button"
                onClick={handleBack}
                className={styles.navBackBtn}
                aria-label="Back to settings"
              >
                <Ionicons name="chevron-back" size={20} />
              </button>
              <h1 className={styles.navTitle}>{SECTION_TITLES.account}</h1>
              <div className={styles.navSpacer} />
            </header>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "48px 20px",
                backgroundColor: "var(--surface)",
                border: "1px solid var(--surface-border)",
                borderRadius: "20px",
                textAlign: "center",
                marginTop: "20px",
              }}
            >
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "32px",
                  backgroundColor: "var(--primary-dim)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "16px",
                  color: "var(--primary)",
                }}
              >
                <Ionicons name="lock-closed-outline" size={32} />
              </div>
              <h2
                style={{
                  margin: "0 0 8px",
                  fontSize: "var(--fs-xl)",
                  fontWeight: 700,
                  color: "var(--text)",
                }}
              >
                Sign In Required
              </h2>
              <p
                style={{
                  margin: "0 0 24px",
                  fontSize: "var(--fs-base)",
                  color: "var(--text-secondary)",
                  maxWidth: "280px",
                  lineHeight: 1.4,
                }}
              >
                Account management is only available to registered users.
              </p>
              <Link
                href="/login?returnUrl=/settings?section=account"
                className={styles.submitBtn}
                style={{ textDecoration: "none", width: "100%", maxWidth: "260px" }}
              >
                Sign In
              </Link>
            </div>
          </div>
          <BottomTabBar activeTab="profile" />
        </main>
      );
    }

    return (
      <main className={styles.container}>
        <div className={styles.inner}>
          <div className={styles.subInner}>
            <header className={styles.navBar}>
              <button
                type="button"
                onClick={handleBack}
                className={styles.navBackBtn}
                aria-label="Back to settings"
              >
                <Ionicons name="chevron-back" size={20} />
              </button>
              <h1 className={styles.navTitle}>{SECTION_TITLES.account}</h1>
              <div className={styles.navSpacer} />
            </header>

            <div className={styles.section}>
              <h2 className={styles.sectionLabel}>CONNECTED ACCOUNT</h2>
              <div className={styles.menuGroup}>
                <div className={styles.accountCard}>
                  <UserAvatar
                    src={photoURL}
                    name={displayName}
                    size={48}
                    showRing={true}
                  />
                  <div className={styles.menuTextCol}>
                    <strong className={styles.accountName}>{displayName}</strong>
                    <span className={styles.accountEmail}>{user?.email}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionLabel}>DANGER ZONE</h2>
              <div className={styles.warningCard}>
                <div className={styles.warningHeader}>
                  <Ionicons name="alert-circle" size={20} color="var(--danger)" />
                  <h3 className={styles.warningTitle}>Delete BinRo Account</h3>
                </div>
                <p className={styles.warningDesc}>
                  Permanently delete your user profile, scan histories, and comments. This action cannot be reversed.
                </p>

                {deleteError && (
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: "12px",
                      backgroundColor: "var(--danger-dim)",
                      border: "1px solid var(--danger)",
                      color: "var(--danger)",
                      fontSize: "var(--fs-base)",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "12px",
                    }}
                    role="alert"
                  >
                    <Ionicons name="alert-circle-outline" size={18} color="var(--danger)" />
                    <span>{deleteError}</span>
                  </div>
                )}

                {deleteConfirmModal ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                    <label
                      htmlFor="delete-account-input"
                      className={styles.inputLabel}
                      style={{ color: "var(--danger)" }}
                    >
                      Type &quot;DELETE&quot; to confirm:
                    </label>
                    <input
                      id="delete-account-input"
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="DELETE"
                      disabled={deletingAccount}
                      aria-required="true"
                      aria-invalid={
                        deleteConfirmText.length > 0 &&
                        deleteConfirmText.trim() !== "DELETE"
                      }
                      className={styles.textInput}
                      style={{ borderColor: "var(--danger)" }}
                      autoFocus
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteConfirmModal(false);
                          setDeleteError("");
                        }}
                        disabled={deletingAccount}
                        className={styles.fieldCancelBtn}
                        style={{ flex: 1 }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={deleteConfirmText.trim() !== "DELETE" || deletingAccount}
                        onClick={handleDeleteAccount}
                        className={styles.deleteAccountBtn}
                        style={{
                          flex: 1,
                          opacity:
                            deleteConfirmText.trim() === "DELETE" && !deletingAccount
                              ? 1
                              : 0.5,
                        }}
                      >
                        {deletingAccount ? "Deleting..." : "Confirm Delete"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteConfirmModal(true);
                      setDeleteError("");
                    }}
                    className={styles.deleteAccountBtn}
                  >
                    <Ionicons name="trash-outline" size={16} />
                    <span>Delete Account</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        <BottomTabBar activeTab="profile" />
      </main>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN SETTINGS VIEW (Accessible to both Authenticated and Guest Users)
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <main className={styles.container}>
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
          <h1 className={styles.navTitle}>Settings</h1>
          <div className={styles.navSpacer} />
        </header>

        <div className={styles.settingsLayout}>
          {/* ── COLUMN 1: ACCOUNT & SECURITY ── */}
          <div className={styles.settingsColumn}>
            <div className={styles.infoCard}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Account & Security</h2>
              </div>
              <div className={styles.cardContent}>
                {user ? (
                  <>
                    <div className={styles.accountCard}>
                      <UserAvatar
                        src={photoURL}
                        name={displayName}
                        size={46}
                        showRing={true}
                      />
                      <div className={styles.menuTextCol}>
                        <strong className={styles.accountName}>{displayName}</strong>
                        <span className={styles.accountEmail}>{user.email}</span>
                      </div>
                    </div>

                    <div className={styles.divider} />

                    {/* Account Management (Delete Account / Danger Zone) */}
                    <button
                      type="button"
                      onClick={openAccountSection}
                      className={styles.menuItem}
                    >
                      <div className={styles.menuIconWrap}>
                        <Ionicons name="shield-outline" size={18} />
                      </div>
                      <div className={styles.menuTextCol}>
                        <span className={styles.menuLabel}>Account Management</span>
                        <span className={styles.menuSublabel}>Security, deletion & credentials</span>
                      </div>
                      <Ionicons name="chevron-forward" size={16} color="var(--text-muted)" />
                    </button>

                    <div className={styles.divider} />

                    {/* Direct shortcut to Profile page */}
                    <Link
                      href="/profile"
                      className={styles.menuItem}
                      style={{ textDecoration: "none" }}
                    >
                      <div className={styles.menuIconWrap}>
                        <Ionicons name="person-outline" size={18} />
                      </div>
                      <div className={styles.menuTextCol}>
                        <span className={styles.menuLabel}>Edit Profile & Theme</span>
                        <span className={styles.menuSublabel}>Change photo, name, username or appearance</span>
                      </div>
                      <Ionicons name="chevron-forward" size={16} color="var(--text-muted)" />
                    </Link>
                  </>
                ) : (
                  <Link
                    href="/login?returnUrl=/settings"
                    className={styles.signInCard}
                  >
                    <div className={styles.signInIcon}>
                      <Ionicons name="person-outline" size={22} />
                    </div>
                    <div className={styles.menuTextCol}>
                      <strong className={styles.signInTitle}>Sign In / Create Account</strong>
                      <span className={styles.signInSub}>
                        Access cloud sync, custom avatars & security controls
                      </span>
                    </div>
                    <Ionicons name="chevron-forward" size={16} color="var(--text-muted)" />
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* ── COLUMN 2: HELP & LEGAL (Available to everyone) ── */}
          <div className={styles.settingsColumn}>
            {/* ── HELP & INFORMATION SECTION ── */}
            <div className={styles.infoCard}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Help & Information</h2>
              </div>
              <div className={styles.cardContent}>
                <Link
                  href="/guide"
                  className={styles.menuItem}
                  style={{ textDecoration: "none" }}
                >
                  <div className={styles.menuIconWrap}>
                    <Ionicons name="book-outline" size={18} />
                  </div>
                  <div className={styles.menuTextCol}>
                    <span className={styles.menuLabel}>Manual Guide</span>
                    <span className={styles.menuSublabel}>
                      Documentary guide to QR security & scanner forensics
                    </span>
                  </div>
                  <Ionicons name="chevron-forward" size={16} color="var(--text-muted)" />
                </Link>

                <div className={styles.divider} />

                <Link
                  href="/trust-scores"
                  className={styles.menuItem}
                  style={{ textDecoration: "none" }}
                >
                  <div className={styles.menuIconWrap}>
                    <Ionicons name="shield-checkmark-outline" size={18} />
                  </div>
                  <div className={styles.menuTextCol}>
                    <span className={styles.menuLabel}>About Trust Scores</span>
                    <span className={styles.menuSublabel}>
                      How safety ratings and threat detection work
                    </span>
                  </div>
                  <Ionicons name="chevron-forward" size={16} color="var(--text-muted)" />
                </Link>

                <div className={styles.divider} />

                <Link
                  href="/feedback"
                  className={styles.menuItem}
                  style={{ textDecoration: "none" }}
                >
                  <div className={styles.menuIconWrap}>
                    <Ionicons name="chatbubble-outline" size={18} />
                  </div>
                  <div className={styles.menuTextCol}>
                    <span className={styles.menuLabel}>Send Feedback</span>
                    <span className={styles.menuSublabel}>Report bugs or suggest new features</span>
                  </div>
                  <Ionicons name="chevron-forward" size={16} color="var(--text-muted)" />
                </Link>
              </div>
            </div>

            {/* ── LEGAL & COMPLIANCE SECTION ── */}
            <div className={styles.infoCard}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Legal & Compliance</h2>
              </div>
              <div className={styles.cardContent}>
                <Link
                  href="/terms"
                  className={styles.menuItem}
                  style={{ textDecoration: "none" }}
                >
                  <div className={styles.menuIconWrap}>
                    <Ionicons name="document-text-outline" size={18} />
                  </div>
                  <div className={styles.menuTextCol}>
                    <span className={styles.menuLabel}>Terms of Service</span>
                    <span className={styles.menuSublabel}>Usage rules, disclaimers and liability</span>
                  </div>
                  <Ionicons name="chevron-forward" size={16} color="var(--text-muted)" />
                </Link>

                <div className={styles.divider} />

                <Link
                  href="/privacy"
                  className={styles.menuItem}
                  style={{ textDecoration: "none" }}
                >
                  <div className={styles.menuIconWrap}>
                    <Ionicons name="lock-closed-outline" size={18} />
                  </div>
                  <div className={styles.menuTextCol}>
                    <span className={styles.menuLabel}>Privacy Policy</span>
                    <span className={styles.menuSublabel}>How we collect and protect your data</span>
                  </div>
                  <Ionicons name="chevron-forward" size={16} color="var(--text-muted)" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <footer className={styles.footer}>
          <div className={styles.footerBadge}>BinRo v1.0.0</div>
          <p className={styles.footerTagline}>Scan smart. Stay safe.</p>
          <p className={styles.footerDisclaimer}>
            Trust scores reflect community opinion, not verified fact. You are solely responsible for all decisions made after scanning a QR code.
          </p>
        </footer>
      </div>

      <BottomTabBar activeTab="profile" />
    </main>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.container}>
          <div
            className={styles.inner}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
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
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
