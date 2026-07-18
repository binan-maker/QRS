import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing — BinRo",
  description:
    "BinRo is free for individual users. Business and enterprise plans add dynamic QR management, analytics, and priority support.",
};

const TIERS = [
  {
    name: "Free",
    price: "₹0",
    period: "forever",
    desc: "For individual users who want to scan safely.",
    cta: "Download free",
    ctaHref: "https://play.google.com/store",
    highlight: false,
    features: [
      "Unlimited QR scans",
      "Instant trust score",
      "Community reports",
      "Works offline",
      "5 Indian languages",
      "Scan history (last 100)",
    ],
  },
  {
    name: "Pro",
    price: "₹99",
    period: "per month",
    desc: "For power users and small merchants.",
    cta: "Start Pro trial",
    ctaHref: "https://play.google.com/store",
    highlight: true,
    features: [
      "Everything in Free",
      "Create up to 50 dynamic QRs",
      "Scan analytics dashboard",
      "Scan limit & expiry controls",
      "Custom QR design",
      "Priority fraud reporting",
      "Email support",
    ],
  },
  {
    name: "Business",
    price: "₹499",
    period: "per month",
    desc: "For businesses that need scale and verification.",
    cta: "Contact us",
    ctaHref: "mailto:hello@binro.in",
    highlight: false,
    features: [
      "Everything in Pro",
      "Unlimited dynamic QRs",
      "Verified business badge",
      "API access",
      "Bulk QR generation",
      "White-label options",
      "Dedicated support",
    ],
  },
];

const FAQ = [
  {
    q: "Is basic scanning really free?",
    a: "Yes — scanning QR codes and getting trust scores is free for everyone, forever. No account needed.",
  },
  {
    q: "What is a dynamic QR?",
    a: "A dynamic QR's destination can be updated anytime without reprinting the QR code. You can also set scan limits, expiry dates, and view who scanned when.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from the app or by emailing support. You keep access until the end of your billing period.",
  },
  {
    q: "Do you offer refunds?",
    a: "We offer a full refund within 7 days of any subscription payment if you're not satisfied.",
  },
];

export default function PricingPage() {
  return (
    <>
      {/* Header */}
      <section className="bg-gradient-to-b from-gray-50 to-white px-4 py-16 sm:py-20 sm:px-6 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
          Simple, honest pricing
        </h1>
        <p className="mt-4 text-gray-600 text-lg max-w-xl mx-auto">
          Scanning is always free. Pay only for advanced QR creation and analytics.
        </p>
      </section>

      {/* Pricing cards */}
      <section className="bg-white px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-5xl grid gap-6 sm:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex flex-col rounded-2xl p-7 ring-1 ${
                tier.highlight
                  ? "bg-blue-600 ring-blue-600 shadow-xl"
                  : "bg-white ring-gray-200 shadow-sm"
              }`}
            >
              {tier.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-yellow-400 px-3 py-0.5 text-xs font-bold text-yellow-900">
                  Most popular
                </span>
              )}
              <h2 className={`font-bold text-xl ${tier.highlight ? "text-white" : "text-gray-900"}`}>
                {tier.name}
              </h2>
              <p className={`mt-1 text-sm ${tier.highlight ? "text-blue-200" : "text-gray-500"}`}>
                {tier.desc}
              </p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className={`text-4xl font-extrabold ${tier.highlight ? "text-white" : "text-gray-900"}`}>
                  {tier.price}
                </span>
                <span className={`text-sm ${tier.highlight ? "text-blue-200" : "text-gray-400"}`}>
                  /{tier.period}
                </span>
              </div>
              <Link
                href={tier.ctaHref}
                className={`mt-6 block rounded-xl py-3 text-center text-sm font-semibold transition-colors ${
                  tier.highlight
                    ? "bg-white text-blue-600 hover:bg-blue-50"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {tier.cta}
              </Link>
              <ul className="mt-7 space-y-3">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <svg
                      className={`mt-0.5 h-4 w-4 flex-shrink-0 ${tier.highlight ? "text-blue-200" : "text-blue-500"}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className={tier.highlight ? "text-blue-100" : "text-gray-600"}>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-gray-50 px-4 py-16 sm:py-20 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">
            Frequently asked questions
          </h2>
          <div className="space-y-6">
            {FAQ.map((item) => (
              <div key={item.q} className="bg-white rounded-xl p-6 shadow-sm ring-1 ring-gray-100">
                <h3 className="font-semibold text-gray-900">{item.q}</h3>
                <p className="mt-2 text-sm text-gray-500">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
