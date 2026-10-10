# hedgewars-hw (animation-rigs, cell 3)

Donor: `/mnt/frankendom-donors/hedgewars-hw/share/hedgewars/Data/Scripts/Animate.lua` (with `/mnt/frankendom-donors/hedgewars-hw/hedgewars/uGearsRender.pas` and `/mnt/frankendom-donors/hedgewars-hw/hedgewars/uGearsHedgehog.pas`) | Licence: GPL-2.0 (`Animate.lua` has no header of its own; the repository `COPYING` is the GPL v2 text; the engine files read say "version 2 of the License") | Lua, Object Pascal | symbols `Animate`, `ShowAnimation`, `AnimJump`, `CheckEvents`, `RemoveEvent`, `DrawHH`

Checked: Read in full: `share/hedgewars/Data/Scripts/Animate.lua` (444 lines). Read the relevant spans of `hedgewars/uGearsRender.pas` (176-190, 405-430, 1066-1090, 1193-1205, and the draw cases at 1494-1545 and 1560-1575 only in part). `hedgewars/uGearsHedgehog.pas`, `rust/lib-hwengine-future/src/gear.rs`, and the mission scripts that call `AnimInit`/`AddEvent` (for example `Missions/Campaign/A_Space_Adventure/desert01.lua`) were searched with grep, not read in full. Not read: the engine side of the cinematic message bits beyond the grep hits, `FollowGear`, `SwitchHog` and `SetTurnTimeLeft` (engine functions called from Lua), and the call order between `CheckEvents` and `ShowAnimation` in the engine loop. Confidence: high on the sequencer order of operations (read in full); medium on the topic fit (see below); the two index and OR findings are read by hand and were not run. camera_scope: not applicable.

Topic fit, stated plainly: this is a cutscene/beat sequencer, not a skeleton, clip-blend or IK system. It moves gears (position, velocity, input message bits) and waits. It is a state machine over scripted actions, which is inside the topic's "state machines" item; the hit-reaction and attachment parts of the topic are covered only as small side findings (section 6).

Best transferable idea: One sequencer for scripted beats: each step returns done or retry, a shared wait gate counts down once per tick, the input is locked while a beat plays, and a skip runs the beat's final state once.

Decision (proposed): adapt. Keep the step-until-done loop, the shared wait gate, the input lock and the skip. Drop the direct writes to gear position, velocity and message bits, so a beat moves only the presentation rig. Use stable watch ids instead of list indices.

Acceptance: In the Pit, a finisher beat runs its steps in order (strike, a hold, recover). Skip ends the beat in one frame in its final pose. During the beat, move and attack inputs are ignored on the client while the server fight clock keeps running. A test removes an earlier watch during a pass and asserts that no other watch is skipped or removed.

## 1. Mechanism

- Lists and reset. `AnimInit` clears the beat list, the event list, the skip table and the wait (`Animate.lua:83-108`). `AddAnim` appends a beat, and the first beat clears the skip flag (312-318).
- Per-tick driver. `ShowAnimation` (320-331): with no beat queued, it clears the skip flag and returns. Otherwise it holds the turn timer at `MAX_TURN_TIME` (325), runs `Animate` on the first beat (326), and removes the beat when `Animate` returns true (327-328).
- One attempt per call, `Animate(steps)` (333-363), in this order: (a) if skipping, reset the step index, unlock input, run the beat's skip function, return true (334-339). (b) If the shared wait is not zero, return false (341-343). (c) If the step index is past the end, reset, unlock, return true (345-349). (d) If the step's actor (`args[1]`) is not the current hog, the step is not `AnimWait`, and its `swh` flag is not false, switch to that hog (351-354). `AnimSwitchHog` also calls `FollowGear` (110-115), so the camera follows the acting hog. (e) Lock input (356). (f) Run the step; advance the index only when it returns something other than false (357-360). Return false (362).
- Shared wait gate. Waits add to one global value: `AnimWait` (141-144), and every step that waits (`AnimGearWait`, `AnimSound`, `AnimSay`, `AnimCaption`) goes through it. Two waits add up; they do not replace each other. `AnimUnWait` subtracts `animSpeed` (1) per call and stops at zero (132-139). The header comment says it runs "usually every game tick" (13-15).
- Input lock. `startCinemaLock` clears the action bits in the base input mask (66-70; the bit list is on line 68) and `stopCinemaLock` restores all bits (72-76). `AnimSetInputMask` ANDs an extra mask on top (78-81; `updateInputMask` 62-64).
- Steps. `AnimMove` (178-197) sets a move message on each call and counts calls in `moveTime`. It is done when the gear's x equals the target x or its y equals the target y (189), or when the count passes `maxMoveTime`, in which case it snaps to the target (182-188). `AnimJump` (199-226) is a small state machine: on the first call it records the position, sets the jump message and waits `jumpTimes[type]`. A back jump gets one more impulse with its own wait (207-210). Later calls poll: if the position has not changed since the last poll, the jump is done and it waits 100 (214-218); otherwise it records the position, waits 100 and returns false (219-223). `AnimTeleportGear` (258-269) and `AnimOutOfNowhere` (246-256) spawn effects, set the position, and wait 50.
- Skip table. `AddSkipFunction` keys one function and its arguments by beat (20-22); `SkipAnimation` calls it (36-42).
- Watch list. `AddEvent` appends `{cFunc, cArgs, dFunc, dArgs, evType}` (367-375). `CheckEvents` (414-432) walks the list by index: it sets `curEvent = i` (417), runs the condition (418), and if it is true runs the action (419). If `needToDecrease` is positive it moves `i` back by that amount (420-423). If the entry's `evType` is not 1, the entry is removed and `i` steps back (424-427). So type 1 is persistent and every other type is one-shot. `RemoveEvent` (389-400) is the index bookkeeping used when an action removes another entry; it is covered in section 6.

## 2. Key functions

- `Animate`: `/mnt/frankendom-donors/hedgewars-hw/share/hedgewars/Data/Scripts/Animate.lua` 333-363. Skip, wait gate, end of list, actor switch, lock, step, advance.
- `ShowAnimation`: `Animate.lua` 320-331. Per-tick driver; holds the turn timer.
- `AnimUnWait` and `AnimWait`: `Animate.lua` 132-144. The shared wait.
- `AnimJump`: `Animate.lua` 199-226. Impulse, optional back impulse, landing poll.
- `AnimMove`: `Animate.lua` 178-197. Move-until-target with a max-time snap.
- `CheckEvents` and `RemoveEvent`: `Animate.lua` 389-432. Watch list with persistent and one-shot entries.
- `DrawHH` (hedgehog draw): `/mnt/frankendom-donors/hedgewars-hw/hedgewars/uGearsRender.pas` 405-430 and 1066-1205. Death layers, idle frame, held weapon.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant or rule |
|---|---|
| Wait gate counts down per tick, floor at zero | `animSpeed = 1` (Animate.lua:16); count per `AnimUnWait` call (134) |
| Jump waits by type | long 500, high 500, back 300, back-back 500 (`Animate.lua:87`), in the gate's units |
| Landing poll interval | 100 (217, 222) |
| Teleport and sudden-appearance hold | 50 (254, 267) |
| Fall after a placed move | velocity (0, 10) (231) |
| Turn timer held during a beat | `MAX_TURN_TIME` (325) |
| Idle hedgehog frame | `(RealTicks div 128 + Gear^.Pos) mod 19` (uGearsRender.pas:1082); 19 frames, 128 per frame if `RealTicks` is ms (units not checked) |
| Death drawn as two layers | second layer tinted with the clan colour and offset by 8 in the frame index (uGearsRender.pas:422-424) |

## 4. TypeScript sketch

simplified: The sketch keeps the donor's order: skip, wait gate, end of list, step, advance on done. It omits the Lua API and the gear writes, the automatic actor switch and camera follow (`AnimSwitchHog`), the extra input mask, the move step, the spawn effects, and the dedupe in `AddNewEvent`. The one deliberate change is the watch list: the sketch removes by stable id and skips an entry removed earlier in the same pass, where the donor shifts an index (section 6). Skip is one function per beat, as in the donor, and the jump step is a closure over the position and impulse functions.

```ts
// Licence: GPL-2.0 (donor; Animate.lua has no header of its own, the repository COPYING is GPL v2). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

type JumpKind = "long" | "high" | "back";

// Donor convention: a step returns true when finished and false to be retried on a later tick.
interface Step {
  run: () => boolean;
}

interface Watch {
  id: number;                 // stable id: removals never shift which entry another removal hits
  when: () => boolean;
  then: () => void;
  persistent: boolean;        // persistent watches stay after they fire; one-shot watches are removed
}

// Donor waits (in ticks) for a jump type, and the back-jump second impulse.
const JUMP_WAIT: Record<JumpKind | "backback", number> = { long: 500, high: 500, back: 300, backback: 500 };
const LAND_POLL_TICKS = 100;

class BeatSequencer {
  private steps: Step[] = [];
  private pos = 0;
  private waitTicks = 0;      // global wait, shared by all steps
  private locked = false;     // input lock while a beat plays
  private onSkip: (() => void) | null = null;
  private watches: Watch[] = [];
  private nextId = 1;
  readonly animSpeed = 1;     // ticks removed per unWait() call

  start(steps: Step[], onSkip: (() => void) | null): void {
    this.steps = steps;
    this.onSkip = onSkip;
    this.pos = 0;
    this.locked = true;
  }

  isLocked(): boolean { return this.locked; }

  // Called once per game tick.
  unWait(): void {
    if (this.waitTicks > 0) this.waitTicks = Math.max(0, this.waitTicks - this.animSpeed);
  }

  wait(ticks: number): void { this.waitTicks += ticks; }

  // One attempt at the current step; advance only when it reports done.
  tick(): boolean {
    if (this.waitTicks > 0) return false;
    if (this.pos >= this.steps.length) {
      this.pos = 0;
      this.locked = false;
      return true;
    }
    if (this.steps[this.pos].run()) this.pos += 1;
    return false;
  }

  // Skip: run the beat's own final-state function once, then end the beat.
  skip(): void {
    if (this.onSkip) this.onSkip();
    this.pos = 0;
    this.waitTicks = 0;
    this.locked = false;
  }

  addWatch(when: () => boolean, then: () => void, persistent: boolean): number {
    const id = this.nextId++;
    this.watches.push({ id, when, then, persistent });
    return id;
  }

  removeWatch(id: number): void {
    this.watches = this.watches.filter(w => w.id !== id);
  }

  // Scan a snapshot. An entry removed earlier in the same pass is skipped, not reindexed.
  checkWatches(): void {
    for (const w of [...this.watches]) {
      if (!this.watches.some(x => x.id === w.id)) continue;
      if (w.when()) {
        w.then();
        if (!w.persistent) this.removeWatch(w.id);
      }
    }
  }
}

// Jump step: an impulse, an optional second impulse for a back jump, then poll until the position stops changing.
function jumpStep(
  kind: JumpKind,
  pos: () => [number, number],
  impulse: (k: JumpKind) => void,
  seq: BeatSequencer,
): Step {
  let started = false;
  let backJumped = false;
  let lastX = 0;
  let lastY = 0;
  return {
    run: (): boolean => {
      if (!started) {
        [lastX, lastY] = pos();
        backJumped = false;
        started = true;
        impulse(kind);
        seq.wait(JUMP_WAIT[kind]);
        return false;
      }
      if (kind === "back" && !backJumped) {
        backJumped = true;
        impulse("back");
        seq.wait(JUMP_WAIT.backback);
        return false;
      }
      const [x, y] = pos();
      if (x === lastX && y === lastY) {
        started = false;
        backJumped = false;
        seq.wait(LAND_POLL_TICKS);
        return true;
      }
      lastX = x;
      lastY = y;
      seq.wait(LAND_POLL_TICKS);
      return false;
    },
  };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `/tmp/hedgewars-hw-beat-sequencer.ts`; local copy in `work/hedgewars-hw-beat-sequencer.ts`).

## 5. Lands in

- TARGET `src/fight/beats.ts` (new, client-only): the beat sequencer for scripted presentation (finisher beats, intros). It sends no damage, no state change and no input to the server.
- Parity row 6 (hero actor/animation). Finisher beats are the consumer under row 9; the sequencer itself is row 6.
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
- Brief rule served: 1 (one engine: the beat moves only the client rig; the server keeps the fight clock and the state)

## 6. Gaps and risks

- GPL-2.0: clean-room only. The sketch is written from the mechanism.
- Watch-list index bug (hand-traced, not run). `RemoveEvent` returns early when the removed entry exists and sits below `curEvent` (`Animate.lua:393-395`), so `needToDecrease` is not raised on that path. The increment at 397-399 is reached only when the entry is missing. `CheckEvents` ignores the return value of `RemoveEvent`, so when an action removes an earlier entry, `i` is not moved back (420-421). The loop then skips the next entry, and the one-shot removal at 424-425 can remove the wrong entry. Frankendom must use stable ids (the sketch does), and needs a test for this case.
- Dedupe compares the wrong entry (hand-traced). `AddNewEvent` compares `stageEvents[seNum].evType` (`Animate.lua:382`), the last entry's type, not the candidate's type. Duplicate checks can be wrong when the last entry differs in type.
- Move step (hand-traced, not run). The done test is an OR of the two axes (`Animate.lua:189`). A move whose start already shares the target's row or column returns true on its first call without moving. Frankendom needs a distance test on the move, not an axis test.
- No per-step timeout. `AnimJump` has no maximum time and `Animate` has no per-step timeout. A jump against a wall reads as landed when the position stays unchanged (214), and a step that never returns true blocks the beat until skip. Frankendom needs a timeout on every beat step.
- Beats write game state. The move and jump steps set gear positions, velocities and message bits (`AnimSetGearPosition` 228-234; `AnimMove` 180-194). Under Frankendom's one-engine and server-verified rulings the beat must not write positions. It should drive only the rig, and the server state changes come from the engine.
- Input lock vs server clock. A beat masks the action bits (68) and holds the turn timer at max (325). Frankendom must lock input on the client only and keep the server's fight clock running.
- Camera follows the acting hog (`AnimSwitchHog`, 110-115). That is a camera rule in the donor. Frankendom's camera is client-only, so the rule belongs in the camera module, not the sequencer. Not a camera-cell finding.
- Attachment points (side finding, partly read). The held weapon is drawn at per-weapon offsets and pivots written in code: baseball at (9, 2) with pivot (-8, 1) (`uGearsRender.pas:1202-1203`), minigun at (20, 4) with pivot (-18, -2) (1204-1205 read as the case header and the next line only). The weapon is hidden while the hog is attacked (182-183, 1197). Frankendom should keep these offsets as weapon-catalogue data (row 15 gear dressing), not as code cases.
- Hit reaction (side finding). No flinch clip or hit-reaction animation was found in the files read. `gstAttacked` only hides the held weapon.
- Idle phase (side finding, not established). The idle frame uses `Gear^.Pos` as a phase (`uGearsRender.pas:1082`). Where `Pos` gets its starting value was not traced (`uGearsHedgehog.pas:697` and `:743` set it to 0 in some transitions). Do not assume per-unit phase offsets without checking.
- Death (side finding). The death sprite is drawn twice, with the second layer tinted by clan colour and offset by 8 frames (`uGearsRender.pas:420-426`). Relevant to row 17 (death), not this cell.

Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
Brief rule served: 1 (one engine; the beat is client presentation and never writes server state)
