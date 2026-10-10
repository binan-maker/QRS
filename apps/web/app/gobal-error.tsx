"use client";

import React from "react";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ padding: "40px", fontFamily: "system-ui, sans-serif", textAlign: "center" }}>
        <h2>Something went wrong</h2>
        <p>An unexpected error occurred. Please try again.</p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            marginTop: "16px",
            padding: "10px 20px",
            borderRadius: "8px",
            background: "#2563eb",
            color: "#ffffff",
            border: "none",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
