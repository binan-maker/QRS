// Weight validation happens at the server-authoritative Express route layer
// before this service is called.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "@/lib/db/client";
import { supabase } from "@/lib/supabase";
import { COLLECTIONS } from "@/shared/constants/collections";
import { getAnonymousQrContent } from "../cache/anonymous-session";
import { detectContentType } from "../qr-content-type";
import {
  checkReportEligibility,
  recordReport,
} from "../integrity";

export interface QrReportMeta {
  content?: string;
  contentType?: string;
}

interface VoteRecord {
  userId: string;
  reportType: string | null;
  weight: number;
  userRemoved: boolean;
  timestampMs: number;
}

// In-memory cache of latest per-QR user votes for instant read consistency
const memoryQrVotes = new Map<string, Map<string, VoteRecord>>();

function parseTimeMs(val: any): number {
  if (!val) return 0;
  if (typeof val === "number") return val;
  if (typeof val?.toDate === "function") return val.toDate().getTime();
  const ms = new Date(val).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function setMemoryVote(qrId: string, record: VoteRecord): void {
  if (!memoryQrVotes.has(qrId)) {
    memoryQrVotes.set(qrId, new Map());
  }
  memoryQrVotes.get(qrId)!.set(record.userId, record);
}

async function loadLocalQrVotesMap(qrId: string): Promise<Map<string, VoteRecord>> {
  const result = new Map<string, VoteRecord>();
  const mem = memoryQrVotes.get(qrId);
  if (mem) {
    for (const [uid, rec] of mem.entries()) {
      result.set(uid, rec);
    }
  }
  try {
    const raw = await AsyncStorage.getItem(`qr_votes_map_${qrId}`);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, VoteRecord>;
      for (const [uid, rec] of Object.entries(parsed)) {
        if (!rec || typeof rec !== "object") continue;
        const existing = result.get(uid);
        if (!existing || rec.timestampMs >= existing.timestampMs) {
          result.set(uid, rec);
          setMemoryVote(qrId, rec);
        }
      }
    }
  } catch {}
  return result;
}

async function saveVoteOverride(
  qrId: string,
  userId: string,
  reportType: string | null,
  weight: number,
  userRemoved: boolean,
  accountAgeDays: number,
  emailVerified: boolean,
  isoNow: string
): Promise<void> {
  const timestampMs = parseTimeMs(isoNow) || Date.now();
  const record: VoteRecord = {
    userId,
    reportType: userRemoved ? null : reportType,
    weight,
    userRemoved,
    timestampMs,
  };

  setMemoryVote(qrId, record);

  // 1. Save to AsyncStorage per-QR map and per-user key
  try {
    const existingMap = await loadLocalQrVotesMap(qrId);
    existingMap.set(userId, record);
    const serialized: Record<string, VoteRecord> = {};
    for (const [uid, rec] of existingMap.entries()) {
      serialized[uid] = rec;
    }
    await Promise.all([
      AsyncStorage.setItem(`qr_votes_map_${qrId}`, JSON.stringify(serialized)),
      AsyncStorage.setItem(`qr_vote_override_${qrId}_${userId}`, JSON.stringify(record)),
    ]);
  } catch {}

  // 2. Save to rtdb_store (has FOR ALL RLS policy for authenticated users)
  try {
    await supabase.from("rtdb_store").upsert(
      {
        path: `qr_vote:${qrId}:${userId}`,
        value: {
          qrCodeId: qrId,
          userId,
          reportType: userRemoved ? null : reportType,
          weight,
          userRemoved,
          updatedAt: isoNow,
          timestampMs,
        },
        updated_at: isoNow,
      },
      { onConflict: "path" }
    );
  } catch {}

  // 3. Append to audit_logs (append-only table with no unique constraint on qr_id+user_id)
  try {
    await supabase.from("audit_logs").insert({
      qr_id: qrId,
      user_id: userId,
      action: userRemoved ? "vote:removed" : `vote:${reportType}`,
      vote_weight: weight,
      account_age_days: accountAgeDays,
      email_verified: emailVerified,
      created_at: isoNow,
    });
  } catch {}

  // 4. Save in user's own public.users.consent JSONB (guaranteed to exist and allow own-row SELECT/UPDATE)
  try {
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
    const updatedConsent = {
      ...existingConsent,
      qrVotes: {
        ...existingQrVotes,
        [qrId]: {
          reportType: userRemoved ? null : reportType,
          weight,
          userRemoved,
          updatedAt: isoNow,
          timestampMs,
        },
      },
    };
    await supabase
      .from("users")
      .update({ consent: updatedConsent, updated_at: isoNow })
      .eq("id", userId);
  } catch {}
}

async function getMergedQrVotes(qrId: string): Promise<Map<string, VoteRecord>> {
  const byUser = await loadLocalQrVotesMap(qrId);

  const mergeCandidate = (candidate: VoteRecord) => {
    if (!candidate.userId) return;
    const prev = byUser.get(candidate.userId);
    if (!prev || candidate.timestampMs >= prev.timestampMs) {
      byUser.set(candidate.userId, candidate);
      setMemoryVote(qrId, candidate);
    }
  };

  const [reportsRes, auditRes, rtdbRes, sessionRes] = await Promise.allSettled([
    db.query([COLLECTIONS.QR_CODES, qrId, COLLECTIONS.REPORTS], { limit: 500 }),
    supabase
      .from("audit_logs")
      .select("user_id, action, vote_weight, created_at")
      .eq("qr_id", qrId)
      .like("action", "vote:%")
      .order("created_at", { ascending: true })
      .limit(500),
    supabase
      .from("rtdb_store")
      .select("value, updated_at")
      .like("path", `qr_vote:${qrId}:%`)
      .limit(500),
    supabase.auth.getSession(),
  ]);

  if (reportsRes.status === "fulfilled" && reportsRes.value?.docs) {
    for (const d of reportsRes.value.docs) {
      const data = d.data;
      const uid = data.userId || data.reporterId || d.id;
      if (!uid) continue;
      const ts = Math.max(parseTimeMs(data.updatedAt), parseTimeMs(data.createdAt), 1);
      mergeCandidate({
        userId: uid,
        reportType: data.userRemoved ? null : (data.reportType ?? null),
        weight: Number(data.weight || 1),
        userRemoved: Boolean(data.userRemoved),
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
        userId: uid,
        reportType: isRemoved ? null : voteType,
        weight: Number(row.vote_weight || 1),
        userRemoved: isRemoved,
        timestampMs: ts,
      });
    }
  }

  if (rtdbRes.status === "fulfilled" && Array.isArray(rtdbRes.value?.data)) {
    for (const row of rtdbRes.value.data as any[]) {
      const val = row.value;
      if (!val || typeof val !== "object" || !val.userId) continue;
      const ts =
        Number(val.timestampMs) ||
        parseTimeMs(val.updatedAt) ||
        parseTimeMs(row.updated_at) ||
        3;
      mergeCandidate({
        userId: val.userId,
        reportType: val.userRemoved ? null : (val.reportType ?? null),
        weight: Number(val.weight || 1),
        userRemoved: Boolean(val.userRemoved),
        timestampMs: ts,
      });
    }
  }

  const currentUid =
    sessionRes.status === "fulfilled" ? sessionRes.value?.data?.session?.user?.id : null;
  if (currentUid) {
    try {
      const { data: userRow } = await supabase
        .from("users")
        .select("consent")
        .eq("id", currentUid)
        .maybeSingle();
      const qrVote = (userRow?.consent as any)?.qrVotes?.[qrId];
      if (qrVote && typeof qrVote === "object") {
        const ts = Number(qrVote.timestampMs) || parseTimeMs(qrVote.updatedAt) || 4;
        mergeCandidate({
          userId: currentUid,
          reportType: qrVote.userRemoved ? null : (qrVote.reportType ?? null),
          weight: Number(qrVote.weight || 1),
          userRemoved: Boolean(qrVote.userRemoved),
          timestampMs: ts,
        });
      }
    } catch {}
  }

  return byUser;
}

function summarizeVotes(byUser: Map<string, VoteRecord>): {
  counts: Record<string, number>;
  weighted: Record<string, number>;
} {
  const counts: Record<string, number> = {};
  const weighted: Record<string, number> = {};
  for (const rec of byUser.values()) {
    if (rec.userRemoved || !rec.reportType) continue;
    counts[rec.reportType] = (counts[rec.reportType] || 0) + 1;
    weighted[rec.reportType] = (weighted[rec.reportType] || 0) + Number(rec.weight || 1);
  }
  return { counts, weighted };
}

export async function getQrReportData(qrId: string): Promise<{
  counts: Record<string, number>;
  weighted: Record<string, number>;
}> {
  const byUser = await getMergedQrVotes(qrId);
  return summarizeVotes(byUser);
}

export async function getQrReportCounts(qrId: string): Promise<Record<string, number>> {
  return (await getQrReportData(qrId)).counts;
}

export async function getQrWeightedReportCounts(qrId: string): Promise<Record<string, number>> {
  return (await getQrReportData(qrId)).weighted;
}

export async function getUserQrReport(qrId: string, userId: string): Promise<string | null> {
  // Check in-memory and AsyncStorage override first so we have the latest timestamped intent
  let best: VoteRecord | null = memoryQrVotes.get(qrId)?.get(userId) ?? null;

  try {
    const raw = await AsyncStorage.getItem(`qr_vote_override_${qrId}_${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw) as VoteRecord;
      if (parsed && (!best || parsed.timestampMs >= best.timestampMs)) {
        best = parsed;
        setMemoryVote(qrId, parsed);
      }
    }
  } catch {}

  const [docRes, auditRes, rtdbRes, userRes] = await Promise.allSettled([
    db.get([COLLECTIONS.QR_CODES, qrId, COLLECTIONS.REPORTS, userId]),
    supabase
      .from("audit_logs")
      .select("action, vote_weight, created_at")
      .eq("qr_id", qrId)
      .eq("user_id", userId)
      .like("action", "vote:%")
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("rtdb_store")
      .select("value, updated_at")
      .eq("path", `qr_vote:${qrId}:${userId}`)
      .maybeSingle(),
    supabase
      .from("users")
      .select("consent")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  if (docRes.status === "fulfilled" && docRes.value) {
    const data = docRes.value;
    const ts = Math.max(parseTimeMs(data.updatedAt), parseTimeMs(data.createdAt), 1);
    if (!best || ts > best.timestampMs) {
      best = {
        userId,
        reportType: data.userRemoved ? null : (data.reportType ?? null),
        weight: Number(data.weight || 1),
        userRemoved: Boolean(data.userRemoved),
        timestampMs: ts,
      };
    }
  }

  if (auditRes.status === "fulfilled" && Array.isArray(auditRes.value?.data) && auditRes.value.data[0]) {
    const row = auditRes.value.data[0] as any;
    const action: string = row.action || "";
    const voteType = action.slice("vote:".length);
    const isRemoved = voteType === "removed" || !voteType;
    const ts = parseTimeMs(row.created_at) || 2;
    if (!best || ts >= best.timestampMs) {
      best = {
        userId,
        reportType: isRemoved ? null : voteType,
        weight: Number(row.vote_weight || 1),
        userRemoved: isRemoved,
        timestampMs: ts,
      };
    }
  }

  if (rtdbRes.status === "fulfilled" && rtdbRes.value?.data) {
    const row = rtdbRes.value.data as any;
    const val = row.value;
    if (val && typeof val === "object") {
      const ts =
        Number(val.timestampMs) ||
        parseTimeMs(val.updatedAt) ||
        parseTimeMs(row.updated_at) ||
        3;
      if (!best || ts >= best.timestampMs) {
        best = {
          userId,
          reportType: val.userRemoved ? null : (val.reportType ?? null),
          weight: Number(val.weight || 1),
          userRemoved: Boolean(val.userRemoved),
          timestampMs: ts,
        };
      }
    }
  }

  if (userRes.status === "fulfilled" && userRes.value?.data) {
    const qrVote = (userRes.value.data?.consent as any)?.qrVotes?.[qrId];
    if (qrVote && typeof qrVote === "object") {
      const ts = Number(qrVote.timestampMs) || parseTimeMs(qrVote.updatedAt) || 4;
      if (!best || ts >= best.timestampMs) {
        best = {
          userId,
          reportType: qrVote.userRemoved ? null : (qrVote.reportType ?? null),
          weight: Number(qrVote.weight || 1),
          userRemoved: Boolean(qrVote.userRemoved),
          timestampMs: ts,
        };
      }
    }
  }

  if (!best || best.userRemoved) return null;
  setMemoryVote(qrId, best);
  return best.reportType ?? null;
}

async function ensureQrCodeExists(qrId: string, qrMeta?: QrReportMeta): Promise<void> {
  try {
    const existingQr = await db.get([COLLECTIONS.QR_CODES, qrId]);
    if (existingQr) return;

    let content = qrMeta?.content?.trim() || "";
    let contentType = qrMeta?.contentType?.trim() || "";

    if (!content) {
      const inMem = getAnonymousQrContent(qrId);
      if (inMem?.content) {
        content = inMem.content;
        contentType = inMem.contentType || "";
      }
    }

    if (!content) {
      try {
        const raw = await AsyncStorage.getItem(`qr_content_${qrId}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.content) {
            content = parsed.content;
            contentType = parsed.contentType || "";
          }
        }
      } catch {}
    }

    const finalContent = content || qrId;
    const finalContentType = contentType || detectContentType(finalContent);

    await db.set([COLLECTIONS.QR_CODES, qrId], {
      content: finalContent,
      contentType: finalContentType,
      qrType: "qr",
      scanCount: 1,
      commentCount: 0,
      createdAt: db.timestamp(),
      updatedAt: db.timestamp(),
    });
  } catch (e) {
    console.warn("[report-service] ensureQrCodeExists warning:", e);
  }
}

async function ensureUserRecordExists(
  userId: string,
  emailVerified: boolean
): Promise<Record<string, any> | null> {
  try {
    const existingUser = await db.get([COLLECTIONS.USERS, userId]);
    if (existingUser) return existingUser;

    const { data: sessionData } = await supabase.auth.getSession();
    const authUser = sessionData?.session?.user;
    const email = authUser?.email || `${userId}@users.binro.app`;
    const meta = authUser?.user_metadata ?? {};
    const displayName =
      meta.full_name ||
      meta.name ||
      meta.display_name ||
      email.split("@")[0] ||
      "User";

    const now = db.timestamp();
    await db.set([COLLECTIONS.USERS, userId], {
      email,
      emailVerified: Boolean(emailVerified || authUser?.email_confirmed_at),
      displayName,
      photoURL: meta.avatar_url ?? meta.picture ?? null,
      isDeleted: false,
      createdAt: authUser?.created_at || now,
      updatedAt: now,
    });
    return await db.get([COLLECTIONS.USERS, userId]);
  } catch (e) {
    console.warn("[report-service] ensureUserRecordExists warning:", e);
    return null;
  }
}

async function persistToQrReportsTable(
  qrId: string,
  userId: string,
  reportType: string,
  weight: number,
  accountAgeDays: number,
  emailVerified: boolean,
  userRemoved: boolean,
  now: string
): Promise<void> {
  const { data: existingRows } = await supabase
    .from("qr_reports")
    .select("id, report_type, user_removed")
    .eq("qr_code_id", qrId)
    .eq("user_id", userId)
    .limit(10);

  const hasExistingRows = Array.isArray(existingRows) && existingRows.length > 0;

  if (hasExistingRows) {
    // 1. Try direct UPDATE on qr_reports
    const { data: updatedRows, error: updateErr } = await supabase
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

    if (!updateErr && Array.isArray(updatedRows) && updatedRows.length > 0) {
      return;
    }

    // 2. If UPDATE affected 0 rows (missing FOR UPDATE RLS policy), try DELETE + INSERT
    const { data: deletedRows, error: deleteErr } = await supabase
      .from("qr_reports")
      .delete()
      .eq("qr_code_id", qrId)
      .eq("user_id", userId)
      .select();

    if (!deleteErr && Array.isArray(deletedRows) && deletedRows.length > 0) {
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

    // 3. If DELETE also affected 0 rows, try INSERT (works if no unique constraint on qr_code_id,user_id)
    await supabase.from("qr_reports").insert({
      qr_code_id: qrId,
      user_id: userId,
      report_type: reportType,
      weight,
      account_age_days: accountAgeDays,
      email_verified: emailVerified,
      user_removed: userRemoved,
      removed_at: userRemoved ? now : null,
      created_at: now,
      updated_at: now,
    });
    return;
  }

  if (userRemoved) return;

  // First-time insert into qr_reports
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

export async function reportQrCode(
  qrId: string,
  userId: string,
  reportType: string,
  emailVerified: boolean = false,
  qrMeta?: QrReportMeta
): Promise<{ action: "created" | "updated" | "removed" }> {
  // Ensure parent foreign-key rows exist in qr_codes and users before writing to qr_reports
  await ensureQrCodeExists(qrId, qrMeta);

  const existingReport = await getUserQrReport(qrId, userId);
  const now = db.timestamp();

  let accountAgeDays = 0;
  let effectiveEmailVerified = emailVerified;
  try {
    const userData = await ensureUserRecordExists(userId, emailVerified);
    if (userData?.emailVerified) {
      effectiveEmailVerified = true;
    }
    if (userData?.createdAt) {
      const createdMs = userData.createdAt.toDate
        ? userData.createdAt.toDate().getTime()
        : new Date(userData.createdAt).getTime();
      if (Number.isFinite(createdMs)) {
        accountAgeDays = Math.max(0, Math.floor((Date.now() - createdMs) / 86400000));
      }
    }
  } catch {}

  // Same type tapped again → unreport (toggle off).
  if (existingReport === reportType) {
    await Promise.all([
      persistToQrReportsTable(
        qrId,
        userId,
        reportType,
        0.1,
        accountAgeDays,
        effectiveEmailVerified,
        true,
        now
      ),
      saveVoteOverride(
        qrId,
        userId,
        reportType,
        0.1,
        true,
        accountAgeDays,
        effectiveEmailVerified,
        now
      ),
    ]);
    return { action: "removed" };
  }

  // Switching an existing vote should not count against rate limits.
  // isChangingReport=true bypasses the per-QR and hourly counters in checkReportEligibility.
  const isChangingReport = existingReport !== null;
  const { weight } = await checkReportEligibility(userId, qrId, effectiveEmailVerified, isChangingReport);

  await Promise.all([
    persistToQrReportsTable(
      qrId,
      userId,
      reportType,
      weight,
      accountAgeDays,
      effectiveEmailVerified,
      false,
      now
    ),
    saveVoteOverride(
      qrId,
      userId,
      reportType,
      weight,
      false,
      accountAgeDays,
      effectiveEmailVerified,
      now
    ),
  ]);

  if (!isChangingReport) {
    await recordReport(userId, qrId);
  }

  return { action: isChangingReport ? "updated" : "created" };
}

export function subscribeToQrReports(
  qrId: string,
  onUpdate: (
    counts: Record<string, number>,
    weightedCounts: Record<string, number>
  ) => void
): () => void {
  let cancelled = false;
  const refresh = async () => {
    try {
      const { counts, weighted } = await getQrReportData(qrId);
      if (!cancelled) onUpdate(counts, weighted);
    } catch {}
  };

  refresh();

  const unsub = db.onQuery([COLLECTIONS.QR_CODES, qrId, COLLECTIONS.REPORTS], { limit: 500 }, () => {
    if (!cancelled) {
      refresh();
    }
  });

  return () => {
    cancelled = true;
    unsub();
  };
}
