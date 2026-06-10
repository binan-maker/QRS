import { useState, useEffect, useRef } from "react";
import { getBankFullName } from "./utils";
import { resolveIFSCBankName } from "@/features/qr-engine/parsers/payment/bank-account";

const memCache = new Map<string, string>();

async function fetchBankNameFromIfsc(ifsc: string): Promise<string> {
  if (memCache.has(ifsc)) return memCache.get(ifsc)!;
  try {
    const baseUrl = process.env.EXPO_PUBLIC_DOMAIN
      ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
      : "";
    const res = await fetch(`${baseUrl}/api/v1/ifsc/${ifsc}`, {
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const data = await res.json() as { bank?: string };
      const name = data.bank || "";
      memCache.set(ifsc, name);
      return name;
    }
  } catch {}
  return "";
}

export function useBankName(
  bankHandle: string | undefined,
  ifsc: string | undefined
): string | null {
  const handleName = getBankFullName(bankHandle);
  const localIfscName = ifsc ? resolveIFSCBankName(ifsc) : "";

  const [apiBankName, setApiBankName] = useState<string | null>(null);
  const fetchedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!ifsc) return;
    if (handleName || localIfscName) return;
    if (fetchedRef.current === ifsc) return;
    fetchedRef.current = ifsc;
    fetchBankNameFromIfsc(ifsc).then((name) => {
      if (name) setApiBankName(name);
    });
  }, [ifsc, handleName, localIfscName]);

  return handleName || localIfscName || apiBankName || null;
}
