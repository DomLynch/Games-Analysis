# ValveSoftware-source-sdk-2013 (animation-rigs, cell 3)

Donor: `/mnt/frankendom-donors/ValveSoftware-source-sdk-2013/src/game/client/c_baseanimating.cpp` (cycle advance, animation events) with `/mnt/frankendom-donors/ValveSoftware-source-sdk-2013/src/game/client/c_baseanimating.h` 431 (base stub) | Licence: Source 1 SDK LICENSE (Valve; `LICENSE` line 1 "SOURCE 1 SDK LICENSE"; line 9 free use and modification to make a Valve game; line 13 distributions must be free of charge; restricted) | C++ | symbol `C_BaseAnimating::DoAnimationEvents` (with `FrameAdvance`)

Checked: Read in full: `FrameAdvance` (5464-5549), `DoAnimationEvents` (3550-3735), `Simulate` (5155-5175), `UpdateClientSideAnimation` (5134-5152), `GetSequenceCycleRate` (5258-5267), `GetAnimTimeInterval` (5269-5275), `SetCycle` (5281-5288), `SetSequence` (5293-5313), `SequenceDuration` (5592-5612), `ClampCycle` (1431-1447), `StudioFrameAdvance` (5319-5389). Callers: `FrameAdvance(0)` is called from `UpdateClientSideAnimation` (5145), whose own caller is outside this file (not read). `StudioFrameAdvance` has no caller in this file. `Simulate` is the caller of `DoAnimationEvents` in this file (5164); the order between the engine's calls to `UpdateClientSideAnimation` and `Simulate` is not read. Hint file was right. Inert: the server-intended cycle correction (5495-5522) only runs if a subclass overrides `GetServerIntendedCycle`; the base returns -1 (c_baseanimating.h 431), so in this file it never runs. Not read: `FireEvent` (3889-4195) (what each event does), `DispatchMuzzleEffect`, `MaintainSequenceTransitions` (1815), `CalculateIKLocks` (2436-2671), `SetupBones` (2796-3035), the attachment functions (2026-2250), ragdoll takeover and blend-back (1873-1901, 4863-4967), `Studio_Duration` (base library), `GetEventIndexForSequence`. Confidence: high on the cycle arithmetic and the event-crossing rules (read in full); medium on the event flow outside this file. The wrap-skip finding in section 6 was confirmed by running a mirror of the same lines on a VPS scratch copy, not on the donor.

Best transferable idea: Fire a clip's events (strike cue, dust, sound) on the update in which the playback crosses their cycle, so no event is missed between frames, and keep the gameplay strike on a server tick number instead of a client event.
Decision (proposed): adapt - crossing-based cue firing is frame-rate independent and fits the clip timeline (row 7), but the donor's events are client-only and it drops events in the first update after a loop wrap; Frankendom uses it for cosmetic cues only and fixes the wrap rule.
Acceptance: A test steps a 0.5 s looping clip with an event at cycle 0.02 across a loop and asserts each event fires exactly once per pass (including on the update that wraps); in play the swing's sound and dust appear on the frame the cycle crosses them.

## 1. Mechanism

- Client animation step. For an entity whose animation is client-driven, the engine calls `UpdateClientSideAnimation` (5134), which calls `FrameAdvance(0)` (5145). Zero means "use the time since the last advance" (5145 comment).
- Interval. In `FrameAdvance`, with `flInterval == 0` the interval is `curtime - m_flAnimTime` (5478-5480). Intervals of 0.001 s or less stop the advance (5481-5484). With no previous advance time the interval is 0 (5487-5490). Unlike `GetAnimTimeInterval`, this path does not clamp the interval to 0.2 s.
- Rate. `cyclerate = 1 / SequenceDuration` (5492; 5262-5265), and `addcycle = interval * cyclerate * playbackRate` (5493). `SequenceDuration` comes from the studio data with the pose parameters (5610).
- Server correction (inert here, see Checked). If a subclass returns a server-intended cycle, the step is averaged with the server's advance, only forward (5501), wrapped when more than 0.8 behind (5502-5507), and capped at 0.1 per update (5512-5515).
- Wrap and clamp. `newCycle = cycle + addcycle` (5524), `m_flAnimTime = curtime` (5525). If `newCycle` is below 0 or at 1 or more (5533): a looping sequence takes the fractional part by `(int)` truncation (5537); a non-looping one clamps to 0 or 1 (5541). `m_bSequenceFinished` is set (5543). The cycle is stored with `SetCycle` (5546).
- Events. `Simulate` runs `DoAnimationEvents` only when frame time is nonzero (5162-5164). In `DoAnimationEvents`: invisible models return early (3571-3572, unless recording), so no muzzle flash either; a second check after the muzzle step (3583-3584) also stops the event loop; a sequence change restarts the pass at cycle 0 with previous cycle -0.01 (3621-3635). A cycle equal to the previous one returns (3638). A cycle that moved backwards returns unless it moved back by more than 0.5, which counts as a loop (3654-3666). On a loop, events with cycle above the previous cycle fire first (the tail, 3670-3700), then the previous cycle is set to the new cycle minus 0.001 (3703). Then every event with previous < cycle <= current fires (3706-3732, test at 3716). The previous cycle is stored at the end (3734).
- Event filter. A new-system event fires here only if it carries the client flag (3708-3711). An old-system event with id below 5000 is skipped (3713; the same filter is in the tail loop at 3681).

## 2. Key functions

- `C_BaseAnimating::FrameAdvance`: `/mnt/frankendom-donors/ValveSoftware-source-sdk-2013/src/game/client/c_baseanimating.cpp` 5464-5549. The live cycle step for client-driven entities.
- `C_BaseAnimating::DoAnimationEvents`: same file 3550-3735. Crossing-based event pass with the loop rules.
- `C_BaseAnimating::Simulate`: same file 5155-5175. Calls the event pass when frame time is nonzero (5162-5164).
- `C_BaseAnimating::UpdateClientSideAnimation`: same file 5134-5152. Calls `FrameAdvance(0)`.
- `C_BaseAnimating::StudioFrameAdvance`: same file 5319-5389. A second advance with a 0.2 s interval clamp (5271-5273); no caller in this file.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Cycle per second = 1 / clip duration, times a rate multiplier | Rate multiplier `m_flPlaybackRate` (per entity state, 5493) |
| Loop wrap by fractional part, non-loop clamp to the end | Wrap test at 0 and 1 (5533-5541) |
| Fire an event when the step crosses it, never twice | Previous cycle restart -0.01 at a clip change (3634) |
| A backwards step of more than half a cycle is a loop | 0.5 cycle (3656) |
| Tail of the old pass fires before the head of the new pass | Previous cycle set to current minus 0.001 (3703) |
| Ignore tiny time steps | 0.001 s (5481) |
| Cap a server correction per update | 0.1 cycle (5514); behind-by-more-than-0.8 wrap (5502) |
| Animation interval cap (StudioFrameAdvance path only) | 0.2 s (5271) |
| Old-system event ids below 5000 are not client events | 5000 (3713) |

## 4. TypeScript sketch

simplified: The sketch keeps the donor order: the cycle advance from elapsed time with the wrap or clamp, then the event pass: a clip change restarts at -0.01, a stalled cycle returns, a small backwards step fires nothing, a wrap fires the old tail and then the new head, and every event with previous < cycle <= current fires. It omits: the server-intended correction (inert in this file); the muzzle flash and the visibility gate; the client-flag and id-5000 filters (every event in the sketch is a client event); `FireEvent` (the sketch only calls the callback); the pose parameters behind `SequenceDuration` (the sketch takes a fixed duration). The sketch also omits the donor's `(int)` path for negative cycles: it reproduces the truncation, so a negative cycle is not wrapped, as in the donor. The sketch uses the donor's 0.001 s skip on every advance; the donor skips it only when the interval is computed from the clock.

```ts
// Licence: Valve Source 1 SDK LICENSE (restricted). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface ClipEvent { cycle: number; id: string; }   // cycle in 0..1 of the clip

interface Playback {
  seq: number;            // current clip id
  cycle: number;          // 0..1 position in the clip
  rate: number;           // playback rate multiplier
  durationS: number;      // clip length in seconds
  looping: boolean;
  finished: boolean;
  prevEventCycle: number; // cycle at the end of the last event pass
  eventSeq: number;       // clip the event pass last ran for
}

// Advance the cycle by elapsed time: cycles per second = 1 / duration, times the rate.
function advanceCycle(p: Playback, dt: number): void {
  if (dt <= 0.001) return;                       // donor: skip tiny intervals
  let next = p.cycle + dt * (1 / p.durationS) * p.rate;
  if (next < 0 || next >= 1) {
    if (p.looping) next -= Math.trunc(next);     // donor: (int) truncation, so a negative next is not wrapped
    else next = next < 0 ? 0 : 1;
    p.finished = true;
  }
  p.cycle = next;
}

// Fire each event whose cycle was crossed this update: prev < e.cycle <= cur.
// A wrap (cur moved back by more than 0.5) fires the old pass's tail first, then the new head.
function fireCrossed(p: Playback, events: ClipEvent[], fire: (e: ClipEvent) => void): void {
  let cur = p.cycle;
  let prev = p.prevEventCycle;
  if (p.eventSeq !== p.seq) {       // new clip: restart at -0.01 so cycle-0 events fire
    p.eventSeq = p.seq;
    cur = 0;
    prev = -0.01;
  }
  if (cur === prev) return;         // stalled
  let looped = false;
  if (cur <= prev) {
    if (prev - cur > 0.5) looped = true;
    else return;                    // small backwards step: fire nothing
  }
  if (looped) {
    for (const e of events) if (e.cycle > prev) fire(e);  // tail of the old pass
    prev = cur - 0.001;             // donor: m_flPrevEventCycle = flEventCycle - 0.001
  }
  for (const e of events) if (e.cycle > prev && e.cycle <= cur) fire(e);
  p.prevEventCycle = cur;
}

// Demo: a 0.5 s looping clip with three events, stepped at 60 Hz.
const clip: ClipEvent[] = [
  { cycle: 0.02, id: "swish" },
  { cycle: 0.4, id: "strike" },
  { cycle: 0.9, id: "dust" },
];
const p: Playback = { seq: 1, cycle: 0, rate: 1, durationS: 0.5, looping: true, finished: false, prevEventCycle: -0.01, eventSeq: 1 };
const seen: string[] = [];
for (let i = 0; i < 40; i++) {
  advanceCycle(p, 1 / 60);
  fireCrossed(p, clip, (e) => seen.push(e.id));
}

export {};
```

## 5. Lands in

- TARGET `src/fight/clip-events.ts` (new client module: cycle advance and crossing-based cues for creature clips). Parity-checklist row 7 (creature actor/clips). Cues only: the strike itself stays with the server tick count (row 18 post-K item 3 sub-line "server tick: fixed step, input intake, per-tick NPC budget").
- today: no clip event pass in `src/fight/`; this note does not read Frankendom's creature code.
- Reuse tag: rewrite-from-idea (Source 1 SDK licence: restricted; clean-room, shape only)
- Brief rule served: 1 (one engine: the strike is a server tick; the cues are client-only and cannot decide damage or kills); rule 6 (zones as data: clip duration and playback rate are clip and creature data, not constants).

## 6. Gaps and risks

- Wrap drop (confirmed by running a mirror of lines 3654-3716 on a VPS scratch copy, not on the donor). After a loop wrap, the previous cycle is set to the new cycle minus 0.001 (3703) before the head pass (3716). Events in the first slice of the new pass (cycle between 0 and the new cycle minus 0.001) are therefore not fired on that update. In the run, a 0.02-cycle event was dropped on the wrap update while the tail event fired. Frankendom must test this and fire the head on the wrap update.
- Events are client-only. A client cue cannot be the strike: the server must not read the client's cycle to decide a hit (the server-verified-kill ruling).
- The interval is not clamped in `FrameAdvance` (5478-5493); the 0.2 s cap (5271-5273) is in a second path with no caller in this file. Frankendom should have one advance path on the fixed tick, with a clamp on the tick count, not on wall time.
- The server correction (5495-5522) is designed for network drift, but it is inert in this file. If Frankendom uses it, the cap of 0.1 cycle per update must be tested against its own tick rate.
- Negative cycles are not wrapped by the `(int)` truncation (5537). Reverse playback is not covered by this path.
- Visibility gate (3571-3572 and 3583-3584): invisible creatures get no cues. Frankendom must decide whether a creature out of the camera still needs its cues (not a camera decision: a gameplay question).
- Not read: `FireEvent` (what each cue does), `MaintainSequenceTransitions` (1815), IK foot locks (2436-2671), the attachments that cues are placed at (2026-2250), ragdoll takeover and blend-back (1873-1901, 4863-4967). Blend between clips and foot IK were not verified in this pass.
