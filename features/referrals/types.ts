import { Ionicons } from "@expo/vector-icons";
import { RewardWallet, UserReferralsDashboard } from "@/services/rewards";

export interface HeroSlide {
  id: string;
  badgeTag: string;
  badgeIcon: keyof typeof Ionicons.glyphMap;
  titleTop: string;
  titleHighlight: string;
  subtitle: string;
  themeType: "gold" | "silver";
}

export type RefereeStatus = "already_referred" | "expired" | "eligible";

export interface UseReferralsReturn {
  wallet: RewardWallet | null;
  refDashboard: UserReferralsDashboard | null;
  activeSlide: number;
  setActiveSlide: (slide: number) => void;
  carouselScrollRef: React.RefObject<any>;
  slideWidth: number;
  claimModalOpen: boolean;
  setClaimModalOpen: (open: boolean) => void;
  referralInput: string;
  setReferralInput: (input: string) => void;
  applyingCode: boolean;
  referralStatus: string | null;
  referralError: boolean;
  codeCopied: boolean;
  linkCopied: boolean;
  toastMessage: string | null;
  refereeStatus: RefereeStatus;
  inviteCode: string;
  signupLink: string;
  displaySignupLink: string;
  user: any;
  handleScroll: (event: any) => void;
  handleBack: () => void;
  handleCopyCode: () => Promise<void>;
  handleCopyLink: () => Promise<void>;
  handleNativeShare: () => Promise<void>;
  handleApplyReferral: () => Promise<void>;
}
