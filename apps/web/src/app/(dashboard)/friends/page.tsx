import type { Metadata } from "next";
import { cookies } from "next/headers";
import { createServerApiClient } from "@/lib/api-client";

export const metadata: Metadata = { title: "Friends — BinRo" };

export default async function FriendsPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("__session")?.value ?? "";
  const api = createServerApiClient(session);

  const result = await api.friends.list();
  const { friends = [], pending = [] } = result.ok ? result.data : {};

  return (
    <div className="max-w-2xl space-y-6">
      {/* Pending requests */}
      {pending.length > 0 && (
        <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Friend requests</h2>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
              {pending.length}
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {pending.map((req: any) => (
              <div key={req.userId} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  {req.photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={req.photoURL} alt={req.displayName} className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
                      {req.displayName?.[0]?.toUpperCase() ?? "?"}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{req.displayName}</p>
                    {req.username && <p className="text-xs text-gray-400">@{req.username}</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <form action={`/api/v1/friends/request/${req.userId}/accept`} method="POST">
                    <button className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors">
                      Accept
                    </button>
                  </form>
                  <form action={`/api/v1/friends/request/${req.userId}/decline`} method="POST">
                    <button className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                      Decline
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends list */}
      <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Friends ({friends.length})</h2>
        </div>
        {friends.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-3xl mb-3">👥</p>
            <p className="text-sm font-medium text-gray-900">No friends yet</p>
            <p className="text-xs text-gray-500 mt-1">
              Share your BinRo profile to connect.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {friends.map((f: any) => (
              <div key={f.userId} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  {f.photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={f.photoURL} alt={f.displayName} className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-semibold text-sm">
                      {f.displayName?.[0]?.toUpperCase() ?? "?"}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{f.displayName}</p>
                    {f.username && <p className="text-xs text-gray-400">@{f.username}</p>}
                  </div>
                </div>
                <form action={`/api/v1/friends/${f.userId}`} method="DELETE">
                  <button className="text-xs text-red-500 hover:text-red-700 transition-colors">
                    Unfriend
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
