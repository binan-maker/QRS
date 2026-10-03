// Weight validation happens at the server-authoritative Express route layer
// before this service is called.

import type { SupabaseClient } from "@supabase/supabase-js";
import { db } from "../../lib/db/client";
import { supabase } from "../../lib/supabase";
import { COLLECTIONS } from "../../shared/constants/collections";
import { getAnonymousQrContent } from "../cache/anonymous-session";
import { detectContentType } from "../qr-content-type";
import {
  checkReportEligibility,
  recordReport,
} from "../integrity";

// Universal storage helper (localStorage on web browser, AsyncStorage on React Native, safe no-op on SSR)
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

const VOTE_SHADOW_PREFIX = "__qr_vote__:";

// In-memory cache of latest per-QR user votes for instant read consistency
const memoryQrVotes = new Map<string, Map<string, VoteRecord>>();
const syncedShadowKeys = new Set<string>();

function parseTimeMs(val: any): number {
  if (!val) return 0;
  if (typeof val === "number") return val;
  if (typeof val?.toDate === "function") return val.toDate().getTime();
  const ms = new Date(val).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function normalizeVoteType(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.trim().toLowerCase();
  if (!cleaned || cleaned === "removed" || cleaned === "none" || cleaned === "null") {
    return null;
  }
  if (cleaned === "likely_safe") return "safe";
  return cleaned;
}

function setMemoryVote(qrId: string, record: VoteRecord): void {
  if (!memoryQrVotes.has(qrId)) {
    memoryQrVotes.set(qrId, new Map());
  }
  memoryQrVotes.get(qrId)!.set(record.userId, record);
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
  return result;
}

async function persistVoteShadowComment(
  qrId: string,
  userId: string,
  reportType: string | null,
  weight: number,
  userRemoved: boolean,
  timestampMs: number,
  isoNow: string
): Promise<void> {
  try {
    const shadowPayload = `${VOTE_SHADOW_PREFIX}${JSON.stringify({
      userId,
      reportType: userRemoved ? null : normalizeVoteType(reportType),
      weight,
      userRemoved,
      timestampMs,
    })}`;

    const { data: existingRows } = await supabase
      .from("qr_comments")
      .select("id")
      .eq("qr_code_id", qrId)
      .eq("user_id", userId)
      .like("text", `${VOTE_SHADOW_PREFIX}%`)
      .limit(5);

    if (Array.isArray(existingRows) && existingRows.length > 0) {
      const firstId = existingRows[0].id;
      const { error: updErr } = await supabase
        .from("qr_comments")
        .update({
          text: shadowPayload,
          is_deleted: true,
          updated_at: isoNow,
        })
        .eq("id", firstId);
      if (!updErr) return;

      await supabase
        .from("qr_comments")
        .update({
          text: shadowPayload,
          is_deleted: true,
        })
        .eq("id", firstId);
      return;
    }

    const { error: insErr } = await supabase.from("qr_comments").insert({
      qr_code_id: qrId,
      user_id: userId,
      user_name: "vote",
      text: shadowPayload,
      is_deleted: true,
      created_at: isoNow,
      updated_at: isoNow,
    });
    if (insErr) {
      await supabase.from("qr_comments").insert({
        qr_code_id: qrId,
        user_id: userId,
        user_name: "vote",
        text: shadowPayload,
        is_deleted: true,
      });
    }
  } catch {}
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
  const normalizedType = userRemoved ? null : normalizeVoteType(reportType);
  const record: VoteRecord = {
    userId,
    reportType: normalizedType,
    weight,
    userRemoved,
    timestampMs,
  };

  // Clear any synthetic seed entries once a real user vote is recorded
  const memMap = memoryQrVotes.get(qrId);
  if (memMap) {
    for (const key of Array.from(memMap.keys())) {
      if (key.startsWith("__seed_")) memMap.delete(key);
    }
  }

  setMemoryVote(qrId, record);

  // 1. Save to localStorage / AsyncStorage per-QR map and per-user key
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

  await Promise.allSettled([
    // 2. Save to rtdb_store
    supabase.from("rtdb_store").upsert(
      {
        path: `qr_vote:${qrId}:${userId}`,
        value: {
          qrCodeId: qrId,
          userId,
          reportType: normalizedType,
          weight,
          userRemoved,
          updatedAt: isoNow,
          timestampMs,
        },
        updated_at: isoNow,
      },
      { onConflict: "path" }
    ),
    // 3. Append to audit_logs
    supabase.from("audit_logs").insert({
      qr_id: qrId,
      user_id: userId,
      action: userRemoved ? "vote:removed" : `vote:${normalizedType}`,
      vote_weight: weight,
      account_age_days: accountAgeDays,
      email_verified: emailVerified,
      created_at: isoNow,
    }),
    // 4. Save in user's own public.users.consent JSONB
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
      const updatedConsent = {
        ...existingConsent,
        qrVotes: {
          ...existingQrVotes,
          [qrId]: {
            reportType: normalizedType,
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
    })(),
    // 5. Save soft-deleted shadow row in qr_comments (publicly readable by anon on web)
    persistVoteShadowComment(
      qrId,
      userId,
      normalizedType,
      weight,
      userRemoved,
      timestampMs,
      isoNow
    ),
  ]);
}

function parseShadowCommentVote(row: any): VoteRecord | null {
  const rawText = typeof row?.text === "string" ? row.text : "";
  if (!rawText.startsWith(VOTE_SHADOW_PREFIX)) return null;
  try {
    const parsed = JSON.parse(rawText.slice(VOTE_SHADOW_PREFIX.length));
    const uid = parsed?.userId || row?.user_id || row?.userId;
    if (!uid) return null;
    const normType = normalizeVoteType(parsed?.reportType);
    const isRemoved = Boolean(parsed?.userRemoved || !normType);
    const ts =
      Number(parsed?.timestampMs) ||
      parseTimeMs(row?.updated_at ?? row?.updatedAt) ||
      parseTimeMs(row?.created_at ?? row?.createdAt) ||
      5;
    return {
      userId: String(uid),
      reportType: isRemoved ? null : normType,
      weight: Number(parsed?.weight || 1),
      userRemoved: isRemoved,
      timestampMs: ts,
    };
  } catch {
    return null;
  }
}

export async function getMergedQrVotes(
  qrId: string,
  customClient?: SupabaseClient
): Promise<Map<string, VoteRecord>> {
  const client = customClient ?? supabase;
  const byUser = await loadLocalQrVotesMap(qrId);

  const mergeCandidate = (candidate: VoteRecord) => {
    if (!candidate.userId) return;
    // Remove synthetic seed entries once real DB votes arrive
    if (!candidate.userId.startsWith("__seed_")) {
      for (const k of Array.from(byUser.keys())) {
        if (k.startsWith("__seed_")) byUser.delete(k);
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

  const [
    reportsRes,
    rawReportsRes,
    auditRes,
    rtdbRes,
    usersConsentRes,
    shadowCommentsRes,
    sessionRes,
  ] = await Promise.allSettled([
    customClient
      ? Promise.resolve(null)
      : db.query([COLLECTIONS.QR_CODES, qrId, COLLECTIONS.REPORTS], { limit: 500 }),
    client.from("qr_reports").select("*").eq("qr_code_id", qrId).limit(500),
    client
      .from("audit_logs")
      .select("*")
      .eq("qr_id", qrId)
      .like("action", "vote:%")
      .order("created_at", { ascending: true })
      .limit(500),
    client
      .from("rtdb_store")
      .select("*")
      .like("path", `qr_vote:${qrId}:%`)
      .limit(500),
    client
      .from("users")
      .select("id, consent")
      .not("consent", "is", null)
      .limit(500),
    client
      .from("qr_comments")
      .select("*")
      .eq("qr_code_id", qrId)
      .like("text", `${VOTE_SHADOW_PREFIX}%`)
      .limit(500),
    client.auth.getSession(),
  ]);

  let hasPublicRowForCurrentUid = false;
  const currentUid =
    sessionRes.status === "fulfilled" ? sessionRes.value?.data?.session?.user?.id : null;

  if (reportsRes.status === "fulfilled" && reportsRes.value?.docs) {
    for (const d of reportsRes.value.docs) {
      const data = d.data;
      const uid = data.userId || data.reporterId || d.id;
      if (!uid) continue;
      if (currentUid && String(uid) === currentUid) hasPublicRowForCurrentUid = true;
      const rawWeight = data.weight !== undefined && data.weight !== null ? Number(data.weight) : 1;
      const normType = normalizeVoteType(data.reportType ?? data.type);
      const isRemoved = Boolean(data.userRemoved || !normType || rawWeight <= 0);
      const ts = Math.max(parseTimeMs(data.updatedAt), parseTimeMs(data.createdAt), 1);
      mergeCandidate({
        userId: String(uid),
        reportType: isRemoved ? null : normType,
        weight: rawWeight > 0 ? rawWeight : 1,
        userRemoved: isRemoved,
        timestampMs: ts,
      });
    }
  }

  if (rawReportsRes.status === "fulfilled" && Array.isArray(rawReportsRes.value?.data)) {
    for (const r of rawReportsRes.value.data as any[]) {
      const uid = r.user_id || r.userId || r.reporter_id || r.reporterId || r.id;
      if (!uid) continue;
      if (currentUid && String(uid) === currentUid) hasPublicRowForCurrentUid = true;
      const rawWeight = r.weight !== undefined && r.weight !== null ? Number(r.weight) : 1;
      const normType = normalizeVoteType(r.report_type ?? r.reportType ?? r.type);
      const isRemoved = Boolean(
        r.user_removed ?? r.userRemoved ?? (!normType || rawWeight <= 0)
      );
      const ts = Math.max(
        parseTimeMs(r.updated_at ?? r.updatedAt),
        parseTimeMs(r.created_at ?? r.createdAt),
        1
      );
      mergeCandidate({
        userId: String(uid),
        reportType: isRemoved ? null : normType,
        weight: rawWeight > 0 ? rawWeight : 1,
        userRemoved: isRemoved,
        timestampMs: ts,
      });
    }
  }

  if (auditRes.status === "fulfilled" && Array.isArray(auditRes.value?.data)) {
    for (const row of auditRes.value.data as any[]) {
      const uid = row.user_id ?? row.userId;
      const action: string = row.action || "";
      if (!uid || !action.startsWith("vote:")) continue;
      const rawVoteType = action.slice("vote:".length);
      const normType = normalizeVoteType(rawVoteType);
      const isRemoved = rawVoteType === "removed" || !normType;
      const ts = parseTimeMs(row.created_at ?? row.createdAt) || 2;
      mergeCandidate({
        userId: String(uid),
        reportType: isRemoved ? null : normType,
        weight: Number(row.vote_weight ?? row.voteWeight ?? 1),
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
      const normType = normalizeVoteType(val.reportType);
      const isRemoved = Boolean(val.userRemoved || !normType);
      const ts =
        Number(val.timestampMs) ||
        parseTimeMs(val.updatedAt) ||
        parseTimeMs(row.updated_at) ||
        3;
      mergeCandidate({
        userId: String(uid),
        reportType: isRemoved ? null : normType,
        weight: Number(val.weight || 1),
        userRemoved: isRemoved,
        timestampMs: ts,
      });
    }
  }

  if (usersConsentRes.status === "fulfilled" && Array.isArray(usersConsentRes.value?.data)) {
    for (const uRow of usersConsentRes.value.data as any[]) {
      const uid = uRow?.id;
      const qrVote = (uRow?.consent as any)?.qrVotes?.[qrId];
      if (uid && qrVote && typeof qrVote === "object") {
        const normType = normalizeVoteType(qrVote.reportType);
        const isRemoved = Boolean(qrVote.userRemoved || !normType);
        const ts = Number(qrVote.timestampMs) || parseTimeMs(qrVote.updatedAt) || 4;
        mergeCandidate({
          userId: String(uid),
          reportType: isRemoved ? null : normType,
          weight: Number(qrVote.weight || 1),
          userRemoved: isRemoved,
          timestampMs: ts,
        });
      }
    }
  }

  if (
    shadowCommentsRes.status === "fulfilled" &&
    Array.isArray(shadowCommentsRes.value?.data)
  ) {
    for (const cRow of shadowCommentsRes.value.data as any[]) {
      const parsed = parseShadowCommentVote(cRow);
      if (parsed) {
        if (currentUid && parsed.userId === currentUid) hasPublicRowForCurrentUid = true;
        mergeCandidate(parsed);
      }
    }
  }

  if (currentUid) {
    try {
      const { data: userRow } = await client
        .from("users")
        .select("consent")
        .eq("id", currentUid)
        .maybeSingle();
      const qrVote = (userRow?.consent as any)?.qrVotes?.[qrId];
      if (qrVote && typeof qrVote === "object") {
        const normType = normalizeVoteType(qrVote.reportType);
        const isRemoved = Boolean(qrVote.userRemoved || !normType);
        const ts = Number(qrVote.timestampMs) || parseTimeMs(qrVote.updatedAt) || 4;
        mergeCandidate({
          userId: currentUid,
          reportType: isRemoved ? null : normType,
          weight: Number(qrVote.weight || 1),
          userRemoved: isRemoved,
          timestampMs: ts,
        });
      }
    } catch {}

    // Self-heal: if authenticated user has a local/consent vote not yet in qr_reports/qr_comments, publish it
    const myVote = byUser.get(currentUid);
    const syncKey = `${qrId}:${currentUid}:${myVote?.reportType ?? "none"}:${myVote?.userRemoved ?? false}`;
    if (myVote && !hasPublicRowForCurrentUid && !syncedShadowKeys.has(syncKey)) {
      syncedShadowKeys.add(syncKey);
      const isoNow = new Date(myVote.timestampMs || Date.now()).toISOString();
      void Promise.allSettled([
        ensureQrCodeExists(qrId),
        persistToQrReportsTable(
          qrId,
          currentUid,
          myVote.reportType || "safe",
          myVote.weight || 1,
          0,
          true,
          myVote.userRemoved,
          isoNow
        ),
        persistVoteShadowComment(
          qrId,
          currentUid,
          myVote.reportType,
          myVote.weight || 1,
          myVote.userRemoved,
          myVote.timestampMs || Date.now(),
          isoNow
        ),
      ]);
    }
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

  // On web browser, if direct client query has 0 votes (e.g. unauthenticated visitor with strict RLS),
  // also check the Next.js server votes endpoint.
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
  // Check in-memory and local storage override first so we have the latest timestamped intent
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

  const [docRes, rawReportRes, auditRes, rtdbRes, userRes, shadowRes] = await Promise.allSettled([
    db.get([COLLECTIONS.QR_CODES, qrId, COLLECTIONS.REPORTS, userId]),
    supabase
      .from("qr_reports")
      .select("*")
      .eq("qr_code_id", qrId)
      .eq("user_id", userId)
      .limit(5),
    supabase
      .from("audit_logs")
      .select("*")
      .eq("qr_id", qrId)
      .eq("user_id", userId)
      .like("action", "vote:%")
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("rtdb_store")
      .select("*")
      .eq("path", `qr_vote:${qrId}:${userId}`)
      .maybeSingle(),
    supabase
      .from("users")
      .select("consent")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("qr_comments")
      .select("*")
      .eq("qr_code_id", qrId)
      .eq("user_id", userId)
      .like("text", `${VOTE_SHADOW_PREFIX}%`)
      .limit(5),
  ]);

  if (docRes.status === "fulfilled" && docRes.value) {
    const data = docRes.value;
    const rawWeight = data.weight !== undefined && data.weight !== null ? Number(data.weight) : 1;
    const normType = normalizeVoteType(data.reportType ?? data.type);
    const isRemoved = Boolean(data.userRemoved || !normType || rawWeight <= 0);
    const ts = Math.max(parseTimeMs(data.updatedAt), parseTimeMs(data.createdAt), 1);
    if (!best || ts > best.timestampMs) {
      best = {
        userId,
        reportType: isRemoved ? null : normType,
        weight: rawWeight > 0 ? rawWeight : 1,
        userRemoved: isRemoved,
        timestampMs: ts,
      };
    }
  }

  if (rawReportRes.status === "fulfilled" && Array.isArray(rawReportRes.value?.data) && rawReportRes.value.data[0]) {
    for (const r of rawReportRes.value.data as any[]) {
      const rawWeight = r.weight !== undefined && r.weight !== null ? Number(r.weight) : 1;
      const normType = normalizeVoteType(r.report_type ?? r.reportType ?? r.type);
      const isRemoved = Boolean(r.user_removed ?? r.userRemoved ?? (!normType || rawWeight <= 0));
      const ts = Math.max(parseTimeMs(r.updated_at), parseTimeMs(r.created_at), 1);
      if (!best || ts >= best.timestampMs) {
        best = {
          userId,
          reportType: isRemoved ? null : normType,
          weight: rawWeight > 0 ? rawWeight : 1,
          userRemoved: isRemoved,
          timestampMs: ts,
        };
      }
    }
  }

  if (auditRes.status === "fulfilled" && Array.isArray(auditRes.value?.data) && auditRes.value.data[0]) {
    const row = auditRes.value.data[0] as any;
    const action: string = row.action || "";
    const rawVoteType = action.slice("vote:".length);
    const normType = normalizeVoteType(rawVoteType);
    const isRemoved = rawVoteType === "removed" || !normType;
    const ts = parseTimeMs(row.created_at ?? row.createdAt) || 2;
    if (!best || ts >= best.timestampMs) {
      best = {
        userId,
        reportType: isRemoved ? null : normType,
        weight: Number(row.vote_weight ?? row.voteWeight ?? 1),
        userRemoved: isRemoved,
        timestampMs: ts,
      };
    }
  }

  if (rtdbRes.status === "fulfilled" && rtdbRes.value?.data) {
    const row = rtdbRes.value.data as any;
    const val = row.value;
    if (val && typeof val !== "object") {
      // ignore
    } else if (val && typeof val === "object") {
      const normType = normalizeVoteType(val.reportType);
      const isRemoved = Boolean(val.userRemoved || !normType);
      const ts =
        Number(val.timestampMs) ||
        parseTimeMs(val.updatedAt) ||
        parseTimeMs(row.updated_at) ||
        3;
      if (!best || ts >= best.timestampMs) {
        best = {
          userId,
          reportType: isRemoved ? null : normType,
          weight: Number(val.weight || 1),
          userRemoved: isRemoved,
          timestampMs: ts,
        };
      }
    }
  }

  if (userRes.status === "fulfilled" && userRes.value?.data) {
    const qrVote = (userRes.value.data?.consent as any)?.qrVotes?.[qrId];
    if (qrVote && typeof qrVote === "object") {
      const normType = normalizeVoteType(qrVote.reportType);
      const isRemoved = Boolean(qrVote.userRemoved || !normType);
      const ts = Number(qrVote.timestampMs) || parseTimeMs(qrVote.updatedAt) || 4;
      if (!best || ts >= best.timestampMs) {
        best = {
          userId,
          reportType: isRemoved ? null : normType,
          weight: Number(qrVote.weight || 1),
          userRemoved: isRemoved,
          timestampMs: ts,
        };
      }
    }
  }

  if (shadowRes.status === "fulfilled" && Array.isArray(shadowRes.value?.data)) {
    for (const cRow of shadowRes.value.data as any[]) {
      const parsed = parseShadowCommentVote(cRow);
      if (parsed && (!best || parsed.timestampMs >= best.timestampMs)) {
        best = parsed;
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
    .select("*")
    .eq("qr_code_id", qrId)
    .eq("user_id", userId)
    .limit(10);

  const hasExistingRows = Array.isArray(existingRows) && existingRows.length > 0;

  if (hasExistingRows) {
    if (userRemoved) {
      // Try DELETE first so tables without user_removed column also remove the vote cleanly
      const { data: deletedRows, error: deleteErr } = await supabase
        .from("qr_reports")
        .delete()
        .eq("qr_code_id", qrId)
        .eq("user_id", userId)
        .select();

      if (!deleteErr && Array.isArray(deletedRows) && deletedRows.length > 0) {
        return;
      }
    }

    // 1. Try direct UPDATE on qr_reports
    const { data: updatedRows, error: updateErr } = await supabase
      .from("qr_reports")
      .update({
        report_type: reportType,
        weight: userRemoved ? 0 : weight,
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

    // Fallback update with minimal columns if optional columns don't exist
    if (updateErr) {
      if (userRemoved) {
        const { data: zeroUpdated, error: zeroErr } = await supabase
          .from("qr_reports")
          .update({ weight: 0 })
          .eq("qr_code_id", qrId)
          .eq("user_id", userId)
          .select();
        if (!zeroErr && Array.isArray(zeroUpdated) && zeroUpdated.length > 0) {
          return;
        }
      } else {
        const { data: minUpdatedWithWeight, error: minWeightErr } = await supabase
          .from("qr_reports")
          .update({ report_type: reportType, weight })
          .eq("qr_code_id", qrId)
          .eq("user_id", userId)
          .select();
        if (!minWeightErr && Array.isArray(minUpdatedWithWeight) && minUpdatedWithWeight.length > 0) {
          return;
        }
        const { data: minUpdated, error: minUpdateErr } = await supabase
          .from("qr_reports")
          .update({ report_type: reportType })
          .eq("qr_code_id", qrId)
          .eq("user_id", userId)
          .select();
        if (!minUpdateErr && Array.isArray(minUpdated) && minUpdated.length > 0) {
          return;
        }
      }
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

      await supabase.from("qr_reports").insert({
        qr_code_id: qrId,
        user_id: userId,
        report_type: reportType,
      });
      return;
    }

    // 3. If DELETE also affected 0 rows, try INSERT
    const { error: insErr } = await supabase.from("qr_reports").insert({
      qr_code_id: qrId,
      user_id: userId,
      report_type: reportType,
      weight: userRemoved ? 0 : weight,
      account_age_days: accountAgeDays,
      email_verified: emailVerified,
      user_removed: userRemoved,
      removed_at: userRemoved ? now : null,
      created_at: now,
      updated_at: now,
    });
    if (insErr && !userRemoved) {
      await supabase.from("qr_reports").insert({
        qr_code_id: qrId,
        user_id: userId,
        report_type: reportType,
      });
    }
    return;
  }

  if (userRemoved) return;

  // First-time insert into qr_reports (with minimal-column fallback if optional columns are absent)
  const { error: insertErr } = await supabase.from("qr_reports").insert({
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

  if (insertErr) {
    const { error: fallbackErr } = await supabase.from("qr_reports").insert({
      qr_code_id: qrId,
      user_id: userId,
      report_type: reportType,
      weight,
    });
    if (fallbackErr) {
      await supabase.from("qr_reports").insert({
        qr_code_id: qrId,
        user_id: userId,
        report_type: reportType,
      });
    }
  }
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

  const normalizedTargetType = normalizeVoteType(reportType) || reportType;

  // Same type tapped again → unreport (toggle off).
  if (existingReport === normalizedTargetType) {
    await Promise.all([
      persistToQrReportsTable(
        qrId,
        userId,
        normalizedTargetType,
        0,
        accountAgeDays,
        effectiveEmailVerified,
        true,
        now
      ),
      saveVoteOverride(
        qrId,
        userId,
        normalizedTargetType,
        0,
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
      normalizedTargetType,
      weight,
      accountAgeDays,
      effectiveEmailVerified,
      false,
      now
    ),
    saveVoteOverride(
      qrId,
      userId,
      normalizedTargetType,
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

  void refresh();

  const unsub = db.onQuery([COLLECTIONS.QR_CODES, qrId, COLLECTIONS.REPORTS], { limit: 500 }, () => {
    if (!cancelled) {
      void refresh();
    }
  });

  const intervalId = setInterval(() => {
    if (!cancelled) {
      void refresh();
    }
  }, 10_000);

  return () => {
    cancelled = true;
    clearInterval(intervalId);
    unsub();
  };
}
