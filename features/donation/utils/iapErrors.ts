/**
 * Maps every react-native-iap v15 ErrorCode (kebab-case) to a specific,
 * human-readable title + message so users always know EXACTLY why payment failed.
 * Pass `store` ("Google Play" | "App Store") for platform-appropriate wording.
 * Returns null for user-cancelled and success codes — no alert needed.
 */
export function getPaymentFailureDetails(
  error: any,
  store: "Google Play" | "App Store",
): { title: string; message: string } | null {
  // Normalise the code — v15 uses kebab-case (e.g. "network-error"),
  // but legacy E_* codes (e.g. "E_NETWORK_ERROR") may still appear from native.
  const raw: string = error?.code ?? error?.message ?? "";
  const code = raw
    .toLowerCase()
    .replace(/^e_/, "")       // strip leading E_
    .replace(/_/g, "-");      // snake_case → kebab-case

  switch (code) {
    // ── User actions (silent or informational) ──────────────────────────────
    case "user-cancelled":
    case "user-canceled":
      return null; // user deliberately cancelled — no alert needed

    case "deferred-payment":
      return {
        title:   "Awaiting Approval",
        message: "Your payment is pending parental or family approval. You will be charged once it is approved.",
      };

    case "pending":
      return {
        title:   "Payment Pending",
        message: `Your payment is being processed by ${store}. It may take a few minutes to complete.`,
      };

    // ── Network & connectivity ───────────────────────────────────────────────
    case "network-error":
    case "remote-error":
      return {
        title:   "No Internet Connection",
        message: "Your payment could not be sent because the device is offline. Please connect to the internet and try again.",
      };

    case "service-timeout":
      return {
        title:   `${store} Timed Out`,
        message: `The request to ${store} took too long. Please check your connection and try again.`,
      };

    // ── Store service issues ─────────────────────────────────────────────────
    case "service-error":
      return {
        title:   `${store} Service Error`,
        message: `${store} encountered an error. Please make sure the store app is up-to-date and try again.`,
      };

    case "service-disconnected":
    case "connection-closed":
      return {
        title:   `${store} Disconnected`,
        message: `The connection to ${store} was lost mid-payment. Your card was NOT charged. Please try again.`,
      };

    case "billing-unavailable":
      return {
        title:   "Billing Not Available",
        message: store === "App Store"
          ? "In-app purchases are not enabled on this device or Apple ID. This can happen if purchases are restricted in Screen Time settings, or if your account doesn't support billing in your country."
          : "In-app purchases are not enabled on this device or Google account. This can happen if your Play account doesn't support billing in your country, or if the device is managed/restricted.",
      };

    case "feature-not-supported":
      return {
        title:   "Not Supported on This Device",
        message: `Your device does not support in-app purchases via ${store}.`,
      };

    case "iap-not-available":
      return {
        title:   "In-App Purchases Unavailable",
        message: `${store} in-app purchases are not available right now. This may be a temporary outage — please try again later.`,
      };

    // ── Product / SKU issues ─────────────────────────────────────────────────
    case "item-unavailable":
    case "sku-not-found":
    case "empty-sku-list":
      return {
        title:   "Donation Not Available",
        message: "This donation tier is not currently available in the store. The app may need to be updated. Please try again after updating BinRo.",
      };

    case "sku-offer-mismatch":
      return {
        title:   "Product Mismatch",
        message: "There was a mismatch between the selected donation and the store offer. Please restart the app and try again.",
      };

    case "query-product":
      return {
        title:   "Could Not Load Products",
        message: `BinRo could not fetch donation options from ${store}. Please check your internet and try again.`,
      };

    // ── Ownership / duplicate issues ─────────────────────────────────────────
    case "already-owned":
      return {
        title:   "Already Purchased",
        message: `${store} shows this donation as already purchased but not yet consumed. Please restart the app — it will be automatically resolved.`,
      };

    case "item-not-owned":
      return {
        title:   "Purchase Not Found",
        message: `${store} could not find an active purchase to finish. If you were charged, please contact support@binro.app with your order ID.`,
      };

    case "duplicate-purchase":
      return {
        title:   "Duplicate Purchase Detected",
        message: "It looks like this purchase was already processed. Your previous donation went through — you have not been double-charged.",
      };

    // ── Transaction / verification issues ────────────────────────────────────
    case "transaction-validation-failed":
    case "purchase-verification-failed":
    case "receipt-failed":
      return {
        title:   "Verification Failed",
        message: `Your payment went through on ${store} but BinRo could not verify it. You have NOT been charged twice. Please contact support@binro.app with your order ID.`,
      };

    case "purchase-verification-finish-failed":
    case "receipt-finished-failed":
    case "not-ended":
      return {
        title:   "Could Not Confirm Donation",
        message: "Payment was received but the confirmation step failed. The donation is still recorded. If the issue persists, please contact support@binro.app.",
      };

    case "purchase-verification-finished":
    case "receipt-finished":
      return null; // this is actually success — no error alert needed

    // ── Initialisation issues ────────────────────────────────────────────────
    case "not-prepared":
    case "init-connection":
    case "already-prepared":
      return {
        title:   "Store Not Ready",
        message: store === "App Store"
          ? "BinRo could not connect to the App Store. Please make sure you are signed in to your Apple ID and have an active internet connection, then try again."
          : "BinRo could not connect to Google Play Store. Please make sure the Play Store app is installed and you are signed in to a Google account, then try again.",
      };

    // ── Interrupted / general errors ─────────────────────────────────────────
    case "interrupted":
      return {
        title:   "Purchase Interrupted",
        message: "The payment flow was interrupted (e.g. the app went to background). Your card was NOT charged. Please try again.",
      };

    case "developer-error":
    case "sync-error":
      return {
        title:   "App Configuration Error",
        message: "An internal error occurred in the payment setup. Please update BinRo to the latest version and try again.",
      };

    case "purchase-error":
    case "user-error":
      return {
        title:   "Purchase Failed",
        message: `${store} rejected the purchase. Please make sure your payment method is valid and try again.`,
      };

    // ── Unknown / fallback ───────────────────────────────────────────────────
    default: {
      const rawMsg: string = error?.message ?? "";
      if (rawMsg && !rawMsg.toLowerCase().includes("unknown")) {
        return {
          title:   "Payment Failed",
          message: `${rawMsg}\n\nIf you were charged, please contact support@binro.app with your order details.`,
        };
      }
      return {
        title:   "Payment Failed",
        message: `An unexpected error occurred with ${store}. Your card was not charged. Please try again or contact support@binro.app if the problem continues.`,
      };
    }
  }
}
