import type { Metadata } from "next";

export const metadata: Metadata = { title: "Settings" };

/** /settings — account settings */
export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      {/* TODO: Account section (email, password change) */}
      {/* TODO: Notification preferences */}
      {/* TODO: Privacy settings */}
      {/* TODO: Danger zone (delete account) */}
    </div>
  );
}
