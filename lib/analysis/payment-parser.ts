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

  // ── Indian bank apps & wallets missing from original registry ──────────────

  // HDFC Bank (highest priority for Indian banking)
  { id: "hdfc_bank", displayName: "HDFC Bank", category: "upi_india", region: "India",
    schemes: ["hdfcbank://", "payzapp://", "hdfc://", "hdfcpay://", "smarthubbusiness://"],
    urlPatterns: ["hdfcbank.com/pay", "payzapp.in", "smartpay.hdfcbank.com",
      "hdfcbanksmarthub.com", "vyapar.hdfcbank.com"],
    trustedDomains: ["hdfcbank.com", "payzapp.in"] },

  // BharatPe (major merchant payment network)
  { id: "bharatpe", displayName: "BharatPe", category: "upi_india", region: "India",
    schemes: ["bharatpe://", "swipe://"],
    urlPatterns: ["bharatpe.com", "bharatpe.one", "merchants.bharatpe.com"],
    trustedDomains: ["bharatpe.com", "bharatpe.one"] },

  // Axis Pay (was in type but missing from registry)
  { id: "axis_pay", displayName: "Axis Pay", category: "upi_india", region: "India",
    schemes: ["axispay://", "axisbank://", "axis://"],
    urlPatterns: ["axisbank.com/pay", "axisbank.com/mobile-banking",
      "axispay.in", "open.axisbank.com"],
    trustedDomains: ["axisbank.com", "axispay.in"] },

  // Navi (was in type but missing from registry)
  { id: "navi", displayName: "Navi", category: "upi_india", region: "India",
    schemes: ["navi://"],
    urlPatterns: ["navi.com/pay", "navi.com/upi"],
    trustedDomains: ["navi.com"] },

  // SuperApp by Fincare (was in type but missing from registry)
  { id: "superapp", displayName: "SuperApp", category: "upi_india", region: "India",
    schemes: ["superapp://", "superfin://"],
    urlPatterns: ["superfin.money", "fincarebank.in"],
    trustedDomains: ["superfin.money", "fincarebank.in"] },

  // Pockets by ICICI (was in type but missing from registry)
  { id: "pockets_icici", displayName: "Pockets (ICICI Bank)", category: "upi_india", region: "India",
    schemes: ["pockets://", "icicipockets://"],
    urlPatterns: ["pockets.icicibank.com", "icicibank.com/pockets"],
    trustedDomains: ["icicibank.com"] },

  // Kotak Pay / Kotak 811
  { id: "kotak_pay", displayName: "Kotak Pay", category: "upi_india", region: "India",
    schemes: ["kotak://", "kotakpay://", "kotak811://"],
    urlPatterns: ["kotak.com/pay", "kotak811.com", "m.kotak.com/payment"],
    trustedDomains: ["kotak.com", "kotak811.com"] },

  // BOB World (Bank of Baroda)
  { id: "bob_world", displayName: "BOB World Pay", category: "upi_india", region: "India",
    schemes: ["bobworld://", "bankofbaroda://", "baroda://", "barodampay://"],
    urlPatterns: ["bankofbaroda.in/pay", "bobworld.in"],
    trustedDomains: ["bankofbaroda.in"] },

  // IDFC FIRST Bank
  { id: "idfcfirst", displayName: "IDFC FIRST Bank", category: "upi_india", region: "India",
    schemes: ["idfcfirst://", "idfcfirstbank://", "idfcbank://"],
    urlPatterns: ["idfcfirstbank.com/pay", "idfcbank.com/pay"],
    trustedDomains: ["idfcfirstbank.com", "idfcbank.com"] },

  // Yes Pay (Yes Bank)
  { id: "yes_pay", displayName: "Yes Pay (Yes Bank)", category: "upi_india", region: "India",
    schemes: ["yespay://", "yesbank://", "yesbankpay://"],
    urlPatterns: ["yesbank.in/pay", "yespay.in"],
    trustedDomains: ["yesbank.in", "yespay.in"] },

  // Fi Money (Federal Bank partnership)
  { id: "fi_money", displayName: "Fi Money", category: "upi_india", region: "India",
    schemes: ["fi://", "fimoney://"],
    urlPatterns: ["fi.money/pay", "epifi.com", "fi.money/upi"],
    trustedDomains: ["fi.money", "epifi.com"] },

  // Jupiter Money
  { id: "jupiter_money", displayName: "Jupiter Money", category: "upi_india", region: "India",
    schemes: ["jupiter://", "jupitermoney://"],
    urlPatterns: ["jupitermoney.com", "jupiter.money/pay"],
    trustedDomains: ["jupitermoney.com", "jupiter.money"] },

  // Groww Pay
  { id: "groww_pay", displayName: "Groww Pay", category: "upi_india", region: "India",
    schemes: ["groww://"],
    urlPatterns: ["groww.in/pay", "groww.in/upi"],
    trustedDomains: ["groww.in"] },

  // IndPay (Indian Bank)
  { id: "indpay", displayName: "IndPay (Indian Bank)", category: "upi_india", region: "India",
    schemes: ["indianbank://", "indpay://"],
    urlPatterns: ["indianbank.in/pay", "indianbank.co.in"],
    trustedDomains: ["indianbank.in"] },

  // Canara ai1 / CanPay (Canara Bank)
  { id: "canara_bank", displayName: "Canara ai1", category: "upi_india", region: "India",
    schemes: ["canara://", "canpay://", "canarabank://"],
    urlPatterns: ["canarabank.in/pay", "canarabank.com"],
    trustedDomains: ["canarabank.in", "canarabank.com"] },

  // Vyom (Union Bank of India)
  { id: "union_bank", displayName: "Vyom (Union Bank)", category: "upi_india", region: "India",
    schemes: ["unionbank://", "vyom://", "uboi://"],
    urlPatterns: ["unionbankofindia.co.in/pay", "unionbank.co.in"],
    trustedDomains: ["unionbankofindia.co.in"] },

  // RBL MoBank
  { id: "rbl_bank", displayName: "RBL MoBank", category: "upi_india", region: "India",
    schemes: ["rbl://", "rblmobank://", "rblbank://"],
    urlPatterns: ["rblbank.com/pay"],
    trustedDomains: ["rblbank.com"] },

  // PNB ONE (Punjab National Bank)
  { id: "pnb_one", displayName: "PNB ONE", category: "upi_india", region: "India",
    schemes: ["pnb://", "pnbone://", "pnbmobilebanking://"],
    urlPatterns: ["pnbindia.in/pay", "pnbindia.in"],
    trustedDomains: ["pnbindia.in"] },

  // IndusPay (IndusInd Bank)
  { id: "indus_pay", displayName: "IndusPay (IndusInd Bank)", category: "upi_india", region: "India",
    schemes: ["induspay://", "indusmobile://", "indusind://"],
    urlPatterns: ["indusmobilebanking.com", "indusind.com/pay"],
    trustedDomains: ["indusind.com", "indusmobilebanking.com"] },

  // BharatQR (NPCI generic merchant QR — used by most Indian banks)
  { id: "bharatqr", displayName: "BharatQR (NPCI)", category: "upi_india", region: "India",
    schemes: ["bharatqr://"],
    urlPatterns: ["bharatqr.com", "npci.org.in/bharatqr"],
    trustedDomains: ["bharatqr.com", "npci.org.in"] },

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
    return parseEmvQr(content);
  }

  const bbpsParsed = parseBbpsQr(content, lower);
  if (bbpsParsed) return bbpsParsed;

  const bankAccountParsed = parseIndianBankAccountQr(content, lower);
  if (bankAccountParsed) return bankAccountParsed;

  if (content.startsWith("BCD\n") || content.startsWith("BCD\r\n")) {
    return parseSepaQr(content);
  }

  if (lower.includes("br.gov.bcb.pix")) {
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

const BANK_HANDLE_TO_APP: Record<string, { id: PaymentAppId; name: string }> = {
  "okhdfcbank": { id: "hdfc_bank", name: "HDFC Bank" },
  "hdfcbank": { id: "hdfc_bank", name: "HDFC Bank" },
  "payzapp": { id: "hdfc_bank", name: "HDFC Bank (PayZapp)" },
  "okaxis": { id: "axis_pay", name: "Axis Pay" },
  "axisbank": { id: "axis_pay", name: "Axis Pay" },
  "axl": { id: "axis_pay", name: "Axis Pay" },
  "oksbi": { id: "yono_sbi", name: "YONO SBI" },
  "sbi": { id: "yono_sbi", name: "YONO SBI" },
  "okicici": { id: "imobile_pay", name: "iMobile Pay (ICICI)" },
  "icici": { id: "imobile_pay", name: "iMobile Pay (ICICI)" },
  "ibl": { id: "imobile_pay", name: "iMobile Pay (ICICI)" },
  "ybl": { id: "phonepe", name: "PhonePe (Yes Bank)" },
  "superyes": { id: "phonepe", name: "PhonePe (Yes Bank)" },
  "paytm": { id: "paytm", name: "Paytm Payments Bank" },
  "kotak": { id: "kotak_pay", name: "Kotak Pay" },
  "kmbl": { id: "kotak_pay", name: "Kotak Pay" },
  "barodampay": { id: "bob_world", name: "BOB World Pay" },
  "bob": { id: "bob_world", name: "BOB World Pay" },
  "federal": { id: "fi_money", name: "Federal Bank / Fi" },
  "fbl": { id: "fi_money", name: "Fi Money (Federal Bank)" },
  "indus": { id: "indus_pay", name: "IndusPay (IndusInd)" },
  "idfcbank": { id: "idfcfirst", name: "IDFC FIRST Bank" },
  "idfcfirst": { id: "idfcfirst", name: "IDFC FIRST Bank" },
  "rbl": { id: "rbl_bank", name: "RBL MoBank" },
  "pnb": { id: "pnb_one", name: "PNB ONE" },
  "cnrb": { id: "canara_bank", name: "Canara Bank" },
  "ucobank": { id: "union_bank", name: "UCO Bank" },
  "mahb": { id: "union_bank", name: "Bank of Maharashtra" },
  "airtel": { id: "airtel_money", name: "Airtel Payments Bank" },
  "airtelpe": { id: "airtel_money", name: "Airtel Pay" },
  "jio": { id: "jiomoney", name: "JioMoney" },
  "abfspay": { id: "slice", name: "Aditya Birla Finance" },
  "sliceaxis": { id: "slice", name: "Slice" },
  "naviaxis": { id: "navi", name: "Navi" },
  "navi": { id: "navi", name: "Navi" },
  "amazonpay": { id: "amazon_pay", name: "Amazon Pay" },
  "apl": { id: "amazon_pay", name: "Amazon Pay" },
  "cred": { id: "cred", name: "CRED Pay" },
  "freecharge": { id: "freecharge", name: "FreeCharge" },
  "mobikwik": { id: "mobikwik", name: "MobiKwik" },
  "upi": { id: "upi", name: "UPI Payment" },
  "bhim": { id: "bhim", name: "BHIM" },
  "icicibank": { id: "imobile_pay", name: "iMobile Pay (ICICI)" },
  "hdfcbankjd": { id: "hdfc_bank", name: "HDFC Bank" },
  "postbank": { id: "upi", name: "India Post Payments Bank" },
  "timecosmos": { id: "upi", name: "Fino Payments Bank" },
  "jupiterpay": { id: "jupiter_money", name: "Jupiter Money" },
  "tapicici": { id: "imobile_pay", name: "ICICI Bank" },
  "yesbank": { id: "yes_pay", name: "Yes Pay (Yes Bank)" },
  "yesbankltd": { id: "yes_pay", name: "Yes Pay (Yes Bank)" },
  "groww": { id: "groww_pay", name: "Groww Pay" },
  "bajajpay": { id: "bajaj_pay", name: "Bajaj Pay" },
  "razorpay": { id: "razorpay", name: "Razorpay" },
  "juspay": { id: "juspay", name: "JusPay" },
};

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
    if (paMatch) pa = decodeURIComponent(paMatch[1]);
  }
  const bankHandle = pa.includes("@") ? pa.split("@")[1].toLowerCase() : "";

  // Detect specific bank/app from the VPA handle or URL scheme
  const schemeRaw = content.split("://")[0]?.toLowerCase() || "upi";
  const detectedFromScheme = schemeRaw !== "upi" && schemeRaw !== "http" && schemeRaw !== "https"
    ? BANK_HANDLE_TO_APP[schemeRaw] : undefined;
  const detectedFromHandle = bankHandle ? BANK_HANDLE_TO_APP[bankHandle] : undefined;
  const detected = detectedFromHandle || detectedFromScheme;

  const appId: PaymentAppId = detected?.id ?? "upi";
  const appName = detected?.name ?? (schemeRaw === "upi" ? displayName : formatSchemeName(schemeRaw));

  return {
    app: appId,
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
  let vpa: string | undefined;
  let bankHandle: string | undefined;
  let recipientName: string | undefined;
  try {
    const qIdx = content.indexOf("?");
    if (qIdx >= 0) {
      const params = new URLSearchParams(content.slice(qIdx + 1));
      amount = params.get("amount") || params.get("am") || params.get("amt") || undefined;
      const pn = params.get("pn") || params.get("name");
      if (pn) recipientName = decodeURIComponent(pn);
      recipientId = params.get("to") || params.get("id") || params.get("merchant") || params.get("payee") || "";
      if (recipientId.includes("@")) {
        vpa = recipientId;
        bankHandle = recipientId.split("@")[1];
      }
    }
    if (!vpa) {
      const atMatch = content.match(/[\w.+-]+@[\w.]+/);
      if (atMatch) {
        vpa = atMatch[0];
        recipientId = recipientId || atMatch[0];
        bankHandle = atMatch[0].split("@")[1];
      }
    }
  } catch {}

  const isIndia = !!(vpa || scheme.includes("upi") || scheme.includes("pay") ||
    lower.includes("inr") || lower.includes("upi"));

  return {
    app: isIndia ? "upi" : "unknown_payment",
    appDisplayName: displayName,
    appCategory: isIndia ? "upi_india" : "other",
    region: isIndia ? "India" : "Regional",
    recipientId: recipientId || content.slice(0, 60),
    recipientName,
    amount,
    rawContent: content,
    isAmountPreFilled: !!amount && parseFloat(amount) > 0,
    vpa,
    bankHandle,
  };
}

function parseUrlPaymentQr(content: string, lower: string): ParsedPaymentQr {
  let amount: string | undefined;
  let recipientId = "";
  let recipientName: string | undefined;
  let vpa: string | undefined;
  let bankHandle: string | undefined;
  let note: string | undefined;
  let appName = "Payment";
  let appId: PaymentAppId = "unknown_payment";
  let appCategory: ParsedPaymentQr["appCategory"] = "other";
  let region = "Regional";
  try {
    const urlObj = new URL(content);
    const hostname = urlObj.hostname.replace(/^www\./, "");
    appName = hostname.replace(/^pay\./, "").split(".")[0];
    appName = appName.charAt(0).toUpperCase() + appName.slice(1) + " Pay";
    amount = urlObj.searchParams.get("amount") || urlObj.searchParams.get("am") ||
      urlObj.searchParams.get("amt") || undefined;
    const pa = urlObj.searchParams.get("pa") || urlObj.searchParams.get("vpa");
    const pn = urlObj.searchParams.get("pn") || urlObj.searchParams.get("name");
    note = urlObj.searchParams.get("tn") || urlObj.searchParams.get("note") || undefined;
    if (pa) {
      recipientId = pa;
      vpa = pa;
      bankHandle = pa.includes("@") ? pa.split("@")[1] : undefined;
      appCategory = "upi_india";
      region = "India";
      appId = "upi";
    } else {
      recipientId = urlObj.searchParams.get("to") || urlObj.searchParams.get("merchant") ||
        urlObj.pathname.split("/").pop() || "";
      if (recipientId.includes("@")) {
        vpa = recipientId;
        bankHandle = recipientId.split("@")[1];
        appCategory = "upi_india";
        region = "India";
        appId = "upi";
      }
    }
    if (pn) recipientName = decodeURIComponent(pn);
    if (!recipientId) recipientId = content.slice(0, 60);
  } catch {
    recipientId = content.slice(0, 60);
    const atMatch = content.match(/[\w.+-]+@[\w.]+/);
    if (atMatch) {
      vpa = atMatch[0];
      recipientId = atMatch[0];
      bankHandle = atMatch[0].split("@")[1];
      appCategory = "upi_india";
      region = "India";
      appId = "upi";
    }
  }
  return {
    app: appId,
    appDisplayName: appName,
    appCategory,
    region,
    recipientId,
    recipientName,
    amount,
    rawContent: content,
    isAmountPreFilled: !!amount && parseFloat(amount) > 0,
    vpa,
    bankHandle,
    note,
  };
}

function parseRawFieldPaymentQr(content: string, lower: string): ParsedPaymentQr {
  let amount: string | undefined;
  let recipientId = "";
  let recipientName: string | undefined;
  let vpa: string | undefined;
  let bankHandle: string | undefined;

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

  if (recipientId.includes("@")) {
    vpa = recipientId;
    bankHandle = recipientId.split("@")[1];
  }

  const isIndia = !!(vpa || lower.includes("inr") || lower.includes("₹") || lower.includes("upi"));

  return {
    app: isIndia ? "upi" : "unknown_payment",
    appDisplayName: isIndia ? "UPI Payment" : "Payment QR",
    appCategory: isIndia ? "upi_india" : "other",
    region: isIndia ? "India" : "Regional",
    recipientId: recipientId || content.slice(0, 60),
    recipientName,
    amount,
    rawContent: content,
    isAmountPreFilled: !!amount && parseFloat(amount) > 0,
    vpa,
    bankHandle,
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

// ─── EMV TLV Parser ──────────────────────────────────────────────────────────
// Decodes the flat EMV QRCPS (ISO 20022) TLV structure.
// Each data object: ID(2 chars) | LEN(2 chars, decimal) | VALUE(LEN chars)
function parseEmvTlv(data: string): Record<string, string> {
  const result: Record<string, string> = {};
  let i = 0;
  while (i + 4 <= data.length) {
    const id = data.slice(i, i + 2);
    const lenStr = data.slice(i + 2, i + 4);
    const len = parseInt(lenStr, 10);
    if (isNaN(len) || len < 0 || i + 4 + len > data.length) break;
    result[id] = data.slice(i + 4, i + 4 + len);
    i += 4 + len;
  }
  return result;
}

// Full EMV QR parser — extracts merchant name, city, VPA, account, IFSC, amount.
function parseEmvQr(content: string): ParsedPaymentQr {
  const tlv = parseEmvTlv(content);

  const merchantName = tlv["59"] || "";
  const merchantCity = tlv["60"] || "";
  const countryCode  = tlv["58"] || "";
  const currency     = tlv["53"] || "";
  const amount       = tlv["54"] || undefined;
  const mcc          = tlv["52"] || "";
  const postalCode   = tlv["61"] || "";

  // Determine point of initiation: 11 = static, 12 = dynamic
  const initMethod = tlv["01"] || "";

  // Extract additional data (tag 62) — bill number, reference label, etc.
  const extraFields: Record<string, string> = {};
  if (tlv["62"]) {
    const extra = parseEmvTlv(tlv["62"]);
    if (extra["01"]) extraFields["billNumber"]    = extra["01"];
    if (extra["05"]) extraFields["referenceLabel"] = extra["05"];
    if (extra["07"]) extraFields["terminalId"]    = extra["07"];
    if (extra["08"]) extraFields["purpose"]       = extra["08"];
  }

  // Scan merchant account info tags 26–51 for VPA, bank account, IFSC
  let vpa = "";
  let bankAccount = "";
  let ifsc = "";
  let detectedNetwork: { id: PaymentAppId; name: string; category: ParsedPaymentQr["appCategory"]; region: string } | null = null;

  for (let tag = 26; tag <= 51; tag++) {
    const tagId = String(tag).padStart(2, "0");
    const templateValue = tlv[tagId];
    if (!templateValue) continue;

    const sub = parseEmvTlv(templateValue);
    const aid  = (sub["00"] || "").toUpperCase();
    const val01 = sub["01"] || "";
    const val02 = sub["02"] || "";
    const val03 = sub["03"] || "";
    const val04 = sub["04"] || "";

    // Detect network from AID
    if (aid.startsWith("A000000677") || aid.includes("BHARATQR")) {
      // BharatQR — subtags: 01=mobile, 02=account, 03=IFSC, 04=VPA
      if (!vpa && val04 && val04.includes("@")) vpa = val04;
      if (!vpa && val01 && val01.includes("@")) vpa = val01;
      if (!bankAccount && val02) bankAccount = val02;
      if (!ifsc && val03) ifsc = val03;
      if (!detectedNetwork) {
        detectedNetwork = { id: "bharatqr", name: "BharatQR (NPCI)", category: "upi_india", region: "India" };
      }
    } else if (aid.startsWith("A000000524") || aid.includes("RUPAY")) {
      if (!detectedNetwork) {
        detectedNetwork = { id: "bharatqr", name: "RuPay (NPCI)", category: "upi_india", region: "India" };
      }
    } else if (aid.startsWith("A000000533") || templateValue.toLowerCase().includes("alipay")) {
      if (!detectedNetwork) {
        detectedNetwork = { id: "alipay", name: "Alipay (支付宝)", category: "china", region: "China" };
      }
    } else if (aid.startsWith("A000000049") || templateValue.toLowerCase().includes("wechat")) {
      if (!detectedNetwork) {
        detectedNetwork = { id: "wechat_pay", name: "WeChat Pay (微信支付)", category: "china", region: "China" };
      }
    } else if (templateValue.includes("SG.PAYNOW") || templateValue.toLowerCase().includes("paynow")) {
      if (!detectedNetwork) {
        detectedNetwork = { id: "nets_sg", name: "PayNow (Singapore)", category: "singapore_malaysia", region: "Singapore" };
      }
    } else if (templateValue.includes("TH.PROMPTPAY") || templateValue.toLowerCase().includes("promptpay")) {
      if (!detectedNetwork) {
        detectedNetwork = { id: "promptpay", name: "PromptPay (Thailand)", category: "thailand", region: "Thailand" };
      }
    } else if (templateValue.includes("br.gov.bcb.pix") || templateValue.toLowerCase().includes("pix")) {
      if (!detectedNetwork) {
        detectedNetwork = { id: "pix", name: "Pix", category: "brazil_latam", region: "Brazil" };
      }
    } else if (templateValue.includes("DuitNow") || templateValue.toLowerCase().includes("duitnow")) {
      if (!detectedNetwork) {
        detectedNetwork = { id: "duitnow", name: "DuitNow (Malaysia)", category: "singapore_malaysia", region: "Malaysia" };
      }
    }

    // Try to pick up a VPA from any sub-tag that looks like one
    if (!vpa) {
      for (const sv of Object.values(sub)) {
        if (sv.includes("@") && sv.length < 80) { vpa = sv; break; }
      }
    }

    // Detect well-known Indian apps from merchant account info text
    const tmv = templateValue.toLowerCase();
    if (!detectedNetwork) {
      if (tmv.includes("hdfcbank") || tmv.includes("hdfc")) {
        detectedNetwork = { id: "hdfc_bank", name: "HDFC Bank", category: "upi_india", region: "India" };
      } else if (tmv.includes("oksbi") || tmv.includes("sbi")) {
        detectedNetwork = { id: "yono_sbi", name: "YONO SBI", category: "upi_india", region: "India" };
      } else if (tmv.includes("okaxis") || tmv.includes("axisbank") || tmv.includes("axis")) {
        detectedNetwork = { id: "axis_pay", name: "Axis Pay", category: "upi_india", region: "India" };
      } else if (tmv.includes("okicici") || tmv.includes("icici")) {
        detectedNetwork = { id: "imobile_pay", name: "iMobile Pay (ICICI)", category: "upi_india", region: "India" };
      } else if (tmv.includes("phonepe")) {
        detectedNetwork = { id: "phonepe", name: "PhonePe", category: "upi_india", region: "India" };
      } else if (tmv.includes("paytm")) {
        detectedNetwork = { id: "paytm", name: "Paytm", category: "upi_india", region: "India" };
      } else if (tmv.includes("bharatpe")) {
        detectedNetwork = { id: "bharatpe", name: "BharatPe", category: "upi_india", region: "India" };
      }
    }
  }

  // Also check the raw content for well-known identifiers if we still don't know the network
  if (!detectedNetwork) {
    const lc = content.toLowerCase();
    if (lc.includes("hdfcbank") || lc.includes("payzapp")) {
      detectedNetwork = { id: "hdfc_bank", name: "HDFC Bank", category: "upi_india", region: "India" };
    } else if (lc.includes("oksbi") || lc.includes("yono")) {
      detectedNetwork = { id: "yono_sbi", name: "YONO SBI", category: "upi_india", region: "India" };
    } else if (lc.includes("okaxis") || lc.includes("axisbank")) {
      detectedNetwork = { id: "axis_pay", name: "Axis Pay", category: "upi_india", region: "India" };
    } else if (lc.includes("okicici") || lc.includes("icicibank")) {
      detectedNetwork = { id: "imobile_pay", name: "iMobile Pay (ICICI)", category: "upi_india", region: "India" };
    } else if (lc.includes("bharatqr") || lc.includes("npci")) {
      detectedNetwork = { id: "bharatqr", name: "BharatQR (NPCI)", category: "upi_india", region: "India" };
    } else if (lc.includes("rupay")) {
      detectedNetwork = { id: "bharatqr", name: "RuPay (NPCI)", category: "upi_india", region: "India" };
    } else if (lc.includes("phonepe")) {
      detectedNetwork = { id: "phonepe", name: "PhonePe", category: "upi_india", region: "India" };
    } else if (lc.includes("paytm")) {
      detectedNetwork = { id: "paytm", name: "Paytm", category: "upi_india", region: "India" };
    } else if (lc.includes("bharatpe")) {
      detectedNetwork = { id: "bharatpe", name: "BharatPe", category: "upi_india", region: "India" };
    } else if (lc.includes("br.gov.bcb.pix")) {
      detectedNetwork = { id: "pix", name: "Pix", category: "brazil_latam", region: "Brazil" };
    } else if (lc.includes("sg.paynow")) {
      detectedNetwork = { id: "nets_sg", name: "PayNow (Singapore)", category: "singapore_malaysia", region: "Singapore" };
    } else if (lc.includes("th.promptpay")) {
      detectedNetwork = { id: "promptpay", name: "PromptPay (Thailand)", category: "thailand", region: "Thailand" };
    }
  }

  const net = detectedNetwork;

  // Resolve the bank handle from VPA (e.g. "merchant@okhdfcbank" → "okhdfcbank")
  const bankHandle = vpa?.includes("@") ? vpa.split("@")[1].toLowerCase() : undefined;

  // Build a human-readable recipient ID from whatever we extracted
  let recipientId = vpa || bankAccount || merchantName || content.slice(0, 40);

  // Annotate account + IFSC into extra fields if available
  if (bankAccount) extraFields["accountNumber"] = bankAccount;
  if (ifsc) extraFields["ifsc"] = ifsc;
  if (mcc) extraFields["mcc"] = mcc;
  if (postalCode) extraFields["postalCode"] = postalCode;
  if (initMethod === "12") extraFields["dynamic"] = "true";

  // Currency string
  const currencyStr = currency === "356" ? "INR" : currency || undefined;

  return {
    app: net?.id ?? "emv_generic",
    appDisplayName: net?.name ?? (merchantName ? "EMV Bank QR" : "EMV QR Payment"),
    appCategory: net?.category ?? "emv",
    region: net?.region ?? (countryCode === "IN" ? "India" : countryCode || "Regional"),
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

// ─── BBPS (Bharat Bill Payment System) Parser ────────────────────────────────
// BBPS QR codes are used for utility bills, insurance, loans, etc.
// Format: bbps://<category>?billerId=...&customerParam=...&amount=...
function parseBbpsQr(content: string, lower: string): ParsedPaymentQr | null {
  const isBbps =
    lower.startsWith("bbps://") ||
    lower.startsWith("https://bbps.") ||
    lower.includes("bbpsonline.com") ||
    lower.includes("billpayment.npci") ||
    (lower.includes("billerid=") && (lower.includes("bbps") || lower.includes("biller")));

  if (!isBbps) return null;

  let billerId = "";
  let amount: string | undefined;
  let customerParam = "";
  let category = "";
  let note: string | undefined;

  try {
    const url = new URL(content.startsWith("bbps://") ? `https://${content.slice(7)}` : content);
    billerId      = url.searchParams.get("billerId") || url.searchParams.get("biller_id") || "";
    amount        = url.searchParams.get("amount") || url.searchParams.get("am") || undefined;
    customerParam = url.searchParams.get("customerParam") || url.searchParams.get("customerId") || "";
    category      = url.searchParams.get("category") || url.pathname.split("/")[1] || "";
    note          = url.searchParams.get("remarks") || url.searchParams.get("note") || undefined;
  } catch {
    const billerMatch = content.match(/billerid=([^&\s]+)/i);
    if (billerMatch) billerId = billerMatch[1];
    const amMatch = content.match(/amount=([^&\s]+)/i);
    if (amMatch) amount = amMatch[1];
    const custMatch = content.match(/customerparam=([^&\s]+)/i);
    if (custMatch) customerParam = custMatch[1];
  }

  const categoryLabel = category
    ? category.charAt(0).toUpperCase() + category.slice(1).toLowerCase()
    : "Bill";

  return {
    app: "upi",
    appDisplayName: `BBPS ${categoryLabel} Payment`,
    appCategory: "upi_india",
    region: "India",
    recipientId: billerId || customerParam || "BBPS",
    recipientName: billerId || undefined,
    amount,
    currency: "INR",
    note: note || (customerParam ? `Customer: ${customerParam}` : undefined),
    rawContent: content,
    isAmountPreFilled: !!(amount && parseFloat(amount) > 0),
    extraFields: {
      ...(billerId && { billerId }),
      ...(customerParam && { customerParam }),
      ...(category && { category }),
    },
  };
}

// ─── Indian Bank Account QR Parser ───────────────────────────────────────────
// Some Indian banks (SBI, HDFC, Axis, etc.) generate QR codes containing
// account number, IFSC, and holder name for NEFT/IMPS transfers.
// Common formats:
//   1. "IFSC:SBIN0001234|ACNO:123456789|NAME:Ravi Sharma|BANK:SBI"
//   2. "ACC=12345678&IFSC=SBIN0001234&NAME=Ravi+Sharma"
//   3. "SBIN0001234\n123456789\nRavi Sharma\nSBI\nSAVINGS"  (passbook QR)
//   4. JSON: {"accountNo":"12345678","ifsc":"SBIN0001234","name":"Ravi Sharma"}
function parseIndianBankAccountQr(content: string, lower: string): ParsedPaymentQr | null {
  // IFSC regex: 4 uppercase letters + 0 + 6 alphanumeric chars
  const IFSC_RE = /\b([A-Z]{4}0[A-Z0-9]{6})\b/;
  // Indian bank account numbers: 9–18 digits
  const ACC_RE = /\b(\d{9,18})\b/;

  let ifsc = "";
  let accountNo = "";
  let holderName = "";
  let bankName = "";
  let accountType = "";

  // ── Format 1: key:value or key=value separated by |, &, \n ─────────────────
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

  // ── Format 2: JSON ──────────────────────────────────────────────────────────
  if (!ifsc && content.trim().startsWith("{")) {
    try {
      const json = JSON.parse(content);
      ifsc      = (json.ifsc || json.IFSC || json.ifscCode || "").toUpperCase();
      accountNo = json.accountNo || json.account_no || json.accNo || json.accountNumber || "";
      holderName= json.name || json.holderName || json.beneficiaryName || "";
      bankName  = json.bank || json.bankName || "";
      accountType = json.accountType || json.type || "";
    } catch {}
  }

  // ── Format 3: Line-by-line passbook QR ──────────────────────────────────────
  // "SBIN0001234\n123456789\nRavi Sharma\nSBI\nSAVINGS"
  if (!ifsc) {
    const lines = content.split(/[\n|]/).map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      if (!ifsc && IFSC_RE.test(line)) { ifsc = (line.match(IFSC_RE)![1]).toUpperCase(); continue; }
      if (!accountNo && ACC_RE.test(line) && !/[a-zA-Z@]/.test(line)) { accountNo = line.match(ACC_RE)![1]; continue; }
      if (!holderName && /^[A-Za-z\s.'-]{3,40}$/.test(line)) holderName = line;
    }
  }

  // Must have at least IFSC to be considered an Indian bank account QR
  if (!ifsc || !IFSC_RE.test(ifsc)) return null;

  // Resolve bank name from IFSC prefix
  if (!bankName) bankName = resolveIFSCBankName(ifsc);

  const appInfo = detectBankFromIFSC(ifsc);

  const displayName = [bankName || appInfo.name, accountType]
    .filter(Boolean)
    .join(" ");

  const recipientId = accountNo
    ? `${accountNo}${ifsc ? ` / ${ifsc}` : ""}`
    : ifsc;

  return {
    app: appInfo.id,
    appDisplayName: `${displayName} — Account QR`,
    appCategory: "upi_india",
    region: "India",
    recipientId,
    recipientName: holderName || undefined,
    rawContent: content,
    isAmountPreFilled: false,
    currency: "INR",
    extraFields: {
      ifsc,
      ...(accountNo && { accountNumber: accountNo }),
      ...(holderName && { holderName }),
      ...(bankName && { bankName }),
      ...(accountType && { accountType }),
    },
  };
}

// Resolve a human-readable bank name from IFSC prefix (first 4 letters)
function resolveIFSCBankName(ifsc: string): string {
  const prefix = ifsc.slice(0, 4).toUpperCase();
  const IFSC_BANK_MAP: Record<string, string> = {
    SBIN: "State Bank of India",
    HDFC: "HDFC Bank",
    ICIC: "ICICI Bank",
    UTIB: "Axis Bank",
    KKBK: "Kotak Mahindra Bank",
    PUNB: "Punjab National Bank",
    BARB: "Bank of Baroda",
    CNRB: "Canara Bank",
    UBIN: "Union Bank of India",
    IOBA: "Indian Overseas Bank",
    ANDB: "Andhra Bank",
    CORP: "Corporation Bank",
    MAHB: "Bank of Maharashtra",
    IDIB: "Indian Bank",
    UCBA: "UCO Bank",
    VIJB: "Vijaya Bank",
    ALLA: "Allahabad Bank",
    ORBC: "Oriental Bank of Commerce",
    BKID: "Bank of India",
    CBIN: "Central Bank of India",
    PSIB: "Punjab & Sind Bank",
    INDB: "IndusInd Bank",
    IDFB: "IDFC FIRST Bank",
    RATN: "RBL Bank",
    YESB: "Yes Bank",
    FDRL: "Federal Bank",
    KARB: "Karnataka Bank",
    KVBL: "Karur Vysya Bank",
    SIBL: "South Indian Bank",
    DLXB: "Dhanlaxmi Bank",
    NKGS: "NKGSB Co-operative Bank",
    AIRP: "Airtel Payments Bank",
    FINO: "Fino Payments Bank",
    IPOS: "India Post Payments Bank",
    PAYT: "Paytm Payments Bank",
    JAKA: "Jammu & Kashmir Bank",
  };
  return IFSC_BANK_MAP[prefix] || "";
}

// Detect PaymentAppId from IFSC prefix
function detectBankFromIFSC(ifsc: string): { id: PaymentAppId; name: string } {
  const prefix = ifsc.slice(0, 4).toUpperCase();
  const MAP: Record<string, { id: PaymentAppId; name: string }> = {
    SBIN: { id: "yono_sbi",    name: "State Bank of India" },
    HDFC: { id: "hdfc_bank",   name: "HDFC Bank" },
    ICIC: { id: "imobile_pay", name: "ICICI Bank" },
    UTIB: { id: "axis_pay",    name: "Axis Bank" },
    KKBK: { id: "kotak_pay",   name: "Kotak Mahindra Bank" },
    PUNB: { id: "pnb_one",     name: "Punjab National Bank" },
    BARB: { id: "bob_world",   name: "Bank of Baroda" },
    CNRB: { id: "canara_bank", name: "Canara Bank" },
    UBIN: { id: "union_bank",  name: "Union Bank of India" },
    YESB: { id: "yes_pay",     name: "Yes Bank" },
    FDRL: { id: "fi_money",    name: "Federal Bank" },
    IDFB: { id: "idfcfirst",   name: "IDFC FIRST Bank" },
    RATN: { id: "rbl_bank",    name: "RBL Bank" },
    INDB: { id: "indus_pay",   name: "IndusInd Bank" },
    IDIB: { id: "indpay",      name: "Indian Bank" },
    AIRP: { id: "airtel_money",name: "Airtel Payments Bank" },
  };
  return MAP[prefix] || { id: "upi", name: resolveIFSCBankName(ifsc) || "Indian Bank" };
}
