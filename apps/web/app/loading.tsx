import React from "react";

export default function RootLoading() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "70vh",
        width: "100%",
        padding: "32px 16px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <div
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "50%",
            border: "3px solid var(--surface-border)",
            borderTopColor: "var(--primary)",
            animation: "binroSpin 0.75s linear infinite",
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-inter), 'Inter', sans-serif",
            fontSize: "13px",
            fontWeight: 500,
            color: "var(--text-muted)",
            letterSpacing: "0.2px",
          }}
        >
          Loading...
        </span>
      </div>
      <style>{`
        @keyframes binroSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
