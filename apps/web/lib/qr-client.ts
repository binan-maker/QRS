/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BINRO WEB: CLIENT QR SERVICE BRIDGE
 * ───────────────────────────────────────────────────────────────────────────────
 * Directly imports and delegates trust score calculation, community vote fetching,
 * vote submission, and live report subscriptions from the mobile source:
 *   - @services/trust/trust-service
 *   - @services/moderation/report-service
 *   - @shared/utils/qr-content
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { Session, User } from "@supabase/supabase-js";
import {
  calculateTrustScore as calculateMobileTrustScore,
  type TrustScore,
} from "@services/trust/trust-service";
import {
  getQrReportData,
  getUserQrReport,
  reportQrCode,
  subscribeToQrReports,
  seedQrReportCountsInMemory,
  type QrReportMeta,
} from "@services/moderation/report-service";
import { detectContentType } from "@shared/utils/qr-content";
import { getWebSupabase } from "./supabase";

export {
  subscribeToQrReports,
  seedQrReportCountsInMemory,
  type QrReportMeta,
};

export type WebQrComment = {
  id: string;
  userId: string;
  userName: string;
  userUsername: string;
  userPhotoURL?: string;
  text: string;
  parentId: string | null;
  likes: number;
  dislikes: number;
  userLike: "like" | "dislike" | null;
  isEdited: boolean;
  isPinned?: boolean;
  reportCount?: number;
  createdAt: string | null;
  updatedAt?: string | null;
  replies: WebQrComment[];
};

export type WebTrustScore = TrustScore;

export type QrForeignKey = { qr_code_id: string };

function parseTimeMs(val: any): number {
  if (!val) return 0;
  if (typeof val === "number") return val;
  const ms = new Date(val).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

/**
 * Delegates directly to mobile @services/trust/trust-service
 */
export function calculateWebTrustScore(
  reportCounts: Record<string, number>,
  weightedCounts?: Record<string, number>,
): WebTrustScore {
  return calculateMobileTrustScore(reportCounts, weightedCounts);
}

function loadLocalCommentDislikes(qrId: string): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(`comment_dislike_counts_${qrId}`);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function saveLocalCommentDislikes(qrId: string, map: Record<string, number>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`comment_dislike_counts_${qrId}`, JSON.stringify(map));
  } catch {}
}

function loadLocalUserCommentLikes(qrId: string, userId: string | null): Record<string, "like" | "dislike"> {
  if (typeof window === "undefined" || !userId) return {};
  try {
    const raw = localStorage.getItem(`comment_reactions_${qrId}_${userId}`);
    return raw ? (JSON.parse(raw) as Record<string, "like" | "dislike">) : {};
  } catch {
    return {};
  }
}

function saveLocalUserCommentLikes(
  qrId: string,
  userId: string,
  map: Record<string, "like" | "dislike">,
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`comment_reactions_${qrId}_${userId}`, JSON.stringify(map));
  } catch {}
}

export async function currentSession(): Promise<Session> {
  const { data, error } = await getWebSupabase().auth.getSession();
  if (error) throw error;
  if (!data.session?.user || !data.session.access_token) {
    throw new Error("Sign in to use this community feature.");
  }
  return data.session;
}

export async function ensureWebQrAndUserExist(
  qrId: string,
  user?: User | null,
  qrMeta?: { content?: string; contentType?: string },
  userProfile?: { displayName?: string; username?: string; photoURL?: string | null },
): Promise<{
  userName: string;
  userUsername: string;
  userPhotoURL?: string;
  accountAgeDays: number;
  emailVerified: boolean;
}> {
  const supabase = getWebSupabase();
  const now = new Date().toISOString();

  // 1. Ensure qr_codes row exists (and self-heal any corrupted "tel:" rows)
  try {
    const { data: existingQr } = await supabase
      .from("qr_codes")
      .select("id, content")
      .eq("id", qrId)
      .maybeSingle();

    const newContent = qrMeta?.content?.trim();
    const hasValidNewContent = Boolean(
      newContent &&
      newContent.length > 4 &&
      newContent.toLowerCase() !== "tel:" &&
      !/^(tel|sms|smsto|mailto):?$/i.test(newContent)
    );

    const isCorrupted =
      !existingQr?.content ||
      existingQr.content.trim().toLowerCase() === "tel:" ||
      /^(tel|sms|smsto|mailto):?$/i.test(existingQr.content.trim());

    if (!existingQr) {
      const content = newContent || qrId;
      const contentType = qrMeta?.contentType || detectContentType(content);
      const { error: upsertErr } = await supabase.from("qr_codes").upsert(
        {
          id: qrId,
          content,
          content_type: contentType,
          scan_count: 1,
          comment_count: 0,
          created_at: now,
          updated_at: now,
        },
        { onConflict: "id" },
      );
      if (upsertErr) {
        await supabase.from("qr_codes").upsert(
          {
            id: qrId,
            content,
            content_type: contentType,
            scan_count: 1,
            comment_count: 0,
            created_at: now,
          },
          { onConflict: "id" },
        );
      }
    } else if (isCorrupted && hasValidNewContent && newContent) {
      const contentType = qrMeta?.contentType || detectContentType(newContent);
      await supabase
        .from("qr_codes")
        .update({
          content: newContent,
          content_type: contentType,
        })
        .eq("id", qrId);
    }
  } catch {}

  if (!user) {
    return {
      userName: "User",
      userUsername: "user",
      accountAgeDays: 0,
      emailVerified: false,
    };
  }

  // 2. Ensure users row exists and keep photo_url & name updated
  const customLocalPhoto =
    typeof window !== "undefined" && user.id
      ? localStorage.getItem(`user_custom_avatar_${user.id}`) ||
        localStorage.getItem(`user_avatar_${user.id}`) ||
        localStorage.getItem("qrg:avatar:url")
      : null;

  let resolvedPhotoURL =
    userProfile?.photoURL ||
    customLocalPhoto ||
    user.user_metadata?.custom_avatar_url ||
    user.user_metadata?.avatar_url ||
    user.user_metadata?.picture ||
    user.user_metadata?.photo_url ||
    user.user_metadata?.photoURL ||
    undefined;

  let userName =
    userProfile?.displayName ||
    user.user_metadata?.display_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.username ||
    user.email?.split("@")[0] ||
    "User";

  let rawUsername = (
    userProfile?.username ||
    user.user_metadata?.username ||
    user.email?.split("@")[0] ||
    user.user_metadata?.user_name ||
    user.user_metadata?.display_name ||
    user.user_metadata?.full_name ||
    `user_${user.id.slice(0, 8)}`
  )
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9_]/g, "") || `user_${user.id.slice(0, 8)}`;

  let accountAgeDays = 0;
  const emailVerified = Boolean(user.email_confirmed_at);

  try {
    const { data: existingUser } = await supabase
      .from("users")
      .select("id, display_name, username, photo_url, avatar_url, created_at")
      .eq("id", user.id)
      .maybeSingle();

    if (existingUser) {
      userName = userProfile?.displayName || existingUser.display_name || existingUser.username || userName;
      if (userProfile?.username || existingUser.username) {
        rawUsername = String(userProfile?.username || existingUser.username)
          .toLowerCase()
          .replace(/\s+/g, "")
          .replace(/[^a-z0-9_]/g, "") || rawUsername;
      }
      const dbPhoto = existingUser.photo_url || existingUser.avatar_url;
      if (dbPhoto) {
        resolvedPhotoURL = dbPhoto;
      }
      const createdMs = parseTimeMs(existingUser.created_at);
      if (createdMs > 0) {
        accountAgeDays = Math.max(0, Math.floor((Date.now() - createdMs) / 86400000));
      }

      // Sync latest profile changes into users table only if explicitly modified
      const updates: Record<string, any> = { updated_at: now };
      if (userProfile?.photoURL && userProfile.photoURL !== dbPhoto) {
        updates.photo_url = userProfile.photoURL;
        updates.avatar_url = userProfile.photoURL;
        resolvedPhotoURL = userProfile.photoURL;
      }
      if (userProfile?.displayName && existingUser.display_name !== userProfile.displayName) {
        updates.display_name = userProfile.displayName;
      }
      if (userProfile?.username && existingUser.username !== userProfile.username) {
        updates.username = rawUsername;
      } else if (!existingUser.username && rawUsername) {
        updates.username = rawUsername;
      }
      if (Object.keys(updates).length > 1) {
        await supabase.from("users").update(updates).eq("id", user.id);
      }
    } else {
      await supabase.from("users").upsert(
        {
          id: user.id,
          email: user.email ?? `${user.id}@user.qrguard.app`,
          display_name: userName,
          username: rawUsername || `user_${user.id.slice(0, 8)}`,
          photo_url: resolvedPhotoURL ?? null,
          avatar_url: resolvedPhotoURL ?? null,
          email_verified: emailVerified,
          created_at: user.created_at ?? now,
          updated_at: now,
        },
        { onConflict: "id" },
      );
    }
  } catch {}

  return {
    userName,
    userUsername: rawUsername,
    userPhotoURL: resolvedPhotoURL,
    accountAgeDays,
    emailVerified,
  };
}

/**
 * Fetches community votes & trust score directly using mobile @services/moderation/report-service
 * and @services/trust/trust-service.
 */
export async function fetchWebQrReports(
  qrId: string,
  userId?: string | null,
): Promise<{
  reportCounts: Record<string, number>;
  weightedCounts: Record<string, number>;
  userReport: string | null;
  trust: WebTrustScore;
}> {
  const [reportData, userReport] = await Promise.all([
    getQrReportData(qrId),
    userId ? getUserQrReport(qrId, userId) : Promise.resolve(null),
  ]);

  const reportCounts = reportData.counts;
  const weightedCounts = reportData.weighted;
  const trust = calculateMobileTrustScore(reportCounts, weightedCounts);

  return { reportCounts, weightedCounts, userReport, trust };
}

/**
 * Submits a QR vote directly using mobile reportQrCode from @services/moderation/report-service.
 */
export async function submitQrReport(
  qrId: string,
  reportType: string,
  qrMeta?: QrReportMeta,
): Promise<{
  action: "created" | "updated" | "removed";
  userReport: string | null;
  reportCounts: Record<string, number>;
  weightedCounts: Record<string, number>;
  trust: WebTrustScore;
}> {
  const session = await currentSession();
  const userId = session.user.id;
  const { emailVerified } = await ensureWebQrAndUserExist(qrId, session.user, qrMeta);

  const { action } = await reportQrCode(
    qrId,
    userId,
    reportType,
    emailVerified,
    qrMeta,
  );

  const updated = await fetchWebQrReports(qrId, userId);
  return {
    action,
    ...updated,
  };
}

export async function fetchWebQrComments(
  qrId: string,
  userId?: string | null,
): Promise<WebQrComment[]> {
  const supabase = getWebSupabase();
  const { data, error } = await supabase
    .from("qr_comments")
    .select("*")
    .eq("qr_code_id", qrId)
    .order("created_at", { ascending: false })
    .limit(150);

  if (error) throw error;
  const rows = ((data ?? []) as Record<string, any>[]).filter(
    (r) =>
      !r.is_deleted &&
      r.text !== "[deleted]" &&
      !String(r.text ?? "").startsWith("__qr_vote__:"),
  );

  // Enrich with public_profiles / users
  const userIds = Array.from(
    new Set(rows.map((r) => String(r.user_id ?? "")).filter(Boolean)),
  );
  const profileMap = new Map<string, { username?: string; displayName?: string; photoURL?: string }>();

  // Immediately seed from local storage for quick responsive rendering
  if (typeof window !== "undefined") {
    for (const uid of userIds) {
      try {
        const cached = localStorage.getItem(`binro_profile_${uid}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && (parsed.username || parsed.photoUrl)) {
            profileMap.set(uid, {
              username: parsed.username ? String(parsed.username).replace(/^@/, "").replace(/\s+/g, "").replace(/[^a-zA-Z0-9_]/g, "").toLowerCase() : undefined,
              displayName: parsed.displayName,
              photoURL: parsed.photoUrl,
            });
          }
        }
      } catch {}
    }
  }

  if (userIds.length > 0) {
    try {
      const { data: userRows } = await supabase
        .from("users")
        .select("id, email, username, display_name, photo_url, avatar_url")
        .in("id", userIds);

      if (Array.isArray(userRows)) {
        for (const u of userRows as any[]) {
          const uid = String(u?.id ?? "");
          if (uid) {
            const photo = u.photo_url || u.avatar_url || undefined;
            const candidateU =
              u.username ||
              u.email?.split("@")[0] ||
              u.display_name ||
              undefined;
            const cleanU = candidateU
              ? String(candidateU)
                  .replace(/^@/, "")
                  .replace(/\s+/g, "")
                  .replace(/[^a-zA-Z0-9_]/g, "")
                  .toLowerCase()
              : undefined;
            profileMap.set(uid, {
              username: cleanU,
              displayName: u.display_name || undefined,
              photoURL: photo,
            });
            if (typeof window !== "undefined") {
              try {
                localStorage.setItem(
                  `binro_profile_${uid}`,
                  JSON.stringify({
                    username: cleanU,
                    displayName: u.display_name,
                    photoUrl: photo,
                  })
                );
              } catch {}
            }
          }
        }
      }
    } catch {}
  }

  // Load user's likes from comment_likes + local cache
  const localReactions = loadLocalUserCommentLikes(qrId, userId ?? null);
  const localDislikes = loadLocalCommentDislikes(qrId);
  const dbReactions: Record<string, "like" | "dislike"> = { ...localReactions };

  if (userId && rows.length > 0) {
    try {
      const commentIds = rows.map((r) => String(r.id));
      const { data: likeRows } = await supabase
        .from("comment_likes")
        .select("comment_id")
        .eq("user_id", userId)
        .in("comment_id", commentIds);
      if (Array.isArray(likeRows)) {
        for (const lr of likeRows as any[]) {
          const cid = String(lr.comment_id ?? "");
          if (cid && !dbReactions[cid]) {
            dbReactions[cid] = "like";
          }
        }
      }
    } catch {}
  }

  return rows.map((record) => {
    const cid = String(record.id);
    const uid = String(record.user_id ?? "");
    const prof = profileMap.get(uid);

    const localPhoto =
      typeof window !== "undefined" && uid
        ? localStorage.getItem(`user_custom_avatar_${uid}`) ||
          localStorage.getItem(`user_avatar_${uid}`)
        : null;

    // User requested ONLY username with @. No full names or display names, and absolutely NO SPACES!
    const candidateUsername = String(prof?.username || record.user_name || "user");
    const rawUsername = candidateUsername
      .replace(/^@/, "")
      .replace(/\s+/g, "")
      .replace(/[^a-zA-Z0-9_]/g, "")
      .toLowerCase() || "user";
    const handleWithAt = `@${rawUsername}`;
    return {
      id: cid,
      userId: uid,
      userName: handleWithAt,
      userUsername: rawUsername,
      userPhotoURL: prof?.photoURL || localPhoto || undefined,
      text: String(record.text ?? ""),
      parentId: record.parent_id ? String(record.parent_id) : null,
      likes: Math.max(0, Number(record.likes ?? 0)),
      dislikes: Math.max(0, Number(localDislikes[cid] ?? 0)),
      userLike: dbReactions[cid] ?? null,
      isEdited: Boolean(record.is_edited),
      isPinned: Boolean(record.is_pinned),
      reportCount: Number(record.report_count ?? 0),
      createdAt: record.created_at ?? null,
      updatedAt: record.updated_at ?? null,
      replies: [],
    };
  });
}

export function subscribeToQrComments(
  qrId: string,
  onUpdate: () => void,
): () => void {
  const supabase = getWebSupabase();
  const channel = supabase
    .channel(`web-qr-comments:${qrId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "qr_comments",
        filter: `qr_code_id=eq.${qrId}`,
      },
      () => {
        onUpdate();
      },
    )
    .subscribe();

  return () => {
    try {
      void supabase.removeChannel(channel).catch(() => {});
    } catch {}
  };
}

export function subscribeToQrStats(
  qrId: string,
  onUpdate: (stats: { scanCount: number; commentCount: number }) => void,
): () => void {
  let cancelled = false;
  const supabase = getWebSupabase();
  const refresh = async () => {
    try {
      const { data } = await supabase
        .from("qr_codes")
        .select("scan_count,comment_count")
        .eq("id", qrId)
        .maybeSingle();
      if (!cancelled && data) {
        onUpdate({
          scanCount: Math.max(1, Number(data.scan_count ?? 1)),
          commentCount: Number(data.comment_count ?? 0),
        });
      }
    } catch {}
  };

  void refresh();
  const interval = window.setInterval(refresh, 15_000);
  const channel = supabase
    .channel(`web-qr-stats:${qrId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "qr_codes", filter: `id=eq.${qrId}` }, () => {
      void refresh();
    })
    .subscribe();

  return () => {
    cancelled = true;
    window.clearInterval(interval);
    try {
      void supabase.removeChannel(channel).catch(() => {});
    } catch {}
  };
}

export async function addQrComment(
  qrId: string,
  text: string,
  parentId?: string | null,
  qrMeta?: { content?: string; contentType?: string },
  userProfile?: { displayName?: string; username?: string; photoURL?: string | null },
): Promise<WebQrComment> {
  const session = await currentSession();
  const supabase = getWebSupabase();

  const trimmed = text.trim();
  if (trimmed.length < 2) {
    throw new Error("Comment must be at least 2 characters.");
  }
  if (trimmed.length > 1000) {
    throw new Error("Comment cannot exceed 1000 characters.");
  }

  const { userUsername, userPhotoURL } = await ensureWebQrAndUserExist(
    qrId,
    session.user,
    qrMeta,
    userProfile,
  );

  const candidateHandle = (
    userProfile?.username ||
    userUsername ||
    session.user.user_metadata?.username ||
    session.user.email?.split("@")[0] ||
    session.user.user_metadata?.user_name ||
    session.user.user_metadata?.full_name ||
    session.user.user_metadata?.display_name ||
    `user_${session.user.id.slice(0, 6)}`
  );

  const cleanHandle = String(candidateHandle)
    .replace(/^@/, "")
    .replace(/\s+/g, "")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .toLowerCase() || `user_${session.user.id.slice(0, 6)}`;

  const handleWithAt = `@${cleanHandle}`;
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("qr_comments")
    .insert({
      qr_code_id: qrId,
      user_id: session.user.id,
      user_name: handleWithAt,
      text: trimmed,
      parent_id: parentId ?? null,
      likes: 0,
      report_count: 0,
      is_edited: false,
      is_deleted: false,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) throw error;

  // Non-blocking increment comment_count on qr_codes and users
  try {
    const { error: qrRpcErr } = await supabase.rpc("increment_field", {
      p_table: "qr_codes",
      p_id: qrId,
      p_field: "comment_count",
      p_delta: 1,
    });
    if (qrRpcErr) {
      const { data: qrRow } = await supabase
        .from("qr_codes")
        .select("comment_count")
        .eq("id", qrId)
        .maybeSingle();
      await supabase
        .from("qr_codes")
        .update({
          comment_count: Math.max(0, Number(qrRow?.comment_count ?? 0)) + 1,
        })
        .eq("id", qrId);
    }
  } catch {}

  try {
    const { error: userRpcErr } = await supabase.rpc("increment_field", {
      p_table: "users",
      p_id: session.user.id,
      p_field: "comment_count",
      p_delta: 1,
    });
    if (userRpcErr) {
      const { data: uRow } = await supabase
        .from("users")
        .select("comment_count")
        .eq("id", session.user.id)
        .maybeSingle();
      if (uRow) {
        await supabase
          .from("users")
          .update({
            comment_count: Math.max(0, Number(uRow.comment_count ?? 0)) + 1,
          })
          .eq("id", session.user.id);
      }
    }
  } catch {}

  const record = data as Record<string, any>;
  return {
    id: String(record.id),
    userId: String(record.user_id ?? session.user.id),
    userName: handleWithAt,
    userUsername: cleanHandle,
    userPhotoURL: userPhotoURL || userProfile?.photoURL || undefined,
    text: String(record.text ?? trimmed),
    parentId: record.parent_id ? String(record.parent_id) : null,
    likes: 0,
    dislikes: 0,
    userLike: null,
    isEdited: false,
    isPinned: false,
    reportCount: 0,
    createdAt: record.created_at ?? now,
    updatedAt: record.updated_at ?? now,
    replies: [],
  };
}

export async function editQrComment(
  qrId: string,
  commentId: string,
  newText: string,
): Promise<{ text: string; isEdited: boolean; updatedAt: string }> {
  const session = await currentSession();
  const supabase = getWebSupabase();

  const trimmed = newText.trim();
  if (trimmed.length < 2) {
    throw new Error("Comment must be at least 2 characters.");
  }
  if (trimmed.length > 1000) {
    throw new Error("Comment cannot exceed 1000 characters.");
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("qr_comments")
    .update({
      text: trimmed,
      is_edited: true,
      updated_at: now,
    })
    .eq("id", commentId)
    .eq("user_id", session.user.id);

  if (error) throw error;
  return { text: trimmed, isEdited: true, updatedAt: now };
}

export async function reportQrComment(
  qrId: string,
  commentId: string,
  reason: string,
): Promise<void> {
  const session = await currentSession();
  const supabase = getWebSupabase();
  const userId = session.user.id;
  const now = new Date().toISOString();

  try {
    await supabase.from("comment_reports").insert({
      comment_id: commentId,
      user_id: userId,
      reason: reason.trim() || "Spam or inappropriate",
      created_at: now,
    });
  } catch {}

  try {
    const { data: cRow } = await supabase
      .from("qr_comments")
      .select("report_count")
      .eq("id", commentId)
      .maybeSingle();
    await supabase
      .from("qr_comments")
      .update({
        report_count: Math.max(0, Number(cRow?.report_count ?? 0)) + 1,
      })
      .eq("id", commentId);
  } catch {}
}

export async function reactToQrComment(
  qrId: string,
  commentId: string,
  action: "like" | "dislike",
): Promise<{
  userLike: "like" | "dislike" | null;
  likes: number;
  dislikes: number;
}> {
  const session = await currentSession();
  const supabase = getWebSupabase();
  const userId = session.user.id;

  const userLikesMap = loadLocalUserCommentLikes(qrId, userId);
  const dislikesMap = loadLocalCommentDislikes(qrId);
  let prevReaction: "like" | "dislike" | null = userLikesMap[commentId] ?? null;

  const { data: existingLikeRow } = await supabase
    .from("comment_likes")
    .select("comment_id")
    .eq("comment_id", commentId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!prevReaction && existingLikeRow) {
    prevReaction = "like";
  }

  const nextReaction: "like" | "dislike" | null = prevReaction === action ? null : action;
  if (nextReaction) {
    userLikesMap[commentId] = nextReaction;
  } else {
    delete userLikesMap[commentId];
  }
  saveLocalUserCommentLikes(qrId, userId, userLikesMap);

  const { data: commentRow } = await supabase
    .from("qr_comments")
    .select("likes, user_id")
    .eq("id", commentId)
    .maybeSingle();

  let likes = Math.max(0, Number(commentRow?.likes ?? 0));
  const authorId = commentRow?.user_id ? String(commentRow.user_id) : null;
  let dislikes = Math.max(0, Number(dislikesMap[commentId] ?? 0));

  if (prevReaction === "like" && nextReaction !== "like") {
    await supabase
      .from("comment_likes")
      .delete()
      .eq("comment_id", commentId)
      .eq("user_id", userId);
    likes = Math.max(0, likes - 1);
    const { error: rpcErr } = await supabase.rpc("increment_field", {
      p_table: "qr_comments",
      p_id: commentId,
      p_field: "likes",
      p_delta: -1,
    });
    if (rpcErr) {
      await supabase.from("qr_comments").update({ likes }).eq("id", commentId);
    }
    if (authorId && authorId !== userId) {
      try {
        await supabase.rpc("increment_field", {
          p_table: "users",
          p_id: authorId,
          p_field: "total_likes_received",
          p_delta: -1,
        });
      } catch {}
    }
  } else if (prevReaction !== "like" && nextReaction === "like") {
    const likeRow = {
      id: `${commentId}_${userId}`,
      comment_id: commentId,
      qr_code_id: qrId,
      user_id: userId,
    };
    const { error: insErr } = await supabase.from("comment_likes").insert(likeRow);
    if (insErr) {
      try {
        await supabase.from("comment_likes").upsert(likeRow, { onConflict: "id" });
      } catch {}
    }
    likes = likes + 1;
    const { error: rpcErr } = await supabase.rpc("increment_field", {
      p_table: "qr_comments",
      p_id: commentId,
      p_field: "likes",
      p_delta: 1,
    });
    if (rpcErr) {
      await supabase.from("qr_comments").update({ likes }).eq("id", commentId);
    }
    if (authorId && authorId !== userId) {
      try {
        await supabase.rpc("increment_field", {
          p_table: "users",
          p_id: authorId,
          p_field: "total_likes_received",
          p_delta: 1,
        });
      } catch {}
    }
  }

  if (prevReaction === "dislike" && nextReaction !== "dislike") {
    dislikes = Math.max(0, dislikes - 1);
  } else if (prevReaction !== "dislike" && nextReaction === "dislike") {
    dislikes = dislikes + 1;
  }
  dislikesMap[commentId] = dislikes;
  saveLocalCommentDislikes(qrId, dislikesMap);

  return { userLike: nextReaction, likes, dislikes };
}

export async function deleteQrComment(qrId: string, commentId: string): Promise<void> {
  const session = await currentSession();
  const supabase = getWebSupabase();
  const now = new Date().toISOString();

  const { data: updated, error: updateErr } = await supabase
    .from("qr_comments")
    .update({
      is_deleted: true,
      text: "[deleted]",
      updated_at: now,
    })
    .eq("id", commentId)
    .eq("user_id", session.user.id)
    .select("id");

  if (updateErr || !updated || updated.length === 0) {
    await supabase
      .from("qr_comments")
      .delete()
      .eq("id", commentId)
      .eq("user_id", session.user.id);
  }

  try {
    const { error: qrRpcErr } = await supabase.rpc("increment_field", {
      p_table: "qr_codes",
      p_id: qrId,
      p_field: "comment_count",
      p_delta: -1,
    });
    if (qrRpcErr) {
      const { data: qrRow } = await supabase
        .from("qr_codes")
        .select("comment_count")
        .eq("id", qrId)
        .maybeSingle();
      if (qrRow) {
        await supabase
          .from("qr_codes")
          .update({
            comment_count: Math.max(0, Number(qrRow.comment_count ?? 1) - 1),
          })
          .eq("id", qrId);
      }
    }
  } catch {}

  try {
    const { error: userRpcErr } = await supabase.rpc("increment_field", {
      p_table: "users",
      p_id: session.user.id,
      p_field: "comment_count",
      p_delta: -1,
    });
    if (userRpcErr) {
      const { data: uRow } = await supabase
        .from("users")
        .select("comment_count")
        .eq("id", session.user.id)
        .maybeSingle();
      if (uRow) {
        await supabase
          .from("users")
          .update({
            comment_count: Math.max(0, Number(uRow.comment_count ?? 1) - 1),
          })
          .eq("id", session.user.id);
      }
    }
  } catch {}
}
