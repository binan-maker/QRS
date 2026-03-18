import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  subscribeToQrReports,
  reportQrCode,
  calculateTrustScore,
} from "@/lib/firestore-service";
import { invalidateQrCache } from "@/lib/cache/qr-cache";

export function useQrReports(id: string, userId: string | null, offlineMode: boolean) {
  const [reportCounts, setReportCounts] = useState<Record<string, number>>({});
  const [trustScore, setTrustScore] = useState<any>(null);
  const [userReport, setUserReport] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState<string | null>(null);

  useEffect(() => {
    if (offlineMode) return;
    const unsub = subscribeToQrReports(id, (counts) => {
      setReportCounts(counts);
      setTrustScore(calculateTrustScore(counts));
    });
    return unsub;
  }, [id, offlineMode]);

  async function handleReport(type: string) {
    if (!userId) { router.push("/(auth)/login"); return; }
    setReportLoading(type);
    try {
      await reportQrCode(id, userId, type);
      setUserReport(type);
      invalidateQrCache(id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setReportLoading(null);
    }
  }

  return { reportCounts, trustScore, userReport, setUserReport, setTrustScore, reportLoading, handleReport };
}
