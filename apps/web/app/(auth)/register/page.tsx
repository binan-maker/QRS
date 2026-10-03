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

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

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
    setLoading(true);

    try {
      const res = await signUp(email.trim(), password, displayName.trim());
      if (res.session) {
        router.replace(returnUrl);
        return;
      }
      setVerificationSent(true);
    } catch (err: any) {
      const code = err?.code || "";
      const msg = err?.message || "Sign up failed. Please try again.";
      setErrorCode(code);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setErrorCode("");
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err?.message || "Google sign-in failed. Please try again.");
      setGoogleLoading(false);
    }
  };

  const isDupEmail =
    errorCode === "auth/email-already-in-use" ||
    errorCode === "user_already_exists" ||
    error.toLowerCase().includes("already registered") ||
    error.toLowerCase().includes("already in use");

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
          {error ? (
            <div
              className={`${styles.banner} ${
                isDupEmail ? styles.bannerWarning : styles.bannerDanger
              }`}
            >
              <div className={styles.bannerRow}>
                <Ionicons
                  name="alert-circle"
                  size={14}
                  color={isDupEmail ? "var(--warning)" : "var(--danger)"}
                />
                <p className={styles.bannerText}>{error}</p>
              </div>
              {isDupEmail && (
                <div className={styles.bannerActionRow}>
                  <Link
                    href={`/login?email=${encodeURIComponent(email)}`}
                    className={`${styles.bannerActionBtn} ${styles.bannerActionPrimary}`}
                  >
                    Sign In
                  </Link>
                  <Link
                    href={`/forgot-password?email=${encodeURIComponent(email)}`}
                    className={`${styles.bannerActionBtn} ${styles.bannerActionSecondary}`}
                  >
                    Forgot Password?
                  </Link>
                </div>
              )}
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
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: "" }));
                  }}
                  autoCapitalize="none"
                  autoComplete="email"
                  className={styles.input}
                  disabled={loading}
                />
              </div>
              {fieldErrors.email && (
                <span className={styles.fieldError}>{fieldErrors.email}</span>
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
