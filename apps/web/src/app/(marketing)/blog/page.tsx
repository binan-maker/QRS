import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog — BinRo",
  description: "Security tips, QR fraud case studies, and product updates from the BinRo team.",
};

// Static posts — Phase 4 target: migrate to MDX files with ISR revalidation
const POSTS = [
  {
    slug:    "upi-qr-scam-tactics-2026",
    date:    "July 10, 2026",
    category: "Security",
    title:   "The 7 most common UPI QR scam tactics in 2026",
    excerpt: "From fake merchant QRs to screen-sharing attacks, here are the fraud patterns our community has flagged most this year — and how to spot them.",
    readMin: 6,
  },
  {
    slug:    "how-trust-score-works",
    date:    "June 22, 2026",
    category: "Product",
    title:   "Inside BinRo's trust score algorithm",
    excerpt: "We explain exactly how community reports, scan history, and AI analysis combine to produce the single verdict you see when you scan a QR code.",
    readMin: 8,
  },
  {
    slug:    "bharat-qr-explained",
    date:    "June 5, 2026",
    category: "Education",
    title:   "BharatQR and UPI explained: what every Indian should know",
    excerpt: "BharatQR, UPI deep links, and BBPS — what do these formats actually encode? Understanding the structure helps you spot when something is wrong.",
    readMin: 5,
  },
  {
    slug:    "dynamic-qr-guide",
    date:    "May 18, 2026",
    category: "Product",
    title:   "Dynamic QR codes: a guide for businesses",
    excerpt: "How to use BinRo's dynamic QR feature to update destinations, set scan limits, and track who scanned what — without reprinting a single sticker.",
    readMin: 4,
  },
  {
    slug:    "kerala-startup-mission",
    date:    "April 30, 2026",
    category: "Company",
    title:   "BinRo joins Kerala Startup Mission",
    excerpt: "We're proud to announce our acceptance into KSIDC's incubation programme — what this means for the product and our roadmap for the next 12 months.",
    readMin: 3,
  },
];

const CATEGORY_COLOUR: Record<string, string> = {
  Security:  "bg-red-50 text-red-700",
  Product:   "bg-blue-50 text-blue-700",
  Education: "bg-emerald-50 text-emerald-700",
  Company:   "bg-violet-50 text-violet-700",
};

export default function BlogPage() {
  return (
    <>
      {/* Header */}
      <section className="bg-gradient-to-b from-gray-50 to-white px-4 py-14 sm:py-18 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            BinRo Blog
          </h1>
          <p className="mt-3 text-gray-500">
            Security tips, fraud case studies, and product updates.
          </p>
        </div>
      </section>

      {/* Posts */}
      <section className="bg-white px-4 pb-16 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-8">
          {POSTS.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group block rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md hover:border-blue-100 transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${CATEGORY_COLOUR[post.category] ?? "bg-gray-100 text-gray-600"}`}
                >
                  {post.category}
                </span>
                <span className="text-xs text-gray-400">{post.date}</span>
                <span className="text-xs text-gray-400">· {post.readMin} min read</span>
              </div>
              <h2 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                {post.title}
              </h2>
              <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">{post.excerpt}</p>
              <p className="mt-3 text-sm font-medium text-blue-600 group-hover:underline">
                Read more →
              </p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
