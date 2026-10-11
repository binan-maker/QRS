import { useRef, useMemo } from "react";
import { useAuth } from "@/shared/contexts/AuthContext";
import { useQrData } from "./useQrData";
import { useQrReports } from "./useQrReports";
import { useQrComments } from "./useQrComments";
import { calculateTrustScore, type TrustScore } from "@/services/trust/trust-service";

export function useQrDetail(
  id: string,
  hint?: { content: string; contentType?: string }
) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const emailVerified = user?.emailVerified ?? false;

  const scrollRef = useRef<any>(null);

  const qrData = useQrData(id, hint);

  const qrMeta = useMemo(() => {
    if (!qrData.qrCode) return undefined;
    return {
      content: qrData.qrCode.content,
      contentType: qrData.qrCode.contentType,
    };
  }, [qrData.qrCode]);

  const reports = useQrReports(
    id,
    userId,
    qrData.offlineMode,
    emailVerified,
    qrMeta
  );

  const comments = useQrComments(
    id,
    userId,
    qrData.offlineMode
  );

  const trustInfo: TrustScore = useMemo(() => {
    if (reports.trustScore && reports.trustScore.score >= 0) {
      return reports.trustScore;
    }
    return calculateTrustScore(reports.reportCounts);
  }, [reports.trustScore, reports.reportCounts]);

  const totalComments = qrData.qrCode?.commentCount ?? comments.commentsList.length;

  return {
    ...qrData,
    ...reports,
    ...comments,
    totalComments,
    trustInfo,
    scrollRef,
  };
}
