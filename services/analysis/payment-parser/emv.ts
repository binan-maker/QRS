import type { PaymentAppId, ParsedPaymentQr } from "../types";

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
  let detectedNetwork: { id: PaymentAppId; name: string; category: ParsedPaymentQr["appCategory"]; region: string } | null = null;
  for (let tag = 26; tag <= 51; tag++) {
    const tagId = String(tag).padStart(2, "0");
    const templateValue = tlv[tagId];
    if (!templateValue) continue;
    const sub = parseEmvTlv(templateValue);
    const aid = (sub["00"] || "").toUpperCase();
    const val01 = sub["01"] || "", val02 = sub["02"] || "", val03 = sub["03"] || "", val04 = sub["04"] || "";
    if (aid.startsWith("A000000677") || aid.includes("BHARATQR")) {
      if (!vpa && val04 && val04.includes("@")) vpa = val04;
      if (!vpa && val01 && val01.includes("@")) vpa = val01;
      if (!bankAccount && val02) bankAccount = val02;
      if (!ifsc && val03) ifsc = val03;
      if (!detectedNetwork) detectedNetwork = { id: "bharatqr", name: "BharatQR (NPCI)", category: "upi_india", region: "India" };
    } else if (aid.startsWith("A000000524") || aid.includes("RUPAY")) {
      if (!detectedNetwork) detectedNetwork = { id: "bharatqr", name: "RuPay (NPCI)", category: "upi_india", region: "India" };
    } else if (aid.startsWith("A000000533") || templateValue.toLowerCase().includes("alipay")) {
      if (!detectedNetwork) detectedNetwork = { id: "alipay", name: "Alipay (支付宝)", category: "china", region: "China" };
    } else if (aid.startsWith("A000000049") || templateValue.toLowerCase().includes("wechat")) {
      if (!detectedNetwork) detectedNetwork = { id: "wechat_pay", name: "WeChat Pay (微信支付)", category: "china", region: "China" };
    } else if (templateValue.includes("SG.PAYNOW") || templateValue.toLowerCase().includes("paynow")) {
      if (!detectedNetwork) detectedNetwork = { id: "nets_sg", name: "PayNow (Singapore)", category: "singapore_malaysia", region: "Singapore" };
    } else if (templateValue.includes("TH.PROMPTPAY") || templateValue.toLowerCase().includes("promptpay")) {
      if (!detectedNetwork) detectedNetwork = { id: "promptpay", name: "PromptPay (Thailand)", category: "thailand", region: "Thailand" };
    } else if (templateValue.includes("br.gov.bcb.pix") || templateValue.toLowerCase().includes("pix")) {
      if (!detectedNetwork) detectedNetwork = { id: "pix", name: "Pix", category: "brazil_latam", region: "Brazil" };
    } else if (templateValue.includes("DuitNow") || templateValue.toLowerCase().includes("duitnow")) {
      if (!detectedNetwork) detectedNetwork = { id: "duitnow", name: "DuitNow (Malaysia)", category: "singapore_malaysia", region: "Malaysia" };
    }
    if (!vpa) {
      for (const sv of Object.values(sub)) {
        if (sv.includes("@") && sv.length < 80) { vpa = sv; break; }
      }
    }
    const tmv = templateValue.toLowerCase();
    if (!detectedNetwork) {
      if (tmv.includes("hdfcbank") || tmv.includes("hdfc")) detectedNetwork = { id: "hdfc_bank", name: "HDFC Bank", category: "upi_india", region: "India" };
      else if (tmv.includes("oksbi") || tmv.includes("sbi")) detectedNetwork = { id: "yono_sbi", name: "YONO SBI", category: "upi_india", region: "India" };
      else if (tmv.includes("okaxis") || tmv.includes("axisbank") || tmv.includes("axis")) detectedNetwork = { id: "axis_pay", name: "Axis Pay", category: "upi_india", region: "India" };
      else if (tmv.includes("okicici") || tmv.includes("icici")) detectedNetwork = { id: "imobile_pay", name: "iMobile Pay (ICICI)", category: "upi_india", region: "India" };
      else if (tmv.includes("phonepe")) detectedNetwork = { id: "phonepe", name: "PhonePe", category: "upi_india", region: "India" };
      else if (tmv.includes("paytm")) detectedNetwork = { id: "paytm", name: "Paytm", category: "upi_india", region: "India" };
      else if (tmv.includes("bharatpe")) detectedNetwork = { id: "bharatpe", name: "BharatPe", category: "upi_india", region: "India" };
    }
  }
  if (!detectedNetwork) {
    const lc = content.toLowerCase();
    if (lc.includes("hdfcbank") || lc.includes("payzapp")) detectedNetwork = { id: "hdfc_bank", name: "HDFC Bank", category: "upi_india", region: "India" };
    else if (lc.includes("oksbi") || lc.includes("yono")) detectedNetwork = { id: "yono_sbi", name: "YONO SBI", category: "upi_india", region: "India" };
    else if (lc.includes("okaxis") || lc.includes("axisbank")) detectedNetwork = { id: "axis_pay", name: "Axis Pay", category: "upi_india", region: "India" };
    else if (lc.includes("okicici") || lc.includes("icicibank")) detectedNetwork = { id: "imobile_pay", name: "iMobile Pay (ICICI)", category: "upi_india", region: "India" };
    else if (lc.includes("bharatqr") || lc.includes("npci")) detectedNetwork = { id: "bharatqr", name: "BharatQR (NPCI)", category: "upi_india", region: "India" };
    else if (lc.includes("rupay")) detectedNetwork = { id: "bharatqr", name: "RuPay (NPCI)", category: "upi_india", region: "India" };
    else if (lc.includes("phonepe")) detectedNetwork = { id: "phonepe", name: "PhonePe", category: "upi_india", region: "India" };
    else if (lc.includes("paytm")) detectedNetwork = { id: "paytm", name: "Paytm", category: "upi_india", region: "India" };
    else if (lc.includes("bharatpe")) detectedNetwork = { id: "bharatpe", name: "BharatPe", category: "upi_india", region: "India" };
    else if (lc.includes("br.gov.bcb.pix")) detectedNetwork = { id: "pix", name: "Pix", category: "brazil_latam", region: "Brazil" };
    else if (lc.includes("sg.paynow")) detectedNetwork = { id: "nets_sg", name: "PayNow (Singapore)", category: "singapore_malaysia", region: "Singapore" };
    else if (lc.includes("th.promptpay")) detectedNetwork = { id: "promptpay", name: "PromptPay (Thailand)", category: "thailand", region: "Thailand" };
  }
  const net = detectedNetwork;
  const bankHandle = vpa?.includes("@") ? vpa.split("@")[1].toLowerCase() : undefined;
  const recipientId = vpa || bankAccount || merchantName || content.slice(0, 40);
  if (bankAccount) extraFields["accountNumber"] = bankAccount;
  if (ifsc) extraFields["ifsc"] = ifsc;
  if (mcc) extraFields["mcc"] = mcc;
  if (postalCode) extraFields["postalCode"] = postalCode;
  if (initMethod === "12") extraFields["dynamic"] = "true";
  const currencyStr = currency === "356" ? "INR" : currency || undefined;
  return {
    app: net?.id ?? "emv_generic", appDisplayName: net?.name ?? (merchantName ? "EMV Bank QR" : "EMV QR Payment"),
    appCategory: net?.category ?? "emv", region: net?.region ?? (countryCode === "IN" ? "India" : countryCode || "Regional"),
    recipientId, recipientName: merchantName || undefined,
    amount: amount && parseFloat(amount) > 0 ? amount : undefined, currency: currencyStr,
    note: merchantCity || undefined, rawContent: content,
    isAmountPreFilled: !!(amount && parseFloat(amount) > 0),
    bankHandle, vpa: vpa || undefined, isEmv: true,
    extraFields: Object.keys(extraFields).length > 0 ? extraFields : undefined,
  };
}
