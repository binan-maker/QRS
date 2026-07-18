import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How It Works — BinRo",
  description:
    "Learn how BinRo protects you from QR code fraud using crowd-sourced reports, AI analysis, and India-specific threat intelligence.",
};

const STEPS = [
  {
    number: "01",
    title: "Scan any QR code",
    description:
      "Open BinRo and point your camera at any QR code — UPI payment, website, WiFi, contact card, or anything else. BinRo supports all standard QR formats.",
    detail:
      "Our camera module works in low light and processes QR codes instantly, even complex BharatQR and EMV payment codes.",
  },
  {
    number: "02",
    title: "Content is decoded and analysed",
    description:
      "BinRo uses 60KB+ of India-specific parsing logic to extract the full intent of the QR — the UPI VPA, bank, IFSC, amount, redirect chain, and more.",
    detail:
      "Supports 80+ Indian payment apps including Paytm, PhonePe, Google Pay, BHIM, and all BharatQR-compliant apps. Works offline for basic analysis.",
  },
  {
    number: "03",
    title: "Trust score computed in real-time",
    description:
      "Every QR receives a trust score based on community reports, scan history, owner verification status, and AI-powered phishing detection.",
    detail:
      "Our collusion-detection algorithm prevents coordinated fake reports from inflating or deflating scores unfairly.",
  },
  {
    number: "04",
    title: "You get a clear verdict",
    description:
      "Safe 🟢, Caution 🟡, or Flagged 🔴 — with a plain-English explanation of why, and a one-tap option to report if you found something wrong.",
    detail:
      "Verdicts are available in English, Hindi, Malayalam, Tamil, and Telugu.",
  },
];

const TRUST_SIGNALS = [
  { label: "Community reports",         icon: "👥", desc: "Weighted by reporter trust level" },
  { label: "Scan volume",               icon: "📈", desc: "High-volume QRs get more scrutiny" },
  { label: "Owner verification",        icon: "✅", desc: "Verified business badge adds trust" },
  { label: "AI phishing detection",     icon: "🤖", desc: "India-specific pattern matching"   },
  { label: "Domain age & reputation",   icon: "🌐", desc: "Via Google Safe Browsing API"      },
  { label: "Collusion detection",       icon: "🔬", desc: "Catches coordinated fake reports"  },
];

export default function HowItWorksPage() {
  return (
    <>
      {/* Header */}
      <section className="bg-gradient-to-b from-gray-50 to-white px-4 py-16 sm:py-20 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            How BinRo keeps you safe
          </h1>
          <p className="mt-4 text-gray-600 text-lg">
            From camera to verdict in under a second — here&apos;s the full picture.
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="bg-white px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-14">
          {STEPS.map((step, i) => (
            <div key={step.number} className="flex gap-6">
              <div className="flex-shrink-0">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-sm">
                  {step.number}
                </span>
                {i < STEPS.length - 1 && (
                  <div className="mx-auto mt-2 h-14 w-px bg-gray-200" />
                )}
              </div>
              <div className="pt-2">
                <h2 className="font-semibold text-gray-900 text-lg">{step.title}</h2>
                <p className="mt-2 text-gray-600">{step.description}</p>
                <p className="mt-2 text-sm text-gray-400">{step.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trust signals */}
      <section className="bg-gray-50 px-4 py-16 sm:py-20 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-gray-900">What goes into the trust score?</h2>
            <p className="mt-3 text-gray-500">Six independent signals combined into one verdict.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TRUST_SIGNALS.map((s) => (
              <div key={s.label} className="flex gap-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
                <span className="text-2xl flex-shrink-0">{s.icon}</span>
                <div>
                  <p className="font-medium text-gray-900 text-sm">{s.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white px-4 py-14 sm:px-6 text-center">
        <h2 className="text-xl font-bold text-gray-900">Ready to scan smarter?</h2>
        <p className="mt-3 text-gray-500 text-sm">Free to download. No account needed for basic scanning.</p>
        <Link
          href="https://play.google.com/store"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          Download BinRo — Free
        </Link>
      </section>
    </>
  );
}
