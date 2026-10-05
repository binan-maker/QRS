import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/scanner",
          "/download",
          "/guide",
          "/founder",
          "/trust-scores",
          "/feedback",
          "/privacy",
          "/terms",
          "/login",
          "/register",
          "/qr/",
        ],
        disallow: [
          "/api/",
          "/settings",
          "/profile",
          "/history",
          "/auth/callback",
          "/reset-password",
          "/verify-email",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
