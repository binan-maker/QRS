import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Universal Payment QR Detection ─────────────────────────────────────────
// Covers 50+ payment apps across India, China, US, SE Asia, Korea, Japan,
// Brazil, Europe, and Crypto worldwide.

export type PaymentAppId =
  // India – UPI Ecosystem
  | "upi" | "gpay_india" | "phonepe" | "paytm" | "bhim" | "amazon_pay"
  | "cred" | "freecharge" | "mobikwik" | "airtel_money" | "juspay"
  | "slice" | "jiomoney" | "pockets_icici" | "razorpay" | "cashfree" | "payu"
  | "bajaj_pay" | "navi" | "axis_pay" | "yono_sbi" | "imobile_pay" | "superapp"
  // China
  | "alipay" | "wechat_pay"
  // Global / US
  | "paypal" | "venmo" | "cash_app" | "zelle" | "stripe" | "square" | "apple_pay"
  // Southeast Asia
  | "grabpay" | "gopay" | "ovo" | "dana" | "linkaja" | "shopeepay"
  | "line_pay" | "truemoney" | "momo_vn" | "zalopay" | "vnpay" | "gcash"
  | "maya" | "paymaya" | "wave_myanmar" | "kpay_myanmar" | "true_wallet"
  // Korea
  | "kakaopay" | "toss" | "naverpay" | "payco" | "zeropay_kr"
  // Japan
  | "paypay_jp" | "merpay" | "rakuten_pay" | "d_payment" | "au_pay"
  | "origami_pay" | "line_pay_jp"
  // Singapore / Malaysia / Philippines
  | "paylah" | "duitnow" | "touchngo" | "boost_my" | "nets_sg"
  | "instapay_ph" | "pesonet"
  // Thailand
  | "promptpay"
  // Brazil / LATAM
  | "pix" | "mercado_pago" | "picpay" | "pagbank" | "ame_digital"
  // Europe / UK
  | "revolut" | "wise" | "twint" | "sepa_transfer" | "tikkie_nl"
  | "bizum_es" | "satispay_it" | "blik_pl" | "swish_se"
  // Africa
  | "mpesa" | "flutterwave" | "paystack" | "mtn_momo"
  // Middle East
  | "stc_pay" | "benefitpay"
  // Crypto
  | "bitcoin" | "ethereum" | "litecoin" | "monero" | "bitcoin_cash"
  | "solana" | "xrp" | "dogecoin" | "bnb" | "tron" | "usdt"
  // EMV / Generic
  | "emv_generic" | "unknown_payment";

export interface ParsedPaymentQr {
  app: PaymentAppId;
  appDisplayName: string;
  appCategory: "upi_india" | "india_wallet" | "china" | "global_wallet" | "us_payment"
    | "southeast_asia" | "korea" | "japan" | "singapore_malaysia" | "thailand"
    | "brazil_latam" | "europe" | "africa" | "middle_east" | "crypto" | "emv" | "other";
  region: string;
  recipientId: string;
  recipientName?: string;
  amount?: string;
  currency?: string;
  note?: string;
  rawContent: string;
  isAmountPreFilled: boolean;
  // UPI-specific
  bankHandle?: string;
  vpa?: string;
  // Crypto-specific
  coinType?: string;
  // EMV-specific
  isEmv?: boolean;
  // Extra info
  extraFields?: Record<string, string>;
}

export interface PaymentSafetyResult {
  isSuspicious: boolean;
  warnings: string[];
  riskLevel: "safe" | "caution" | "dangerous";
  appInfo?: string;
}

// ─── Payment App Registry ───────────────────────────────────────────────────

interface AppDef {
  id: PaymentAppId;
  displayName: string;
  category: ParsedPaymentQr["appCategory"];
  region: string;
  schemes: string[];         // URI schemes like "upi://", "wxp://"
  urlPatterns: string[];     // substrings to match in URLs
  trustedDomains?: string[]; // official domains to NOT flag as impersonation
}

const PAYMENT_APP_REGISTRY: AppDef[] = [
  // ── India UPI ──────────────────────────────────────────────────────────────
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

  // ── China ──────────────────────────────────────────────────────────────────
  { id: "alipay", displayName: "Alipay (支付宝)", category: "china", region: "China",
    schemes: ["alipay://", "alipays://"], urlPatterns: ["qr.alipay.com", "global.alipay.com", "intl.alipay.com"],
    trustedDomains: ["alipay.com", "alipayobjects.com"] },
  { id: "wechat_pay", displayName: "WeChat Pay (微信支付)", category: "china", region: "China",
    schemes: ["wxp://", "weixin://wxpay", "weixin://dl/pay"],
    urlPatterns: ["wx.tenpay.com", "weixin.qq.com/q/", "qr.weixin.qq.com"],
    trustedDomains: ["weixin.qq.com", "tenpay.com"] },

  // ── Global / US ────────────────────────────────────────────────────────────
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

  // ── Southeast Asia ─────────────────────────────────────────────────────────
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

  // ── Korea ──────────────────────────────────────────────────────────────────
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

  // ── Japan ──────────────────────────────────────────────────────────────────
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

  // ── Singapore / Malaysia ───────────────────────────────────────────────────
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

  // ── Thailand ───────────────────────────────────────────────────────────────
  { id: "promptpay", displayName: "PromptPay", category: "thailand", region: "Thailand",
    schemes: [], urlPatterns: ["promptpay.io", "promptpay.kasikornbank.com"],
    trustedDomains: ["promptpay.io", "kasikornbank.com"] },

  // ── Brazil / LATAM ─────────────────────────────────────────────────────────
  { id: "pix", displayName: "Pix", category: "brazil_latam", region: "Brazil",
    schemes: [], urlPatterns: ["pix.bcb.gov.br"],
    trustedDomains: ["bcb.gov.br"] },
  { id: "mercado_pago", displayName: "Mercado Pago", category: "brazil_latam", region: "LATAM",
    schemes: ["mercadopago://"], urlPatterns: ["mercadopago.com", "mpago.la"],
    trustedDomains: ["mercadopago.com", "mpago.la"] },
  { id: "picpay", displayName: "PicPay", category: "brazil_latam", region: "Brazil",
    schemes: ["picpay://"], urlPatterns: ["picpay.me/"],
    trustedDomains: ["picpay.me", "picpay.com"] },

  // ── Europe ─────────────────────────────────────────────────────────────────
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

  // ── Africa ─────────────────────────────────────────────────────────────────
  { id: "mpesa", displayName: "M-Pesa", category: "africa", region: "Africa",
    schemes: ["mpesa://"], urlPatterns: ["m-pesa.com", "mpesa.safaricom.com", "safaricom.co.ke/mpesa"],
    trustedDomains: ["safaricom.co.ke", "m-pesa.com"] },

  // ── Middle East ────────────────────────────────────────────────────────────
  { id: "stc_pay", displayName: "STC Pay", category: "middle_east", region: "Saudi Arabia",
    schemes: ["stcpay://"], urlPatterns: ["stcpay.com.sa"],
    trustedDomains: ["stcpay.com.sa"] },
  { id: "benefitpay", displayName: "BenefitPay", category: "middle_east", region: "Bahrain",
    schemes: ["benefitpay://"], urlPatterns: ["benefit.bh"],
    trustedDomains: ["benefit.bh"] },

  // ── Crypto ─────────────────────────────────────────────────────────────────
  { id: "bitcoin", displayName: "Bitcoin (BTC)", category: "crypto", region: "Global",
    schemes: ["bitcoin:"], urlPatterns: [],
    trustedDomains: [] },
  { id: "ethereum", displayName: "Ethereum (ETH)", category: "crypto", region: "Global",
    schemes: ["ethereum:", "eth:"], urlPatterns: [],
    trustedDomains: [] },
  { id: "litecoin", displayName: "Litecoin (LTC)", category: "crypto", region: "Global",
    schemes: ["litecoin:"], urlPatterns: [],
    trustedDomains: [] },
  { id: "monero", displayName: "Monero (XMR)", category: "crypto", region: "Global",
    schemes: ["monero:"], urlPatterns: [],
    trustedDomains: [] },
  { id: "bitcoin_cash", displayName: "Bitcoin Cash (BCH)", category: "crypto", region: "Global",
    schemes: ["bitcoincash:"], urlPatterns: [],
    trustedDomains: [] },
  { id: "solana", displayName: "Solana (SOL)", category: "crypto", region: "Global",
    schemes: ["solana:"], urlPatterns: [],
    trustedDomains: [] },
  { id: "xrp", displayName: "XRP (Ripple)", category: "crypto", region: "Global",
    schemes: ["xrpl:", "ripple:", "xrp:"], urlPatterns: [],
    trustedDomains: [] },
  { id: "dogecoin", displayName: "Dogecoin (DOGE)", category: "crypto", region: "Global",
    schemes: ["dogecoin:"], urlPatterns: [],
    trustedDomains: [] },
  { id: "bnb", displayName: "BNB (Binance)", category: "crypto", region: "Global",
    schemes: ["bnb:", "binance:"], urlPatterns: [],
    trustedDomains: [] },
  { id: "tron", displayName: "TRON (TRX)", category: "crypto", region: "Global",
    schemes: ["tron:"], urlPatterns: [],
    trustedDomains: [] },
];

// ─── Universal Payment QR Detector ──────────────────────────────────────────

export function isPaymentQr(content: string): boolean {
  return parseAnyPaymentQr(content) !== null;
}

export function parseAnyPaymentQr(content: string): ParsedPaymentQr | null {
  if (!content) return null;
  const lower = content.toLowerCase().trim();

  // ── 1. Check registry (schemes + URL patterns) ───────────────────────────
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

  // ── 2. EMV QR (starts with 000201 — used by PromptPay, DuitNow, Pix, SGQR) ─
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

  // ── 3. SEPA Credit Transfer (EPC standard, starts with BCD) ───────────────
  if (content.startsWith("BCD\n") || content.startsWith("BCD\r\n")) {
    return parseSepaQr(content);
  }

  // ── 4. Pix (Brazil EMV, contains specific tags) ──────────────────────────
  if (
    lower.includes("br.gov.bcb.pix") ||
    (lower.startsWith("000201") && lower.includes("26"))
  ) {
    return buildParsedPayment(
      PAYMENT_APP_REGISTRY.find((a) => a.id === "pix")!,
      content, lower
    );
  }

  return null;
}

function buildParsedPayment(app: AppDef, content: string, lower: string): ParsedPaymentQr {
  if (app.category === "upi_india") {
    return parseUpiStyle(app, content, lower);
  }
  if (app.category === "crypto") {
    return parseCryptoStyle(app, content);
  }
  return parseGenericPayment(app, content, lower);
}

function parseUpiStyle(app: AppDef, content: string, lower: string): ParsedPaymentQr {
  try {
    const queryString = content.includes("?") ? content.split("?").slice(1).join("?") : "";
    const params = new URLSearchParams(queryString);
    const pa = params.get("pa") || params.get("PA") || "";
    const pn = params.get("pn") || params.get("PN") || "";
    const am = params.get("am") || params.get("AM") || null;
    const cu = params.get("cu") || params.get("CU") || "INR";
    const tn = params.get("tn") || params.get("TN") || null;
    const atIdx = pa.lastIndexOf("@");
    const bankHandle = atIdx >= 0 ? pa.slice(atIdx + 1).toLowerCase() : "";

    return {
      app: app.id,
      appDisplayName: app.displayName,
      appCategory: app.category,
      region: app.region,
      recipientId: pa,
      recipientName: pn || undefined,
      amount: am ? parseFloat(am).toFixed(2) : undefined,
      currency: cu.toUpperCase(),
      note: tn || undefined,
      rawContent: content,
      isAmountPreFilled: !!am && parseFloat(am) > 0,
      bankHandle,
      vpa: pa,
    };
  } catch {
    return parseGenericPayment(app, content, lower);
  }
}

function parseCryptoStyle(app: AppDef, content: string): ParsedPaymentQr {
  try {
    const colonIdx = content.indexOf(":");
    const afterScheme = content.slice(colonIdx + 1);
    const qmarkIdx = afterScheme.indexOf("?");
    const address = qmarkIdx >= 0 ? afterScheme.slice(0, qmarkIdx) : afterScheme;
    let amount: string | undefined;
    let note: string | undefined;
    if (qmarkIdx >= 0) {
      const params = new URLSearchParams(afterScheme.slice(qmarkIdx + 1));
      amount = params.get("amount") || params.get("value") || undefined;
      note = params.get("label") || params.get("message") || undefined;
    }
    return {
      app: app.id,
      appDisplayName: app.displayName,
      appCategory: "crypto",
      region: "Global",
      recipientId: address,
      amount,
      note,
      rawContent: content,
      isAmountPreFilled: !!amount,
      coinType: app.displayName,
    };
  } catch {
    return parseGenericPayment(app, content, content.toLowerCase());
  }
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
  const bic = lines[4] || "";
  const name = lines[5] || "";
  const iban = lines[6] || "";
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

// ─── Universal Payment Safety Analyzer ──────────────────────────────────────

export function analyzeAnyPaymentQr(parsed: ParsedPaymentQr): PaymentSafetyResult {
  const warnings: string[] = [];
  let riskLevel: "safe" | "caution" | "dangerous" = "safe";

  function bump(level: "caution" | "dangerous") {
    if (level === "dangerous") riskLevel = "dangerous";
    else if (riskLevel === "safe") riskLevel = "caution";
  }

  // ── Crypto — always high risk ──────────────────────────────────────────────
  if (parsed.appCategory === "crypto") {
    warnings.push(`Crypto payment: ${parsed.appDisplayName} — transactions are irreversible`);
    warnings.push("Verify the wallet address character by character — one wrong digit means lost funds forever");
    if (parsed.isAmountPreFilled) {
      warnings.push(`Pre-filled amount detected — only pay if you intended this`);
    }
    const addr = parsed.recipientId;
    if (addr && (addr.length < 20 || addr.length > 100)) {
      warnings.push("Wallet address length looks unusual — double check before sending");
      bump("dangerous");
    }
    bump("caution");
    return { isSuspicious: true, warnings, riskLevel, appInfo: parsed.appDisplayName };
  }

  // ── UPI India ──────────────────────────────────────────────────────────────
  if (parsed.appCategory === "upi_india") {
    if (!parsed.bankHandle) {
      warnings.push("No bank handle found in VPA — verify this is a valid UPI address");
      bump("caution");
    } else if (!VALID_UPI_HANDLES.has(parsed.bankHandle)) {
      warnings.push(`Unknown bank handle "@${parsed.bankHandle}" — verify before paying`);
      bump("caution");
    }

    if (!parsed.recipientName || parsed.recipientName.trim() === "") {
      warnings.push("No payee name — legitimate merchants always show their name");
      bump("caution");
    } else {
      const lowerName = parsed.recipientName.toLowerCase();
      for (const kw of UPI_SUSPICIOUS_NAME_KEYWORDS) {
        if (lowerName.includes(kw)) {
          const official = UPI_BRANDED_HANDLES[kw];
          if (!official || !official.includes(parsed.bankHandle || "")) {
            warnings.push(`Payee name contains "${kw}" but VPA doesn't match — possible impersonation`);
            bump("dangerous");
            break;
          }
        }
      }
    }

    if (parsed.isAmountPreFilled && parsed.amount) {
      const amt = parseFloat(parsed.amount);
      if (amt > 50000) {
        warnings.push(`Large pre-filled amount: ₹${amt.toLocaleString("en-IN")} — only pay if YOU initiated this`);
        bump("dangerous");
      } else if (amt > 0) {
        warnings.push(`Amount pre-filled: ₹${amt.toLocaleString("en-IN")} — confirm before paying`);
        bump("caution");
      }
    }

    const vpaLocal = (parsed.vpa || parsed.recipientId).split("@")[0];
    if (vpaLocal.length > 20) {
      warnings.push("VPA identifier is unusually long — could be auto-generated by scammers");
      bump("caution");
    }
  }

  // ── Global Wallets (PayPal, Venmo, Cash App, etc.) ─────────────────────────
  if (["global_wallet", "us_payment"].includes(parsed.appCategory)) {
    if (!parsed.recipientId) {
      warnings.push(`No recipient ID found in ${parsed.appDisplayName} QR`);
      bump("caution");
    }
    if (parsed.isAmountPreFilled && parsed.amount) {
      warnings.push(`Pre-filled amount in ${parsed.appDisplayName} — verify the exact recipient before sending`);
      bump("caution");
    }
  }

  // ── Regional / SE Asia / Korea / Japan ───────────────────────────────────
  if (["southeast_asia", "korea", "japan", "singapore_malaysia", "thailand"].includes(parsed.appCategory)) {
    if (!parsed.recipientId || parsed.recipientId.trim().length < 4) {
      warnings.push(`Recipient ID is missing or very short in ${parsed.appDisplayName} QR`);
      bump("caution");
    }
    if (parsed.isAmountPreFilled) {
      warnings.push(`Pre-set amount detected — confirm the payee and amount before proceeding`);
      bump("caution");
    }
  }

  // ── SEPA Transfer ─────────────────────────────────────────────────────────
  if (parsed.app === "sepa_transfer") {
    if (!parsed.recipientId || !parsed.recipientId.startsWith("IBAN")) {
      if (!parsed.recipientId) {
        warnings.push("IBAN not found in SEPA QR — invalid format");
        bump("caution");
      }
    }
    if (parsed.amount && parseFloat(parsed.amount) > 5000) {
      warnings.push(`Large SEPA transfer: €${parseFloat(parsed.amount).toFixed(2)} — verify before authorizing`);
      bump("caution");
    }
  }

  // ── EMV Generic ───────────────────────────────────────────────────────────
  if (parsed.app === "emv_generic") {
    warnings.push("Generic payment QR detected — confirm the payment network and merchant before paying");
    bump("caution");
  }

  // ── China payments outside China context ──────────────────────────────────
  if (parsed.appCategory === "china") {
    warnings.push(`${parsed.appDisplayName} QR: verify you are paying the correct merchant`);
    bump("caution");
  }

  // ── Brazil Pix ────────────────────────────────────────────────────────────
  if (parsed.app === "pix") {
    if (parsed.isAmountPreFilled && parsed.amount) {
      const amt = parseFloat(parsed.amount);
      if (amt > 1000) {
        warnings.push(`Pix transfer: R$${amt.toFixed(2)} — Pix is instant and irreversible, confirm the key`);
        bump("caution");
      }
    }
  }

  return {
    isSuspicious: warnings.length > 0,
    warnings,
    riskLevel,
    appInfo: parsed.appDisplayName,
  };
}

// ─── UPI-specific helpers ────────────────────────────────────────────────────

const VALID_UPI_HANDLES = new Set([
  "okaxis", "okhdfcbank", "okicici", "oksbi",
  "ybl", "ibl", "axl",
  "paytm", "paytmbank",
  "upi", "rbl",
  "hdfcbank", "icici", "sbi", "axisbank",
  "kotak", "idbi", "federal", "indus",
  "boi", "centralbank", "pnb", "bob",
  "indianbank", "syndicatebank", "allbank",
  "aubank", "airtel", "juspay",
  "freecharge", "mobikwik",
  "yapl", "timecosmos",
  "rajgovhdfcbank", "dlb", "mahb",
  "kvb", "sib", "cbin",
  "cnrb", "cub", "dcb",
  "equitas", "esaf", "fino",
  "idfc", "ikwik", "idfcbank",
  "uco", "uboi", "ubi",
  "vijb", "barodampay", "myicici",
  "naviaxis", "nsdl",
  "pingpay", "postbank",
  "qb", "rblbank", "saraswat",
  "scb", "scmb", "shriramhfl",
  "tjsb", "ucobank", "ujjivan",
  "utbi", "zoicici", "waaxis",
  "ptaxis", "pthdfc", "ptyes",
  "abfspay", "apl", "abhy",
  "bhanix", "bdbl", "bypl",
  "cmsidfc", "csb", "dnsbank",
  "fbl", "hsbc", "iob",
  "jkb", "karb", "kbl",
  "lvb", "mahagrambank", "nkgsb",
  "uco", "yesbankltd", "zinghr",
]);

const UPI_SUSPICIOUS_NAME_KEYWORDS = [
  "google", "paytm", "amazon", "flipkart", "phonepe",
  "sbi", "hdfc", "icici", "axis", "rbi", "income tax",
  "pm india", "modi", "support", "helpline", "refund",
  "lottery", "winner", "prize", "cashback", "free",
  "bank", "govt", "government", "police", "cbi", "uidai",
  "customs", "covid", "relief", "subsidy", "benefit",
  "flipkart", "meesho", "nykaa", "myntra",
];

const UPI_BRANDED_HANDLES: Record<string, string[]> = {
  google: ["okaxis", "okhdfcbank", "okicici", "oksbi"],
  paytm: ["paytm", "paytmbank"],
  phonepe: ["ybl", "ibl", "axl"],
  amazon: ["yapl"],
  sbi: ["oksbi", "sbi"],
  hdfc: ["okhdfcbank", "hdfcbank"],
  icici: ["okicici", "icici"],
  axis: ["okaxis", "axisbank"],
  bank: [],
  govt: [],
};

// ─── Backward Compat (UPI-only API kept for existing callers) ─────────────────

export interface ParsedUpiQr {
  vpa: string;
  payeeName: string;
  amount: string | null;
  currency: string;
  transactionNote: string | null;
  merchantCategory: string | null;
  bankHandle: string;
  isAmountPreFilled: boolean;
}

export function parseUpiQr(content: string): ParsedUpiQr | null {
  const parsed = parseAnyPaymentQr(content);
  if (!parsed || parsed.appCategory !== "upi_india") return null;
  return {
    vpa: parsed.vpa || parsed.recipientId,
    payeeName: parsed.recipientName || "",
    amount: parsed.amount || null,
    currency: parsed.currency || "INR",
    transactionNote: parsed.note || null,
    merchantCategory: null,
    bankHandle: parsed.bankHandle || "",
    isAmountPreFilled: parsed.isAmountPreFilled,
  };
}

export function analyzePaymentQr(parsed: ParsedUpiQr): PaymentSafetyResult {
  const universal: ParsedPaymentQr = {
    app: "upi",
    appDisplayName: "UPI",
    appCategory: "upi_india",
    region: "India",
    recipientId: parsed.vpa,
    recipientName: parsed.payeeName,
    amount: parsed.amount || undefined,
    currency: parsed.currency,
    note: parsed.transactionNote || undefined,
    rawContent: "",
    isAmountPreFilled: parsed.isAmountPreFilled,
    bankHandle: parsed.bankHandle,
    vpa: parsed.vpa,
  };
  return analyzeAnyPaymentQr(universal);
}

// ─── URL Heuristic Analysis ──────────────────────────────────────────────────

export interface UrlSafetyResult {
  isSuspicious: boolean;
  warnings: string[];
  riskLevel: "safe" | "caution" | "dangerous";
}

// 70+ URL shorteners
const URL_SHORTENERS = new Set([
  "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly",
  "is.gd", "buff.ly", "ift.tt", "short.ly", "rb.gy",
  "cutt.ly", "shorturl.at", "tiny.cc", "s.id",
  "qr.ae", "b23.ru", "bl.ink", "br.cc", "clck.ru",
  "cli.gs", "cur.lv", "db.tt", "dlvr.it",
  "fur.ly", "go2l.ink", "hubs.ly", "j.mp",
  "lnkd.in", "mcaf.ee", "murl.com", "o.oo7.jp",
  "ping.fm", "post.ly", "prettylinkpro.com",
  "q.gs", "qr.net", "redd.it", "scrnch.me", "short.ie",
  "snipurl.com", "su.pr", "tr.im", "twit.ac", "u.bb",
  "u.to", "url.ie", "urlcut.com", "urlenco.de", "v.gd",
  "virl.com", "vzturl.com", "x.co", "xrl.in", "xurl.jp",
  "yfrog.com", "youtu.be", "z0p.de", "zi.ma",
  "2.gp", "2big.at", "2u.pw", "4ks.net", "4url.cc",
  "lc.chat", "shor.by", "shrinkme.io", "shortto.me",
  "inx.lv", "filoops.info", "virb.com",
  "qrco.de", "t.ly", "waa.ai", "b.link", "han.gl",
]);

// Suspicious TLDs known for abuse
const SUSPICIOUS_TLDS = new Set([
  ".tk", ".ml", ".ga", ".cf", ".gq", ".xyz", ".top", ".click",
  ".win", ".loan", ".download", ".cam", ".stream", ".gdn",
  ".racing", ".bid", ".trade", ".party", ".review", ".men",
  ".date", ".faith", ".accountant", ".science", ".work", ".ninja",
  ".country", ".kim", ".xin", ".bar",
]);

// 100+ brand names scammers impersonate
const BRAND_IMPERSONATION_KEYWORDS = [
  "google", "gmail", "youtube", "facebook", "instagram", "twitter", "x",
  "amazon", "flipkart", "snapdeal", "meesho", "myntra", "nykaa",
  "paytm", "phonepe", "razorpay", "cashfree", "payu",
  "sbi", "hdfc", "icici", "axis", "kotak", "rbl", "pnb", "bob",
  "rbi", "npci", "neft", "imps", "upi",
  "paypal", "venmo", "cashapp", "zelle", "stripe",
  "netflix", "hotstar", "primevideo", "spotify", "disneyplus",
  "apple", "iphone", "icloud", "microsoft", "windows", "outlook",
  "whatsapp", "telegram", "signal", "truecaller",
  "zomato", "swiggy", "blinkit", "zepto", "dunzo",
  "olacabs", "uber", "rapido", "namma",
  "uidai", "aadhar", "aadhaar", "pan", "kyc",
  "incometax", "income-tax", "irctc", "railway", "rrb",
  "police", "cyber", "cbi", "ed",
  "refund", "cashback", "prize", "winner", "lottery", "free",
  "wallet", "account", "banking", "netbanking",
  "loan", "emi", "creditcard", "credit-card", "debitcard",
  "coinbase", "binance", "bybit", "kucoin", "okx", "wazirx", "coindcx",
  "zerodha", "groww", "upstox", "angelone", "smallcase",
  "bookmyshow", "makemytrip", "yatra", "ixigo", "redbus",
  "healthcare", "covid", "vaccine", "arogya",
  "paytmbank", "digibank", "niyo", "fi-money",
  "cred", "slice", "lazypay", "simpl",
];

// Official domains to NOT flag
const BRAND_OFFICIAL_DOMAINS: Record<string, string[]> = {
  google: ["google.com", "google.co.in", "google.org", "accounts.google.com"],
  gmail: ["gmail.com", "mail.google.com"],
  youtube: ["youtube.com", "youtu.be"],
  facebook: ["facebook.com", "fb.com", "meta.com"],
  instagram: ["instagram.com"],
  twitter: ["twitter.com", "x.com"],
  amazon: ["amazon.in", "amazon.com", "amazon.co.uk"],
  flipkart: ["flipkart.com"],
  paytm: ["paytm.com", "p.paytm.me"],
  phonepe: ["phonepe.com"],
  razorpay: ["razorpay.com", "rzp.io"],
  paypal: ["paypal.com", "paypal.me"],
  apple: ["apple.com", "appleid.apple.com", "icloud.com"],
  microsoft: ["microsoft.com", "live.com", "outlook.com"],
  netflix: ["netflix.com"],
  spotify: ["spotify.com"],
  whatsapp: ["whatsapp.com"],
  telegram: ["telegram.org", "t.me"],
  sbi: ["onlinesbi.com", "sbi.co.in", "sbionline.com"],
  hdfc: ["hdfcbank.com", "netbanking.hdfc.com"],
  icici: ["icicibank.com"],
  axis: ["axisbank.com"],
  kotak: ["kotak.com", "kotakbank.com"],
  irctc: ["irctc.co.in"],
  uidai: ["uidai.gov.in"],
  incometax: ["incometax.gov.in", "efiling.incometax.gov.in"],
  coinbase: ["coinbase.com"],
  binance: ["binance.com"],
  zerodha: ["zerodha.com", "kite.zerodha.com"],
  groww: ["groww.in"],
  zomato: ["zomato.com"],
  swiggy: ["swiggy.com"],
  uber: ["uber.com"],
  stripe: ["stripe.com", "buy.stripe.com"],
};

// Sensitive path keywords
const SENSITIVE_PATH_KEYWORDS = [
  "login", "signin", "sign-in", "sign_in", "log-in",
  "verify", "verification", "verify-account",
  "update", "update-kyc", "kyc-update", "complete-kyc",
  "wallet", "payment", "pay-now", "checkout",
  "banking", "netbanking", "online-banking",
  "otp", "otp-verify", "enter-otp",
  "kyc", "aadhar", "aadhaar", "pan-card", "pan-verify",
  "password", "reset-password", "forgot-password",
  "account-recovery", "recover-account",
  "claim", "claim-prize", "claim-reward", "claim-cashback",
  "redeem", "redeem-reward",
  "withdraw", "withdrawal",
  "income-tax-refund", "tax-refund", "refund-claim",
  "credit-card-apply", "loan-apply", "emi-apply",
  "free-recharge", "win-prize",
];

export function analyzeUrlHeuristics(url: string): UrlSafetyResult {
  const warnings: string[] = [];
  let riskLevel: "safe" | "caution" | "dangerous" = "safe";

  function bump(level: "caution" | "dangerous") {
    if (level === "dangerous") riskLevel = "dangerous";
    else if (riskLevel === "safe") riskLevel = "caution";
  }

  let parsed: URL | null = null;
  try {
    parsed = new URL(url);
  } catch {
    warnings.push("Invalid URL format — cannot verify destination");
    return { isSuspicious: true, warnings, riskLevel: "caution" };
  }

  const hostname = parsed.hostname.toLowerCase();
  const fullUrl = url.toLowerCase();
  const pathAndQuery = (parsed.pathname + parsed.search).toLowerCase();

  // 1. HTTP (not HTTPS)
  if (parsed.protocol === "http:") {
    warnings.push("Not encrypted (HTTP) — your data can be intercepted in transit");
    bump("caution");
  }

  // 2. Data URI
  if (url.startsWith("data:")) {
    warnings.push("Embedded data URI — could contain malicious scripts or hidden content");
    bump("dangerous");
  }

  // 3. JavaScript URI
  if (url.startsWith("javascript:")) {
    warnings.push("JavaScript URI — could execute malicious code on your device");
    bump("dangerous");
  }

  // 4. Raw IP address
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    warnings.push("URL uses a raw IP address instead of a domain name — extremely suspicious");
    bump("dangerous");
  }

  // 5. IPv6
  if (hostname.startsWith("[")) {
    warnings.push("URL uses IPv6 address — uncommon for legitimate payment links");
    bump("caution");
  }

  // 6. URL shorteners
  if (URL_SHORTENERS.has(hostname) || [...URL_SHORTENERS].some((s) => hostname.endsWith("." + s))) {
    warnings.push("Shortened URL — the actual destination is completely hidden from you");
    bump("caution");
  }

  // 7. Suspicious TLDs
  const tld = "." + hostname.split(".").slice(-1)[0];
  if (SUSPICIOUS_TLDS.has(tld)) {
    warnings.push(`Domain uses "${tld}" — a free/abused TLD commonly used for scams`);
    bump("caution");
  }

  // 8. Brand impersonation in hostname
  let brandFlagged = false;
  for (const brand of BRAND_IMPERSONATION_KEYWORDS) {
    if (hostname.includes(brand)) {
      const officialDomains = BRAND_OFFICIAL_DOMAINS[brand] || [];
      const isOfficial = officialDomains.length > 0
        ? officialDomains.some((d) => hostname === d || hostname.endsWith("." + d))
        : false;
      if (!isOfficial) {
        warnings.push(`Domain contains "${brand}" but is NOT the official site — likely phishing`);
        bump("dangerous");
        brandFlagged = true;
        break;
      }
    }
  }

  // 9. Excessive subdomains (legitimate.site.real.com.evil.com)
  const domainParts = hostname.split(".");
  if (domainParts.length > 4) {
    warnings.push("Excessive subdomains — a common trick to disguise the real domain");
    bump("caution");
  }

  // 10. Known brand in subdomain but different root domain
  if (!brandFlagged) {
    const rootDomain = domainParts.slice(-2).join(".");
    for (const brand of BRAND_IMPERSONATION_KEYWORDS) {
      if (hostname.includes(brand)) {
        const officialRoot = (BRAND_OFFICIAL_DOMAINS[brand] || []).map(
          (d) => d.split(".").slice(-2).join(".")
        );
        if (officialRoot.length > 0 && !officialRoot.includes(rootDomain)) {
          warnings.push(`"${brand}" in subdomain but root domain is "${rootDomain}" — suspicious`);
          bump("dangerous");
          break;
        }
      }
    }
  }

  // 11. Sensitive keywords in path/query
  for (const kw of SENSITIVE_PATH_KEYWORDS) {
    if (pathAndQuery.includes(kw)) {
      warnings.push(`URL path contains "${kw}" — be very careful about entering personal details`);
      bump("caution");
      break;
    }
  }

  // 12. Redirect parameters (chain redirect hiding true destination)
  const redirectParams = ["redirect", "redirect_uri", "return_url", "returnurl", "callback_url", "next", "url", "target", "to"];
  for (const p of redirectParams) {
    if (parsed.searchParams.has(p)) {
      const val = parsed.searchParams.get(p) || "";
      if (val.startsWith("http")) {
        warnings.push("URL contains a redirect to another site — final destination may be harmful");
        bump("caution");
        break;
      }
    }
  }

  // 13. Very long URL
  if (url.length > 300) {
    warnings.push("Extremely long URL — often used to hide the real destination or overwhelm security checks");
    bump("caution");
  }

  // 14. Punycode / homograph attack (xn--)
  if (hostname.includes("xn--")) {
    warnings.push("Domain uses international characters (Punycode) — could be impersonating a well-known site visually");
    bump("dangerous");
  }

  // 15. Base64 encoded parameters (obfuscation)
  const queryVals = [...parsed.searchParams.values()];
  for (const val of queryVals) {
    if (val.length > 50 && /^[A-Za-z0-9+/=]{50,}$/.test(val)) {
      warnings.push("URL parameter appears Base64-encoded — destination details are obfuscated");
      bump("caution");
      break;
    }
  }

  // 16. Multiple @ signs (user info obfuscation: http://google.com@evil.com)
  if (url.includes("@") && !url.includes("mailto:")) {
    const atCount = (url.match(/@/g) || []).length;
    if (atCount > 0 && !["gmail.com", "yahoo.com", "hotmail.com"].some(d => hostname.endsWith(d))) {
      warnings.push("URL contains '@' character — could be hiding the real destination");
      bump("dangerous");
    }
  }

  const isSuspicious = warnings.length > 0;
  return { isSuspicious, warnings, riskLevel };
}

// ─── Comment Keyword Blacklist ──────────────────────────────────────────────

const KEYWORD_BLACKLIST = [
  "double your money", "investment return", "guaranteed profit",
  "send money to", "transfer ₹", "transfer rs", "pay now to",
  "click here to claim", "you have won", "you are selected",
  "congratulations you", "lucky winner",
  "telegram link", "join telegram", "join whatsapp group",
  "earn from home", "earn daily", "work from home earn",
  "forex trading", "crypto investment", "bitcoin profit",
  "share your account", "otp share", "send otp",
  "i will pay you", "i will send money",
  "verify your account", "your account will be blocked",
  "click the link below", "confirm your details",
  "update your kyc", "urgent action required",
  "follow me on", "subscribe to my", "visit my profile",
  "check my link", "dm me for",
  "part time job", "data entry work",
  "free netflix", "free amazon prime",
  "win iphone", "win smartphone",
];

export function checkCommentKeywords(text: string): {
  blocked: boolean;
  matchedKeyword: string | null;
} {
  const lower = text.toLowerCase();
  for (const kw of KEYWORD_BLACKLIST) {
    if (lower.includes(kw)) {
      return { blocked: true, matchedKeyword: kw };
    }
  }
  return { blocked: false, matchedKeyword: null };
}

// ─── Offline Local Blacklist ─────────────────────────────────────────────────

const OFFLINE_BLACKLIST_KEY = "qr_offline_blacklist";
const OFFLINE_BLACKLIST_TS_KEY = "qr_offline_blacklist_ts";
const OFFLINE_BLACKLIST_TTL = 24 * 60 * 60 * 1000;

export const BUILT_IN_BLACKLIST: { pattern: string; reason: string }[] = [
  // UPI scams
  { pattern: "pay-google", reason: "Google Pay impersonation" },
  { pattern: "sbi-online", reason: "SBI Bank impersonation" },
  { pattern: "phishing-login", reason: "Phishing login page" },
  { pattern: "verify-aadhar", reason: "Aadhaar verification scam" },
  { pattern: "claim-prize", reason: "Prize scam" },
  { pattern: "income-tax-refund", reason: "Income tax refund scam" },
  { pattern: "verify-pan", reason: "PAN verification scam" },
  { pattern: "cashback-paytm", reason: "Paytm cashback scam" },
  { pattern: "winner-lottery", reason: "Lottery scam" },
  { pattern: "free-recharge", reason: "Free recharge scam" },
  { pattern: "kyc-update", reason: "KYC update scam" },
  { pattern: "bank-account-verify", reason: "Bank verification scam" },
  { pattern: "double-money", reason: "Investment fraud" },
  { pattern: "loan-offer-apply", reason: "Fraudulent loan offer" },
  { pattern: "helpdesk-sbi", reason: "SBI helpdesk scam" },
  { pattern: "covid-relief-fund", reason: "COVID relief scam" },
  { pattern: "pm-kisan-benefit", reason: "PM Kisan scheme fraud" },
  { pattern: "uidai-verify", reason: "Aadhaar UIDAI scam" },
  { pattern: "rbi-cashback", reason: "RBI impersonation scam" },
  { pattern: "customs-clearance-fee", reason: "Customs clearance fraud" },
  { pattern: "income-tax-case", reason: "Tax threat scam" },
  { pattern: "arrest-warrant-cyber", reason: "Fake arrest warrant threat" },
  { pattern: "flipkart-cashback-winner", reason: "Flipkart cashback scam" },
  { pattern: "amazon-lucky-draw", reason: "Amazon prize fraud" },
  { pattern: "jio-free-sim", reason: "Jio free SIM scam" },
  { pattern: "bsnl-broadband-upgrade", reason: "BSNL phishing" },
  { pattern: "crypto-profit-scheme", reason: "Crypto investment fraud" },
  { pattern: "bitcoin-doubling", reason: "Bitcoin doubling scam" },
  { pattern: "paypal-verify-account", reason: "PayPal phishing" },
  { pattern: "netflix-free-subscription", reason: "Netflix free trial scam" },
  { pattern: "loan-approved-apply", reason: "Instant loan fraud" },
  { pattern: "ed-summons", reason: "ED/CBI threat scam" },
  { pattern: "fdic-bank-support", reason: "FDIC impersonation" },
  { pattern: "irs-refund-claim", reason: "IRS impersonation" },
  { pattern: "medicare-card-update", reason: "Medicare scam" },
  { pattern: "social-security-suspend", reason: "SSA fraud" },
  { pattern: "win-lottery-ticket", reason: "Lottery fraud" },
  { pattern: "inheritance-claim-fund", reason: "Inheritance fraud" },
  { pattern: "advance-fee-transfer", reason: "Advance fee fraud (419)" },
  { pattern: "gift-card-claim-reward", reason: "Gift card scam" },
  { pattern: "alipay-account-verify", reason: "Alipay phishing" },
  { pattern: "wechat-security-alert", reason: "WeChat phishing" },
  { pattern: "mpesa-free-bundle", reason: "M-Pesa free data scam" },
  { pattern: "nft-whitelist-mint", reason: "NFT scam" },
  { pattern: "metamask-wallet-verify", reason: "MetaMask wallet drain" },
  { pattern: "opensea-claim-nft", reason: "OpenSea phishing" },
];

export async function loadOfflineBlacklist(): Promise<{ pattern: string; reason: string }[]> {
  try {
    const ts = await AsyncStorage.getItem(OFFLINE_BLACKLIST_TS_KEY);
    const raw = await AsyncStorage.getItem(OFFLINE_BLACKLIST_KEY);
    if (!ts || !raw) return BUILT_IN_BLACKLIST;
    if (Date.now() - parseInt(ts, 10) > OFFLINE_BLACKLIST_TTL) return BUILT_IN_BLACKLIST;
    const parsed = JSON.parse(raw);
    return [...BUILT_IN_BLACKLIST, ...parsed];
  } catch {
    return BUILT_IN_BLACKLIST;
  }
}

export async function saveOfflineBlacklist(
  extra: { pattern: string; reason: string }[]
): Promise<void> {
  try {
    await AsyncStorage.setItem(OFFLINE_BLACKLIST_KEY, JSON.stringify(extra));
    await AsyncStorage.setItem(OFFLINE_BLACKLIST_TS_KEY, Date.now().toString());
  } catch {}
}

export function checkOfflineBlacklist(
  content: string,
  blacklist: { pattern: string; reason: string }[]
): { matched: boolean; reason: string | null } {
  const lower = content.toLowerCase();
  for (const entry of blacklist) {
    if (lower.includes(entry.pattern)) {
      return { matched: true, reason: entry.reason };
    }
  }
  return { matched: false, reason: null };
}
