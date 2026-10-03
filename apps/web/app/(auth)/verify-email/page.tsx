"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Ionicons } from "@/lib/mobile-icons";
import { useAuth } from "@/lib/auth-context";
import styles from "../auth.module.css";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, signOut, resendVerification, refreshUser } = useAuth();

  const emailParam = searchParams.get("email") || "";
  const fromLogin = searchParams.get("fromLogin") === "true";
  const email = emailParam || user?.email || "";

  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState("");
  const [checkingVerification, setCheckingVerification] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (user?.email_confirmed_at) {
      router.replace("/");
    }
  }, [user, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (resending || cooldown > 0 || !email) return;
    setResendError("");
    setResendSuccess(false);
    setResending(true);

    try {
      await resendVerification(email);
      setResendSuccess(true);
      setCooldown(60);
    } catch (err: any) {
      setResendError(err?.message || "Failed to resend. Please try again.");
    } finally {
      setResending(false);
    }
  };

  const handleCheckVerified = async () => {
    setCheckingVerification(true);
    setResendError("");

    try {
      const freshUser = await refreshUser();
      if (freshUser?.email_confirmed_at) {
        router.replace("/");
        return;
      }

      if (email) {
        router.push(`/login?email=${encodeURIComponent(email)}&verified=true`);
        return;
      }

      setResendError("Email not yet verified. Please check your inbox and tap the link.");
    } catch {
      setResendError("Could not check verification status. Please try again.");
    } finally {
      setCheckingVerification(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.card}>
          <div className={styles.successContainer}>
            <div className={`${styles.successOrb} ${styles.successOrbPrimary}`}>
              <Ionicons name="mail-open-outline" size={38} color="var(--primary)" />
            </div>

            <h1 className={styles.successTitle}>Verify your email</h1>

            <p className={styles.successBody}>
              {fromLogin
                ? `Your account isn't verified yet. Tap "Resend email" below to get a fresh link sent to`
                : "We sent a verification link to"}
              <br />
              <span className={styles.successEmailHighlight}>
                {email || "your email address"}
              </span>
              <br />
              <br />
              {fromLogin
                ? `Click the link in that email, then tap "I've verified my email" to sign in.`
                : "Tap the link in that email to activate your account, then come back and tap the button below."}
            </p>

            {resendSuccess ? (
              <div className={`${styles.banner} ${styles.bannerSafe}`} style={{ width: "100%" }}>
                <div className={styles.bannerRow}>
                  <Ionicons name="checkmark-circle-outline" size={14} color="var(--safe)" />
                  <p className={styles.bannerText}>
                    Verification email sent. Check your inbox.
                  </p>
                </div>
              </div>
            ) : null}

            {resendError ? (
              <div className={`${styles.banner} ${styles.bannerDanger}`} style={{ width: "100%" }}>
                <div className={styles.bannerRow}>
                  <Ionicons name="alert-circle-outline" size={14} color="var(--danger)" />
                  <p className={styles.bannerText}>{resendError}</p>
                </div>
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleCheckVerified}
              disabled={checkingVerification}
              className={styles.primaryBtn}
            >
              {checkingVerification ? (
                <>
                  <span className={styles.spinner} />
                  <span>Checking...</span>
                </>
              ) : (
                <>
                  <Ionicons name="checkmark-done-outline" size={16} />
                  <span>I've verified my email</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={resending || cooldown > 0}
              className={styles.secondaryOutlineBtn}
            >
              {resending ? (
                <>
                  <span className={`${styles.spinner} ${styles.spinnerPrimary}`} />
                  <span>Resending...</span>
                </>
              ) : (
                <>
                  <Ionicons name="refresh-outline" size={15} />
                  <span>
                    {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend email"}
                  </span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              className={styles.textLinkBtn}
            >
              Use a different account
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
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
      <VerifyEmailContent />
    </Suspense>
  );
}
