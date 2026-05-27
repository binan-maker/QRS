import AsyncStorage from "@react-native-async-storage/async-storage";

export interface ConsentStatus {
  camera: boolean;
  gallery: boolean;
  scanHistory: boolean;
  notifications: boolean;
  analytics: boolean;
  marketing: boolean;
  ageVerified: boolean;
  termsAccepted: boolean;
  privacyPolicyAccepted: boolean;
  lastUpdated?: string;
}

export const DEFAULT_CONSENT: ConsentStatus = {
  camera: false,
  gallery: false,
  scanHistory: false,
  notifications: false,
  analytics: false,
  marketing: false,
  ageVerified: false,
  termsAccepted: false,
  privacyPolicyAccepted: false,
};

export const db = {
  async get(path: string[]): Promise<any> {
    try {
      const raw = await AsyncStorage.getItem(path.join("/"));
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  async set(path: string[], value: unknown): Promise<void> {
    try {
      await AsyncStorage.setItem(path.join("/"), JSON.stringify(value));
    } catch {}
  },
};

export async function logAuditEvent(event: string, userId: string, meta?: object): Promise<void> {
  try {
    const entry = { event, userId, ts: new Date().toISOString(), ...meta };
    const key = `audit_${userId}`;
    const raw = await AsyncStorage.getItem(key);
    const log: object[] = raw ? JSON.parse(raw) : [];
    log.push(entry);
    await AsyncStorage.setItem(key, JSON.stringify(log.slice(-200)));
  } catch {}
}
