import { ScrollView, View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";
import { makeSettingsStyles } from "@/features/settings/styles";

const GUIDE_STEPS = [
  { icon: "scan-outline", title: "Scan a QR Code", desc: "Point your camera at any QR code, or pick an image from your gallery. The app will automatically detect and analyze the QR code." },
  { icon: "shield-checkmark-outline", title: "Check Trust Score", desc: "View the community trust score powered by reports from other users. Scores are confidence-weighted — more reporters means more accuracy." },
  { icon: "people-outline", title: "Read Community Reports", desc: "See how others have reported the QR code: Safe, Scam, Fake, or Spam. Read comments for detailed insights." },
  { icon: "flag-outline", title: "Report & Protect", desc: "Sign in to report suspicious QR codes and protect the community. Your reports contribute to the trust score algorithm." },
  { icon: "chatbubble-outline", title: "Comment & Discuss", desc: "Add comments to share your experience. Like helpful comments, report harmful ones. Full threading support." },
  { icon: "heart-outline", title: "Follow & Favorites", desc: "Follow QR codes to track them over time. Add frequently used QR codes to favorites for quick access." },
  { icon: "eye-off-outline", title: "Anonymous Mode", desc: "Scan in anonymous mode — nothing is written to your device or any server. Absolute zero tracking." },
  { icon: "phone-portrait-outline", title: "Payment QR Codes", desc: "For UPI, Google Pay, PhonePe, and other payment QR codes, tap 'Open in Payment App' to pay securely." },
];

export default function GuideSection() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = makeSettingsStyles(colors);
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
    >
      {GUIDE_STEPS.map((step, i) => (
        <Animated.View key={i} entering={FadeInDown.duration(300).delay(i * 50)}>
          <View style={styles.guideStep}>
            <View style={styles.guideStepNum}>
              <Text style={styles.guideStepNumText}>{i + 1}</Text>
            </View>
            <View style={styles.guideStepIcon}>
              <Ionicons name={step.icon as any} size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.guideStepTitle}>{step.title}</Text>
              <Text style={styles.guideStepDesc}>{step.desc}</Text>
            </View>
          </View>
        </Animated.View>
      ))}
    </ScrollView>
  );
}
