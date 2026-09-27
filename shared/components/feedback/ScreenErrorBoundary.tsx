import React, { useCallback, type ComponentType, type FC, type PropsWithChildren } from "react";
import { ErrorBoundary } from "@/shared/components/feedback/ErrorBoundary";
import {
  ScreenErrorFallback,
  type ScreenErrorFallbackProps,
} from "@/shared/components/feedback/ScreenErrorFallback";
import { recordHandledError } from "@/lib/error-handlers";

export type ScreenErrorBoundaryProps = PropsWithChildren<{
  /** Human-readable label of the screen (e.g. "Profile"). */
  screenName?: string;
}>;

/**
 * Per-screen error boundary. When a single screen throws, this component
 * shows a compact in-screen fallback with Retry + Back-to-Home actions
 * instead of replacing the whole app with the global crash UI.
 *
 * Use `withScreenErrorBoundary(Component, "Profile")` for the cleanest
 * default-export pattern in route files.
 */
export function ScreenErrorBoundary({
  children,
  screenName,
}: ScreenErrorBoundaryProps) {
  const Fallback = useCallback(
    (props: ScreenErrorFallbackProps) => (
      <ScreenErrorFallback {...props} screenName={screenName} />
    ),
    [screenName],
  );

  return (
    <ErrorBoundary
      FallbackComponent={Fallback}
      onError={(error, stack) => {
        recordHandledError(error, {
          source: "screen-boundary",
          screenName,
          componentStack: stack,
        });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * HOC that wraps a screen component in a per-screen error boundary.
 * Preserves displayName for easier debugging.
 */
export function withScreenErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  screenName?: string,
): ComponentType<P> {
  const Wrapped: FC<P> = (props) => (
    <ScreenErrorBoundary screenName={screenName}>
      <Component {...props} />
    </ScreenErrorBoundary>
  );
  Wrapped.displayName = `withScreenErrorBoundary(${
    screenName || Component.displayName || Component.name || "Screen"
  })`;
  return Wrapped;
}
