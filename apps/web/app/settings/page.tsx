"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Ionicons } from "@/lib/mobile-icons";
import { useAuth } from "@/lib/auth-context";
import { useAvatar, isUserUploadedPhoto } from "@/lib/avatar-context";
import { useTheme } from "@/lib/theme-context";
import { UserAvatar } from "@/components/avatar/UserAvatar";
import { getWebSupabase, isWebSupabaseConfigured } from "@/lib/supabase";
import { clearAllUserScans } from "@/lib/scan-history";
import { sanitizeTextInput, isValidUsername } from "@/lib/web-security";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import styles from "./settings.module.css";

type SectionType =
  | "main"
  | "profile"
  | "account"
  | "guide"
  | "feedback"
  | "trust-scores"
  | "terms"
  | "privacy"
  | "history";

const SECTION_TITLES: Record<SectionType, string> = {
  main: "Settings",
  profile: "Profile Settings",
  account: "Account Management",
  guide: "Manual Guide",
  feedback: "Send Feedback",
  "trust-scores": "About Trust Scores",
  terms: "Terms of Service",
  privacy: "Privacy Policy",
  history: "Scan History",
};

const GUIDE_STEPS = [
  {
    icon: "scan-outline",
    title: "Scan a QR Code",
    desc: "Point your camera at any QR code, or pick an image from your device. BinRo automatically decodes and analyzes the destination in real time.",
  },
  {
    icon: "shield-checkmark-outline",
    title: "Check Trust Score",
    desc: "View the community trust score powered by reports from real users. Scores are confidence-weighted — more reports mean higher accuracy.",
  },
  {
    icon: "people-outline",
    title: "Read Community Reports",
    desc: "See how others have categorized the QR code: Safe, Scam, Fake, or Spam. Read comments for helpful contextual insights.",
  },
  {
    icon: "flag-outline",
    title: "Report & Protect",
    desc: "Sign in to vote or report suspicious QR codes. Your reports directly update the community trust rating for other users.",
  },
  {
    icon: "chatbubble-outline",
    title: "Comment & Discuss",
    desc: "Add comments to share your experience. Like helpful comments or report harmful ones with full threading support.",
  },
  {
    icon: "eye-off-outline",
    title: "Anonymous Mode",
    desc: "Scan in anonymous mode without an account. Quick safety checks with zero tracking.",
  },
  {
    icon: "phone-portrait-outline",
    title: "Payment QR Codes",
    desc: "For UPI and payment QR codes, BinRo verifies merchant details and provides verified pay links.",
  },
];

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, signOut } = useAuth();
  const { cachedUrl, avatarUrl, uploadAvatar, removeAvatar, uploading } = useAvatar();

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

  const photoFileInputRef = React.useRef<HTMLInputElement | null>(null);

  const initialSectionParam = (searchParams.get("section") as SectionType) || "main";
  const [section, setSection] = useState<SectionType>(initialSectionParam);

  // Appearance mode state synchronized with ThemeProvider
  const { mode: themeMode, setMode: setThemeMode } = useTheme();

  // Profile fields state
  const [displayName, setDisplayName] = useState(
    user?.user_metadata?.display_name || user?.user_metadata?.full_name || ""
  );
  const [username, setUsername] = useState(
    user?.user_metadata?.username || user?.email?.split("@")[0] || ""
  );
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [nameInput, setNameInput] = useState(displayName);
  const [usernameInput, setUsernameInput] = useState(username);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState("");

  const handleSettingsFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await uploadAvatar(file);
        setProfileSuccessMsg("Profile photo updated successfully.");
        setTimeout(() => setProfileSuccessMsg(""), 3000);
      } catch {
        setProfileSuccessMsg("Could not update photo. Please try again.");
        setTimeout(() => setProfileSuccessMsg(""), 3000);
      }
    }
    if (e.target) e.target.value = "";
  };

  const handleSettingsRemovePhoto = async () => {
    try {
      await removeAvatar();
      setProfileSuccessMsg("Profile photo removed.");
      setTimeout(() => setProfileSuccessMsg(""), 3000);
    } catch {
      setProfileSuccessMsg("Could not remove photo.");
      setTimeout(() => setProfileSuccessMsg(""), 3000);
    }
  };

  // Feedback form state
  const [feedbackEmail, setFeedbackEmail] = useState(user?.email || "");
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackDone, setFeedbackDone] = useState(false);

  // Delete account confirmation
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(false);

  // Toast / Status state
  const [dataCleared, setDataCleared] = useState(false);

  useEffect(() => {
    const param = searchParams.get("section") as SectionType;
    if (param && SECTION_TITLES[param]) {
      setSection(param);
    }
  }, [searchParams]);

  const handleBack = () => {
    if (section !== "main") {
      setSection("main");
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/profile");
  };

  const handleSaveName = async () => {
    const trimmed = sanitizeTextInput(nameInput.trim(), 40);
    if (!trimmed) return;
    setDisplayName(trimmed);
    setIsEditingName(false);
    try {
      if (isWebSupabaseConfigured()) {
        const supabase = getWebSupabase();
        await supabase.auth.updateUser({ data: { display_name: trimmed, full_name: trimmed } });
        if (user?.id) {
          await supabase.from("users").upsert({ id: user.id, display_name: trimmed, updated_at: new Date().toISOString() });
        }
      }
    } catch {}
    setProfileSuccessMsg("Display name updated and saved.");
    setTimeout(() => setProfileSuccessMsg(""), 3000);
  };

  const handleSaveUsername = async () => {
    const trimmed = sanitizeTextInput(usernameInput.trim().toLowerCase(), 20);
    if (!trimmed || !isValidUsername(trimmed)) {
      setProfileSuccessMsg("Username must be 3-20 letters/numbers/underscores.");
      setTimeout(() => setProfileSuccessMsg(""), 3000);
      return;
    }
    setUsername(trimmed);
    setIsEditingUsername(false);
    try {
      if (isWebSupabaseConfigured()) {
        const supabase = getWebSupabase();
        await supabase.auth.updateUser({ data: { username: trimmed, user_name: trimmed } });
        if (user?.id) {
          await supabase.from("users").upsert({ id: user.id, username: trimmed, updated_at: new Date().toISOString() });
        }
      }
    } catch {}
    setProfileSuccessMsg("Username updated and saved.");
    setTimeout(() => setProfileSuccessMsg(""), 3000);
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanText = sanitizeTextInput(feedbackText.trim(), 1000);
    const cleanEmail = sanitizeTextInput(feedbackEmail.trim(), 120);
    if (!cleanText) return;
    setFeedbackSubmitting(true);
    try {
      if (isWebSupabaseConfigured()) {
        const supabase = getWebSupabase();
        await supabase.from("feedback").insert({
          user_id: user?.id || null,
          email: cleanEmail || user?.email || null,
          message: cleanText,
          created_at: new Date().toISOString(),
        });
      }
    } catch {}
    setFeedbackSubmitting(false);
    setFeedbackDone(true);
  };

  const handleClearData = async () => {
    await clearAllUserScans(user?.id);
    setDataCleared(true);
    setTimeout(() => setDataCleared(false), 3000);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim() !== "DELETE") return;
    try {
      if (user?.id && isWebSupabaseConfigured()) {
        const supabase = getWebSupabase();
        await supabase.from("users").update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq("id", user.id);
        await supabase.from("qr_scans").update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq("user_id", user.id);
      }
    } catch {}
    await signOut();
    router.replace("/");
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
              border: "3px solid rgba(0, 82, 204, 0.2)",
              borderTopColor: "var(--primary)",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </main>
    );
  }

  // ── GUEST ACCESS RESTRICTION ──
  // Per user specification: If not signed in, settings are not accessible.
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
            <h1 className={styles.navTitle}>Settings</h1>
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
                backgroundColor: "rgba(0, 82, 204, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
                color: "var(--primary)",
              }}
            >
              <Ionicons name="lock-closed-outline" size={32} />
            </div>
            <h2 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 700, color: "var(--text)" }}>
              Sign In Required
            </h2>
            <p style={{ margin: "0 0 24px", fontSize: "13px", color: "var(--text-secondary)", maxWidth: "280px", lineHeight: 1.4 }}>
              Settings and profile management are reserved for signed-in account holders.
            </p>
            <Link
              href="/login?returnUrl=/settings"
              className={styles.submitBtn}
              style={{ textDecoration: "none", width: "100%", maxWidth: "260px" }}
            >
              Sign In
            </Link>
            <Link
              href="/"
              style={{
                marginTop: "14px",
                fontSize: "13px",
                color: "var(--primary)",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Return to Home
            </Link>
          </div>
        </div>

        <BottomTabBar activeTab="profile" />
      </main>
    );
  }

  const userInitial = displayName.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "?";

  // ═══════════════════════════════════════════════════════════════════════════
  // SUB-SECTION: PROFILE SETTINGS
  // ═══════════════════════════════════════════════════════════════════════════
  if (section === "profile") {
    return (
      <main className={styles.container}>
        <div className={styles.inner}>
          <div className={styles.subInner}>
            <header className={styles.navBar}>
              <button
                type="button"
                onClick={handleBack}
                className={styles.navBackBtn}
                aria-label="Back"
              >
                <Ionicons name="chevron-back" size={20} />
              </button>
              <h1 className={styles.navTitle}>{SECTION_TITLES.profile}</h1>
              <div className={styles.navSpacer} />
            </header>

            {profileSuccessMsg && (
              <div style={{ padding: "10px 14px", borderRadius: "12px", backgroundColor: "var(--safe-dim)", color: "var(--safe)", fontSize: "13px", fontWeight: 600, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                <Ionicons name="checkmark-circle" size={16} color="var(--safe)" />
                <span>{profileSuccessMsg}</span>
              </div>
            )}

            <input
              type="file"
              ref={photoFileInputRef}
              onChange={handleSettingsFileChange}
              accept="image/*"
              style={{ display: "none" }}
            />

            <div className={styles.section}>
              <span className={styles.sectionLabel}>PROFILE PHOTO</span>
              <div className={styles.menuGroup}>
                <div className={styles.profilePhotoRow}>
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <UserAvatar
                      src={photoURL}
                      name={displayName}
                      size={54}
                      showRing={true}
                    />
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>Profile Picture</span>
                      <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                        {uploading ? "Uploading..." : photoURL ? "Custom or connected avatar" : "No photo uploaded"}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => photoFileInputRef.current?.click()}
                      className={styles.fieldSaveBtn}
                      style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                      disabled={uploading}
                    >
                      <Ionicons name="camera-outline" size={14} />
                      <span>{photoURL ? "Change" : "Upload"}</span>
                    </button>
                    {photoURL && (
                      <button
                        type="button"
                        onClick={handleSettingsRemovePhoto}
                        className={styles.fieldCancelBtn}
                        style={{ color: "var(--danger)" }}
                        disabled={uploading}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <span className={styles.sectionLabel}>IDENTITY</span>
              <div className={styles.menuGroup}>
                {/* Display Name Field */}
                <div className={styles.fieldBlock}>
                  <span className={styles.fieldLabel}>Display Name</span>
                  {isEditingName ? (
                    <div className={styles.fieldEditRow}>
                      <input
                        type="text"
                        className={styles.textInput}
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        maxLength={40}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleSaveName}
                        className={styles.fieldSaveBtn}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingName(false)}
                        className={styles.fieldCancelBtn}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div
                      className={styles.fieldValueRow}
                      onClick={() => {
                        setNameInput(displayName);
                        setIsEditingName(true);
                      }}
                    >
                      <span className={styles.fieldValueText}>{displayName || "—"}</span>
                      <Ionicons name="pencil" size={14} color="var(--text-muted)" />
                    </div>
                  )}
                </div>

                <div className={styles.divider} style={{ marginLeft: 16 }} />

                {/* Username Field */}
                <div className={styles.fieldBlock}>
                  <span className={styles.fieldLabel}>Username</span>
                  {isEditingUsername ? (
                    <div className={styles.fieldEditRow}>
                      <input
                        type="text"
                        className={styles.textInput}
                        value={usernameInput}
                        onChange={(e) => setUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                        maxLength={20}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleSaveUsername}
                        className={styles.fieldSaveBtn}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingUsername(false)}
                        className={styles.fieldCancelBtn}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div
                      className={styles.fieldValueRow}
                      onClick={() => {
                        setUsernameInput(username);
                        setIsEditingUsername(true);
                      }}
                    >
                      <span className={styles.fieldValueText} style={{ color: "var(--primary)" }}>
                        {username ? `@${username}` : "Not set"}
                      </span>
                      <Ionicons name="pencil" size={14} color="var(--text-muted)" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUB-SECTION: ACCOUNT MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════
  if (section === "account") {
    return (
      <main className={styles.container}>
        <div className={styles.inner}>
          <div className={styles.subInner}>
            <header className={styles.navBar}>
              <button
                type="button"
                onClick={handleBack}
                className={styles.navBackBtn}
                aria-label="Back"
              >
                <Ionicons name="chevron-back" size={20} />
              </button>
              <h1 className={styles.navTitle}>{SECTION_TITLES.account}</h1>
              <div className={styles.navSpacer} />
            </header>

            <div className={styles.section}>
              <span className={styles.sectionLabel}>CONNECTED ACCOUNT</span>
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
              <span className={styles.sectionLabel}>DANGER ZONE</span>
              <div className={styles.warningCard}>
                <div className={styles.warningHeader}>
                  <Ionicons name="alert-circle" size={20} color="var(--danger)" />
                  <h2 className={styles.warningTitle}>Delete BinRo Account</h2>
                </div>
                <p className={styles.warningDesc}>
                  Permanently delete your user profile, scan histories, and comments. This action cannot be reversed.
                </p>
                {deleteConfirmModal ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                    <label htmlFor="delete-account-input" className={styles.inputLabel} style={{ color: "var(--danger)" }}>
                      Type "DELETE" to confirm:
                    </label>
                    <input
                      id="delete-account-input"
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="DELETE"
                      className={styles.textInput}
                      style={{ borderColor: "var(--danger)" }}
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmModal(false)}
                        className={styles.fieldCancelBtn}
                        style={{ flex: 1 }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={deleteConfirmText.trim() !== "DELETE"}
                        onClick={handleDeleteAccount}
                        className={styles.deleteAccountBtn}
                        style={{ flex: 1, opacity: deleteConfirmText.trim() === "DELETE" ? 1 : 0.5 }}
                      >
                        Confirm Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmModal(true)}
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
      </main>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUB-SECTION: MANUAL GUIDE
  // ═══════════════════════════════════════════════════════════════════════════
  if (section === "guide") {
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
            <h1 className={styles.navTitle}>{SECTION_TITLES.guide}</h1>
            <div className={styles.navSpacer} />
          </header>

          <div className={styles.guideGrid}>
            {GUIDE_STEPS.map((step, idx) => (
              <div key={idx} className={styles.guideStep}>
                <div className={styles.guideStepNum}>{idx + 1}</div>
                <div className={styles.guideStepIcon}>
                  <Ionicons name={step.icon} size={20} color="var(--primary)" />
                </div>
                <div>
                  <h2 className={styles.guideStepTitle}>{step.title}</h2>
                  <p className={styles.guideStepDesc}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUB-SECTION: SEND FEEDBACK
  // ═══════════════════════════════════════════════════════════════════════════
  if (section === "feedback") {
    return (
      <main className={styles.container}>
        <div className={styles.inner}>
          <div className={styles.subInner}>
            <header className={styles.navBar}>
              <button
                type="button"
                onClick={handleBack}
                className={styles.navBackBtn}
                aria-label="Back"
              >
                <Ionicons name="chevron-back" size={20} />
              </button>
              <h1 className={styles.navTitle}>{SECTION_TITLES.feedback}</h1>
              <div className={styles.navSpacer} />
            </header>

            {feedbackDone ? (
              <div className={styles.warningCard} style={{ backgroundColor: "var(--surface)", borderColor: "var(--safe)" }}>
                <div className={styles.warningHeader} style={{ color: "var(--safe)" }}>
                  <Ionicons name="checkmark-circle" size={24} color="var(--safe)" />
                  <h2 className={styles.warningTitle}>Thank you!</h2>
                </div>
                <p className={styles.warningDesc}>
                  Your feedback has been received. Thank you for helping keep BinRo safe and reliable.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setFeedbackDone(false);
                    setFeedbackText("");
                  }}
                  className={styles.submitBtn}
                  style={{ marginTop: 10 }}
                >
                  Send Another
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitFeedback} className={styles.section}>
                <p className={styles.feedbackIntro}>
                  Found a bug? Have a suggestion? We'd love to hear from you.
                </p>

                <div className={styles.inputGroup}>
                  <label htmlFor="feedback-email-input" className={styles.inputLabel}>Email (optional)</label>
                  <input
                    id="feedback-email-input"
                    type="email"
                    value={feedbackEmail}
                    onChange={(e) => setFeedbackEmail(e.target.value)}
                    placeholder="your@email.com"
                    className={styles.textInput}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="feedback-text-input" className={styles.inputLabel}>Your Feedback *</label>
                  <textarea
                    id="feedback-text-input"
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Tell us what's on your mind..."
                    maxLength={1000}
                    className={`${styles.textInput} ${styles.textArea}`}
                    required
                  />
                  <span className={styles.charCount}>{feedbackText.length}/1000</span>
                </div>

                <button
                  type="submit"
                  disabled={feedbackSubmitting || !feedbackText.trim()}
                  className={styles.submitBtn}
                >
                  <Ionicons name="send" size={16} />
                  <span>{feedbackSubmitting ? "Sending..." : "Submit Feedback"}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUB-SECTION: ABOUT TRUST SCORES
  // ═══════════════════════════════════════════════════════════════════════════
  if (section === "trust-scores") {
    return (
      <main className={styles.container}>
        <div className={styles.inner}>
          <div className={styles.subInner}>
            <header className={styles.navBar}>
              <button
                type="button"
                onClick={handleBack}
                className={styles.navBackBtn}
                aria-label="Back"
              >
                <Ionicons name="chevron-back" size={20} />
              </button>
              <h1 className={styles.navTitle}>{SECTION_TITLES["trust-scores"]}</h1>
              <div className={styles.navSpacer} />
            </header>

            <div className={styles.legalCard}>
              <h2 className={styles.legalSectionTitle}>How BinRo Trust Scores Work</h2>
              <p>
                BinRo computes a collective safety score for QR codes based on user reports, community moderation, destination URL analysis, and threat intelligence.
              </p>

              <h3 className={styles.legalSectionTitle}>Score Ranges</h3>
              <div className={styles.trustTiersGrid}>
                <div style={{ padding: 12, borderRadius: 12, backgroundColor: "var(--safe-dim)", border: "1px solid rgba(16,185,129,0.3)" }}>
                  <strong style={{ color: "var(--safe)" }}>80 – 100: Safe</strong>
                  <p style={{ margin: "4px 0 0", fontSize: 12 }}>
                    Verified by the community and automated scanners as legitimate and harmless.
                  </p>
                </div>

                <div style={{ padding: 12, borderRadius: 12, backgroundColor: "var(--warning-dim)", border: "1px solid rgba(245,158,11,0.3)" }}>
                  <strong style={{ color: "var(--warning)" }}>50 – 79: Caution</strong>
                  <p style={{ margin: "4px 0 0", fontSize: 12 }}>
                    Contains mixed feedback or new destinations. Proceed with care.
                  </p>
                </div>

                <div style={{ padding: 12, borderRadius: 12, backgroundColor: "var(--danger-dim)", border: "1px solid rgba(239,68,68,0.3)" }}>
                  <strong style={{ color: "var(--danger)" }}>0 – 49: High Risk</strong>
                  <p style={{ margin: "4px 0 0", fontSize: 12 }}>
                    Reported by multiple users as scam, phishing, or malicious. Do not open or pay.
                  </p>
                </div>
              </div>

              <div style={{ marginTop: "14px" }}>
                <Link
                  href="/trust-scores"
                  className={styles.submitBtn}
                  style={{ textDecoration: "none", display: "inline-flex", width: "auto", padding: "10px 20px" }}
                >
                  <span>View Full Trust Scores Guide →</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUB-SECTION: TERMS & PRIVACY
  // ═══════════════════════════════════════════════════════════════════════════
  if (section === "terms" || section === "privacy") {
    const isTerms = section === "terms";
    return (
      <main className={styles.container}>
        <div className={styles.inner}>
          <div className={styles.subInner}>
            <header className={styles.navBar}>
              <button
                type="button"
                onClick={handleBack}
                className={styles.navBackBtn}
                aria-label="Back"
              >
                <Ionicons name="chevron-back" size={20} />
              </button>
              <h1 className={styles.navTitle}>
                {isTerms ? SECTION_TITLES.terms : SECTION_TITLES.privacy}
              </h1>
              <div className={styles.navSpacer} />
            </header>

            <div className={styles.legalCard}>
              <h2 className={styles.legalSectionTitle}>
                {isTerms ? "Terms of Service" : "Privacy Policy"}
              </h2>
              <p>
                {isTerms
                  ? "By using BinRo, you agree to inspect QR code destinations safely and responsibly. Community reports and ratings reflect aggregated public opinion and heuristics."
                  : "BinRo respects your digital privacy. We do not store sensitive payment credentials. Scan history can be saved locally on your device or cleared at any time."}
              </p>
              <h3 className={styles.legalSectionTitle}>Disclaimer</h3>
              <p>
                Trust scores and safety warnings are for informational purposes only. Users remain solely responsible for any decisions made after scanning or visiting external destinations.
              </p>
              <div style={{ marginTop: "14px" }}>
                <Link
                  href={isTerms ? "/terms" : "/privacy"}
                  className={styles.submitBtn}
                  style={{ textDecoration: "none", display: "inline-flex", width: "auto", padding: "10px 20px" }}
                >
                  <span>Read Full {isTerms ? "Terms of Service" : "Privacy Policy"} →</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUB-SECTION: HISTORY
  // ═══════════════════════════════════════════════════════════════════════════
  if (section === "history") {
    return (
      <main className={styles.container}>
        <div className={styles.inner}>
          <div className={styles.subInner}>
            <header className={styles.navBar}>
              <button
                type="button"
                onClick={handleBack}
                className={styles.navBackBtn}
                aria-label="Back"
              >
                <Ionicons name="chevron-back" size={20} />
              </button>
              <h1 className={styles.navTitle}>Scan History</h1>
              <div className={styles.navSpacer} />
            </header>

            <div className={styles.legalCard} style={{ textAlign: "center", padding: "36px 20px" }}>
              <div className={styles.signInIcon} style={{ margin: "0 auto 12px" }}>
                <Ionicons name="time-outline" size={24} color="var(--primary)" />
              </div>
              <h2 className={styles.legalSectionTitle}>Scan History & Database</h2>
              <p style={{ margin: "0 0 20px", fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                All QR codes you inspect are securely recorded and synchronized with Supabase database. You can review, search, and manage your full history.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "260px", margin: "0 auto" }}>
                <Link
                  href="/history"
                  className={styles.submitBtn}
                  style={{
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    width: "100%",
                  }}
                >
                  <Ionicons name="list-outline" size={18} />
                  <span>Open Scan History</span>
                </Link>
                <Link
                  href="/scanner"
                  style={{
                    fontSize: "13px",
                    color: "var(--primary)",
                    fontWeight: 600,
                    textDecoration: "none",
                    padding: "6px",
                  }}
                >
                  Open Camera Scanner
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN SETTINGS VIEW (1:1 with features/settings/SettingsScreen.tsx)
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

        {dataCleared && (
          <div style={{ padding: "10px 14px", borderRadius: "12px", backgroundColor: "var(--safe-dim)", color: "var(--safe)", fontSize: "13px", fontWeight: 600, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Ionicons name="checkmark-circle" size={16} color="var(--safe)" />
            <span>Local data cleared successfully.</span>
          </div>
        )}

        <div className={styles.settingsLayout}>
          {/* ── COLUMN 1: ACCOUNT, PROFILE, APPEARANCE ── */}
          <div className={styles.settingsColumn}>
            {/* ── ACCOUNT SECTION ── */}
            <section className={styles.section} aria-label="Account">
              <span className={styles.sectionLabel}>ACCOUNT</span>
              {user ? (
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
                      <span className={styles.accountEmail}>{user.email}</span>
                    </div>
                  </div>

                  <div className={styles.divider} />

                  <button
                    type="button"
                    onClick={() => setSection("account")}
                    className={styles.menuItem}
                  >
                    <div className={styles.menuIconWrap}>
                      <Ionicons name="person-outline" size={18} />
                    </div>
                    <div className={styles.menuTextCol}>
                      <span className={styles.menuLabel}>Account Management</span>
                      <span className={styles.menuSublabel}>History, comments, delete account</span>
                    </div>
                    <Ionicons name="chevron-forward" size={16} color="var(--text-muted)" />
                  </button>
                </div>
              ) : (
                <Link
                  href="/login?returnUrl=/settings"
                  className={styles.signInCard}
                >
                  <div className={styles.signInIcon}>
                    <Ionicons name="person-outline" size={22} color="var(--primary)" />
                  </div>
                  <div className={styles.menuTextCol}>
                    <strong className={styles.signInTitle}>Sign in to your account</strong>
                    <span className={styles.signInSub}>Comment, report, and sync history</span>
                  </div>
                  <Ionicons name="chevron-forward" size={18} color="var(--text-muted)" />
                </Link>
              )}
            </section>

            {/* ── PROFILE SECTION (Signed in only) ── */}
            {user && (
              <section className={styles.section} aria-label="Profile">
                <span className={styles.sectionLabel}>PROFILE</span>
                <div className={styles.menuGroup}>
                  <button
                    type="button"
                    onClick={() => setSection("profile")}
                    className={styles.menuItem}
                  >
                    <div className={styles.menuIconWrap}>
                      <Ionicons name="person-circle-outline" size={18} />
                    </div>
                    <div className={styles.menuTextCol}>
                      <span className={styles.menuLabel}>Profile Settings</span>
                      <span className={styles.menuSublabel}>Name and username</span>
                    </div>
                    <Ionicons name="chevron-forward" size={16} color="var(--text-muted)" />
                  </button>
                </div>
              </section>
            )}

            {/* ── APPEARANCE SECTION ── */}
            <section className={styles.section} aria-label="Appearance">
              <span className={styles.sectionLabel}>APPEARANCE</span>
              <div className={styles.menuGroup} style={{ padding: 16 }}>
                <span className={styles.appearanceLabel}>Theme</span>
                <div className={styles.themeRow}>
                  <button
                    type="button"
                    onClick={() => setThemeMode("system")}
                    className={`${styles.themeBtn} ${themeMode === "system" ? styles.themeBtnActive : ""}`}
                    aria-pressed={themeMode === "system"}
                  >
                    <Ionicons name="phone-portrait-outline" size={16} />
                    <span className={styles.themeBtnText}>System</span>
                    {themeMode === "system" && <div className={styles.themeActiveIndicator} />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setThemeMode("light")}
                    className={`${styles.themeBtn} ${themeMode === "light" ? styles.themeBtnActive : ""}`}
                    aria-pressed={themeMode === "light"}
                  >
                    <Ionicons name="sunny-outline" size={16} />
                    <span className={styles.themeBtnText}>Light</span>
                    {themeMode === "light" && <div className={styles.themeActiveIndicator} />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setThemeMode("dark")}
                    className={`${styles.themeBtn} ${themeMode === "dark" ? styles.themeBtnActive : ""}`}
                    aria-pressed={themeMode === "dark"}
                  >
                    <Ionicons name="moon-outline" size={16} />
                    <span className={styles.themeBtnText}>Dark</span>
                    {themeMode === "dark" && <div className={styles.themeActiveIndicator} />}
                  </button>
                </div>
              </div>
            </section>
          </div>

          {/* ── COLUMN 2: HELP, LEGAL, DATA, SIGN OUT ── */}
          <div className={styles.settingsColumn}>
            {/* ── HELP & INFORMATION SECTION ── */}
            <section className={styles.section} aria-label="Help and Information">
              <span className={styles.sectionLabel}>HELP & INFORMATION</span>
              <div className={styles.menuGroup}>
                <button
                  type="button"
                  onClick={() => setSection("guide")}
                  className={styles.menuItem}
                >
                  <div className={styles.menuIconWrap}>
                    <Ionicons name="book-outline" size={18} />
                  </div>
                  <div className={styles.menuTextCol}>
                    <span className={styles.menuLabel}>Manual Guide</span>
                    <span className={styles.menuSublabel}>Step-by-step usage guide</span>
                  </div>
                  <Ionicons name="chevron-forward" size={16} color="var(--text-muted)" />
                </button>

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
                    <span className={styles.menuSublabel}>How safety ratings are calculated</span>
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
                    <span className={styles.menuSublabel}>Report bugs or suggest features</span>
                  </div>
                  <Ionicons name="chevron-forward" size={16} color="var(--text-muted)" />
                </Link>
              </div>
            </section>

            {/* ── LEGAL SECTION ── */}
            <section className={styles.section} aria-label="Legal">
              <span className={styles.sectionLabel}>LEGAL</span>
              <div className={styles.menuGroup}>
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
            </section>

            {/* ── DATA SECTION ── */}
            <section className={styles.section} aria-label="Data">
              <span className={styles.sectionLabel}>DATA</span>
              <div className={styles.menuGroup}>
                <button
                  type="button"
                  onClick={handleClearData}
                  className={styles.menuItem}
                >
                  <div className={`${styles.menuIconWrap} ${styles.menuIconDanger}`}>
                    <Ionicons name="trash-outline" size={18} color="var(--danger)" />
                  </div>
                  <div className={styles.menuTextCol}>
                    <span className={`${styles.menuLabel} ${styles.menuLabelDanger}`}>Clear Local Data</span>
                    <span className={styles.menuSublabel}>Remove scan history from this device</span>
                  </div>
                  <Ionicons name="chevron-forward" size={16} color="var(--text-muted)" />
                </button>
              </div>
            </section>

            {/* ── SIGN OUT BUTTON (Signed in only) ── */}
            {user && (
              <div className={styles.section}>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className={styles.signOutBtn}
                >
                  <Ionicons name="log-out-outline" size={18} color="var(--danger)" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
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
          <div className={styles.inner} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                border: "3px solid rgba(0, 82, 204, 0.2)",
                borderTopColor: "var(--primary)",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
