"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { getWebSupabase } from "../../lib/supabase";
import styles from "./auth.module.css";

type Mode = "login" | "register";

function authMessage(error: unknown) {
  const code = (error as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "invalid_credentials":
      return "Email or password is incorrect.";
    case "auth/email-already-in-use":
    case "user_already_exists":
      return "An account already exists with this email.";
    case "auth/weak-password":
    case "weak_password":
      return "Use a stronger password.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait and try again.";
    case "email_not_confirmed":
      return "Please verify your email before signing in.";
    default:
      return error instanceof Error
        ? error.message
        : "Something went wrong. Please try again.";
  }
}

export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const isRegister = mode === "register";
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (isRegister && displayName.trim().length < 2) {
      setError("Enter your name so your profile can be created.");
      return;
    }
    if (isRegister && password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const supabase = getWebSupabase();
      if (isRegister) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              display_name: displayName.trim(),
              full_name: displayName.trim(),
            },
          },
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          router.push("/profile");
        } else {
          setMessage("Account created. Check your email to verify it, then sign in.");
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        router.push("/profile");
      }
    } catch (caught) {
      setError(authMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <div className={styles.brand} aria-label="BinRo">
          <div className={styles.brandMark}>B</div>
          <div className={styles.brandName}>BinRo</div>
        </div>

        <section className={styles.card}>
          <div className={styles.appNotice}><span>↗</span><p><strong>Get more with the BinRo app</strong><small>Download the app to unlock community features.</small></p></div>
          <h1>{isRegister ? "Create your account" : "Welcome back"}</h1>
          <p className={styles.subtitle}>
            {isRegister
              ? "Create a BinRo account to keep your activity and profile in sync."
              : "Sign in to view your profile and activity."}
          </p>

          {message ? <p className={styles.success}>{message}</p> : null}
          {error ? <p className={styles.error} role="alert">{error}</p> : null}

          <form className={styles.form} onSubmit={handleSubmit}>
            {isRegister ? (
              <div className={styles.field}>
                <label htmlFor="display-name">Name</label>
                <input id="display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" required />
              </div>
            ) : null}
            <div className={styles.field}>
              <label htmlFor="email">Email</label>
              <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
            </div>
            <div className={styles.field}>
              <label htmlFor="password">Password</label>
              <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={isRegister ? "new-password" : "current-password"} minLength={6} required />
            </div>
            {isRegister ? (
              <div className={styles.field}>
                <label htmlFor="confirm-password">Confirm password</label>
                <input id="confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={6} required />
              </div>
            ) : (
              <Link className={styles.secondaryLink} href="/auth/forgot-password">Forgot password?</Link>
            )}
            <button className={styles.primaryButton} type="submit" disabled={busy}>
              {busy ? "Please wait…" : isRegister ? "Create Account" : "Sign In"}
            </button>
          </form>

          <p className={styles.footer}>
            {isRegister ? "Already have an account?" : "New to BinRo?"}
            <Link className={styles.footerLink} href={isRegister ? "/auth/login" : "/auth/register"}>
              {isRegister ? "Sign In" : "Create Account"}
            </Link>
          </p>
        </section>

        <Link className={styles.backHome} href="/">Back to home</Link>
      </div>
    </main>
  );
}