"use client";

import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import type { AppColors } from "@shared/constants/colors";
import { useTheme } from "@/lib/theme-context";
import { useAvatar } from "@/lib/avatar-context";
import { normalizeQrDetailContentType, type ReportKey } from "@shared/utils/qr-detail-rules";
import { isPaymentQr } from "@services/analysis";
import { calculateTrustScore } from "@services/trust/trust-service";
import {
  subscribeToQrReports,
  seedQrReportCountsInMemory,
} from "@services/moderation/report-service";
import { type IoniconName } from "@/lib/mobile-icons";
import { encodeQrShareCode, getQrShareUrl } from "../../../lib/qr-share";
import type { PublicQrRecord } from "../../../lib/qr-data";
import {
  ensureWebQrAndUserExist,
  fetchWebQrReports,
  submitQrReport,
  fetchWebQrComments,
  addQrComment,
  editQrComment,
  reportQrComment,
  reactToQrComment,
  deleteQrComment,
  subscribeToQrComments,
  subscribeToQrStats,
  type WebQrComment,
} from "../../../lib/qr-client";
import { getWebSupabase, isWebSupabaseConfigured } from "../../../lib/supabase";
import {
  QrDetailNavBar,
  QrContentCard,
  TrustScoreCard,
  ReportGrid,
  EarlyCommunityCard,
  CommentsSection,
  QrOverflowSheet,
  CommentMenuSheet,
  CommentReportSheet,
  getResolvedReportTypes,
  getResolvedRateTypes,
} from "@/components/qr-detail";
import styles from "./qr.module.css";

function getScoreGradient(score: number, c: AppColors): [string, string] {
  if (score >= 70) return [c.safe, c.safeShade];
  if (score >= 40) return [c.warning, c.warningShade];
  return [c.danger, c.dangerShade];
}

export default function QrVerificationView({
  record,
}: {
  record: PublicQrRecord;
  code: string;
}) {
  const router = useRouter();
  const qrId = record.id;
  const { colors } = useTheme();
  const { avatarUrl: currentActiveUserAvatar } = useAvatar();

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

  // Content state with immediate client-side recovery and self-healing fallback
  const [activeContent, setActiveContent] = useState<string>(() => {
    const raw = (record.content || "").trim();
    if (raw && raw.toLowerCase() !== "tel:" && raw.length > 4) return raw;
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(`qr_content_${qrId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.content && parsed.content.trim().toLowerCase() !== "tel:") {
            return parsed.content.trim();
          }
        }
      } catch {}
      try {
        const anon = sessionStorage.getItem(`anonymous_qr_${qrId}`);
        if (anon) {
          const parsed = JSON.parse(anon);
          if (parsed?.content && parsed.content.trim().toLowerCase() !== "tel:") {
            return parsed.content.trim();
          }
        }
      } catch {}
    }
    return raw;
  });

  const [activeContentType, setActiveContentType] = useState<string>(() => {
    const raw = (activeContent || record.content || "").trim();
    if (raw) {
      if (isPaymentQr(raw)) return "payment";
      if (/^tel:/i.test(raw) || /^\+?[\d\s\-().]{7,20}$/.test(raw)) return "phone";
      if (/^mailto:/i.test(raw)) return "email";
      if (/^smsto?:/i.test(raw)) return "sms";
      if (/^https?:\/\//i.test(raw)) return "url";
    }
    return record.contentType;
  });

  // Always keep the top URL bar clean with the canonical Base62 share code
  const useIsomorphicLayoutEffect =
    typeof window !== "undefined" ? useLayoutEffect : useEffect;

  useIsomorphicLayoutEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const canonicalCode = encodeQrShareCode(qrId);
      const canonicalPath = `/qr/${canonicalCode}`;
      if (window.location.pathname !== canonicalPath || window.location.search) {
        window.history.replaceState(window.history.state, "", canonicalPath);
      }
    } catch {}
  }, [qrId]);

  // Dynamic Metrics state
  const [reportCounts, setReportCounts] = useState<Record<string, number>>(record.reportCounts || {});
  const [weightedCounts, setWeightedCounts] = useState<Record<string, number>>(record.weightedCounts || {});
  const [userReport, setUserReport] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [scanCount, setScanCount] = useState<number>(() => Math.max(1, record.scanCount || 1));

  // Dynamic comments state
  const [commentsList, setCommentsList] = useState<WebQrComment[]>([]);
  const [commentSort, setCommentSort] = useState<"top" | "newest" | "oldest">("top");

  // Active sheets
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [commentMenu, setCommentMenu] = useState<{ comment: WebQrComment; isOwner: boolean } | null>(null);
  const [reportingComment, setReportingComment] = useState<WebQrComment | null>(null);
  const [submittingReport, setSubmittingReport] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; icon: IoniconName; key: number } | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((message: string, icon: IoniconName = "checkmark-circle") => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, icon, key: Date.now() });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 2200);
  }, []);

  const reportSectionRef = useRef<HTMLDivElement>(null);

  // Sync Supabase reports, auth state, and comments
  useEffect(() => {
    if (record.reportCounts) {
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
        if (reportsRes.value.userReport) {
          setUserReport(reportsRes.value.userReport);
        } else if (currentUser?.id) {
          const userKey = `binro_qr_voted_${currentUser.id}_${qrId}`;
          const localVote = typeof window !== "undefined" ? localStorage.getItem(userKey) : null;
          setUserReport(localVote);
        } else {
          setUserReport(null);
        }
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

    const unsubComments = subscribeToQrComments(qrId, () => {
      if (cancelled) return;
      void supabase.auth.getSession().then(({ data }) => {
        const currentUid = data.session?.user?.id ?? null;
        void fetchWebQrComments(qrId, currentUid).then((freshComments) => {
          if (!cancelled && Array.isArray(freshComments)) {
            setCommentsList(freshComments);
          }
        });
      });
    });

    return () => {
      cancelled = true;
      authSub?.subscription?.unsubscribe();
      unsubReports?.();
      unsubStats?.();
      unsubComments?.();
    };
  }, [qrId, activeContent, activeContentType, record.content, record.contentType, record.reportCounts, record.weightedCounts]);

  // Recalculate dynamic trust score based on report and weighted counts
  const trustInfo = useMemo(() => {
    return calculateTrustScore(reportCounts, weightedCounts, undefined, scanCount);
  }, [reportCounts, weightedCounts, scanCount]);

  const scoreGradient = useMemo(() => {
    return getScoreGradient(trustInfo.score, colors);
  }, [trustInfo.score, colors]);

  const totalVotes = useMemo(() => {
    return Object.values(reportCounts).reduce((acc, v) => acc + (v || 0), 0);
  }, [reportCounts]);

  const hasScore = trustInfo.score >= 0;

  const votedTypes = useMemo(() => {
    return reportTypes.filter((rt) => (reportCounts[rt.key] || 0) > 0);
  }, [reportTypes, reportCounts]);

  // Handlers
  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  const handleShare = async () => {
    const rawShareUrl = getQrShareUrl(qrId);
    const shareUrl =
      rawShareUrl ||
      (typeof window !== "undefined"
        ? `${window.location.origin}/qr/${encodeQrShareCode(qrId) || qrId}`
        : "");

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "BinRo QR Verification",
          text: `Check this QR code's security and trust rating on BinRo: ${shareUrl}`,
          url: shareUrl,
        });
        return;
      } catch (err: any) {
        if (err?.name === "AbortError") return;
      }
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        showToast("Link copied to clipboard", "copy-outline");
      } catch {
        showToast("Could not copy link", "alert-circle-outline");
      }
    }
  };

  const handleRateCtaPress = () => {
    if (!user) {
      redirectToLogin();
      return;
    }
    reportSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleReportVote = async (key: ReportKey) => {
    if (!user) {
      redirectToLogin();
      return;
    }
    if (reportLoading) return;
    const isRemoving = userReport === key;
    const prevCounts = { ...reportCounts };
    const prevUserVote = userReport;

    setReportCounts((prev) => {
      const copy = { ...prev };
      if (prevUserVote && copy[prevUserVote]) {
        copy[prevUserVote] = Math.max(0, copy[prevUserVote] - 1);
      }
      if (!isRemoving) {
        copy[key] = (copy[key] || 0) + 1;
      }
      return copy;
    });
    setUserReport(isRemoving ? null : key);
    setReportLoading(true);

    try {
      const result = await submitQrReport(qrId, key, {
        content: activeContent || record.content,
        contentType: activeContentType || record.contentType,
      });
      setReportCounts(result.reportCounts);
      setWeightedCounts(result.weightedCounts);
      setUserReport(result.userReport);
      const userKey = `binro_qr_voted_${user.id}_${qrId}`;
      if (result.userReport) {
        localStorage.setItem(userKey, result.userReport);
      } else {
        localStorage.removeItem(userKey);
      }
      showToast(
        result.userReport ? `Voted ${key.toUpperCase()}` : "Vote removed",
        "checkmark-circle"
      );
    } catch {
      setReportCounts(prevCounts);
      setUserReport(prevUserVote);
      showToast("Failed to submit rating", "alert-circle-outline");
    } finally {
      setReportLoading(false);
    }
  };

  const handleAddComment = async (text: string, parentId?: string | null) => {
    if (!user) {
      redirectToLogin();
      return;
    }
    const tempId = `temp_${Date.now()}`;
    const optimistic: WebQrComment = {
      id: tempId,
      userId: user.id,
      userName: user.user_metadata?.full_name || "You",
      userUsername: user.user_metadata?.user_name || user.email?.split("@")[0] || "user",
      userPhotoURL: user.user_metadata?.avatar_url || undefined,
      text,
      parentId: parentId || null,
      likes: 0,
      dislikes: 0,
      userLike: null,
      isEdited: false,
      isPinned: false,
      createdAt: new Date().toISOString(),
      replies: [],
    };

    setCommentsList((prev) => [optimistic, ...prev]);

    try {
      const saved = await addQrComment(qrId, text, parentId, {
        content: activeContent || record.content,
        contentType: activeContentType || record.contentType,
      });
      setCommentsList((prev) => prev.map((c) => (c.id === tempId ? saved : c)));
      showToast("Comment posted", "checkmark-circle");
    } catch (err: any) {
      setCommentsList((prev) => prev.filter((c) => c.id !== tempId));
      showToast(err?.message || "Could not post comment", "alert-circle-outline");
    }
  };

  const handleEditComment = async (commentId: string, text: string) => {
    const prevList = commentsList;
    setCommentsList((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, text, isEdited: true } : c)),
    );
    try {
      await editQrComment(qrId, commentId, text);
      showToast("Comment updated", "checkmark-circle");
    } catch (err: any) {
      setCommentsList(prevList);
      showToast(err?.message || "Could not update comment", "alert-circle-outline");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
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

  const handleConfirmReport = async (commentId: string, reason: string) => {
    setSubmittingReport(true);
    try {
      await reportQrComment(qrId, commentId, reason);
      showToast("Thank you. Comment reported.", "checkmark-circle");
    } catch {
      showToast("Report submitted.", "checkmark-circle");
    } finally {
      setSubmittingReport(false);
      setReportingComment(null);
    }
  };

  return (
    <main className={styles.page}>
      {/* ── Floating Toast ── */}
      {toast && (
        <div key={toast.key} className={styles.toastWrap} role="status" aria-live="polite">
          <div className={styles.toastPill}>
            <span className={styles.toastPillText}>{toast.message}</span>
          </div>
        </div>
      )}

      {/* ── Outer Card Wrapper ── */}
      <div className={styles.inner}>
        {/* ── Top Navigation Bar ── */}
        <QrDetailNavBar
          onBack={handleBack}
          onShare={() => void handleShare()}
          onOpenOverflow={() => setOverflowOpen(true)}
        />

        {/* ── Scroll Content Container ── */}
        <div className={styles.scrollContent}>
          <div className={styles.mainGrid}>
            <div className={styles.leftCol}>
              {/* 1. Early Community Card when unrated */}
              {!hasScore && (
                <EarlyCommunityCard
                  isLoggedIn={Boolean(user)}
                  onRateCtaPress={handleRateCtaPress}
                />
              )}

              {/* 2. Content Card (Website / UPI Payment / Phone / Plain text) */}
              <QrContentCard
                content={activeContent}
                contentType={activeContentType}
              />

              {/* 3. Trust Score & Community Metrics Card */}
              <TrustScoreCard
                hasScore={hasScore}
                trustInfo={trustInfo}
                scoreGradient={scoreGradient}
                totalVotes={totalVotes}
                scanCount={scanCount}
                votedTypes={votedTypes}
                reportCounts={reportCounts}
              />

              {/* 4. Rate this QR */}
              <ReportGrid
                rateTypes={rateTypes}
                userReport={userReport}
                reportLoading={reportLoading}
                onReportVote={(key) => void handleReportVote(key)}
                reportSectionRef={reportSectionRef}
              />
            </div>

            <div className={styles.rightCol}>
              {/* 5. Community Comments Section */}
              <CommentsSection
                commentsList={commentsList}
                user={user}
                currentActiveUserAvatar={currentActiveUserAvatar}
                commentSort={commentSort}
                onSortChange={setCommentSort}
                onAddComment={handleAddComment}
                onEditComment={handleEditComment}
                onDeleteComment={(id) => void handleDeleteComment(id)}
                onReactComment={(id, action) => void handleCommentReaction(id, action)}
                onRequestReport={(c) => {
                  if (!user) {
                    redirectToLogin();
                  } else {
                    setReportingComment(c);
                  }
                }}
                onRequireLogin={redirectToLogin}
                onOpenCommentMenu={(c, isOwner) => setCommentMenu({ comment: c, isOwner })}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Overflow Sheet ── */}
      <QrOverflowSheet
        isOpen={overflowOpen}
        onClose={() => setOverflowOpen(false)}
        onShare={() => void handleShare()}
        onReport={() => showToast("Feature Coming Soon!", "time-outline")}
      />

      {/* ── Comment Menu Sheet (Edit / Delete / Report) ── */}
      <CommentMenuSheet
        commentMenu={commentMenu}
        onClose={() => setCommentMenu(null)}
        onDelete={(id) => void handleDeleteComment(id)}
        onReport={(c) => {
          if (!user) {
            redirectToLogin();
          } else {
            setReportingComment(c);
          }
        }}
      />

      {/* ── Comment Reporting Sheet ── */}
      <CommentReportSheet
        reportingComment={reportingComment}
        submittingReport={submittingReport}
        onClose={() => setReportingComment(null)}
        onConfirmReport={(id, reason) => void handleConfirmReport(id, reason)}
      />
    </main>
  );
}
