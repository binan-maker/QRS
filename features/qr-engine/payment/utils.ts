export function formatAmount(amount: string, currency?: string): string {
  const num = parseFloat(amount);
  if (isNaN(num)) return amount;
  if (!currency || currency === "INR") {
    return `₹${num.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  }
  if (currency === "USD") return `$${num.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  if (currency === "EUR") return `€${num.toLocaleString("de-DE", { maximumFractionDigits: 2 })}`;
  return `${num} ${currency}`;
}

export function getBankFullName(handle?: string): string | null {
  if (!handle) return null;
  const map: Record<string, string> = {
    "oksbi": "State Bank of India", "okaxis": "Axis Bank", "okhdfcbank": "HDFC Bank",
    "okicici": "ICICI Bank", "ybl": "Yes Bank (PhonePe)", "ibl": "IndusInd Bank",
    "paytm": "Paytm Payments Bank", "axl": "Axis Bank", "hdfcbank": "HDFC Bank",
    "icici": "ICICI Bank", "sbi": "State Bank of India", "kotak": "Kotak Mahindra Bank",
    "pnb": "Punjab National Bank", "bob": "Bank of Baroda", "cnrb": "Canara Bank",
    "federal": "Federal Bank", "idbi": "IDBI Bank", "rbl": "RBL Bank",
    "indus": "IndusInd Bank", "airtel": "Airtel Payments Bank", "jio": "Jio Payments Bank",
    "barodampay": "Bank of Baroda", "mahb": "Bank of Maharashtra",
    "centralbank": "Central Bank of India", "uco": "UCO Bank", "idfcbank": "IDFC First Bank",
    "aubank": "AU Small Finance Bank", "fbl": "Federal Bank", "superyes": "Yes Bank",
    "abfspay": "Aditya Birla Finance", "sliceaxis": "Slice (Axis Bank)",
    "naviaxis": "Navi (Axis Bank)", "timecosmos": "Fino Payments Bank",
    "postbank": "India Post Payments Bank", "kmbl": "Kotak Mahindra Bank",
    "idfcfirst": "IDFC FIRST Bank", "payzapp": "HDFC Bank (PayZapp)",
    "hdfcbankjd": "HDFC Bank", "icicibank": "ICICI Bank", "tapicici": "ICICI Bank",
    "yesbank": "Yes Bank", "yesbankltd": "Yes Bank",
    "groww": "Groww (IDFC FIRST Bank)", "navi": "Navi (Equitas SFB)",
    "freecharge": "FreeCharge (Axis Bank)", "mobikwik": "MobiKwik",
    "cred": "CRED (Federal Bank)", "amazonpay": "Amazon Pay (Axis Bank)",
    "apl": "Amazon Pay ICICI", "juspay": "JusPay",
    "razorpay": "Razorpay (RBL Bank)", "bajajpay": "Bajaj Finance",
    "airtelpe": "Airtel Payments Bank", "bhim": "BHIM (NPCI)", "uboi": "Union Bank of India",
    "ucobank": "UCO Bank", "jupiterpay": "Jupiter Money (Federal Bank)", "upi": "NPCI UPI Network",
  };
  const lower = handle.toLowerCase();
  return map[lower] ?? null;
}

export function addSoftHyphens(text: string): string {
  return text.replace(/@/g, "\u00AD@\u00AD");
}
