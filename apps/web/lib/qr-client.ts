import type { Session, User } from "@supabase/supabase-js";
import { getWebSupabase } from "./supabase";

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
  createdAt: string | null;
  replies: WebQrComment[];
};

export type WebTrustScore = {
  score: number;
  label: string;
  totalReports: number;
};

export type QrForeignKey = { qr_code_id: string };

interface VoteRecord {
  userId: string;
  reportType: string | null;
  weight: number;
  userRemoved: boolean;
  timestampMs: number;
}

function parseTimeMs(val: any): number {
  if (!val) return 0;
  if (typeof val === "number") return val;
  const ms = new Date(val).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

export function calculateWebTrustScore(
  reportCounts: Record<string, number>,
  weightedCounts?: Record<string, number>,
): WebTrustScore {
  const rawSafe = reportCounts.safe || 0;
  const rawScam = reportCounts.scam || 0;
  const rawSpam = reportCounts.spam || 0;
  const rawFake = reportCounts.fake || 0;
  const rawTotal = rawSafe + rawScam + rawSpam + rawFake;

  if (rawTotal === 0) return { score: -1, label: "Unrated", totalReports: 0 };

  const useWeighted = Boolean(weightedCounts && Object.keys(weightedCounts).length > 0);
  const resolveWeight = (rawCount: number, weightedVal?: number): number => {
    if (rawCount <= 0) return 0;
    if (!useWeighted) return rawCount;
    return weightedVal && weightedVal > 0 ? weightedVal : rawCount;
  };

  let wSafe = resolveWeight(rawSafe, weightedCounts?.safe);
  let wScam = resolveWeight(rawScam, weightedCounts?.scam);
  let wSpam =
    resolveWeight(rawSpam, weightedCounts?.spam) +
    resolveWeight(rawFake, weightedCounts?.fake);

  const wNeg = wScam + wSpam;
  const wPos = wSafe;
  if (useWeighted && rawTotal < 15 && wNeg > wPos * 2) {
    const skepticism = 0.65;
    wScam *= skepticism;
    wSpam *= skepticism;
  }

  const wTotal = wSafe + wScam + wSpam;
  if (wTotal === 0) return { score: -1, label: "Unrated", totalReports: rawTotal };

  const safeRatio = wSafe / wTotal;
  const confidence = Math.min(rawTotal / 20, 1);
  const score = 50 + (safeRatio * 100 - 50) * confidence;

  let label = "Dangerous";
  if (score >= 75) label = "Trusted";
  else if (score >= 55) label = "Likely Safe";
  else if (score >= 40) label = "Uncertain";
  else if (score >= 25) label = "Suspicious";

  return {
    score: Math.round(score),
    label,
    totalReports: rawTotal,
  };
}

function loadLocalVotesMap(qrId: string): Map<string, VoteRecord> {
  const result = new Map<string, VoteRecord>();
  if (typeof window === "undefined") return result;
  try {
    const raw = localStorage.getItem(`qr_votes_map_${qrId}`);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, VoteRecord>;
      for (const [uid, rec] of Object.entries(parsed)) {
        if (rec && typeof rec === "object") {
          result.set(uid, rec);
        }
      }
    }
  } catch {}
  return result;
}

function saveLocalVote(qrId: string, record: VoteRecord): void {
  if (typeof window === "undefined") return;
  try {
    const map = loadLocalVotesMap(qrId);
    map.set(record.userId, record);
    const obj: Record<string, VoteRecord> = {};
    for (const [uid, rec] of map.entries()) {
      obj[uid] = rec;
    }
    localStorage.setItem(`qr_votes_map_${qrId}`, JSON.stringify(obj));
    localStorage.setItem(`qr_vote_override_${qrId}_${record.userId}`, JSON.stringify(record));
  } catch {}
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
): Promise<{ userName: string; accountAgeDays: number; emailVerified: boolean }> {
  const supabase = getWebSupabase();
  const now = new Date().toISOString();

  // 1. Ensure qr_codes row exists
  try {
    const { data: existingQr } = await supabase
      .from("qr_codes")
      .select("id")
      .eq("id", qrId)
      .maybeSingle();

    if (!existingQr) {
      const content = qrMeta?.content?.trim() || qrId;
      const isUrl =
        /^https?:\/\//i.test(content) ||
        (/^[a-z0-9-]+(\.[a-z0-9-]+)+\/?/i.test(content) && !content.includes(" "));
      const contentType = qrMeta?.contentType || (isUrl ? "url" : "text");
      await supabase.from("qr_codes").upsert(
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
    }
  } catch {}

  if (!user) {
    return { userName: "User", accountAgeDays: 0, emailVerified: false };
  }

  // 2. Ensure users row exists
  let userName =
    user.user_metadata?.display_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.username ||
    user.email?.split("@")[0] ||
    "User";
  let accountAgeDays = 0;
  const emailVerified = Boolean(user.email_confirmed_at);

  try {
    const { data: existingUser } = await supabase
      .from("users")
      .select("id, display_name, username, created_at")
      .eq("id", user.id)
      .maybeSingle();

    if (existingUser) {
      userName = existingUser.display_name || existingUser.username || userName;
      const createdMs = parseTimeMs(existingUser.created_at);
      if (createdMs > 0) {
        accountAgeDays = Math.max(0, Math.floor((Date.now() - createdMs) / 86400000));
      }
    } else {
      const rawUsername = (
        user.user_metadata?.username ||
        user.email?.split("@")[0] ||
        `user_${user.id.slice(0, 8)}`
      )
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "");
      await supabase.from("users").upsert(
        {
          id: user.id,
          email: user.email ?? `${user.id}@user.qrguard.app`,
          display_name: userName,
          username: rawUsername || `user_${user.id.slice(0, 8)}`,
          email_verified: emailVerified,
          created_at: user.created_at ?? now,
          updated_at: now,
        },
        { onConflict: "id" },
      );
    }
  } catch {}

  return { userName, accountAgeDays, emailVerified };
}

export async function fetchWebQrReports(
  qrId: string,
  userId?: string | null,
): Promise<{
  reportCounts: Record<string, number>;
  weightedCounts: Record<string, number>;
  userReport: string | null;
  trust: WebTrustScore;
}> {
  const supabase = getWebSupabase();
  const byUser = loadLocalVotesMap(qrId);

  const mergeCandidate = (candidate: VoteRecord) => {
    if (!candidate.userId) return;
    const prev = byUser.get(candidate.userId);
    if (!prev || candidate.timestampMs >= prev.timestampMs) {
      byUser.set(candidate.userId, candidate);
    }
  };

  const [reportsRes, auditRes, rtdbRes, userConsentRes] = await Promise.allSettled([
    supabase
      .from("qr_reports")
      .select("user_id, report_type, weight, user_removed, created_at, updated_at")
      .eq("qr_code_id", qrId)
      .limit(500),
    supabase
      .from("audit_logs")
      .select("user_id, action, vote_weight, created_at")
      .eq("qr_id", qrId)
      .like("action", "vote:%")
      .order("created_at", { ascending: true })
      .limit(500),
    supabase
      .from("rtdb_store")
      .select("path, value, updated_at")
      .like("path", `qr_vote:${qrId}:%`)
      .limit(500),
    userId
      ? supabase.from("users").select("consent").eq("id", userId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (reportsRes.status === "fulfilled" && Array.isArray(reportsRes.value?.data)) {
    for (const r of reportsRes.value.data as any[]) {
      const uid = r.user_id || r.userId;
      if (!uid) continue;
      const ts = Math.max(parseTimeMs(r.updated_at), parseTimeMs(r.created_at), 1);
      mergeCandidate({
        userId: String(uid),
        reportType: r.user_removed ? null : (r.report_type ?? null),
        weight: Number(r.weight || 1),
        userRemoved: Boolean(r.user_removed),
        timestampMs: ts,
      });
    }
  }

  if (auditRes.status === "fulfilled" && Array.isArray(auditRes.value?.data)) {
    for (const row of auditRes.value.data as any[]) {
      const uid = row.user_id;
      const action: string = row.action || "";
      if (!uid || !action.startsWith("vote:")) continue;
      const voteType = action.slice("vote:".length);
      const isRemoved = voteType === "removed" || !voteType;
      const ts = parseTimeMs(row.created_at) || 2;
      mergeCandidate({
        userId: String(uid),
        reportType: isRemoved ? null : voteType,
        weight: Number(row.vote_weight || 1),
        userRemoved: isRemoved,
        timestampMs: ts,
      });
    }
  }

  if (rtdbRes.status === "fulfilled" && Array.isArray(rtdbRes.value?.data)) {
    for (const row of rtdbRes.value.data as any[]) {
      const val = row?.value;
      if (!val || typeof val !== "object") continue;
      const uid = val.userId || String(row.path || "").split(":")[2];
      if (!uid) continue;
      const ts =
        Number(val.timestampMs) ||
        parseTimeMs(val.updatedAt) ||
        parseTimeMs(row.updated_at) ||
        3;
      mergeCandidate({
        userId: String(uid),
        reportType: val.userRemoved ? null : (val.reportType ?? null),
        weight: Number(val.weight || 1),
        userRemoved: Boolean(val.userRemoved),
        timestampMs: ts,
      });
    }
  }

  if (userId && userConsentRes.status === "fulfilled" && userConsentRes.value?.data) {
    const qrVote = ((userConsentRes.value.data as any)?.consent as any)?.qrVotes?.[qrId];
    if (qrVote && typeof qrVote === "object") {
      const ts = Number(qrVote.timestampMs) || parseTimeMs(qrVote.updatedAt) || 4;
      mergeCandidate({
        userId,
        reportType: qrVote.userRemoved ? null : (qrVote.reportType ?? null),
        weight: Number(qrVote.weight || 1),
        userRemoved: Boolean(qrVote.userRemoved),
        timestampMs: ts,
      });
    }
  }

  const reportCounts: Record<string, number> = {};
  const weightedCounts: Record<string, number> = {};

  for (const rec of byUser.values()) {
    if (rec.userRemoved || !rec.reportType) continue;
    reportCounts[rec.reportType] = (reportCounts[rec.reportType] || 0) + 1;
    weightedCounts[rec.reportType] =
      (weightedCounts[rec.reportType] || 0) + Number(rec.weight || 1);
  }

  const userRec = userId ? byUser.get(userId) : undefined;
  const userReport = userRec && !userRec.userRemoved ? userRec.reportType : null;
  const trust = calculateWebTrustScore(reportCounts, weightedCounts);

  return { reportCounts, weightedCounts, userReport, trust };
}

export async function submitQrReport(
  qrId: string,
  reportType: string,
  qrMeta?: { content?: string; contentType?: string },
): Promise<{
  action: "created" | "updated" | "removed";
  userReport: string | null;
  reportCounts: Record<string, number>;
  weightedCounts: Record<string, number>;
  trust: WebTrustScore;
}> {
  const session = await currentSession();
  const supabase = getWebSupabase();
  const userId = session.user.id;

  const { accountAgeDays, emailVerified } = await ensureWebQrAndUserExist(
    qrId,
    session.user,
    qrMeta,
  );

  const current = await fetchWebQrReports(qrId, userId);
  const existingReport = current.userReport;
  const userRemoved = existingReport === reportType;
  const weight = userRemoved ? 0.1 : emailVerified ? 1.2 : 1.0;
  const now = new Date().toISOString();
  const timestampMs = Date.now();

  // 1. Local immediate persistence
  saveLocalVote(qrId, {
    userId,
    reportType: userRemoved ? null : reportType,
    weight,
    userRemoved,
    timestampMs,
  });

  // 2. Persist to qr_reports table (UPDATE -> DELETE+INSERT -> INSERT)
  const persistQrReports = async () => {
    try {
      const { data: existingRows } = await supabase
        .from("qr_reports")
        .select("id")
        .eq("qr_code_id", qrId)
        .eq("user_id", userId);

      if (Array.isArray(existingRows) && existingRows.length > 0) {
        const { data: updated, error: updateErr } = await supabase
          .from("qr_reports")
          .update({
            report_type: reportType,
            weight,
            account_age_days: accountAgeDays,
            email_verified: emailVerified,
            user_removed: userRemoved,
            removed_at: userRemoved ? now : null,
            updated_at: now,
          })
          .eq("qr_code_id", qrId)
          .eq("user_id", userId)
          .select();

        if (!updateErr && Array.isArray(updated) && updated.length > 0) return;

        const { data: deleted, error: deleteErr } = await supabase
          .from("qr_reports")
          .delete()
          .eq("qr_code_id", qrId)
          .eq("user_id", userId)
          .select();

        if (!deleteErr && Array.isArray(deleted) && deleted.length > 0) {
          if (userRemoved) return;
          const { error: reinsertErr } = await supabase.from("qr_reports").insert({
            qr_code_id: qrId,
            user_id: userId,
            report_type: reportType,
            weight,
            account_age_days: accountAgeDays,
            email_verified: emailVerified,
            user_removed: false,
            removed_at: null,
            created_at: now,
            updated_at: now,
          });
          if (!reinsertErr) return;
        }
      }

      if (!userRemoved) {
        await supabase.from("qr_reports").insert({
          qr_code_id: qrId,
          user_id: userId,
          report_type: reportType,
          weight,
          account_age_days: accountAgeDays,
          email_verified: emailVerified,
          user_removed: false,
          removed_at: null,
          created_at: now,
          updated_at: now,
        });
      }
    } catch {}
  };

  // 3. Persist to rtdb_store, audit_logs, and users.consent
  const persistFallbacks = async () => {
    await Promise.allSettled([
      supabase.from("rtdb_store").upsert(
        {
          path: `qr_vote:${qrId}:${userId}`,
          value: {
            qrCodeId: qrId,
            userId,
            reportType: userRemoved ? null : reportType,
            weight,
            userRemoved,
            updatedAt: now,
            timestampMs,
          },
          updated_at: now,
        },
        { onConflict: "path" },
      ),
      supabase.from("audit_logs").insert({
        qr_id: qrId,
        user_id: userId,
        action: userRemoved ? "vote:removed" : `vote:${reportType}`,
        vote_weight: weight,
        account_age_days: accountAgeDays,
        email_verified: emailVerified,
        created_at: now,
      }),
      (async () => {
        const { data: userRow } = await supabase
          .from("users")
          .select("consent")
          .eq("id", userId)
          .maybeSingle();
        const existingConsent =
          userRow?.consent && typeof userRow.consent === "object" && !Array.isArray(userRow.consent)
            ? (userRow.consent as Record<string, any>)
            : {};
        const existingQrVotes =
          existingConsent.qrVotes && typeof existingConsent.qrVotes === "object"
            ? (existingConsent.qrVotes as Record<string, any>)
            : {};
        await supabase
          .from("users")
          .update({
            consent: {
              ...existingConsent,
              qrVotes: {
                ...existingQrVotes,
                [qrId]: {
                  reportType: userRemoved ? null : reportType,
                  weight,
                  userRemoved,
                  updatedAt: now,
                  timestampMs,
                },
              },
            },
            updated_at: now,
          })
          .eq("id", userId);
      })(),
    ]);
  };

  await Promise.all([persistQrReports(), persistFallbacks()]);

  const updated = await fetchWebQrReports(qrId, userId);
  return {
    action: userRemoved ? "removed" : existingReport ? "updated" : "created",
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
    .select("id,user_id,user_name,text,parent_id,likes,is_edited,created_at,is_deleted")
    .eq("qr_code_id", qrId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(150);

  if (error) throw error;
  const rows = ((data ?? []) as Record<string, any>[]).filter(
    (r) => !r.is_deleted && r.text !== "[deleted]",
  );

  // Enrich with public_profiles / users
  const userIds = Array.from(
    new Set(rows.map((r) => String(r.user_id ?? "")).filter(Boolean)),
  );
  const profileMap = new Map<string, { username?: string; displayName?: string; photoURL?: string }>();
  if (userIds.length > 0) {
    const [pubRes, usrRes] = await Promise.allSettled([
      supabase.from("public_profiles").select("id, username, display_name, photo_url").in("id", userIds),
      supabase.from("users").select("id, username, display_name, photo_url").in("id", userIds),
    ]);
    if (usrRes.status === "fulfilled" && Array.isArray(usrRes.value.data)) {
      for (const u of usrRes.value.data as any[]) {
        if (u?.id) {
          profileMap.set(String(u.id), {
            username: u.username || undefined,
            displayName: u.display_name || undefined,
            photoURL: u.photo_url || undefined,
          });
        }
      }
    }
    if (pubRes.status === "fulfilled" && Array.isArray(pubRes.value.data)) {
      for (const p of pubRes.value.data as any[]) {
        if (p?.id) {
          const prev = profileMap.get(String(p.id));
          profileMap.set(String(p.id), {
            username: p.username || prev?.username,
            displayName: p.display_name || prev?.displayName,
            photoURL: p.photo_url || prev?.photoURL,
          });
        }
      }
    }
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
    const rawName = String(prof?.displayName || record.user_name || "User");
    const rawUsername = String(prof?.username || rawName).replace(/^@/, "");
    return {
      id: cid,
      userId: uid,
      userName: rawName,
      userUsername: rawUsername,
      userPhotoURL: prof?.photoURL,
      text: String(record.text ?? ""),
      parentId: record.parent_id ? String(record.parent_id) : null,
      likes: Math.max(0, Number(record.likes ?? 0)),
      dislikes: Math.max(0, Number(localDislikes[cid] ?? 0)),
      userLike: dbReactions[cid] ?? null,
      isEdited: Boolean(record.is_edited),
      createdAt: record.created_at ?? null,
      replies: [],
    };
  });
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
    void supabase.removeChannel(channel);
  };
}

export async function addQrComment(
  qrId: string,
  text: string,
  parentId?: string | null,
  qrMeta?: { content?: string; contentType?: string },
): Promise<WebQrComment> {
  const session = await currentSession();
  const supabase = getWebSupabase();
  const { userName } = await ensureWebQrAndUserExist(qrId, session.user, qrMeta);

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("qr_comments")
    .insert({
      qr_code_id: qrId,
      user_id: session.user.id,
      user_name: userName,
      text: text.trim(),
      parent_id: parentId ?? null,
      likes: 0,
      report_count: 0,
      is_edited: false,
      is_deleted: false,
      created_at: now,
      updated_at: now,
    })
    .select("id,user_id,user_name,text,parent_id,likes,is_edited,created_at")
    .single();

  if (error) throw error;

  // Non-blocking increment comment_count on qr_codes
  try {
    const { data: qrRow } = await supabase
      .from("qr_codes")
      .select("comment_count")
      .eq("id", qrId)
      .maybeSingle();
    await supabase
      .from("qr_codes")
      .update({
        comment_count: Math.max(0, Number(qrRow?.comment_count ?? 0)) + 1,
        updated_at: now,
      })
      .eq("id", qrId);
  } catch {}

  const record = data as Record<string, any>;
  return {
    id: String(record.id),
    userId: String(record.user_id ?? session.user.id),
    userName,
    userUsername: userName.replace(/^@/, ""),
    text: String(record.text ?? text.trim()),
    parentId: record.parent_id ? String(record.parent_id) : null,
    likes: 0,
    dislikes: 0,
    userLike: null,
    isEdited: false,
    createdAt: record.created_at ?? now,
    replies: [],
  };
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
    .select("likes")
    .eq("id", commentId)
    .maybeSingle();

  let likes = Math.max(0, Number(commentRow?.likes ?? 0));
  let dislikes = Math.max(0, Number(dislikesMap[commentId] ?? 0));

  if (prevReaction === "like" && nextReaction !== "like") {
    await supabase
      .from("comment_likes")
      .delete()
      .eq("comment_id", commentId)
      .eq("user_id", userId);
    likes = Math.max(0, likes - 1);
    await supabase.from("qr_comments").update({ likes }).eq("id", commentId);
  } else if (prevReaction !== "like" && nextReaction === "like") {
    await supabase
      .from("comment_likes")
      .upsert({ comment_id: commentId, user_id: userId }, { onConflict: "comment_id,user_id" });
    likes = likes + 1;
    await supabase.from("qr_comments").update({ likes }).eq("id", commentId);
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
          updated_at: now,
        })
        .eq("id", qrId);
    }
  } catch {}
}

