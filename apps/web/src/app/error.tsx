"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to an error-tracking service (e.g. Sentry) when integrated
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 text-center px-4">
      <p className="text-5xl">⚠️</p>
      <h1 className="text-2xl font-semibold text-gray-900">Something went wrong</h1>
      <p className="text-gray-500 max-w-sm text-sm">
        {error.message ?? "An unexpected error occurred."}
      </p>
      <button onClick={reset} className="btn-primary mt-2">
        Try again
      </button>
    </main>
  );
}
