import type { Express, Request, Response } from "express";

const cache = new Map<string, { name: string; fetchedAt: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const STATIC_MAP: Record<string, string> = {
  SBIN: "State Bank of India", HDFC: "HDFC Bank", ICIC: "ICICI Bank",
  UTIB: "Axis Bank", KKBK: "Kotak Mahindra Bank", PUNB: "Punjab National Bank",
  BARB: "Bank of Baroda", CNRB: "Canara Bank", UBIN: "Union Bank of India",
  BKID: "Bank of India", CBIN: "Central Bank of India", IOBA: "Indian Overseas Bank",
  IDIB: "Indian Bank", UCBA: "UCO Bank", MAHB: "Bank of Maharashtra",
  PSIB: "Punjab & Sind Bank", YESB: "Yes Bank", FDRL: "Federal Bank",
  IDFB: "IDFC FIRST Bank", RATN: "RBL Bank", INDB: "IndusInd Bank",
  KARB: "Karnataka Bank", KVBL: "Karur Vysya Bank", SIBL: "South Indian Bank",
  DLXB: "Dhanlaxmi Bank", JAKA: "Jammu & Kashmir Bank", DCBL: "DCB Bank",
  CSBL: "CSB Bank", TMBL: "Tamilnad Mercantile Bank", CIUB: "City Union Bank",
  DBSS: "DBS Bank India", AUBL: "AU Small Finance Bank", ESFB: "Equitas SFB",
  ESMF: "ESAF SFB", JSFB: "Jana SFB", SURY: "Suryoday SFB",
  UJVN: "Ujjivan SFB", UTKS: "Utkarsh SFB", AIRP: "Airtel Payments Bank",
  FINO: "Fino Payments Bank", IPOS: "India Post Payments Bank",
  PAYT: "Paytm Payments Bank", JIOP: "Jio Payments Bank",
  GBAQ: "Gramin Bank of Aryavart", RMGB: "Rajasthan Marudhara Gramin Bank",
  KVGB: "Karnataka Vikas Grameena Bank", APGV: "Andhra Pradesh Gramin Vikas Bank",
  TGMB: "Telangana Gramin Bank", SBGB: "Sarva Haryana Gramin Bank",
  KGRB: "Karnataka Gramin Bank", PUGB: "Prathama UP Gramin Bank",
  KJGB: "Kerala Gramin Bank", KLGB: "Kerala Gramin Bank",
  MPGB: "Madhya Pradesh Gramin Bank", PKGB: "Pragathi Krishna Gramin Bank",
  SGRB: "Sarva UP Gramin Bank", TGGB: "Tripura Gramin Bank",
  TNGB: "Tamil Nadu Grama Bank", UTGB: "Uttarakhand Gramin Bank",
  VKGB: "Vidharbha Konkan Gramin Bank", OGGB: "Odisha Gramya Bank",
  BDBL: "Bandhan Bank", SVCB: "Saraswat Co-operative Bank",
  NKGS: "NKGSB Co-operative Bank", CITI: "Citibank India",
  HSBC: "HSBC India", SCBL: "Standard Chartered Bank",
};

export function registerIfscRoute(app: Express): void {
  app.get("/api/v1/ifsc/:code", async (req: Request, res: Response) => {
    const code = (req.params.code || "").toUpperCase().trim();
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(code)) {
      res.status(400).json({ error: "Invalid IFSC format" });
      return;
    }

    // 1. Check in-memory cache
    const cached = cache.get(code);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      res.json({ ifsc: code, bank: cached.name });
      return;
    }

    // 2. Check static map (covers 99% of common banks instantly)
    const prefix = code.slice(0, 4);
    if (STATIC_MAP[prefix]) {
      const name = STATIC_MAP[prefix];
      cache.set(code, { name, fetchedAt: Date.now() });
      res.json({ ifsc: code, bank: name });
      return;
    }

    // 3. Fetch from Razorpay free IFSC API (no key needed, covers all 160k+ branches)
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const upstream = await fetch(`https://ifsc.razorpay.com/${code}`, {
        signal: controller.signal,
        headers: { "Accept": "application/json" },
      });
      clearTimeout(timeout);
      if (upstream.ok) {
        const data = await upstream.json() as { BANK?: string; BANKCODE?: string };
        const name = data.BANK || "";
        cache.set(code, { name, fetchedAt: Date.now() });
        res.json({ ifsc: code, bank: name });
        return;
      }
    } catch {
      // Network error or timeout — fall through to unknown
    }

    cache.set(code, { name: "", fetchedAt: Date.now() });
    res.json({ ifsc: code, bank: "" });
  });
}
