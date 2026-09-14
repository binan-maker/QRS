import Link from "next/link";
import styles from "./profile.module.css";

function PersonIcon({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 20c.6-3.2 2.9-5 6.5-5s5.9 1.8 6.5 5" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m3.5 10.7 8.5-7 8.5 7" />
      <path d="M5.5 9.5v10h13v-10M9.5 19.5v-5h5v5" />
    </svg>
  );
}

function ScanIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 8V5h3M16 5h3v3M19 16v3h-3M8 19H5v-3" />
      <path d="M8 9h8v6H8z" />
    </svg>
  );
}

export default function ProfilePage() {
  return (
    <main className={styles.appFrame}>
      <div className={styles.page}>
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>PROFILE</span>
            <h1>Your profile</h1>
          </div>
          <Link href="/" className={styles.backLink}>Home</Link>
        </header>

        <section className={styles.guestCard} aria-labelledby="guest-title">
          <div className={styles.guestIconRing}>
            <PersonIcon />
          </div>
          <h2 id="guest-title">Not signed in</h2>
          <p>Sign in to view your profile and activity</p>
          <Link href="/auth/login" className={styles.signInButton}>Sign In</Link>
          <Link href="/auth/register" className={styles.createLink}>Create Account</Link>
        </section>

        <nav className={styles.bottomNav} aria-label="Primary navigation">
          <Link href="/" className={styles.navItem}>
            <HomeIcon />
            <span>Home</span>
          </Link>
          <Link href="/scanner" className={styles.navItem}>
            <ScanIcon />
            <span>Scanner</span>
          </Link>
          <Link href="/profile" className={`${styles.navItem} ${styles.navItemActive}`}>
            <PersonIcon size={22} />
            <span>Profile</span>
          </Link>
        </nav>
      </div>
    </main>
  );
}