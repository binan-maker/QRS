/**
 * RESPONSE SIGNING MIDDLEWARE — P1 SECURITY FIX
 *
 * Extends ECDSA (P-256 / SHA-256) signing previously applied only to
 * `/api/threats` so it covers every `/api/*` JSON response.
 *
 * Mitigates: MITM tampering with redirect destinations, threat lists,
 * payment verification responses, etc.
 *
 * Behavior:
 *   - Wraps `res.json` so the serialized body is signed before being sent.
 *   - Adds `X-Content-Signature` (base64) and `X-Signature-Algorithm` headers.
 *   - Skips error responses (4xx/5xx) to keep error paths cheap.
 *   - No-ops gracefully when `THREATS_SIGNING_KEY` is not configured.
 *
 * The same key (`THREATS_SIGNING_KEY`) is used for all endpoints. Clients
 * that already verify `/api/threats` will not need to load a second key.
 */

import type { Request, Response, NextFunction } from "express";
import { signPayload } from "./response-signer";

const SIGNATURE_HEADER = "X-Content-Signature";
const ALGORITHM_HEADER = "X-Signature-Algorithm";
const ALGORITHM_VALUE = "ECDSA-P256-SHA256";

export function signApiResponses(req: Request, res: Response, next: NextFunction): void {
  // Only sign /api/* routes. Static assets, HTML pages and proxied Metro routes are skipped.
  if (!req.path.startsWith("/api/")) {
    return next();
  }

  const originalJson = res.json.bind(res);

  res.json = ((body: unknown) => {
    // Only sign successful responses. 4xx/5xx skip signing to avoid leaking
    // error semantics into the verified surface and to keep failures fast.
    const status = res.statusCode || 200;
    if (status >= 400) {
      return originalJson(body);
    }

    let serialized: string;
    try {
      serialized = JSON.stringify(body);
    } catch {
      // Body isn't serializable — let express handle it.
      return originalJson(body);
    }

    // Best-effort signing. If the key is unavailable we still send the response.
    signPayload(serialized)
      .then((signature) => {
        try {
          if (signature && !res.headersSent) {
            res.setHeader(SIGNATURE_HEADER, signature);
            res.setHeader(ALGORITHM_HEADER, ALGORITHM_VALUE);
          }
        } catch {
          // Ignore — headers may already be sent on slow paths.
        }
        // Send the exact serialized body we signed (avoid double-stringify drift).
        if (!res.headersSent) {
          res.setHeader("Content-Type", "application/json; charset=utf-8");
        }
        res.send(serialized);
      })
      .catch(() => {
        // On signing failure, fall back to unsigned response rather than failing the request.
        if (!res.headersSent) {
          res.setHeader("Content-Type", "application/json; charset=utf-8");
        }
        res.send(serialized);
      });

    return res;
  }) as Response["json"];

  next();
}
