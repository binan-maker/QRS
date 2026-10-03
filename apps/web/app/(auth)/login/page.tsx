"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Ionicons } from "@/lib/mobile-icons";
import GoogleIcon from "@/lib/google-icon";
import { useAuth } from "@/lib/auth-context";
import styles from "../auth.module.css";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, signInWithGoogle, user } = useAuth();

  const initialEmail = searchParams.get("email") || "";
  const justVerified = searchParams.get("verified") === "true";
  const returnUrl = searchParams.get("returnUrl") || "/";

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // If already logged in, navigate to returnUrl or home
  useEffect(() => {
    if (user) {
      router.replace(returnUrl);
    }
  }, [user, returnUrl, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const newFieldErrors = { email: "", password: "" };
    let hasFieldError = false;

    if (!email.trim()) {
      newFieldErrors.email = "Email address is required.";
      hasFieldError = true;
    }
    if (!password.trim()) {
      newFieldErrors.password = "Password is required.";
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
    setFieldErrors({ email: "", password: "" });
    setLoading(true);

    try {
      await signIn(email.trim(), password);
      router.replace(returnUrl);
    } catch (err: any) {
      const msg = err?.message || "Sign in failed. Please try again.";
      const code = err?.code || "";

      if (
        code === "email_not_confirmed" ||
        msg.toLowerCase().includes("email not confirmed")
      ) {
        router.push(
          `/verify-email?email=${encodeURIComponent(email.trim())}&fromLogin=true`
        );
        return;
      }

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

  const isUserNotFound =
    errorCode === "auth/user-not-found" ||
    error.toLowerCase().includes("user not found") ||
    error.toLowerCase().includes("invalid login credentials");

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        {/* ── Brand Block (Exact match with AuthBrandBlock title="Welcome back") ── */}
        <div className={styles.brandBlock}>
          <div className={styles.brandName}>
            Bin<span className={styles.brandHighlight}>Ro</span>
          </div>
          <div className={styles.brandDivider} />
          <h1 className={styles.pageTitle}>Welcome back</h1>
        </div>

        {/* ── Card (Exact match with mobile LoginScreen.tsx) ── */}
        <div className={styles.card}>
          {justVerified && !error ? (
            <div className={`${styles.banner} ${styles.bannerSafe}`}>
              <div className={styles.bannerRow}>
                <Ionicons name="checkmark-circle-outline" size={14} color="var(--safe)" />
                <p className={styles.bannerText}>
                  Email verified! Please enter your password to sign in.
                </p>
              </div>
            </div>
          ) : null}

          {error ? (
            <div
              className={`${styles.banner} ${
                isUserNotFound ? styles.bannerInfo : styles.bannerDanger
              }`}
            >
              <div className={styles.bannerRow}>
                <Ionicons
                  name={isUserNotFound ? "person-add-outline" : "alert-circle"}
                  size={14}
                  color={isUserNotFound ? "var(--primary)" : "var(--danger)"}
                />
                <p className={styles.bannerText}>{error}</p>
              </div>
              {isUserNotFound && (
                <div className={styles.bannerActionRow}>
                  <Link
                    href={`/register?email=${encodeURIComponent(email)}`}
                    className={`${styles.bannerActionBtn} ${styles.bannerActionPrimary}`}
                  >
                    <Ionicons name="arrow-forward-circle-outline" size={12} />
                    <span>Create an account</span>
                  </Link>
                </div>
              )}
            </div>
          ) : null}

          <form onSubmit={handleLogin} className={styles.inputGroup} noValidate>
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
                  placeholder="Password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: "" }));
                  }}
                  autoComplete="current-password"
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

            <div className={styles.forgotRow}>
              <Link
                href={`/forgot-password?email=${encodeURIComponent(email)}`}
                className={styles.forgotLink}
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className={styles.primaryBtn}
            >
              {loading ? (
                <>
                  <span className={styles.spinner} />
                  <span>Signing In...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          <div className={styles.dividerRow}>
            <div className={styles.dividerLine} />
            <span className={styles.dividerText}>or</span>
            <div className={styles.dividerLine} />
          </div>

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
        </div>

        {/* ── Footer ── */}
        <div className={styles.footer}>
          <span className={styles.footerText}>Don't have an account?</span>
          <Link
            href={`/register${returnUrl !== "/" ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ""}`}
            className={styles.footerLink}
          >
            Sign up
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
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
      <LoginContent />
    </Suspense>
  );
}
