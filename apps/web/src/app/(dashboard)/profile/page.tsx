import type { Metadata } from "next";

export const metadata: Metadata = { title: "Profile" };

/** /profile — public-facing user profile edit */
export default function ProfilePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
      {/* TODO: Avatar upload */}
      {/* TODO: Display name, username, bio */}
      {/* TODO: Stats (scan count, QR count) */}
    </div>
  );
}
