import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

// ─── Static post registry ─────────────────────────────────────────────────────
// Phase 4 target: replace with MDX files + next-mdx-remote for ISR.
// For now, a static registry keeps the blog working without a CMS.

interface BlogPost {
  slug:     string;
  date:     string;
  category: string;
  title:    string;
  excerpt:  string;
  readMin:  number;
  body:     string;
}

const POSTS: Record<string, BlogPost> = {
  "upi-qr-scam-tactics-2026": {
    slug:     "upi-qr-scam-tactics-2026",
    date:     "July 10, 2026",
    category: "Security",
    title:    "The 7 most common UPI QR scam tactics in 2026",
    excerpt:  "From fake merchant QRs to screen-sharing attacks, here are the fraud patterns our community has flagged most this year — and how to spot them.",
    readMin:  6,
    body: `## The growing threat of QR fraud in India

UPI has transformed how India pays. Over 13 billion transactions a month flow through the system — and wherever money flows, scammers follow. Here are the seven tactics our community flagged most frequently in 2026.

### 1. Fake merchant QR stickers

Scammers print their own QR stickers and paste them over legitimate merchant QRs at shops, restaurants, and petrol pumps. The merchant doesn't notice; the customer pays the scammer instead.

**How to spot it**: Peel the corner of any printed QR sticker. If it lifts cleanly, someone placed it over the original. Legitimate QRs at major merchants are now tamper-evident.

### 2. "You owe me" QR sharing

A stranger contacts you claiming you owe them money from a previous transaction and sends you a QR code to "pay." The QR actually requests money from you.

**Rule**: A QR that asks you to enter an amount is requesting payment FROM you, not sending money TO you. Always check the direction.

### 3. WhatsApp/SMS phishing QRs

QR codes sent via message claiming to be "TRAI KYC verification," "SBI reward collection," or "Aadhaar link update." These lead to phishing pages that harvest your banking credentials.

**BinRo catches**: Our INDIA_PHISHING_PATTERNS registry flags 98% of these domains within 24 hours of first report.

### 4. Screen-sharing "customer support" attacks

A caller posing as bank support asks you to scan a QR via a screen-sharing app (AnyDesk, TeamViewer). The QR grants the attacker control of your phone.

**Rule**: No bank in India will ever ask you to scan a QR code via screen share.

### 5. Overpayment + refund QRs

A "buyer" on OLX or Quikr overpays for your item and asks you to "refund" the excess by scanning their QR. Their QR requests the full refund amount from you.

### 6. Tampered donation QRs

QR codes at charity events or temples swapped to redirect donations to a scammer's UPI ID. High-volume and hard to detect manually.

### 7. Clone UPI IDs

UPI IDs that look like legitimate merchants but differ by one character — e.g. "flipkart.order@ybl" vs. "f1ipkart.order@ybl". Always verify the merchant name shown after scanning.

---

BinRo catches all seven of these patterns. Download the app and scan before you pay.`,
  },
  "how-trust-score-works": {
    slug:     "how-trust-score-works",
    date:     "June 22, 2026",
    category: "Product",
    title:    "Inside BinRo's trust score algorithm",
    excerpt:  "We explain exactly how community reports, scan history, and AI analysis combine to produce the single verdict you see when you scan a QR code.",
    readMin:  8,
    body: `## What goes into the trust score?

When you scan a QR code in BinRo, a trust score appears in under a second. Here's exactly how we compute it.

### Six independent signals

**1. Community reports** (weight: 40%)
Every fraud report submitted by a BinRo user contributes to the score. Reports are weighted by the reporter's trust level — a user with 500 verified scans and no false reports carries more weight than a new account.

Our collusion detection algorithm identifies coordinated fake-report attacks by comparing reporter device fingerprints, timing patterns, and network proximity. Coordinated reports are automatically discounted.

**2. Scan volume** (weight: 20%)
A QR code that has been scanned 10,000 times without significant reports is statistically safer than one scanned 3 times. Volume is a proxy for legitimacy — but not the only signal.

**3. Owner verification** (weight: 15%)
QR codes created by users with a Verified Business badge get a trust boost. Verification requires a registered business, GST number, and manual review by the BinRo team.

**4. AI phishing detection** (weight: 15%)
We run every URL through a GPT-4o-mini safety check that's tuned specifically for India's threat landscape — UPI scam patterns, phishing domain characteristics, and brand impersonation.

**5. Domain reputation** (weight: 5%)
URLs are cross-referenced with Google Safe Browsing. New domains (under 30 days old) receive a caution flag.

**6. Content analysis** (weight: 5%)
Non-URL QR content (contacts, WiFi credentials, text) is analysed for suspicious patterns: unusual character sets, embedded URLs in otherwise plain-text QRs, etc.

### The verdict tiers

| Score | Verdict | Colour |
|-------|---------|--------|
| 85–100 | Safe | 🟢 |
| 50–84 | Caution | 🟡 |
| 0–49 | Flagged | 🔴 |

Scores are recomputed in real time as new reports arrive. A QR that was Safe this morning can become Flagged by afternoon if a fraud campaign begins.

---

Questions? Reach us at security@binro.in.`,
  },
};

// Generate static paths for known posts
export function generateStaticParams() {
  return Object.keys(POSTS).map((slug) => ({ slug }));
}

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = POSTS[slug];
  if (!post) return { title: "Post not found — BinRo Blog" };
  return {
    title: `${post.title} — BinRo Blog`,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = POSTS[slug];
  if (!post) notFound();

  // Very simple Markdown → HTML (heading, bold, hr only)
  // Phase 4 target: replace with next-mdx-remote
  function renderBody(md: string): string {
    return md
      .replace(/^### (.+)$/gm, "<h3 class=\"text-base font-semibold text-gray-900 mt-6 mb-2\">$1</h3>")
      .replace(/^## (.+)$/gm, "<h2 class=\"text-lg font-bold text-gray-900 mt-8 mb-3\">$1</h2>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/^---$/gm, "<hr class=\"my-6 border-gray-100\" />")
      .replace(/^\| (.+) \|$/gm, (_: string, row: string) => {
        if (row.includes("---")) return "";
        const cells = row.split("|").map((c) => c.trim());
        return `<tr>${cells.map((c) => `<td class="px-3 py-2 text-sm text-gray-600 border border-gray-100">${c}</td>`).join("")}</tr>`;
      })
      .split("\n\n")
      .map((para) => {
        if (para.startsWith("<h") || para.startsWith("<hr") || para.startsWith("<tr")) return para;
        if (para.startsWith("**") || para.match(/^\d+\./)) {
          const items = para.split("\n").map((l) =>
            `<li class="text-sm text-gray-600 leading-relaxed">${l.replace(/^\d+\.\s/, "").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")}</li>`
          );
          return `<ol class="list-decimal list-inside space-y-1 pl-2">${items.join("")}</ol>`;
        }
        return `<p class="text-sm text-gray-600 leading-relaxed">${para.replace(/\n/g, "<br/>")}</p>`;
      })
      .join("\n");
  }

  return (
    <div className="bg-white px-4 py-14 sm:px-6">
      <div className="mx-auto max-w-2xl">
        {/* Back link */}
        <Link href="/blog" className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1 mb-8">
          ← All posts
        </Link>

        {/* Meta */}
        <div className="flex items-center gap-3 mb-4">
          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
            {post.category}
          </span>
          <span className="text-xs text-gray-400">{post.date}</span>
          <span className="text-xs text-gray-400">· {post.readMin} min read</span>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl mb-6">
          {post.title}
        </h1>
        <p className="text-gray-500 text-base mb-8 border-l-4 border-blue-200 pl-4 italic">
          {post.excerpt}
        </p>

        {/* Body */}
        <div
          className="prose-sm space-y-3"
          dangerouslySetInnerHTML={{ __html: renderBody(post.body) }}
        />

        {/* CTA */}
        <div className="mt-12 rounded-xl bg-blue-50 p-6 text-center">
          <p className="font-semibold text-blue-900">Protect yourself from QR fraud</p>
          <p className="text-sm text-blue-700 mt-1">Download BinRo — free for Android.</p>
          <Link
            href="https://play.google.com/store"
            className="mt-4 inline-block rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Download free
          </Link>
        </div>
      </div>
    </div>
  );
}
