import type { ParsedPaymentQr } from "../types";

export function parseEmvTlv(data: string): Record<string, string> {
  const result: Record<string, string> = {};
  let i = 0;
  while (i + 4 <= data.length) {
    const id = data.slice(i, i + 2);
    const len = parseInt(data.slice(i + 2, i + 4), 10);
    if (isNaN(len) || len < 0 || i + 4 + len > data.length) break;
    result[id] = data.slice(i + 4, i + 4 + len);
    i += 4 + len;
  }
  return result;
}

export function parseEmvQr(content: string): ParsedPaymentQr {
  const tlv = parseEmvTlv(content);
  const merchantName = tlv["59"] || "", merchantCity = tlv["60"] || "", countryCode = tlv["58"] || "";
  const currency = tlv["53"] || "", amount = tlv["54"] || undefined, mcc = tlv["52"] || "";
  const postalCode = tlv["61"] || "", initMethod = tlv["01"] || "";
  const extraFields: Record<string, string> = {};
  if (tlv["62"]) {
    const extra = parseEmvTlv(tlv["62"]);
    if (extra["01"]) extraFields["billNumber"] = extra["01"];
    if (extra["05"]) extraFields["referenceLabel"] = extra["05"];
    if (extra["07"]) extraFields["terminalId"] = extra["07"];
    if (extra["08"]) extraFields["purpose"] = extra["08"];
  }
  let vpa = "", bankAccount = "", ifsc = "";
  for (let tag = 26; tag <= 51; tag++) {
    const tagId = String(tag).padStart(2, "0");
    const templateValue = tlv[tagId];
    if (!templateValue) continue;
    const sub = parseEmvTlv(templateValue);
    const val01 = sub["01"] || "", val02 = sub["02"] || "", val03 = sub["03"] || "", val04 = sub["04"] || "";
    if (!vpa && val04 && val04.includes("@")) vpa = val04;
    if (!vpa && val01 && val01.includes("@")) vpa = val01;
    if (!bankAccount && val02 && /^\d{8,18}$/.test(val02)) bankAccount = val02;
    if (!ifsc && val03 && /^[A-Z]{4}0[A-Z0-9]{6}$/i.test(val03)) ifsc = val03;
    if (!vpa) {
      for (const sv of Object.values(sub)) {
        if (sv.includes("@") && sv.length < 80) { vpa = sv; break; }
      }
    }
  }
  const bankHandle = vpa?.includes("@") ? vpa.split("@")[1].toLowerCase() : undefined;
  const recipientId = vpa || bankAccount || merchantName || content.slice(0, 40);
  if (bankAccount) extraFields["accountNumber"] = bankAccount;
  if (ifsc) extraFields["ifsc"] = ifsc;
  if (mcc) extraFields["mcc"] = mcc;
  if (postalCode) extraFields["postalCode"] = postalCode;
  if (initMethod === "12") extraFields["dynamic"] = "true";
  const currencyStr = currency === "356" ? "INR" : currency || undefined;
  return {
    app: vpa ? "upi" : "emv_generic",
    appDisplayName: "Payment QR",
    appCategory: vpa ? "upi_india" : "emv",
    region: countryCode === "IN" ? "India" : countryCode || "Global",
    recipientId,
    recipientName: merchantName || undefined,
    amount: amount && parseFloat(amount) > 0 ? amount : undefined,
    currency: currencyStr,
    note: merchantCity || undefined,
    rawContent: content,
    isAmountPreFilled: !!(amount && parseFloat(amount) > 0),
    bankHandle,
    vpa: vpa || undefined,
    isEmv: true,
    extraFields: Object.keys(extraFields).length > 0 ? extraFields : undefined,
  };
}
