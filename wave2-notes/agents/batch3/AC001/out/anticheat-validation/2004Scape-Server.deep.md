# 2004Scape-Server (anticheat-validation, cell 6)

Donor: `/mnt/frankendom-donors/2004Scape-Server/src/engine/entity/tracking/InputTracking.ts` | Licence: MIT (`/mnt/frankendom-donors/2004Scape-Server/LICENSE`, "MIT License, Copyright (c) 2023-2025 Lost City") | TypeScript | symbol `InputTracking`

Best transferable idea: a short, randomly placed, byte-capped server-side record window per player, with a rule that the record never changes a fight result.
Decision (proposed): adapt - the donor's report channel is client-uploaded and unchecked, but Frankendom's server already receives every fight input, so only the window scheduling, the byte cap and the report-size guard transfer, as a sampled fight record for review (row 19).
Acceptance: a server test over 10 simulated fights shows a record only for fights whose start tick falls in the sampled window, storage stops at the byte cap plus at most one 500-byte chunk, and the kill and damage results are identical with the record on or off.

Checked: Read in full: `InputTracking.ts` (1-166) and `EventTrackingHandler.ts` (1-30). Call sites read: `Player.ts` 420 and 1272-1274; `World.ts` 369-384, 520-537, 629-679, 785-806, 2308-2325; `Environment.ts` 36-46; `LoggerServer.ts` 100-115 (insert path read only in part). Candidates opened: `ClientCheatHandler.ts` 1-60 (the list hint is the WRONG file: it is the staff and developer cheat-command dispatcher, not an anticheat check), `AnticheatOpLogic.ts`, `AnticheatCycleLogic.ts`, `MoveClickHandler.ts` 1-54, `EventTracking.ts`, `InputEvent.ts`. Confidence high on the window schedule, the report path and the missing-report flag; medium on the logger side. Not read: the client code that produces reports; `LoggerServer` past line 115; what staff do with the stored blobs. The donor has no movement-speed, teleport or rate check in the code I read (see section 6). Camera: not a camera cell.

## 1. Mechanism

- A per-player recorder on a schedule the client cannot see in advance. A window lasts 150 ticks (InputTracking.ts 15). The gap from the end of one window to the start of the next is 200 ticks plus a random integer jitter in [-15, 15] (13, 48, 164). So a window starts about every 350 ticks on average (150 + 200), about 210 s at the 600 ms tick (derived; the donor's own comments give 120 s and 90 s for the 200 and 150 ticks, 13 and 15).
- Driver: `World.cycle()` runs `processWorld()` then `processClientsIn()` once per tick (World.ts 369-384). Inside `processClientsIn`, a per-player loop calls `player.processInputTracking()` (World.ts 679), which calls `this.input.onCycle()` (Player.ts 1273). The fixed step is `World.TICKRATE` 600 ms (World.ts 120). The cycle reschedules itself with `setTimeout` and subtracts the drift (372, 537), so ticks keep their length under load.
- `onCycle` order (InputTracking.ts 76-95): (a) if waiting for late data, then once `endAt + 16 < now` it calls `submitEvents()`, and returns (79-84). (b) If a start is due and the window is off, it calls `enable()` and returns (86-89). (c) If an end is due and the window is on, it calls `disable()` and returns (90-94).
- `enable()` (97-106): on, window start = now, window end = now + 150, and the client is told to start.
- `disable()` (108-118): off, next start = now + 200 +/- 15, end = now, waiting = true, and the client is told to finish. The window stays "active" while waiting (`isActive`, 120-123), so late reports are accepted for up to 16 ticks after the end.
- Report intake (`EventTrackingHandler.handle`, lines 8-29), in this order: reject if the packet is empty or over 500 bytes (10-12); reject unless a window is active or waiting (13-15); set `hasSeenReport = true` (17); if details are not wanted, return true without storing (19-21); reject if the byte total is already above 50 000 (22-26); otherwise store the blob (27).
- Session end (`submitEvents`, 143-161): if a report was seen, and details are wanted (the player's `submitInput` flag, or the env flag, 129-131), the blobs go to the logger thread (144-147, `World.submitInputTracking` at 2325). If no report was seen and `NODE_DEBUG` is off, it writes a session-log entry and sets `requestIdleLogout = true` (149-154). The logout pass consumes that flag (World.ts 795). Then all state resets (157-160).
- Report-triggered detail: a player report of macroing or bug abuse sets the offender's `submitInput = true` (World.ts 2309-2313), so later windows store their blobs.
- Storage: each blob is base64 data with a sequence number and the player's tile (InputEvent.ts 6-9; InputTracking.ts 135). The server does not parse the blob content. The logger writes one report row and one raw event row per blob (LoggerServer.ts 100-115, partly read).

## 2. Key functions

- `InputTracking.onCycle`: `/mnt/frankendom-donors/2004Scape-Server/src/engine/entity/tracking/InputTracking.ts` 76-95. The schedule step, called once per player per tick.
- `InputTracking.enable` / `disable`: same file, 97-106 and 108-118. Window on and off, next start picked with jitter.
- `InputTracking.submitEvents`: same file, 143-161. The missing-report flag and the submit path.
- `InputTracking.offset`: same file, 163-165. Jitter as a random integer in [-n, n].
- `EventTrackingHandler.handle`: `/mnt/frankendom-donors/2004Scape-Server/src/network/game/client/handler/EventTrackingHandler.ts` 8-29. Report intake and the byte cap.
- `World.cycle` and `World.processClientsIn`: `/mnt/frankendom-donors/2004Scape-Server/src/engine/World.ts` 369-384 and 629-679. The per-tick driver and the per-player call site.
- `World.notifyPlayerReport`: same file, 2308-2315. The report-triggered detail flag.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Random start gap: fixed gap plus a uniform integer jitter | Gap 200 ticks, jitter +/-15 ticks (InputTracking.ts 13, 48, 164) |
| Fixed-length recording window | 150 ticks (InputTracking.ts 15) |
| Late-data allowance after the window ends | 16 ticks (InputTracking.ts 17, 80) |
| Per-window byte cap, checked before storing | 50 000 bytes by default, env override (Environment.ts 42) |
| Report size guard | 1 to 500 bytes (EventTrackingHandler.ts 10) |
| Tick length used for all of the above | 600 ms (World.ts 120) |
| Missing report sets an idle-logout flag | Flag and log only when `NODE_DEBUG` is off (InputTracking.ts 149-154) |

## 4. TypeScript sketch

simplified: keeps the donor's order (waiting branch first, then start, then end; the report path checks size, then window, then seen flag, then the storage gate, then the byte cap). Omits: the payloads of the client enable and finish messages (kept as `notify`), the session-log text, the sequence numbers and tile coordinates on each blob, the base64 encoding, the logger and World handoff, the player's `submitInput` field (kept as the `wantDetails` callback), the `NODE_DEBUG` switch (kept as `flagMissing`), and the logout pass (kept as the `flag` hook). It does not reorder any donor step. The caller must invoke `onTick` once per tick, as World.ts 679 does.

```ts
// clean-room sketch of the donor's scheduling shape (InputTracking.ts). Donor is MIT, so adaptation is allowed; this is written from the mechanism.
export type Tick = number;

export interface WindowConfig {
  periodTicks: number;      // donor 200: gap between window starts, before jitter
  windowTicks: number;      // donor 150: how long recording is on
  jitterTicks: number;      // donor 15: start offset is a random integer in [-j, j]
  leewayTicks: number;      // donor 16: allowance for late data after the window ends
  maxBytes: number;         // donor 50_000: byte cap per window (checked before recording)
  flagMissing: boolean;     // donor: !NODE_DEBUG
}

export interface Hooks {
  notify(event: 'start' | 'stop'): void;
  submit(blobs: Uint8Array[]): void;   // only when a report was seen and details are wanted
  flag(reason: string): void;          // report never arrived
}

export class RecordWindow {
  private enabled = false;
  private waiting = false;
  private startAt: Tick;
  private endAt: Tick;
  private reportSeen = false;
  private bytes = 0;
  private blobs: Uint8Array[] = [];

  constructor(
    private cfg: WindowConfig,
    now: Tick,
    private hooks: Hooks,
    private wantDetails: () => boolean,
    private rnd: () => number = Math.random,
  ) {
    this.startAt = this.nextStart(now);
    this.endAt = this.startAt + cfg.windowTicks;
  }

  private offset(n: number): number {
    return Math.floor(this.rnd() * (n + n + 1)) - n;
  }

  private nextStart(now: Tick): Tick {
    return now + this.cfg.periodTicks + this.offset(this.cfg.jitterTicks);
  }

  // Called once per tick per player, before the player's input is read.
  onTick(now: Tick): void {
    if (this.waiting) {
      if (this.endAt + this.cfg.leewayTicks < now) this.finish();
      return;
    }
    if (now >= this.startAt && !this.enabled) {
      this.enabled = true;
      this.startAt = now;
      this.endAt = now + this.cfg.windowTicks;
      this.hooks.notify('start');
      return;
    }
    if (now >= this.endAt && this.enabled) {
      this.enabled = false;
      this.startAt = this.nextStart(now);
      this.endAt = now;
      this.waiting = true;
      this.hooks.notify('stop');
    }
  }

  isActive(now: Tick): boolean {
    return (now >= this.startAt && now <= this.endAt) || this.waiting;
  }

  // Returns true if the report was accepted.
  onReport(now: Tick, bytes: Uint8Array): boolean {
    if (bytes.length === 0 || bytes.length > 500) return false;
    if (!this.isActive(now)) return false;
    this.reportSeen = true;
    if (!this.wantDetails()) return true;
    if (this.bytes > this.cfg.maxBytes) return false;
    this.bytes += bytes.length;
    this.blobs.push(bytes);
    return true;
  }

  private finish(): void {
    if (this.reportSeen) {
      if (this.wantDetails()) this.hooks.submit(this.blobs);
    } else if (this.cfg.flagMissing) {
      this.hooks.flag('no report in window');
    }
    this.waiting = false;
    this.blobs = [];
    this.bytes = 0;
    this.reportSeen = false;
  }
}

export {};
```

## 5. Lands in

- TARGET `src/fight/record.ts` (new): the sampled fight record for review. It is evidence only: no kill, damage or ledger write reads it. Parity-checklist row 19 (fight record/replay). Server tick: the window advances once per tick inside the fixed step (the donor's per-tick loop is World.ts 369-384 and 629-679), which is the server-tick sub-line for `processClientsIn`.
- Reuse tag: rewrite-from-idea (MIT, Lost City; the donor may be adapted, and this sketch is written from the mechanism)
- Brief rule served: server-verified kills (the record is review evidence and no fight result reads it); one ledger (nothing is written to a player's ledger from the record)

## 6. Gaps and risks

- The donor's client uploads the reports, and the server stores them without checking their contents (EventTrackingHandler.ts 8-29 checks only the packet length, the window and the byte total). Frankendom's server already receives every fight input, so the review record should be built from the server's own input log, not from a client upload. Anything the client sends must be re-simulated before it counts as evidence.
- The missing-report rule makes the donor log the player out (InputTracking.ts 154, consumed at World.ts 795). The donor's comment at 151-152 names a slow connection as one cause. A phone player on a slow network must not lose a session or a fight result because a record did not upload. Reject this rule for Frankendom: keep the flag as a log line only.
- The byte cap is checked before a record is stored, so the total can pass the cap by one report, up to 500 bytes (EventTrackingHandler.ts 10, 22-27). Use the same rule for our cap and say so in the tests.
- Random window timing only helps if the server samples fights it did not announce. The donor's windows are per player, and the donor does not say which of its events it reviews (not read). For Frankendom, the sample has to be chosen by the server, not by the player.
- The donor does not validate gameplay input at all. `MoveClickHandler.ts` 16-21 checks only that the control flag is 0 or 1 and that the first path tile is within 104 tiles of the player. A grep of `src/network` and `src/engine` for rate limit, throttle or packet-per-tick limits finds none; the one `rate` hit is an NPC hunt rate (`Npc.ts` 252). So the donor has no movement-speed, teleport or input-rate check that we could copy. That is a gap for Frankendom's server-side validation, not something this donor solves.
- `ClientCheatHandler.ts` 46-47 writes staff-level-2 cheat input to the session log. That is an audit trail for staff, not a detection check, and it is the wrong file for this topic.
- `AnticheatOpLogic.ts` and `AnticheatCycleLogic.ts` are classes with only a category field (line 4 in each). A grep for `Anticheat` in `src` finds no other reference, so this tree does not handle those client messages (grep only; the codec was not read).
- The donor's comments say a 200-tick gap is "120 seconds" and a 150-tick window is "90 seconds" at the 600 ms tick. Frankendom should store these as data with the tick length, not as seconds.
