"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import Colors, { type AppColors } from "@shared/constants/colors";
import { useTheme } from "@/lib/theme-context";
import {
  REPORT_TYPES as MOBILE_REPORT_TYPES,
  RATE_TYPES as MOBILE_RATE_TYPES,
  REPORT_LABELS,
  REPORT_ICONS as MOBILE_REPORT_ICONS,
  REPLIES_PER_PAGE,
} from "@features/qr-detail/constants";
import type { ReportKey } from "@features/qr-detail/data/reportTypes";
import { normalizeQrDetailContentType } from "@features/qr-detail/content-types";
import { isPaymentQr, parseAnyPaymentQr } from "@services/analysis";
import { calculateTrustScore } from "@services/trust/trust-service";
import {
  subscribeToQrReports,
  seedQrReportCountsInMemory,
} from "@services/moderation/report-service";
import {
  formatCompactNumber,
  formatRelativeTime as formatMobileRelativeTime,
} from "@shared/utils/formatters";
import { Ionicons, type IoniconName } from "@/lib/mobile-icons";
import { getQrShareUrl } from "../../../lib/qr-share";
import type { PublicQrRecord } from "../../../lib/qr-data";
import {
  ensureWebQrAndUserExist,
  fetchWebQrReports,
  submitQrReport,
  fetchWebQrComments,
  addQrComment,
  reactToQrComment,
  deleteQrComment,
  subscribeToQrStats,
  type WebQrComment,
} from "../../../lib/qr-client";
import { getWebSupabase, isWebSupabaseConfigured } from "../../../lib/supabase";
import styles from "./qr.module.css";

// ── Mobile Constants & Colors (imported from @features/qr-detail/constants) ──

export type { ReportKey };
export { REPORT_LABELS };

export interface ReportTypeConfig {
  key: ReportKey;
  label: string;
  icon: IoniconName;
  outlineIcon: IoniconName;
  color: string;
  bg: string;
  borderColor: string;
}

export function getResolvedReportTypes(c: AppColors): ReportTypeConfig[] {
  return MOBILE_REPORT_TYPES.map((rt) => {
    const resolvedColor = rt.color(c);
    const resolvedBg =
      rt.key === "safe"
        ? c.safeDim
        : rt.key === "scam"
          ? c.dangerDim
          : rt.key === "fake"
            ? c.warningDim
            : c.primaryDim;
    return {
      key: rt.key as ReportKey,
      label: rt.label,
      icon: rt.icon as IoniconName,
      outlineIcon: rt.outlineIcon as IoniconName,
      color: resolvedColor,
      bg: resolvedBg,
      borderColor: `${resolvedColor}50`,
    };
  });
}

export function getResolvedRateTypes(c: AppColors): ReportTypeConfig[] {
  return MOBILE_RATE_TYPES.map((rt) => {
    const resolvedColor = rt.color(c);
    const resolvedBg =
      rt.key === "safe"
        ? c.safeDim
        : rt.key === "scam"
          ? c.dangerDim
          : rt.key === "fake"
            ? c.warningDim
            : c.primaryDim;
    return {
      key: rt.key as ReportKey,
      label: rt.label,
      icon: rt.icon as IoniconName,
      outlineIcon: rt.outlineIcon as IoniconName,
      color: resolvedColor,
      bg: resolvedBg,
      borderColor: `${resolvedColor}50`,
    };
  });
}

export const REPORT_TYPES = getResolvedReportTypes(Colors.light);
export const RATE_TYPES = getResolvedRateTypes(Colors.light);
export const REPORT_ICONS: Record<string, IoniconName> = MOBILE_REPORT_ICONS as Record<string, IoniconName>;

const READ_MORE_THRESHOLD = 200;

function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "just now";
  return formatMobileRelativeTime(iso);
}

function getInitialColor(name: string): [string, string] {
  const palettes: [string, string][] = [
    ["#7C3AED", "#A78BFA"],
    ["#059669", "#34D399"],
    ["#E11D48", "#FB7185"],
    ["#D97706", "#FBBF24"],
    ["#475569", "#94A3B8"],
    ["#0D9488", "#2DD4BF"],
  ];
  const code = (name || "U").charCodeAt(0) || 0;
  return palettes[code % palettes.length];
}

function getScoreGradient(score: number, c: AppColors): [string, string] {
  if (score >= 70) return [c.safe, c.safeShade];
  if (score >= 40) return [c.warning, c.warningShade];
  return [c.danger, c.dangerShade];
}

// ── Sub-component: QrContentCard (1:1 with features/qr-detail/components/QrContentCard.tsx) ──

function QrContentCard({
  content,
  contentType,
}: {
  content: string;
  contentType: string;
}) {
  const { colors } = useTheme();
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const cleanContent = content?.trim() || "";
  const isPayment =
    contentType.toLowerCase() === "payment" ||
    isPaymentQr(cleanContent);

  const isPhone =
    !isPayment &&
    (contentType.toLowerCase() === "phone" ||
      contentType.toLowerCase() === "tel" ||
      /^tel:/i.test(cleanContent) ||
      /^\+?[\d\s\-().]{7,20}$/.test(cleanContent));

  const isEmail =
    !isPayment &&
    (contentType.toLowerCase() === "email" ||
      /^mailto:/i.test(cleanContent));

  const isSms =
    !isPayment &&
    (contentType.toLowerCase() === "sms" ||
      /^smsto?:/i.test(cleanContent));

  const isUrl =
    !isPayment &&
    !isPhone &&
    !isEmail &&
    !isSms &&
    (contentType.toLowerCase() === "url" ||
      /^https?:\/\//i.test(cleanContent) ||
      (/^[a-z0-9-]+(\.[a-z0-9-]+)+\/?/i.test(cleanContent) && !cleanContent.includes(" ")));

  const handleCopy = async (valueToCopy: string) => {
    try {
      await navigator.clipboard.writeText(valueToCopy);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  // ── 0. Payment Card (1:1 styling with mobile QrContentCard Payment) ──
  if (isPayment) {
    const parsed = parseAnyPaymentQr(cleanContent);
    const appTitle = parsed?.appDisplayName || "Payment QR";
    const recipientAddress = parsed?.vpa || parsed?.recipientId || cleanContent;
    const isWebLink = /^https?:\/\//i.test(cleanContent);

    let formattedAmount = "";
    if (parsed?.isAmountPreFilled && parsed.amount) {
      const amt = parseFloat(parsed.amount);
      if (!isNaN(amt)) {
        if (parsed.appCategory === "upi_india" || parsed.appCategory === "india_wallet") {
          formattedAmount = `₹${amt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
        } else if (parsed.app === "pix") {
          formattedAmount = `R$ ${amt.toFixed(2)}`;
        } else if (parsed.currency) {
          formattedAmount = `${parsed.currency} ${amt.toLocaleString()}`;
        } else {
          formattedAmount = `${amt.toLocaleString()}`;
        }
      } else {
        formattedAmount = `${parsed.currency ? parsed.currency + " " : ""}${parsed.amount}`;
      }
    }

    return (
      <section
        className={`${styles.contentCard} ${styles.paymentCard}`}
        aria-label="Payment QR destination"
      >
        {/* Header */}
        <div className={styles.contentCardRow}>
          <div className={styles.paymentHeaderLeft}>
            <Ionicons name="card" size={18} color={colors.safe} />
            <strong className={styles.domainTitle}>Payment QR Code</strong>
            <span className={styles.paymentTypeBadge}>{appTitle}</span>
          </div>
          <button
            type="button"
            onClick={() => void handleCopy(cleanContent)}
            className={`${styles.copyBtn} ${copied ? styles.copyBtnCopied : ""}`}
            aria-label="Copy payment data"
          >
            <Ionicons
              name={copied ? "checkmark-circle" : "copy-outline"}
              size={14}
              color={copied ? colors.safe : colors.textMuted}
            />
            <span>{copied ? "Copied!" : "Copy"}</span>
          </button>
        </div>

        {/* Network & App Identity Banner */}
        <div className={styles.paymentBanner}>
          <div className={styles.paymentIconRing}>
            <Ionicons name="card" size={22} color={colors.safe} />
          </div>
          <div className={styles.paymentBannerTextCol}>
            <span className={styles.paymentBannerTitle}>{appTitle}</span>
            <span className={styles.paymentBannerSub}>
              {parsed?.region ? `${parsed.region} • ` : ""}
              {parsed?.appCategory === "upi_india"
                ? "UPI Instant Payment"
                : parsed?.appCategory === "crypto"
                  ? "Cryptocurrency Transfer"
                  : isWebLink
                    ? "Online Payment Gateway"
                    : "Digital Payment Network"}
            </span>
          </div>
        </div>

        {/* Amount Box */}
        {parsed?.isAmountPreFilled && formattedAmount ? (
          <div className={styles.paymentAmountBox}>
            <div className={styles.paymentAmountRow}>
              <span className={styles.paymentAmountLabel}>Pre-Filled Amount</span>
              <span className={styles.paymentAmountAlert}>
                <Ionicons name="alert-circle" size={12} color="#b45309" />
                Fixed Amount
              </span>
            </div>
            <span className={styles.paymentAmountValue}>{formattedAmount}</span>
            <p className={styles.paymentAmountHint}>
              Verify this requested amount carefully before authorising payment.
            </p>
          </div>
        ) : (
          <div className={styles.paymentOpenAmountBox}>
            <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
            <span>Amount not pre-filled. You specify the amount in your payment app.</span>
          </div>
        )}

        {/* Structured Details */}
        <div className={styles.paymentDetailsCard}>
          {parsed?.recipientName && (
            <div className={styles.paymentDetailRow}>
              <span className={styles.paymentDetailLabel}>Payee / Merchant</span>
              <span className={styles.paymentDetailValue}>{parsed.recipientName}</span>
            </div>
          )}

          <div className={styles.paymentDetailRow}>
            <span className={styles.paymentDetailLabel}>
              {parsed?.vpa ? "UPI ID / VPA" : "Payment Address"}
            </span>
            <div className={styles.paymentAddressWrap}>
              <span className={styles.paymentAddressText}>{recipientAddress}</span>
              <button
                type="button"
                onClick={() => void handleCopy(recipientAddress)}
                className={`${styles.paymentMiniCopyBtn} ${copied ? styles.paymentMiniCopyBtnCopied : ""}`}
                title="Copy payment address"
                aria-label="Copy payment address"
              >
                <Ionicons
                  name={copied ? "checkmark" : "copy-outline"}
                  size={12}
                  color={copied ? colors.safe : colors.textMuted}
                />
              </button>
            </div>
          </div>

          {parsed?.note && (
            <div className={styles.paymentDetailRow}>
              <span className={styles.paymentDetailLabel}>Note / Remarks</span>
              <span className={styles.paymentDetailValue}>{parsed.note}</span>
            </div>
          )}
        </div>

        {/* Security Warning Box */}
        <div className={styles.paymentAdvisoryBox}>
          <Ionicons
            name="shield-checkmark"
            size={16}
            color={colors.primary}
            style={{ flexShrink: 0, marginTop: 1 }}
          />
          <span>
            Never enter your UPI PIN or password to receive money. Transfers are immediate and
            irreversible once sent.
          </span>
        </div>

        {/* Action Buttons */}
        <div className={styles.paymentActionGroup}>
          <a
            href={cleanContent}
            target={isWebLink ? "_blank" : undefined}
            rel={isWebLink ? "noopener noreferrer" : undefined}
            className={styles.payPrimaryBtn}
          >
            <Ionicons name="card-outline" size={16} color="#FFFFFF" />
            <span>{isWebLink ? "Open Payment Link" : `Pay with ${appTitle}`}</span>
          </a>

          <button
            type="button"
            onClick={() => void handleCopy(cleanContent)}
            className={styles.paySecondaryBtn}
          >
            <Ionicons
              name={copied ? "checkmark-circle" : "copy-outline"}
              size={14}
              color={copied ? colors.safe : colors.text}
            />
            <span>{copied ? "Details Copied!" : "Copy Payment Details"}</span>
          </button>
        </div>
      </section>
    );
  }

  // ── 1. Phone Card (1:1 styling with mobile QrContentCard) ──
  if (isPhone) {
    const rawNumber = cleanContent.replace(/^tel:/i, "").trim();
    const displayNumber = rawNumber || cleanContent;
    const callUrl = `tel:${rawNumber || cleanContent}`;

    return (
      <section className={styles.contentCard} aria-label="Phone number destination">
        <div className={styles.contentCardRow}>
          <strong className={styles.domainTitle}>
            Phone Number
          </strong>
          <button
            type="button"
            onClick={() => void handleCopy(displayNumber)}
            className={`${styles.copyBtn} ${copied ? styles.copyBtnCopied : ""}`}
            aria-label="Copy phone number"
          >
            <Ionicons
              name={copied ? "checkmark-circle" : "copy-outline"}
              size={14}
              color={copied ? colors.safe : colors.textMuted}
            />
            <span>{copied ? "Copied!" : "Copy"}</span>
          </button>
        </div>

        <div className={styles.urlStrip} title={displayNumber}>
          <span>{displayNumber}</span>
        </div>

        <a
          href={callUrl}
          className={styles.openBtn}
        >
          <span>Call Number</span>
          <Ionicons name="call-outline" size={14} color={colors.primary} />
        </a>
      </section>
    );
  }

  // ── 2. Website Card ──
  if (isUrl) {
    const fullUrl = /^https?:\/\//i.test(cleanContent)
      ? cleanContent
      : `https://${cleanContent}`;

    let hostname = cleanContent;
    try {
      hostname = new URL(fullUrl).hostname.replace(/^www\./, "");
    } catch {
      hostname = cleanContent;
    }

    return (
      <section className={styles.contentCard} aria-label="Website destination">
        <div className={styles.contentCardRow}>
          <strong className={styles.domainTitle} title={hostname}>
            {hostname}
          </strong>
          <button
            type="button"
            onClick={() => void handleCopy(fullUrl)}
            className={`${styles.copyBtn} ${copied ? styles.copyBtnCopied : ""}`}
            aria-label="Copy website URL"
          >
            <Ionicons
              name={copied ? "checkmark-circle" : "copy-outline"}
              size={14}
              color={copied ? colors.safe : colors.textMuted}
            />
            <span>{copied ? "Copied!" : "Copy"}</span>
          </button>
        </div>

        <div className={styles.urlStrip} title={fullUrl}>
          <span>{fullUrl}</span>
        </div>

        <a
          href={fullUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.openBtn}
        >
          <span>Open</span>
          <Ionicons name="open-outline" size={14} color={colors.primary} />
        </a>
      </section>
    );
  }

  // ── 3. Email Card ──
  if (isEmail) {
    const emailAddress = cleanContent.replace(/^mailto:/i, "").split("?")[0].trim();
    return (
      <section className={styles.contentCard} aria-label="Email destination">
        <div className={styles.contentCardRow}>
          <strong className={styles.domainTitle}>
            Email Address
          </strong>
          <button
            type="button"
            onClick={() => void handleCopy(emailAddress)}
            className={`${styles.copyBtn} ${copied ? styles.copyBtnCopied : ""}`}
            aria-label="Copy email address"
          >
            <Ionicons
              name={copied ? "checkmark-circle" : "copy-outline"}
              size={14}
              color={copied ? colors.safe : colors.textMuted}
            />
            <span>{copied ? "Copied!" : "Copy"}</span>
          </button>
        </div>

        <div className={styles.urlStrip} title={emailAddress}>
          <span>{emailAddress}</span>
        </div>

        <a
          href={cleanContent.startsWith("mailto:") ? cleanContent : `mailto:${cleanContent}`}
          className={styles.openBtn}
        >
          <span>Send Email</span>
          <Ionicons name="mail-outline" size={14} color={colors.primary} />
        </a>
      </section>
    );
  }

  // ── 4. SMS Card ──
  if (isSms) {
    const smsTarget = cleanContent.replace(/^smsto?:/i, "").trim();
    return (
      <section className={styles.contentCard} aria-label="SMS destination">
        <div className={styles.contentCardRow}>
          <strong className={styles.domainTitle}>
            SMS Message
          </strong>
          <button
            type="button"
            onClick={() => void handleCopy(smsTarget)}
            className={`${styles.copyBtn} ${copied ? styles.copyBtnCopied : ""}`}
            aria-label="Copy SMS details"
          >
            <Ionicons
              name={copied ? "checkmark-circle" : "copy-outline"}
              size={14}
              color={copied ? colors.safe : colors.textMuted}
            />
            <span>{copied ? "Copied!" : "Copy"}</span>
          </button>
        </div>

        <div className={styles.urlStrip} title={smsTarget}>
          <span>{smsTarget}</span>
        </div>

        <a
          href={cleanContent.startsWith("sms:") || cleanContent.startsWith("smsto:") ? cleanContent : `sms:${cleanContent}`}
          className={styles.openBtn}
        >
          <span>Send SMS</span>
          <Ionicons name="chatbubble-outline" size={14} color={colors.primary} />
        </a>
      </section>
    );
  }

  // ── 5. Text Card ──
  const isLong = cleanContent.length > 120 || cleanContent.includes("\n");
  return (
    <section className={styles.contentCard} aria-label="Text content">
      <div className={styles.contentCardRow}>
        <strong className={styles.domainTitle}>Text</strong>
        <button
          type="button"
          onClick={() => void handleCopy(cleanContent)}
          className={`${styles.copyBtn} ${copied ? styles.copyBtnCopied : ""}`}
          aria-label="Copy text content"
        >
          <Ionicons
            name={copied ? "checkmark-circle" : "copy-outline"}
            size={14}
            color={copied ? colors.safe : colors.textMuted}
          />
          <span>{copied ? "Copied!" : "Copy"}</span>
        </button>
      </div>

      <div className={styles.rawBox}>
        <p className={`${styles.rawText} ${!expanded && isLong ? styles.rawTextClamped : ""}`}>
          {cleanContent}
        </p>
        {isLong && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className={styles.expandBtn}
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>
    </section>
  );
}

interface ReplyTarget {
  id: string;
  author: string;
  rootId: string;
  isNested: boolean;
}

// ── Main Component: QrVerificationView (1:1 with features/qr-detail/QrDetailScreen.tsx) ──

export default function QrVerificationView({
  record,
}: {
  record: PublicQrRecord;
  code: string;
}) {
  const router = useRouter();
  const qrId = record.id;
  const { colors, isDark } = useTheme();

  const reportTypes = useMemo(() => getResolvedReportTypes(colors), [colors]);
  const rateTypes = useMemo(() => getResolvedRateTypes(colors), [colors]);

  const redirectToLogin = useCallback(() => {
    const returnUrl =
      typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : "";
    router.push(
      returnUrl
        ? `/login?returnUrl=${encodeURIComponent(returnUrl)}`
        : "/login"
    );
  }, [router]);

  // Auth state
  const [user, setUser] = useState<User | null>(null);

  // Content state with self-healing fallback if record has corrupted placeholder "tel:"
  const [activeContent, setActiveContent] = useState<string>(() => (record.content || "").trim());

  const [activeContentType, setActiveContentType] = useState<string>(() => {
    const raw = (record.content || "").trim();
    if (raw) {
      if (/^tel:/i.test(raw) || /^\+?[\d\s\-().]{7,20}$/.test(raw)) return "phone";
      if (/^mailto:/i.test(raw)) return "email";
      if (/^smsto?:/i.test(raw)) return "sms";
      if (/^https?:\/\//i.test(raw)) return "url";
    }
    return record.contentType;
  });

  useEffect(() => {
    const raw = (record.content || "").trim();
    if (raw && raw.toLowerCase() !== "tel:" && raw.length > 4) return;
    let recovered = "";
    try {
      const stored = localStorage.getItem(`qr_content_${qrId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.content && parsed.content.trim().toLowerCase() !== "tel:" && parsed.content.trim().length > 4) {
          recovered = parsed.content.trim();
        }
      }
    } catch {}
    if (!recovered) {
      try {
        const anon = sessionStorage.getItem(`anonymous_qr_${qrId}`);
        if (anon) {
          const parsed = JSON.parse(anon);
          if (parsed?.content && parsed.content.trim().toLowerCase() !== "tel:" && parsed.content.trim().length > 4) {
            recovered = parsed.content.trim();
          }
        }
      } catch {}
    }
    if (recovered) {
      setActiveContent(recovered);
      if (/^tel:/i.test(recovered) || /^\+?[\d\s\-().]{7,20}$/.test(recovered)) setActiveContentType("phone");
      else if (/^mailto:/i.test(recovered)) setActiveContentType("email");
      else if (/^smsto?:/i.test(recovered)) setActiveContentType("sms");
      else if (/^https?:\/\//i.test(recovered)) setActiveContentType("url");
    }
  }, [qrId, record.content]);

  // Real Supabase data states (initialized from server-rendered record, then live-synced)
  const [scanCount, setScanCount] = useState<number>(Math.max(1, record.scanCount || 1));
  const [reportCounts, setReportCounts] = useState<Record<string, number>>(record.reportCounts || {});
  const [weightedCounts, setWeightedCounts] = useState<Record<string, number>>(record.weightedCounts || {});
  const [userReport, setUserReport] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Comments state
  const [commentsList, setCommentsList] = useState<WebQrComment[]>(() =>
    (record.comments || []).map((c) => ({
      id: c.id,
      userId: c.userId,
      userName: c.userName,
      userUsername: (c.userUsername || c.userName || "user").replace(/^@/, ""),
      userPhotoURL: c.userPhotoURL,
      text: c.text,
      parentId: c.parentId,
      likes: c.likes || 0,
      dislikes: c.dislikes || 0,
      userLike: null,
      isEdited: Boolean(c.isEdited),
      createdAt: c.createdAt,
      replies: [],
    })),
  );
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const [visibleRepliesCount, setVisibleRepliesCount] = useState<Record<string, number>>({});
  const [expandedCommentText, setExpandedCommentText] = useState<Record<string, boolean>>({});

  // Sheets & Toast state
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [commentMenu, setCommentMenu] = useState<{ id: string; isOwner: boolean } | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; icon: IoniconName; key: number } | null>(null);

  const reportSectionRef = useRef<HTMLDivElement | null>(null);
  const commentInputRef = useRef<HTMLTextAreaElement | null>(null);

  const showToast = useCallback((message: string, icon: IoniconName = "checkmark-circle") => {
    setToast((prev) => ({ message, icon, key: (prev?.key ?? 0) + 1 }));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(t);
  }, [toast]);

  // 1. Auth session listener + ensure QR row exists in Supabase + load live reports & comments
  useEffect(() => {
    if (record.reportCounts && Object.keys(record.reportCounts).length > 0) {
      seedQrReportCountsInMemory(qrId, record.reportCounts, record.weightedCounts);
    }
    if (!isWebSupabaseConfigured()) return;
    const supabase = getWebSupabase();
    let cancelled = false;

    const loadAll = async (currentUser: User | null) => {
      const bestContent = activeContent || record.content;
      const bestType = activeContentType || normalizeQrDetailContentType(record.contentType);
      if (bestContent) {
        void ensureWebQrAndUserExist(qrId, currentUser, {
          content: bestContent,
          contentType: bestType,
        });
      }
      const [reportsRes, commentsRes] = await Promise.allSettled([
        fetchWebQrReports(qrId, currentUser?.id ?? null),
        fetchWebQrComments(qrId, currentUser?.id ?? null),
      ]);

      if (cancelled) return;

      if (reportsRes.status === "fulfilled") {
        const fetchedCounts = reportsRes.value.reportCounts;
        const hasFetchedVotes = Object.keys(fetchedCounts).length > 0;
        if (hasFetchedVotes || currentUser) {
          setReportCounts(fetchedCounts);
          setWeightedCounts(reportsRes.value.weightedCounts);
        }
        setUserReport(reportsRes.value.userReport);
      }
      if (commentsRes.status === "fulfilled") {
        setCommentsList(commentsRes.value);
      }
    };

    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      const sessionUser = data.session?.user ?? null;
      setUser(sessionUser);
      void loadAll(sessionUser);
    });

    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      void loadAll(sessionUser);
    });

    const unsubReports = subscribeToQrReports(qrId, (counts, weighted) => {
      if (!cancelled && Object.keys(counts).length > 0) {
        setReportCounts(counts);
        setWeightedCounts(weighted);
      }
    });

    const unsubStats = subscribeToQrStats(qrId, (stats) => {
      if (!cancelled) {
        setScanCount(Math.max(1, stats.scanCount));
      }
    });

    return () => {
      cancelled = true;
      authSub.subscription.unsubscribe();
      unsubReports();
      unsubStats();
    };
  }, [qrId, activeContent, activeContentType, record.content, record.contentType, record.reportCounts, record.weightedCounts]);

  // 2. Real trust score computed using mobile @services/trust/trust-service
  const trustInfo = useMemo(() => {
    return calculateTrustScore(reportCounts, weightedCounts);
  }, [reportCounts, weightedCounts]);

  const totalVotes = useMemo(
    () => reportTypes.reduce((sum, r) => sum + (reportCounts[r.key] || 0), 0),
    [reportCounts, reportTypes],
  );
  const votedTypes = useMemo(
    () => reportTypes.filter((r) => (reportCounts[r.key] || 0) > 0),
    [reportCounts, reportTypes],
  );
  const hasScore = trustInfo.score >= 0;
  const scoreGradient = hasScore
    ? getScoreGradient(trustInfo.score, colors)
    : ([colors.textMuted, colors.surfaceBorder] as [string, string]);

  // 3. Comment hierarchy helpers (matching mobile useQrComments)
  const topLevelComments = useMemo(
    () =>
      commentsList
        .filter((c) => !c.parentId)
        .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")),
    [commentsList],
  );

  const getRootCommentId = useCallback(
    (commentId: string): string => {
      const byId = new Map(commentsList.map((c) => [c.id, c]));
      let curr = byId.get(commentId);
      let guard = 0;
      while (curr?.parentId && byId.has(curr.parentId) && guard < 20) {
        curr = byId.get(curr.parentId);
        guard++;
      }
      return curr?.id ?? commentId;
    },
    [commentsList],
  );

  const getAllDescendants = useCallback(
    (rootId: string): WebQrComment[] => {
      const childrenMap = new Map<string, WebQrComment[]>();
      for (const c of commentsList) {
        if (!c.parentId) continue;
        const list = childrenMap.get(c.parentId) ?? [];
        list.push(c);
        childrenMap.set(c.parentId, list);
      }
      const result: WebQrComment[] = [];
      const queue = [...(childrenMap.get(rootId) ?? [])];
      while (queue.length > 0) {
        const item = queue.shift()!;
        result.push(item);
        const kids = childrenMap.get(item.id);
        if (kids) queue.push(...kids);
      }
      result.sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));
      return result;
    },
    [commentsList],
  );

  // 4. Handlers
  const handleBack = () => {
    router.push("/");
  };

  const handleShare = async () => {
    const shareUrl =
      getQrShareUrl(qrId) ||
      (typeof window !== "undefined" ? window.location.href : "");
    if (!shareUrl) {
      showToast("This QR cannot be shared yet", "alert-circle-outline");
      return;
    }

    const shareMessage = `View this QR code's TrustScore! ${shareUrl}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Share QR Details",
          text: shareMessage,
        });
        return;
      } catch (err: any) {
        if (err?.name === "AbortError") {
          return;
        }
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast("Link copied to clipboard", "checkmark-circle");
    } catch {
      showToast("Unable to share link", "alert-circle-outline");
    }
  };

  const handleRateCtaPress = () => {
    setOverflowOpen(false);
    if (!user) {
      redirectToLogin();
      return;
    }
    reportSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleReportVote = async (type: ReportKey) => {
    if (!user) {
      redirectToLogin();
      return;
    }

    const prevUserReport = userReport;
    const prevCounts = { ...reportCounts };
    const isRemoving = prevUserReport === type;
    const nextUserReport = isRemoving ? null : type;

    // Optimistic update
    const nextCounts = { ...reportCounts };
    if (prevUserReport) {
      nextCounts[prevUserReport] = Math.max(0, (nextCounts[prevUserReport] || 1) - 1);
    }
    if (nextUserReport) {
      nextCounts[nextUserReport] = (nextCounts[nextUserReport] || 0) + 1;
    }

    setUserReport(nextUserReport);
    setReportCounts(nextCounts);
    setReportLoading(true);

    // Exact toast feedback matching mobile features/qr-detail/QrDetailScreen.tsx line 259-261
    if (isRemoving) {
      showToast(`Removed ${REPORT_LABELS[type] ?? type} vote`, "close-circle-outline");
    } else {
      showToast(`Voted ${REPORT_LABELS[type] ?? type}`, REPORT_ICONS[type] ?? "flag");
    }

    try {
      const res = await submitQrReport(qrId, type, {
        content: record.content,
        contentType: record.contentType,
      });
      setUserReport(res.userReport);
      setReportCounts(res.reportCounts);
      setWeightedCounts(res.weightedCounts);
    } catch (err: any) {
      setUserReport(prevUserReport);
      setReportCounts(prevCounts);
      showToast(err?.message || "Could not submit your vote", "alert-circle-outline");
    } finally {
      setReportLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!user) {
      redirectToLogin();
      return;
    }
    const trimmed = newComment.trim();
    if (!trimmed || submittingComment) return;

    const parentId = replyTo ? replyTo.rootId : null;
    const tempId = `temp_${Date.now()}`;
    const displayName =
      user.user_metadata?.display_name ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "user";
    const username = (user.user_metadata?.username || displayName).replace(/^@/, "");

    const userPhoto =
      (typeof window !== "undefined" && user.id
        ? localStorage.getItem(`user_custom_avatar_${user.id}`) ||
          localStorage.getItem(`user_avatar_${user.id}`)
        : null) ||
      user.user_metadata?.custom_avatar_url ||
      user.user_metadata?.avatar_url ||
      user.user_metadata?.picture ||
      user.user_metadata?.photo_url ||
      user.user_metadata?.photoURL ||
      null;

    const optimistic: WebQrComment = {
      id: tempId,
      userId: user.id,
      userName: displayName,
      userUsername: username,
      userPhotoURL: userPhoto,
      text: trimmed,
      parentId,
      likes: 0,
      dislikes: 0,
      userLike: null,
      isEdited: false,
      createdAt: new Date().toISOString(),
      replies: [],
    };

    setSubmittingComment(true);
    setNewComment("");
    const activeReply = replyTo;
    setReplyTo(null);
    setCommentsList((prev) => [optimistic, ...prev]);
    if (parentId) {
      setExpandedReplies((prev) => ({ ...prev, [parentId]: true }));
    }

    try {
      const saved = await addQrComment(qrId, trimmed, parentId, {
        content: record.content,
        contentType: record.contentType,
      });
      setCommentsList((prev) => prev.map((c) => (c.id === tempId ? saved : c)));
    } catch (err: any) {
      setCommentsList((prev) => prev.filter((c) => c.id !== tempId));
      setNewComment(trimmed);
      setReplyTo(activeReply);
      showToast(err?.message || "Could not post comment", "alert-circle-outline");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleCommentReaction = async (commentId: string, action: "like" | "dislike") => {
    if (!user) {
      redirectToLogin();
      return;
    }

    const prevList = commentsList;
    setCommentsList((prev) =>
      prev.map((c) => {
        if (c.id !== commentId) return c;
        const wasLike = c.userLike === "like";
        const wasDislike = c.userLike === "dislike";
        const nextLike = c.userLike === action ? null : action;
        return {
          ...c,
          userLike: nextLike,
          likes:
            nextLike === "like"
              ? c.likes + 1
              : wasLike
                ? Math.max(0, c.likes - 1)
                : c.likes,
          dislikes:
            nextLike === "dislike"
              ? c.dislikes + 1
              : wasDislike
                ? Math.max(0, c.dislikes - 1)
                : c.dislikes,
        };
      }),
    );

    try {
      const res = await reactToQrComment(qrId, commentId, action);
      setCommentsList((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, userLike: res.userLike, likes: res.likes, dislikes: res.dislikes }
            : c,
        ),
      );
    } catch {
      setCommentsList(prevList);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    setDeletingCommentId(commentId);
    const prevList = commentsList;
    setCommentsList((prev) =>
      prev.filter((c) => c.id !== commentId && c.parentId !== commentId),
    );
    try {
      await deleteQrComment(qrId, commentId);
      showToast("Comment deleted", "checkmark-circle");
    } catch {
      setCommentsList(prevList);
      showToast("Could not delete comment", "alert-circle-outline");
    } finally {
      setDeletingCommentId(null);
    }
  };

  const handleReplyClick = (comment: WebQrComment) => {
    if (!user) {
      redirectToLogin();
      return;
    }
    const rootId = getRootCommentId(comment.id);
    const author = `@${comment.userUsername || "user"}`;
    setReplyTo({
      id: comment.id,
      author,
      rootId,
      isNested: Boolean(comment.parentId),
    });
    if (comment.parentId) {
      setNewComment(`${author} `);
    }
    window.setTimeout(() => commentInputRef.current?.focus(), 60);
  };

  const renderCommentBody = (comment: WebQrComment, isReply: boolean) => {
    const displayName = comment.userUsername
      ? `@${comment.userUsername.replace(/^@/, "")}`
      : comment.userId
        ? `@user_${comment.userId.slice(-5)}`
        : "@user";
    const isLong = comment.text.length > READ_MORE_THRESHOLD;
    const isTextExpanded = Boolean(expandedCommentText[comment.id]);
    const displayText =
      isLong && !isTextExpanded
        ? comment.text.slice(0, READ_MORE_THRESHOLD)
        : comment.text;
    const isOwner = Boolean(user && user.id === comment.userId);

    return (
      <div className={styles.commentBody}>
        <div className={styles.commentHeader}>
          <span className={styles.authorName}>{displayName}</span>
          <span className={styles.commentTime}>{formatRelativeTime(comment.createdAt)}</span>
          <button
            type="button"
            className={styles.commentMenuBtn}
            aria-label="Comment options"
            onClick={() => setCommentMenu({ id: comment.id, isOwner })}
          >
            <Ionicons name="ellipsis-horizontal" size={16} color={colors.textMuted} />
          </button>
        </div>

        <div className={styles.commentTextWrap}>
          <p className={styles.commentText}>
            {(() => {
              if (displayText.startsWith("@")) {
                const spaceIdx = displayText.indexOf(" ");
                if (spaceIdx > 0) {
                  return (
                    <>
                      <span className={styles.mentionText}>{displayText.slice(0, spaceIdx)}</span>
                      {displayText.slice(spaceIdx)}
                    </>
                  );
                }
              }
              return displayText;
            })()}
            {isLong && !isTextExpanded && (
              <button
                type="button"
                className={styles.readMoreInline}
                onClick={() =>
                  setExpandedCommentText((prev) => ({ ...prev, [comment.id]: true }))
                }
              >
                {" "}... Read more
              </button>
            )}
          </p>
          {isLong && isTextExpanded && (
            <button
              type="button"
              className={styles.readMoreInline}
              onClick={() =>
                setExpandedCommentText((prev) => ({ ...prev, [comment.id]: false }))
              }
            >
              Show less
            </button>
          )}
        </div>

        <div className={styles.commentActionRow}>
          <button
            type="button"
            onClick={() => void handleCommentReaction(comment.id, "like")}
            className={`${styles.actionPill} ${comment.userLike === "like" ? styles.actionPillLiked : ""}`}
            aria-label="Like comment"
          >
            <Ionicons
              name={comment.userLike === "like" ? "thumbs-up" : "thumbs-up-outline"}
              size={13}
              color={comment.userLike === "like" ? colors.primary : colors.textMuted}
            />
            {comment.likes > 0 && <span>{formatCompactNumber(comment.likes)}</span>}
          </button>

          <button
            type="button"
            onClick={() => void handleCommentReaction(comment.id, "dislike")}
            className={`${styles.actionPill} ${comment.userLike === "dislike" ? styles.actionPillDisliked : ""}`}
            aria-label="Dislike comment"
          >
            <Ionicons
              name={comment.userLike === "dislike" ? "thumbs-down" : "thumbs-down-outline"}
              size={13}
              color={comment.userLike === "dislike" ? colors.danger : colors.textMuted}
            />
            {comment.dislikes > 0 && <span>{formatCompactNumber(comment.dislikes)}</span>}
          </button>

          <button
            type="button"
            onClick={() => handleReplyClick(comment)}
            className={styles.actionPill}
          >
            <Ionicons name="return-down-forward-outline" size={13} color={colors.textMuted} />
            <span>Reply</span>
          </button>
        </div>
      </div>
    );
  };

  const activeVoteType = rateTypes.find((rt) => rt.key === userReport);

  return (
    <main className={styles.page}>
      {/* ── Floating Toast (1:1 with mobile QrToast.tsx at bottom: 96px) ── */}
      {toast && (
        <div key={toast.key} className={styles.toastWrap} role="status" aria-live="polite">
          <div className={styles.toastPill}>
            <Ionicons name={toast.icon} size={14} color="#ffffff" />
            <span className={styles.toastPillText}>{toast.message}</span>
          </div>
        </div>
      )}

      {/* ── Outer Card Wrapper matching Home and Download pages ── */}
      <div className={styles.inner}>
        {/* ── Top Navigation Bar (1:1 with mobile QrDetailNavBar.tsx) ── */}
        <header className={styles.navBar}>
          <div className={styles.navLeft}>
            <button
              type="button"
              onClick={handleBack}
              className={styles.navBackBtn}
              aria-label="Go back"
            >
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </button>
            <div className={styles.navTitleWrap}>
              <h1 className={styles.navTitle}>QR Details</h1>
            </div>
          </div>

          <div className={styles.navActions}>
            <button
              type="button"
              className={styles.navActionBtn}
              aria-label="Share QR details"
              onClick={() => void handleShare()}
            >
              <Ionicons name="share-social-outline" size={20} color={colors.text} />
            </button>
            <button
              type="button"
              className={styles.navActionBtn}
              aria-label="More QR detail actions"
              onClick={() => setOverflowOpen(true)}
            >
              <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
            </button>
          </div>
        </header>

        {/* ── Scroll Content Container (1:1 with mobile paddingHorizontal: 18) ── */}
        <div className={styles.scrollContent}>
          <div className={styles.mainGrid}>
            <div className={styles.leftCol}>
              {/* 1. Early Community Card when unrated (trust.score < 0 - EarlyCommunityCard.tsx) */}
              {!hasScore && (
                <section className={styles.earlyCommunityCard} aria-label="No community rating yet">
                  <div className={styles.earlyHeader}>
                    <div className={styles.earlyIconWrap}>
                      <Ionicons name="people-outline" size={21} color={colors.primary} />
                    </div>
                    <div className={styles.earlyHeaderCopy}>
                      <p className={styles.earlyEyebrow}>COMMUNITY CHECK</p>
                      <h2 className={styles.earlyTitle}>No community rating yet</h2>
                    </div>
                  </div>

                  <p className={styles.earlyBody}>
                    This QR code has not received a community rating yet. That does not mean it is safe or unsafe — your experience can help the next person.
                  </p>

                  <button
                    type="button"
                    onClick={handleRateCtaPress}
                    className={styles.earlyActionBtn}
                  >
                    <Ionicons
                      name={user ? "flag-outline" : "log-in-outline"}
                      size={16}
                      color={colors.primaryText}
                    />
                    <span>{user ? "Be the first to rate" : "Sign in to rate"}</span>
                    {user && <Ionicons name="arrow-forward" size={15} color={colors.primaryText} />}
                  </button>
                </section>
              )}

              {/* 2. Content Card (Website / Text / Phone - matches mobile QrContentCard.tsx) */}
              <QrContentCard
                content={activeContent}
                contentType={activeContentType}
              />

              {/* 3. Trust Score & Community Metrics Card (matches mobile TrustScoreCard.tsx) */}
              <section className={styles.trustCard} aria-label="Trust Score and Community Votes">
                <div className={styles.scoreHero}>
                  <div className={styles.scoreRingWrap}>
                    <div
                      className={styles.scoreRing}
                      style={{
                        background: `linear-gradient(135deg, ${scoreGradient[0]}, ${scoreGradient[1]})`,
                      }}
                    >
                      <div
                        className={styles.scoreInner}
                        style={{ backgroundColor: isDark ? colors.surface : "#ffffff" }}
                      >
                        {hasScore ? (
                          <div className={styles.scoreNumRow}>
                            <span className={styles.scoreNum} style={{ color: scoreGradient[0] }}>
                              {Math.round(trustInfo.score)}
                            </span>
                            <span className={styles.scorePct} style={{ color: scoreGradient[0] }}>
                              %
                            </span>
                          </div>
                        ) : (
                          <span className={styles.scoreHelpIcon}>
                            <Ionicons name="help-outline" size={28} color={colors.textMuted} />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={styles.scoreMeta}>
                    <h2 className={styles.scoreTitle}>Trust Score</h2>

                    {hasScore ? (
                      <>
                        <div
                          className={styles.scoreLabelBadge}
                          style={{
                            backgroundColor: `${scoreGradient[0]}${isDark ? "22" : "14"}`,
                            borderColor: `${scoreGradient[0]}35`,
                            color: scoreGradient[0],
                          }}
                        >
                          <span>{trustInfo.label}</span>
                        </div>

                        <div
                          className={styles.scoreBar}
                          style={{
                            backgroundColor: isDark ? colors.surfaceLight : colors.background,
                          }}
                        >
                          <div
                            className={styles.scoreBarFill}
                            style={{
                              width: `${Math.min(100, Math.max(0, trustInfo.score))}%`,
                              background: `linear-gradient(90deg, ${scoreGradient[0]}, ${scoreGradient[1]})`,
                            }}
                          />
                        </div>

                        {totalVotes > 0 && (
                          <p className={styles.voteCountText}>
                            {formatCompactNumber(totalVotes)} {totalVotes === 1 ? "vote" : "votes"} cast
                          </p>
                        )}
                      </>
                    ) : (
                      <div className={styles.firstVoteBadge}>
                        <Ionicons name="thumbs-up-outline" size={12} color={colors.primary} />
                        <span>Be the first to vote</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Scans & Votes Grid */}
                <div className={styles.statsGrid}>
                  <div className={`${styles.statCell} ${styles.statCellBorder}`}>
                    <strong className={styles.statNum}>{formatCompactNumber(scanCount)}</strong>
                    <span className={styles.statLabel}>Scans</span>
                  </div>
                  <div className={styles.statCell}>
                    <strong className={styles.statNum}>{formatCompactNumber(totalVotes)}</strong>
                    <span className={styles.statLabel}>Votes</span>
                  </div>
                </div>

                {/* Community Votes Breakdown (Safe / Scam / Fake / Spam) */}
                {votedTypes.length > 0 && (
                  <div className={styles.voteBreakdown}>
                    <p className={styles.breakdownTitle}>COMMUNITY VOTES</p>
                    <div className={styles.breakdownRows}>
                      {votedTypes.map((rt) => {
                        const count = reportCounts[rt.key] || 0;
                        const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                        return (
                          <div key={rt.key} className={styles.breakdownRow}>
                            <div className={styles.breakdownLabelRow}>
                              <Ionicons name={rt.outlineIcon} size={12} color={rt.color} />
                              <span className={styles.breakdownLabel}>{rt.label}</span>
                              <span className={styles.breakdownPct} style={{ color: rt.color }}>
                                {count} {count === 1 ? "person" : "people"}
                              </span>
                            </div>
                            <div className={styles.barTrack}>
                              <div
                                className={styles.barFill}
                                style={{ width: `${pct}%`, backgroundColor: rt.color }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>

              {/* 4. Rate this QR (Safe / Scam / Spam - matches mobile ReportGrid.tsx) */}
              <section
                ref={reportSectionRef}
                className={styles.reportGridContainer}
                aria-label="Rate this QR"
              >
                <div className={styles.reportGridHeader}>
                  <h2 className={styles.reportGridTitle}>Rate this QR</h2>
                  {activeVoteType ? (
                    <div
                      className={styles.votedBadge}
                      style={{
                        backgroundColor: activeVoteType.bg,
                        borderColor: activeVoteType.borderColor,
                        color: activeVoteType.color,
                      }}
                    >
                      <Ionicons name={activeVoteType.icon} size={11} color={activeVoteType.color} />
                      <span>Voted {activeVoteType.label}</span>
                    </div>
                  ) : (
                    <span className={styles.reportGridHint}>Tap to vote</span>
                  )}
                </div>

                <div className={styles.rateBtnRow}>
                  {rateTypes.map((rt) => {
                    const isSelected = userReport === rt.key;
                    return (
                      <button
                        key={rt.key}
                        type="button"
                        onClick={() => void handleReportVote(rt.key)}
                        className={`${styles.rateBtn} ${isSelected ? styles.rateBtnSelected : ""}`}
                        style={
                          isSelected
                            ? {
                                backgroundColor: rt.color + (isDark ? "22" : "14"),
                                borderColor: rt.color,
                                borderWidth: 1.5,
                                color: rt.color,
                                opacity: reportLoading ? 0.65 : 1,
                              }
                            : {
                                backgroundColor: isDark ? colors.surfaceLight : colors.surface,
                                borderColor: colors.surfaceBorder,
                                borderWidth: 1,
                                opacity: reportLoading ? 0.65 : 1,
                              }
                        }
                      >
                        <span className={styles.rateBtnIcon}>
                          <Ionicons
                            name={rt.icon}
                            size={17}
                            color={isSelected ? rt.color : colors.textMuted}
                          />
                        </span>
                        <span
                          className={styles.rateBtnLabel}
                          style={{ color: isSelected ? rt.color : colors.textSecondary }}
                        >
                          {rt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>

            <div className={styles.rightCol}>
              {/* 5. Community Comments Section (matches mobile CommentsSection.tsx) */}
              <section className={styles.commentsContainer} aria-label="Comments">
                <div className={styles.commentsHeader}>
                  <div className={styles.commentsTitleRow}>
                    <h2 className={styles.commentsTitle}>Comments</h2>
                    {commentsList.length > 0 && (
                      <span className={styles.commentCountBadge}>
                        {formatCompactNumber(commentsList.length)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Comment input / auth prompt */}
                {!user ? (
                  <button
                    type="button"
                    onClick={redirectToLogin}
                    className={styles.inlineCommentBarBtn}
                  >
                    <div className={styles.commentInputRow}>
                      <span className={styles.commentPlaceholder}>Add a comment…</span>
                      <span className={styles.sendBtn}>
                        <Ionicons name="send" size={15} color="#ffffff" />
                      </span>
                    </div>
                  </button>
                ) : (
                  <div className={styles.inlineCommentBar}>
                    {replyTo && (
                      <div className={styles.replyBanner}>
                        <Ionicons name="return-down-forward-outline" size={13} color={colors.primary} />
                        <span className={styles.replyBannerText}>
                          Replying to <strong>{replyTo.author}</strong>
                        </span>
                        <button
                          type="button"
                          className={styles.replyCloseBtn}
                          aria-label="Cancel reply"
                          onClick={() => {
                            if (replyTo.isNested) setNewComment("");
                            setReplyTo(null);
                          }}
                        >
                          <Ionicons name="close" size={14} color={colors.textMuted} />
                        </button>
                      </div>
                    )}

                    <div className={styles.commentInputRow}>
                      <textarea
                        ref={commentInputRef}
                        rows={1}
                        maxLength={500}
                        className={styles.commentTextInput}
                        placeholder={replyTo ? `Reply to ${replyTo.author}...` : "Add a comment..."}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            void handleSubmitComment();
                          }
                        }}
                      />
                      <button
                        type="button"
                        disabled={submittingComment || !newComment.trim()}
                        onClick={() => void handleSubmitComment()}
                        className={styles.sendBtn}
                        aria-label="Send comment"
                      >
                        <Ionicons name="send" size={15} color="#ffffff" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Comments list */}
                {topLevelComments.length === 0 ? (
                  <div className={styles.noComments}>
                    <span className={styles.noCommentsIcon}>
                      <Ionicons name="chatbubble-outline" size={36} color={colors.textMuted} />
                    </span>
                    <p className={styles.noCommentsText}>No comments yet</p>
                    <p className={styles.noCommentsSubtext}>Be the first to share your thoughts</p>
                  </div>
                ) : (
                  <div className={styles.commentsThreadList}>
                    {topLevelComments.map((comment) => {
                      const descendants = getAllDescendants(comment.id);
                      const replyCount = descendants.length;
                      const isExpanded = Boolean(expandedReplies[comment.id]);
                      const showCount = visibleRepliesCount[comment.id] || REPLIES_PER_PAGE;
                      const visibleReplies = descendants.slice(0, showCount);
                      const hasMoreReplies = replyCount > showCount;

                      const username = comment.userUsername || "U";
                      const avatarInitial = username.replace(/^@/, "").charAt(0).toUpperCase() || "U";
                      const [gradStart, gradEnd] = getInitialColor(username);

                      return (
                        <div
                          key={comment.id}
                          className={styles.commentThreadBlock}
                          style={{ opacity: deletingCommentId === comment.id ? 0.5 : 1 }}
                        >
                          <div className={styles.commentRow}>
                            <div className={styles.avatarColumn}>
                              <div
                                className={styles.commentAvatar}
                                style={{
                                  background: `linear-gradient(135deg, ${gradStart}, ${gradEnd})`,
                                }}
                              >
                                {comment.userPhotoURL ? (
                                  <img
                                    src={comment.userPhotoURL}
                                    alt={username}
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = "none";
                                      if ((e.target as HTMLElement).nextElementSibling) {
                                        ((e.target as HTMLElement).nextElementSibling as HTMLElement).style.display = "inline";
                                      }
                                    }}
                                    className={styles.commentAvatarImg}
                                  />
                                ) : null}
                                <span style={{ display: comment.userPhotoURL ? "none" : "inline" }}>{avatarInitial}</span>
                              </div>
                              {replyCount > 0 && isExpanded && <div className={styles.threadStem} />}
                            </div>

                            {renderCommentBody(comment, false)}
                          </div>

                          {replyCount > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedReplies((prev) => ({
                                  ...prev,
                                  [comment.id]: !prev[comment.id],
                                }))
                              }
                              className={styles.repliesToggle}
                            >
                              <span className={styles.toggleConnector} />
                              <span className={styles.repliesToggleInner}>
                                <Ionicons
                                  name={isExpanded ? "chevron-up" : "chevron-down"}
                                  size={11}
                                  color={colors.primary}
                                />
                                <span>
                                  {isExpanded
                                    ? "Hide replies"
                                    : `${replyCount} ${replyCount === 1 ? "reply" : "replies"}`}
                                </span>
                              </span>
                            </button>
                          )}

                          {isExpanded && (
                            <div className={styles.repliesWrapper}>
                              {visibleReplies.map((reply, idx) => {
                                const isLast = idx === visibleReplies.length - 1 && !hasMoreReplies;
                                const rUser = reply.userUsername || "U";
                                const rInitial = rUser.replace(/^@/, "").charAt(0).toUpperCase() || "U";
                                const [rGradStart, rGradEnd] = getInitialColor(rUser);

                                return (
                                  <div key={reply.id} className={styles.replyThreadRow}>
                                    <div className={styles.replyConnectorCol}>
                                      {!isLast && <div className={styles.replyVertLine} />}
                                      <div className={styles.replyElbow}>
                                        <div className={styles.elbowV} />
                                        <div className={styles.elbowH} />
                                      </div>
                                    </div>

                                    <div className={styles.replyCommentRow}>
                                      <div
                                        className={`${styles.commentAvatar} ${styles.commentAvatarReply}`}
                                        style={{
                                          background: `linear-gradient(135deg, ${rGradStart}, ${rGradEnd})`,
                                        }}
                                      >
                                        {reply.userPhotoURL ? (
                                          <img
                                            src={reply.userPhotoURL}
                                            alt={rUser}
                                            referrerPolicy="no-referrer"
                                            crossOrigin="anonymous"
                                            onError={(e) => {
                                              (e.target as HTMLElement).style.display = "none";
                                              if ((e.target as HTMLElement).nextElementSibling) {
                                                ((e.target as HTMLElement).nextElementSibling as HTMLElement).style.display = "inline";
                                              }
                                            }}
                                            className={styles.commentAvatarImg}
                                          />
                                        ) : null}
                                        <span style={{ display: reply.userPhotoURL ? "none" : "inline" }}>{rInitial}</span>
                                      </div>
                                      {renderCommentBody(reply, true)}
                                    </div>
                                  </div>
                                );
                              })}

                              {hasMoreReplies && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setVisibleRepliesCount((prev) => ({
                                      ...prev,
                                      [comment.id]: (prev[comment.id] || REPLIES_PER_PAGE) + REPLIES_PER_PAGE,
                                    }))
                                  }
                                  className={styles.showMoreRepliesBtn}
                                >
                                  <Ionicons
                                    name="arrow-down-circle-outline"
                                    size={14}
                                    color={colors.primary}
                                  />
                                  <span>
                                    Show {replyCount - showCount} more{" "}
                                    {replyCount - showCount === 1 ? "reply" : "replies"}
                                  </span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      </div>

      {/* ── Overflow Sheet (1:1 with mobile OverflowSheet.tsx) ── */}
      {overflowOpen && (
        <div
          className={styles.sheetBackdrop}
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOverflowOpen(false);
          }}
        >
          <section className={styles.bottomSheet} role="dialog" aria-modal="true" aria-label="More QR detail actions">
            <div className={styles.sheetHandle} />

            <button
              type="button"
              className={styles.sheetItem}
              onClick={() => {
                setOverflowOpen(false);
                void handleShare();
              }}
            >
              <span className={styles.sheetIconPrimary}>
                <Ionicons name="share-outline" size={20} color={colors.primary} />
              </span>
              <span className={styles.sheetItemCopy}>
                <strong>Share QR Details</strong>
                <small>Send a link to this QR page</small>
              </span>
            </button>

            <button
              type="button"
              className={styles.sheetItem}
              onClick={() => {
                setOverflowOpen(false);
                showToast("Feature Coming Soon!", "time-outline");
              }}
            >
              <span className={styles.sheetIconDanger}>
                <Ionicons name="flag-outline" size={20} color={colors.danger} />
              </span>
              <span className={styles.sheetItemCopy}>
                <strong className={styles.dangerText}>Report QR</strong>
                <small>Flag this QR as suspicious or harmful</small>
              </span>
            </button>
          </section>
        </div>
      )}

      {/* ── Comment Menu Sheet (1:1 with mobile CommentMenuSheet.tsx) ── */}
      {commentMenu && (
        <div
          className={styles.sheetBackdrop}
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCommentMenu(null);
          }}
        >
          <section className={styles.bottomSheet} role="dialog" aria-modal="true" aria-label="Comment options">
            <div className={styles.sheetHandle} />

            {commentMenu.isOwner && (
              <button
                type="button"
                className={styles.sheetItem}
                onClick={() => {
                  const cid = commentMenu.id;
                  setCommentMenu(null);
                  void handleDeleteComment(cid);
                }}
              >
                <span className={styles.sheetIconDanger}>
                  <Ionicons name="trash-outline" size={20} color={colors.danger} />
                </span>
                <span className={styles.sheetItemCopy}>
                  <strong className={styles.dangerText}>Delete comment</strong>
                </span>
              </button>
            )}

            <button
              type="button"
              className={styles.sheetCancelBtn}
              onClick={() => setCommentMenu(null)}
            >
              Cancel
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
