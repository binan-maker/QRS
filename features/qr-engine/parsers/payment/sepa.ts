import type { ParsedPaymentQr } from "@/services/analysis/types";

export function parseSepaQr(content: string): ParsedPaymentQr {
  const lines = content.split(/\r?\n/);
  const iban = lines[6] || "", name = lines[5] || "";
  const amount = lines[7] ? lines[7].replace(/[^0-9.]/g, "") : undefined;
  return {
    app: "sepa_transfer", appDisplayName: "SEPA Credit Transfer", appCategory: "europe", region: "Europe",
    recipientId: iban, recipientName: name, amount, currency: "EUR",
    note: lines[9] || undefined, rawContent: content, isAmountPreFilled: !!amount,
  };
}
