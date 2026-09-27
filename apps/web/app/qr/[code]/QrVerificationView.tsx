"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import type { PublicQrRecord } from "../../../lib/qr-data";
import {
  calculateWebTrustScore,
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

// ── Mobile Constants & Types ─────────────────────────────────────────────────

type ReportKey = "safe" | "scam" | "fake" | "spam";

interface ReportTypeConfig {
  key: ReportKey;
  label: string;
  color: string;
  dimBg: string;
  borderColor: string;
}

const REPORT_TYPES: ReportTypeConfig[] = [
  {
    key: "safe",
    label: "Safe",
    color: "#059669",
    dimBg: "rgba(5, 150, 105, 0.08)",
    borderColor: "rgba(5, 150, 105, 0.32)",
  },
  {
    key: "scam",
    label: "Scam",
    color: "#DC2626",
    dimBg: "rgba(220, 38, 38, 0.08)",
    borderColor: "rgba(220, 38, 38, 0.32)",
  },
  {
    key: "fake",
    label: "Fake",
    color: "#D97706",
    dimBg: "rgba(217, 119, 6, 0.09)",
    borderColor: "rgba(217, 119, 6, 0.32)",
  },
  {
    key: "spam",
    label: "Spam",
    color: "#0052CC",
    dimBg: "rgba(0, 82, 204, 0.08)",
    borderColor: "rgba(0, 82, 204, 0.32)",
  },
];

const RATE_TYPES = REPORT_TYPES.filter((r) => r.key !== "fake");

const REPORT_LABELS: Record<string, string> = {
  safe: "Safe",
  scam: "Scam",
  fake: "Fake",
  spam: "Spam",
};

const REPLIES_PER_PAGE = 10;
const READ_MORE_THRESHOLD = 200;

function formatCompactNumber(num: number): string {
  if (!Number.isFinite(num) || num < 0) return "0";
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(num);
}

function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "just now";
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return "just now";
  const diffSec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  const diffMo = Math.floor(diffDay / 30);
  if (diffMo < 12) return `${diffMo}mo ago`;
  return `${Math.floor(diffMo / 12)}y ago`;
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

function getScoreColors(score: number): { main: string; shade: string; bg: string; border: string } {
  if (score >= 70) {
    return {
      main: "#059669",
      shade: "#065F46",
      bg: "rgba(5, 150, 105, 0.08)",
      border: "rgba(5, 150, 105, 0.22)",
    };
  }
  if (score >= 40) {
    return {
      main: "#D97706",
      shade: "#B45309",
      bg: "rgba(217, 119, 6, 0.09)",
      border: "rgba(217, 119, 6, 0.22)",
    };
  }
  return {
    main: "#DC2626",
    shade: "#991B1B",
    bg: "rgba(220, 38, 38, 0.08)",
    border: "rgba(220, 38, 38, 0.22)",
  };
}

// ── Icons matching mobile Ionicons ───────────────────────────────────────────

type IconName =
  | "chevron-back"
  | "share-social-outline"
  | "ellipsis-vertical"
  | "ellipsis-horizontal"
  | "people-outline"
  | "flag-outline"
  | "log-in-outline"
  | "arrow-forward"
  | "copy-outline"
  | "checkmark-circle"
  | "open-outline"
  | "help-outline"
  | "thumbs-up-outline"
  | "thumbs-up"
  | "thumbs-down-outline"
  | "thumbs-down"
  | "shield-checkmark"
  | "shield-checkmark-outline"
  | "warning"
  | "warning-outline"
  | "close-circle"
  | "close-circle-outline"
  | "mail-unread"
  | "mail-unread-outline"
  | "chatbubbles-outline"
  | "return-down-forward-outline"
  | "send"
  | "close"
  | "chevron-up"
  | "chevron-down"
  | "arrow-down-circle-outline"
  | "trash-outline"
  | "share-outline"
  | "alert-circle-outline"
  | "time-outline";

function IonIcon({ name, size = 18 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    style: { flexShrink: 0 },
  };

  switch (name) {
    case "chevron-back":
      return <svg {...common}><path d="m15 18-6-6 6-6" /></svg>;
    case "share-social-outline":
    case "share-outline":
      return (
        <svg {...common}>
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" />
        </svg>
      );
    case "ellipsis-vertical":
      return (
        <svg {...common}>
          <circle cx="12" cy="5" r="1.2" fill="currentColor" />
          <circle cx="12" cy="12" r="1.2" fill="currentColor" />
          <circle cx="12" cy="19" r="1.2" fill="currentColor" />
        </svg>
      );
    case "ellipsis-horizontal":
      return (
        <svg {...common}>
          <circle cx="5" cy="12" r="1.2" fill="currentColor" />
          <circle cx="12" cy="12" r="1.2" fill="currentColor" />
          <circle cx="19" cy="12" r="1.2" fill="currentColor" />
        </svg>
      );
    case "people-outline":
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "flag-outline":
      return (
        <svg {...common}>
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
          <line x1="4" x2="4" y1="22" y2="15" />
        </svg>
      );
    case "log-in-outline":
      return (
        <svg {...common}>
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          <polyline points="10 17 15 12 10 7" />
          <line x1="15" x2="3" y1="12" y2="12" />
        </svg>
      );
    case "arrow-forward":
      return (
        <svg {...common}>
          <line x1="5" x2="19" y1="12" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      );
    case "copy-outline":
      return (
        <svg {...common}>
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
        </svg>
      );
    case "checkmark-circle":
      return (
        <svg {...common}>
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <path d="m9 11 3 3L22 4" />
        </svg>
      );
    case "open-outline":
      return (
        <svg {...common}>
          <path d="M15 3h6v6" />
          <path d="M10 14 21 3" />
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        </svg>
      );
    case "help-outline":
      return (
        <svg {...common}>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <path d="M12 17h.01" />
        </svg>
      );
    case "thumbs-up":
      return (
        <svg {...common} fill="currentColor" stroke="currentColor" strokeWidth={1.5}>
          <path d="M7 10v12" />
          <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
        </svg>
      );
    case "thumbs-up-outline":
      return (
        <svg {...common}>
          <path d="M7 10v12" />
          <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
        </svg>
      );
    case "thumbs-down":
      return (
        <svg {...common} fill="currentColor" stroke="currentColor" strokeWidth={1.5}>
          <path d="M17 14V2" />
          <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z" />
        </svg>
      );
    case "thumbs-down-outline":
      return (
        <svg {...common}>
          <path d="M17 14V2" />
          <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z" />
        </svg>
      );
    case "shield-checkmark":
    case "shield-checkmark-outline":
      return (
        <svg {...common}>
          <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case "warning":
    case "warning-outline":
      return (
        <svg {...common}>
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      );
    case "close-circle":
    case "close-circle-outline":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <path d="m15 9-6 6" />
          <path d="m9 9 6 6" />
        </svg>
      );
    case "mail-unread":
    case "mail-unread-outline":
      return (
        <svg {...common}>
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      );
    case "chatbubbles-outline":
      return (
        <svg {...common}>
          <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
        </svg>
      );
    case "return-down-forward-outline":
      return (
        <svg {...common}>
          <polyline points="15 10 20 15 15 20" />
          <path d="M4 4v7a4 4 0 0 0 4 4h12" />
        </svg>
      );
    case "send":
      return (
        <svg {...common}>
          <path d="m22 2-7 20-4-9-9-4Z" />
          <path d="M22 2 11 13" />
        </svg>
      );
    case "close":
      return (
        <svg {...common}>
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      );
    case "chevron-up":
      return <svg {...common}><path d="m18 15-6-6-6 6" /></svg>;
    case "chevron-down":
      return <svg {...common}><path d="m6 9 6 6 6-6" /></svg>;
    case "arrow-down-circle-outline":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v8" />
          <path d="m8 12 4 4 4-4" />
        </svg>
      );
    case "trash-outline":
      return (
        <svg {...common}>
          <path d="M3 6h18" />
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        </svg>
      );
    case "time-outline":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
      );
  }
}

function getReportIconName(key: ReportKey, outline = false): IconName {
  if (key === "safe") return outline ? "shield-checkmark-outline" : "shield-checkmark";
  if (key === "scam") return outline ? "warning-outline" : "warning";
  if (key === "fake") return outline ? "close-circle-outline" : "close-circle";
  return outline ? "mail-unread-outline" : "mail-unread";
}

// ── Sub-components matching mobile QrDetailScreen ────────────────────────────

function QrContentCard({
  content,
  contentType,
}: {
  content: string;
  contentType: string;
}) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const isUrl =
    contentType.toLowerCase() === "url" ||
    /^https?:\/\//i.test(content.trim()) ||
    (/^[a-z0-9-]+(\.[a-z0-9-]+)+\/?/i.test(content.trim()) && !content.trim().includes(" "));

  const fullUrl = isUrl
    ? /^https?:\/\//i.test(content.trim())
      ? content.trim()
      : `https://${content.trim()}`
    : content;

  let hostname = content.trim();
  if (isUrl) {
    try {
      hostname = new URL(fullUrl).hostname.replace(/^www\./, "");
    } catch {
      hostname = content.trim();
    }
  }

  const handleCopy = async (valueToCopy: string) => {
    try {
      await navigator.clipboard.writeText(valueToCopy);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  if (isUrl) {
    return (
      <section className={styles.contentCard} aria-label="Scanned website details">
        <div className={styles.contentCardRow}>
          <strong className={styles.domainTitle} title={hostname}>
            {hostname}
          </strong>
          <button
            type="button"
            onClick={() => void handleCopy(fullUrl)}
            className={`${styles.copyBtn} ${copied ? styles.copyBtnCopied : ""}`}
            aria-label="Copy link"
          >
            <IonIcon name={copied ? "checkmark-circle" : "copy-outline"} size={14} />
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
          <IonIcon name="open-outline" size={14} />
        </a>
      </section>
    );
  }

  const isLong = content.length > 120 || content.includes("\n");
  return (
    <section className={styles.contentCard} aria-label="Scanned text content">
      <div className={styles.contentCardRow}>
        <strong className={styles.domainTitle}>Text</strong>
        <button
          type="button"
          onClick={() => void handleCopy(content)}
          className={`${styles.copyBtn} ${copied ? styles.copyBtnCopied : ""}`}
          aria-label="Copy text"
        >
          <IonIcon name={copied ? "checkmark-circle" : "copy-outline"} size={14} />
          <span>{copied ? "Copied!" : "Copy"}</span>
        </button>
      </div>

      <div className={styles.rawBox}>
        <p className={`${styles.rawText} ${!expanded && isLong ? styles.rawTextClamped : ""}`}>
          {content}
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

// ── Main QR Details View (1:1 with mobile QrDetailScreen) ────────────────────

export default function QrVerificationView({
  record,
}: {
  record: PublicQrRecord;
  code: string;
}) {
  const router = useRouter();
  const qrId = record.id;

  // Auth state
  const [user, setUser] = useState<User | null>(null);

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
  const [toast, setToast] = useState<{ message: string; icon: IconName; key: number } | null>(null);

  const reportSectionRef = useRef<HTMLDivElement | null>(null);
  const commentInputRef = useRef<HTMLTextAreaElement | null>(null);

  const showToast = useCallback((message: string, icon: IconName = "checkmark-circle") => {
    setToast((prev) => ({ message, icon, key: (prev?.key ?? 0) + 1 }));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(t);
  }, [toast]);

  // 1. Auth session listener + ensure QR row exists in Supabase + load live reports & comments
  useEffect(() => {
    if (!isWebSupabaseConfigured()) return;
    const supabase = getWebSupabase();
    let cancelled = false;

    const loadAll = async (currentUser: User | null) => {
      if (record.content) {
        void ensureWebQrAndUserExist(qrId, currentUser, {
          content: record.content,
          contentType: record.contentType,
        });
      }
      const [reportsRes, commentsRes] = await Promise.allSettled([
        fetchWebQrReports(qrId, currentUser?.id ?? null),
        fetchWebQrComments(qrId, currentUser?.id ?? null),
      ]);

      if (cancelled) return;

      if (reportsRes.status === "fulfilled") {
        setReportCounts(reportsRes.value.reportCounts);
        setWeightedCounts(reportsRes.value.weightedCounts);
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

    const unsubStats = subscribeToQrStats(qrId, (stats) => {
      if (!cancelled) {
        setScanCount(Math.max(1, stats.scanCount));
      }
    });

    return () => {
      cancelled = true;
      authSub.subscription.unsubscribe();
      unsubStats();
    };
  }, [qrId, record.content, record.contentType]);

  // 2. Real trust score computed from real Supabase reportCounts & weightedCounts
  const trustInfo = useMemo(() => {
    return calculateWebTrustScore(reportCounts, weightedCounts);
  }, [reportCounts, weightedCounts]);

  const totalVotes = useMemo(
    () => REPORT_TYPES.reduce((sum, r) => sum + (reportCounts[r.key] || 0), 0),
    [reportCounts],
  );
  const votedTypes = useMemo(
    () => REPORT_TYPES.filter((r) => (reportCounts[r.key] || 0) > 0),
    [reportCounts],
  );
  const hasScore = trustInfo.score >= 0;
  const scoreColors = hasScore
    ? getScoreColors(trustInfo.score)
    : {
        main: "#7A99BC",
        shade: "#D4E0F5",
        bg: "rgba(122, 153, 188, 0.1)",
        border: "rgba(122, 153, 188, 0.25)",
      };

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
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  const handleShare = async () => {
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Share QR Details",
          text: `View this QR code's safety details: ${shareUrl}`,
          url: shareUrl,
        });
        return;
      } catch {
        // User cancelled or share failed
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
      router.push("/auth?mode=login");
      return;
    }
    reportSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleReportVote = async (type: ReportKey) => {
    if (!user) {
      router.push("/auth?mode=login");
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

    if (isRemoving) {
      showToast(`Removed ${REPORT_LABELS[type] ?? type} vote`, "close-circle-outline");
    } else {
      showToast(`Voted ${REPORT_LABELS[type] ?? type}`, getReportIconName(type));
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
      router.push("/auth?mode=login");
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

    const optimistic: WebQrComment = {
      id: tempId,
      userId: user.id,
      userName: displayName,
      userUsername: username,
      userPhotoURL: user.user_metadata?.avatar_url,
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
      router.push("/auth?mode=login");
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
      router.push("/auth?mode=login");
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
            <IonIcon name="ellipsis-horizontal" size={16} />
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
            <IonIcon
              name={comment.userLike === "like" ? "thumbs-up" : "thumbs-up-outline"}
              size={13}
            />
            {comment.likes > 0 && <span>{formatCompactNumber(comment.likes)}</span>}
          </button>

          <button
            type="button"
            onClick={() => void handleCommentReaction(comment.id, "dislike")}
            className={`${styles.actionPill} ${comment.userLike === "dislike" ? styles.actionPillDisliked : ""}`}
            aria-label="Dislike comment"
          >
            <IonIcon
              name={comment.userLike === "dislike" ? "thumbs-down" : "thumbs-down-outline"}
              size={13}
            />
            {comment.dislikes > 0 && <span>{formatCompactNumber(comment.dislikes)}</span>}
          </button>

          <button
            type="button"
            onClick={() => handleReplyClick(comment)}
            className={styles.actionPill}
          >
            <IonIcon name="return-down-forward-outline" size={13} />
            <span>Reply</span>
          </button>
        </div>
      </div>
    );
  };

  const activeVoteType = RATE_TYPES.find((rt) => rt.key === userReport);

  return (
    <main className={styles.page}>
      {/* ── Floating Toast (matches mobile QrToast) ── */}
      {toast && (
        <div key={toast.key} className={styles.toastWrap} role="status" aria-live="polite">
          <div className={styles.toastPill}>
            <IonIcon name={toast.icon} size={16} />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* ── Top Navigation Bar (matches mobile QrDetailNavBar) ── */}
      <header className={styles.navBar}>
        <div className={styles.navLeft}>
          <button
            type="button"
            onClick={handleBack}
            className={styles.navBackBtn}
            aria-label="Go back"
          >
            <IonIcon name="chevron-back" size={22} />
          </button>
          <h1 className={styles.navTitle}>QR Details</h1>
        </div>

        <div className={styles.navActions}>
          <button
            type="button"
            className={styles.navActionBtn}
            aria-label="Share QR details"
            onClick={() => void handleShare()}
          >
            <IonIcon name="share-social-outline" size={19} />
          </button>
          <button
            type="button"
            className={styles.navActionBtn}
            aria-label="More QR detail actions"
            onClick={() => setOverflowOpen(true)}
          >
            <IonIcon name="ellipsis-vertical" size={19} />
          </button>
        </div>
      </header>

      {/* ── Scroll Content Container ── */}
      <div className={styles.scrollContent}>
        {/* 1. Early Community Card when no rating exists yet (trust.score < 0) */}
        {!hasScore && (
          <section className={styles.earlyCommunityCard} aria-label="No community rating yet">
            <div className={styles.earlyHeader}>
              <div className={styles.earlyIconWrap}>
                <IonIcon name="people-outline" size={21} />
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
              <IonIcon name={user ? "flag-outline" : "log-in-outline"} size={16} />
              <span>{user ? "Be the first to rate" : "Sign in to rate"}</span>
              {user && <IonIcon name="arrow-forward" size={15} />}
            </button>
          </section>
        )}

        {/* 2. Content Card (Website domain name or Text — matches mobile QrContentCard) */}
        <QrContentCard
          content={record.content}
          contentType={record.contentType}
        />

        {/* 3. Trust Score & Community Metrics Card (matches mobile TrustScoreCard) */}
        <section className={styles.trustCard} aria-label="Trust Score and Community Votes">
          <div className={styles.scoreHero}>
            <div className={styles.scoreRingWrap}>
              <div
                className={styles.scoreRing}
                style={{
                  background: hasScore
                    ? `linear-gradient(135deg, ${scoreColors.main}, ${scoreColors.shade})`
                    : "linear-gradient(135deg, #7A99BC, #D4E0F5)",
                }}
              >
                <div className={styles.scoreInner}>
                  {hasScore ? (
                    <div className={styles.scoreNumRow}>
                      <span className={styles.scoreNum} style={{ color: scoreColors.main }}>
                        {Math.round(trustInfo.score)}
                      </span>
                      <span className={styles.scorePct} style={{ color: scoreColors.main }}>
                        %
                      </span>
                    </div>
                  ) : (
                    <span className={styles.scoreHelpIcon}>
                      <IonIcon name="help-outline" size={28} />
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
                      backgroundColor: scoreColors.bg,
                      borderColor: scoreColors.border,
                      color: scoreColors.main,
                    }}
                  >
                    <span>{trustInfo.label}</span>
                  </div>

                  <div className={styles.scoreBar}>
                    <div
                      className={styles.scoreBarFill}
                      style={{
                        width: `${Math.min(100, Math.max(0, trustInfo.score))}%`,
                        background: `linear-gradient(90deg, ${scoreColors.main}, ${scoreColors.shade})`,
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
                  <IonIcon name="thumbs-up-outline" size={12} />
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
                        <span style={{ color: rt.color, display: "inline-flex" }}>
                          <IonIcon name={getReportIconName(rt.key, true)} size={13} />
                        </span>
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

        {/* 4. Rate this QR (Safe / Scam / Spam — matches mobile ReportGrid) */}
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
                  backgroundColor: activeVoteType.dimBg,
                  borderColor: activeVoteType.borderColor,
                  color: activeVoteType.color,
                }}
              >
                <IonIcon name={getReportIconName(activeVoteType.key)} size={11} />
                <span>Voted {activeVoteType.label}</span>
              </div>
            ) : (
              <span className={styles.reportGridHint}>Tap to vote</span>
            )}
          </div>

          <div className={styles.rateBtnRow}>
            {RATE_TYPES.map((rt) => {
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
                          backgroundColor: rt.dimBg,
                          borderColor: rt.color,
                          color: rt.color,
                          opacity: reportLoading ? 0.65 : 1,
                        }
                      : {
                          opacity: reportLoading ? 0.65 : 1,
                        }
                  }
                >
                  <span
                    className={styles.rateBtnIcon}
                    style={{ color: isSelected ? rt.color : "#7A99BC" }}
                  >
                    <IonIcon name={getReportIconName(rt.key)} size={18} />
                  </span>
                  <span
                    className={styles.rateBtnLabel}
                    style={{ color: isSelected ? rt.color : "#3A5278" }}
                  >
                    {rt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 5. Community Comments Section (matches mobile CommentsSection & CommentItem) */}
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
              onClick={() => router.push("/auth?mode=login")}
              className={styles.inlineCommentBarBtn}
            >
              <div className={styles.commentInputRow}>
                <span className={styles.commentPlaceholder}>Add a comment…</span>
                <span className={styles.sendBtn}>
                  <IonIcon name="send" size={15} />
                </span>
              </div>
            </button>
          ) : (
            <div className={styles.inlineCommentBar}>
              {replyTo && (
                <div className={styles.replyBanner}>
                  <span style={{ color: "#0052CC", display: "inline-flex" }}>
                    <IonIcon name="return-down-forward-outline" size={13} />
                  </span>
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
                    <IonIcon name="close" size={14} />
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
                  <IonIcon name="send" size={15} />
                </button>
              </div>
            </div>
          )}

          {/* Comments list */}
          {topLevelComments.length === 0 ? (
            <div className={styles.noComments}>
              <span className={styles.noCommentsIcon}>
                <IonIcon name="chatbubbles-outline" size={36} />
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
                          <span>{avatarInitial}</span>
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
                          <IonIcon name={isExpanded ? "chevron-up" : "chevron-down"} size={11} />
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
                                  <span>{rInitial}</span>
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
                            <IonIcon name="arrow-down-circle-outline" size={14} />
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

      {/* ── Overflow Sheet (matches mobile OverflowSheet) ── */}
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
                <IonIcon name="share-outline" size={20} />
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
                <IonIcon name="flag-outline" size={20} />
              </span>
              <span className={styles.sheetItemCopy}>
                <strong className={styles.dangerText}>Report QR</strong>
                <small>Flag this QR as suspicious or harmful</small>
              </span>
            </button>
          </section>
        </div>
      )}

      {/* ── Comment Menu Sheet (matches mobile CommentMenuSheet) ── */}
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
                  <IonIcon name="trash-outline" size={20} />
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

