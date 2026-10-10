# beyond-all-reason-Beyond-All-Reason (animation-rigs, cell 3)

Donor: `/mnt/frankendom-donors/beyond-all-reason-Beyond-All-Reason/luarules/gadgets/unit_script.lua` (with `scripts/Units/armcom_lus.lua` and `scripts/include/walk.lua`) | Licence: GPL v2 (`unit_script.lua` line 33, `license = "GPL v2"`; repo `LICENSE.md` line 2, "BAR game code is released under the GPL v2 licence"); `walk.lua` header line 8 reads "License: Public Domain" | Lua | symbols `Spring.UnitScript.Sleep`, `StartThread`, `SetSignalMask`, `Signal`; `script.StartMoving`; `walk()`

Checked: Read in full: `unit_script.lua` 150-470 and 695-713 and 862-897 (thread runtime: data structure, wake, sleep, start, masks, signal, frame loop). `armcom_lus.lua` 79-160 (walk head, turn helper, speed variable), 630-648 (end of the walk loop), 983-1000 (start of `StopWalking`), 1041-1072 (`UnitSpeed`), 1083-1113 (`Create`), 1128-1141 (`StartMoving`, `StopMoving`), 1152-1212 (`AimWeapon`), 1286-1298 (`Restore`), plus grep of `SetSignalMask`, `isAiming`, `leftArm` and `rightArm` over that file. `walk.lua` 1-124 (walk head, first keyframe block) and the stance headers (192-216, 259-264). `unit_attachments.lua` (whole file, 59 lines). `unit_hats.lua` 20-70, 205-232, 383-400 (read for context; not part of the verdict). Not read: `unit_script.lua` 470-694 and 714-861 (how `script.*` callins are bound and the include loader); `armcom_lus.lua` 160-630 except the Frame 4 block and the loop shell (the other keyframe blocks follow the same shape but were not each read); `walk.lua` 124-417; the Recoil engine (the semantics and unit of `Turn`, `Move` and `WaitForTurn` are not in this repo). Verified on the VPS by arithmetic: `floor(132 * 0.03030303)` gives 3 (see section 6). Verified on the VPS by a driver run of the sketch (not shipped): the walk advanced, a stop cancelled the walk thread, and an aim held the left arm off for about 3 s and then restored it; a compile error in that test file came from a name clash in the test file, not the sketch. Confidence: high on the thread runtime and the flags; medium on in-game effects (none observed); medium on the fit to Frankendom (a Lua-scripted commander, not a skinned skeleton). Not a camera cell, so no camera_scope tag.

Best transferable idea: give each rig layer its own thread with a signal mask, so a new state (aim, stop, dance) cancels only the layers it owns, and stretch one keyframe clip by the unit's ground speed so the leg cadence follows the speed.

Decision (proposed): adapt. Take the thread-and-mask model (a thread inherits its starter's mask; a signal cancels only the waiting threads whose mask shares a bit) and the speed-scaled keyframe clip (a keyframe holds 2 to 8 frames, chosen from ground speed). Change two things: the frame count must round to the nearest frame, not truncate, and a flag set by an aim must not be cleared by its own restore thread's first statement.

Acceptance: a player sees the hero's leg cadence quicken and slow with ground speed (keyframes between 2 and 8 frames), and after an aim the arms hold for 3 s and then return to the walk pose. A client test asserts that a 4-frame keyframe lasts exactly 4 frames, and that the aim flag stays true for the whole hold.

## 1. Mechanism

- Thread runtime (`unit_script.lua`). Each unit has coroutine threads, each sleeping on a frame number, waiting on a turn or move, or running (data structure, 158-192). `Sleep(ms)` converts to frames as `floor(ms * 0.03030303)` (382) and resumes at the current frame plus that count (386). `gadget:GameFrame` wakes the sleepers of the current frame (870-896). A thread started from another thread inherits that thread's signal mask (407-415). A new thread runs at once, not on the next frame (427-430).
- Signals. `SetSignalMask` sets the running thread's mask (441-444). `Signal(mask)` removes every waiting thread whose mask shares a bit with the signal (452-461). A running thread is not in a wait container, so it is not removed. Waiters are woken newest first (295-297 and 886-890).
- Walk (`armcom_lus.lua` 120-648). `script.StartMoving` sets `bMoving` and starts `walk` (1128-1134; a dance is stopped first, 1129-1131). `walk` runs a lead-in block for Frame 4 (121-159), then a `while bMoving do` loop (161) that holds the Frame 8 to Frame 52 blocks. Each block is guarded by `bMoving` and ends with `Sleep((33 * animSpeed) - 1)` (159, 199, 238 and so on). A block issues turns and moves to baked goals with baked speeds (for example 123, 126 and 147). The speed is written for one keyframe and divided by `animSpeed` at run time. Arm turns are guarded by `leftArm` and `rightArm` (122, 131, 137, 144, 150, 153).
- The walk sets no signal mask. In this file `SetSignalMask` appears only at 653, 925, 973, 1162, 1187, 1272 and 1287 (grep). So the walk thread has mask 0, and `script.StopMoving`'s `Signal(SIG_WALK)` (1137) does not cancel it. `StopMoving` clears `bMoving` (1138) and starts `StopWalking` (1139), which begins with move and turn commands to the rest pose (983-1000). The walk ends at its next `bMoving` check, one keyframe later at most.
- Speed scaling. `UnitSpeed` polls the unit's velocity (1052-1053) and sets `animSpeed = (maxSpeed * 4) / current`, clamped to a minimum of 2 (1058-1061) and a maximum of 8 (1062-1064). `maxSpeed` carries a headroom of one eighth (1049-1050). `script.Create` sets `animSpeed = 4` (1110) and starts this thread (1111). So each keyframe holds about `animSpeed` frames: 2 when fast, 8 when slow.
- Aim layer. `AimWeapon` (laser branch, 1157-1179) sets its own mask `SIG_AIM` (1162) and cancels the previous aim (1163). It turns the turret and the right arm to the target (1164-1166). It waits for the turn only if the heading moved more than 10 degrees (1168-1171). It sets `leftArm = false` (1161) and `isAiming = true` (1173), then starts `Restore` (1177). `Restore` sets `SIG_AIM` (1287), clears `isAiming` and `isAimingDgun` (1288-1289), sleeps 3000 ms (1290), turns the arms back to rest (1291-1295), and sets `rightArm` and `leftArm` to true (1296-1297). Because `Restore` holds `SIG_AIM`, the next aim's `Signal(SIG_AIM)` cancels a pending restore.
- Shared walk include (`scripts/include/walk.lua`). The same pattern for other units: `walk()` and the stances set `SIG_WALK` (15-16, 193-194, 215-216, 263-264), so a new stance cancels the old one. The arm swing is gated on `isAiming == false` (64). Sleeps and turn speeds are scaled by `speedMult` (114 and 66). The list of units that include this file was not enumerated.
- Attachment (`unit_attachments.lua`, not part of the verdict). `resolveAttachPiece` looks for `attached_con_turret_piece`, then `attach_piece` (by name, or by index), then a piece named `attach`, and logs a warning if none is found (16-55). Hats are hung on the `cosmeticpoint` pieces with `Spring.UnitAttach` (`unit_hats.lua` 673).

## 2. Key functions

- `Spring.UnitScript.Sleep`, `StartThread`, `SetSignalMask`, `Signal`: `/mnt/frankendom-donors/beyond-all-reason-Beyond-All-Reason/luarules/gadgets/unit_script.lua` 381-402, 404-431, 441-445, 447-470.
- `gadget:GameFrame` (frame wake loop): same file, 870-897. Callin wrapper: 695-704.
- `script.StartMoving` and `script.StopMoving`: `/mnt/frankendom-donors/beyond-all-reason-Beyond-All-Reason/scripts/Units/armcom_lus.lua` 1128-1140.
- `walk()` (keyframes): same file, 120-648. Turn helper: 99-109. `UnitSpeed`: 1047-1071. `Create`: 1083-1113.
- `AimWeapon` (laser branch): same file, 1152-1179. `Restore`: 1286-1298.
- `walk()` and stances: `/mnt/frankendom-donors/beyond-all-reason-Beyond-All-Reason/scripts/include/walk.lua` 14-124 (read part), 192-216, 259-264.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Frame length: one game frame is 33 ms (about 30 frames per second) | `unit_script.lua` 382 uses `0.03030303` as 1/33; the count is truncated |
| Keyframe hold is `animSpeed` frames | Written as `(33 * animSpeed) - 1` ms (`armcom_lus.lua` 159); see section 6 |
| Keyframe length clamped to 2 to 8 frames | Minimum 2 (1059-1061), maximum 8 (1062-1064) |
| Reference keyframe length 4 frames | `animFramesPerKeyframe = 4` (1049); also `animSpeed * 4` (1058) and `animSpeed = 4` at create (1110) |
| Speed headroom of one eighth above max speed | `maxSpeed + maxSpeed / (2 * 4)` (1050) |
| Baked turn speed is 30 times the keyframe delta, in degrees per second | Checked on three lines: 123 (113.7 = 30 x 3.79), 126 (1084.1 = 30 x 36.14), 147 (750.7 = 30 x 25.02) |
| Aim turn speeds in degrees per second | Heading 300 (1164); arm pitch 390 (1165-1166) |
| Wait for the aim turn only if the heading moved more than 10 degrees | 10 (1168) |
| Aim hold before the arms return | 3000 ms (1290); return speeds 105 and 95 (1291-1295) |
| Sleep frame conversion | `floor(ms * 0.03030303)`, minimum 1 (381-386) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's thread model: a thread inherits its starter's mask, a signal cancels only waiting threads whose mask shares a bit, sleeps are counted in frames, a keyframe's speeds are divided by its length, and a new aim cancels the previous aim and its pending restore. It makes three deliberate changes. It sets `SIG_WALK` on the walk, so a stop cancels it at once (the donor walk sets no mask and ends at its next `bMoving` check). It rounds the frame count to the nearest frame (the donor truncates). And the restore does not clear `isAiming` (the donor's `Restore` does, as its first statement). It also wakes threads in array order (the donor wakes newest first). It omits the donor's `WaitForTurn` fallbacks, the error handlers, the engine `Turn` and `Move` calls (the sketch's axles stand in for them), the dance and build states, the speed poll (the sketch takes the speed as an argument), and the callin wrapper. The sketch typechecks on the VPS with `export {}` appended, `--strict --target es2020`, and passed.

```ts
// Licence: GPL-2.0 for the donor framework (luarules/gadgets/unit_script.lua); the walk include is public domain.
// Clean-room sketch written from the described mechanism (signal-masked threads, frame sleeps, keyframe clips scaled by speed),
// not a translation of the donor lines.

const FRAME_MS = 33;   // one game frame, about 30 frames per second
const SIG_AIM = 2;
const SIG_WALK = 4;

type Cmd =
  | { op: "sleepMs"; ms: number }
  | { op: "waitTurn"; key: string };

type Body = Generator<Cmd, void, undefined>;

interface Axle {
  cur: number;    // degrees
  goal: number;   // degrees
  speed: number;  // degrees per second
}

interface Thread {
  mask: number;   // signal mask; 0 means no mask signal can cancel it
  body: Body;
  wait: { kind: "sleep"; frame: number } | { kind: "turn"; key: string } | null;
  alive: boolean;
}

interface Flags {
  leftArm: boolean;
  rightArm: boolean;
  isAiming: boolean;
}

interface TurnCmd {
  piece: string;
  axis: number;
  goal: number;        // degrees
  bakedSpeed: number;  // degrees per second, for a keyframe that lasts one frame
}

interface Keyframe {
  turns: TurnCmd[];
}

const ANIM_MIN = 2;    // frames per keyframe at the fastest
const ANIM_MAX = 8;    // frames per keyframe at the slowest

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

// Game frames for a sleep: round to the nearest frame, never less than one.
function framesFor(ms: number): number {
  return Math.max(1, Math.round(ms / FRAME_MS));
}

// Frames per keyframe from ground speed (units per second) and the unit's max speed.
function animFramesFor(speedPerSec: number, maxSpeed: number): number {
  const ref = maxSpeed + maxSpeed / (2 * 4);   // small headroom above max speed
  const v = Math.max(1, speedPerSec);
  return clamp((4 * ref) / v, ANIM_MIN, ANIM_MAX);
}

class Rig {
  frame = 0;
  private axles = new Map<string, Axle>();
  private threads: Thread[] = [];
  private current: Thread | null = null;

  // A new goal replaces the old one, as a new engine turn does.
  turn(piece: string, axis: number, goal: number, speed: number): void {
    const key = `${piece}:${axis}`;
    const a = this.axles.get(key) ?? { cur: 0, goal: 0, speed: 0 };
    a.goal = goal;
    a.speed = speed;
    this.axles.set(key, a);
  }

  setMask(mask: number): void {
    if (this.current) this.current.mask = mask;
  }

  // Start a body now. It inherits the mask of the thread that starts it.
  start(body: Body): void {
    const mask = this.current ? this.current.mask : 0;
    const t: Thread = { mask, body, wait: null, alive: true };
    this.threads.push(t);
    this.resume(t);
  }

  // Cancel every waiting thread whose mask shares a bit with the signal.
  // A running thread is not in a wait queue, so it is not cancelled (as in the donor).
  signal(mask: number): void {
    for (const t of this.threads) {
      if (t.alive && t.wait !== null && (t.mask & mask) !== 0) {
        t.alive = false;
        t.wait = null;
      }
    }
  }

  // One game frame: move the axles, then wake sleepers and turn-waiters whose time has come.
  tick(): void {
    this.frame += 1;
    const dt = FRAME_MS / 1000;
    for (const a of this.axles.values()) {
      const step = a.speed * dt;
      const d = a.goal - a.cur;
      a.cur = Math.abs(d) <= step ? a.goal : a.cur + Math.sign(d) * step;
    }
    for (const t of [...this.threads]) {   // copy: a body may start or signal threads while we wake
      if (!t.alive || t.wait === null) continue;
      const w = t.wait;
      const ready = w.kind === "sleep" ? this.frame >= w.frame : this.settled(w.key);
      if (ready) this.resume(t);
    }
    this.threads = this.threads.filter((t) => t.alive);
  }

  private settled(key: string): boolean {
    const a = this.axles.get(key);
    return a === undefined || a.cur === a.goal;
  }

  private resume(t: Thread): void {
    t.wait = null;
    const prev = this.current;
    this.current = t;
    const r = t.body.next();
    this.current = prev;
    if (r.done || !t.alive) {
      t.alive = false;
      return;
    }
    const c = r.value;
    t.wait = c.op === "sleepMs"
      ? { kind: "sleep", frame: this.frame + framesFor(c.ms) }
      : { kind: "turn", key: c.key };
  }
}

// Keyframe walk: each keyframe lasts k frames; its turns are stretched by k from the one-frame speed.
// The mask lets StopMoving cancel the walk at once. The check at each keyframe is a second, soft stop.
function* walkCycle(rig: Rig, clip: Keyframe[], isMoving: () => boolean, frames: () => number): Body {
  rig.setMask(SIG_WALK);
  while (isMoving()) {
    for (const kf of clip) {
      if (!isMoving()) return;
      const k = Math.round(frames());
      for (const t of kf.turns) {
        rig.turn(t.piece, t.axis, t.goal, t.bakedSpeed / k);
      }
      yield { op: "sleepMs", ms: FRAME_MS * k };
    }
  }
}

// Called when movement stops: cancels the walk thread (it holds SIG_WALK in this sketch).
function stopMoving(rig: Rig, moving: { on: boolean }): void {
  moving.on = false;
  rig.signal(SIG_WALK);
}

// Upper-body aim on its own thread. It cancels the previous aim and its pending restore.
function* aimWeapon(rig: Rig, flags: Flags, headingDeg: number): Body {
  rig.setMask(SIG_AIM);
  rig.signal(SIG_AIM);
  rig.turn("aimy1", 2, headingDeg, 300);
  flags.leftArm = false;
  flags.isAiming = true;
  rig.start(aimRestore(rig, flags));
}

// Hold the aim pose for three seconds, then return the arms. A new aim cancels this thread.
function* aimRestore(rig: Rig, flags: Flags): Body {
  rig.setMask(SIG_AIM);
  yield { op: "sleepMs", ms: 3000 };
  rig.turn("aimy1", 2, 0, 105);
  flags.rightArm = true;
  flags.leftArm = true;
  flags.isAiming = false;
}
```

## 5. Lands in

- TARGET `origins/client/hero-rig-states.ts` (new client module: lower-body walk, upper-body aim, their signal masks and speed-scaled keyframes; the engine never reads it). Parity-checklist row 6 (hero actor/animation).
- today: not read (Frankendom's hero rig is not part of this pass).
- Reuse tag: rewrite-from-idea (GPL v2 framework; the walk include is public domain; the sketch is clean-room and carries no donor lines)
- Brief rule served: one engine (aim and move state come from engine state; the rig only shows it)

## 6. Gaps and risks

- Frame conversion. The donor's `Sleep` floors `ms * 0.03030303` (`unit_script.lua` 382). On the VPS, `floor(132 * 0.03030303)` gives 3, not 4, and `floor(66 * 0.03030303)` gives 1, not 2. With `Sleep((33 * animSpeed) - 1)` the keyframe therefore holds `animSpeed - 1` frames: 1 at speed 2, 3 at 4, 7 at 8 (arithmetic, from the same constant). But each turn's speed is divided by `animSpeed`, so it is timed for `animSpeed` frames. If the engine's speed unit is per second (the code implies it; the engine was not read), each turn is still moving when the next keyframe overwrites its goal. This is arithmetic only; it has not been seen in a game. For Frankendom: convert ms to ticks with rounding, and derive the speed from the same tick count the sleep uses.
- Stop path. The walk has no signal mask, so `StopMoving`'s `Signal(SIG_WALK)` does not cancel it. The stop depends on the `bMoving` check at the next keyframe. `StopWalking` starts at once with mask 0, so for up to one keyframe two threads can write the same pieces. Not tested.
- Aim flag. `Restore` sets `isAiming = false` as its first statement (1288). `AimWeapon` calls `StartThread(Restore)` right after setting `isAiming = true` (1173, 1177), and a new thread runs at once (`unit_script.lua` 427-430). So `isAiming` reads false when `AimWeapon` returns. Its readers are the dance gate and the build gate (1041, 1066, 1076), and the speed poll. Do not copy this; the flag should clear when the hold ends.
- Right arm. `rightArm` is set true at 1109 and 1296 and is never set false in this file (grep). So the walk keeps driving the right arm during a laser aim, while the aim also sets `rloarm` and `ruparm` (1165-1166). Whether the aim wins on screen was not tested.
- Error handler. `RunOnError` calls `pcall(fun, err)` at line 264, where `err` is not yet in scope, so the handler gets nil. The armcom script does not use it. A port should pass the error explicitly.
- Engine dependence. `Turn`, `Move` and `WaitForTurn` semantics and the speed unit are the engine's and are not in this repo. Check the unit in the engine before porting any number.
- Licence. GPL v2 for the framework and the repo; `walk.lua` is public domain; the sketch is clean-room.
- Not read: the callin binding (`unit_script.lua` 470-694 and 714-861), most of `armcom_lus.lua` 160-630 (only the Frame 4 block and the loop shell were read), and `walk.lua` 124-417.

Reuse tag: rewrite-from-idea (GPL v2 framework; walk include public domain; clean-room)
Brief rule served: one engine (aim and move state come from engine state; the rig only shows it)
