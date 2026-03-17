import * as Crypto from "expo-crypto";

const _QRG_SIGNATURE_SALT = "QRG_MINT_VERIFIED_2024_PROPRIETARY";

export async function verifyQrSignature(
  content: string,
  ownerId: string,
  storedSignature: string
): Promise<boolean> {
  try {
    const rawSig = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      content + "|" + ownerId + "|" + _QRG_SIGNATURE_SALT
    );
    const expected = rawSig.slice(0, 32);
    return expected === storedSignature;
  } catch {
    return false;
  }
}
