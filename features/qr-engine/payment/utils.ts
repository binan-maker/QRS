export function formatAmount(amount: string, currency?: string): string {
  const num = parseFloat(amount);
  if (isNaN(num)) return amount;
  if (!currency || currency === "INR") {
    return `₹${num.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  }
  if (currency === "USD") return `$${num.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  if (currency === "EUR") return `€${num.toLocaleString("de-DE", { maximumFractionDigits: 2 })}`;
  return `${num} ${currency}`;
}

export function getBankFullName(handle?: string): string | null {
  if (!handle) return null;
  const MAP: Record<string, string> = {
    // ── Google Pay handles ─────────────────────────────────────────────────
    "oksbi": "State Bank of India",
    "okaxis": "Axis Bank",
    "okhdfcbank": "HDFC Bank",
    "okicici": "ICICI Bank",
    // ── PhonePe handles ───────────────────────────────────────────────────
    "ybl": "Yes Bank (via PhonePe)",
    "ibl": "IndusInd Bank",
    "axl": "Axis Bank",
    "superyes": "Yes Bank",
    // ── Standard bank handles ─────────────────────────────────────────────
    "paytm": "Paytm Payments Bank",
    "hdfcbank": "HDFC Bank",
    "icici": "ICICI Bank",
    "sbi": "State Bank of India",
    "kotak": "Kotak Mahindra Bank",
    "kmbl": "Kotak Mahindra Bank",
    "pnb": "Punjab National Bank",
    "bob": "Bank of Baroda",
    "barodampay": "Bank of Baroda",
    "cnrb": "Canara Bank",
    "federal": "Federal Bank",
    "fbl": "Federal Bank",
    "idbi": "IDBI Bank",
    "rbl": "RBL Bank",
    "indus": "IndusInd Bank",
    "airtel": "Airtel Payments Bank",
    "airtelpe": "Airtel Payments Bank",
    "jio": "Jio Payments Bank",
    "mahb": "Bank of Maharashtra",
    "centralbank": "Central Bank of India",
    "uco": "UCO Bank",
    "ucobank": "UCO Bank",
    "idfcbank": "IDFC FIRST Bank",
    "idfcfirst": "IDFC FIRST Bank",
    "aubank": "AU Small Finance Bank",
    "aubl": "AU Small Finance Bank",
    "postbank": "India Post Payments Bank",
    "timecosmos": "Fino Payments Bank",
    "fino": "Fino Payments Bank",
    "payzapp": "HDFC Bank (PayZapp)",
    "hdfcbankjd": "HDFC Bank",
    "icicibank": "ICICI Bank",
    "tapicici": "ICICI Bank",
    "yesbank": "Yes Bank",
    "yesbankltd": "Yes Bank",
    "groww": "Groww (IDFC FIRST Bank)",
    "navi": "Navi (Equitas SFB)",
    "naviaxis": "Navi (Axis Bank)",
    "freecharge": "FreeCharge (Axis Bank)",
    "mobikwik": "MobiKwik",
    "cred": "CRED (Federal Bank)",
    "amazonpay": "Amazon Pay (Axis Bank)",
    "apl": "Amazon Pay ICICI",
    "juspay": "JusPay",
    "razorpay": "Razorpay (RBL Bank)",
    "bajajpay": "Bajaj Finance",
    "uboi": "Union Bank of India",
    "jupiterpay": "Jupiter Money (Federal Bank)",
    "upi": "NPCI UPI Network",
    "bhim": "BHIM (NPCI)",
    "abfspay": "Aditya Birla Finance",
    "sliceaxis": "Slice (Axis Bank)",
    "slice": "Slice",
    // ── Small Finance & Payments Bank handles ─────────────────────────────
    "equitas": "Equitas Small Finance Bank",
    "esfb": "Equitas Small Finance Bank",
    "ujjivan": "Ujjivan Small Finance Bank",
    "usfb": "Ujjivan Small Finance Bank",
    "utkarsh": "Utkarsh Small Finance Bank",
    "jana": "Jana Small Finance Bank",
    "suryoday": "Suryoday Small Finance Bank",
    "esaf": "ESAF Small Finance Bank",
    "fincare": "Fincare Small Finance Bank",
    "dcb": "DCB Bank",
    "dcbbank": "DCB Bank",
    "csb": "CSB Bank",
    "cityunion": "City Union Bank",
    "tmb": "Tamilnad Mercantile Bank",
    "kvb": "Karur Vysya Bank",
    "karnataka": "Karnataka Bank",
    "sibl": "South Indian Bank",
    "dhanlaxmi": "Dhanlaxmi Bank",
    "jkbank": "Jammu & Kashmir Bank",
    "bandhan": "Bandhan Bank",
    "bdbl": "Bandhan Bank",
    // ── Gramin / Regional Rural Bank handles ──────────────────────────────
    "gramin": "Gramin Bank",
    "aryavart": "Gramin Bank of Aryavart",
    "rmgb": "Rajasthan Marudhara Gramin Bank",
    "kvgb": "Karnataka Vikas Grameena Bank",
    "apgvb": "Andhra Pradesh Gramin Vikas Bank",
    "tgb": "Telangana Gramin Bank",
    "kgb": "Karnataka Gramin Bank",
    "pragathi": "Pragathi Krishna Gramin Bank",
    "pkgb": "Pragathi Krishna Gramin Bank",
    "jkgb": "J&K Grameen Bank",
    "keralagb": "Kerala Gramin Bank",
    "mpgb": "Madhya Pradesh Gramin Bank",
    "odisha": "Odisha Gramya Bank",
    "tamilnadugb": "Tamil Nadu Grama Bank",
    "uttarakhand": "Uttarakhand Gramin Bank",
    "saptagiri": "Saptagiri Gramin Bank",
    "sarvaup": "Sarva UP Gramin Bank",
    "tripura": "Tripura Gramin Bank",
    "haryana": "Sarva Haryana Gramin Bank",
    "sghb": "Sarva Haryana Gramin Bank",
    "prathama": "Prathama UP Gramin Bank",
    // ── Cooperative Banks ─────────────────────────────────────────────────
    "saraswat": "Saraswat Co-operative Bank",
    "cosmos": "Cosmos Co-operative Bank",
    "tjsb": "TJSB Sahakari Bank",
    "nkgsb": "NKGSB Co-operative Bank",
    "dbs": "DBS Bank India",
    "hsbc": "HSBC India",
    "citi": "Citibank India",
    "scb": "Standard Chartered Bank",
    // ── Other fintech handles ─────────────────────────────────────────────
    "payu": "PayU",
    "cashfree": "Cashfree",
    "bharatpe": "BharatPe",
    "phonepe": "PhonePe",
    "gpay": "Google Pay",
    "amazonpayicici": "Amazon Pay ICICI",
    "hdfcbankjd": "HDFC Bank",
  };
  const lower = handle.toLowerCase();
  if (MAP[lower]) return MAP[lower];
  // Smart fallback: if handle contains a recognisable bank keyword, surface it
  const KEYWORDS: [string, string][] = [
    ["sbi", "State Bank of India"], ["hdfc", "HDFC Bank"], ["icici", "ICICI Bank"],
    ["axis", "Axis Bank"], ["kotak", "Kotak Mahindra Bank"], ["pnb", "Punjab National Bank"],
    ["baroda", "Bank of Baroda"], ["canara", "Canara Bank"], ["union", "Union Bank of India"],
    ["gramin", "Gramin Bank"], ["federal", "Federal Bank"], ["idfc", "IDFC FIRST Bank"],
    ["indus", "IndusInd Bank"], ["bandhan", "Bandhan Bank"], ["au", "AU Small Finance Bank"],
    ["equitas", "Equitas SFB"], ["ujjivan", "Ujjivan SFB"], ["utkarsh", "Utkarsh SFB"],
    ["airtel", "Airtel Payments Bank"], ["fino", "Fino Payments Bank"], ["jio", "Jio Payments Bank"],
    ["paytm", "Paytm Payments Bank"], ["post", "India Post Payments Bank"],
  ];
  for (const [keyword, name] of KEYWORDS) {
    if (lower.includes(keyword)) return name;
  }
  return null;
}

export function addSoftHyphens(text: string): string {
  return text.replace(/@/g, "\u00AD@\u00AD");
}
