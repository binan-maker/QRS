"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Ionicons } from "@/lib/mobile-icons";
import { useAuth } from "@/lib/auth-context";
import { validateEmail } from "@shared/utils/email-validator";
import styles from "../auth.module.css";

const COOLDOWN_SECONDS = 60;

function ForgotPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { sendPasswordReset } = useAuth();

  const initialEmail = searchParams.get("email") || "";
  const [email, setEmail] = useState(initialEmail);
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Debounce tracking ref
  const lastActionTimeRef = useRef<number>(0);

  // Check remaining rate-limiting cooldown from sessionStorage on load or email change
  useEffect(() => {
    if (typeof window === "undefined" || !email) return;
    try {
      const storageKey = `binro_pwd_reset_${email.trim().toLowerCase()}`;
      const savedExpiry = sessionStorage.getItem(storageKey);
      if (savedExpiry) {
        const remaining = Math.ceil((parseInt(savedExpiry, 10) - Date.now()) / 1000);
        if (remaining > 0) {
          setCooldown(remaining);
        } else {
          sessionStorage.removeItem(storageKey);
        }
      }
    } catch {
      // sessionStorage unavailable
    }
  }, [email]);

  // Countdown timer effect
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const activateCooldown = useCallback((targetEmail: string) => {
    setCooldown(COOLDOWN_SECONDS);
    try {
      const storageKey = `binro_pwd_reset_${targetEmail.trim().toLowerCase()}`;
      sessionStorage.setItem(storageKey, String(Date.now() + COOLDOWN_SECONDS * 1000));
    } catch {
      // sessionStorage unavailable
    }
  }, []);

  const handleReset = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Debounce check: prevent double clicks within 1500ms
    const now = Date.now();
    if (now - lastActionTimeRef.current < 1500) {
      return;
    }
    lastActionTimeRef.current = now;

    setEmailError("");

    if (!email.trim()) {
      setEmailError("Email address is required.");
      return;
    }

    const emailCheck = validateEmail(email.trim());
    if (!emailCheck.valid) {
      setEmailError(emailCheck.reason || "Please enter a valid email address.");
      return;
    }

    // Rate-limiting check: if cooldown is active, prevent API request
    if (cooldown > 0) {
      setEmailError(`Please wait ${cooldown}s before requesting another reset.`);
      return;
    }

    setLoading(true);
    try {
      await sendPasswordReset(email.trim());
    } catch {
      // Intentionally swallow all errors — always show success to prevent email enumeration attacks
    } finally {
      setLoading(false);
      activateCooldown(email.trim());
      setSent(true);
    }
  };

  const handleResend = async () => {
    // Debounce check
    const now = Date.now();
    if (now - lastActionTimeRef.current < 1500) {
      return;
    }
    lastActionTimeRef.current = now;

    // Rate-limiting check
    if (resending || cooldown > 0 || !email.trim()) return;

    setResending(true);
    try {
      await sendPasswordReset(email.trim());
    } catch {
      // Swallowed intentionally
    } finally {
      setResending(false);
      activateCooldown(email.trim());
    }
  };

  if (sent) {
    return (
      <main className={styles.page}>
        <div className={styles.inner}>
          <div className={styles.card}>
            <div className={styles.successContainer}>
              <div className={styles.successOrb}>
                <Ionicons name="checkmark-circle" size={42} color="var(--safe)" />
              </div>
              <h1 className={styles.successTitle}>Check your inbox</h1>
              <p className={styles.successBody}>
                A reset link was sent to
                <br />
                <span className={styles.successEmailHighlight}>{email}</span>
                <br />
                <br />
                Follow the link to set a new password.
              </p>

              <Link
                href="/login"
                className={styles.primaryBtn}
                style={{ textDecoration: "none" }}
              >
                Back to Sign In
              </Link>

              {/* Debounced & Rate-limited Resend button */}
              <button
                type="button"
                onClick={handleResend}
                disabled={resending || cooldown > 0}
                className={styles.secondaryOutlineBtn}
                aria-label={cooldown > 0 ? `Resend link in ${cooldown} seconds` : "Resend reset link"}
              >
                {resending ? (
                  <>
                    <span className={`${styles.spinner} ${styles.spinnerPrimary}`} />
                    <span>Sending...</span>
                  </>
                ) : cooldown > 0 ? (
                  <span>Resend link in {cooldown}s</span>
                ) : (
                  <span>Resend reset link</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setSent(false);
                  setEmail("");
                }}
                className={styles.textLinkBtn}
              >
                Try a different email
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        {/* ── Brand Block (Exact match with AuthBrandBlock.tsx) ── */}
        <div className={styles.brandBlock}>
          <div className={styles.brandName}>
            Bin<span className={styles.brandHighlight}>Ro</span>
          </div>
          <div className={styles.brandDivider} />
          <h1 className={styles.pageTitle}>Reset password</h1>
          <p className={styles.pageSubtitle}>
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        {/* ── Card (Exact match with makeAuthStyles card) ── */}
        <div className={styles.card}>
          <form onSubmit={handleReset} className={styles.inputGroup} noValidate>
            <div className={styles.inputFieldWrapper}>
              <div
                className={`${styles.inputContainer} ${
                  emailError ? styles.inputContainerError : ""
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
                    if (emailError) setEmailError("");
                  }}
                  autoCapitalize="none"
                  autoComplete="email"
                  className={styles.input}
                  disabled={loading}
                />
              </div>
              {emailError && (
                <span className={styles.fieldError}>{emailError}</span>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || cooldown > 0}
              className={styles.primaryBtn}
            >
              {loading ? (
                <>
                  <span className={styles.spinner} />
                  <span>Sending...</span>
                </>
              ) : cooldown > 0 ? (
                <span>Resend link in {cooldown}s</span>
              ) : (
                <span>Send Reset Link</span>
              )}
            </button>
          </form>
        </div>

        <div className={styles.footer}>
          <Link href="/login" className={styles.textLinkBtn}>
            <Ionicons name="arrow-back" size={13} />
            <span>Back to Sign In</span>
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function ForgotPasswordPage() {
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
      <ForgotPasswordContent />
    </Suspense>
  );
}
