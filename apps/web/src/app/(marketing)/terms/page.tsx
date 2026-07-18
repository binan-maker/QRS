import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — BinRo",
  description: "Terms governing your use of BinRo — India's QR code trust platform.",
};

const LAST_UPDATED = "July 1, 2026";

const SECTIONS = [
  {
    title: "1. Acceptance of terms",
    content: `By downloading, installing, or using BinRo ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service.

These Terms apply to all users of BinRo, including the mobile app, the website (binro.in), and any API access.`,
  },
  {
    title: "2. Description of service",
    content: `BinRo provides QR code scanning, trust scoring, and fraud detection services. Key features include:

- **QR scanning and analysis**: Real-time trust scores for scanned QR codes
- **Community reports**: Crowdsourced fraud detection
- **Dynamic QR creation**: Generate and manage QR codes with analytics
- **Push notifications**: Re-engagement and security alerts

Basic scanning is free. Pro and Business plans provide additional features as described on the Pricing page.`,
  },
  {
    title: "3. User accounts",
    content: `You may use basic scanning features without an account. An account is required to create QR codes, submit reports, and access your scan history.

You are responsible for maintaining the confidentiality of your account credentials. You must notify us immediately at support@binro.in if you suspect unauthorised access to your account.

You must provide accurate information when creating an account. Accounts that impersonate other people or organisations will be terminated.`,
  },
  {
    title: "4. Acceptable use",
    content: `You agree not to use BinRo to:

- Submit false or misleading fraud reports
- Create QR codes that link to malicious, illegal, or deceptive content
- Attempt to circumvent rate limits, abuse the API, or scrape content
- Impersonate BinRo staff, government officials, or other users
- Engage in any activity that violates Indian law (including the IT Act, 2000)

Violation of these rules may result in immediate account termination without refund.`,
  },
  {
    title: "5. QR codes and content",
    content: `**Creator responsibility**: You are solely responsible for the content and destinations of QR codes you create through BinRo.

**Community moderation**: BinRo relies on community reports to detect misuse. We reserve the right to deactivate any QR code found to be linked to fraudulent, illegal, or harmful content.

**Government QR codes**: QR codes classified as "Government" type are immutable once verified. Only authorised government entities may create or modify government-type QR codes.`,
  },
  {
    title: "6. Payments and subscriptions",
    content: `Pro and Business subscriptions are billed monthly. Payment is processed by Razorpay; your payment details are never stored on BinRo's servers.

**Refunds**: We offer a full refund within 7 days of any subscription payment if you are not satisfied. Contact billing@binro.in to request a refund.

**Cancellation**: You may cancel your subscription at any time. Your access continues until the end of the current billing period; no partial refunds are issued for unused time after the 7-day window.`,
  },
  {
    title: "7. Intellectual property",
    content: `BinRo and its logos, trademarks, and service marks are owned by BinRo Technologies. You may not use them without prior written permission.

Content you create using BinRo (QR codes, reports, comments) remains your property. By submitting content, you grant BinRo a worldwide, non-exclusive, royalty-free licence to use, store, and display that content to operate the Service.`,
  },
  {
    title: "8. Disclaimer of warranties",
    content: `BinRo is provided "as is" and "as available" without warranties of any kind. We do not guarantee that:

- Trust scores are 100% accurate or up to date
- The Service will be uninterrupted or error-free
- Any particular QR code is safe or fraudulent

**QR scanning is a tool, not a guarantee.** Always verify payment recipients through official channels before transferring money.`,
  },
  {
    title: "9. Limitation of liability",
    content: `To the maximum extent permitted by applicable law, BinRo shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service, including but not limited to financial loss from acting on a trust score.

Our total liability to you for any claim arising from these Terms shall not exceed the amount you paid to BinRo in the 12 months preceding the claim, or ₹1,000, whichever is greater.`,
  },
  {
    title: "10. Governing law",
    content: `These Terms are governed by the laws of India. Any dispute arising from these Terms shall be subject to the exclusive jurisdiction of the courts in Thrissur, Kerala, India.`,
  },
  {
    title: "11. Changes to these terms",
    content: `We may update these Terms at any time. We will notify you of material changes at least 14 days in advance via in-app notification. Continued use after that date constitutes acceptance of the new Terms.`,
  },
  {
    title: "12. Contact",
    content: `Questions about these Terms? Contact us at **legal@binro.in** or write to:

BinRo Technologies, Thrissur, Kerala, India — 680001.`,
  },
];

export default function TermsPage() {
  return (
    <div className="bg-white px-4 py-14 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Terms of Service</h1>
          <p className="mt-2 text-sm text-gray-500">Last updated: {LAST_UPDATED}</p>
          <p className="mt-4 text-gray-600">
            Please read these Terms carefully before using BinRo. They govern your relationship with
            BinRo Technologies and your use of all BinRo products and services.
          </p>
        </div>

        <div className="space-y-10">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">{section.title}</h2>
              <div className="text-gray-600 text-sm leading-relaxed space-y-2">
                {section.content.split("\n\n").map((para, i) => (
                  <p
                    key={i}
                    dangerouslySetInnerHTML={{
                      __html: para
                        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                        .replace(/\n/g, "<br />"),
                    }}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
