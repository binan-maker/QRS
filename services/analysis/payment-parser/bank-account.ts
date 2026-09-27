import type { PaymentAppId, ParsedPaymentQr } from "../types";

const IFSC_RE = /\b([A-Z]{4}0[A-Z0-9]{6})\b/;
const ACC_RE = /\b(\d{9,18})\b/;

export function resolveIFSCBankName(ifsc: string): string {
  const prefix = ifsc.slice(0, 4).toUpperCase();
  const MAP: Record<string, string> = {
    // ── Major Public Sector Banks ──────────────────────────────────────────
    SBIN: "State Bank of India",
    PUNB: "Punjab National Bank",
    BARB: "Bank of Baroda",
    CNRB: "Canara Bank",
    UBIN: "Union Bank of India",
    BKID: "Bank of India",
    CBIN: "Central Bank of India",
    IOBA: "Indian Overseas Bank",
    IDIB: "Indian Bank",
    UCBA: "UCO Bank",
    MAHB: "Bank of Maharashtra",
    PSIB: "Punjab & Sind Bank",
    ANDB: "Andhra Bank",
    CORP: "Corporation Bank",
    VIJB: "Vijaya Bank",
    ALLA: "Allahabad Bank",
    ORBC: "Oriental Bank of Commerce",
    UTBI: "United Bank of India",
    DENA: "Dena Bank",
    BKDN: "Dena Bank",
    SYNB: "Syndicate Bank",
    // ── Major Private Banks ────────────────────────────────────────────────
    HDFC: "HDFC Bank",
    ICIC: "ICICI Bank",
    UTIB: "Axis Bank",
    KKBK: "Kotak Mahindra Bank",
    INDB: "IndusInd Bank",
    YESB: "Yes Bank",
    FDRL: "Federal Bank",
    IDFB: "IDFC FIRST Bank",
    RATN: "RBL Bank",
    KARB: "Karnataka Bank",
    KVBL: "Karur Vysya Bank",
    SIBL: "South Indian Bank",
    DLXB: "Dhanlaxmi Bank",
    JAKA: "Jammu & Kashmir Bank",
    DCBL: "DCB Bank",
    CSBL: "CSB Bank",
    TMBL: "Tamilnad Mercantile Bank",
    CIUB: "City Union Bank",
    LAVB: "Lakshmi Vilas Bank",
    DBSS: "DBS Bank India",
    NKGS: "NKGSB Co-operative Bank",
    SUBL: "SBM Bank India",
    SBMY: "SBM Bank India",
    // ── Small Finance Banks ───────────────────────────────────────────────
    AUBL: "AU Small Finance Bank",
    ESFB: "Equitas Small Finance Bank",
    ESMF: "ESAF Small Finance Bank",
    JSFB: "Jana Small Finance Bank",
    SURY: "Suryoday Small Finance Bank",
    UJVN: "Ujjivan Small Finance Bank",
    UTKS: "Utkarsh Small Finance Bank",
    SVBK: "Shivalik Small Finance Bank",
    USFB: "Ujjivan Small Finance Bank",
    FNBS: "Fincare Small Finance Bank",
    NSFB: "North East Small Finance Bank",
    UOBT: "Unity Small Finance Bank",
    NESF: "NE Small Finance Bank",
    // ── Payments Banks ────────────────────────────────────────────────────
    AIRP: "Airtel Payments Bank",
    FINO: "Fino Payments Bank",
    IPOS: "India Post Payments Bank",
    PAYT: "Paytm Payments Bank",
    JIOP: "Jio Payments Bank",
    NSDL: "NSDL Payments Bank",
    // ── Foreign Banks (India) ─────────────────────────────────────────────
    CITI: "Citibank India",
    HSBC: "HSBC India",
    SCBL: "Standard Chartered Bank",
    DEUT: "Deutsche Bank India",
    BNPA: "BNP Paribas India",
    BOFA: "Bank of America India",
    BACB: "Bank of America India",
    // ── Regional Rural Banks (Gramin Banks) ───────────────────────────────
    GBAQ: "Gramin Bank of Aryavart",
    RMGB: "Rajasthan Marudhara Gramin Bank",
    KVGB: "Karnataka Vikas Grameena Bank",
    APGV: "Andhra Pradesh Gramin Vikas Bank",
    TGMB: "Telangana Gramin Bank",
    SBGB: "Sarva Haryana Gramin Bank",
    WBSC: "Paschim Banga Gramin Bank",
    KGRB: "Karnataka Gramin Bank",
    PUGB: "Prathama UP Gramin Bank",
    SPCB: "Saptagiri Gramin Bank",
    JKGB: "J&K Grameen Bank",
    JKGO: "J&K Grameen Bank",
    KJGB: "Kerala Gramin Bank",
    KLGB: "Kerala Gramin Bank",
    MPGB: "Madhya Pradesh Gramin Bank",
    MDGB: "Madhya Pradesh Gramin Bank",
    NMGB: "Narmada Jhabua Gramin Bank",
    OGGB: "Odisha Gramya Bank",
    PLGB: "Pallavan Grama Bank",
    PKGB: "Pragathi Krishna Gramin Bank",
    PRAGK: "Pragathi Krishna Gramin Bank",
    SGRB: "Sarva UP Gramin Bank",
    SPGB: "Saptagiri Gramin Bank",
    TGGB: "Tripura Gramin Bank",
    TNGB: "Tamil Nadu Grama Bank",
    UTGB: "Uttarakhand Gramin Bank",
    VKGB: "Vidharbha Konkan Gramin Bank",
    VJGB: "Vidharbha Konkan Gramin Bank",
    WKGB: "Wainganga Krishna Gramin Bank",
    CGGB: "Chhattisgarh Rajya Gramin Bank",
    DRGB: "Dakshin Bihar Gramin Bank",
    KGGB: "Kaveri Grameena Bank",
    CRGB: "Chaitanya Godavari Gramin Bank",
    ASBL: "Assam Gramin Vikash Bank",
    MRBK: "Maharashtra Gramin Bank",
    NCGB: "North Malabar Gramin Bank",
    // ── Cooperative Banks ─────────────────────────────────────────────────
    SVCB: "Saraswat Co-operative Bank",
    MSCI: "Maharashtra State Co-operative Bank",
    COSB: "Cosmos Co-operative Bank",
    TJSB: "TJSB Sahakari Bank",
    BDBL: "Bandhan Bank",
    BKBK: "Bandhan Bank",
  };
  return MAP[prefix] || "";
}

export function detectBankFromIFSC(ifsc: string): { id: PaymentAppId; name: string } {
  const prefix = ifsc.slice(0, 4).toUpperCase();
  const MAP: Record<string, { id: PaymentAppId; name: string }> = {
    SBIN: { id: "yono_sbi", name: "State Bank of India" },
    HDFC: { id: "hdfc_bank", name: "HDFC Bank" },
    ICIC: { id: "imobile_pay", name: "ICICI Bank" },
    UTIB: { id: "axis_pay", name: "Axis Bank" },
    KKBK: { id: "kotak_pay", name: "Kotak Mahindra Bank" },
    PUNB: { id: "pnb_one", name: "Punjab National Bank" },
    BARB: { id: "bob_world", name: "Bank of Baroda" },
    CNRB: { id: "canara_bank", name: "Canara Bank" },
    UBIN: { id: "union_bank", name: "Union Bank of India" },
    YESB: { id: "yes_pay", name: "Yes Bank" },
    FDRL: { id: "fi_money", name: "Federal Bank" },
    IDFB: { id: "idfcfirst", name: "IDFC FIRST Bank" },
    RATN: { id: "rbl_bank", name: "RBL Bank" },
    INDB: { id: "indus_pay", name: "IndusInd Bank" },
    IDIB: { id: "indpay", name: "Indian Bank" },
    AIRP: { id: "airtel_money", name: "Airtel Payments Bank" },
  };
  const resolved = resolveIFSCBankName(ifsc);
  return MAP[prefix] || { id: "upi", name: resolved || "Unknown Bank" };
}

export function parseIndianBankAccountQr(content: string, lower: string): ParsedPaymentQr | null {
  let ifsc = "", accountNo = "", holderName = "", bankName = "", accountType = "";
  const ifscMatch = content.match(/(?:ifsc|IFSC)\s*[:=]\s*([A-Z]{4}0[A-Z0-9]{6})/i);
  if (ifscMatch) ifsc = ifscMatch[1].toUpperCase();
  const accMatch = content.match(/(?:acno|acc(?:ount)?(?:no)?|a\/c|account_?(?:no|number)?)\s*[:=]\s*(\d{9,18})/i);
  if (accMatch) accountNo = accMatch[1];
  const nameMatch = content.match(/(?:name|beneficiary|holder|acname)\s*[:=]\s*([^\n|&,;]{2,40})/i);
  if (nameMatch) holderName = nameMatch[1].trim();
  const bankMatch = content.match(/(?:bank|bankname)\s*[:=]\s*([^\n|&,;]{2,30})/i);
  if (bankMatch) bankName = bankMatch[1].trim();
  const typeMatch = content.match(/(?:type|actype|account_?type)\s*[:=]\s*(savings|current|salary|nre|nro)/i);
  if (typeMatch) accountType = typeMatch[1].toUpperCase();
  if (!ifsc && content.trim().startsWith("{")) {
    try {
      const json = JSON.parse(content);
      ifsc = (json.ifsc || json.IFSC || json.ifscCode || "").toUpperCase();
      accountNo = json.accountNo || json.account_no || json.accNo || json.accountNumber || "";
      holderName = json.name || json.holderName || json.beneficiaryName || "";
      bankName = json.bank || json.bankName || "";
      accountType = json.accountType || json.type || "";
    } catch {}
  }
  if (!ifsc) {
    const lines = content.split(/[\n|]/).map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      if (!ifsc && IFSC_RE.test(line)) { ifsc = (line.match(IFSC_RE)![1]).toUpperCase(); continue; }
      if (!accountNo && ACC_RE.test(line) && !/[a-zA-Z@]/.test(line)) { accountNo = line.match(ACC_RE)![1]; continue; }
      if (!holderName && /^[A-Za-z\s.'-]{3,40}$/.test(line)) holderName = line;
    }
  }
  if (!ifsc || !IFSC_RE.test(ifsc)) return null;
  if (!bankName) bankName = resolveIFSCBankName(ifsc);
  const appInfo = detectBankFromIFSC(ifsc);
  const resolvedBank = bankName || appInfo.name;
  const displayName = [resolvedBank, accountType].filter(Boolean).join(" ");
  const recipientId = accountNo ? `${accountNo}${ifsc ? ` / ${ifsc}` : ""}` : ifsc;
  return {
    app: appInfo.id, appDisplayName: `${displayName} — Account QR`, appCategory: "upi_india", region: "India",
    recipientId, recipientName: holderName || undefined, rawContent: content, isAmountPreFilled: false, currency: "INR",
    extraFields: { ifsc, ...(accountNo && { accountNumber: accountNo }), ...(holderName && { holderName }), bankName: resolvedBank, ...(accountType && { accountType }) },
  };
}
