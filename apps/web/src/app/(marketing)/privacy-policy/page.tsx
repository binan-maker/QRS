import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — BinRo",
  description: "How BinRo collects, uses, and protects your personal data.",
};

const LAST_UPDATED = "July 1, 2026";

const SECTIONS = [
  {
    title: "1. Information we collect",
    content: `We collect information you provide directly to us, such as when you create an account, scan a QR code, submit a report, or contact us.

**Account information**: Email address, display name, profile photo (optional), and username.

**Scan data**: QR code content is analysed on our servers to compute a trust score. The raw QR content is hashed before storage — we never store the plaintext of QR codes that contain personal payment information.

**Device information**: Push notification token, device OS, and approximate region (country-level, from IP address). We do not store precise GPS location.

**Usage data**: Which features you use, how frequently, and session duration. Collected in aggregate only.`,
  },
  {
    title: "2. How we use your information",
    content: `We use the information we collect to:

- Provide, maintain, and improve BinRo's services
- Compute QR trust scores using community scan data
- Send re-engagement push notifications (you can disable these in Settings)
- Detect and prevent fraudulent or abusive behaviour
- Comply with legal obligations

We do **not** sell your personal data to third parties. We do not use your data for targeted advertising.`,
  },
  {
    title: "3. Data sharing",
    content: `**Community reports**: When you report a QR code as fraudulent, your report is anonymised before being used in trust score calculations. Your identity is never attached to a public report.

**Service providers**: We share data with trusted service providers who help us operate BinRo (Firebase for auth, Upstash Redis for caching, Expo for push notifications). Each provider is bound by a data processing agreement.

**Legal compliance**: We may disclose information when required by law, court order, or to protect the rights, property, or safety of BinRo, our users, or the public.`,
  },
  {
    title: "4. Data retention",
    content: `- **Account data**: Retained until you delete your account. On deletion, your data is soft-deleted for 30 days (allowing recovery if accidental), then permanently erased.
- **Scan records**: Aggregated scan statistics are retained indefinitely. Individual scan records are archived after 90 days and deleted after 1 year.
- **Push notification logs**: Deleted after 30 days.
- **Fraud reports**: Anonymised report data is retained to maintain QR trust scores.`,
  },
  {
    title: "5. Your rights",
    content: `Depending on your location, you may have rights to:

- **Access**: Request a copy of the personal data we hold about you.
- **Correction**: Request correction of inaccurate data.
- **Deletion**: Request deletion of your account and associated personal data.
- **Portability**: Request your data in a machine-readable format.
- **Opt-out**: Disable push notifications at any time in device Settings.

To exercise any right, contact us at **privacy@binro.in**.`,
  },
  {
    title: "6. Security",
    content: `We protect your data using industry-standard security measures: HTTPS for all data transmission, ECDSA-signed API responses to prevent tampering, encrypted storage for sensitive fields, and regular dependency audits.

No method of transmission or storage is 100% secure. If you discover a security vulnerability, please report it responsibly to **security@binro.in**.`,
  },
  {
    title: "7. Children's privacy",
    content: `BinRo is not directed at children under the age of 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal information, contact us at privacy@binro.in and we will delete it promptly.`,
  },
  {
    title: "8. Changes to this policy",
    content: `We may update this Privacy Policy from time to time. We will notify you of material changes via push notification or in-app message at least 7 days before the change takes effect. Continued use of BinRo after that date constitutes acceptance of the updated policy.`,
  },
  {
    title: "9. Contact us",
    content: `For privacy-related questions, contact us at:

**BinRo Technologies**
Email: privacy@binro.in
Address: Thrissur, Kerala, India — 680001

Supported by Kerala Startup Mission (KSIDC Complex, Thiruvananthapuram).`,
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="bg-white px-4 py-14 sm:px-6">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Privacy Policy</h1>
          <p className="mt-2 text-sm text-gray-500">Last updated: {LAST_UPDATED}</p>
          <p className="mt-4 text-gray-600">
            BinRo ("we", "our", "us") is committed to protecting your privacy. This policy explains what
            information we collect, how we use it, and your rights regarding your personal data.
          </p>
        </div>

        {/* Sections */}
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
