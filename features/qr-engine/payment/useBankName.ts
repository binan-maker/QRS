import { useState, useEffect, useRef } from "react";
import { getBankFullName } from "./utils";
import { resolveIFSCBankName } from "@/features/qr-engine/parsers/payment/bank-account";

const memCache = new Map<string, string>();

async function fetchBankNameFromIfsc(ifsc: string): Promise<string> {
  if (memCache.has(ifsc)) return memCache.get(ifsc)!;
  try {
    const raw = process.env.EXPO_PUBLIC_DOMAIN;
    const baseUrl = raw ? `https://${raw.split(":")[0]}` : "";
    const res = await fetch(`${baseUrl}/api/v1/ifsc/${ifsc}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
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
    let mounted = true;
    fetchBankNameFromIfsc(ifsc).then((name) => {
      if (mounted && name) setApiBankName(name);
    });
    return () => { mounted = false; };
  }, [ifsc, handleName, localIfscName]);

  return handleName || localIfscName || apiBankName || null;
}
