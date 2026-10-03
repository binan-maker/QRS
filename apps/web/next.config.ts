import fs from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

function loadEnvFromPath(filePath: string) {
  try {
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eqIdx = line.indexOf("=");
      if (eqIdx <= 0) continue;
      const key = line.slice(0, eqIdx).trim();
      let val = line.slice(eqIdx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      // Set if unset or if current value is a placeholder
      const current = process.env[key];
      if (
        !current ||
        current === "your_supabase_anon_key" ||
        current === "placeholder-anon-key" ||
        current.includes("YOUR_PROJECT_REF")
      ) {
        process.env[key] = val;
      }
    }
  } catch {
    // Ignore missing or unreadable env files
  }
}

// Check root directory and parent directories for .env and .env.local
const candidateDirs = [
  path.resolve(__dirname, "../.."),
  process.cwd(),
  path.resolve(process.cwd(), "../.."),
  path.resolve(__dirname, ".."),
];

for (const dir of candidateDirs) {
  loadEnvFromPath(path.join(dir, ".env.local"));
  loadEnvFromPath(path.join(dir, ".env"));
}

// Synchronize NEXT_PUBLIC and EXPO_PUBLIC Supabase variables
const resolvedUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "";

const resolvedAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "";

if (resolvedUrl && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = resolvedUrl;
}
if (resolvedAnonKey && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = resolvedAnonKey;
}

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  transpilePackages: ["@supabase/supabase-js"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
    ],
  },
  experimental: {
    externalDir: true,
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: resolvedUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: resolvedAnonKey,
    EXPO_PUBLIC_SUPABASE_URL: resolvedUrl,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: resolvedAnonKey,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
