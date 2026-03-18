import type { PaymentAppId, ParsedPaymentQr } from "./types";

interface AppDef {
  id: PaymentAppId;
  displayName: string;
  category: ParsedPaymentQr["appCategory"];
  region: string;
  schemes: string[];
  urlPatterns: string[];
  trustedDomains?: string[];
}

const PAYMENT_APP_REGISTRY: AppDef[] = [
  { id: "upi", displayName: "UPI", category: "upi_india", region: "India",
    schemes: ["upi://pay"], urlPatterns: [], trustedDomains: ["upi.npci.org.in"] },
  { id: "gpay_india", displayName: "Google Pay (GPay)", category: "upi_india", region: "India",
    schemes: ["tez://upi", "gpay://upi"], urlPatterns: ["pay.google.com/gp/p/ui"],
    trustedDomains: ["pay.google.com"] },
  { id: "phonepe", displayName: "PhonePe", category: "upi_india", region: "India",
    schemes: ["phonepe://pay", "phonepe://upi"], urlPatterns: ["phonepe.com/transact"],
    trustedDomains: ["phonepe.com"] },
  { id: "paytm", displayName: "Paytm", category: "upi_india", region: "India",
    schemes: ["paytm://"], urlPatterns: ["p.paytm.me", "paytm.com/qr"],
    trustedDomains: ["paytm.com", "p.paytm.me"] },
  { id: "bhim", displayName: "BHIM", category: "upi_india", region: "India",
    schemes: ["bhim://"], urlPatterns: [], trustedDomains: ["bhimupi.org.in"] },
  { id: "amazon_pay", displayName: "Amazon Pay", category: "upi_india", region: "India",
    schemes: ["amazonpay://", "amazon://pay"], urlPatterns: ["amazon.in/pay", "amazonpay.in"],
    trustedDomains: ["amazon.in", "amazonpay.in"] },
  { id: "cred", displayName: "CRED Pay", category: "upi_india", region: "India",
    schemes: ["cred://", "credpay://"], urlPatterns: ["cred.club/pay"],
    trustedDomains: ["cred.club"] },
  { id: "freecharge", displayName: "FreeCharge", category: "upi_india", region: "India",
    schemes: ["freecharge://"], urlPatterns: ["freecharge.in"],
    trustedDomains: ["freecharge.in"] },
  { id: "mobikwik", displayName: "MobiKwik", category: "upi_india", region: "India",
    schemes: ["mobikwik://"], urlPatterns: ["mobikwik.com"],
    trustedDomains: ["mobikwik.com"] },
  { id: "airtel_money", displayName: "Airtel Payments Bank", category: "upi_india", region: "India",
    schemes: ["airtelpe://", "airtelmoney://"], urlPatterns: ["airtelpebank.in", "airtelpayments"],
    trustedDomains: ["airtelpebank.in"] },
  { id: "jiomoney", displayName: "JioMoney", category: "upi_india", region: "India",
    schemes: ["jiomoney://"], urlPatterns: ["jiomoney.com"],
    trustedDomains: ["jiomoney.com"] },
  { id: "razorpay", displayName: "Razorpay", category: "india_wallet", region: "India",
    schemes: ["razorpay://"], urlPatterns: ["rzp.io", "razorpay.com/payment"],
    trustedDomains: ["razorpay.com", "rzp.io"] },
  { id: "cashfree", displayName: "Cashfree", category: "india_wallet", region: "India",
    schemes: ["cashfree://"], urlPatterns: ["cashfree.com"],
    trustedDomains: ["cashfree.com"] },
  { id: "payu", displayName: "PayU", category: "india_wallet", region: "India",
    schemes: ["payu://"], urlPatterns: ["payu.in", "secure.payu.in"],
    trustedDomains: ["payu.in"] },
  { id: "bajaj_pay", displayName: "Bajaj Pay", category: "upi_india", region: "India",
    schemes: ["bajajpay://"], urlPatterns: ["bajajfinserv.in/pay"],
    trustedDomains: ["bajajfinserv.in"] },
  { id: "yono_sbi", displayName: "YONO SBI", category: "upi_india", region: "India",
    schemes: ["yono://"], urlPatterns: ["yono.sbi.co.in"],
    trustedDomains: ["yono.sbi.co.in", "sbi.co.in"] },
  { id: "imobile_pay", displayName: "iMobile Pay (ICICI)", category: "upi_india", region: "India",
    schemes: ["imobilepay://"], urlPatterns: ["icicibank.com/imobile"],
    trustedDomains: ["icicibank.com"] },
  { id: "slice", displayName: "Slice", category: "upi_india", region: "India",
    schemes: ["slice://"], urlPatterns: ["sliceit.in"],
    trustedDomains: ["sliceit.in"] },
  { id: "juspay", displayName: "JusPay", category: "india_wallet", region: "India",
    schemes: ["juspay://"], urlPatterns: ["juspay.in"],
    trustedDomains: ["juspay.in"] },
  { id: "alipay", displayName: "Alipay (支付宝)", category: "china", region: "China",
    schemes: ["alipay://", "alipays://"], urlPatterns: ["qr.alipay.com", "global.alipay.com", "intl.alipay.com"],
    trustedDomains: ["alipay.com", "alipayobjects.com"] },
  { id: "wechat_pay", displayName: "WeChat Pay (微信支付)", category: "china", region: "China",
    schemes: ["wxp://", "weixin://wxpay", "weixin://dl/pay"],
    urlPatterns: ["wx.tenpay.com", "weixin.qq.com/q/", "qr.weixin.qq.com"],
    trustedDomains: ["weixin.qq.com", "tenpay.com"] },
  { id: "paypal", displayName: "PayPal", category: "global_wallet", region: "Global",
    schemes: ["paypal://"], urlPatterns: ["paypal.me/", "paypal.com/qrcodes", "paypal.com/paypalme"],
    trustedDomains: ["paypal.com", "paypal.me"] },
  { id: "venmo", displayName: "Venmo", category: "us_payment", region: "USA",
    schemes: ["venmo://"], urlPatterns: ["venmo.com/u/", "venmo.com/code"],
    trustedDomains: ["venmo.com"] },
  { id: "cash_app", displayName: "Cash App", category: "us_payment", region: "USA",
    schemes: ["cashapp://"], urlPatterns: ["cash.app/$"],
    trustedDomains: ["cash.app"] },
  { id: "zelle", displayName: "Zelle", category: "us_payment", region: "USA",
    schemes: ["zelle://"], urlPatterns: ["zellepay.com"],
    trustedDomains: ["zellepay.com"] },
  { id: "stripe", displayName: "Stripe", category: "us_payment", region: "Global",
    schemes: [], urlPatterns: ["buy.stripe.com/", "checkout.stripe.com/"],
    trustedDomains: ["stripe.com", "buy.stripe.com"] },
  { id: "square", displayName: "Square", category: "us_payment", region: "Global",
    schemes: [], urlPatterns: ["square.link/", "squareup.com/pay", "squareup.com/appointments"],
    trustedDomains: ["squareup.com", "square.link"] },
  { id: "grabpay", displayName: "GrabPay", category: "southeast_asia", region: "SE Asia",
    schemes: ["grab://", "grabpay://"], urlPatterns: ["grab.com/pay", "grbpay.com", "app.grab.com"],
    trustedDomains: ["grab.com"] },
  { id: "gopay", displayName: "GoPay (GoJek)", category: "southeast_asia", region: "Indonesia",
    schemes: ["gojek://", "gopay://"], urlPatterns: ["link.gojek.com", "gojek.com/gopay"],
    trustedDomains: ["gojek.com", "link.gojek.com"] },
  { id: "ovo", displayName: "OVO", category: "southeast_asia", region: "Indonesia",
    schemes: ["ovo://"], urlPatterns: ["app.ovo.id", "ovo.id/pay"],
    trustedDomains: ["ovo.id"] },
  { id: "dana", displayName: "DANA", category: "southeast_asia", region: "Indonesia",
    schemes: ["dana://"], urlPatterns: ["link.dana.id", "dana.id/pay"],
    trustedDomains: ["dana.id"] },
  { id: "linkaja", displayName: "LinkAja", category: "southeast_asia", region: "Indonesia",
    schemes: ["linkaja://"], urlPatterns: ["linkaja.id"],
    trustedDomains: ["linkaja.id"] },
  { id: "shopeepay", displayName: "ShopeePay", category: "southeast_asia", region: "SE Asia",
    schemes: ["shopeepay://"], urlPatterns: ["shopeepay.com", "shopee.com/universal-link/pay"],
    trustedDomains: ["shopeepay.com", "shopee.com"] },
  { id: "line_pay", displayName: "LINE Pay", category: "southeast_asia", region: "SE Asia",
    schemes: ["linepay://", "line://payment"], urlPatterns: ["pay.line.me", "line.me/R/pay"],
    trustedDomains: ["pay.line.me", "line.me"] },
  { id: "truemoney", displayName: "TrueMoney Wallet", category: "southeast_asia", region: "Thailand",
    schemes: ["truemoney://", "truemoneygo://"], urlPatterns: ["truemoney.com"],
    trustedDomains: ["truemoney.com"] },
  { id: "momo_vn", displayName: "MoMo", category: "southeast_asia", region: "Vietnam",
    schemes: ["momo://"], urlPatterns: ["momo.vn/pay", "nhantien.momo.vn"],
    trustedDomains: ["momo.vn"] },
  { id: "zalopay", displayName: "ZaloPay", category: "southeast_asia", region: "Vietnam",
    schemes: ["zalopay://"], urlPatterns: ["zalopay.vn"],
    trustedDomains: ["zalopay.vn"] },
  { id: "gcash", displayName: "GCash", category: "southeast_asia", region: "Philippines",
    schemes: ["gcash://"], urlPatterns: ["gcash.com/pay", "m.me/gcashofficial"],
    trustedDomains: ["gcash.com"] },
  { id: "maya", displayName: "Maya (PayMaya)", category: "southeast_asia", region: "Philippines",
    schemes: ["maya://", "paymaya://"], urlPatterns: ["maya.ph/pay", "paymaya.com"],
    trustedDomains: ["maya.ph", "paymaya.com"] },
  { id: "kakaopay", displayName: "KakaoPay", category: "korea", region: "South Korea",
    schemes: ["kakaopay://"], urlPatterns: ["qr.kakaopay.com", "kakaopay.com/qr"],
    trustedDomains: ["kakaopay.com"] },
  { id: "toss", displayName: "Toss", category: "korea", region: "South Korea",
    schemes: ["supertoss://", "toss://"], urlPatterns: ["toss.im/transfer", "toss.im/pay"],
    trustedDomains: ["toss.im"] },
  { id: "naverpay", displayName: "Naver Pay", category: "korea", region: "South Korea",
    schemes: ["naverpay://"], urlPatterns: ["pay.naver.com"],
    trustedDomains: ["pay.naver.com"] },
  { id: "payco", displayName: "PAYCO", category: "korea", region: "South Korea",
    schemes: ["payco://"], urlPatterns: ["payco.com"],
    trustedDomains: ["payco.com"] },
  { id: "paypay_jp", displayName: "PayPay", category: "japan", region: "Japan",
    schemes: ["paypay://"], urlPatterns: ["qr.paypay.ne.jp", "pay.paypay.ne.jp"],
    trustedDomains: ["paypay.ne.jp"] },
  { id: "merpay", displayName: "Merpay", category: "japan", region: "Japan",
    schemes: ["merpay://"], urlPatterns: ["merpay.com/pay"],
    trustedDomains: ["merpay.com"] },
  { id: "rakuten_pay", displayName: "Rakuten Pay", category: "japan", region: "Japan",
    schemes: ["rakutenpay://"], urlPatterns: ["pay.rakuten.co.jp", "pay.r10s.jp"],
    trustedDomains: ["rakuten.co.jp"] },
  { id: "d_payment", displayName: "d払い (d Payment)", category: "japan", region: "Japan",
    schemes: ["dpay://", "d-payment://"], urlPatterns: ["service.smt.docomo.ne.jp/keitai_payment"],
    trustedDomains: ["docomo.ne.jp"] },
  { id: "au_pay", displayName: "au PAY", category: "japan", region: "Japan",
    schemes: ["aupay://"], urlPatterns: ["pay.au.com", "aupay.wallet.auone.jp"],
    trustedDomains: ["au.com", "auone.jp"] },
  { id: "paylah", displayName: "DBS PayLah!", category: "singapore_malaysia", region: "Singapore",
    schemes: ["paylah://", "dbspaylah://"], urlPatterns: ["paylah.dbs.com", "dbs.com/lah"],
    trustedDomains: ["dbs.com", "dbs.com.sg"] },
  { id: "duitnow", displayName: "DuitNow", category: "singapore_malaysia", region: "Malaysia",
    schemes: ["duitnow://"], urlPatterns: ["duitnow.my", "jompay.my"],
    trustedDomains: ["duitnow.my"] },
  { id: "touchngo", displayName: "Touch 'n Go eWallet", category: "singapore_malaysia", region: "Malaysia",
    schemes: ["tng://", "tng-ewallet://", "tngdigital://"], urlPatterns: ["tngdigital.com.my", "touchngo.com.my"],
    trustedDomains: ["touchngo.com.my", "tngdigital.com.my"] },
  { id: "boost_my", displayName: "Boost", category: "singapore_malaysia", region: "Malaysia",
    schemes: ["boost://"], urlPatterns: ["boost.com.my"],
    trustedDomains: ["boost.com.my"] },
  { id: "promptpay", displayName: "PromptPay", category: "thailand", region: "Thailand",
    schemes: [], urlPatterns: ["promptpay.io", "promptpay.kasikornbank.com"],
    trustedDomains: ["promptpay.io", "kasikornbank.com"] },
  { id: "pix", displayName: "Pix", category: "brazil_latam", region: "Brazil",
    schemes: [], urlPatterns: ["pix.bcb.gov.br"],
    trustedDomains: ["bcb.gov.br"] },
  { id: "mercado_pago", displayName: "Mercado Pago", category: "brazil_latam", region: "LATAM",
    schemes: ["mercadopago://"], urlPatterns: ["mercadopago.com", "mpago.la"],
    trustedDomains: ["mercadopago.com", "mpago.la"] },
  { id: "picpay", displayName: "PicPay", category: "brazil_latam", region: "Brazil",
    schemes: ["picpay://"], urlPatterns: ["picpay.me/"],
    trustedDomains: ["picpay.me", "picpay.com"] },
  { id: "revolut", displayName: "Revolut", category: "europe", region: "Europe",
    schemes: ["revolut://"], urlPatterns: ["revolut.me/", "pay.revolut.com"],
    trustedDomains: ["revolut.com", "revolut.me"] },
  { id: "wise", displayName: "Wise (TransferWise)", category: "europe", region: "Global",
    schemes: ["wise://"], urlPatterns: ["wise.com/pay/", "transferwise.com"],
    trustedDomains: ["wise.com", "transferwise.com"] },
  { id: "twint", displayName: "TWINT", category: "europe", region: "Switzerland",
    schemes: ["twint://"], urlPatterns: ["app.twint.ch", "pay.twint.ch"],
    trustedDomains: ["twint.ch"] },
  { id: "swish_se", displayName: "Swish", category: "europe", region: "Sweden",
    schemes: ["swish://"], urlPatterns: ["swish.nu"],
    trustedDomains: ["swish.nu"] },
  { id: "bizum_es", displayName: "Bizum", category: "europe", region: "Spain",
    schemes: ["bizum://"], urlPatterns: ["bizum.es"],
    trustedDomains: ["bizum.es"] },
  { id: "satispay_it", displayName: "Satispay", category: "europe", region: "Italy",
    schemes: ["satispay://"], urlPatterns: ["satispay.com"],
    trustedDomains: ["satispay.com"] },
  { id: "blik_pl", displayName: "BLIK", category: "europe", region: "Poland",
    schemes: ["blik://"], urlPatterns: ["blik.pl"],
    trustedDomains: ["blik.pl"] },
  { id: "tikkie_nl", displayName: "Tikkie", category: "europe", region: "Netherlands",
    schemes: ["tikkie://"], urlPatterns: ["tikkie.me/"],
    trustedDomains: ["tikkie.me"] },
  { id: "mpesa", displayName: "M-Pesa", category: "africa", region: "Africa",
    schemes: ["mpesa://"], urlPatterns: ["m-pesa.com", "mpesa.safaricom.com", "safaricom.co.ke/mpesa"],
    trustedDomains: ["safaricom.co.ke", "m-pesa.com"] },
  { id: "stc_pay", displayName: "STC Pay", category: "middle_east", region: "Saudi Arabia",
    schemes: ["stcpay://"], urlPatterns: ["stcpay.com.sa"],
    trustedDomains: ["stcpay.com.sa"] },
  { id: "benefitpay", displayName: "BenefitPay", category: "middle_east", region: "Bahrain",
    schemes: ["benefitpay://"], urlPatterns: ["benefit.bh"],
    trustedDomains: ["benefit.bh"] },
  { id: "bitcoin", displayName: "Bitcoin (BTC)", category: "crypto", region: "Global",
    schemes: ["bitcoin:"], urlPatterns: [], trustedDomains: [] },
  { id: "ethereum", displayName: "Ethereum (ETH)", category: "crypto", region: "Global",
    schemes: ["ethereum:", "eth:"], urlPatterns: [], trustedDomains: [] },
  { id: "litecoin", displayName: "Litecoin (LTC)", category: "crypto", region: "Global",
    schemes: ["litecoin:"], urlPatterns: [], trustedDomains: [] },
  { id: "monero", displayName: "Monero (XMR)", category: "crypto", region: "Global",
    schemes: ["monero:"], urlPatterns: [], trustedDomains: [] },
  { id: "bitcoin_cash", displayName: "Bitcoin Cash (BCH)", category: "crypto", region: "Global",
    schemes: ["bitcoincash:"], urlPatterns: [], trustedDomains: [] },
  { id: "solana", displayName: "Solana (SOL)", category: "crypto", region: "Global",
    schemes: ["solana:"], urlPatterns: [], trustedDomains: [] },
  { id: "xrp", displayName: "XRP (Ripple)", category: "crypto", region: "Global",
    schemes: ["xrpl:", "ripple:", "xrp:"], urlPatterns: [], trustedDomains: [] },
  { id: "dogecoin", displayName: "Dogecoin (DOGE)", category: "crypto", region: "Global",
    schemes: ["dogecoin:"], urlPatterns: [], trustedDomains: [] },
  { id: "bnb", displayName: "BNB (Binance)", category: "crypto", region: "Global",
    schemes: ["bnb:", "binance:"], urlPatterns: [], trustedDomains: [] },
  { id: "tron", displayName: "TRON (TRX)", category: "crypto", region: "Global",
    schemes: ["tron:"], urlPatterns: [], trustedDomains: [] },
];

export function isPaymentQr(content: string): boolean {
  return parseAnyPaymentQr(content) !== null;
}

export function parseAnyPaymentQr(content: string): ParsedPaymentQr | null {
  if (!content) return null;
  const lower = content.toLowerCase().trim();

  for (const app of PAYMENT_APP_REGISTRY) {
    for (const scheme of app.schemes) {
      if (lower.startsWith(scheme.toLowerCase())) {
        return buildParsedPayment(app, content, lower);
      }
    }
    for (const pattern of app.urlPatterns) {
      if (lower.includes(pattern.toLowerCase())) {
        return buildParsedPayment(app, content, lower);
      }
    }
  }

  if (lower.startsWith("000201")) {
    const network = detectEmvNetwork(content);
    return {
      app: network?.id ?? "emv_generic",
      appDisplayName: network?.name ?? "EMV QR Payment",
      appCategory: network?.category ?? "emv",
      region: network?.region ?? "Regional",
      recipientId: extractEmvMerchantId(content),
      rawContent: content,
      isAmountPreFilled: content.includes("5406"),
      isEmv: true,
    };
  }

  if (content.startsWith("BCD\n") || content.startsWith("BCD\r\n")) {
    return parseSepaQr(content);
  }

  if (
    lower.includes("br.gov.bcb.pix") ||
    (lower.startsWith("000201") && lower.includes("26"))
  ) {
    return buildParsedPayment(
      PAYMENT_APP_REGISTRY.find((a) => a.id === "pix")!,
      content, lower
    );
  }

  return detectUniversalPayment(content, lower);
}

// ─── Universal Payment Detector ─────────────────────────────────────────────
// Catches any payment QR not matched by the registry above.
// Works for: new banks, local payment apps, unknown UPI deep-links,
// generic /pay URLs — anything that looks like a financial transaction.
function detectUniversalPayment(content: string, lower: string): ParsedPaymentQr | null {

  // ── 1. UPI signature: pa= (virtual payment address) is the definitive UPI signal.
  //    Any app that generates a UPI QR embeds pa= — banks, wallets, merchants.
  if (lower.includes("pa=")) {
    return parseUnknownUpiQr(content, lower, "UPI Payment");
  }

  // ── 2. Generic scheme detection: any custom URL scheme that carries payment data.
  //    Matches: hdfc://pay?..., yesbank://pay, iob://upi?..., mybank://payment?...
  const schemeMatch = content.match(/^([a-zA-Z][a-zA-Z0-9+\-.]{2,}):\/\//);
  if (schemeMatch) {
    const scheme = schemeMatch[1].toLowerCase();
    const rest = lower.slice(schemeMatch[0].length);
    const isPaymentScheme =
      scheme.includes("pay") ||
      scheme.includes("upi") ||
      scheme.includes("wallet") ||
      scheme.includes("money") ||
      scheme.includes("bank") ||
      scheme.includes("cash") ||
      rest.startsWith("pay") ||
      rest.startsWith("upi") ||
      rest.startsWith("payment") ||
      rest.startsWith("transfer");
    if (isPaymentScheme) {
      const displayName = formatSchemeName(scheme);
      return parseSchemePaymentQr(content, lower, scheme, displayName);
    }
  }

  // ── 3. URL with /pay, /payment, /transfer, /send, /receive in path.
  //    Catches: bank.com/pay?amount=..., anyapp.in/payment/qr, etc.
  const payPathMatch = lower.match(
    /https?:\/\/[^\s/]+(?:\/[^\s?]*)?\/(pay|payment|transfer|send|receive|qr-pay|payqr|collect|checkout)(?:[/?#]|$)/
  );
  if (payPathMatch) {
    return parseUrlPaymentQr(content, lower);
  }

  // ── 4. URL domain starts with "pay." or contains "pay" as a subdomain.
  //    Catches: pay.hdfc.com, pay.axisbank.in, pay.yesbank.in, etc.
  const payDomainMatch = lower.match(/https?:\/\/(?:pay|payments|payment)\.[a-z0-9.-]+/);
  if (payDomainMatch) {
    return parseUrlPaymentQr(content, lower);
  }

  // ── 5. Content has clear payment field pairs (even without a known scheme).
  //    Catches: raw key=value QR formats used by some Indian bank ATMs & merchants.
  //    e.g.  AMOUNT=500|MERCHANT=XYZ|VPA=abc@bank|TXN=REF123
  const hasAmountField =
    /\bam(?:ount)?\s*=\s*\d/.test(lower) ||
    /\bamt\s*=\s*\d/.test(lower) ||
    /\bprice\s*=\s*\d/.test(lower);
  const hasPayeeField =
    /\bpa\s*=/.test(lower) ||
    /\bvpa\s*=/.test(lower) ||
    /\bpayee\s*=/.test(lower) ||
    /\bmerchant\s*=/.test(lower) ||
    /\bto\s*=.+@/.test(lower);
  if (hasAmountField && hasPayeeField) {
    return parseRawFieldPaymentQr(content, lower);
  }

  // ── 6. Generic "pay" / "payment" keyword in the content body when the QR
  //    clearly isn't a plain URL or plain text link.
  //    Guards: must also have digits (amount) or @ (VPA) to avoid false positives
  //    on URLs that merely mention "display" or "replay".
  const hasPayWord = /\bpay(?:ment|ments|now|here|online|link)?\b/i.test(content);
  const hasMoneySignal =
    /\d+/.test(content) &&
    (content.includes("@") || content.includes("INR") || content.includes("₹") ||
     content.includes("amount") || content.includes("Amount"));
  if (hasPayWord && hasMoneySignal && !content.startsWith("http")) {
    return parseRawFieldPaymentQr(content, lower);
  }

  return null;
}

function formatSchemeName(scheme: string): string {
  const nice = scheme.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  if (nice.toLowerCase().includes("upi")) return `${nice} (UPI)`;
  return nice;
}

function parseUnknownUpiQr(content: string, lower: string, displayName: string): ParsedPaymentQr {
  let pa = "";
  let pn = "";
  let am: string | undefined;
  let tn: string | undefined;
  let cu = "INR";
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
    if (paMatch) pa = paMatch[1];
  }
  const bankHandle = pa.includes("@") ? pa.split("@")[1] : "";
  const appScheme = content.split("://")[0]?.toLowerCase() || "upi";
  const appName = appScheme === "upi" ? displayName : formatSchemeName(appScheme);
  return {
    app: "upi",
    appDisplayName: appName,
    appCategory: "upi_india",
    region: "India",
    recipientId: pa,
    recipientName: pn ? decodeURIComponent(pn) : undefined,
    amount: am,
    currency: cu,
    note: tn ? decodeURIComponent(tn) : undefined,
    rawContent: content,
    isAmountPreFilled: !!am && parseFloat(am) > 0,
    bankHandle,
    vpa: pa,
  };
}

function parseSchemePaymentQr(content: string, lower: string, scheme: string, displayName: string): ParsedPaymentQr {
  if (lower.includes("pa=") || lower.includes("vpa=")) {
    return parseUnknownUpiQr(content, lower, displayName);
  }
  let amount: string | undefined;
  let recipientId = "";
  try {
    const qIdx = content.indexOf("?");
    if (qIdx >= 0) {
      const params = new URLSearchParams(content.slice(qIdx + 1));
      amount = params.get("amount") || params.get("am") || params.get("amt") || undefined;
      recipientId = params.get("to") || params.get("id") || params.get("merchant") || "";
    }
  } catch {}
  return {
    app: "unknown_payment",
    appDisplayName: displayName,
    appCategory: "other",
    region: "Regional",
    recipientId: recipientId || content.slice(0, 60),
    amount,
    rawContent: content,
    isAmountPreFilled: !!amount && parseFloat(amount) > 0,
  };
}

function parseUrlPaymentQr(content: string, lower: string): ParsedPaymentQr {
  let amount: string | undefined;
  let recipientId = "";
  let appName = "Payment";
  try {
    const urlObj = new URL(content);
    appName = urlObj.hostname.replace(/^www\.|^pay\./, "").split(".")[0];
    appName = appName.charAt(0).toUpperCase() + appName.slice(1) + " Pay";
    amount = urlObj.searchParams.get("amount") || urlObj.searchParams.get("am") || urlObj.searchParams.get("amt") || undefined;
    recipientId = urlObj.searchParams.get("pa") || urlObj.searchParams.get("vpa") ||
      urlObj.searchParams.get("to") || urlObj.searchParams.get("merchant") || urlObj.pathname.split("/").pop() || "";
  } catch {
    recipientId = content.slice(0, 60);
  }
  return {
    app: "unknown_payment",
    appDisplayName: appName,
    appCategory: "other",
    region: "Regional",
    recipientId,
    amount,
    rawContent: content,
    isAmountPreFilled: !!amount && parseFloat(amount) > 0,
  };
}

function parseRawFieldPaymentQr(content: string, lower: string): ParsedPaymentQr {
  let amount: string | undefined;
  let recipientId = "";
  const amMatch = content.match(/(?:amount|am|amt|price)\s*[=:]\s*([\d.]+)/i);
  if (amMatch) amount = amMatch[1];
  const payeeMatch = content.match(/(?:pa|vpa|payee|merchant|to)\s*[=:]\s*([^\s|&,]+)/i);
  if (payeeMatch) recipientId = payeeMatch[1];
  if (!recipientId) {
    const atMatch = content.match(/[\w.]+@[\w.]+/);
    if (atMatch) recipientId = atMatch[0];
  }
  return {
    app: "unknown_payment",
    appDisplayName: "Payment QR",
    appCategory: "other",
    region: "Regional",
    recipientId: recipientId || content.slice(0, 60),
    amount,
    rawContent: content,
    isAmountPreFilled: !!amount && parseFloat(amount) > 0,
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
  try {
    url = new URL(content);
  } catch {
    return parseGenericPayment(app, content, content.toLowerCase());
  }
  const params = url.searchParams;
  const pa = params.get("pa") || "";
  const pn = params.get("pn") || "";
  const am = params.get("am") || undefined;
  const tn = params.get("tn") || undefined;
  const cu = params.get("cu") || "INR";
  const bankHandle = pa.split("@")[1] || "";

  return {
    app: app.id,
    appDisplayName: app.displayName,
    appCategory: app.category,
    region: app.region,
    recipientId: pa,
    recipientName: pn ? decodeURIComponent(pn) : undefined,
    amount: am,
    currency: cu,
    note: tn ? decodeURIComponent(tn) : undefined,
    rawContent: content,
    isAmountPreFilled: !!am && parseFloat(am) > 0,
    bankHandle,
    vpa: pa,
  };
}

function parseCryptoContent(app: AppDef, content: string): ParsedPaymentQr {
  let address = content;
  let amount: string | undefined;
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

  return {
    app: app.id,
    appDisplayName: app.displayName,
    appCategory: "crypto",
    region: app.region,
    recipientId: address,
    amount,
    rawContent: content,
    isAmountPreFilled: !!amount,
    coinType: app.id,
  };
}

function parseGenericPayment(app: AppDef, content: string, lower: string): ParsedPaymentQr {
  let recipientId = "";
  let amount: string | undefined;

  if (lower.includes("paypal.me/")) {
    recipientId = content.split("paypal.me/")[1]?.split("?")[0]?.split("/")[0] || "";
    const params = new URLSearchParams(content.split("?")[1] || "");
    amount = params.get("amount") || undefined;
  } else if (lower.includes("cash.app/$")) {
    recipientId = "$" + (content.split("cash.app/$")[1]?.split("?")[0] || "");
    const params = new URLSearchParams(content.split("?")[1] || "");
    amount = params.get("amount") || undefined;
  } else if (lower.includes("venmo.com")) {
    recipientId = content.split("venmo.com/u/")[1]?.split("?")[0] || "";
  } else if (lower.includes("revolut.me/")) {
    recipientId = content.split("revolut.me/")[1]?.split("?")[0] || "";
    const params = new URLSearchParams(content.split("?")[1] || "");
    amount = params.get("amount") || undefined;
  } else if (lower.includes("tikkie.me/")) {
    recipientId = content.split("tikkie.me/")[1]?.split("?")[0] || "";
  } else if (lower.includes("picpay.me/")) {
    recipientId = content.split("picpay.me/")[1]?.split("?")[0] || "";
  } else {
    recipientId = content.slice(0, 60);
  }

  return {
    app: app.id,
    appDisplayName: app.displayName,
    appCategory: app.category,
    region: app.region,
    recipientId,
    amount,
    rawContent: content,
    isAmountPreFilled: !!amount,
  };
}

function parseSepaQr(content: string): ParsedPaymentQr {
  const lines = content.split(/\r?\n/);
  const iban = lines[6] || "";
  const name = lines[5] || "";
  const amount = lines[7] ? lines[7].replace(/[^0-9.]/g, "") : undefined;

  return {
    app: "sepa_transfer",
    appDisplayName: "SEPA Credit Transfer",
    appCategory: "europe",
    region: "Europe",
    recipientId: iban,
    recipientName: name,
    amount,
    currency: "EUR",
    note: lines[9] || undefined,
    rawContent: content,
    isAmountPreFilled: !!amount,
  };
}

function detectEmvNetwork(content: string): { id: PaymentAppId; name: string; category: ParsedPaymentQr["appCategory"]; region: string } | null {
  if (content.includes("br.gov.bcb.pix")) return { id: "pix", name: "Pix", category: "brazil_latam", region: "Brazil" };
  if (content.includes("SG.PAYNOW") || content.includes("sg.paynow")) return { id: "nets_sg", name: "PayNow (Singapore)", category: "singapore_malaysia", region: "Singapore" };
  if (content.includes("MY.MY") || content.includes("DuitNow")) return { id: "duitnow", name: "DuitNow (Malaysia)", category: "singapore_malaysia", region: "Malaysia" };
  if (content.includes("TH.PROMPTPAY") || content.includes("th.promptpay")) return { id: "promptpay", name: "PromptPay (Thailand)", category: "thailand", region: "Thailand" };
  if (content.includes("A000000677010112") || content.includes("vnpay")) return { id: "vnpay", name: "VNPAY", category: "southeast_asia", region: "Vietnam" };
  if (content.includes("A000000533010101") || content.includes("alipay")) return { id: "alipay", name: "Alipay (支付宝)", category: "china", region: "China" };
  if (content.includes("A000000049")) return { id: "wechat_pay", name: "WeChat Pay (微信支付)", category: "china", region: "China" };
  return null;
}

function extractEmvMerchantId(content: string): string {
  try {
    const idx = content.indexOf("5910");
    if (idx >= 0) return content.slice(idx + 4, idx + 14).replace(/[^a-zA-Z0-9]/g, "");
  } catch {}
  return content.slice(0, 40);
}
