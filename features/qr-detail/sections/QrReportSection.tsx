import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import ReportGrid from "@/features/qr-detail/components/ReportGrid";
import SafetyWarningCard from "@/features/qr-detail/components/SafetyWarningCard";
import EvidenceCard from "@/features/qr-detail/components/EvidenceCard";
import { offlineSectionStyles } from "@/features/qr-detail/styles";

const REPORT_LABELS: Record<string, string> = { safe: "Safe", scam: "Scam", fake: "Fake", spam: "Spam" };
const REPORT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  safe: "shield-checkmark", scam: "warning", fake: "close-circle", spam: "mail-unread",
};

interface Props {
  user: any;
  offlineMode: boolean;
  reportCounts: any;
  userReport: any;
  isPayment: boolean;
  reportLoading?: boolean;
  handleReport: (type: string) => boolean;
  showToast: (msg: string, icon: keyof typeof Ionicons.glyphMap) => void;
  onLayout?: (e: any) => void;
  colors: any;
  urlSafety?: any;
  offlineBlacklistMatch?: { matched: boolean; reason?: string };
  showUrlSafety?: boolean;
  delay?: number;
}

export function QrReportSection({
  user,
  offlineMode,
  reportCounts,
  userReport,
  isPayment,
  reportLoading,
  handleReport,
  showToast,
  onLayout,
  colors,
  urlSafety,
  offlineBlacklistMatch,
  showUrlSafety = false,
  delay = 100,
}: Props) {
  if (!user) return null;

  return (
    <>
      <Animated.View
        entering={FadeInDown.delay(delay).duration(260)}
        onLayout={onLayout}
      >
        {offlineMode ? (
          <View style={offlineSectionStyles.row}>
            <Ionicons name="cloud-offline-outline" size={16} color={colors.textMuted} />
            <Text style={[offlineSectionStyles.text, { color: colors.textMuted }]}>
              Connect to the internet to submit your rating
            </Text>
          </View>
        ) : (
          <ReportGrid
            reportCounts={reportCounts}
            userReport={userReport}
            isLoggedIn={true}
            isPayment={isPayment}
            disabled={reportLoading}
            onReport={(type) => {
              const isRemoving = userReport === type;
              const reported = handleReport(type);
              if (!reported) return;
              if (isRemoving) {
                showToast(`Removed ${REPORT_LABELS[type] ?? type} vote`, "close-circle-outline");
              } else {
                showToast(`Voted ${REPORT_LABELS[type] ?? type}`, REPORT_ICONS[type] ?? "flag");
              }
            }}
          />
        )}
      </Animated.View>

      {showUrlSafety && (
        <>
          {((urlSafety?.isSuspicious) || offlineBlacklistMatch?.matched) && (
            <Animated.View entering={FadeInDown.delay(delay).duration(260)}>
              {urlSafety?.isSuspicious && (
                <SafetyWarningCard
                  riskLevel={urlSafety.riskLevel as "caution" | "dangerous"}
                  warnings={urlSafety.warnings}
                  title={urlSafety.riskLevel === "dangerous" ? "Dangerous URL Detected" : "Proceed with Caution"}
                />
              )}
              {offlineBlacklistMatch?.matched && (
                <SafetyWarningCard
                  riskLevel="dangerous"
                  warnings={[`Known scam pattern: ${offlineBlacklistMatch.reason}`]}
                  title="Known Scam Pattern"
                />
              )}
            </Animated.View>
          )}

          {urlSafety?.evidence && urlSafety.evidence.length > 0 && (
            <Animated.View entering={FadeInDown.delay(delay + 10).duration(260)}>
              <EvidenceCard title="URL Analysis" evidence={urlSafety.evidence} />
            </Animated.View>
          )}
        </>
      )}
    </>
  );
}
