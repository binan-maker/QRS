"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";

export default function ForgotPasswordPage() {
  const { sendPasswordReset } = useAuth();
  const [email,   setEmail]   = useState("");
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (e: any) {
      setError(e.message ?? "Failed to send reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-sm">B</span>
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Reset your password</h1>
          <p className="mt-1 text-sm text-gray-500">
            Enter your email and we'll send a reset link.
          </p>
        </div>

        {sent ? (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-6 text-center">
            <p className="text-4xl mb-3">📬</p>
            <p className="font-semibold text-emerald-800">Check your inbox</p>
            <p className="text-sm text-emerald-700 mt-1">
              We've sent a password reset link to <strong>{email}</strong>.
              The link expires in 1 hour.
            </p>
            <Link
              href="/auth/login"
              className="mt-4 inline-block text-sm text-blue-600 hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send reset link"}
            </button>

            <Link
              href="/auth/login"
              className="block text-center text-sm text-gray-500 hover:text-gray-900"
            >
              ← Back to sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
