"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { getWebAuth } from "../../lib/firebase";
import styles from "./profile.module.css";

function Icon({ name, size = 24 }: { name: "home" | "scan" | "user"; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (name === "home") return <svg {...common}><path d="m3.5 10.5 8.5-7 8.5 7" /><path d="M5.5 9.5v10h13v-10M9.5 19.5v-5h5v5" /></svg>;
  if (name === "scan") return <svg {...common}><path d="M4 9V5h4M16 5h4v4M20 15v4h-4M8 19H4v-4" /><path d="M9 9h6v6H9z" /></svg>;
  return <svg {...common}><circle cx="12" cy="8" r="3.2" /><path d="M5.5 20c.6-3.2 2.9-5 6.5-5s5.9 1.8 6.5 5" /></svg>;
}

function NavBar() {
  return <nav className={styles.bottomNav} aria-label="Primary navigation">
    <Link href="/" className={styles.navItem}><Icon name="home" /><span>Home</span></Link>
    <Link href="/scanner" className={styles.navItem}><Icon name="scan" /><span>Scan</span></Link>
    <Link href="/profile" className={`${styles.navItem} ${styles.navItemActive}`}><Icon name="user" /><span>Profile</span></Link>
  </nav>;
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
    try {
      const unsubscribe = onAuthStateChanged(getWebAuth(), (nextUser) => { setUser(nextUser); setLoading(false); });
      fallbackTimer = setTimeout(() => setLoading(false), 1200);
      return () => {
        if (fallbackTimer) clearTimeout(fallbackTimer);
        unsubscribe();
      };
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Web Firebase is not configured.");
      setLoading(false);
    }
  }, []);

  async function handleSignOut() {
    try { await signOut(getWebAuth()); setUser(null); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to sign out."); }
  }

  return (
    <main className={styles.appFrame}>
      <div className={styles.page}>
        {loading ? <section className={styles.guestCard}><p className={styles.loading}>Checking your session…</p></section> : user ? (
          <section className={styles.guestCard}>
            <div className={styles.guestIconRing}><Icon name="user" size={45} /></div>
            <h1>{user.displayName || "BinRo member"}</h1><p>{user.email}</p>
            <span className={styles.memberBadge}>{user.emailVerified ? "Email verified" : "Email verification pending"}</span>
            <button type="button" className={styles.signInButton} onClick={handleSignOut}>Sign Out</button>
          </section>
        ) : (
          <section className={styles.guestCard} aria-labelledby="guest-title">
            <div className={styles.guestIconRing}><Icon name="user" size={45} /></div>
            <h1 id="guest-title">Not signed in</h1>
            <p>Sign in to view your profile and activity</p>
            <Link href="/auth/login" className={styles.signInButton}>Sign In</Link>
            <Link href="/auth/register" className={styles.createLink}>Create Account</Link>
          </section>
        )}
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
      </div>
      <NavBar />
    </main>
  );
}