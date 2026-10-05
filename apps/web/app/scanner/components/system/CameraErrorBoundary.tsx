"use client";

// ─── Camera Error Boundary ────────────────────────────────────────────────────
// 1:1 with features/scanner/components/system/CameraErrorBoundary.tsx

import React, { Component, type ReactNode } from "react";

export class CameraErrorBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; onError: () => void }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "#000",
          }}
        />
      );
    }
    return this.props.children;
  }
}
