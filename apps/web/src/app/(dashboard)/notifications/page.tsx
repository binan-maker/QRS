import type { Metadata } from "next";
import { cookies } from "next/headers";
import { createServerApiClient } from "@/lib/api-client";

export const metadata: Metadata = { title: "Notifications — BinRo" };

export default async function NotificationsPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("__session")?.value ?? "";
  const api = createServerApiClient(session);

  const result = await api.user.listNotifications({ limit: 30 });
  const notifications = result.ok ? result.data.items : [];

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Notifications</h2>
        {notifications.length > 0 && (
          <form action="/api/notifications/read-all" method="POST">
            <button
              type="submit"
              className="text-xs text-blue-600 hover:underline"
            >
              Mark all as read
            </button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-xl bg-white p-10 text-center shadow-sm ring-1 ring-gray-100">
          <p className="text-4xl mb-3">🔔</p>
          <p className="font-medium text-gray-900">All caught up</p>
          <p className="text-sm text-gray-500 mt-1">No notifications yet.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50 rounded-xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
          {notifications.map((n: any) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 px-5 py-4 ${!n.isRead ? "bg-blue-50/50" : ""}`}
            >
              <div className="flex-shrink-0 mt-0.5">
                <span
                  className={`block h-2 w-2 rounded-full ${n.isRead ? "bg-gray-200" : "bg-blue-500"}`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${!n.isRead ? "font-medium text-gray-900" : "text-gray-600"}`}>
                  {n.title}
                </p>
                {n.body && (
                  <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(n.createdAt).toLocaleDateString("en-IN", {
                    month: "short",
                    day:   "numeric",
                    hour:  "2-digit",
                    minute:"2-digit",
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
