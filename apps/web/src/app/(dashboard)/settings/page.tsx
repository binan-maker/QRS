"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";

const SETTINGS_SECTIONS = [
  {
    id:    "notifications",
    label: "Push notifications",
    items: [
      { id: "re_engagement", label: "Re-engagement reminders",     default: true  },
      { id: "scan_alerts",   label: "Scan alerts for my QR codes", default: true  },
      { id: "friend_reqs",   label: "Friend requests",             default: true  },
      { id: "reports",       label: "QR report notifications",     default: false },
    ],
  },
  {
    id:    "privacy",
    label: "Privacy",
    items: [
      { id: "public_profile",  label: "Make my profile public",             default: true  },
      { id: "show_scan_count", label: "Show my scan count on profile",      default: true  },
      { id: "allow_follow",    label: "Allow others to follow my QR codes", default: true  },
    ],
  },
];

export default function SettingsPage() {
  const { signOut } = useAuth();
  const [prefs, setPrefs] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    SETTINGS_SECTIONS.forEach((s) =>
      s.items.forEach((i) => { init[i.id] = i.default; })
    );
    return init;
  });
  const [saved, setSaved] = useState(false);

  function toggle(id: string) {
    setPrefs((p) => ({ ...p, [id]: !p[id] }));
  }

  function handleSave() {
    // TODO: POST /api/v1/users/me with notification / privacy preferences
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-xl space-y-6">
      {SETTINGS_SECTIONS.map((section) => (
        <div key={section.id} className="rounded-xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">{section.label}</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {section.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between px-6 py-4">
                <label htmlFor={item.id} className="text-sm text-gray-700 cursor-pointer">
                  {item.label}
                </label>
                <button
                  id={item.id}
                  role="switch"
                  aria-checked={prefs[item.id]}
                  onClick={() => toggle(item.id)}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                    prefs[item.id] ? "bg-blue-600" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
                      prefs[item.id] ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Save */}
      <button
        onClick={handleSave}
        className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
      >
        {saved ? "Saved ✓" : "Save preferences"}
      </button>

      {/* Account */}
      <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Account</h2>
        </div>
        <div className="px-6 py-4 space-y-3">
          <button
            onClick={signOut}
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors text-left"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
