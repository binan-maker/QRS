import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuthScale } from "@/features/auth/hooks/useAuthScale";

interface Props {
  title: string;
  subtitle?: string;
}

export default function AuthBrandBlock({ title, subtitle }: Props) {
  const { colors } = useTheme();
  const { sp } = useAuthScale();
  return (
    <View style={styles.brandBlock}>
      <Text style={[styles.brandName, { color: colors.text, fontSize: sp(30) }]}>
        QR<Text style={{ color: colors.primary }}>Guard</Text>
      </Text>
      <View style={[styles.brandDivider, { backgroundColor: colors.primary }]} />
      <Text style={[styles.pageTitle, { color: colors.text, fontSize: sp(20) }]}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={[styles.pageSubtitle, { color: colors.textSecondary, fontSize: sp(13) }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  brandBlock:   { alignItems: "center", marginBottom: 28, gap: 8 },
  brandName:    { fontFamily: "Inter_700Bold", letterSpacing: -1 },
  brandDivider: { width: 32, height: 2.5, borderRadius: 2, marginTop: 2, marginBottom: 4 },
  pageTitle:    { fontFamily: "Inter_700Bold", letterSpacing: -0.5, textAlign: "center" },
  pageSubtitle: { fontFamily: "Inter_400Regular", textAlign: "center", maxWidth: 280, lineHeight: 20, marginTop: 2 },
});
