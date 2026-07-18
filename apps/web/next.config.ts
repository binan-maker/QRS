import type { NextConfig } from "next";

/**
 * BinRo Web — Next.js configuration
 *
 * Backend routing strategy:
 *   Development  → rewrites /api/backend/* → Express on localhost:5000
 *   Production   → NEXT_PUBLIC_API_URL points to the deployed Express backend
 *                  (no rewrite needed — client calls the URL directly)
 *
 * The rewrite proxy is only for the development environment so the browser
 * doesn't hit a different origin (avoids CORS preflight in dev).
 */

const API_URL =
  process.env.INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:5000";

const nextConfig: NextConfig = {
  // ── Monorepo packages that contain JSX/TS source (not pre-compiled) ─────────
  transpilePackages: ["@binro/core", "@binro/config"],

  // ── Strict mode for React 19 ─────────────────────────────────────────────────
  reactStrictMode: true,

  // ── Images ───────────────────────────────────────────────────────────────────
  images: {
    remotePatterns: [
      // Firebase Storage (user avatars, QR logos)
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      // Google profile pictures
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },

  // ── API proxy rewrites (development only) ────────────────────────────────────
  // In production the client calls NEXT_PUBLIC_API_URL directly.
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];
    return [
      {
        // /api/backend/v1/... → Express /api/v1/...
        source: "/api/backend/:path*",
        destination: `${API_URL}/api/:path*`,
      },
    ];
  },

  // ── Security headers ─────────────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },

  // ── Experimental ─────────────────────────────────────────────────────────────
  experimental: {
    // Server Actions are stable in Next.js 15 — no flag needed.
    // Turbopack for faster dev builds (opt-in via CLI: next dev --turbo)
  },
};

export default nextConfig;
