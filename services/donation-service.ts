// ─── Donation Service ─────────────────────────────────────────────────────────
// Manages Razorpay donation orders and donation history queries.
// No Firebase SDK is imported here — all persistence uses the db adapter.
// To switch backends, edit lib/db/index.ts only.

import { db } from "@/lib/db";
import { API_BASE_URL } from "@/config/api";

const BASE_URL = API_BASE_URL;

export interface DonationRecord {
  id: string;
  orderId: string;
  paymentId: string;
  amount: number;
  currency: string;
  donorName: string;
  donorEmail: string;
  userId: string | null;
  status: string;
  paidAt: any;
}

export async function createDonationOrder(params: {
  amount: number;
  donorName: string;
  donorEmail: string;
  userId?: string;
}) {
  const res = await fetch(`${BASE_URL}/api/donation/create-order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to create order");
  }
  return res.json() as Promise<{
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
  }>;
}

export function buildCheckoutUrl(params: {
  orderId: string;
  amount: number;
  currency: string;
  name: string;
  email: string;
  userId: string;
  contact?: string;
}): string {
  const p = new URLSearchParams({
    orderId: params.orderId,
    amount: String(params.amount),
    currency: params.currency,
    name: params.name,
    email: params.email,
    userId: params.userId,
    contact: params.contact || "",
  });
  return `${BASE_URL}/api/donation/checkout?${p.toString()}`;
}

export async function fetchMyDonations(userId: string): Promise<DonationRecord[]> {
  try {
    const result = await db.query(["donations"], {
      where: [{ field: "userId", op: "==", value: userId }],
      orderBy: { field: "paidAt", direction: "desc" },
      limit: 20,
    });
    return result.docs.map((d) => ({ id: d.id, ...d.data } as DonationRecord));
  } catch {
    return [];
  }
}
