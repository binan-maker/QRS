import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";
import * as Haptics from "@/lib/haptics";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import DeleteAccountModal from "@/features/account/components/DeleteAccountModal";

export default function AccountManagementScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const [deleteModal, setDeleteModal] = useState(false);

  if (!user) {
    return (
      <View style={[styles.container, { paddingTop: topInset, backgroundColor: colors.background }]}>
        <View style={[styles.navBar, { borderBottomColor: colors.surfaceBorder }]}>
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.navTitle, { color: colors.text }]}>Account Management</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Ionicons name="person-outline" size={52} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Not signed in</Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Sign in to manage your account</Text>
          <Pressable onPress={() => router.push("/(auth)/login")} style={[styles.signInBtn, { backgroundColor: colors.primary }]}>
            <Text style={[styles.signInBtnText, { color: colors.primaryText }]}>Sign In</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={[styles.container, { paddingTop: topInset, backgroundColor: colors.background }]}>
        <View style={[styles.navBar, { borderBottomColor: colors.surfaceBorder }]}>
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.navTitle, { color: colors.text }]}>Account Management</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}>
          <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <View style={[styles.avatar, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "60" }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {user.displayName?.charAt(0)?.toUpperCase() || "?"}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.profileName, { color: colors.text }]}>{user.displayName}</Text>
              <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{user.email}</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={20} color={colors.safe} />
              <Text style={[styles.verifiedText, { color: colors.safe }]}>Verified</Text>
            </View>
          </View>

          <View style={styles.infoSection}>
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>ACCOUNT DETAILS</Text>
            <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={18} color={colors.textMuted} />
                <Text style={[styles.infoKey, { color: colors.textSecondary }]}>Display Name</Text>
                <Text style={[styles.infoVal, { color: colors.text }]} numberOfLines={1}>{user.displayName}</Text>
              </View>
              <View style={[styles.infoDivider, { backgroundColor: colors.surfaceBorder }]} />
              <View style={styles.infoRow}>
                <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
                <Text style={[styles.infoKey, { color: colors.textSecondary }]}>Email Address</Text>
                <Text style={[styles.infoVal, { color: colors.text }]} numberOfLines={1}>{user.email}</Text>
              </View>
              <View style={[styles.infoDivider, { backgroundColor: colors.surfaceBorder }]} />
              <View style={styles.infoRow}>
                <Ionicons name="shield-checkmark-outline" size={18} color={colors.textMuted} />
                <Text style={[styles.infoKey, { color: colors.textSecondary }]}>Account ID</Text>
                <Text style={[styles.infoVal, { color: colors.text, fontSize: 11, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>{user.id}</Text>
              </View>
            </View>
          </View>

          <View style={styles.dangerSection}>
            <Text style={[styles.dangerLabel, { color: colors.danger }]}>DANGER ZONE</Text>
            <View style={[styles.dangerCard, { backgroundColor: colors.surface, borderColor: colors.danger + "40" }]}>
              <View style={[styles.dangerHeader, { borderBottomColor: colors.danger + "20", backgroundColor: colors.dangerDim }]}>
                <View style={[styles.dangerIconWrap, { backgroundColor: colors.danger + "20" }]}>
                  <Ionicons name="warning-outline" size={20} color={colors.danger} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.dangerTitle, { color: colors.danger }]}>Delete Account</Text>
                  <Text style={[styles.dangerSub, { color: colors.danger + "AA" }]}>This action is permanent and cannot be undone</Text>
                </View>
              </View>
              <View style={styles.dangerConsequences}>
                <Text style={[styles.dangerConseqTitle, { color: colors.textMuted }]}>What will be deleted:</Text>
                {[
                  "Your profile and display name",
                  "All QR codes you generated",
                  "Your scan history and favourites",
                  "All your comments and reports",
                  "Your followers and following relationships",
                  "All notifications and messages",
                ].map((item, i) => (
                  <View key={i} style={styles.conRow}>
                    <Ionicons name="close-circle" size={14} color={colors.danger} />
                    <Text style={[styles.conText, { color: colors.textSecondary }]}>{item}</Text>
                  </View>
                ))}
              </View>
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); setDeleteModal(true); }}
                style={({ pressed }) => [styles.deleteBtn, { backgroundColor: colors.danger, opacity: pressed ? 0.85 : 1 }]}
              >
                <Ionicons name="person-remove-outline" size={18} color="#fff" />
                <Text style={styles.deleteBtnText}>Delete My Account</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>

      <DeleteAccountModal visible={deleteModal} onClose={() => setDeleteModal(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  navTitle: { fontSize: 18, fontFamily: "Inter_700Bold", flex: 1, textAlign: "center" },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  scrollContent: { padding: 20 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  signInBtn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14, marginTop: 8 },
  signInBtnText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  profileCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    borderRadius: 18, padding: 18, borderWidth: 1, marginBottom: 20,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 22, fontFamily: "Inter_700Bold" },
  profileName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  profileEmail: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  verifiedBadge: { alignItems: "center", gap: 3 },
  verifiedText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  infoSection: { marginBottom: 24 },
  infoLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, marginBottom: 10, paddingLeft: 4 },
  infoCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  infoKey: { fontSize: 13, fontFamily: "Inter_500Medium", width: 110 },
  infoVal: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "right" },
  infoDivider: { height: 1, marginLeft: 46 },
  dangerSection: { marginBottom: 20 },
  dangerLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, marginBottom: 10, paddingLeft: 4 },
  dangerCard: { borderRadius: 16, borderWidth: 1.5, overflow: "hidden" },
  dangerHeader: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    padding: 18, borderBottomWidth: 1,
  },
  dangerIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  dangerTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 2 },
  dangerSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  dangerConsequences: { padding: 18, gap: 8 },
  dangerConseqTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  conRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  conText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  deleteBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    margin: 18, marginTop: 0, paddingVertical: 16, borderRadius: 14,
  },
  deleteBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
});
