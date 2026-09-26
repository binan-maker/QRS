"use client";

import { getWebSupabase } from "./supabase";

export type WebQrComment = {
  id: string;
  userId: string | null;
  userName: string;
  userPhotoURL: string | null;
  text: string;
  parentId: string | null;
  likes: number;
  dislikes: number;
  isEdited: boolean;
  createdAt: string | null;
};

export type QrCommunitySummary = {
  reportCounts: Record<string, number>;
  weightedCounts: Record<string, number>;
  trustScore: {
    score: number;
    label: string;
    totalReports: number;
    manipulationWarning?: boolean;
  };
  userReport: string | null;
};

type QrForeignKey = { qr_code_id: string } | { unified_qr_id: string };

function timestampToString(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  const timestamp = value as { toDate?: () => Date; seconds?: number };
  if (typeof timestamp.toDate === "function") return timestamp.toDate().toISOString();
  if (typeof timestamp.seconds === "number") return new Date(timestamp.seconds * 1000).toISOString();
  return null;
}

function mapComment(row: Record<string, any>): WebQrComment {
  return {
    id: String(row.id),
    userId: typeof row.user_id === "string" ? row.user_id : null,
    userName: row.user_name ?? "BinRo user",
    userPhotoURL: row.user_photo_url ?? null,
    text: row.text ?? "",
    parentId: row.parent_id ?? null,
    likes: Number(row.likes ?? 0),
    dislikes: Number(row.dislikes ?? 0),
    isEdited: row.is_edited === true,
    createdAt: timestampToString(row.created_at),
  };
}

async function currentSession() {
  const { data, error } = await getWebSupabase().auth.getSession();
  if (error) throw error;
  if (!data.session?.user || !data.session.access_token) {
    throw new Error("Sign in to use this community feature.");
  }
  return data.session;
}

async function resolveQrForeignKey(qrId: string): Promise<QrForeignKey> {
  const supabase = getWebSupabase();
  const [legacy, unified] = await Promise.all([
    supabase.from("qr_codes").select("id").eq("id", qrId).maybeSingle(),
    supabase.from("unified_qrs").select("id").eq("id", qrId).maybeSingle(),
  ]);
  if (legacy.error) throw legacy.error;
  if (unified.error) throw unified.error;
  if (legacy.data) return { qr_code_id: qrId };
  if (unified.data) return { unified_qr_id: qrId };
  throw new Error("QR code not found.");
}

async function fetchStats(qrId: string): Promise<{ scanCount: number; commentCount: number }> {
  const supabase = getWebSupabase();
  const [legacy, unified] = await Promise.all([
    supabase.from("qr_codes").select("scan_count,comment_count").eq("id", qrId).maybeSingle(),
    supabase.from("unified_qrs").select("scan_count").eq("id", qrId).maybeSingle(),
  ]);
  if (legacy.error) throw legacy.error;
  if (unified.error) throw unified.error;
  return {
    scanCount: Number(legacy.data?.scan_count ?? unified.data?.scan_count ?? 0),
    commentCount: Number(legacy.data?.comment_count ?? 0),
  };
}

async function fetchComments(qrId: string): Promise<WebQrComment[]> {
  const { data, error } = await getWebSupabase()
    .from("qr_comments")
    .select("id,user_id,user_name,text,parent_id,likes,is_edited,created_at,is_deleted")
    .or(`qr_code_id.eq.${qrId},unified_qr_id.eq.${qrId}`)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return ((data ?? []) as Record<string, any>[]).map(mapComment);
}

async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const session = await currentSession();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${session.access_token}`);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const response = await fetch(path, { ...init, headers });
  const payload = (await response.json().catch(() => null)) as { data?: T; error?: string } | null;
  if (!response.ok) throw new Error(payload?.error ?? "Request failed.");
  return payload?.data as T;
}

export function subscribeToQrStats(
  qrId: string,
  onUpdate: (stats: { scanCount: number; commentCount: number }) => void,
): () => void {
  let cancelled = false;
  const supabase = getWebSupabase();
  const refresh = () => {
    void fetchStats(qrId)
      .then((stats) => {
        if (!cancelled) onUpdate(stats);
      })
      .catch(() => {});
  };

  refresh();
  const interval = window.setInterval(refresh, 15_000);
  const channel = supabase
    .channel(`web-qr-stats:${qrId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "qr_codes", filter: `id=eq.${qrId}` }, refresh)
    .on("postgres_changes", { event: "*", schema: "public", table: "unified_qrs", filter: `id=eq.${qrId}` }, refresh)
    .subscribe();

  return () => {
    cancelled = true;
    window.clearInterval(interval);
    void supabase.removeChannel(channel);
  };
}

export function subscribeToQrComments(
  qrId: string,
  onUpdate: (comments: WebQrComment[]) => void,
  onError?: (error: Error) => void,
): () => void {
  let cancelled = false;
  const supabase = getWebSupabase();
  const refresh = () => {
    void fetchComments(qrId)
      .then((comments) => {
        if (!cancelled) onUpdate(comments);
      })
      .catch((error: unknown) => {
        if (!cancelled) onError?.(error instanceof Error ? error : new Error("Unable to load comments."));
      });
  };

  refresh();
  const interval = window.setInterval(refresh, 15_000);
  const channel = supabase
    .channel(`web-qr-comments:${qrId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "qr_comments" }, refresh)
    .subscribe();

  return () => {
    cancelled = true;
    window.clearInterval(interval);
    void supabase.removeChannel(channel);
  };
}

export async function addQrComment(qrId: string, text: string): Promise<WebQrComment> {
  const session = await currentSession();
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Comment cannot be empty.");
  if (trimmed.length > 500) throw new Error("Comments must be 500 characters or fewer.");

  const user = session.user;
  const foreignKey = await resolveQrForeignKey(qrId);
  const displayName =
    user.user_metadata?.display_name ??
    user.user_metadata?.full_name ??
    user.email?.split("@")[0] ??
    "BinRo user";

  const { data, error } = await getWebSupabase()
    .from("qr_comments")
    .insert({
      ...foreignKey,
      user_id: user.id,
      user_name: displayName,
      text: trimmed,
    })
    .select("id,user_id,user_name,text,parent_id,likes,is_edited,created_at")
    .single();
  if (error) throw error;
  return mapComment(data as Record<string, any>);
}

export async function updateQrComment(qrId: string, commentId: string, text: string): Promise<void> {
  const session = await currentSession();
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Comment cannot be empty.");
  if (trimmed.length > 500) throw new Error("Comments must be 500 characters or fewer.");

  const { error } = await getWebSupabase()
    .from("qr_comments")
    .update({ text: trimmed, is_edited: true, updated_at: new Date().toISOString() })
    .eq("id", commentId)
    .eq("user_id", session.user.id);
  if (error) throw error;
  void qrId;
}

export async function deleteQrComment(qrId: string, commentId: string): Promise<void> {
  const session = await currentSession();
  const { error } = await getWebSupabase()
    .from("qr_comments")
    .update({ text: "[deleted]", is_deleted: true, updated_at: new Date().toISOString() })
    .eq("id", commentId)
    .eq("user_id", session.user.id);
  if (error) throw error;
  void qrId;
}

export async function toggleQrCommentLike(
  qrId: string,
  commentId: string,
  isLike: boolean,
): Promise<{ liked: boolean; likes: number; dislikes: number }> {
  void isLike;
  return apiRequest(`/api/v1/qr/${encodeURIComponent(qrId)}/comments/${encodeURIComponent(commentId)}/like`, {
    method: "POST",
  });
}

export async function fetchQrCommunitySummary(qrId: string): Promise<QrCommunitySummary | null> {
  try {
    const response = await fetch(`/api/v1/qr/${encodeURIComponent(qrId)}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { data?: QrCommunitySummary };
    return payload.data ?? null;
  } catch {
    return null;
  }
}

export async function submitQrReport(qrId: string, reportType: string): Promise<void> {
  await apiRequest(`/api/v1/qr/${encodeURIComponent(qrId)}/report`, {
    method: "POST",
    body: JSON.stringify({ reportType }),
  });
}