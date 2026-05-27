import type { ParsedPaymentQr } from "../types";

export function parseBbpsQr(content: string, lower: string): ParsedPaymentQr | null {
  const isBbps = lower.startsWith("bbps://") || lower.startsWith("https://bbps.") ||
    lower.includes("bbpsonline.com") || lower.includes("billpayment.npci") ||
    (lower.includes("billerid=") && (lower.includes("bbps") || lower.includes("biller")));
  if (!isBbps) return null;
  let billerId = "", amount: string | undefined, customerParam = "", category = "", note: string | undefined;
  try {
    const url = new URL(content.startsWith("bbps://") ? `https://${content.slice(7)}` : content);
    billerId = url.searchParams.get("billerId") || url.searchParams.get("biller_id") || "";
    amount = url.searchParams.get("amount") || url.searchParams.get("am") || undefined;
    customerParam = url.searchParams.get("customerParam") || url.searchParams.get("customerId") || "";
    category = url.searchParams.get("category") || url.pathname.split("/")[1] || "";
    note = url.searchParams.get("remarks") || url.searchParams.get("note") || undefined;
  } catch {
    const billerMatch = content.match(/billerid=([^&\s]+)/i);
    if (billerMatch) billerId = billerMatch[1];
    const amMatch = content.match(/amount=([^&\s]+)/i);
    if (amMatch) amount = amMatch[1];
    const custMatch = content.match(/customerparam=([^&\s]+)/i);
    if (custMatch) customerParam = custMatch[1];
  }
  const categoryLabel = category ? category.charAt(0).toUpperCase() + category.slice(1).toLowerCase() : "Bill";
  return {
    app: "upi", appDisplayName: `BBPS ${categoryLabel} Payment`, appCategory: "upi_india", region: "India",
    recipientId: billerId || customerParam || "BBPS", recipientName: billerId || undefined,
    amount, currency: "INR", note: note || (customerParam ? `Customer: ${customerParam}` : undefined),
    rawContent: content, isAmountPreFilled: !!(amount && parseFloat(amount) > 0),
    extraFields: { ...(billerId && { billerId }), ...(customerParam && { customerParam }), ...(category && { category }) },
  };
}
