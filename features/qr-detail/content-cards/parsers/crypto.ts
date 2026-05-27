export interface CryptoData { coin: string; address: string; amount: string; }

export function parseCrypto(content: string): CryptoData {
  const m = content.match(/^(bitcoin|ethereum|litecoin|solana):([^?]+)(\?(.*))?$/i);
  if (m) {
    const coin = m[1].charAt(0).toUpperCase() + m[1].slice(1);
    const address = m[2].trim();
    const amount = new URLSearchParams(m[4] || "").get("amount") || "";
    return { coin, address, amount };
  }
  return { coin: "", address: content, amount: "" };
}
