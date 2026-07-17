import { Router, type Request, type Response } from "express";
import crypto from "crypto";
import { admin, getAdminDb } from "../lib/firebase-admin";

export const paymentsRouter = Router();

let razorpay: any = null;

async function getRazorpay() {
  if (razorpay) return razorpay;
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  const Razorpay = (await import("razorpay")).default;
  razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return razorpay;
}

// POST /api/v1/donation/create-order
paymentsRouter.post("/create-order", async (req: Request, res: Response) => {
  try {
    const rzp = await getRazorpay();
    if (!rzp) return res.status(503).json({ error: "Payment service not configured" });

    const { amount, currency = "INR", donorName, donorEmail, userId } = req.body;
    if (!amount || typeof amount !== "number" || amount < 1) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const order = await rzp.orders.create({
      amount: amount * 100,
      currency,
      receipt: `donation_${Date.now()}`,
      notes: {
        donorName: donorName || "Anonymous",
        donorEmail: donorEmail || "",
        userId: userId || "",
        type: "charity",
      },
    });

    return res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err: any) {
    console.error("[v1/donation] create-order error:", err);
    return res.status(500).json({ error: "Failed to create order" });
  }
});

// POST /api/v1/donation/verify
paymentsRouter.post("/verify", async (req: Request, res: Response) => {
  try {
    const {
      razorpay_order_id, razorpay_payment_id, razorpay_signature,
      amount, currency, donorName, donorEmail, userId,
    } = req.body;

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) return res.status(503).json({ error: "Service not configured" });

    const expected = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return res.status(400).json({ error: "Payment verification failed" });
    }

    const db = getAdminDb();
    if (db) {
      await db.collection("donations").add({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        amount: amount / 100,
        currency: currency || "INR",
        donorName: donorName || "Anonymous",
        donorEmail: donorEmail || "",
        userId: userId || null,
        status: "success",
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return res.json({ success: true, paymentId: razorpay_payment_id });
  } catch (err: any) {
    console.error("[v1/donation] verify error:", err);
    return res.status(500).json({ error: "Verification failed" });
  }
});
