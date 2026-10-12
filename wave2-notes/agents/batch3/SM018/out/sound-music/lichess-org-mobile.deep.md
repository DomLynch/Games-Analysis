# lichess-org-mobile (sound-music, cell 15)

Donor: `/mnt/frankendom-donors/lichess-org-mobile/lib/src/model/clock/clock_tool_controller.dart` | Licence: GNU GPL v3 (read from `LICENSE`, "GNU GENERAL PUBLIC LICENSE, Version 3, 29 June 2007") | Dart | symbol `ClockToolController.onClockEmergency`

Checked: The list's hint file, `lib/src/service/sound_service.dart` (220 lines), I read in full; it is the sound-theme and stream layer. The mechanism I describe is the low-time warning, which is a real stinger: `ClockToolController` (clock_tool_controller.dart 1-140, 176-188 and 206-216 read; 141-175, 189-205 and 217-413 not read) and `MoveExpiration` (game_player.dart 397-465, read in full), with a second, online-game version of the same warning in `GameController.onClockEmergency` (game_controller.dart 461-466, read; its callers not read) and `MoveFeedbackService` (move_feedback.dart, read in full). Candidates opened: sound_service.dart, clock_tool_controller.dart, game_player.dart, move_feedback.dart, game_controller.dart (440-475). Confidence: high on the clock latch and the expiry widget (order of steps and numbers traced). Medium on the sound service's stream cap: the cap is passed to a plugin (`sound_effect`) whose behaviour when a third sound starts is not in the donor and was not read. Not read: `clockSoundProvider` (`model/account/account_preferences.dart` 25, grep only), `ChessClock` (`model/clock/chess_clock.dart`, not opened). The Flutter rule that `setState` during `build` is an error is framework behaviour, not read in the donor. Camera scope: not applicable.

## 1. Mechanism

- Low-time warning, one per side per clock (clock_tool_controller.dart). Each side has a latch (`_hasPlayedLowTimeSound`, 36-39) and a threshold (`_emergencyThresholds`, 40-43). Thresholds are set when the controller builds, from each side's initial time (59-60), and the threshold is 10 % of that initial time (`_calculateEmergencyThreshold`, 90-93: `initialTime.inMilliseconds * 0.1`, rounded).
- Order of steps on every clock tick: both clock sides call `onClockEmergency` through a listener (72-73). Inside it: (a) return if no side is active (97); (b) return if the active side already warned (98); (c) read the active side's remaining time (99-101); (d) if remaining is at or under its threshold (102), play `Sound.lowTime` (103) and set that side's latch to true (104). The latch is set in the same step as the cue, so a side warns once per clock run.
- Re-arm points: time-control change (`updateOptions`, 131-137: both latches false and one new threshold), a per-side time change (183-184), and reset (212-213). These are the only places the latch goes back to false.
- Online-game version (game_controller.dart 461-466): `onClockEmergency(activeSide)` returns if the side is not the local player (461, `youAre`), awaits the user's clock-sound preference (462), and plays `Sound.lowTime` (464) only when it is on. Its callers were not read.
- Move-expiration warning (game_player.dart, `MoveExpiration`, 397-465). A `Timer.periodic` of 1000 ms (407, 412-422) decrements `timeLeft` by one period (415). On every build, the widget computes `emerg = timeLeft <= 8 s` (449). If `emerg`, the local player is to move, and the latch `playedEmergencySound` (410) is still false (451), it plays `Sound.lowTime` (452) and sets the latch inside `setState` (453-455). The latch is never set back to false anywhere in the class (grep: only 410, 451, 454).
- Restart on a new expiry: `didUpdateWidget` (431-437) cancels the timer, resets `timeLeft` to the new `timeToMove` and starts the timer again (433-436). It does not reset `playedEmergencySound`. So a second expiry in the same State object does not warn again. This is the defect (see section 6).
- Sound service (sound_service.dart): a theme file is probed with `rootBundle.load` (136); if the probe fails, the standard file is used (138). The plugin is started with at most two concurrent streams (`_kMaxConcurrentStreams = 2`, 15, 166). `play` computes final volume as the master volume times the call's volume (178), and does nothing when sound is disabled or the final volume is 0 (179-181), then hands the sound to the plugin (185). `changeTheme` releases the plugin, re-initialises it, loads the move sound first (206), plays it if asked (207-209), then loads the rest of the theme except move (210). iOS uses the `aifc` container, others use `mp3` (50).
- Move feedback (move_feedback.dart): `playedMove(san)` sets `check` when the SAN has `+` or `#` (29). A capture (SAN has `x`, 30) plays the variant's capture sound (38) with haptics; a move plays the move sound (15) with haptics. Haptics: medium impact when check, light impact otherwise (17-22; capture branch 40-45).

## 2. Key functions

- `ClockToolController.onClockEmergency` (clock_tool_controller.dart 95-106): the one-shot warning.
- `ClockToolController._calculateEmergencyThreshold` (91-93): 10 % rule.
- `ClockToolController.updateOptions` (131-137) and per-side update (183-184) and reset (212-213): re-arm points.
- `_MoveExpirationState.build` (447-464, the warning at 449-456) and `didUpdateWidget` (431-437): fixed-threshold expiry warning.
- `SoundService.play` (175-187) and `changeTheme` (199-211): volume gate and theme swap order.
- `MoveFeedbackService.playedMove` (28-35): SAN to cue and haptic.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One warning per side per run, latched, re-armed on a new time control or reset | Latch per side (clock_tool_controller.dart 36-39); re-arm at 136, 184, 212 |
| Warning threshold as a fraction of the side's initial time | 10 % (92) |
| Warning on the active side only | Active-side gate (97-98) |
| Fixed-period countdown with a fixed warning threshold | Period 1000 ms (407); warning at 8 s (449) |
| Master volume times per-cue volume, silent at zero | `masterVolume * volume` (178); silent check (179) |
| Concurrent stream cap for one-shots | 2 (15); passed to the plugin (166); behaviour when exceeded not read |
| Check gets a heavier haptic than a plain move | Medium impact for check (19), light otherwise (21) |

## 4. TypeScript sketch

simplified: keeps the donor's one-shot latch, the active-side gate, the set-latch-in-the-same-step rule, the fraction-of-initial-time threshold, and the re-arm points. It fixes the expiry defect: the warning is decided in the timer tick (not inside a render), and a new budget re-arms the latch. The fixed 8 s threshold of the donor is kept as a parameter. Omits: the Flutter widgets and `setState`, the clock listener (replaced by an explicit call), the sound service and its theme fallback and stream cap, the user preference gate, the move bonus and flag logic, and the expiry text. The order of steps in `tick` is the donor's order (decrement, then check), so the warning can come up to one period late, as in the donor.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch of the rules, written from the described mechanism.
// clean-room
export const DEFAULT_EMERGENCY_FRACTION = 0.1; // share of the initial time that counts as an emergency

export interface Latch {
  warned: boolean;
}

// Threshold for one side: a fraction of its initial time (the donor uses 10 percent).
export function emergencyThresholdMs(initialMs: number, fraction: number = DEFAULT_EMERGENCY_FRACTION): number {
  return Math.round(initialMs * fraction);
}

// Warn once: only the running side can warn; the latch is set in the same step as the cue.
export function warnIfLow(
  latch: Latch,
  remainingMs: number,
  thresholdMs: number,
  active: boolean,
  play: () => void,
): boolean {
  if (!active || latch.warned) return false;
  if (remainingMs > thresholdMs) return false;
  latch.warned = true;
  play();
  return true;
}

// Re-arm points: a new time control, a new budget, or a reset.
export function rearm(latch: Latch): void {
  latch.warned = false;
}

// Fixed-step expiry: the warning is decided in the tick, never inside a render.
export interface Expiry {
  timeLeftMs: number;
  budgetMs: number;
  latch: Latch;
}

export function setBudget(e: Expiry, budgetMs: number): void {
  e.budgetMs = budgetMs;
  e.timeLeftMs = budgetMs;
  rearm(e.latch); // the fix: a new budget re-arms the warning
}

export function tick(
  e: Expiry,
  periodMs: number,
  warnAtMs: number,
  mePlaying: boolean,
  play: () => void,
): void {
  e.timeLeftMs -= periodMs;
  warnIfLow(e.latch, e.timeLeftMs, warnAtMs, mePlaying, play);
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (file /tmp/sm018-mobile-low-time-latch.ts): exit 0.

## 5. Lands in

- TARGET `src/fight/cues.ts` (new): the engine emits a low-resource event (for example stamina or a per-fight timer at 10 % of its budget) once per fight per fighter, and the client plays the warning. Parity-checklist row 12 (combat sound cues).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: addendum rules 2, 4 and 6 (judged the idea; licence stated exactly)

## 6. Gaps and risks

- Defect (kept the idea, fixed in the sketch): the expiry latch is never re-armed when `timeToMove` changes (didUpdateWidget, 431-437), so a second expiry in the same State does not warn. Fix: `setBudget` re-arms the latch.
- Defect: the warning plays from inside `build` and sets its latch through `setState` there (451-455). Flutter does not allow `setState` during `build` (framework rule, not read in the donor), so this path is fragile. Fix: decide in the timer tick, as the sketch does.
- Fixed 8 s threshold for the expiry (449) regardless of the budget, while the clock tool uses 10 % of initial time. For a short budget 8 s is most of the window. Use the fraction, or make the threshold data.
- The online-game warning is gated per user preference (game_controller.dart 462). Frankendom should gate warnings the same way (player setting), but keep the engine event unconditional so the server records the same state.
- Voice limit: the donor caps one-shot streams at two (15, 166), but the behaviour when a third sound starts is inside the plugin and was not read. Frankendom needs an explicit priority rule for kill and death cues; do not rely on the plugin.
- No layered music, ambience beds, or per-biome crossfades in this donor (the topic's other parts are absent here).
- The sound-theme fallback (138) is a per-file probe, which means every missing file costs one failed load at start. Frankendom can keep the fallback as data (zone or theme table), not a probe.
- Not read: `ChessClock`, `clockSoundProvider`, the clock controller lines 140-175 and 216-413, and the sound_effect plugin.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: addendum rules 2, 4 and 6

Best transferable idea: Warn once per fighter when a timed resource falls to a fraction of its starting budget, latch the warning in the same step as the cue, and re-arm the latch whenever the budget is reset.

Decision (proposed): adapt - keep the 10 % latched warning and the re-arm rule (both client-side and engine-driven), decide the warning in the tick rather than in a render, and make the threshold a fraction of the budget (data), not the donor's fixed 8 s.
Acceptance: A fighter whose stamina or fight timer drops under ten percent hears one low-stamina sting, not one per frame; after a reset or a new round the sting can play again; a client test drives a tick sequence through the threshold and asserts exactly one cue per budget.
