import { useState, useEffect } from "react";
import {
  getPublicProfile,
  getPublicQrCodes,
  type PublicProfile,
} from "@/lib/services/user-service";

export type { PublicProfile };

export interface PublicQrCode {
  id: string;
  content: string;
  contentType: string;
  isBranded?: boolean;
  businessName?: string;
  qrType?: string;
  scanCount?: number;
  createdAt?: string;
}

export function usePublicProfile(username: string) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [qrCodes, setQrCodes] = useState<PublicQrCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    setNotFound(false);
    setProfile(null);
    setQrCodes([]);

    getPublicProfile(username)
      .then((p) => {
        if (!p) {
          setNotFound(true);
        } else {
          setProfile(p);
          if (p.privacy.showQrCodes) {
            setQrLoading(true);
            getPublicQrCodes(p.userId)
              .then((qrs) => setQrCodes(qrs))
              .finally(() => setQrLoading(false));
          }
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [username]);

  function getGuardianRank(stats: PublicProfile["stats"]): { label: string; color: string; icon: string } {
    const score = stats.qrCount * 2 + stats.totalScans / 10 + stats.totalLikesReceived + stats.safeReportsGiven * 3;
    if (score >= 500) return { label: "Elite Guardian", color: "#FFD700", icon: "shield-checkmark" };
    if (score >= 200) return { label: "Guardian", color: "#10B981", icon: "shield" };
    if (score >= 80) return { label: "Scout", color: "#006FFF", icon: "search" };
    if (score >= 20) return { label: "Newcomer", color: "#8B5CF6", icon: "person" };
    return { label: "Member", color: "#6B7280", icon: "person-outline" };
  }

  return { profile, qrCodes, loading, notFound, qrLoading, getGuardianRank };
}
