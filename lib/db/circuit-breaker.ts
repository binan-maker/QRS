// ═══════════════════════════════════════════════════════════════════════════════
// CIRCUIT BREAKER (P2 SECURITY FIX)
// ───────────────────────────────────────────────────────────────────────────────
// Lightweight, dependency-free circuit breaker for Firestore (and any other
// remote) calls. Prevents the app from hammering a degraded backend, which
// would otherwise burn through Firebase quotas and degrade UX further.
//
// States:
//   CLOSED    — normal operation, calls pass through.
//   OPEN      — too many recent failures; calls fail fast for `cooldownMs`.
//   HALF_OPEN — one trial call is allowed; success closes, failure re-opens.
//
// Isomorphic: works in React Native (Hermes), browsers, and Node.
// ═══════════════════════════════════════════════════════════════════════════════

type State = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerOptions {
  /** Failures within `windowMs` needed to trip the breaker. */
  failureThreshold: number;
  /** Time window in which failures are counted (ms). */
  windowMs: number;
  /** How long the breaker stays OPEN before allowing a trial call. */
  cooldownMs: number;
  /** Optional name used in error messages and logs. */
  name?: string;
}

export class CircuitBreaker {
  private state: State = "CLOSED";
  private failures: number[] = []; // timestamps of recent failures
  private openedAt = 0;

  constructor(private readonly opts: CircuitBreakerOptions) {}

  async exec<T>(fn: () => Promise<T>): Promise<T> {
    const now = Date.now();

    if (this.state === "OPEN") {
      if (now - this.openedAt < this.opts.cooldownMs) {
        throw new CircuitOpenError(this.opts.name ?? "circuit");
      }
      // Cooldown expired → allow one trial
      this.state = "HALF_OPEN";
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess(): void {
    this.failures = [];
    if (this.state !== "CLOSED") {
      this.state = "CLOSED";
      this.openedAt = 0;
    }
  }

  private onFailure(): void {
    const now = Date.now();
    if (this.state === "HALF_OPEN") {
      // Trial failed — reopen immediately
      this.state = "OPEN";
      this.openedAt = now;
      return;
    }
    this.failures.push(now);
    // Drop failures outside the window
    const cutoff = now - this.opts.windowMs;
    while (this.failures.length && this.failures[0] < cutoff) {
      this.failures.shift();
    }
    if (this.failures.length >= this.opts.failureThreshold) {
      this.state = "OPEN";
      this.openedAt = now;
      this.failures = [];
      // eslint-disable-next-line no-console
      console.warn(
        `[CircuitBreaker:${this.opts.name ?? "circuit"}] OPEN — ${this.opts.failureThreshold} failures in ${this.opts.windowMs}ms. Cooling down for ${this.opts.cooldownMs}ms.`
      );
    }
  }

  /** Inspect current state (testing / diagnostics). */
  getState(): State {
    return this.state;
  }
}

export class CircuitOpenError extends Error {
  constructor(name: string) {
    super(`Service temporarily unavailable (${name}). Please try again in a moment.`);
    this.name = "CircuitOpenError";
  }
}
