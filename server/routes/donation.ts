import type { Request, Response, Express } from "express";
import crypto from "crypto";
import * as admin from "firebase-admin";

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

function getFirestoreAdmin(): admin.firestore.Firestore | null {
  try {
    if (!admin.apps.length) {
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      if (!serviceAccount) return null;
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(serviceAccount)),
      });
    }
    return admin.firestore();
  } catch {
    return null;
  }
}

export function registerDonationRoutes(app: Express) {
  app.post("/api/donation/create-order", async (req: Request, res: Response) => {
    try {
      const rzp = await getRazorpay();
      if (!rzp) {
        return res.status(503).json({ error: "Payment service not configured" });
      }

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
      console.error("[Donation] create-order error:", err);
      return res.status(500).json({ error: "Failed to create order" });
    }
  });

  app.post("/api/donation/verify", async (req: Request, res: Response) => {
    try {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        amount,
        currency,
        donorName,
        donorEmail,
        userId,
      } = req.body;

      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keySecret) return res.status(503).json({ error: "Service not configured" });

      const expectedSig = crypto
        .createHmac("sha256", keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (expectedSig !== razorpay_signature) {
        return res.status(400).json({ error: "Payment verification failed" });
      }

      const db = getFirestoreAdmin();
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
      console.error("[Donation] verify error:", err);
      return res.status(500).json({ error: "Verification failed" });
    }
  });

  app.get("/api/donation/checkout", (req: Request, res: Response) => {
    const { orderId, amount, currency, name, email, userId, contact } = req.query as Record<string, string>;
    const keyId = process.env.RAZORPAY_KEY_ID || "";

    const forwardedProto = req.header("x-forwarded-proto") || req.protocol || "https";
    const forwardedHost = req.header("x-forwarded-host") || req.get("host") || "";
    const baseUrl = `${forwardedProto}://${forwardedHost}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>QR Guard – Charity Donation</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 24px;
      padding: 40px 32px;
      max-width: 420px;
      width: 100%;
      text-align: center;
      backdrop-filter: blur(20px);
    }
    .heart { font-size: 48px; margin-bottom: 16px; }
    h1 { color: #fff; font-size: 22px; margin-bottom: 8px; }
    .subtitle { color: rgba(255,255,255,0.6); font-size: 14px; margin-bottom: 32px; }
    .amount-pill {
      display: inline-block;
      background: linear-gradient(135deg, #6c63ff, #a855f7);
      color: #fff;
      font-size: 28px;
      font-weight: 700;
      padding: 12px 32px;
      border-radius: 100px;
      margin-bottom: 32px;
    }
    .pay-btn {
      width: 100%;
      background: linear-gradient(135deg, #6c63ff, #a855f7);
      color: #fff;
      border: none;
      border-radius: 16px;
      padding: 16px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    .pay-btn:hover { opacity: 0.9; }
    .pay-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .secure { color: rgba(255,255,255,0.4); font-size: 12px; margin-top: 16px; }
    .success { display: none; }
    .success .icon { font-size: 64px; margin-bottom: 16px; }
    .success h2 { color: #4ade80; font-size: 22px; margin-bottom: 8px; }
    .success p { color: rgba(255,255,255,0.6); font-size: 14px; margin-bottom: 24px; }
    .close-btn {
      display: inline-block;
      background: rgba(255,255,255,0.1);
      color: #fff;
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 12px;
      padding: 12px 24px;
      font-size: 14px;
      cursor: pointer;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="card" id="payCard">
    <div class="heart">💜</div>
    <h1>Support QR Guard</h1>
    <p class="subtitle">Your donation helps keep this app free and safe for everyone.</p>
    <div class="amount-pill">₹${Math.round(Number(amount) / 100)}</div>
    <button class="pay-btn" id="payBtn" onclick="startPayment()">Donate Now</button>
    <p class="secure">🔒 Secured by Razorpay</p>
  </div>
  <div class="card success" id="successCard">
    <div class="icon">🎉</div>
    <h2>Thank You!</h2>
    <p>Your donation of ₹${Math.round(Number(amount) / 100)} was received successfully.<br/>You are a true guardian! 💜</p>
    <a href="javascript:window.close()" class="close-btn">Close & Return to App</a>
  </div>

  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <script>
    function startPayment() {
      document.getElementById('payBtn').disabled = true;
      document.getElementById('payBtn').textContent = 'Opening payment…';

      const options = {
        key: "${keyId}",
        amount: "${amount}",
        currency: "${currency || "INR"}",
        name: "QR Guard",
        description: "Charity Donation",
        image: "",
        order_id: "${orderId}",
        prefill: {
          name: "${name || ""}",
          email: "${email || ""}",
          contact: "${contact || ""}",
        },
        theme: { color: "#6c63ff" },
        handler: function(response) {
          verifyAndSave(response);
        },
        modal: {
          ondismiss: function() {
            document.getElementById('payBtn').disabled = false;
            document.getElementById('payBtn').textContent = 'Donate Now';
          }
        }
      };

      const rzp = new Razorpay(options);
      rzp.open();
    }

    async function verifyAndSave(response) {
      try {
        const res = await fetch('${baseUrl}/api/donation/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            amount: ${amount},
            currency: '${currency || "INR"}',
            donorName: '${name || "Anonymous"}',
            donorEmail: '${email || ""}',
            userId: '${userId || ""}',
          }),
        });
        const data = await res.json();
        if (data.success) {
          document.getElementById('payCard').style.display = 'none';
          document.getElementById('successCard').style.display = 'block';
        } else {
          alert('Payment verification failed. Please contact support.');
          document.getElementById('payBtn').disabled = false;
          document.getElementById('payBtn').textContent = 'Donate Now';
        }
      } catch(e) {
        document.getElementById('payCard').style.display = 'none';
        document.getElementById('successCard').style.display = 'block';
      }
    }
  </script>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  });
}
