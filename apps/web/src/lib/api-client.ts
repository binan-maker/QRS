/**
 * Typed API client for the BinRo Express backend.
 *
 * Two factory functions for the two call sites:
 *
 *   createServerApiClient(token?)
 *     — use in Server Components and Route Handlers
 *     — token is the Firebase session cookie value (from cookies())
 *
 *   createClientApiClient(getToken)
 *     — use in Client Components
 *     — getToken is () => user.getIdToken() from Firebase Auth
 *
 * Both return the same BinroApiClient interface so call sites are identical.
 *
 * Error handling: every method returns ApiResult<T>.
 * Check result.ok before accessing result.data.
 */

import type {
  ApiResult,
  UserProfile,
  PublicUserProfile,
  UpdateProfileInput,
  UnifiedQr,
  CreateQrInput,
  UpdateQrInput,
  QrAnalytics,
  QrComment,
  Notification,
  ScanRecord,
  FriendRecord,
  PaginatedResponse,
  PaginationParams,
} from "@/types/api";
import { publicEnv } from "@/lib/env";

// ─── Internal request helper ─────────────────────────────────────────────────

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

async function request<T>(
  baseUrl: string,
  getToken: () => Promise<string | null>,
  method: HttpMethod,
  path: string,
  body?: unknown,
  params?: Record<string, string | number | undefined>,
): Promise<ApiResult<T>> {
  try {
    const url = new URL(`${baseUrl}/api/v1${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined) url.searchParams.set(k, String(v));
      });
    }

    const token = await getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url.toString(), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      // For server-side calls within the same deployment: no-store to avoid caching auth data
      cache: "no-store",
    });

    const json = await res.json().catch(() => ({
      error: "Invalid JSON response",
      code: "PARSE_ERROR",
      status: res.status,
    }));

    if (!res.ok) {
      return { ok: false, error: json.error ?? "Unknown error", code: json.code ?? "UNKNOWN", status: res.status };
    }

    return { ok: true, data: json.data ?? json };
  } catch (e: any) {
    return { ok: false, error: e.message ?? "Network error", code: "NETWORK_ERROR", status: 0 };
  }
}

// ─── Client class ─────────────────────────────────────────────────────────────

class BinroApiClient {
  private baseUrl: string;
  private getToken: () => Promise<string | null>;

  constructor(baseUrl: string, getToken: () => Promise<string | null>) {
    this.baseUrl = baseUrl;
    this.getToken = getToken;
  }

  private get = <T>(path: string, params?: Record<string, string | number | undefined>) =>
    request<T>(this.baseUrl, this.getToken, "GET", path, undefined, params);

  private post = <T>(path: string, body?: unknown) =>
    request<T>(this.baseUrl, this.getToken, "POST", path, body);

  private patch = <T>(path: string, body?: unknown) =>
    request<T>(this.baseUrl, this.getToken, "PATCH", path, body);

  private del = <T>(path: string) =>
    request<T>(this.baseUrl, this.getToken, "DELETE", path);

  // ── Users ──────────────────────────────────────────────────────────────────

  users = {
    me: () =>
      this.get<UserProfile>("/users/me"),

    updateMe: (data: UpdateProfileInput) =>
      this.patch<{ updated: boolean }>("/users/me", data),

    getById: (userId: string) =>
      this.get<PublicUserProfile>(`/users/${userId}`),

    scans: (params?: PaginationParams) =>
      this.get<PaginatedResponse<ScanRecord>>("/users/me/scans", params as any),

    favorites: (params?: PaginationParams) =>
      this.get<PaginatedResponse<{ qrCodeId: string; createdAt: string | null }>>("/users/me/favorites", params as any),

    addFavorite: (qrId: string) =>
      this.post<{ added: boolean; qrCodeId: string }>(`/users/me/favorites/${qrId}`),

    removeFavorite: (qrId: string) =>
      this.del<{ removed: boolean; qrCodeId: string }>(`/users/me/favorites/${qrId}`),

    notifications: (params?: PaginationParams) =>
      this.get<PaginatedResponse<Notification>>("/users/me/notifications", params as any),

    markNotificationRead: (notifId: string) =>
      this.patch<{ updated: boolean }>(`/users/me/notifications/${notifId}/read`),

    markAllNotificationsRead: () =>
      this.post<{ updated: number }>("/users/me/notifications/read-all"),

    deleteNotification: (notifId: string) =>
      this.del<{ deleted: boolean }>(`/users/me/notifications/${notifId}`),
  };

  // ── Unified QRs ────────────────────────────────────────────────────────────

  unifiedQr = {
    list: (params?: PaginationParams) =>
      this.get<PaginatedResponse<UnifiedQr>>("/unified-qr", params as any),

    create: (data: CreateQrInput) =>
      this.post<UnifiedQr>("/unified-qr", data),

    getById: (id: string) =>
      this.get<UnifiedQr>(`/unified-qr/${id}`),

    update: (id: string, data: UpdateQrInput) =>
      this.patch<{ updated: boolean }>(`/unified-qr/${id}`, data),

    updateDestination: (id: string, destination: string) =>
      this.patch<{ updated: boolean; destination: string }>(`/unified-qr/${id}/destination`, { destination }),

    setStatus: (id: string, status: "active" | "inactive", deactivationMessage?: string | null) =>
      this.patch<{ updated: boolean; status: string }>(`/unified-qr/${id}/status`, { status, deactivationMessage }),

    delete: (id: string) =>
      this.del<{ deleted: boolean }>(`/unified-qr/${id}`),

    analytics: (id: string) =>
      this.get<QrAnalytics>(`/unified-qr/${id}/analytics`),
  };

  // ── Legacy QR codes ────────────────────────────────────────────────────────

  qr = {
    toggleActive: (qrId: string, isActive: boolean, deactivationMessage?: string | null) =>
      this.patch<{ success: boolean; isActive: boolean }>(`/qr/${qrId}/active`, { isActive, deactivationMessage }),

    report: (qrId: string, reportType: string) =>
      this.post<{ success: boolean; action: "added" | "removed" }>(`/qr/${qrId}/report`, { reportType }),

    analytics: (uuid: string) =>
      this.get<QrAnalytics>(`/qr/${uuid}/analytics`),

    validateVpa: (vpa: string) =>
      this.post<{ valid: boolean | null; customerName: string | null; vpa?: string }>("/qr/validate-vpa", { vpa }),
  };

  // ── Comments ───────────────────────────────────────────────────────────────

  comments = {
    list: (qrId: string, params?: PaginationParams) =>
      this.get<PaginatedResponse<QrComment>>(`/qr/${qrId}/comments`, params as any),

    create: (qrId: string, data: { text: string; parentId?: string | null }) =>
      this.post<QrComment>(`/qr/${qrId}/comments`, data),

    edit: (qrId: string, commentId: string, text: string) =>
      this.patch<{ updated: boolean }>(`/qr/${qrId}/comments/${commentId}`, { text }),

    delete: (qrId: string, commentId: string) =>
      this.del<{ deleted: boolean }>(`/qr/${qrId}/comments/${commentId}`),

    toggleLike: (qrId: string, commentId: string) =>
      this.post<{ liked: boolean }>(`/qr/${qrId}/comments/${commentId}/like`),
  };

  // ── Follows ────────────────────────────────────────────────────────────────

  follows = {
    followQr: (qrId: string) =>
      this.post<{ followed: boolean; qrId: string }>(`/follows/qr/${qrId}`),

    unfollowQr: (qrId: string) =>
      this.del<{ unfollowed: boolean; qrId: string }>(`/follows/qr/${qrId}`),

    checkQrFollow: (qrId: string) =>
      this.get<{ following: boolean; qrId: string }>(`/follows/qr/${qrId}`),

    followUser: (userId: string) =>
      this.post<{ followed: boolean; userId: string }>(`/follows/users/${userId}`),

    unfollowUser: (userId: string) =>
      this.del<{ unfollowed: boolean; userId: string }>(`/follows/users/${userId}`),

    checkUserFollow: (userId: string) =>
      this.get<{ following: boolean; userId: string }>(`/follows/users/${userId}`),
  };

  // ── Friends ────────────────────────────────────────────────────────────────

  friends = {
    list: (params?: PaginationParams & { status?: "pending" | "friends" | "all" }) =>
      this.get<PaginatedResponse<FriendRecord>>("/friends", params as any),

    sendRequest: (userId: string) =>
      this.post<{ sent: boolean; toUserId: string }>(`/friends/request/${userId}`),

    accept: (userId: string) =>
      this.patch<{ accepted: boolean; friendId: string }>(`/friends/request/${userId}/accept`),

    decline: (userId: string) =>
      this.patch<{ declined: boolean; fromUserId: string }>(`/friends/request/${userId}/decline`),

    unfriend: (userId: string) =>
      this.del<{ unfriended: boolean; userId: string }>(`/friends/${userId}`),
  };

  // ── Security / Utilities ───────────────────────────────────────────────────

  security = {
    checkUrl: (url: string) =>
      this.post<{ safe: boolean; threats?: string[] }>("/check-url", { url }),

    validateVpa: (vpa: string) =>
      this.qr.validateVpa(vpa),
  };
}

// ─── Factory functions ────────────────────────────────────────────────────────

/**
 * Server-side API client.
 * Pass the Firebase session cookie value (from Next.js `cookies()` helper).
 * The backend will receive it as a Bearer token for server-to-server auth.
 *
 * @example
 * import { cookies } from "next/headers";
 * const cookieStore = await cookies();
 * const token = cookieStore.get("__session")?.value;
 * const api = createServerApiClient(token);
 */
export function createServerApiClient(sessionToken?: string): BinroApiClient {
  const internalUrl =
    process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

  return new BinroApiClient(internalUrl, async () => sessionToken ?? null);
}

/**
 * Client-side API client.
 * Pass a function that returns the current Firebase ID token.
 *
 * @example
 * import { getFirebaseAuth } from "@/lib/firebase";
 * const auth = getFirebaseAuth();
 * const api = createClientApiClient(() => auth.currentUser?.getIdToken() ?? Promise.resolve(null));
 */
export function createClientApiClient(
  getToken: () => Promise<string | null>,
): BinroApiClient {
  return new BinroApiClient(publicEnv.apiUrl, getToken);
}

export type { BinroApiClient };
