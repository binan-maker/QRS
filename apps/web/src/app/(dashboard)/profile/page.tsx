"use client";

import type { Metadata } from "next";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/auth-context";

// Note: metadata export does not work in "use client" — moved to a separate
// layout or left as a TODO for a server/client split.

export default function ProfilePage() {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // TODO: call PATCH /api/v1/users/me via the API client
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <h2 className="font-semibold text-gray-900 mb-5">Public profile</h2>

        {/* Avatar preview */}
        <div className="flex items-center gap-4 mb-6">
          {user?.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.photoURL} alt="avatar" className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xl font-bold">
              {user?.displayName?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <div>
            <p className="font-medium text-gray-900">{user?.displayName ?? "—"}</p>
            <p className="text-sm text-gray-400">{user?.email ?? ""}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Display name</label>
            <input
              type="text"
              defaultValue={user?.displayName ?? ""}
              placeholder="Your name"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Username</label>
            <div className="flex items-center">
              <span className="px-3 py-2 text-sm text-gray-400 bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg">
                binro.in/
              </span>
              <input
                type="text"
                placeholder="yourname"
                className="flex-1 rounded-r-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            {saved ? "Saved ✓" : "Save changes"}
          </button>
        </form>
      </div>

      {/* Danger zone */}
      <div className="rounded-xl border border-red-100 bg-red-50 p-6">
        <h2 className="font-semibold text-red-700 mb-2">Danger zone</h2>
        <p className="text-sm text-red-600 mb-4">
          Deleting your account will permanently erase all your QR codes, scan history, and profile data after a 30-day grace period.
        </p>
        <button className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors">
          Delete account
        </button>
      </div>
    </div>
  );
}
