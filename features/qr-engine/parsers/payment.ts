/**
 * QR Engine — Payment Parser Orchestrator
 *
 * Main entry point for payment QR parsing.
 * Re-exports all payment parsing functions from the payment module.
 */

export { isPaymentQr, parseAnyPaymentQr } from "./payment/parsers";
export type { ParsedPaymentQr } from "@/services/analysis/types";
export type { AppDef } from "./payment/registry";
