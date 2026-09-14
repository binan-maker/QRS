"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { getWebAuth } from "../../../lib/firebase";
import styles from "../auth.module.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await sendPasswordResetEmail(getWebAuth(), email.trim());
      setSent(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to send the reset email.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <div className={styles.brand}>
          <div className={styles.brandName}>Bin<span>Ro</span></div>
          <div className={styles.brandRule} />
        </div>
        <section className={styles.card}>
          <h1>Reset your password</h1>
          <p className={styles.subtitle}>Enter your account email and we’ll send you a reset link.</p>
          {sent ? <p className={styles.success}>Check your inbox for the password reset link.</p> : null}
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          {!sent ? (
            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.field}>
                <label htmlFor="reset-email">Email</label>
                <input id="reset-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
              </div>
              <button className={styles.primaryButton} type="submit" disabled={busy}>
                {busy ? "Sending…" : "Send Reset Link"}
              </button>
            </form>
          ) : null}
          <p className={styles.footer}><Link className={styles.footerLink} href="/auth/login">Back to Sign In</Link></p>
        </section>
        <Link className={styles.backHome} href="/">Back to guest home</Link>
      </div>
    </main>
  );
}