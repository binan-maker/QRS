import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About BinRo",
  description:
    "BinRo is an India-first QR security startup supported by Kerala Startup Mission. Learn about our mission to protect Indian consumers from QR fraud.",
};

const VALUES = [
  {
    icon: "🇮🇳",
    title: "India First",
    desc: "Every feature is built for India's payment ecosystem — BharatQR, UPI, BBPS, and the 80+ apps Indians use every day.",
  },
  {
    icon: "🔐",
    title: "Security Without Compromise",
    desc: "We use ECDSA response signing, server-side collusion detection, and zero-trust API design. Security isn't an afterthought.",
  },
  {
    icon: "🌍",
    title: "Open Community",
    desc: "Our threat database is powered by real users reporting real scams. The more we share, the safer everyone is.",
  },
  {
    icon: "🚀",
    title: "Privacy by Design",
    desc: "No personal data sold. Scan history stays on your device. Community reports are anonymised before aggregation.",
  },
];

const TIMELINE = [
  { year: "2024", event: "BinRo founded in Thrissur, Kerala by a team of fintech and security engineers." },
  { year: "2024", event: "Accepted into Kerala Startup Mission — India's largest startup ecosystem." },
  { year: "2025", event: "Launched beta with 60KB+ of BharatQR/UPI parsing logic and 80+ app support." },
  { year: "2026", event: "v2.0 released — community trust scoring, dynamic QRs, and AI fraud detection." },
];

export default function AboutPage() {
  return (
    <>
      {/* Header */}
      <section className="bg-gradient-to-b from-gray-50 to-white px-4 py-16 sm:py-20 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            About BinRo
          </h1>
          <p className="mt-4 text-gray-600 text-lg max-w-2xl mx-auto">
            We&apos;re on a mission to make every QR code in India trustworthy.
            Built in Kerala. Supported by Kerala Startup Mission.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="bg-white px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="prose prose-gray max-w-none">
            <h2 className="text-xl font-bold text-gray-900">The problem we&apos;re solving</h2>
            <p className="text-gray-600 mt-3 leading-relaxed">
              India processes over 13 billion UPI transactions every month. QR codes are
              everywhere — on shop counters, printed receipts, WhatsApp messages, and
              restaurant menus. And scammers know it.
            </p>
            <p className="text-gray-600 mt-3 leading-relaxed">
              A fraudulent QR code looks identical to a legitimate one. One wrong scan
              and money is gone instantly — no chargeback, no reversal. The average
              victim loses ₹34,000. BinRo exists to close that gap.
            </p>
            <h2 className="text-xl font-bold text-gray-900 mt-8">How we&apos;re different</h2>
            <p className="text-gray-600 mt-3 leading-relaxed">
              Most security tools treat QR codes as just URLs. We decode the full intent —
              the UPI VPA behind a payment QR, the IFSC code, the merchant name, the
              redirect chain. Our 60KB+ India-specific parsing library understands the
              real-world complexity of BharatQR, BBPS, and EMV formats.
            </p>
            <p className="text-gray-600 mt-3 leading-relaxed">
              We then layer crowd-sourced community reports, AI phishing detection, and
              collusion-resistant trust scoring to give you a verdict you can act on
              in under a second.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-gray-50 px-4 py-16 sm:py-20 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">Our values</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {VALUES.map((v) => (
              <div key={v.title} className="bg-white rounded-xl p-6 shadow-sm ring-1 ring-gray-100">
                <span className="text-3xl">{v.icon}</span>
                <h3 className="mt-3 font-semibold text-gray-900">{v.title}</h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="bg-white px-4 py-16 sm:py-20 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">Our story</h2>
          <div className="relative space-y-8 before:absolute before:left-[72px] before:top-2 before:bottom-2 before:w-px before:bg-gray-200">
            {TIMELINE.map((item) => (
              <div key={item.event} className="flex gap-6 items-start">
                <span className="w-[72px] flex-shrink-0 text-right text-sm font-semibold text-blue-600 pt-0.5">
                  {item.year}
                </span>
                <div className="relative flex-shrink-0 flex items-center justify-center">
                  <div className="h-3 w-3 rounded-full border-2 border-blue-600 bg-white" />
                </div>
                <p className="text-sm text-gray-600 leading-relaxed pt-0.5">{item.event}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 px-4 py-14 sm:px-6 text-center">
        <h2 className="text-xl font-bold text-white">Join the mission</h2>
        <p className="mt-3 text-blue-100 text-sm max-w-md mx-auto">
          Download BinRo and help build India&apos;s most trusted QR security community.
        </p>
        <Link
          href="https://play.google.com/store"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
        >
          Download free — Android
        </Link>
      </section>
    </>
  );
}
