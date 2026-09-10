import type { Request, Response, Express } from "express";

const SAFE_BROWSING_API =
  "https://safebrowsing.googleapis.com/v4/threatMatches:find";

export interface SafeBrowsingResult {
  isThreat: boolean;
  threatType: string | null;
  platformType: string | null;
  source: "google-safe-browsing" | "api-unavailable";
}

async function checkWithGoogleSafeBrowsing(
  url: string,
  apiKey: string
): Promise<SafeBrowsingResult> {
  const body = {
    client: { clientId: "qr-guard", clientVersion: "1.0.0" },
    threatInfo: {
      threatTypes: [
        "MALWARE",
        "SOCIAL_ENGINEERING",
        "UNWANTED_SOFTWARE",
        "POTENTIALLY_HARMFUL_APPLICATION",
      ],
      platformTypes: ["ANY_PLATFORM"],
      threatEntryTypes: ["URL"],
      threatEntries: [{ url }],
    },
  };

  const res = await fetch(`${SAFE_BROWSING_API}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    throw new Error(`Safe Browsing API returned ${res.status}`);
  }

  const data = (await res.json()) as {
    matches?: { threatType: string; platformType: string }[];
  };

  if (data.matches && data.matches.length > 0) {
    const match = data.matches[0];
    return {
      isThreat: true,
      threatType: match.threatType,
      platformType: match.platformType,
      source: "google-safe-browsing",
    };
  }

  return {
    isThreat: false,
    threatType: null,
    platformType: null,
    source: "google-safe-browsing",
  };
}

export function registerSafeBrowsingRoute(app: Express): void {
  app.post("/api/check-url", async (req: Request, res: Response) => {
    const { url } = req.body as { url?: string };

    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "url is required" });
    }

    const apiKey = process.env.GOOGLE_SAFE_BROWSING_API_KEY;
    if (!apiKey) {
      return res.json({
        isThreat: false,
        threatType: null,
        platformType: null,
        source: "api-unavailable",
        message: "Google Safe Browsing API key not configured",
      } satisfies SafeBrowsingResult & { message: string });
    }

    try {
      const result = await checkWithGoogleSafeBrowsing(url, apiKey);
      return res.json(result);
    } catch (err: any) {
      console.error("[SafeBrowsing] API error:", err?.message);
      return res.status(502).json({
        isThreat: false,
        threatType: null,
        platformType: null,
        source: "api-unavailable",
        message: "Threat intelligence service temporarily unavailable",
      } satisfies SafeBrowsingResult & { message: string });
    }
  });
}
