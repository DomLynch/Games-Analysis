# open-duelyst-duelyst (spectator-coach-wagers-replays, cell 3)

Donor: `/mnt/frankendom-donors/open-duelyst-duelyst/app/replay/replayEngine.coffee` (replay pacing, 455 lines; with `server/routes/api/me/spectate.coffee` for the spectate gate and `app/common/config.js` for the numbers) | Licence: CC0 1.0 Universal (LICENSE line 3: "CC0 1.0 Universal"; public-domain dedication, treated as permissive; code may be adapted) | CoffeeScript | symbol `_ReplayEngine`

Checked: Read in full: `app/replay/replayEngine.coffee` 1-455 (watchReplay 75-127, start timer 129-137, pause/resume 170-255, `_startReplayingSteps` 257-292, `_replayNextStep` 294-375, `_startReplayingUIEvents` 377-405, `_replayNextUIEvent` 407-453). Read: `server/routes/api/me/spectate.coffee` 40-110 (the gate and the token), `app/common/config.js` 345-352 and 1355-1365, `app/ui/views/composite/game_bottom_bar.js` 166-175, `app/sdk/gameSession.coffee` 1479-1510, 1780-1795, 3583-3592. Grep for coach, wager, betting, bet across app/sdk, app/ui/views2/watch, app/replay, server/routes, server/lib: no coach or betting code; the only "wager" hits were the card name Drake Dowager. Confidence: high on the pacing math and the speed defect (read at line level and receipted); medium on the spectate gate (read; the Firebase data behind it not read). Not read: `app/ui/views2/watch/watch_layout.js` and `watch_game_item.js` (the spectator list UI), how `Step.timestamp` is set (only its use is read), `SDK.GameSession.isNew()`, the card follow-up API used by the buffer test, the Firebase writes that store steps. camera_scope: not applicable (not a camera cell).

Best transferable idea: Store each replay step with the gap to the next step, cap the dead gaps, and drive playback with one speed divide on one clock, so a long idle gap plays short without changing the order of actions.

Decision (proposed): adapt - keep the recorded-gap plus dead-gap-cap shape for Pit replays, but on Frankendom's fixed step: store tick numbers, cap dead gaps in ticks, and treat speed as a client-only multiplier over that same tick clock; reject the wall-clock setTimeout timing the donor uses.

Acceptance: A Pit replay of a bout with a 20 s dead gap plays that gap in 5 s at 1x; at 2x the whole replay runs in half the time with the same action order and the same final HP; a server test replays the stored tick list and asserts the same result.

## 1. Mechanism

- Recording (donor side, not read in full): each executed action is signed with a timestamp after it runs (`gameSession.coffee` 1789-1791). Steps are stored per turn; a replay is `gameSessionData` (`createdAt`, `turns`, `currentTurn`) plus optional UI events (hover, select, mouse clear, turn time, emote) with their own timestamps.
- Start (`watchReplay`, 75-137). Adds the current turn to the list if it is not already in it (checked by `createdAt`), resets indices, and waits 2000 ms (137) before the first step.
- First step (`_startReplayingSteps`, 257-292). Not resuming: the gap is `firstStep.timestamp - createdAt` (265-270 cover the resume branch and the 10 s opening cap). Culled gap = min(base, 10 s) (285-289). Scale = clamped / base (290). The timer fires after `clamped / speed` (291-292).
- Each step (`_replayNextStep`, 294-375). Advance the step index (rolls to the next turn at the end of a turn). Look ahead to the next step. Opponent follow-up chain: a step by the opponent that applies a card with a pending follow-up is buffered (330); buffered steps run together when a non-buffered step comes (about 334-339). Otherwise run the current step through `executeAuthoritativeStep` (342), so the SDK re-runs the stored action rather than restoring a snapshot. Then compute the next gap: base = next.timestamp - current.timestamp (355); cap = 10 s while the session is new (mulligan) or 5 s otherwise (358-360); culled = min(base, cap) when `replaysCullDeadtime` (362-364); scale = clamped / base when culled (365-368); speed divide (369); timer (371).
- Pause and resume. Pause (172-182) clears all timers (178) and stores `pausedAt` (181). Resume (186-) rebuilds the step timer as remaining = delay - (pausedAt - startedAt) (265) and re-derives the gap if the culling setting changed (`_updateStepTimeForDeadtimeCulling`, 224-231).
- UI events (`_startReplayingUIEvents` 377-405, `_replayNextUIEvent` 407-453). Each event's wait is placed relative to the current step's time: if the step is later than the event, wait = stepDelay - sinceStep - timeToStep x scale (391); otherwise wait = timeFromStep x scale - sinceStep (395). Events fire through `_replayNextUIEvent`, and the next event's wait is again relative to the step (440-451).
- Speed control (`game_bottom_bar.js` 168-173): the value cycles 1.0 to 1.5 to 2.0 and back to 1.0.

## 2. Key functions

- `_replayNextStep`: `/mnt/frankendom-donors/open-duelyst-duelyst/app/replay/replayEngine.coffee` 294-375. The step loop: execute, look ahead, compute the next gap, schedule.
- `_startReplayingSteps`: same file, 257-292. First gap, cap, scale, and the speed divide on the first timer.
- `_startReplayingUIEvents` and `_replayNextUIEvent`: same file, 377-405 and 407-453. UI-event waits relative to the step.
- `_updateStepTimeForDeadtimeCulling`: same file, 224-231. Re-derives the gap when the culling setting changes mid-replay.
- Spectate gate: `/mnt/frankendom-donors/open-duelyst-duelyst/server/routes/api/me/spectate.coffee` 40-110. Enabled flag, live game only (no `ended_at`), not blocking spectators, spectator must be in the player's buddy list; returns the game data and a 30 s token.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Next gap is the recorded time between two steps, not a fixed rate | Recorded gap, from `timestamp` fields (theirs, replayEngine.coffee 355) |
| Dead gaps are capped so idle time does not stall playback | Normal cap 5 s (theirs, config.js 349; applied 360); opening (mulligan) cap 10 s (theirs, config.js 351; applied 358) |
| Culling is on by default and can be toggled | `replaysCullDeadtime = true` (theirs, config.js 1363) |
| One speed control over all replay timing | Default 1.0 (theirs, config.js 1360); UI steps 1.0, 1.5, 2.0 (theirs, game_bottom_bar.js 169-172) |
| Events inside a culled gap keep their relative timing | Scale = culled / base (theirs, 365-368); guarded only in one path (see defects) |
| Start delay before the first step | 2000 ms (theirs, replayEngine.coffee 137); not a config value |
| Token that lets a buddy watch a live game | 30 s JWT expiry (theirs, spectate.coffee 103) |

## 4. TypeScript sketch

simplified: the sketch keeps the recorded-gap, cap, scale and speed-once rules, and the pause and resume arithmetic. It does not model the opponent follow-up buffer, the instant-fire path for opponent mulligan steps, the UI event types, the Firebase step decoding, or the action re-execution. It applies the speed control once, on every path (the donor applies it to the first gap and to some UI events, not to the step-to-step timer at line 371; see defects). It replaces the donor's separate before-step and after-step UI formulas with one linear mapping anchored at the current step.

```ts
// Licence: CC0 1.0 Universal (donor, Duelyst). Public-domain dedication; shape only, written from the mechanism, not a translation.
export {};

interface Pacing {
  maxGapMs: number;      // donor CONFIG.REPLAY_MAX_STEP_DELAY * 1000 (5000)
  openingGapMs: number;  // donor CONFIG.REPLAY_MAX_STEP_DELAY_STARTING_HAND * 1000 (10000), mulligan
  cull: boolean;         // donor CONFIG.replaysCullDeadtime (true)
  speed: number;         // donor CONFIG.replayActionSpeedModifier (1.0; UI cycles 1.0 -> 1.5 -> 2.0)
}

interface StepTiming { delayMs: number; scale: number; }

// Gap from one recorded step to the next, capped when culling, then divided by speed exactly once.
// scale = culled gap / recorded gap, applied to UI events that sit inside the gap.
export function stepTiming(curTs: number, nextTs: number, p: Pacing, opening: boolean): StepTiming {
  const base = Math.max(0, nextTs - curTs);
  const cap = opening ? p.openingGapMs : p.maxGapMs;
  const clamped = p.cull ? Math.min(base, cap) : base;
  // guarded: the donor's _startReplayingSteps divides without this check (replayEngine.coffee line 290)
  const scale = base > 0 && clamped < base ? clamped / base : 1;
  return { delayMs: clamped / p.speed, scale };
}

// Wait until a UI event (hover, select, emote) should fire, measured from the moment its anchor step started.
// One mapping for before and after the step; speed applied once.
export function uiWaitMs(
  evTs: number, anchorTs: number, scale: number, speed: number,
  anchorStartedMs: number, nowMs: number,
): number {
  const fireAtMs = ((evTs - anchorTs) * scale) / speed;
  return Math.max(0, fireAtMs - (nowMs - anchorStartedMs));
}

// Pause and resume: the time left is the delay minus the time already played.
export function resumeWaitMs(remainingAtPauseMs: number, pausedAtMs: number, startedAtMs: number): number {
  return Math.max(0, remainingAtPauseMs - (pausedAtMs - startedAtMs));
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/sc002-duelyst-replay-pacing.ts), exit 0.

## 5. Lands in

- TARGET `src/fight/replay.ts` (new module, shared with cell 1): the replay clock. Stored steps carry tick numbers; the Pit player derives display waits from ticks with speed applied once. Parity-checklist row 19 (fight record/replay).
- Reuse tag: adapt-shape (CC0 1.0: code may be adapted; sketch written from the mechanism)
- Brief rule served: 1 (one engine: replay re-runs the stored actions through the same SDK rules); server-verified (the stored steps are the authoritative actions)

## 6. Gaps and risks

- Defect 1, speed control ignored on the step-to-step timer (replayEngine.coffee 369-371): the code divides `_currentStepDelayClamped` into `_currentStepDelay` (369) but schedules the next step with `_currentStepDelayClamped` (371). The first gap (292) and the pause resume (265) use the divided value. At 1.5x or 2.0x the steps after the first run at real-time gaps while UI events are sped up (some branches). Not run in a browser; read only. Fix: schedule with one divided value on every path (the sketch does this).
- Defect 2, UI-event waits mix divided and undivided milliseconds: the first event is scheduled without the divide (404-405), a later event with it (451), and the before/after formulas use the divided step delay together with undivided `timeToStep x scale` (391; again at 440). Fix: one mapping, one divide (`uiWaitMs`).
- Defect 3, unguarded scale (line 290; also 230): clamped / base with base = 0 gives NaN when culling is on, because the step-path guard at 365-368 is missing here. Fix: the guard in the sketch. Not run.
- Wall-clock timing: the donor paces replay with setTimeout on real recorded gaps (292, 371). Playback drifts with load and is not tick-indexed. Frankendom's fixed step needs tick numbers in the stored steps; the donor's wall-clock shape does not transfer as is.
- Replay re-executes stored actions through the SDK (342). That is correct only if every random outcome is stored in the step or re-derived from a seed. Not verified in this donor (how draws are stored was not read). Frankendom's row 19 needs a seed or a stored outcome, and a test.
- Spectate gate (spectate.coffee 76, 91, 94, 103): live game only, opted-in buddies only, 30 s token. Good for privacy, but it is a buddy-social rule, not a Pit rule. Not a Frankendom ruling; the server-verified kill and ledger rules are not in this file.
- No coach, mid-fight instruction or wager code exists in this donor (grep above). Those topics need another donor.
