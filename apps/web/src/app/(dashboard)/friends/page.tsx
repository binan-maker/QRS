import type { Metadata } from "next";

export const metadata: Metadata = { title: "Friends" };

/** /friends — friend requests and friends list */
export default function FriendsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Friends</h1>
      {/* TODO: Pending requests tab */}
      {/* TODO: Friends list tab */}
    </div>
  );
}
