// clean-room: written from the mechanism in runelite-client callback/Hooks.java error() (BSD-2-Clause), not a translation.
export interface ErrorReporterOpts {
  stepMs: number; // cool-down per backoff level (donor: 10 s)
  maxBackoff: number; // cap on the level (donor has no cap; fix)
  maxChars: number; // cap on the report text (donor has no cap; fix)
  send: (type: string, text: string, params: Record<string, string>) => void; // async sender, never awaited here
  now?: () => number;
}

// Rate-limited client error reporter. The first error in a quiet period always goes out.
// Errors inside the cool-down are counted and dropped; the next report says how many were dropped.
export class ErrorReporter {
  private nextAt = 0; // donor nextError
  private suppressed = 0; // donor rateLimitedError (a boolean) turned into a count (fix)
  private backoff = 1; // donor errorBackoff
  readonly stats = { sent: 0, suppressed: 0 }; // telemetry counters

  constructor(private readonly o: ErrorReporterOpts) {}

  private t(): number {
    return this.o.now ? this.o.now() : Date.now();
  }

  report(message: string, reason?: unknown): void {
    const now = this.t();
    if (now <= this.nextAt) {
      this.suppressed += 1;
      this.stats.suppressed += 1;
      return;
    }

    let text = message;
    if (reason !== undefined) text += ` - ${String(reason)}`;
    if (text.length > this.o.maxChars) text = text.slice(0, this.o.maxChars);

    const params: Record<string, string> = {};
    if (this.suppressed > 0) params.suppressed = String(this.suppressed);
    this.o.send("client error", text, params);
    this.stats.sent += 1;

    // Donor order: the level grows only if something was suppressed since the last send, else it resets to 1.
    if (this.suppressed > 0) this.backoff = Math.min(this.backoff + 1, this.o.maxBackoff);
    else this.backoff = 1;
    this.suppressed = 0;
    this.nextAt = now + this.o.stepMs * this.backoff;
  }
}

export {};
