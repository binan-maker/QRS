// ── Donation ──────────────────────────────────────────────────────────────────

export type DonationStatus =
  | "pending"
  | "captured"
  | "failed"
  | "refunded";

export interface Donation {
  id: string;
  userId: string;
  /** Amount in the smallest currency unit (paise for INR). */
  amountPaise: number;
  currency: string;
  status: DonationStatus;
  /** Razorpay order ID. */
  orderId: string;
  /** Razorpay payment ID; set once payment is captured. */
  paymentId: string | null;
  createdAt: number;
  updatedAt: number;
}
