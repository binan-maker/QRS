import type { ParsedPaymentQr } from "../types";

const IFSC_RE = /\b([A-Z]{4}0[A-Z0-9]{6})\b/;

export function parseIndianBankAccountQr(content: string, _lower: string): ParsedPaymentQr | null {
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
  if (!ifsc || !IFSC_RE.test(ifsc) || !accountNo) return null;
  const recipientId = `${accountNo} (${ifsc})`;
  return {
    app: "upi",
    appDisplayName: bankName || "Bank Account",
    appCategory: "upi_india",
    region: "India",
    recipientId,
    recipientName: holderName || undefined,
    rawContent: content,
    isAmountPreFilled: false,
    currency: "INR",
    extraFields: {
      ifsc,
      accountNumber: accountNo,
      ...(holderName && { holderName }),
      ...(bankName && { bankName }),
      ...(accountType && { accountType }),
    },
  };
}
