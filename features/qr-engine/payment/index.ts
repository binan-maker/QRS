/**
 * QR ENGINE — Payment module public API
 *
 * All payment card UI and brand logic lives here.
 * Import through "@/features/qr-engine" for the full engine API,
 * or from this path when you only need payment-specific exports.
 */
export { default as PaymentCard } from "./PaymentCard";
export { default as PaymentCardFace } from "./PaymentCardFace";
export { default as PaymentCardActions } from "./PaymentCardActions";
export { getAppBrand } from "./brand-data";
export type { AppBrand } from "./brand-data";
export { getBankFullName, formatAmount, addSoftHyphens } from "./utils";
