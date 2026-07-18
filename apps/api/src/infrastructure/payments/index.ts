/**
 * @infrastructure/payments — Razorpay adapter implementation
 *
 * Implements IPaymentsProvider using the Razorpay Node SDK.
 * The application layer depends only on the interface — the SDK is never
 * imported outside this file.
 */

import crypto from "crypto";

// ─── Interface ────────────────────────────────────────────────────────────────

export interface CreateOrderInput {
  /** Amount in paise (₹1 = 100 paise). */
  amountPaise: number;
  currency?: string;
  receiptId: string;
  notes?: Record<string, string>;
}

export interface PaymentOrder {
  id: string;
  amountPaise: number;
  currency: string;
  status: string;
}

export interface IPaymentsProvider {
  createOrder(input: CreateOrderInput): Promise<PaymentOrder>;
  verifyWebhookSignature(payload: string, signature: string): boolean;
}

// ─── RazorpayPaymentsProvider ─────────────────────────────────────────────────

export class RazorpayPaymentsProvider implements IPaymentsProvider {
  private _client: any = null;
  private readonly keyId: string;
  private readonly keySecret: string;

  constructor() {
    this.keyId     = process.env.RAZORPAY_KEY_ID     ?? "";
    this.keySecret = process.env.RAZORPAY_KEY_SECRET ?? "";
  }

  private async getClient(): Promise<any> {
    if (this._client) return this._client;
    if (!this.keyId || !this.keySecret) return null;
    const Razorpay = ((await import("razorpay")) as any).default;
    this._client = new Razorpay({ key_id: this.keyId, key_secret: this.keySecret });
    return this._client;
  }

  async createOrder(input: CreateOrderInput): Promise<PaymentOrder> {
    const rzp = await this.getClient();
    if (!rzp) throw new Error("Razorpay credentials not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET)");

    const order = await rzp.orders.create({
      amount:   input.amountPaise,
      currency: input.currency ?? "INR",
      receipt:  input.receiptId,
      notes:    input.notes ?? {},
    });

    return {
      id:          order.id,
      amountPaise: order.amount,
      currency:    order.currency,
      status:      order.status,
    };
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.keySecret) return false;
    const expected = crypto
      .createHmac("sha256", this.keySecret)
      .update(payload)
      .digest("hex");
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _instance: RazorpayPaymentsProvider | null = null;

export function getPaymentsProvider(): RazorpayPaymentsProvider {
  if (!_instance) _instance = new RazorpayPaymentsProvider();
  return _instance;
}
