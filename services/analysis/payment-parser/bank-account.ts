import type { PaymentAppId, ParsedPaymentQr } from "../types";

const IFSC_RE = /\b([A-Z]{4}0[A-Z0-9]{6})\b/;
const ACC_RE = /\b(\d{9,18})\b/;

export function resolveIFSCBankName(ifsc: string): string {
  const prefix = ifsc.slice(0, 4).toUpperCase();
  const MAP: Record<string, string> = {
    SBIN: "State Bank of India", HDFC: "HDFC Bank", ICIC: "ICICI Bank", UTIB: "Axis Bank",
    KKBK: "Kotak Mahindra Bank", PUNB: "Punjab National Bank", BARB: "Bank of Baroda",
    CNRB: "Canara Bank", UBIN: "Union Bank of India", IOBA: "Indian Overseas Bank",
    ANDB: "Andhra Bank", CORP: "Corporation Bank", MAHB: "Bank of Maharashtra",
    IDIB: "Indian Bank", UCBA: "UCO Bank", VIJB: "Vijaya Bank", ALLA: "Allahabad Bank",
    ORBC: "Oriental Bank of Commerce", BKID: "Bank of India", CBIN: "Central Bank of India",
    PSIB: "Punjab & Sind Bank", INDB: "IndusInd Bank", IDFB: "IDFC FIRST Bank",
    RATN: "RBL Bank", YESB: "Yes Bank", FDRL: "Federal Bank", KARB: "Karnataka Bank",
    KVBL: "Karur Vysya Bank", SIBL: "South Indian Bank", DLXB: "Dhanlaxmi Bank",
    NKGS: "NKGSB Co-operative Bank", AIRP: "Airtel Payments Bank",
    FINO: "Fino Payments Bank", IPOS: "India Post Payments Bank",
    PAYT: "Paytm Payments Bank", JAKA: "Jammu & Kashmir Bank",
  };
  return MAP[prefix] || "";
}

export function detectBankFromIFSC(ifsc: string): { id: PaymentAppId; name: string } {
  const prefix = ifsc.slice(0, 4).toUpperCase();
  const MAP: Record<string, { id: PaymentAppId; name: string }> = {
    SBIN: { id: "yono_sbi", name: "State Bank of India" }, HDFC: { id: "hdfc_bank", name: "HDFC Bank" },
    ICIC: { id: "imobile_pay", name: "ICICI Bank" }, UTIB: { id: "axis_pay", name: "Axis Bank" },
    KKBK: { id: "kotak_pay", name: "Kotak Mahindra Bank" }, PUNB: { id: "pnb_one", name: "Punjab National Bank" },
    BARB: { id: "bob_world", name: "Bank of Baroda" }, CNRB: { id: "canara_bank", name: "Canara Bank" },
    UBIN: { id: "union_bank", name: "Union Bank of India" }, YESB: { id: "yes_pay", name: "Yes Bank" },
    FDRL: { id: "fi_money", name: "Federal Bank" }, IDFB: { id: "idfcfirst", name: "IDFC FIRST Bank" },
    RATN: { id: "rbl_bank", name: "RBL Bank" }, INDB: { id: "indus_pay", name: "IndusInd Bank" },
    IDIB: { id: "indpay", name: "Indian Bank" }, AIRP: { id: "airtel_money", name: "Airtel Payments Bank" },
  };
  return MAP[prefix] || { id: "upi", name: resolveIFSCBankName(ifsc) || "Indian Bank" };
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
  const displayName = [bankName || appInfo.name, accountType].filter(Boolean).join(" ");
  const recipientId = accountNo ? `${accountNo}${ifsc ? ` / ${ifsc}` : ""}` : ifsc;
  return {
    app: appInfo.id, appDisplayName: `${displayName} — Account QR`, appCategory: "upi_india", region: "India",
    recipientId, recipientName: holderName || undefined, rawContent: content, isAmountPreFilled: false, currency: "INR",
    extraFields: { ifsc, ...(accountNo && { accountNumber: accountNo }), ...(holderName && { holderName }), ...(bankName && { bankName }), ...(accountType && { accountType }) },
  };
}
