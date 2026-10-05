"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Ionicons } from "@/lib/mobile-icons";
import GoogleIcon from "@/lib/google-icon";
import { useAuth } from "@/lib/auth-context";
import { getWebSupabase } from "@/lib/supabase";
import { validateEmail } from "@shared/utils/email-validator";
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

  // If email verification established an active session in background, route directly
  useEffect(() => {
    if (justVerified) {
      const supabase = getWebSupabase();
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          router.replace(returnUrl);
        }
      });
    }
  }, [justVerified, returnUrl, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const newFieldErrors = { email: "", password: "" };
    let hasFieldError = false;

    if (!email.trim()) {
      newFieldErrors.email = "Email address is required.";
      hasFieldError = true;
    } else {
      const emailCheck = validateEmail(email.trim());
      if (!emailCheck.valid) {
        newFieldErrors.email = emailCheck.reason || "This email address is invalid.";
        hasFieldError = true;
      }
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

    const trimmedEmail = email.trim();
    try {
      await signIn(trimmedEmail, password);
      router.replace(returnUrl);
    } catch (err: any) {
      const msg = err?.message || "";
      const code = err?.code || "";

      if (
        code === "email_not_confirmed" ||
        msg.toLowerCase().includes("email not confirmed")
      ) {
        router.push(
          `/verify-email?email=${encodeURIComponent(trimmedEmail)}&fromLogin=true`
        );
        return;
      }

      if (msg.toLowerCase().includes("permanently deleted")) {
        setErrorCode("auth/user-not-found");
        setError("");
        setFieldErrors((p) => ({
          ...p,
          email: "You are not signed up. Please sign up.",
        }));
        return;
      }

      // Check if user email is in active signup list / database
      let userExists = false;
      try {
        const checkRes = await fetch("/api/auth/check-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmedEmail }),
        });
        if (checkRes.ok) {
          const json = await checkRes.json();
          userExists = Boolean(json.exists);
        }
      } catch {}

      if (!userExists) {
        const supabase = getWebSupabase();
        const { data: userInDb } = await supabase
          .from("users")
          .select("id")
          .ilike("email", trimmedEmail)
          .eq("is_deleted", false)
          .maybeSingle();
        if (userInDb) userExists = true;
      }

      if (userExists) {
        // User is in the database: password was incorrect (display only below password field)
        setErrorCode("auth/wrong-password");
        setError("");
        setFieldErrors((p) => ({ ...p, password: "Your password is incorrect." }));
      } else {
        // User does not exist in the database (display only below email field)
        setErrorCode("auth/user-not-found");
        setError("");
        setFieldErrors((p) => ({ ...p, email: "You are not signed up. Please sign up." }));
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

  const isUserNotFound = errorCode === "auth/user-not-found";

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

          {/* Upper banner only for general non-field errors */}
          {error && !fieldErrors.email && !fieldErrors.password ? (
            <div className={`${styles.banner} ${styles.bannerDanger}`}>
              <div className={styles.bannerRow}>
                <Ionicons name="alert-circle" size={14} color="var(--danger)" />
                <p className={styles.bannerText}>{error}</p>
              </div>
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
                    const val = e.target.value;
                    setEmail(val);
                    if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: "" }));
                    if (val.includes("@") && val.includes(".")) {
                      const check = validateEmail(val.trim());
                      if (!check.valid && (check.reason?.includes("invalid") || check.reason?.includes("Temporary"))) {
                        setFieldErrors((p) => ({ ...p, email: check.reason || "This email address is invalid." }));
                      }
                    }
                  }}
                  onBlur={() => {
                    if (email.trim()) {
                      const check = validateEmail(email.trim());
                      if (!check.valid) {
                        setFieldErrors((p) => ({
                          ...p,
                          email: check.reason || "This email address is invalid.",
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
                  {isUserNotFound && (
                    <Link
                      href={`/register?email=${encodeURIComponent(email)}`}
                      style={{
                        marginLeft: 6,
                        fontWeight: 700,
                        textDecoration: "underline",
                        color: "var(--primary)",
                      }}
                    >
                      Sign Up
                    </Link>
                  )}
                </span>
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
                <span className={styles.fieldError}>
                  <Ionicons name="alert-circle" size={13} color="var(--danger)" />
                  <span>{fieldErrors.password}</span>
                </span>
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
