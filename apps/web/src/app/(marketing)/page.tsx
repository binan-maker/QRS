import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "BinRo — QR Code Trust Platform",
  description:
    "Scan any QR code and know instantly if it's safe. Crowd-sourced fraud detection and AI-powered security for India's UPI ecosystem.",
};

// ─── Static stats ─────────────────────────────────────────────────────────────
const STATS = [
  { value: "80+",   label: "Payment apps supported" },
  { value: "60KB+", label: "UPI parsing logic"       },
  { value: "5",     label: "Indian languages"         },
  { value: "Real-time", label: "Fraud detection"     },
];

// ─── Feature cards ────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: "🛡️",
    title: "Instant Trust Score",
    desc: "Every QR gets a safety verdict in under a second — safe, caution, or flagged — using crowd-sourced reports and AI analysis.",
  },
  {
    icon: "🔍",
    title: "Deep UPI Parsing",
    desc: "60KB+ of India-specific BharatQR/UPI parsing logic. We decode what other scanners miss — BBPS, EMV, IFSC, VPA validation.",
  },
  {
    icon: "👥",
    title: "Community Reports",
    desc: "Millions of scans power a living threat database. When one user spots a scam, everyone is protected — instantly.",
  },
  {
    icon: "📊",
    title: "Dynamic QR Management",
    desc: "Create QR codes whose destination you can update anytime. Set scan limits, expiry dates, and monitor analytics in real time.",
  },
  {
    icon: "🌐",
    title: "Works Offline",
    desc: "Core threat patterns are cached on your device. BinRo protects you even without a data connection.",
  },
  {
    icon: "🔒",
    title: "Privacy First",
    desc: "No personal data sold. Scan history stays on your device. Community reports are anonymised before aggregation.",
  },
];

// ─── How it works steps ───────────────────────────────────────────────────────
const STEPS = [
  {
    step: "1",
    title: "Scan the QR code",
    desc: "Open BinRo and point your camera at any QR code — payment, link, WiFi, or contact.",
  },
  {
    step: "2",
    title: "Instant analysis",
    desc: "BinRo cross-checks the content against live threat patterns, community reports, and AI analysis.",
  },
  {
    step: "3",
    title: "Act with confidence",
    desc: "Get a clear safe / caution / flagged verdict. Tap through safely or report the scam in one tap.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 to-white px-4 py-20 sm:py-28 sm:px-6">
        {/* Background decoration */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-10"
        >
          <div className="h-[600px] w-[600px] rounded-full bg-blue-400 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-3xl text-center">
          <span className="inline-block rounded-full bg-blue-100 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-blue-700">
            India&apos;s QR Security Platform
          </span>

          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            Scan any QR code.
            <br />
            <span className="text-blue-600">Know if it&apos;s safe.</span>
          </h1>

          <p className="mt-5 text-lg text-gray-600 max-w-xl mx-auto">
            QR scams cost Indians ₹1,000+ crore every year. BinRo gives you a
            real-time trust score before you tap Pay — powered by crowd-sourced
            reports and AI fraud detection.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="https://play.google.com/store"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3.18 23.76a2.4 2.4 0 0 0 2.74-.26l13.57-7.84-3.31-3.31L3.18 23.76zm-1.8-20.5v17.48l9.4-8.74L1.38 3.26zm20.45 7.62L17.26 7.8 13.76 11.3l3.5 3.5 4.57-2.64a1.6 1.6 0 0 0 0-2.78zM5.92.5a2.4 2.4 0 0 0-2.74-.26L16.21 12.3l3.3-3.3L5.92.5z" />
              </svg>
              Download on Android
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3.5 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors"
            >
              How it works
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────────────────── */}
      <section className="border-y border-gray-100 bg-white px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-4xl grid grid-cols-2 gap-6 sm:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-extrabold text-blue-600">{s.value}</p>
              <p className="mt-1 text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="bg-white px-4 py-16 sm:py-20 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              Safe in three steps
            </h2>
            <p className="mt-3 text-gray-500">No setup, no account needed for basic scanning.</p>
          </div>

          <div className="relative grid gap-8 sm:grid-cols-3">
            {/* Connector line (desktop) */}
            <div
              aria-hidden
              className="absolute top-5 left-1/6 right-1/6 hidden h-px bg-gray-200 sm:block"
              style={{ left: "calc(16.67% + 20px)", right: "calc(16.67% + 20px)" }}
            />

            {STEPS.map((s) => (
              <div key={s.step} className="relative flex flex-col items-center text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-sm z-10">
                  {s.step}
                </div>
                <h3 className="mt-4 font-semibold text-gray-900">{s.title}</h3>
                <p className="mt-2 text-sm text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features grid ─────────────────────────────────────────────────── */}
      <section className="bg-gray-50 px-4 py-16 sm:py-20 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              Built for India&apos;s payment ecosystem
            </h2>
            <p className="mt-3 text-gray-500 max-w-xl mx-auto">
              Every feature is designed around the real-world threat landscape facing
              Indian consumers and merchants every day.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100 hover:shadow-md transition-shadow"
              >
                <span className="text-2xl" role="img" aria-label={f.title}>{f.icon}</span>
                <h3 className="mt-3 font-semibold text-gray-900">{f.title}</h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="bg-blue-600 px-4 py-16 sm:py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Stop guessing. Start scanning smart.
          </h2>
          <p className="mt-4 text-blue-100 text-sm max-w-md mx-auto">
            Join hundreds of thousands of users who trust BinRo to protect their
            digital payments every day.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="https://play.google.com/store"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
            >
              Download Free — Android
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-400 px-6 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              View pricing
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
