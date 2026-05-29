/**
 * QR Engine — Parsers
 *
 * Central re-export of all content-type parsers AND payment parsers.
 * Import parsers from here, not from qr-detail internals or services directly.
 */
<<<<<<< HEAD
export * from "../content-cards/parsers";
export { isPaymentQr, parseAnyPaymentQr } from "@/services/analysis/payment-parser";
export type { ParsedPaymentQr } from "@/services/analysis";
=======
export * from "@/features/qr-detail/content-cards/parsers";
export * from "./payment";
export type { ParsedPaymentQr } from "./payment";
>>>>>>> 6f32e331e15e61c01cb573e67a2efff7f05f87c9
