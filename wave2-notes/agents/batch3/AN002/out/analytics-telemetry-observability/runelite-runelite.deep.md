# runelite-runelite (analytics-telemetry-observability, cell 40)

Donor: `/mnt/frankendom-donors/runelite-runelite/runelite-client/src/main/java/net/runelite/client/callback/Hooks.java` (method `error`, lines 631-687; fields 136-138) with `runelite-client/src/main/java/net/runelite/client/TelemetryClient.java` (179 lines, read in full) | Licence: BSD 2-Clause (repository LICENSE line 1: "BSD 2-Clause License"; TelemetryClient.java header: BSD-style 2-clause text, Copyright (c) 2022, Adam) | Java | symbol `Hooks.error`

Checked: Opened Hooks.java 625-690 and 130-140 (the rest of the 747 lines not read); TelemetryClient.java in full; RuneLite.java 350-368; RuneLiteModule.java 250-256 (grep line only at 255); runelite-api Callbacks.java 208 (grep line only). Other candidates opened by grep: plugins/fps/FpsOverlay.java (115 lines, not read), plugins/worldhopper/WorldHopperPingOverlay.java (grep hit only, not read). Not read: the injected game client that calls `Callbacks.error` (not in the box), and the `--disable-telemetry` flag handling (RuneLite.java 173 and 258, grep lines only). Which thread calls `error()` was not established. Confidence: high on the reporter's order of operations and the numbers (read end to end); medium on how often the game calls it. camera_scope: n/a.

## 1. Mechanism

A client error reporter with a cool-down. It sends the first error of a quiet period at once. Errors that arrive inside the cool-down are dropped (not queued), but the reporter remembers that something was dropped. When the next report goes out, it grows the cool-down by one step if something was dropped in the last window, and it resets to the base step if nothing was.

Order of operations in `Hooks.error(message, reason)` (631-687):
1. If there is no telemetry client (the user turned telemetry off), return (634-636). Nothing else runs.
2. Read the clock (639). If `now > nextError` (640), the window is open. Otherwise go to step 6.
3. Build the report text: the message, then, if `reason` is not null, `" - "` + the reason and its full stack trace (642-652). There is no length check.
4. Build the location string `coord`. Default is `"unk"` (654). If the local player exists and the player is in the top-level world view or the call is on the client thread (659), `coord` is `plane_x/64_y/64_x&63_y&63` (661-662), i.e. a 64-tile region block plus the offset inside it. Then submit `"client error"` with the text and `coord` as one query parameter (666-669). The submit is asynchronous (TelemetryClient.java 144: `enqueue`), and a failure is logged at debug and dropped (149).
5. Adjust the level: if the flag `rateLimitedError` was set since the last send, `errorBackoff++` and clear the flag (671-674); otherwise `errorBackoff = 1` (676-678). Then `nextError = now + 10_000 × errorBackoff` (681). Stop.
6. Inside the window: set `rateLimitedError = true` (685). The error is dropped, and no count is kept.

A worked trace of the code (my hand trace, not a run): errors at t = 0, 3, 11, 12, 32, 100 s. Sends happen at 0 s (window 10 s), 11 s (the 3 s error was dropped, so level 2, window 20 s), 32 s (the 12 s error was dropped, so level 3, window 30 s) and 100 s (nothing dropped since 32 s, so level 1, window 10 s). The errors at 3 s and 12 s are dropped: 4 sent, 2 dropped, out of 6.

Telemetry side (TelemetryClient.java): `submitVmErrors` reads crash logs younger than one day (89), renames each file to `*_r.log` after reading so it is sent once (92-103), replaces the OS username and home directory with placeholders (108-113) and sends the text as a "vm crash" error (115). `buildTelemetry` sends the OS, Java version, launcher version and total memory, plus a boolean for whether the session env vars exist, not their values (161-177; 176). Both run once at startup on a scheduled executor, off the client thread (RuneLite.java 357-363).

## 2. Key functions

- `Hooks.error(String message, Throwable reason)` (Hooks.java 631-687): the reporter. Fields 136-138: `nextError`, `rateLimitedError`, `errorBackoff`.
- `TelemetryClient.submitError(type, error, params)` (TelemetryClient.java 124-159): builds the query (OS name, version, arch, Java version and vendor) plus caller params, then posts the text asynchronously.
- `TelemetryClient.submitVmErrors(logsDir)` (85-122): crash-log scrub and once-only send.
- `TelemetryClient.buildTelemetry()` (161-178): the startup summary.
- `RuneLiteModule.provideTelemetry` (250-255): the client is null when disabled.
- `Callbacks.error` (runelite-api hooks/Callbacks.java 208): the interface method the game client calls.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant (theirs) |
|---|---|
| Cool-down base step | 10 000 ms = 10 s (Hooks.java 681) |
| Level growth | +1 per report, only if something was dropped since the last report (673) |
| Level reset | to 1 after a quiet window (678) |
| Level cap | none in the donor (the gap grows by 10 s per storm report) |
| Dropped-error record | one boolean (137, 685), no count |
| Report text cap | none in the donor (642-652, 666-669) |
| Crash log age cut-off | 1 day (TelemetryClient.java 89) |

Which numbers suit a phone and a small Node server: a 10 s first gap and a 1-report-per-window rule keep the server load low for a phone client that may throw many errors in one bad moment. The level cap is the one number Frankendom must set; 6 levels (a 60 s gap at most) is a reasonable start for a phone. The donor has no phone-specific budget.

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order (window check first, text built only on a send, level grows only if something was dropped, otherwise resets, next time = now + step × level). It changes three things on purpose: it counts the dropped errors and sends the count with the next report (the donor keeps only a flag), it caps the level (the donor does not), and it caps the text length (the donor does not). It omits the location string (`coord`), the crash-log scrub, the query-string OS fields and the async HTTP client; `send` is injected and is never awaited.

```ts
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
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS at `/tmp/AN002-runelite-error-reporter.ts`: exit 0 (no output). The Mac hook could not run tsc (no project dev dependencies), so only the VPS run counts.

## 5. Lands in

- TARGET `origins/client/error-report.ts` (new client module: the rate-limited reporter that sends to the server; the server endpoint is separate). The folder was not checked to exist. Parity-checklist row 4 (the topic hint). The fit is loose: the reporter is not in the fight loop, and no row in the list fits client error reporting; row 4 is used because the hint says so.
- Reuse tag: rewrite-from-idea (BSD-2-Clause; code may be adapted, and this sketch is written from the mechanism)
- Brief rule served: 1 (client-only: the reporter reads nothing the engine uses for a kill); addendum rule 6 (licence); "keep the idea, fix the defect" (2026-10-10)

Best transferable idea: a client error reporter that always sends the first error of a quiet period, drops the rest during a cool-down that grows with each storm and resets when quiet, and reports how many it dropped.
Decision (proposed): adapt — keep the first-send rule, the cool-down, the growth only after drops and the reset on quiet; fix the missing level cap, the missing dropped count and the missing text cap (sketch). Do not copy the location field as is: send zone and build id, and a coarse position only when support needs it.
Acceptance: a client test (injected clock, `stepMs` 10 s) throws 30 errors inside 2 s and checks that exactly one report goes out, with no `suppressed` parameter (the first error of a quiet period is sent before any drop exists), and that its text is at most maxChars long; then, after the window, the next error goes out carrying suppressed=29; then, after a further quiet window with nothing dropped, the following error goes out with no `suppressed` parameter and the level back at 1.

## 6. Gaps and risks

- BSD-2-Clause: code may be adapted. The sketch is written from the mechanism; no donor lines are copied.
- Defect 1 (no cap, fix: `maxBackoff`): the level grows by one for each report sent while errors keep coming (673), and nothing caps it. In a constant error storm the gap grows by 10 s per report, so the reporter goes nearly silent for long stretches. The sketch caps the level.
- Defect 2 (lost count, fix: count the drops): a dropped error is only a boolean (685), so the next report says nothing about how many were dropped. The sketch keeps a count and sends it as `suppressed`.
- Defect 3 (no text cap, fix: `maxChars`): the reason and the full stack trace go out with no length check (647-652, 666-669). A large trace becomes a large request.
- Defect 4 (unverified thread safety): `nextError`, `rateLimitedError` and `errorBackoff` (136-138) have no volatile or lock. The thread that calls `error()` was not read. If it can come from two threads, the window check can race. Fix: call the reporter from one thread only (Frankendom: the game loop).
- Gap 1 (privacy): every report carries the player's location as a region block and offset (654-664). The message may carry names or chat text (not verified). Frankendom: send the zone id and build id; a coarse position only when support needs it.
- Gap 2 (no retry): a failed send is logged at debug and dropped (TelemetryClient.java 149). That is fine for error telemetry; it is not fine for anything that affects a kill, which stays server-verified.
- Gap 3 (scrub by substring): `replace(username, "%USERNAME%")` (TelemetryClient.java 112) replaces every occurrence of the user name, so a short name rewrites ordinary text in the crash log. Fix: scrub only known path forms, or hash.
- Gap 4 (row fit): row 4 is a loose fit for a client error reporter (hint row used).
- Not read: the injected client's call sites of `Callbacks.error`; the disable-telemetry flag handling (RuneLite.java 173, 258); FpsOverlay.java and WorldHopperPingOverlay.java (grep hits only).


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
Errors: ACCEPTANCE-FAILS-CORRECT-BUILD: Acceptance says 30 errors in 2 s give exactly one report with suppressed=29, and after 60 s quiet the next error has no suppressed param. In the note's own sketch (and the donor shape: rateLimited flag read at the NEXT send, Hooks.java 671-678, 685) the first error sends with suppressed absent; the 29 drops are only reported by the next send after the window, which then carries suppressed=29. So a correct build sends 1 report with no suppressed, and the post-60s report carries suppressed=29. Fix the test: first report has no suppressed; next report after the window has suppressed=29. Donor facts otherwise verified: Hooks.error 631-687, fields 136-138, 10_000L*errorBackoff at 681, no cap, TelemetryClient submitVmErrors 85-122 (1-day cut 89, rename 101-103, scrub 112-113), submitError enqueue 144, buildTelemetry 161-177, RuneLiteModule 255, BSD-2 LICENSE. Minor: '(RuneLite.java 357-363)' correct; reason text uses reason.toString() plus newline plus trace (note says ' - ' + reason + trace, fine).
Missed: Donor loop is a flag-not-count design; also coord/location only added when local player exists (covered). Nothing important missed.

Fixed 2026-10-12 (Sonnet fixer): rewrote the Acceptance line. The count of dropped errors is only known after the window, so the first report carries no suppressed value and the next report after the window carries suppressed=29. Sketch unchanged and consistent with this. Donor facts were already verified by the checker; nothing else to fix.
