"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Ionicons } from "@/lib/mobile-icons";
import GoogleIcon from "@/lib/google-icon";
import { useAuth } from "@/lib/auth-context";
import { validateEmail } from "@shared/utils/email-validator";
import styles from "../auth.module.css";

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signUp, signInWithGoogle, user } = useAuth();

  const initialEmail = searchParams.get("email") || "";
  const returnUrl = searchParams.get("returnUrl") || "/";
  const initialRef = (searchParams.get("ref") || "").trim().toLowerCase();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [referralCode, setReferralCode] = useState(initialRef);
  const [isReferralEditing, setIsReferralEditing] = useState(false);
  const [isReferralExpanded, setIsReferralExpanded] = useState(false);
  const [tempReferralInput, setTempReferralInput] = useState("");
  const [referralValidating, setReferralValidating] = useState(false);
  const [referralError, setReferralError] = useState("");
  const [editReferralInput, setEditReferralInput] = useState("");
  const [editValidating, setEditValidating] = useState(false);
  const [editError, setEditError] = useState("");
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  useEffect(() => {
    if (initialRef) {
      setReferralCode(initialRef);
      setTempReferralInput(initialRef);
      setEditReferralInput(initialRef);
      try {
        localStorage.setItem("binro_pending_referral_code", initialRef);
        localStorage.setItem("binro_pending_referral_code_v1", initialRef);
      } catch {}
    } else if (typeof window !== "undefined") {
      try {
        const cached =
          localStorage.getItem("binro_pending_referral_code") ||
          localStorage.getItem("binro_pending_referral_code_v1");
        if (cached && !referralCode) {
          const c = cached.trim().toLowerCase();
          setReferralCode(c);
          setTempReferralInput(c);
          setEditReferralInput(c);
        }
      } catch {}
    }
  }, [initialRef]);

  const verifyReferralCodeOnServer = async (code: string): Promise<{ valid: boolean; code?: string; error?: string }> => {
    try {
      const res = await fetch("/api/referral/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (res.ok) {
        const data = await res.json();
        return data;
      }
      return { valid: false, error: "Invalid referral code." };
    } catch {
      return { valid: false, error: "Unable to verify code." };
    }
  };

  const handleApplyReferral = async (rawInput: string) => {
    const clean = rawInput.trim().replace(/[^a-zA-Z0-9]/g, "").slice(0, 7).toLowerCase();
    if (clean.length !== 7) {
      setReferralError("Referral code must be 7 characters.");
      return;
    }

    setReferralValidating(true);
    setReferralError("");

    try {
      const result = await verifyReferralCodeOnServer(clean);
      if (result.valid) {
        setReferralCode(clean);
        setEditReferralInput(clean);
        setIsReferralExpanded(false);
        setReferralError("");
        try {
          localStorage.setItem("binro_pending_referral_code", clean);
          localStorage.setItem("binro_pending_referral_code_v1", clean);
        } catch {}
      } else {
        setReferralError(result.error || "Invalid referral code.");
      }
    } catch {
      setReferralError("Invalid referral code.");
    } finally {
      setReferralValidating(false);
    }
  };

  const handleApplyEditReferral = async (rawInput: string) => {
    const clean = rawInput.trim().replace(/[^a-zA-Z0-9]/g, "").slice(0, 7).toLowerCase();

    // If user cleared the input and taps Apply, remove/clear the referral code cleanly
    if (!clean) {
      setReferralCode("");
      setTempReferralInput("");
      setEditReferralInput("");
      setIsReferralEditing(false);
      setEditError("");
      try {
        localStorage.removeItem("binro_pending_referral_code");
        localStorage.removeItem("binro_pending_referral_code_v1");
      } catch {}
      return;
    }

    if (clean.length !== 7) {
      setEditError("Referral code must be 7 characters.");
      return;
    }

    setEditValidating(true);
    setEditError("");

    try {
      const result = await verifyReferralCodeOnServer(clean);
      if (result.valid) {
        setReferralCode(clean);
        setEditReferralInput(clean);
        setIsReferralEditing(false);
        setEditError("");
        try {
          localStorage.setItem("binro_pending_referral_code", clean);
          localStorage.setItem("binro_pending_referral_code_v1", clean);
        } catch {}
      } else {
        setEditError(result.error || "Invalid referral code.");
      }
    } catch {
      setEditError("Invalid referral code.");
    } finally {
      setEditValidating(false);
    }
  };

  const handleRemoveReferral = () => {
    setReferralCode("");
    setTempReferralInput("");
    setEditReferralInput("");
    setIsReferralEditing(false);
    setReferralError("");
    setEditError("");
    try {
      localStorage.removeItem("binro_pending_referral_code");
      localStorage.removeItem("binro_pending_referral_code_v1");
    } catch {}
  };

  useEffect(() => {
    if (user && !verificationSent) {
      router.replace(returnUrl);
    }
  }, [user, verificationSent, returnUrl, router]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const newFieldErrors = { name: "", email: "", password: "" };
    let hasFieldError = false;

    if (!displayName.trim()) {
      newFieldErrors.name = "Name is required.";
      hasFieldError = true;
    }

    if (!email.trim()) {
      newFieldErrors.email = "Email address is required.";
      hasFieldError = true;
    } else {
      const emailCheck = validateEmail(email.trim());
      if (!emailCheck.valid) {
        newFieldErrors.email = emailCheck.reason || "Please use a real email address.";
        hasFieldError = true;
      }
    }

    if (!password.trim()) {
      newFieldErrors.password = "Password is required.";
      hasFieldError = true;
    } else if (password.length < 8) {
      newFieldErrors.password = "Password must be at least 8 characters.";
      hasFieldError = true;
    } else if (!/(?=.*[0-9])/.test(password)) {
      newFieldErrors.password = "Password must contain at least one number.";
      hasFieldError = true;
    }

    if (hasFieldError) {
      setFieldErrors(newFieldErrors);
      setError("");
      setErrorCode("");
      return;
    }

    setError("");
    setErrorCode("");
    setFieldErrors({ name: "", email: "", password: "" });
    const trimmedEmail = email.trim();

    // 1. Instant check if email already exists
    let exists = false;
    try {
      const checkRes = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      if (checkRes.ok) {
        const json = await checkRes.json();
        exists = Boolean(json.exists);
      }
    } catch {}

    if (exists) {
      setErrorCode("auth/email-already-in-use");
      setError(""); // No duplicate upper banner; message is below email text box
      setFieldErrors((p) => ({
        ...p,
        email: "This user already exists. Please use sign in.",
      }));
      setLoading(false);
      return;
    }

    try {
      const res = await signUp(trimmedEmail, password, displayName.trim());
      const trimmedRef = referralCode.trim().toLowerCase();
      if (trimmedRef && res.user?.id) {
        try {
          const { applyReferralCodeForUser } = await import("@services/rewards");
          await applyReferralCodeForUser(res.user.id, trimmedRef);
        } catch {}
      }
      if (res.session) {
        router.replace(returnUrl);
        return;
      }
      setVerificationSent(true);
    } catch (err: any) {
      const code = err?.code || "";
      const msg = err?.message || "Sign up failed. Please try again.";

      const isAlready =
        code === "auth/email-already-in-use" ||
        code === "user_already_exists" ||
        msg.toLowerCase().includes("already registered") ||
        msg.toLowerCase().includes("already in use") ||
        msg.toLowerCase().includes("already exist");

      if (isAlready) {
        setErrorCode("auth/email-already-in-use");
        setError(""); // No duplicate upper banner; message is below email text box
        setFieldErrors((p) => ({
          ...p,
          email: "This user already exists. Please use sign in.",
        }));
      } else {
        setErrorCode(code);
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Listen for message from Google OAuth popup callback
  useEffect(() => {
    const handleAuthMessage = (event: MessageEvent) => {
      if (typeof window === "undefined") return;
      if (event.data?.type === "SUPABASE_OAUTH_SUCCESS") {
        setGoogleLoading(false);
        router.replace(returnUrl);
      } else if (event.data?.type === "SUPABASE_OAUTH_ERROR") {
        setGoogleLoading(false);
        setError(event.data?.error || "Google sign-in was cancelled or failed.");
      }
    };
    window.addEventListener("message", handleAuthMessage);
    return () => window.removeEventListener("message", handleAuthMessage);
  }, [router, returnUrl]);

  const handleGoogleSignIn = async () => {
    setError("");
    setErrorCode("");
    setGoogleLoading(true);
    try {
      const trimmedRef = referralCode.trim().toLowerCase();
      if (trimmedRef) {
        try {
          localStorage.setItem("binro_pending_referral_code", trimmedRef);
          localStorage.setItem("binro_pending_referral_code_v1", trimmedRef);
        } catch {}
      }
      const data = await signInWithGoogle();
      if (!data?.url) {
        throw new Error("Unable to initialize Google Sign-in.");
      }

      // Calculate center popup coordinates
      const width = 500;
      const height = 650;
      const left =
        typeof window !== "undefined"
          ? window.screenX + (window.outerWidth - width) / 2
          : 0;
      const top =
        typeof window !== "undefined"
          ? window.screenY + (window.outerHeight - height) / 2
          : 0;

      const popup = window.open(
        data.url,
        "binro_google_oauth",
        `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
      );

      if (!popup) {
        // Fallback if browser completely blocked popups
        window.location.href = data.url;
        return;
      }

      // Monitor popup: if user closes the tab/popup, stop loading immediately
      const checkClosedTimer = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(checkClosedTimer);
          setGoogleLoading(false);
        }
      }, 350);

      // Safety timeout after 90 seconds
      setTimeout(() => {
        clearInterval(checkClosedTimer);
        setGoogleLoading(false);
      }, 90000);
    } catch (err: any) {
      setError(err?.message || "Google sign-in failed. Please try again.");
      setGoogleLoading(false);
    }
  };

  const isDupEmail =
    errorCode === "auth/email-already-in-use" ||
    errorCode === "user_already_exists" ||
    error.toLowerCase().includes("already registered") ||
    error.toLowerCase().includes("already in use") ||
    error.toLowerCase().includes("already exist");

  if (verificationSent) {
    return (
      <main className={styles.page}>
        <div className={styles.inner}>
          <div className={styles.card}>
            <div className={styles.successContainer}>
              <div className={styles.successOrb}>
                <Ionicons name="mail-open-outline" size={38} color="var(--safe)" />
              </div>
              <h1 className={styles.successTitle}>Check your inbox</h1>
              <p className={styles.successBody}>
                We sent a verification link to
                <br />
                <span className={styles.successEmailHighlight}>{email}</span>
                <br />
                <br />
                Tap the link to activate your account, then sign in.
              </p>

              <Link
                href={`/login?email=${encodeURIComponent(email)}`}
                className={styles.primaryBtn}
                style={{ textDecoration: "none" }}
              >
                Go to Sign In
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        {/* ── Brand Block (Exact match with AuthBrandBlock title="Create an account") ── */}
        <div className={styles.brandBlock}>
          <div className={styles.brandName}>
            Bin<span className={styles.brandHighlight}>Ro</span>
          </div>
          <div className={styles.brandDivider} />
          <h1 className={styles.pageTitle}>Create an account</h1>
        </div>

        {/* ── Card (Exact match with mobile RegisterScreen.tsx) ── */}
        <div className={styles.card}>
          {/* Upper banner only for general non-field errors */}
          {error && !fieldErrors.email && !fieldErrors.password && !fieldErrors.name ? (
            <div className={`${styles.banner} ${styles.bannerDanger}`}>
              <div className={styles.bannerRow}>
                <Ionicons name="alert-circle" size={14} color="var(--danger)" />
                <p className={styles.bannerText}>{error}</p>
              </div>
            </div>
          ) : null}

          {/* Google Button first, exactly matching mobile */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className={styles.googleBtn}
          >
            {googleLoading ? (
              <>
                <span className={`${styles.spinner} ${styles.spinnerPrimary}`} />
                <span>Connecting to Google...</span>
              </>
            ) : (
              <>
                <GoogleIcon size={18} />
                <span>Continue with Google</span>
              </>
            )}
          </button>

          <div className={styles.dividerRow}>
            <div className={styles.dividerLine} />
            <span className={styles.dividerText}>or with email</span>
            <div className={styles.dividerLine} />
          </div>

          <form onSubmit={handleRegister} className={styles.inputGroup} noValidate>
            {/* Full Name */}
            <div className={styles.inputFieldWrapper}>
              <div
                className={`${styles.inputContainer} ${
                  fieldErrors.name ? styles.inputContainerError : ""
                }`}
              >
                <span className={styles.inputIcon}>
                  <Ionicons name="person-outline" size={18} />
                </span>
                <input
                  type="text"
                  placeholder="Full name"
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: "" }));
                  }}
                  autoCapitalize="words"
                  autoComplete="name"
                  className={styles.input}
                  disabled={loading}
                />
              </div>
              {fieldErrors.name && (
                <span className={styles.fieldError}>{fieldErrors.name}</span>
              )}
            </div>

            {/* Email Address */}
            <div className={styles.inputFieldWrapper}>
              <div
                className={`${styles.inputContainer} ${
                  fieldErrors.email ? styles.inputContainerError : ""
                }`}
              >
                <span className={styles.inputIcon}>
                  <Ionicons name="mail-outline" size={18} />
                </span>
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEmail(val);
                    if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: "" }));
                    if (val.includes("@") && val.includes(".")) {
                      const check = validateEmail(val.trim());
                      if (!check.valid && (check.reason?.includes("invalid") || check.reason?.includes("Temporary"))) {
                        setFieldErrors((p) => ({
                          ...p,
                          email: check.reason || "This email address is invalid. Temporary and disposable emails are not allowed.",
                        }));
                      }
                    }
                  }}
                  onBlur={() => {
                    if (email.trim()) {
                      const check = validateEmail(email.trim());
                      if (!check.valid) {
                        setFieldErrors((p) => ({
                          ...p,
                          email: check.reason || "This email address is invalid. Temporary and disposable emails are not allowed.",
                        }));
                      }
                    }
                  }}
                  autoCapitalize="none"
                  autoComplete="email"
                  className={styles.input}
                  disabled={loading}
                />
              </div>
              {fieldErrors.email && (
                <span className={styles.fieldError}>
                  <Ionicons name="alert-circle" size={13} color="var(--danger)" />
                  <span>{fieldErrors.email}</span>
                  {isDupEmail && (
                    <Link
                      href={`/login?email=${encodeURIComponent(email)}`}
                      style={{
                        marginLeft: 6,
                        fontWeight: 700,
                        textDecoration: "underline",
                        color: "var(--primary)",
                      }}
                    >
                      Sign In
                    </Link>
                  )}
                </span>
              )}
            </div>

            {/* Password */}
            <div className={styles.inputFieldWrapper}>
              <div
                className={`${styles.inputContainer} ${
                  fieldErrors.password ? styles.inputContainerError : ""
                }`}
              >
                <span className={styles.inputIcon}>
                  <Ionicons name="lock-closed-outline" size={18} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password (min. 8 chars + number)"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: "" }));
                  }}
                  autoComplete="new-password"
                  className={styles.input}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={styles.toggleBtn}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={18}
                  />
                </button>
              </div>
              {fieldErrors.password && (
                <span className={styles.fieldError}>{fieldErrors.password}</span>
              )}
            </div>

            {/* ── Referral Section (Repositioned, Professional, Database-Verified & 7-char limit) ── */}
            {referralCode ? (
              <div className={styles.referralAppliedCard}>
                <div className={styles.referralAppliedMeta}>
                  <div className={styles.referralCodeGroup}>
                    <span className={styles.referralCodeLabel}>Referral Code:</span>
                    <span className={styles.referralCodeValue}>{referralCode.toUpperCase()}</span>
                  </div>
                  <span className={styles.referralAppliedGreenBadge}>
                    <svg
                      className={styles.referralCheckSvg}
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path
                        d="M13.3334 4L6.00008 11.3333L2.66675 8"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className={styles.referralAppliedBadgeText}>Applied</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsReferralEditing(!isReferralEditing);
                    setEditError("");
                    setEditReferralInput(referralCode.toUpperCase());
                  }}
                  className={styles.referralChangeBtn}
                  aria-label={isReferralEditing ? "Cancel editing referral code" : "Change referral code"}
                >
                  {isReferralEditing ? "Cancel" : "Change"}
                </button>
              </div>
            ) : (
              <div className={styles.referralAccordionWrapper}>
                <button
                  type="button"
                  onClick={() => {
                    setIsReferralExpanded(!isReferralExpanded);
                    setReferralError("");
                  }}
                  className={styles.referralExpandTrigger}
                >
                  <Ionicons name="pricetag-outline" size={14} color="var(--primary)" />
                  <span>Have a referral code? (Optional)</span>
                  <Ionicons
                    name={isReferralExpanded ? "chevron-up" : "chevron-down"}
                    size={12}
                    color="var(--text-muted)"
                  />
                </button>

                {isReferralExpanded && (
                  <div className={styles.referralInputGroup}>
                    <div
                      className={`${styles.referralInputPill} ${
                        referralError ? styles.referralInputPillError : ""
                      }`}
                    >
                      <input
                        type="text"
                        placeholder="Enter 7-character code (e.g. KRZRYN4)"
                        value={tempReferralInput.toUpperCase()}
                        maxLength={7}
                        onChange={(e) => {
                          const sanitized = e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 7);
                          setTempReferralInput(sanitized);
                          if (referralError) setReferralError("");
                        }}
                        className={styles.referralInputField}
                        disabled={referralValidating}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleApplyReferral(tempReferralInput)}
                        disabled={tempReferralInput.trim().length !== 7 || referralValidating}
                        className={styles.referralApplyModernBtn}
                      >
                        {referralValidating ? (
                          <>
                            <span className={styles.referralApplySpinner} />
                            <span>Checking...</span>
                          </>
                        ) : (
                          <span>Apply</span>
                        )}
                      </button>
                    </div>

                    {referralError ? (
                      <span className={styles.referralInlineError}>
                        <Ionicons name="alert-circle" size={13} color="var(--danger)" />
                        <span>{referralError}</span>
                      </span>
                    ) : tempReferralInput.length > 0 && tempReferralInput.length < 7 ? (
                      <span className={styles.referralCharHint}>
                        Code must be 7 characters ({tempReferralInput.length}/7)
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
            )}

            {/* In-place edit block when user clicks "Change" */}
            {referralCode && isReferralEditing && (
              <div className={styles.referralInputGroup} style={{ marginTop: "2px" }}>
                <div
                  className={`${styles.referralInputPill} ${
                    editError ? styles.referralInputPillError : ""
                  }`}
                >
                  <input
                    type="text"
                    placeholder="New 7-character code"
                    value={editReferralInput.toUpperCase()}
                    maxLength={7}
                    onChange={(e) => {
                      const sanitized = e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 7);
                      setEditReferralInput(sanitized);
                      if (editError) setEditError("");
                    }}
                    className={styles.referralInputField}
                    disabled={editValidating}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyEditReferral(editReferralInput)}
                    disabled={
                      (editReferralInput.trim().length > 0 && editReferralInput.trim().length !== 7) ||
                      editValidating
                    }
                    className={styles.referralApplyModernBtn}
                  >
                    {editValidating ? (
                      <>
                        <span className={styles.referralApplySpinner} />
                        <span>Checking...</span>
                      </>
                    ) : (
                      <span>Apply</span>
                    )}
                  </button>
                </div>

                {editError && (
                  <span className={styles.referralInlineError}>
                    <Ionicons name="alert-circle" size={13} color="var(--danger)" />
                    <span>{editError}</span>
                  </span>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || googleLoading}
              className={styles.primaryBtn}
            >
              {loading ? (
                <>
                  <span className={styles.spinner} />
                  <span>Creating account...</span>
                </>
              ) : (
                <span>Create Account</span>
              )}
            </button>
          </form>
        </div>

        {/* ── Footer ── */}
        <div className={styles.footer}>
          <span className={styles.footerText}>Already have an account?</span>
          <Link
            href={`/login${returnUrl !== "/" ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ""}`}
            className={styles.footerLink}
          >
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.page}>
          <div className={styles.inner} style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh" }}>
            <span className={`${styles.spinner} ${styles.spinnerPrimary}`} />
          </div>
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
