import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://binro.in";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL,                        lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${BASE_URL}/how-it-works`,      lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/pricing`,           lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/about`,             lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/blog`,              lastModified: now, changeFrequency: "weekly",  priority: 0.7 },
    { url: `${BASE_URL}/privacy-policy`,    lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${BASE_URL}/terms`,             lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
  ];

  const blogRoutes: MetadataRoute.Sitemap = [
    "upi-qr-scam-tactics-2026",
    "how-trust-score-works",
    "bharat-qr-explained",
    "dynamic-qr-guide",
    "kerala-startup-mission",
  ].map((slug) => ({
    url:             `${BASE_URL}/blog/${slug}`,
    lastModified:    now,
    changeFrequency: "monthly" as const,
    priority:        0.6,
  }));

  return [...staticRoutes, ...blogRoutes];
}
