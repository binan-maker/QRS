import Link from "next/link";
import styles from "./home.module.css";

function Icon({
  name,
  size = 20,
}: {
  name: "home" | "scan" | "person" | "login" | "arrow" | "qr";
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "home") {
    return (
      <svg {...common}>
        <path d="m3.5 10.7 8.5-7 8.5 7" />
        <path d="M5.5 9.5v10h13v-10M9.5 19.5v-5h5v5" />
      </svg>
    );
  }

  if (name === "person") {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5.5 20c.6-3.2 2.9-5 6.5-5s5.9 1.8 6.5 5" />
      </svg>
    );
  }

  if (name === "login") {
    return (
      <svg {...common}>
        <path d="M14 5h4.2c1 0 1.8.8 1.8 1.8v10.4c0 1-.8 1.8-1.8 1.8H14" />
        <path d="M11 8l4 4-4 4M15 12H3.5" />
      </svg>
    );
  }

  if (name === "arrow") {
    return (
      <svg {...common}>
        <path d="M5 12h13M13 6l6 6-6 6" />
      </svg>
    );
  }

  if (name === "qr") {
    return (
      <svg {...common}>
        <path d="M5 8V5h3M16 5h3v3M19 16v3h-3M8 19H5v-3" />
        <path d="M8 9h8v6H8zM11 11h2v2h-2zM16 18h3M18 15v3" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M5 8V5h3M16 5h3v3M19 16v3h-3M8 19H5v-3" />
      <path d="M8 9h8v6H8z" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <main className={styles.appFrame}>
      <div className={styles.page}>
        <header className={styles.header}>
          <div className={styles.welcome}>
            <span className={styles.welcomeTitle}>Welcome</span>
            <span className={styles.welcomeSubtitle}>Stay safe with every scan</span>
          </div>
          <Link href="/auth/login" className={styles.signInPill}>
            <Icon name="login" size={16} />
            <span>Sign In</span>
          </Link>
        </header>

        <section className={styles.scanHero} aria-labelledby="scan-title">
          <div className={styles.heroGlow} />
          <div className={styles.heroGlowSmall} />
          <div className={styles.heroArc} />
          <div className={styles.heroTopRow}>
            <div className={styles.qrIconRing}>
              <div className={styles.qrIconBg}>
                <Icon name="qr" size={36} />
              </div>
            </div>
            <div className={styles.heroCopy}>
              <span className={styles.heroBrand}>BinRo</span>
              <h1 id="scan-title">Scan QR Code</h1>
            </div>
            <Link href="/scanner" className={styles.heroArrow} aria-label="Open scanner">
              <Icon name="arrow" size={18} />
            </Link>
          </div>
          <p>BinRo — Know Before You Scan</p>
        </section>

        <section className={styles.emptyState} aria-labelledby="empty-title">
          <div className={styles.emptyIconArea}>
            <div className={styles.emptyRing} />
            <div className={styles.emptyIconBox}>
              <Icon name="qr" size={34} />
            </div>
          </div>
          <h2 id="empty-title">No scans yet</h2>
          <p>Scan smarter. Stay safe.</p>
          <Link href="/scanner" className={styles.scanButton}>
            <Icon name="scan" size={16} />
            <span>Scan QR Code</span>
          </Link>
        </section>

        <nav className={styles.bottomNav} aria-label="Primary navigation">
          <Link href="/" className={`${styles.navItem} ${styles.navItemActive}`}>
            <Icon name="home" size={22} />
            <span>Home</span>
          </Link>
          <Link href="/scanner" className={styles.navItem}>
            <Icon name="scan" size={22} />
            <span>Scanner</span>
          </Link>
          <Link href="/profile" className={styles.navItem}>
            <Icon name="person" size={22} />
            <span>Profile</span>
          </Link>
        </nav>
      </div>
    </main>
  );
}