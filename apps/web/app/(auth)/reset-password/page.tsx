"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ionicons } from "@/lib/mobile-icons";
import { useAuth } from "@/lib/auth-context";
import { getWebSupabase } from "@/lib/supabase";
import styles from "../auth.module.css";

function ResetPasswordContent() {
  const router = useRouter();
  const { updatePassword, user } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [linkExpired, setLinkExpired] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);

  useEffect(() => {
    // Parse URL hash / params for Supabase recovery token or errors
    if (typeof window === "undefined") return;

    const hash = window.location.hash;
    const search = window.location.search;

    // Check for errors like otp_expired or access_denied
    if (
      hash.includes("error=access_denied") ||
      hash.includes("otp_expired") ||
      search.includes("error=access_denied") ||
      search.includes("otp_expired")
    ) {
      setLinkExpired(true);
      setError("This reset link has expired or has already been used. Please request a new one.");
      setCheckingLink(false);
      return;
    }

    // If active session exists or token is being restored
    const supabase = getWebSupabase();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setCheckingLink(false);
      } else {
        // Listen briefly for session to settle from hash
        const { data: authSub } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === "PASSWORD_RECOVERY" || session) {
            setCheckingLink(false);
          }
        });

        // Safety fallback timeout
        const timer = setTimeout(() => {
          setCheckingLink(false);
        }, 1200);

        return () => {
          authSub.subscription.unsubscribe();
          clearTimeout(timer);
        };
      }
    });
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const newFieldErrors = { password: "", confirmPassword: "" };
    let hasFieldError = false;

    if (!password.trim()) {
      newFieldErrors.password = "New password is required.";
      hasFieldError = true;
    } else if (password.length < 8) {
      newFieldErrors.password = "Password must be at least 8 characters.";
      hasFieldError = true;
    } else if (!/(?=.*[0-9])/.test(password)) {
      newFieldErrors.password = "Password must contain at least one number.";
      hasFieldError = true;
    }

    if (!confirmPassword.trim()) {
      newFieldErrors.confirmPassword = "Confirm your password.";
      hasFieldError = true;
    } else if (password !== confirmPassword) {
      newFieldErrors.confirmPassword = "Passwords do not match.";
      hasFieldError = true;
    }

    if (hasFieldError) {
      setFieldErrors(newFieldErrors);
      setError("");
      return;
    }

    setError("");
    setFieldErrors({ password: "", confirmPassword: "" });
    setLoading(true);

    try {
      await updatePassword(password);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || "Failed to update password. Your reset session may have expired.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className={styles.page}>
        <div className={styles.inner}>
          <div className={styles.card}>
            <div className={styles.successContainer}>
              <div className={styles.successOrb}>
                <Ionicons name="checkmark-circle-outline" size={38} color="var(--safe)" />
              </div>
              <h1 className={styles.successTitle}>Password Updated!</h1>
              <p className={styles.successBody}>
                Your password has been changed successfully. You can now sign in with your new credentials.
              </p>
              <Link
                href="/login"
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
        {/* ── Top Bar ── */}
        <header className={styles.navBar}>
          <button
            type="button"
            onClick={() => router.push("/login")}
            className={styles.backBtn}
            aria-label="Back to Sign In"
          >
            <Ionicons name="chevron-back" size={20} />
          </button>
          <span className={styles.navTitle}>Set New Password</span>
          <div className={styles.navSpacer} aria-hidden="true" />
        </header>

        {/* ── Brand Block ── */}
        <div className={styles.brandBlock}>
          <div className={styles.brandName}>
            Bin<span className={styles.brandHighlight}>Ro</span>
          </div>
          <div className={styles.brandDivider} />
          <h1 className={styles.pageTitle}>Create new password</h1>
          <p className={styles.pageSubtitle}>
            Choose a strong password with at least 8 characters and a number.
          </p>
        </div>

        {/* ── Card ── */}
        <div className={styles.card}>
          {checkingLink ? (
            <div className={styles.successContainer} style={{ padding: "40px 0" }}>
              <span className={`${styles.spinner} ${styles.spinnerPrimary}`} />
              <p className={styles.pageSubtitle}>Verifying your reset link...</p>
            </div>
          ) : linkExpired ? (
            <div className={styles.successContainer}>
              <div className={`${styles.banner} ${styles.bannerWarning}`} style={{ width: "100%" }}>
                <div className={styles.bannerRow}>
                  <Ionicons name="alert-circle-outline" size={18} />
                  <p className={styles.bannerText}>
                    This password reset link has expired or has already been used.
                  </p>
                </div>
              </div>
              <p className={styles.successBody}>
                For your security, password reset links expire shortly after they are sent.
              </p>
              <Link
                href="/forgot-password"
                className={styles.primaryBtn}
                style={{ textDecoration: "none" }}
              >
                Request a New Reset Link
              </Link>
              <Link href="/login" className={styles.textLinkBtn}>
                <Ionicons name="arrow-back" size={15} />
                <span>Back to Sign In</span>
              </Link>
            </div>
          ) : (
            <>
              {error ? (
                <div className={`${styles.banner} ${styles.bannerDanger}`}>
                  <div className={styles.bannerRow}>
                    <Ionicons name="alert-circle-outline" size={16} />
                    <p className={styles.bannerText}>{error}</p>
                  </div>
                </div>
              ) : null}

              <form onSubmit={handleUpdatePassword} className={styles.inputGroup} noValidate>
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
                      placeholder="New password (min. 8 chars + number)"
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

                <div className={styles.inputFieldWrapper}>
                  <div
                    className={`${styles.inputContainer} ${
                      fieldErrors.confirmPassword ? styles.inputContainerError : ""
                    }`}
                  >
                    <span className={styles.inputIcon}>
                      <Ionicons name="lock-closed-outline" size={18} />
                    </span>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (fieldErrors.confirmPassword) {
                          setFieldErrors((p) => ({ ...p, confirmPassword: "" }));
                        }
                      }}
                      autoComplete="new-password"
                      className={styles.input}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className={styles.toggleBtn}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      <Ionicons
                        name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                        size={18}
                      />
                    </button>
                  </div>
                  {fieldErrors.confirmPassword && (
                    <span className={styles.fieldError}>{fieldErrors.confirmPassword}</span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={styles.primaryBtn}
                >
                  {loading ? (
                    <>
                      <span className={styles.spinner} />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <span>Set New Password</span>
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        <div className={styles.footer}>
          <Link href="/login" className={styles.textLinkBtn}>
            <Ionicons name="arrow-back" size={15} />
            <span>Back to Sign In</span>
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
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
      <ResetPasswordContent />
    </Suspense>
  );
}
