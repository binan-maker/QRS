import type { QrSchema } from "../types";

export const upiSchema: QrSchema = {
  key: "upi",
  label: "UPI Payment",
  icon: "card-outline",
  category: "payment",
  description: "Accept UPI payments — works with PhonePe, GPay, Paytm, and all UPI apps",
  primaryField: {
    key: "vpa",
    label: "UPI ID (VPA)",
    placeholder: "name@paytm",
    type: "email",
    required: true,
    hint: "Your UPI Virtual Payment Address (e.g. 9876543210@upi)",
  },
  extraFields: [
    {
      key: "name",
      label: "Payee / Business Name",
      placeholder: "My Store",
      type: "text",
      optional: true,
    },
    {
      key: "amount",
      label: "Amount (₹)",
      placeholder: "100.00",
      type: "currency",
      optional: true,
      hint: "Leave blank to let payer enter any amount",
    },
    {
      key: "note",
      label: "Transaction Note",
      placeholder: "Payment for services",
      type: "text",
      optional: true,
    },
  ],
  build: (v, extra) => {
    const name = extra.name?.trim() ?? "";
    const amount = extra.amount?.trim() ?? "";
    const note = extra.note?.trim() ?? "";
    let url = `upi://pay?pa=${encodeURIComponent(v)}&cu=INR`;
    if (name) url += `&pn=${encodeURIComponent(name)}`;
    if (amount) url += `&am=${amount}`;
    if (note) url += `&tn=${encodeURIComponent(note)}`;
    return url;
  },
  validate: (v) => {
    if (!v.trim()) return "Please enter a UPI ID.";
    if (!/^[\w.\-+]+@[\w]+$/.test(v.trim()))
      return "Invalid UPI ID. Format: name@bank (e.g. user@paytm)";
    return null;
  },
  trustRules: ["verified_merchant"],
};
