import React from "react";
import { View, ScrollView, Pressable, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useReferrals } from "./hooks/useReferrals";
import {
  ReferralToast,
  ReferralHeader,
  HeroCarousel,
  ReferralCodeCard,
  RefereeClaimBanner,
  HowItWorksSteps,
  ClaimRefereeModal,
} from "./components";
import { styles } from "./styles";

export function ReferralsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const {
    refDashboard,
    activeSlide,
    setActiveSlide,
    carouselScrollRef,
    slideWidth,
    claimModalOpen,
    setClaimModalOpen,
    referralInput,
    setReferralInput,
    applyingCode,
    referralStatus,
    referralError,
    codeCopied,
    linkCopied,
    toastMessage,
    refereeStatus,
    inviteCode,
    displaySignupLink,
    user,
    handleScroll,
    handleBack,
    handleCopyCode,
    handleCopyLink,
    handleNativeShare,
    handleApplyReferral,
  } = useReferrals();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ReferralToast message={toastMessage} />

      <ReferralHeader onBack={handleBack} onShare={handleNativeShare} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
      >
        <HeroCarousel
          activeSlide={activeSlide}
          slideWidth={slideWidth}
          carouselScrollRef={carouselScrollRef}
          onScroll={handleScroll}
          onSelectSlide={(idx) => {
            carouselScrollRef.current?.scrollTo({ x: idx * slideWidth, animated: true });
            setActiveSlide(idx);
          }}
        />

        {/* Clean 3-Metric Referral Counter (Google Pay pattern) */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <Text style={[styles.statNumber, { color: colors.text }]}>{refDashboard?.totalInvited ?? 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Invited</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>{refDashboard?.totalQualified ?? 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Verified</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <Text style={[styles.statNumber, { color: colors.textMuted }]}>{refDashboard?.totalPending ?? 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
          </View>
        </View>

        <ReferralCodeCard
          inviteCode={inviteCode}
          displaySignupLink={displaySignupLink}
          codeCopied={codeCopied}
          linkCopied={linkCopied}
          onCopyCode={handleCopyCode}
          onCopyLink={handleCopyLink}
          onShare={handleNativeShare}
        />

        <RefereeClaimBanner onPress={() => setClaimModalOpen(true)} />

        <HowItWorksSteps />
      </ScrollView>

      {/* Fixed Bottom CTA Bar */}
      <View
        style={[
          styles.bottomFixedBar,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.surfaceBorder,
            paddingBottom: Math.max(insets.bottom, 14),
          },
        ]}
      >
        <Pressable
          onPress={handleNativeShare}
          style={({ pressed }) => [
            styles.inviteNowBtn,
            { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <Ionicons name="share-social-outline" size={18} color="#FFFFFF" />
          <Text style={styles.inviteNowBtnText}>Invite Friends</Text>
        </Pressable>
      </View>

      <ClaimRefereeModal
        visible={claimModalOpen}
        user={user}
        refereeStatus={refereeStatus}
        referralInput={referralInput}
        referralStatus={referralStatus}
        referralError={referralError}
        applyingCode={applyingCode}
        onChangeInput={setReferralInput}
        onApplyCode={handleApplyReferral}
        onClose={() => setClaimModalOpen(false)}
      />
    </View>
  );
}

export default ReferralsScreen;
