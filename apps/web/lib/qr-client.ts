import type { Session, User } from "@supabase/supabase-js";
import { getWebSupabase } from "./supabase";

export type WebQrComment = {
  id: string;
  userId: string;
  userName: string;
  text: string;
  parentId: string | null;
  likes: number;
  isEdited: boolean;
  createdAt: string | null;
  replies: WebQrComment[];
};

export type QrForeignKey = { qr_code_id: string };

function mapComment(record: Record<string, any>): WebQrComment {
  return {
    id: String(record.id),
    userId: String(record.user_id ?? record.userId ?? ""),
    userName: String(record.user_name ?? record.userName ?? "Anonymous"),
    text: String(record.text ?? ""),
    parentId: record.parent_id ?? record.parentId ?? null,
    likes: Number(record.likes ?? 0),
    isEdited: Boolean(record.is_edited ?? record.isEdited),
    createdAt: record.created_at ?? record.createdAt ?? null,
    replies: [],
  };
}

export function nestComments(flat: WebQrComment[]): WebQrComment[] {
  const byId = new Map<string, WebQrComment>();
  const roots: WebQrComment[] = [];

  for (const comment of flat) {
    byId.set(comment.id, { ...comment, replies: [] });
  }

  for (const comment of byId.values()) {
    if (comment.parentId && byId.has(comment.parentId)) {
      byId.get(comment.parentId)!.replies.push(comment);
    } else {
      roots.push(comment);
    }
  }

  roots.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  for (const root of roots) {
    root.replies.sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));
  }
  return roots;
}

export async function currentSession(): Promise<Session> {
  const { data, error } = await getWebSupabase().auth.getSession();
  if (error) throw error;
  if (!data.session?.user || !data.session.access_token) {
    throw new Error("Sign in to use this community feature.");
  }
  return data.session;
}

async function resolveQrForeignKey(qrId: string): Promise<QrForeignKey> {
  const supabase = getWebSupabase();
  const { data, error } = await supabase.from("qr_codes").select("id").eq("id", qrId).maybeSingle();
  if (error) throw error;
  if (data) return { qr_code_id: qrId };
  throw new Error("QR code not found.");
}

async function fetchStats(qrId: string): Promise<{ scanCount: number; commentCount: number }> {
  const supabase = getWebSupabase();
  const { data, error } = await supabase.from("qr_codes").select("scan_count,comment_count").eq("id", qrId).maybeSingle();
  if (error) throw error;
  return {
    scanCount: Number(data?.scan_count ?? 0),
    commentCount: Number(data?.comment_count ?? 0),
  };
}

async function fetchComments(qrId: string): Promise<WebQrComment[]> {
  const { data, error } = await getWebSupabase()
    .from("qr_comments")
    .select("id,user_id,user_name,text,parent_id,likes,is_edited,created_at,is_deleted")
    .eq("qr_code_id", qrId)
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
): () => void {
  let cancelled = false;
  const supabase = getWebSupabase();
  const refresh = () => {
    void fetchComments(qrId)
      .then((comments) => {
        if (!cancelled) onUpdate(nestComments(comments));
      })
      .catch(() => {});
  };

  refresh();
  const interval = window.setInterval(refresh, 15_000);
  const channel = supabase
    .channel(`web-qr-comments:${qrId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "qr_comments", filter: `qr_code_id=eq.${qrId}` }, refresh)
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
): Promise<WebQrComment> {
  const session = await currentSession();
  const supabase = getWebSupabase();
  const foreignKey = await resolveQrForeignKey(qrId);

  const { data: userProfile } = await supabase
    .from("users")
    .select("display_name,username")
    .eq("id", session.user.id)
    .maybeSingle();

  const userName =
    userProfile?.display_name ||
    userProfile?.username ||
    session.user.user_metadata?.display_name ||
    session.user.user_metadata?.full_name ||
    session.user.email?.split("@")[0] ||
    "Community member";

  const { data, error } = await supabase
    .from("qr_comments")
    .insert({
      ...foreignKey,
      user_id: session.user.id,
      user_name: userName,
      text: text.trim(),
      parent_id: parentId ?? null,
    })
    .select("id,user_id,user_name,text,parent_id,likes,is_edited,created_at")
    .single();

  if (error) throw error;

  try {
    await apiRequest(`/api/v1/qr/${encodeURIComponent(qrId)}/comment-count`, {
      method: "POST",
      body: JSON.stringify({ delta: 1 }),
    });
  } catch {
    // Non-blocking
  }

  return mapComment(data as Record<string, any>);
}

export async function toggleQrCommentLike(
  commentId: string,
): Promise<{ liked: boolean; likes: number }> {
  const session = await currentSession();
  const supabase = getWebSupabase();

  const { data: existing, error: existingError } = await supabase
    .from("comment_likes")
    .select("comment_id")
    .eq("comment_id", commentId)
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing) {
    const { error: deleteError } = await supabase
      .from("comment_likes")
      .delete()
      .eq("comment_id", commentId)
      .eq("user_id", session.user.id);
    if (deleteError) throw deleteError;

    const { data: comment, error: fetchError } = await supabase
      .from("qr_comments")
      .select("likes")
      .eq("id", commentId)
      .single();
    if (fetchError) throw fetchError;

    const nextLikes = Math.max(0, Number(comment?.likes ?? 1) - 1);
    await supabase.from("qr_comments").update({ likes: nextLikes }).eq("id", commentId);
    return { liked: false, likes: nextLikes };
  }

  const { error: insertError } = await supabase
    .from("comment_likes")
    .insert({ comment_id: commentId, user_id: session.user.id });
  if (insertError) throw insertError;

  const { data: comment, error: fetchError } = await supabase
    .from("qr_comments")
    .select("likes")
    .eq("id", commentId)
    .single();
  if (fetchError) throw fetchError;

  const nextLikes = Number(comment?.likes ?? 0) + 1;
  await supabase.from("qr_comments").update({ likes: nextLikes }).eq("id", commentId);
  return { liked: true, likes: nextLikes };
}

export async function submitQrReport(
  qrId: string,
  reportType: string,
): Promise<{ action: "created" | "updated" | "removed" }> {
  return apiRequest<{ action: "created" | "updated" | "removed" }>(
    `/api/v1/qr/${encodeURIComponent(qrId)}/report`,
    {
      method: "POST",
      body: JSON.stringify({ reportType }),
    },
  );
}
