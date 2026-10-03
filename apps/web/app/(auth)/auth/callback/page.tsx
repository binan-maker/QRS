"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getWebSupabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const supabase = getWebSupabase();

    // Check for error parameters in URL (e.g. access_denied, expired)
    const hash = window.location.hash;
    const search = window.location.search;
    if (
      hash.includes("error=") ||
      search.includes("error=") ||
      hash.includes("error_description=") ||
      search.includes("error_description=")
    ) {
      const params = new URLSearchParams(search || hash.replace(/^#/, "?"));
      const desc =
        params.get("error_description") ||
        params.get("error") ||
        "Authentication failed. Please try again.";
      setErrorMsg(desc.replace(/\+/g, " "));
      return;
    }

    // Exchange auth code or restore session from URL
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        setErrorMsg(error.message);
        return;
      }
      if (data.session) {
        router.replace("/");
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" || session) {
          router.replace("/");
        }
      }
    );

    // Fallback safety timeout in case session resolution is slow
    const timeout = setTimeout(() => {
      router.replace("/");
    }, 3000);

    return () => {
      authListener.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router]);

  if (errorMsg) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100dvh",
          padding: "24px",
          textAlign: "center",
          fontFamily: "Inter, sans-serif",
          backgroundColor: "var(--background, #F5F8FF)",
        }}
      >
        <div
          style={{
            maxWidth: "420px",
            padding: "28px 24px",
            borderRadius: "20px",
            backgroundColor: "#ffffff",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
          }}
        >
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#ef4444", margin: "0 0 10px" }}>
            Sign In Issue
          </h2>
          <p style={{ fontSize: "14px", color: "#64748b", margin: "0 0 20px", lineHeight: "20px" }}>
            {errorMsg}
          </p>
          <button
            type="button"
            onClick={() => router.replace("/login")}
            style={{
              padding: "10px 20px",
              borderRadius: "12px",
              border: "none",
              backgroundColor: "var(--primary, #0052cc)",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100dvh",
        backgroundColor: "var(--background, #F5F8FF)",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "50%",
          border: "3px solid rgba(0, 82, 204, 0.2)",
          borderTopColor: "var(--primary, #0052cc)",
          animation: "spin 0.8s linear infinite",
          marginBottom: "16px",
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ fontSize: "14px", color: "var(--text-secondary, #64748b)", fontWeight: 500 }}>
        Completing sign in...
      </p>
    </div>
  );
}
