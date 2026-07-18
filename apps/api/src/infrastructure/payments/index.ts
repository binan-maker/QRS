/**
 * @infrastructure/payments — Razorpay adapter
 *
 * Used for donation processing.
 * Phase 6 decision: evaluate Razorpay vs Stripe for long-term.
 */

export interface CreateOrderInput {
  amountPaise: number;      // amount in paise (₹1 = 100 paise)
  currency?: string;        // default: INR
  receiptId: string;
}

export interface PaymentOrder {
  id: string;               // Razorpay order ID
  amountPaise: number;
  currency: string;
  status: string;
}

export interface IPaymentsProvider {
  createOrder(input: CreateOrderInput): Promise<PaymentOrder>;
  verifyWebhookSignature(payload: string, signature: string): boolean;
}

// Placeholder — RazorpayProvider implemented in Phase 3.
export {};
