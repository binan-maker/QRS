import type { QrSchema } from "../types";

export const cryptoSchema: QrSchema = {
  key: "crypto",
  label: "Crypto Wallet",
  icon: "logo-bitcoin",
  category: "crypto",
  description: "Share a crypto wallet address for payments",
  primaryField: {
    key: "address",
    label: "Wallet Address",
    placeholder: "1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf...",
    type: "text",
    required: true,
  },
  extraFields: [
    {
      key: "coin",
      label: "Cryptocurrency",
      placeholder: "bitcoin",
      type: "select",
      options: [
        { label: "Bitcoin (BTC)", value: "bitcoin" },
        { label: "Ethereum (ETH)", value: "ethereum" },
        { label: "Litecoin (LTC)", value: "litecoin" },
        { label: "Monero (XMR)", value: "monero" },
        { label: "Dogecoin (DOGE)", value: "dogecoin" },
        { label: "Solana (SOL)", value: "solana" },
      ],
    },
    {
      key: "amount",
      label: "Amount (optional)",
      placeholder: "0.001",
      type: "number",
      optional: true,
    },
    {
      key: "label",
      label: "Label (optional)",
      placeholder: "Donation",
      type: "text",
      optional: true,
    },
  ],
  build: (v, extra) => {
    const coin = extra.coin?.trim() || "bitcoin";
    const amount = extra.amount?.trim() ?? "";
    const label = extra.label?.trim() ?? "";
    let uri = `${coin}:${v}`;
    const params: string[] = [];
    if (amount) params.push(`amount=${amount}`);
    if (label) params.push(`label=${encodeURIComponent(label)}`);
    if (params.length) uri += `?${params.join("&")}`;
    return uri;
  },
  validate: (v) => {
    if (!v.trim()) return "Please enter a wallet address.";
    if (v.trim().length < 10) return "Wallet address appears too short.";
    return null;
  },
};
