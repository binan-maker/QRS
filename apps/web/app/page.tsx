import Link from "next/link";
import styles from "./home.module.css";

function Icon({ name, size = 22 }: { name: "arrow" | "scan" | "home" | "user" | "qr"; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (name === "arrow") return <svg {...common}><path d="M5 12h13M13 6l6 6-6 6" /></svg>;
  if (name === "home") return <svg {...common}><path d="m3.5 10.5 8.5-7 8.5 7" /><path d="M5.5 9.5v10h13v-10M9.5 19.5v-5h5v5" /></svg>;
  if (name === "user") return <svg {...common}><circle cx="12" cy="8" r="3.2" /><path d="M5.5 20c.6-3.2 2.9-5 6.5-5s5.9 1.8 6.5 5" /></svg>;
  if (name === "qr") return <svg {...common}><path d="M4 9V5h4M15 5h4v4M19 15v4h-4M8 19H4v-4" /><path d="M9 9h6v6H9z" /></svg>;
  return <svg {...common}><path d="M4 9V5h4M15 5h4v4M19 15v4h-4M8 19H4v-4" /><path d="M9 9h6v6H9z" /></svg>;
}

function NavBar() {
  return (
    <nav className={styles.bottomNav} aria-label="Primary navigation">
      <Link href="/" className={`${styles.navItem} ${styles.navItemActive}`}><Icon name="home" /><span>Home</span></Link>
      <Link href="/scanner" className={styles.navItem}><Icon name="scan" /><span>Scan</span></Link>
      <Link href="/profile" className={styles.navItem}><Icon name="user" /><span>Profile</span></Link>
    </nav>
  );
}

export default function HomePage() {
  return (
    <main className={styles.appFrame}>
      <div className={styles.page}>
        <header className={styles.header}>
          <h1>Welcome</h1>
          <Link href="/download" className={styles.signIn}><span aria-hidden="true">↪</span> Sign In</Link>
        </header>

        <section className={`${styles.scanHero} page-enter`} aria-labelledby="scan-hero-title">
          <div className={styles.heroIcon}><Icon name="qr" size={42} /></div>
          <div className={styles.heroCopy}>
            <strong id="scan-hero-title">BinRo</strong>
            <span>Scan QR Code</span>
            <small>BinRo — Know Before You Scan</small>
          </div>
          <Link href="/scanner" className={styles.heroArrow} aria-label="Open scanner"><Icon name="arrow" size={24} /></Link>
          <span className={styles.heroOrbOne} aria-hidden="true" />
          <span className={styles.heroOrbTwo} aria-hidden="true" />
        </section>

        <section className={`${styles.recentSection} page-enter delay-1`} aria-labelledby="recent-title">
          <h2 id="recent-title"><span /> Recent Scans</h2>
          <div className={styles.emptyCard}>
            <div className={styles.emptyIcon}><Icon name="qr" size={42} /></div>
            <h3>No scans yet</h3>
            <p>Scan smarter. Stay safe.</p>
            <Link href="/scanner" className={styles.scanButton}><Icon name="scan" size={18} /> Scan QR Code</Link>
          </div>
        </section>
      </div>
      <NavBar />
    </main>
  );
}