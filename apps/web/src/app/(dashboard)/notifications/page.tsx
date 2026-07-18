import type { Metadata } from "next";

export const metadata: Metadata = { title: "Notifications" };

/** /notifications — notification inbox */
export default function NotificationsPage() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        {/* TODO: Mark all read button */}
      </div>
      {/* TODO: <NotificationList /> */}
    </div>
  );
}
