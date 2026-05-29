/**
 * QR Engine — Parsers
 *
 * Central re-export of all content-type parsers AND payment parsers.
 * Import parsers from here, not from qr-detail internals or services directly.
 */
export * from "../content-cards/parsers";
export { isPaymentQr, parseAnyPaymentQr } from "@/services/analysis/payment-parser";
export type { ParsedPaymentQr } from "@/services/analysis";
