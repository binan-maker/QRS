import AsyncStorage from "@react-native-async-storage/async-storage";

export const ANON_DAILY_SCAN_LIMIT  = 50;
export const ANON_CONVERSION_MILESTONES = new Set([3, 10, 25]);

export const ANON_CONVERSION_MESSAGES: Record<number, string> = {
  3:  "Sign up to save your scan history across devices.",
  10: "You've scanned 10 QR codes! Create a free account to keep your history.",
  25: "25 scans and counting — sign in to unlock all features.",
};

function anonTodayKey(): string {
  return `anon_daily_${new Date().toDateString()}`;
}

export async function consumeAnonScanSlot(): Promise<{
  allowed:    boolean;
  totalCount: number;
}> {
  try {
    const todayKey = anonTodayKey();
    const totalKey = "anon_total_scan_count";
    const [dailyRaw, totalRaw] = await Promise.all([
      AsyncStorage.getItem(todayKey),
      AsyncStorage.getItem(totalKey),
    ]);
    const daily = dailyRaw ? parseInt(dailyRaw, 10) : 0;
    if (daily >= ANON_DAILY_SCAN_LIMIT) {
      return { allowed: false, totalCount: totalRaw ? parseInt(totalRaw, 10) : 0 };
    }
    const newTotal = (totalRaw ? parseInt(totalRaw, 10) : 0) + 1;
    await Promise.all([
      AsyncStorage.setItem(todayKey, String(daily + 1)),
      AsyncStorage.setItem(totalKey, String(newTotal)),
    ]);
    return { allowed: true, totalCount: newTotal };
  } catch {
    return { allowed: true, totalCount: 0 };
  }
}
