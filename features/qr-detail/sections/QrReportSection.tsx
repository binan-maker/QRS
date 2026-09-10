import { View, Text, type LayoutChangeEvent } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import ReportGrid from "@/features/qr-detail/components/ReportGrid";
import { offlineSectionStyles } from "@/features/qr-detail/styles";
import { REPORT_LABELS, REPORT_ICONS } from "@/features/qr-detail/utils/report-toast";

interface Props {
  user: any;
  offlineMode: boolean;
  reportCounts: any;
  userReport: any;
  isPayment: boolean;
  reportLoading?: boolean; // visual-only loading hint passed to ReportGrid
  handleReport: (type: string) => boolean;
  showToast: (msg: string, icon: keyof typeof Ionicons.glyphMap) => void;
  onLayout?: (e: LayoutChangeEvent) => void;
  colors: any;
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
            loading={reportLoading}
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
    </>
  );
}
