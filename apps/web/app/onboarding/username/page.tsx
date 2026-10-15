"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Ionicons } from "@/lib/mobile-icons";
import { sanitizeUsername, validateUsername } from "@shared/utils/username-rules";
import styles from "./onboarding.module.css";

function generateCleanSuggestions(seed: string): string[] {
  const clean = seed
    .toLowerCase()
    .replace(/[^a-z0-9\s_]/g, "")
    .trim();
  const tokens = clean.split(/[\s_]+/).filter(Boolean);

  const first = (tokens[0] || "user").slice(0, 10);
  const second = (tokens[1] || "").slice(0, 8);

  const candidates: string[] = [];

  if (first && second) {
    candidates.push(sanitizeUsername(`${first}_${second}`).slice(0, 20));
    candidates.push(sanitizeUsername(`${first}${second}`).slice(0, 20));
  } else if (first) {
    candidates.push(sanitizeUsername(first).slice(0, 20));
  }

  candidates.push(sanitizeUsername(`${first}_binro`).slice(0, 20));
  candidates.push(sanitizeUsername(`${first}_eco`).slice(0, 20));

  return Array.from(new Set(candidates))
    .filter((h) => h.length >= 3 && h.length <= 20)
    .slice(0, 4);
}

export default function OnboardingUsernamePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, loading: authLoading, claimUsername, signOut } = useAuth();

  const rawReturnUrl = searchParams.get("returnUrl") || "/";
  const returnUrl = rawReturnUrl.startsWith("/onboarding") ? "/" : rawReturnUrl;

  const [handleInput, setHandleInput] = useState("");
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState("");
  const [status, setStatus] = useState<{
    available: boolean;
    error?: string | null;
    checked: boolean;
  }>({ available: false, checked: false });

  // Prevent navigating backwards away from onboarding checkpoint
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.history.pushState(null, "", window.location.href);

    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Auth gate check
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (profile?.username && profile.username.trim() !== "") {
      router.replace(returnUrl);
    }
  }, [user, profile, authLoading, router, returnUrl]);

  // Derive identity suggestions from metadata or email
  const seedName = useMemo(() => {
    return (
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.user_metadata?.display_name ||
      user?.email?.split("@")[0] ||
      "eco"
    );
  }, [user]);

  const suggestions = useMemo(() => {
    return generateCleanSuggestions(seedName);
  }, [seedName]);

  // Real-time handle verification (debounced 250ms)
  useEffect(() => {
    const trimmed = sanitizeUsername(handleInput);
    if (!trimmed) {
      setStatus({ available: false, checked: false, error: null });
      setChecking(false);
      return;
    }

    const val = validateUsername(trimmed);
    if (!val.valid) {
      setStatus({
        available: false,
        error: "3–20 characters, lowercase letters, numbers, or underscores",
        checked: true,
      });
      setChecking(false);
      return;
    }

    setChecking(true);
    setGeneralError("");

    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/user/check-username", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: trimmed,
            currentUserId: user?.id,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.available) {
            setStatus({ available: true, checked: true });
          } else {
            setStatus({
              available: false,
              error: `@${trimmed} is already taken`,
              checked: true,
            });
          }
        } else {
          setStatus({ available: false, error: "Unable to verify handle right now.", checked: true });
        }
      } catch {
        setStatus({ available: false, error: "Network error checking availability.", checked: true });
      } finally {
        setChecking(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [handleInput, user?.id]);

  const handlePickSuggestion = (candidate: string) => {
    setGeneralError("");
    setHandleInput(candidate);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = sanitizeUsername(handleInput);
    if (!clean) return;

    const val = validateUsername(clean);
    if (!val.valid) {
      setGeneralError("Must be 3–20 characters, lowercase letters, numbers, or underscores");
      return;
    }

    if (!status.available || !status.checked) {
      return;
    }

    setSubmitting(true);
    setGeneralError("");

    try {
      const result = await claimUsername(clean);
      if (!result.success) {
        if (result.error?.includes("23505") || result.error?.toLowerCase().includes("claimed")) {
          setGeneralError("Someone just claimed this handle. Please choose another.");
        } else {
          setGeneralError(result.error || "Failed to claim handle. Please try another.");
        }
        setStatus({ available: false, checked: true, error: result.error });
        return;
      }

      router.replace(returnUrl);
    } catch (err: any) {
      setGeneralError(err?.message || "Failed to claim handle. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  const isFormValid = handleInput.length >= 3 && status.available && !checking;

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        {/* BinRo Authentic Brand Header */}
        <header className={styles.brandBlock}>
          <div className={styles.brandName}>
            Bin<span className={styles.brandHighlight}>Ro</span>
          </div>
          <div className={styles.brandDivider} aria-hidden="true" />
          <h1 className={styles.pageTitle}>Choose your handle</h1>
          <p className={styles.pageSubtitle}>
            Your unique identity across BinRo
          </p>
        </header>

        {/* Focused Card */}
        <div className={styles.card}>
          <form onSubmit={handleSubmit} noValidate>
            {/* Input Row */}
            <div
              className={`${styles.inputContainer} ${
                status.checked && status.available
                  ? styles.inputValid
                  : status.checked && !status.available && handleInput
                  ? styles.inputError
                  : ""
              }`}
            >
              <span className={styles.atPrefix} aria-hidden="true">
                @
              </span>
              <input
                id="handle-input"
                type="text"
                value={handleInput}
                onChange={(e) => {
                  setHandleInput(sanitizeUsername(e.target.value));
                  if (generalError) setGeneralError("");
                }}
                placeholder="username"
                autoCapitalize="none"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                maxLength={20}
                className={styles.input}
                disabled={submitting}
                autoFocus
                aria-label="Handle"
              />

              {/* Minimal inline indicator */}
              <div className={styles.statusSlot}>
                {checking && <span className={styles.miniSpinner} aria-hidden="true" />}
                {!checking && status.checked && handleInput && (
                  status.available ? (
                    <Ionicons name="checkmark-circle" size={18} color="var(--safe)" />
                  ) : (
                    <Ionicons name="close-circle" size={18} color="var(--danger)" />
                  )
                )}
              </div>
            </div>

            {/* Subtle Feedback & URL Preview */}
            <div className={styles.feedbackRow} role="status" aria-live="polite">
              {generalError ? (
                <span className={styles.dangerText}>{generalError}</span>
              ) : status.checked && handleInput ? (
                status.available ? (
                  <span className={styles.previewText}>
                    binro.in/@{handleInput}
                  </span>
                ) : (
                  <span className={styles.dangerText}>
                    {status.error || "Username unavailable"}
                  </span>
                )
              ) : (
                <span className={styles.hintText}>
                  3–20 characters, lowercase letters, numbers, or underscores
                </span>
              )}
            </div>

            {/* Quick Suggestions Chips */}
            {suggestions.length > 0 && (
              <div className={styles.suggestionsContainer}>
                <span className={styles.suggestionsLabel}>Suggestions</span>
                <div className={styles.chipsRow}>
                  {suggestions.map((suggestion) => {
                    const isSelected = handleInput === suggestion;
                    return (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => handlePickSuggestion(suggestion)}
                        className={`${styles.chip} ${isSelected ? styles.chipSelected : ""}`}
                      >
                        @{suggestion}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Clean Primary Button */}
            <button
              type="submit"
              disabled={submitting || checking || !isFormValid}
              className={styles.primaryButton}
            >
              {submitting ? (
                <span>Claiming handle...</span>
              ) : (
                <>
                  <span>Continue</span>
                  <Ionicons name="arrow-forward" size={16} color="#ffffff" />
                </>
              )}
            </button>
          </form>

          {/* Footer Action */}
          <div className={styles.footerRow}>
            <button
              type="button"
              onClick={handleSignOut}
              className={styles.signOutButton}
            >
              Log in with a different account
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
