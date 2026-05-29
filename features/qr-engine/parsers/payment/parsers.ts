import type { ParsedPaymentQr } from "@/services/analysis/types";
import { PAYMENT_APP_REGISTRY } from "./registry";
import { parseEmvQr } from "./emv";
import { parseBbpsQr } from "./bbps";
import { parseSepaQr } from "./sepa";
import { parseIndianBankAccountQr } from "./bank-account";
import { buildParsedPayment, detectUniversalPayment } from "./generic-parsers";

export { isPaymentQr, parseAnyPaymentQr };
export type { ParsedPaymentQr };

function isPaymentQr(content: string): boolean {
  return parseAnyPaymentQr(content) !== null;
}

function parseAnyPaymentQr(content: string): ParsedPaymentQr | null {
  if (!content) return null;
  const lower = content.toLowerCase().trim();

  for (const app of PAYMENT_APP_REGISTRY) {
    for (const scheme of app.schemes) {
      if (lower.startsWith(scheme.toLowerCase())) return buildParsedPayment(app, content, lower);
    }
    for (const pattern of app.urlPatterns) {
      if (lower.includes(pattern.toLowerCase())) return buildParsedPayment(app, content, lower);
    }
  }

  if (lower.startsWith("000201")) return parseEmvQr(content);

  const bbpsParsed = parseBbpsQr(content, lower);
  if (bbpsParsed) return bbpsParsed;

  const bankAccountParsed = parseIndianBankAccountQr(content, lower);
  if (bankAccountParsed) return bankAccountParsed;

  if (content.startsWith("BCD\n") || content.startsWith("BCD\r\n")) return parseSepaQr(content);

  if (lower.includes("br.gov.bcb.pix")) {
    return buildParsedPayment(PAYMENT_APP_REGISTRY.find((a) => a.id === "pix")!, content, lower);
  }

  return detectUniversalPayment(content, lower);
}
