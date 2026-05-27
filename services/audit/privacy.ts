import * as Crypto from "expo-crypto";

export function maskIpAddress(ip: string): string {
  if (!ip) return "unknown";
  if (ip.includes(".") && !ip.includes(":")) {
    const parts = ip.split(".");
    if (parts.length === 4) { parts[3] = "xxx"; return parts.join("."); }
  }
  if (ip.includes(":")) {
    const parts = ip.split(":");
    if (parts.length >= 4) return parts.slice(0, 2).join(":") + ":xxxx:xxxx:xxxx:xxxx";
  }
  return "masked";
}

export async function hashUserId(userId: string): Promise<string> {
  try {
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `audit_salt_2026_${userId}`,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
    return hash.substring(0, 16);
  } catch (error) {
    console.error("[audit] Failed to hash user ID:", error);
    return `hashed_${userId.substring(0, 8)}`;
  }
}

export function getDeviceInfo(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const expoConstants = require("expo-constants").default;
    const platform = expoConstants.platform?.os || "unknown";
    const osVersion = expoConstants.platform?.osVersion || "unknown";
    const appName = expoConstants.expoConfig?.name || "QRGuard";
    return `${appName}/${platform}-${osVersion}`;
  } catch {
    return "unknown-device";
  }
}
