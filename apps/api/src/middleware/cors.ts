import type { Request, Response, NextFunction } from "express";

function buildAllowedOrigins(): Set<string> {
  const origins = new Set<string>();

  if (process.env.REPLIT_DEV_DOMAIN) {
    origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
  }

  if (process.env.REPLIT_DOMAINS) {
    for (const d of process.env.REPLIT_DOMAINS.split(",")) {
      origins.add(`https://${d.trim()}`);
    }
  }

  if (process.env.EXPO_PUBLIC_DOMAIN) {
    const raw = process.env.EXPO_PUBLIC_DOMAIN;
    origins.add(raw.startsWith("http") ? raw : `https://${raw}`);
  }

  return origins;
}

export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const allowedOrigins = buildAllowedOrigins();
  const origin = req.header("origin");

  const isLocalhost =
    process.env.NODE_ENV !== "production" &&
    (origin?.startsWith("http://localhost:") ||
      origin?.startsWith("http://127.0.0.1:"));

  if (origin && (allowedOrigins.has(origin) || isLocalhost)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Expose-Headers", "X-Content-Signature");
    res.header("Access-Control-Allow-Credentials", "true");
  }

  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }

  next();
}
