export interface QrSignatureResult {
  isVerified: boolean;
  isBranded: boolean;
  ownerName?: string;
  ownerVerified?: boolean;
}

export type PaymentAppId =
  | "upi" | "gpay_india" | "phonepe" | "paytm" | "bhim" | "amazon_pay"
  | "cred" | "freecharge" | "mobikwik" | "airtel_money" | "juspay"
  | "slice" | "jiomoney" | "pockets_icici" | "razorpay" | "cashfree" | "payu"
  | "bajaj_pay" | "navi" | "axis_pay" | "yono_sbi" | "imobile_pay" | "superapp"
  | "hdfc_bank" | "bharatpe" | "kotak_pay" | "bob_world" | "idfcfirst"
  | "yes_pay" | "fi_money" | "jupiter_money" | "groww_pay" | "indpay"
  | "canara_bank" | "union_bank" | "rbl_bank" | "pnb_one" | "indus_pay"
  | "bharatqr"
  | "alipay" | "wechat_pay"
  | "paypal" | "venmo" | "cash_app" | "zelle" | "stripe" | "square" | "apple_pay"
  | "grabpay" | "gopay" | "ovo" | "dana" | "linkaja" | "shopeepay"
  | "line_pay" | "truemoney" | "momo_vn" | "zalopay" | "vnpay" | "gcash"
  | "maya" | "paymaya" | "wave_myanmar" | "kpay_myanmar" | "true_wallet"
  | "kakaopay" | "toss" | "naverpay" | "payco" | "zeropay_kr"
  | "paypay_jp" | "merpay" | "rakuten_pay" | "d_payment" | "au_pay"
  | "origami_pay" | "line_pay_jp"
  | "paylah" | "duitnow" | "touchngo" | "boost_my" | "nets_sg"
  | "instapay_ph" | "pesonet"
  | "promptpay"
  | "pix" | "mercado_pago" | "picpay" | "pagbank" | "ame_digital"
  | "revolut" | "wise" | "twint" | "sepa_transfer" | "tikkie_nl"
  | "bizum_es" | "satispay_it" | "blik_pl" | "swish_se"
  | "mpesa" | "flutterwave" | "paystack" | "mtn_momo"
  | "stc_pay" | "benefitpay"
  | "bitcoin" | "ethereum" | "litecoin" | "monero" | "bitcoin_cash"
  | "solana" | "xrp" | "dogecoin" | "bnb" | "tron" | "usdt"
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
  bankHandle?: string;
  vpa?: string;
  coinType?: string;
  isEmv?: boolean;
  extraFields?: Record<string, string>;
}

export interface Evidence {
  type: "positive" | "negative" | "neutral" | "info";
  label: string;
  value: string;
}

export interface PaymentSafetyResult {
  isSuspicious: boolean;
  warnings: string[];
  riskLevel: "safe" | "caution" | "dangerous";
  appInfo?: string;
  evidence: Evidence[];
}

export interface UrlSafetyResult {
  isSuspicious: boolean;
  warnings: string[];
  riskLevel: "safe" | "caution" | "dangerous";
  evidence: Evidence[];
}

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
