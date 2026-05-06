import { firestore, firebaseAuth } from "@/lib/firebase";
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from "firebase/firestore";

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

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
  paidAt: Timestamp | null;
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
  return res.json() as Promise<{ orderId: string; amount: number; currency: string; keyId: string }>;
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
    const q = query(
      collection(firestore, "donations"),
      where("userId", "==", userId),
      orderBy("paidAt", "desc"),
      limit(20)
    );
    const snap = await getDocs(q);
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as DonationRecord));
  } catch {
    return [];
  }
}
