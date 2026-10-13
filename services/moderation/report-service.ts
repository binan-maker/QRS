import type { SupabaseClient } from "@supabase/supabase-js";
import { db } from "../../lib/db/client";
import { supabase } from "@/lib/core/supabase";
import { COLLECTIONS } from "../../shared/constants/collections";
import { getAnonymousQrContent } from "../cache/anonymous-session";
import { detectContentType } from "../qr-content-type";
import {
  checkReportEligibility,
  recordReport,
} from "../integrity";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface QrReportMeta {
  content?: string;
  contentType?: string;
}

export interface VoteRecord {
  userId: string;
  reportType: string | null;
  weight: number;
  userRemoved: boolean;
  timestampMs: number;
}

// ── Cross-Platform Storage ────────────────────────────────────────────────────

async function getStorageItem(key: string): Promise<string | null> {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    const storage = (globalThis as any).__binroAsyncStorage;
    if (storage) {
      return await storage.getItem(key);
    }
  } catch {}
  return null;
}

async function setStorageItem(key: string, value: string): Promise<void> {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(key, value);
      return;
    }
    const storage = (globalThis as any).__binroAsyncStorage;
    if (storage) {
      await storage.setItem(key, value);
    }
  } catch {}
}

// ── In-Memory Bounded Vote Cache ──────────────────────────────────────────────

const MAX_CACHED_QRS = 100;
const memoryQrVotes = new Map<string, Map<string, VoteRecord>>();

function parseTimeMs(val: any): number {
  if (!val) return 0;
  if (typeof val === "number") return val;
  if (typeof val?.toDate === "function") return val.toDate().getTime();
  const ms = new Date(val).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

export function normalizeVoteType(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.trim().toLowerCase();
  if (!cleaned || cleaned === "removed" || cleaned === "none" || cleaned === "null") {
    return null;
  }
  if (cleaned === "likely_safe") return "safe";
  return cleaned;
}

function setMemoryVote(qrId: string, record: VoteRecord): void {
  let qrMap = memoryQrVotes.get(qrId);
  if (!qrMap) {
    if (memoryQrVotes.size >= MAX_CACHED_QRS) {
      const oldestKey = memoryQrVotes.keys().next().value;
      if (oldestKey) memoryQrVotes.delete(oldestKey);
    }
    qrMap = new Map();
    memoryQrVotes.set(qrId, qrMap);
  }
  qrMap.set(record.userId, record);
}

export function seedQrReportCountsInMemory(
  qrId: string,
  counts: Record<string, number>,
  weightedCounts?: Record<string, number>
): void {
  if (!counts || Object.keys(counts).length === 0) return;
  const existing = memoryQrVotes.get(qrId);
  if (existing && existing.size > 0) return;

  for (const [rawKey, rawCount] of Object.entries(counts)) {
    const key = normalizeVoteType(rawKey);
    const count = Math.max(0, Math.floor(Number(rawCount) || 0));
    if (!key || count <= 0) continue;
    const totalWeight = Number(weightedCounts?.[rawKey] ?? weightedCounts?.[key] ?? count) || count;
    const perVoteWeight = count > 0 ? totalWeight / count : 1;
    for (let i = 0; i < count; i++) {
      setMemoryVote(qrId, {
        userId: `__seed_${key}_${i}`,
        reportType: key,
        weight: perVoteWeight,
        userRemoved: false,
        timestampMs: 1,
      });
    }
  }
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
    const raw = await getStorageItem(`qr_votes_map_${qrId}`);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, VoteRecord>;
      for (const [uid, rec] of Object.entries(parsed)) {
        if (!rec || typeof rec !== "object") continue;
        const normalized: VoteRecord = {
          userId: rec.userId || uid,
          reportType: rec.userRemoved ? null : normalizeVoteType(rec.reportType),
          weight: Number(rec.weight || 1),
          userRemoved: Boolean(rec.userRemoved || !normalizeVoteType(rec.reportType)),
          timestampMs: Number(rec.timestampMs) || 1,
        };
        const existing = result.get(uid);
        if (!existing || normalized.timestampMs >= existing.timestampMs) {
          result.set(uid, normalized);
          setMemoryVote(qrId, normalized);
        }
      }
    }
  } catch {}

  // If real user votes exist, purge synthetic seed entries to prevent double counting
  const hasRealVote = Array.from(result.keys()).some((k) => !k.startsWith("__seed_"));
  if (hasRealVote) {
    for (const k of Array.from(result.keys())) {
      if (k.startsWith("__seed_")) result.delete(k);
    }
    if (mem) {
      for (const k of Array.from(mem.keys())) {
        if (k.startsWith("__seed_")) mem.delete(k);
      }
    }
  }

  return result;
}

async function saveVoteLocalCache(
  qrId: string,
  userId: string,
  record: VoteRecord
): Promise<void> {
  const memMap = memoryQrVotes.get(qrId);
  if (memMap) {
    for (const key of Array.from(memMap.keys())) {
      if (key.startsWith("__seed_")) memMap.delete(key);
    }
  }
  setMemoryVote(qrId, record);

  try {
    const existingMap = await loadLocalQrVotesMap(qrId);
    for (const key of Array.from(existingMap.keys())) {
      if (key.startsWith("__seed_")) existingMap.delete(key);
    }
    existingMap.set(userId, record);
    const serialized: Record<string, VoteRecord> = {};
    for (const [uid, rec] of existingMap.entries()) {
      serialized[uid] = rec;
    }
    await Promise.all([
      setStorageItem(`qr_votes_map_${qrId}`, JSON.stringify(serialized)),
      setStorageItem(`qr_vote_override_${qrId}_${userId}`, JSON.stringify(record)),
    ]);
  } catch {}
}

// ── Reading & Aggregating Community Votes ─────────────────────────────────────

export async function getMergedQrVotes(
  qrId: string,
  customClient?: SupabaseClient
): Promise<Map<string, VoteRecord>> {
  const client = customClient ?? supabase;
  const byUser = await loadLocalQrVotesMap(qrId);

  const mergeCandidate = (candidate: VoteRecord) => {
    if (!candidate.userId) return;
    if (!candidate.userId.startsWith("__seed_")) {
      for (const k of Array.from(byUser.keys())) {
        if (k.startsWith("__seed_")) byUser.delete(k);
      }
      const memMap = memoryQrVotes.get(qrId);
      if (memMap) {
        for (const k of Array.from(memMap.keys())) {
          if (k.startsWith("__seed_")) memMap.delete(k);
        }
      }
    }
    const prev = byUser.get(candidate.userId);
    if (!prev || candidate.timestampMs >= prev.timestampMs) {
      byUser.set(candidate.userId, candidate);
      if (!candidate.userId.startsWith("__seed_")) {
        setMemoryVote(qrId, candidate);
      }
    }
  };

  try {
    // Query public.qr_reports directly (clean, index-backed single query)
    const { data: dbReports } = await client
      .from("qr_reports")
      .select("user_id, report_type, weight, user_removed, updated_at, created_at")
      .eq("qr_code_id", qrId)
      .limit(500);

    if (Array.isArray(dbReports)) {
      for (const row of dbReports) {
        const uid = String(row.user_id || "");
        if (!uid) continue;
        const normType = normalizeVoteType(row.report_type);
        const isRemoved = Boolean(row.user_removed || !normType);
        const weight = Number(row.weight ?? 1);
        const ts = Math.max(parseTimeMs(row.updated_at), parseTimeMs(row.created_at), 1);

        mergeCandidate({
          userId: uid,
          reportType: isRemoved ? null : normType,
          weight: weight > 0 ? weight : 1,
          userRemoved: isRemoved,
          timestampMs: ts,
        });
      }
    }
  } catch (err) {
    console.warn("[report-service] getMergedQrVotes fetch warning:", err);
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
    const normType = normalizeVoteType(rec.reportType);
    if (rec.userRemoved || !normType) continue;
    counts[normType] = (counts[normType] || 0) + 1;
    weighted[normType] = (weighted[normType] || 0) + Number(rec.weight || 1);
  }
  return { counts, weighted };
}

export async function getMergedQrVotesSummary(
  qrId: string,
  customClient?: SupabaseClient
): Promise<{
  counts: Record<string, number>;
  weighted: Record<string, number>;
}> {
  const byUser = await getMergedQrVotes(qrId, customClient);
  return summarizeVotes(byUser);
}

export async function getQrReportData(qrId: string): Promise<{
  counts: Record<string, number>;
  weighted: Record<string, number>;
}> {
  const byUser = await getMergedQrVotes(qrId);
  const direct = summarizeVotes(byUser);

  // On web browser, if 0 votes found (e.g. unauthenticated visitor with strict RLS),
  // fallback to the Next.js server endpoint
  if (
    typeof window !== "undefined" &&
    typeof document !== "undefined" &&
    Object.keys(direct.counts).length === 0
  ) {
    try {
      const res = await fetch(`/api/qr/${encodeURIComponent(qrId)}/votes`, {
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.reportCounts && Object.keys(json.reportCounts).length > 0) {
          seedQrReportCountsInMemory(qrId, json.reportCounts, json.weightedCounts);
          return {
            counts: json.reportCounts,
            weighted: json.weightedCounts || json.reportCounts,
          };
        }
      }
    } catch {}
  }

  return direct;
}

export async function getQrReportCounts(qrId: string): Promise<Record<string, number>> {
  return (await getQrReportData(qrId)).counts;
}

export async function getQrWeightedReportCounts(qrId: string): Promise<Record<string, number>> {
  return (await getQrReportData(qrId)).weighted;
}

export async function getUserQrReport(qrId: string, userId: string): Promise<string | null> {
  // Check memory and local storage first for latest optimistic user vote
  let best: VoteRecord | null = memoryQrVotes.get(qrId)?.get(userId) ?? null;

  try {
    const raw = await getStorageItem(`qr_vote_override_${qrId}_${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw) as VoteRecord;
      if (parsed && (!best || parsed.timestampMs >= best.timestampMs)) {
        best = {
          userId,
          reportType: parsed.userRemoved ? null : normalizeVoteType(parsed.reportType),
          weight: Number(parsed.weight || 1),
          userRemoved: Boolean(parsed.userRemoved || !normalizeVoteType(parsed.reportType)),
          timestampMs: Number(parsed.timestampMs) || 1,
        };
        setMemoryVote(qrId, best);
      }
    }
  } catch {}

  // Fetch user vote from public.qr_reports
  try {
    const { data: row } = await supabase
      .from("qr_reports")
      .select("report_type, weight, user_removed, updated_at, created_at")
      .eq("qr_code_id", qrId)
      .eq("user_id", userId)
      .maybeSingle();

    if (row) {
      const normType = normalizeVoteType(row.report_type);
      const isRemoved = Boolean(row.user_removed || !normType);
      const ts = Math.max(parseTimeMs(row.updated_at), parseTimeMs(row.created_at), 1);
      if (!best || ts >= best.timestampMs) {
        best = {
          userId,
          reportType: isRemoved ? null : normType,
          weight: Number(row.weight || 1),
          userRemoved: isRemoved,
          timestampMs: ts,
        };
      }
    }
  } catch {}

  if (!best || best.userRemoved) return null;
  setMemoryVote(qrId, best);
  return best.reportType ?? null;
}

// ── Database Integrity Helpers ────────────────────────────────────────────────

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
        const raw = await getStorageItem(`qr_content_${qrId}`);
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
    const now = db.timestamp();

    try {
      await db.set([COLLECTIONS.QR_CODES, qrId], {
        content: finalContent,
        contentType: finalContentType,
        scanCount: 1,
        commentCount: 0,
        createdAt: now,
      });
    } catch {
      await supabase.from("qr_codes").upsert(
        {
          id: qrId,
          content: finalContent,
          content_type: finalContentType,
          scan_count: 1,
          comment_count: 0,
          created_at: now,
        },
        { onConflict: "id" }
      );
    }
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
      photoURL: meta.custom_avatar_url ?? meta.photo_url ?? meta.avatar_url ?? meta.picture ?? null,
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

// ── Persistence to qr_reports ─────────────────────────────────────────────────

async function persistToQrReportsTable(
  qrId: string,
  userId: string,
  reportType: string,
  weight: number,
  accountAgeDays: number,
  emailVerified: boolean,
  userRemoved: boolean,
  isoNow: string
): Promise<void> {
  // Direct upsert on (qr_code_id, user_id)
  const payload = {
    qr_code_id: qrId,
    user_id: userId,
    report_type: reportType,
    weight: userRemoved ? 0 : weight,
    account_age_days: accountAgeDays,
    email_verified: emailVerified,
    user_removed: userRemoved,
    removed_at: userRemoved ? isoNow : null,
    updated_at: isoNow,
  };

  const { error: upsertErr } = await supabase
    .from("qr_reports")
    .upsert(payload, { onConflict: "qr_code_id,user_id" });

  if (!upsertErr) return;

  // Fallback: check if existing row exists, then update or insert
  const { data: existing } = await supabase
    .from("qr_reports")
    .select("id")
    .eq("qr_code_id", qrId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing?.id) {
    await supabase
      .from("qr_reports")
      .update(payload)
      .eq("id", existing.id);
  } else {
    await supabase.from("qr_reports").insert({
      ...payload,
      created_at: isoNow,
    });
  }
}

// ── Main Action: Submitting a Report / Vote ───────────────────────────────────

export async function reportQrCode(
  qrId: string,
  userId: string,
  reportType: string,
  emailVerified: boolean = false,
  qrMeta?: QrReportMeta
): Promise<{ action: "created" | "updated" | "removed" }> {
  // Ensure foreign-key parent rows exist
  await ensureQrCodeExists(qrId, qrMeta);

  const existingReport = await getUserQrReport(qrId, userId);
  const isoNow = new Date().toISOString();
  const timestampMs = Date.now();

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

  const normalizedTargetType = normalizeVoteType(reportType) || reportType;

  // Same type tapped again → unreport / remove vote (toggle off)
  if (existingReport === normalizedTargetType) {
    const removalRecord: VoteRecord = {
      userId,
      reportType: null,
      weight: 0,
      userRemoved: true,
      timestampMs,
    };

    // Optimistic cache update immediately
    await saveVoteLocalCache(qrId, userId, removalRecord);

    // Persist to Supabase
    await persistToQrReportsTable(
      qrId,
      userId,
      normalizedTargetType,
      0,
      accountAgeDays,
      effectiveEmailVerified,
      true,
      isoNow
    );

    return { action: "removed" };
  }

  // Switching an existing vote does not count against new-report rate limits
  const isChangingReport = existingReport !== null;
  const { weight } = await checkReportEligibility(
    userId,
    qrId,
    effectiveEmailVerified,
    isChangingReport
  );

  const newRecord: VoteRecord = {
    userId,
    reportType: normalizedTargetType,
    weight,
    userRemoved: false,
    timestampMs,
  };

  // Optimistic cache update immediately
  await saveVoteLocalCache(qrId, userId, newRecord);

  // Persist to Supabase
  await persistToQrReportsTable(
    qrId,
    userId,
    normalizedTargetType,
    weight,
    accountAgeDays,
    effectiveEmailVerified,
    false,
    isoNow
  );

  if (!isChangingReport) {
    await recordReport(userId, qrId);
  }

  return { action: isChangingReport ? "updated" : "created" };
}

// ── Realtime Subscription ─────────────────────────────────────────────────────

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
    } catch {
      if (!cancelled) onUpdate({}, {});
    }
  };

  void refresh();

  // Supabase Realtime channel subscription for changes to qr_reports
  let channel: any = null;
  try {
    channel = supabase
      .channel(`qr_reports_${qrId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "qr_reports",
          filter: `qr_code_id=eq.${qrId}`,
        },
        () => {
          if (!cancelled) void refresh();
        }
      )
      .subscribe();
  } catch {}

  // Periodic poll fallback for offline / reconnection resilience
  const intervalId = setInterval(() => {
    if (!cancelled) {
      void refresh();
    }
  }, 10_000);

  return () => {
    cancelled = true;
    clearInterval(intervalId);
    if (channel) {
      try {
        supabase.removeChannel(channel);
      } catch {}
    }
  };
}
