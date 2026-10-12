# ValveSoftware-source-sdk-2013 (hud-ui, cell 2)

Donor: `/mnt/frankendom-donors/ValveSoftware-source-sdk-2013/game/mod_hl2mp/scripts/HudAnimations.txt` (data) with runner `/mnt/frankendom-donors/ValveSoftware-source-sdk-2013/src/vgui2/vgui_controls/AnimationController.cpp` and consumer `/mnt/frankendom-donors/ValveSoftware-source-sdk-2013/src/game/client/hl2/hud_damageindicator.cpp` | Licence: Valve, Source 1 SDK LICENSE (root `LICENSE`: free use to develop a modified Valve game on the Source 1 engine; distribution must be free of charge and include the LICENSE file) | C++ + script | symbol `AnimationController::StartAnimationSequence` (runner); `CHudDamageIndicator::MsgFunc_Damage` (consumer)

Checked: data table read in full (`HudAnimations.txt`, 862 lines: 81 events, 211 Animate commands, 12 RunEvent, 20 Stop commands; conditional tags such as `[$WIN32]` and `[$DECK]` appear and were not read in the parser). Runner read: `AnimationController.cpp` 455-512 (interpolator and timing parse), 698-1086 (posted messages, tweens, update, sequence start), 1242-1302 (remove queued), 1303-1420 (exec, start animate, run and stop handlers), 1496-1546 not read. Consumer read: `hud_damageindicator.cpp` 76-122 (angle table), 169-200 (draw start only), 328-437 (message, first-match loop, direction). Not read: the script loader body (`AnimationController.cpp` 139-192 and the general parser 291-455 and 512-697), `SetupPosition` (212-290), `GetValue` and `SetValue` (1547-1754), and the caller that supplies `currentTime` (the viewport and `baseviewport.cpp` 127-200 were seen by grep only). Callers: `StartAnimationSequence` is called from `hud_damageindicator.cpp` (347 and 400) and by other HUD code (grep only, not read). Confidence: high on the timeline, the retrigger rule and the angle table; medium on what time source the caller passes in. Cell 1 (Half-Life pain compass) is the cue maths; this cell is the data-driven cue timeline that plays it. Not a camera cell.

## 1. Mechanism

- Data (the table): `HudAnimations.txt` lists events. Each event is a list of commands: `Animate <panel> <variable> <target> <interpolator> <start> <duration>`, `RunEvent <event> <delay>`, `StopEvent`, `StopAnimation` and `StopPanelAnimations`. Targets are scheme tokens (for example `"BgColor"` at line 64) or literal colours (for example `"255 88 0 200"` at line 188). The header comment (1-35) documents only Linear, Accel and Deaccel.
- Parse: the interpolator token maps to Accel, Deaccel, Spline, Pulse (with a frequency), Bias, Gain, Flicker (with a noise amount) or Bounce; any other token becomes Linear (`AnimationController.cpp` 459-506). The start and duration are plain seconds.
- Starting a sequence (`StartAnimationSequence`, 1045-1082): first it removes that sequence's own queued work for that parent (1063), so a re-hit restarts the cue instead of stacking it. Then each command runs in order.
- Animate: queued as a tween with start = now + start and end = start + duration (1367-1368). It is not applied yet.
- Run or stop: posted with start = now + delay (1318), so it fires later. A StopEvent removes that event's queued work (1391).
- Per update (`UpdateAnimations`, 903-915): posted messages first (698-810), then tweens (815-871).
- Posted: a message is handled once its start time has passed (710). It is removed before it runs (718). A RunEvent runs only if that event has not already run in this update for this parent (737-741); this stops a zero-delay ping-pong from looping forever in one update.
- Tween: at the first tick at or after its start, it reads the value currently on the panel (840), so a new cue begins from where the old one is and does not snap. While it runs, the value is `GetInterpolatedValue` (856; 950-1020): position = (time - start) / duration, then Accel squares it (958-959), Deaccel takes the square root (961-962), Linear leaves it. At the end the value is set to the target (848-851) and the tween is removed (865-869).
- Composition: `HudTakeDamageBehind` is two RunEvents at delay 0, Left and Right (202-203). `HudTakeDamageDrown` runs Behind (229). The health heartbeat is a loop: `HealthPulse` runs `HealthLoop` after 0.8 s (385), and `HealthLoop` runs `HealthPulse` at 0.0 (391). `HealthLow` starts the loop at 1.0 s (373) and stops it first (358-359).
- Hit to cue (consumer): `MsgFunc_Damage` (328-403) drops a hit with no direction unless it is drowning (354). The heavy class is damage above 25, or no suit (361-370). The angle comes from `GetDamagePosition` (408-437): the view's forward is flattened to the ground plane, right is up cross forward (417-420), side and front are dot products (421-422), and the angle is atan2 of the two, in degrees (427-428). The first matching table row wins (379-396): typed damage first (drown, poison, burn, radiation at 100-104), then heavy bins (high left 45-135, high right 225-315, high any, 106-108), then light bins (left 45-135, right 225-315, behind 135-225, 110-112), then front as the fallback (115). `StartAnimationSequence( dmgAnim->name )` runs the event (400).
- Values in the data: side cue, a colour ramp from orange to red at alpha 200 over 0.3 s, then a Deaccel fade of alpha to 0 over 0.5 s starting at 0.3 s (188-190). High cue: a colour ramp from orange to red at alpha 200 over 0.4 s, then a Deaccel fade to 0 over 2.4 s starting at 0.4 s, so it is gone at 2.8 s (208-210). Death: alpha ramps to 96 over 0.1 to 0.3 s, then a Deaccel ramp to full red over 4.0 s starting at 0.3 s (256-257), and the heartbeat loop stops first (253-254). Damage types: poison is pale yellow fading out by 1.2 s (234-235), burn red by 0.6 s (240-241), radiation white by 0.5 s (246-247).
- High damage paints a strip from the screen edge across half the width, full height (184-199; `x1 = GetWide() * 0.0f` and `x2 = GetWide() * 0.5f` at 189-190, `y[2] = GetTall()` at 193). Lines 201-327 of the draw routine, `ShouldDraw` and `Paint` were not read, so the mirror for the second side is not confirmed.

## 2. Key functions

- `AnimationController::StartAnimationSequence(Panel*, const char*, bool)`: `AnimationController.cpp` 1045-1082. Restart rule, then queue each command.
- `AnimationController::UpdatePostedMessages`: 698-810. Due run and stop messages, the per-update RunEvent guard.
- `AnimationController::UpdateActiveAnimations`: 815-871. Start capture, interpolation, end.
- `AnimationController::GetInterpolatedValue`: 950-1020. Accel, Deaccel, Pulse, Bias, Gain, Flicker, Bounce, Linear.
- `AnimationController::StartCmd_Animate`: 1357-1376 (start and end times).
- `CHudDamageIndicator::MsgFunc_Damage`: `hud_damageindicator.cpp` 328-403. Message, heavy class, first-match loop, start.
- `CHudDamageIndicator::GetDamagePosition`: 408-437. Angle from the view.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| A named cue as a list of timed tweens plus delayed run and stop commands, held in data | Timings in seconds (theirs, HudAnimations.txt 189-190, 209-210, 256-257, 385) |
| Re-trigger removes the cue's own queued work, so it restarts | Rule (theirs, AnimationController.cpp 1063) |
| Each run or stop is handled once per update; a repeated run is dropped | Guard (theirs, 737-741) |
| Tween starts from the current value and eases: linear, accel (t squared), deaccel (square root) | Exponents 2 and one half (theirs, 959, 962) |
| Angle bins choose the cue: left 45-135, behind 135-225, right 225-315, front the rest | Bins in degrees (theirs, 106-115) |
| Heavy hit switches to a stronger cue set | Heavy above 25 damage or no suit (theirs, 361-370) |
| Cue covers part of the screen for heavy hits | Half the width (theirs, 190) |

## 4. TypeScript sketch

simplified: keeps the timeline, the retrigger rule, the once-per-update run guard, the tween start from the current value, the three easings and the first-match angle table. It omits the colour (RGBA is one alpha channel here; the orange-to-red shift at line 189 is dropped), scheme tokens, panel lookup, the script loader and its conditional tags, the sequence cancel for one parent, the screen-size reload and the run-to-completion path. Fix: the donor falls back silently to Linear for an unknown interpolator name (AnimationController.cpp 503-506); here the interpolator is a union type, so a typo fails the build. The angle table is first-match in the same order as the donor.

```ts
// Event-driven HUD cue sequencer, shape only (clean-room, Valve licence).
// A named event holds timed commands: an animate tweens one variable; a run or stop starts or ends another event.
type Interp = "linear" | "accel" | "deaccel";

type AnimateCmd = { kind: "animate"; variable: string; target: number; interp: Interp; start: number; dur: number };
type EventCmd = { kind: "run" | "stop"; event: string; delay: number };
type Cmd = AnimateCmd | EventCmd;

type Tween = { event: string; variable: string; interp: Interp; start: number; end: number; from: number | null; to: number };
type Posted = { event: string; cmd: EventCmd; at: number };

// theirs: AnimationController.cpp:958-962 (accel = t*t, deaccel = sqrt(t), linear is the default)
function ease(t: number, interp: Interp): number {
  if (interp === "accel") return t * t;
  if (interp === "deaccel") return Math.sqrt(t);
  return t;
}

// Example events (values as in game/mod_hl2mp/scripts/HudAnimations.txt, alpha channel only).
const EVENTS = new Map<string, Cmd[]>([
  ["HudTakeDamageLeft", [
    { kind: "animate", variable: "left.alpha", target: 200, interp: "linear", start: 0, dur: 0.3 },
    { kind: "animate", variable: "left.alpha", target: 0, interp: "deaccel", start: 0.3, dur: 0.5 },
  ]],
  ["HudTakeDamageRight", [
    { kind: "animate", variable: "right.alpha", target: 200, interp: "linear", start: 0, dur: 0.3 },
    { kind: "animate", variable: "right.alpha", target: 0, interp: "deaccel", start: 0.3, dur: 0.5 },
  ]],
  ["HudTakeDamageBehind", [
    { kind: "run", event: "HudTakeDamageLeft", delay: 0 },
    { kind: "run", event: "HudTakeDamageRight", delay: 0 },
  ]],
  ["HudPlayerDeath", [
    { kind: "animate", variable: "full.alpha", target: 96, interp: "deaccel", start: 0.1, dur: 0.2 },
    { kind: "animate", variable: "full.alpha", target: 255, interp: "deaccel", start: 0.3, dur: 4.0 },
  ]],
  ["HealthPulse", [
    { kind: "animate", variable: "health.alpha", target: 255, interp: "linear", start: 0, dur: 0.1 },
    { kind: "animate", variable: "health.alpha", target: 128, interp: "deaccel", start: 0.1, dur: 0.7 },
    { kind: "run", event: "HealthLoop", delay: 0.8 },
  ]],
  ["HealthLoop", [
    { kind: "run", event: "HealthPulse", delay: 0 },
  ]],
]);

export class CueSequencer {
  private values = new Map<string, number>();
  private tweens: Tween[] = [];
  private posted: Posted[] = [];
  private now = 0;

  constructor(private readonly events: Map<string, Cmd[]>) {}

  value(variable: string): number {
    return this.values.get(variable) ?? 0;
  }

  // A re-hit first cancels the event's own queued work, so the cue restarts instead of stacking (theirs: AnimationController.cpp:1063).
  start(event: string): void {
    this.cancel(event);
    for (const c of this.events.get(event) ?? []) {
      if (c.kind === "animate") {
        this.tweens.push({
          event, variable: c.variable, interp: c.interp,
          start: this.now + c.start, end: this.now + c.start + c.dur,
          from: null, to: c.target,
        });
      } else {
        this.posted.push({ event, cmd: c, at: this.now + c.delay });
      }
    }
  }

  cancel(event: string): void {
    this.tweens = this.tweens.filter((t) => t.event !== event);
    this.posted = this.posted.filter((p) => p.event !== event);
  }

  update(now: number): void {
    this.now = now;

    // Run due commands. A run of an event already started this tick is dropped, which ends ping-pong loops within one tick (theirs: AnimationController.cpp:736-741).
    const ranThisTick = new Set<string>();
    for (;;) {
      const i = this.posted.findIndex((p) => p.at <= now);
      if (i < 0) break;
      const [p] = this.posted.splice(i, 1);
      if (p.cmd.kind === "run") {
        if (!ranThisTick.has(p.cmd.event)) {
          ranThisTick.add(p.cmd.event);
          this.start(p.cmd.event);
        }
      } else {
        this.cancel(p.cmd.event);
      }
    }

    // Tween. Start from the value present at the first tick at or after the start time, then ease (theirs: AnimationController.cpp:837-856).
    for (const t of this.tweens) {
      if (now < t.start) continue;
      if (t.from === null) t.from = this.value(t.variable);
      const v = now >= t.end
        ? t.to
        : t.from + (t.to - t.from) * ease((now - t.start) / (t.end - t.start), t.interp);
      this.values.set(t.variable, v);
    }
    this.tweens = this.tweens.filter((t) => now < t.end);
  }
}

// Which cue to play for a hit. First match wins. Typed kinds come first; then angle bins (degrees): 45-135 left, 225-315 right, 135-225 behind.
// heavy = damage above 25 or no suit (theirs: hud_damageindicator.cpp:361-370); heavy hits use the High events.
// theirs: hud_damageindicator.cpp:98-117
export type DamageKind = "drown" | "poison" | "burn" | "radiation" | null;

export function damageEvent(angleDeg: number, heavy: boolean, kind: DamageKind): string {
  if (kind !== null) {
    return "HudTakeDamage" + kind.charAt(0).toUpperCase() + kind.slice(1);
  }
  const within = (lo: number, hi: number): boolean => angleDeg >= lo && angleDeg <= hi;
  if (heavy) {
    if (within(45, 135)) return "HudTakeDamageHighLeft";
    if (within(225, 315)) return "HudTakeDamageHighRight";
    return "HudTakeDamageHigh";
  }
  if (within(45, 135)) return "HudTakeDamageLeft";
  if (within(225, 315)) return "HudTakeDamageRight";
  if (within(135, 225)) return "HudTakeDamageBehind";
  return "HudTakeDamageFront";
}

// Usage: one sequencer per HUD, one call per hit.
export function demo(): number {
  const seq = new CueSequencer(EVENTS);
  seq.start(damageEvent(90, false, null));
  seq.update(0.15);
  return seq.value("left.alpha");
}

export {};
```

## 5. Lands in

- TARGET `src/fight/hud-cues.ts` (proposed client module, not in the repo as I read it), parity-checklist row 14 (HUD).
- Reuse tag: rewrite-from-idea
- Brief rule served: 1 (one combat core, two clients). The cue sequencer is client-only and fires only on a hit the server has already verified; its heavy class uses the server's damage figure.

## 6. Gaps and risks

- Valve licence: clean-room only. Take the shape (timed tweens in a data file, a retrigger rule, a per-update run guard, a first-match table); do not copy the script text or the code.
- Naming trap: "High" in this donor means heavy damage (above 25, or no suit), not height (`hud_damageindicator.cpp` 361-370). Do not carry the name over unchanged.
- Size: the high cue paints half the screen width for 2.8 s (190, 210). At 375 wide with up to three attackers (MAX_ATTACKERS = 3), that covers too much of the fight. Proposal, not donor: heavy cue on the outer quarter, 0.8 s, tuned in the data file.
- Camera: the angle is measured from the view's forward (`MainViewAngles`, 414) and so follows the view yaw. With an over-the-shoulder world camera, measure it from the camera's yaw, the same rule as cell 1.
- Defects in the donor, each with its fix (the sketch shows the first):
  1. Unknown interpolator names fall back to Linear with no message (`AnimationController.cpp` 503-506). Fix: fail the content check on an unknown token.
  2. The header lists only Linear, Accel and Deaccel (`HudAnimations.txt` 1-35), but the parser accepts Spline, Pulse, Bias, Gain, Flicker and Bounce (459-502). Fix: document the full set, or remove the ones no event uses.
  3. Dead code: `GetDamagePosition` computes a screen position (`xpos` and `ypos`, 435-436) and returns only the angle (void, output `*flRotation`). Fix: return the position or delete it. No behaviour change.
  4. The angle sentinel `ANGLE_ANY` is 0 (`hud_damageindicator.cpp` 83), and a zero bound is treated as no bound (385-388). A bin that really needs a 0-degree edge cannot be written. Fix: use an explicit "no bound" value. No current row is affected.
  5. The `right` vector is up cross forward (420). Which side of the player the 45-135 bin means depends on the engine's axis convention (not read), so the bins must be checked in a test before reuse. Fix: name the vector for what it is and test one hit per bin.
- Defect 6, death restart: after death, every damage message calls `StartAnimationSequence( "HudPlayerDeath" )` again (`hud_damageindicator.cpp` 345-348). Re-triggering removes the sequence's queued work (`AnimationController.cpp` 1063) and queues it from now, so the 4.0 s ramp is pushed back each time. Fix: start the death sequence once per death. Whether the server sends damage messages to a dead player was not read.
- Death: the donor presentation is a red wash that reaches full strength over about 4.3 s (`HudAnimations.txt` 256-257) and stops the heartbeat first (254). A proposal for how a loss is made bearable: keep the wash, but cut it at the respawn event; the donor does not show the respawn event (not read).
- Idle: the heartbeat is a low-health loop of 0.8 s (385, 391) that starts only at low health (373). It is an example of a loop built from two events with delays, no timer code.

Best transferable idea: Describe each HUD cue as a named list of timed tweens and delayed run or stop commands in a data file, with a re-hit that restarts the cue, a once-per-update guard against ping-pong, and a first-match angle table that picks the cue.

Decision (proposed): adapt - keep the timed-cue data format and the restart and run-guard rules, and fix the donor's silent Linear fallback and its heavy cue width; reject the donor's "High means heavy" naming. Why: Frankendom needs designers to tune hit, heal and death cues without code, but the cue must stay small at 375 wide.

Acceptance: Hit a creature from the left in a zone fight: an edge cue on the left holds 0.3 s, then fades over 0.5 s; a heavy hit shows a stronger cue on the outer quarter of the width for 0.8 s; a second hit restarts the cue instead of stacking; changing a number in the cue data file changes the cue with no code change; a misspelled interpolator name fails the content check.
