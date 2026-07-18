import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://binro.in";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow:     "/",
        disallow:  [
          "/dashboard/",
          "/api/",
          "/auth/",
          "/_next/",
        ],
      },
      {
        // Block AI scrapers that ignore robots.txt in spirit
        userAgent: ["GPTBot", "CCBot", "anthropic-ai", "Google-Extended"],
        disallow:  "/",
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
