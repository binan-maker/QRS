import Link from "next/link";
import styles from "./home.module.css";

const appDownloadUrl =
  "https://play.google.com/store/apps/details?id=com.qrguard.app";

export default function HomePage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="BinRo home">
          <span className={styles.brandGlyph} aria-hidden="true">
            B
          </span>
          <span>BinRo</span>
        </Link>
        <span className={styles.status}>
          <span className={styles.statusDot} />
          Public QR safety checks
        </span>
      </header>

      <section className={styles.hero} aria-labelledby="home-title">
        <p className={styles.eyebrow}>BINRO WEB</p>
        <h1 id="home-title">
          Check a shared QR link
          <em> before you open it.</em>
        </h1>
        <p className={styles.intro}>
          BinRo gives people a clear view of a public QR destination and its
          community safety signals. Open a shared verification link to begin.
        </p>
        <div className={styles.actions}>
          <Link href={appDownloadUrl} className={styles.primaryButton}>
            Get the BinRo app
            <span aria-hidden="true">↗</span>
          </Link>
          <span className={styles.hint}>
            QR verification links use the format{" "}
            <code>/qr/your-code</code>
          </span>
        </div>
      </section>

      <section className={styles.infoGrid} aria-label="How BinRo works">
        <article className={styles.infoCard}>
          <span className={styles.number}>01</span>
          <h2>Open the shared link</h2>
          <p>
            A BinRo QR link identifies the code in the address and loads the
            matching public record.
          </p>
        </article>
        <article className={styles.infoCard}>
          <span className={styles.number}>02</span>
          <h2>Review the destination</h2>
          <p>
            See the destination, activity, and available community trust
            signals without opening it automatically.
          </p>
        </article>
        <article className={styles.infoCard}>
          <span className={styles.number}>03</span>
          <h2>Choose what to do</h2>
          <p>
            Continue only when the destination looks right, or use the app to
            report and add context.
          </p>
        </article>
      </section>

      <footer className={styles.footer}>
        <span>BinRo public verification</span>
        <span>Your safety comes before speed.</span>
      </footer>
    </main>
  );
}