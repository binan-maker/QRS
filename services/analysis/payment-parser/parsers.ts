import type { PaymentAppId, ParsedPaymentQr } from "../types";
import { PAYMENT_APP_REGISTRY, BANK_HANDLE_TO_APP, type AppDef } from "./registry";

export function isPaymentQr(content: string): boolean {
  return parseAnyPaymentQr(content) !== null;
}

export function parseAnyPaymentQr(content: string): ParsedPaymentQr | null {
  if (!content) return null;
  const lower = content.toLowerCase().trim();

  for (const app of PAYMENT_APP_REGISTRY) {
    for (const scheme of app.schemes) {
      if (lower.startsWith(scheme.toLowerCase())) return buildParsedPayment(app, content, lower);
    }
    for (const pattern of app.urlPatterns) {
      if (lower.includes(pattern.toLowerCase())) return buildParsedPayment(app, content, lower);
    }
  }

  if (lower.startsWith("000201")) return parseEmvQr(content);

  const bbpsParsed = parseBbpsQr(content, lower);
  if (bbpsParsed) return bbpsParsed;

  const bankAccountParsed = parseIndianBankAccountQr(content, lower);
  if (bankAccountParsed) return bankAccountParsed;

  if (content.startsWith("BCD\n") || content.startsWith("BCD\r\n")) return parseSepaQr(content);

  if (lower.includes("br.gov.bcb.pix")) {
    return buildParsedPayment(PAYMENT_APP_REGISTRY.find((a) => a.id === "pix")!, content, lower);
  }

  return detectUniversalPayment(content, lower);
}

function detectUniversalPayment(content: string, lower: string): ParsedPaymentQr | null {
  if (lower.includes("pa=")) return parseUnknownUpiQr(content, lower, "UPI Payment");

  const schemeMatch = content.match(/^([a-zA-Z][a-zA-Z0-9+\-.]{2,}):\/\//);
  if (schemeMatch) {
    const scheme = schemeMatch[1].toLowerCase();
    const rest = lower.slice(schemeMatch[0].length);
    const isPaymentScheme =
      scheme.includes("pay") || scheme.includes("upi") || scheme.includes("wallet") ||
      scheme.includes("money") || scheme.includes("bank") || scheme.includes("cash") ||
      rest.startsWith("pay") || rest.startsWith("upi") || rest.startsWith("payment") || rest.startsWith("transfer");
    if (isPaymentScheme) return parseSchemePaymentQr(content, lower, scheme, formatSchemeName(scheme));
  }

  const payPathMatch = lower.match(
    /https?:\/\/[^\s/]+(?:\/[^\s?]*)?\/(pay|payment|transfer|send|receive|qr-pay|payqr|collect|checkout)(?:[/?#]|$)/
  );
  if (payPathMatch) return parseUrlPaymentQr(content, lower);

  const payDomainMatch = lower.match(/https?:\/\/(?:pay|payments|payment)\.[a-z0-9.-]+/);
  if (payDomainMatch) return parseUrlPaymentQr(content, lower);

  const hasAmountField =
    /\bam(?:ount)?\s*=\s*\d/.test(lower) || /\bamt\s*=\s*\d/.test(lower) || /\bprice\s*=\s*\d/.test(lower);
  const hasPayeeField =
    /\bpa\s*=/.test(lower) || /\bvpa\s*=/.test(lower) || /\bpayee\s*=/.test(lower) ||
    /\bmerchant\s*=/.test(lower) || /\bto\s*=.+@/.test(lower);
  if (hasAmountField && hasPayeeField) return parseRawFieldPaymentQr(content, lower);

  const hasPayWord = /\bpay(?:ment|ments|now|here|online|link)?\b/i.test(content);
  const hasMoneySignal =
    /\d+/.test(content) &&
    (content.includes("@") || content.includes("INR") || content.includes("₹") ||
     content.includes("amount") || content.includes("Amount"));
  if (hasPayWord && hasMoneySignal && !content.startsWith("http")) return parseRawFieldPaymentQr(content, lower);

  return null;
}

function formatSchemeName(scheme: string): string {
  const nice = scheme.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  if (nice.toLowerCase().includes("upi")) return `${nice} (UPI)`;
  return nice;
}

function parseUnknownUpiQr(content: string, lower: string, displayName: string): ParsedPaymentQr {
  let pa = "", pn = "", cu = "INR";
  let am: string | undefined, tn: string | undefined;
  try {
    const urlLike = content.includes("://") ? content : `upi://pay?${content.includes("?") ? content.split("?")[1] : content}`;
    const params = new URLSearchParams(urlLike.split("?")[1] || "");
    pa = params.get("pa") || "";
    pn = params.get("pn") || "";
    am = params.get("am") || params.get("amount") || undefined;
    tn = params.get("tn") || params.get("note") || undefined;
    cu = params.get("cu") || "INR";
  } catch {}
  if (!pa) {
    const paMatch = content.match(/pa=([^&\s]+)/i);
    if (paMatch) pa = decodeURIComponent(paMatch[1]);
  }
  const bankHandle = pa.includes("@") ? pa.split("@")[1].toLowerCase() : "";
  const schemeRaw = content.split("://")[0]?.toLowerCase() || "upi";
  const detectedFromScheme = schemeRaw !== "upi" && schemeRaw !== "http" && schemeRaw !== "https"
    ? BANK_HANDLE_TO_APP[schemeRaw] : undefined;
  const detectedFromHandle = bankHandle ? BANK_HANDLE_TO_APP[bankHandle] : undefined;
  const detected = detectedFromHandle || detectedFromScheme;
  const appId: PaymentAppId = detected?.id ?? "upi";
  const appName = detected?.name ?? (schemeRaw === "upi" ? displayName : formatSchemeName(schemeRaw));
  return {
    app: appId, appDisplayName: appName, appCategory: "upi_india", region: "India",
    recipientId: pa, recipientName: pn ? decodeURIComponent(pn) : undefined,
    amount: am, currency: cu, note: tn ? decodeURIComponent(tn) : undefined,
    rawContent: content, isAmountPreFilled: !!am && parseFloat(am) > 0, bankHandle, vpa: pa,
  };
}

function parseSchemePaymentQr(content: string, lower: string, scheme: string, displayName: string): ParsedPaymentQr {
  if (lower.includes("pa=") || lower.includes("vpa=")) return parseUnknownUpiQr(content, lower, displayName);
  let amount: string | undefined, recipientId = "", vpa: string | undefined, bankHandle: string | undefined, recipientName: string | undefined;
  try {
    const qIdx = content.indexOf("?");
    if (qIdx >= 0) {
      const params = new URLSearchParams(content.slice(qIdx + 1));
      amount = params.get("amount") || params.get("am") || params.get("amt") || undefined;
      const pn = params.get("pn") || params.get("name");
      if (pn) recipientName = decodeURIComponent(pn);
      recipientId = params.get("to") || params.get("id") || params.get("merchant") || params.get("payee") || "";
      if (recipientId.includes("@")) { vpa = recipientId; bankHandle = recipientId.split("@")[1]; }
    }
    if (!vpa) {
      const atMatch = content.match(/[\w.+-]+@[\w.]+/);
      if (atMatch) { vpa = atMatch[0]; recipientId = recipientId || atMatch[0]; bankHandle = atMatch[0].split("@")[1]; }
    }
  } catch {}
  const isIndia = !!(vpa || scheme.includes("upi") || scheme.includes("pay") || lower.includes("inr") || lower.includes("upi"));
  return {
    app: isIndia ? "upi" : "unknown_payment", appDisplayName: displayName,
    appCategory: isIndia ? "upi_india" : "other", region: isIndia ? "India" : "Regional",
    recipientId: recipientId || content.slice(0, 60), recipientName, amount,
    rawContent: content, isAmountPreFilled: !!amount && parseFloat(amount) > 0, vpa, bankHandle,
  };
}

function parseUrlPaymentQr(content: string, lower: string): ParsedPaymentQr {
  let amount: string | undefined, recipientId = "", recipientName: string | undefined,
    vpa: string | undefined, bankHandle: string | undefined, note: string | undefined;
  let appName = "Payment", appId: PaymentAppId = "unknown_payment";
  let appCategory: ParsedPaymentQr["appCategory"] = "other", region = "Regional";
  try {
    const urlObj = new URL(content);
    const hostname = urlObj.hostname.replace(/^www\./, "");
    appName = hostname.replace(/^pay\./, "").split(".")[0];
    appName = appName.charAt(0).toUpperCase() + appName.slice(1) + " Pay";
    amount = urlObj.searchParams.get("amount") || urlObj.searchParams.get("am") || urlObj.searchParams.get("amt") || undefined;
    const pa = urlObj.searchParams.get("pa") || urlObj.searchParams.get("vpa");
    const pn = urlObj.searchParams.get("pn") || urlObj.searchParams.get("name");
    note = urlObj.searchParams.get("tn") || urlObj.searchParams.get("note") || undefined;
    if (pa) {
      recipientId = pa; vpa = pa; bankHandle = pa.includes("@") ? pa.split("@")[1] : undefined;
      appCategory = "upi_india"; region = "India"; appId = "upi";
    } else {
      recipientId = urlObj.searchParams.get("to") || urlObj.searchParams.get("merchant") || urlObj.pathname.split("/").pop() || "";
      if (recipientId.includes("@")) { vpa = recipientId; bankHandle = recipientId.split("@")[1]; appCategory = "upi_india"; region = "India"; appId = "upi"; }
    }
    if (pn) recipientName = decodeURIComponent(pn);
    if (!recipientId) recipientId = content.slice(0, 60);
  } catch {
    recipientId = content.slice(0, 60);
    const atMatch = content.match(/[\w.+-]+@[\w.]+/);
    if (atMatch) { vpa = atMatch[0]; recipientId = atMatch[0]; bankHandle = atMatch[0].split("@")[1]; appCategory = "upi_india"; region = "India"; appId = "upi"; }
  }
  return { app: appId, appDisplayName: appName, appCategory, region, recipientId, recipientName, amount, rawContent: content, isAmountPreFilled: !!amount && parseFloat(amount) > 0, vpa, bankHandle, note };
}

function parseRawFieldPaymentQr(content: string, lower: string): ParsedPaymentQr {
  let amount: string | undefined, recipientId = "", recipientName: string | undefined, vpa: string | undefined, bankHandle: string | undefined;
  const amMatch = content.match(/(?:amount|am|amt|price)\s*[=:]\s*([\d.]+)/i);
  if (amMatch) amount = amMatch[1];
  const payeeMatch = content.match(/(?:pa|vpa|payee|merchant)\s*[=:]\s*([^\s|&,]+)/i);
  if (payeeMatch) recipientId = payeeMatch[1];
  const nameMatch = content.match(/(?:pn|name|payeename|merchantname)\s*[=:]\s*([^|&,\n]+)/i);
  if (nameMatch) recipientName = decodeURIComponent(nameMatch[1].trim());
  if (!recipientId) {
    const atMatch = content.match(/[\w.+-]+@[\w.]+/);
    if (atMatch) recipientId = atMatch[0];
  }
  if (recipientId.includes("@")) { vpa = recipientId; bankHandle = recipientId.split("@")[1]; }
  const isIndia = !!(vpa || lower.includes("inr") || lower.includes("₹") || lower.includes("upi"));
  return {
    app: isIndia ? "upi" : "unknown_payment", appDisplayName: isIndia ? "UPI Payment" : "Payment QR",
    appCategory: isIndia ? "upi_india" : "other", region: isIndia ? "India" : "Regional",
    recipientId: recipientId || content.slice(0, 60), recipientName, amount,
    rawContent: content, isAmountPreFilled: !!amount && parseFloat(amount) > 0, vpa, bankHandle,
  };
}

function buildParsedPayment(app: AppDef, content: string, lower: string): ParsedPaymentQr {
  try {
    if (app.category === "upi_india") return parseUpiContent(app, content);
    if (app.category === "crypto") return parseCryptoContent(app, content);
    return parseGenericPayment(app, content, lower);
  } catch {
    return parseGenericPayment(app, content, lower);
  }
}

function parseUpiContent(app: AppDef, content: string): ParsedPaymentQr {
  let url: URL;
  try { url = new URL(content); } catch { return parseGenericPayment(app, content, content.toLowerCase()); }
  const params = url.searchParams;
  const pa = params.get("pa") || "", pn = params.get("pn") || "";
  const am = params.get("am") || undefined, tn = params.get("tn") || undefined, cu = params.get("cu") || "INR";
  const bankHandle = pa.split("@")[1] || "";
  return {
    app: app.id, appDisplayName: app.displayName, appCategory: app.category, region: app.region,
    recipientId: pa, recipientName: pn ? decodeURIComponent(pn) : undefined,
    amount: am, currency: cu, note: tn ? decodeURIComponent(tn) : undefined,
    rawContent: content, isAmountPreFilled: !!am && parseFloat(am) > 0, bankHandle, vpa: pa,
  };
}

function parseCryptoContent(app: AppDef, content: string): ParsedPaymentQr {
  let address = content, amount: string | undefined;
  try {
    const colonIdx = content.indexOf(":");
    if (colonIdx >= 0) {
      address = content.slice(colonIdx + 1).split("?")[0].split("/")[0];
      const qIdx = content.indexOf("?");
      if (qIdx >= 0) {
        const params = new URLSearchParams(content.slice(qIdx + 1));
        amount = params.get("amount") || params.get("value") || undefined;
      }
    }
  } catch {}
  return { app: app.id, appDisplayName: app.displayName, appCategory: "crypto", region: app.region, recipientId: address, amount, rawContent: content, isAmountPreFilled: !!amount, coinType: app.id };
}

function parseGenericPayment(app: AppDef, content: string, lower: string): ParsedPaymentQr {
  let recipientId = "", amount: string | undefined;
  if (lower.includes("paypal.me/")) {
    recipientId = content.split("paypal.me/")[1]?.split("?")[0]?.split("/")[0] || "";
    amount = new URLSearchParams(content.split("?")[1] || "").get("amount") || undefined;
  } else if (lower.includes("cash.app/$")) {
    recipientId = "$" + (content.split("cash.app/$")[1]?.split("?")[0] || "");
    amount = new URLSearchParams(content.split("?")[1] || "").get("amount") || undefined;
  } else if (lower.includes("venmo.com")) {
    recipientId = content.split("venmo.com/u/")[1]?.split("?")[0] || "";
  } else if (lower.includes("revolut.me/")) {
    recipientId = content.split("revolut.me/")[1]?.split("?")[0] || "";
    amount = new URLSearchParams(content.split("?")[1] || "").get("amount") || undefined;
  } else if (lower.includes("tikkie.me/")) {
    recipientId = content.split("tikkie.me/")[1]?.split("?")[0] || "";
  } else if (lower.includes("picpay.me/")) {
    recipientId = content.split("picpay.me/")[1]?.split("?")[0] || "";
  } else {
    recipientId = content.slice(0, 60);
  }
  return { app: app.id, appDisplayName: app.displayName, appCategory: app.category, region: app.region, recipientId, amount, rawContent: content, isAmountPreFilled: !!amount };
}

function parseSepaQr(content: string): ParsedPaymentQr {
  const lines = content.split(/\r?\n/);
  const iban = lines[6] || "", name = lines[5] || "";
  const amount = lines[7] ? lines[7].replace(/[^0-9.]/g, "") : undefined;
  return { app: "sepa_transfer", appDisplayName: "SEPA Credit Transfer", appCategory: "europe", region: "Europe", recipientId: iban, recipientName: name, amount, currency: "EUR", note: lines[9] || undefined, rawContent: content, isAmountPreFilled: !!amount };
}

function parseEmvTlv(data: string): Record<string, string> {
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

function parseEmvQr(content: string): ParsedPaymentQr {
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

function parseBbpsQr(content: string, lower: string): ParsedPaymentQr | null {
  const isBbps = lower.startsWith("bbps://") || lower.startsWith("https://bbps.") ||
    lower.includes("bbpsonline.com") || lower.includes("billpayment.npci") ||
    (lower.includes("billerid=") && (lower.includes("bbps") || lower.includes("biller")));
  if (!isBbps) return null;
  let billerId = "", amount: string | undefined, customerParam = "", category = "", note: string | undefined;
  try {
    const url = new URL(content.startsWith("bbps://") ? `https://${content.slice(7)}` : content);
    billerId = url.searchParams.get("billerId") || url.searchParams.get("biller_id") || "";
    amount = url.searchParams.get("amount") || url.searchParams.get("am") || undefined;
    customerParam = url.searchParams.get("customerParam") || url.searchParams.get("customerId") || "";
    category = url.searchParams.get("category") || url.pathname.split("/")[1] || "";
    note = url.searchParams.get("remarks") || url.searchParams.get("note") || undefined;
  } catch {
    const billerMatch = content.match(/billerid=([^&\s]+)/i);
    if (billerMatch) billerId = billerMatch[1];
    const amMatch = content.match(/amount=([^&\s]+)/i);
    if (amMatch) amount = amMatch[1];
    const custMatch = content.match(/customerparam=([^&\s]+)/i);
    if (custMatch) customerParam = custMatch[1];
  }
  const categoryLabel = category ? category.charAt(0).toUpperCase() + category.slice(1).toLowerCase() : "Bill";
  return {
    app: "upi", appDisplayName: `BBPS ${categoryLabel} Payment`, appCategory: "upi_india", region: "India",
    recipientId: billerId || customerParam || "BBPS", recipientName: billerId || undefined,
    amount, currency: "INR", note: note || (customerParam ? `Customer: ${customerParam}` : undefined),
    rawContent: content, isAmountPreFilled: !!(amount && parseFloat(amount) > 0),
    extraFields: { ...(billerId && { billerId }), ...(customerParam && { customerParam }), ...(category && { category }) },
  };
}

function parseIndianBankAccountQr(content: string, lower: string): ParsedPaymentQr | null {
  const IFSC_RE = /\b([A-Z]{4}0[A-Z0-9]{6})\b/;
  const ACC_RE = /\b(\d{9,18})\b/;
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

function resolveIFSCBankName(ifsc: string): string {
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

function detectBankFromIFSC(ifsc: string): { id: PaymentAppId; name: string } {
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
