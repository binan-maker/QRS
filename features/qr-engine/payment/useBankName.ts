import { useState, useEffect, useRef } from "react";
import { getBankFullName } from "./utils";
import { resolveIFSCBankName } from "@/features/qr-engine/parsers/payment/bank-account";
import { API_BASE_URL } from "@/config/api";
import { RTDB_TIMEOUT_MS } from "@/config/app";

const memCache = new Map<string, string>();

async function fetchBankNameFromIfsc(ifsc: string): Promise<string> {
  if (memCache.has(ifsc)) return memCache.get(ifsc)!;
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/ifsc/${ifsc}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(RTDB_TIMEOUT_MS),
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
