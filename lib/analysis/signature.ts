import * as Crypto from "expo-crypto";
import { getSignatureSalt } from "@/lib/services/types";

export async function verifyQrSignature(
  content: string,
  ownerId: string,
  storedSignature: string
): Promise<boolean> {
  const currentYear = new Date().getFullYear();
  const yearsToTry = Array.from({ length: 6 }, (_, i) => currentYear - i);

  for (const year of yearsToTry) {
    try {
      const salt = getSignatureSalt(year);
      const rawSig = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        content + "|" + ownerId + "|" + salt
      );
      if (rawSig.slice(0, 32) === storedSignature) return true;
    } catch {}
  }
  return false;
}
