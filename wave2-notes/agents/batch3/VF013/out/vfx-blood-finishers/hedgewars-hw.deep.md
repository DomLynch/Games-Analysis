# hedgewars-hw (vfx-blood-finishers, cell 1)

Donor: `/mnt/frankendom-donors/hedgewars-hw/hedgewars/uVisualGearsHandlers.pas` (with `uWorld.pas`, `uGearsUtils.pas`, `hwengine.pas`) | Licence: GPL version 2 (header of uWorld.pas and uVisualGearsHandlers.pas: "version 2 of the License"; /mnt/frankendom-donors/hedgewars-hw/COPYING is GPL v2) | Pascal | symbol `doStepBigExplosionWork` + `ShakeCamera`

Checked: camera_scope: world camera. Read in full: `doStepBigExplosion` and `doStepBigExplosionWork` (uVisualGearsHandlers.pas 846-859, 861-887), `ShakeCamera` (uWorld.pas 2143-2149), the timer loop that feeds Lag (hwengine.pas 72-77, 127, 325-327), and the WorldDx writers (grep of all `WorldDx :=` in the engine). Read in part: `MoveCamera` (uWorld.pas 1943-2067, the follow and edge branches; the wrap branch only partly). Not read: the explosion damage path (`doMakeExplosion` body, `AmmoShove`), the sprite drawing of `vgtBigExplosion`, and which RTL unit binds the bare `random` used in ShakeCamera. Confidence: high on the shake code and its timing; medium on the claim that the shake offset is never pulled back (no restore code path found; not run in a game).
Best transferable idea: After a heavy blast, offset the drawn camera by a random jitter whose size falls over a short window and is replaced each interval, so the shake dies out on its own while the follow position is never written.
Decision (proposed): adapt - keep the decaying-jitter idea for heavy impacts (row 10) on the world camera; fix the donor's accumulated offset (it is never reset to its base) and its frame-gated cadence.
Acceptance: A client test after a heavy impact shows the drawn camera offset inside the amplitude curve (13 px at 0 ms falling to 1 px at 200 ms, times zoom/2, floor 1) and exactly 0 by 250 ms, and the follow base position is identical to a run with shake off.

## 1. Mechanism

- Trigger: an explosion whose radius is above 50 creates `vgtBigExplosion` (uGearsUtils.pas 120); radius 11-50 creates the small `vgtExplosion` (121). The explosion's own damage path is not read.
- Spawn step, once (`doStepBigExplosion`, uVisualGearsHandlers.pas 861-887): one smoke ring (871), 47 fire gears (872-880, each with `gstTmpFlag`), 16 `vgtExplPart` and 16 `vgtExplPart2` particle gears (881-884). Then it sets the step to `doStepBigExplosionWork` (885) and runs that once more if Steps > 1 (886-887). On mobile it also fires a vibration (not read in detail).
- Clock: the engine loop calls `DoTimer(CurrTime - PrevTime)` only when at least `cTimerInterval` = 8 ms have passed (hwengine.pas 325-327; uVariables.pas 2732). So `Lag` is a variable number of milliseconds. `DoTimer` adds it to `RealTicks` (hwengine.pas 77), runs the game step, and then `ProcessVisualGears(Lag)` (hwengine.pas 127). That calls `doStep(Gear, Steps)` on every visual gear (uVisualGears.pas 82). So `Steps` is the elapsed milliseconds for that frame, not a fixed tick.
- Each visual step (`doStepBigExplosionWork`, uVisualGearsHandlers.pas 846-859), in order: (a) `Timer += Steps` (850). (b) Only if `(Timer and 5) = 0` (851), it computes `maxMovement = max(1, 13 - (Timer * 15) div 250)` (853) and calls `ShakeCamera(maxMovement)` (854). (c) If `Timer > 250` (857), the gear is deleted.
- `ShakeCamera` (uWorld.pas 2143-2149): returns at once if the aim cursor is visible (2145). Otherwise `amount = max(1, round(amount * zoom / 2))` (2147), then `WorldDx` gets `- amount + random(1 + 2*amount)` (2148), and the same for `WorldDy` (2149). So each call changes `WorldDx` by a random amount in -amount..+amount, relative to its previous value. It never resets `WorldDx` to a base value.
- The camera is drawn with `openglTranslatef(WorldDx, WorldDy, 0)` (uGearsRender.pas 83), so `WorldDx`/`WorldDy` is the whole camera offset.
- What happens after: the shake code adds a random change to `WorldDx` and never resets it. The writers of `WorldDx` in the code I read are: init (uWorld.pas 246), `CameraBounds` clamps (889-909), the wrap shifts (1172-1177, 1987-1989), the follow-edge pushes (2031, 2037), the pan when not following (2057), and the shake itself (2148). `MoveCamera` eases `CursorPoint` 1/8 toward the follow target each call (1962, 1975), and that target includes `WorldDx` (1962). `WorldDx` changes only when `CursorPoint` crosses the edge band (2031, 2037). So with the camera following, nothing I read pulls a mid-screen jitter back to zero. This is the defect noted in section 6. (Not run in a game: I did not play it.)

## 2. Key functions

- `doStepBigExplosion`: `/mnt/frankendom-donors/hedgewars-hw/hedgewars/uVisualGearsHandlers.pas` 861-889 (spawn; read in full).
- `doStepBigExplosionWork`: `/mnt/frankendom-donors/hedgewars-hw/hedgewars/uVisualGearsHandlers.pas` 846-859 (the timer, the gate, the amplitude, the call, the delete).
- `ShakeCamera`: `/mnt/frankendom-donors/hedgewars-hw/hedgewars/uWorld.pas` 2143-2149 (zoom scale, additive random offset on both axes, cursor-visible exit). The only caller is uVisualGearsHandlers.pas 854 (checked with grep of the whole engine).
- Clock: `/mnt/frankendom-donors/hedgewars-hw/hedgewars/hwengine.pas` 72-77 (`DoTimer(Lag)`), 325-327 (8 ms gate, `CurrTime - PrevTime`), 127 (`ProcessVisualGears(Lag)`). Step loop: `/mnt/frankendom-donors/hedgewars-hw/hedgewars/uVisualGears.pas` 68-82.
- Follow and edge logic (read in part): `/mnt/frankendom-donors/hedgewars-hw/hedgewars/uWorld.pas` 1943-2067.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Shake amplitude starts high and falls linearly to a small floor over a fixed window | 13 px at Timer 0 (theirs, uVisualGearsHandlers.pas 853); slope 15 per 250 ms with integer division (853); floor 1 (853 and uWorld.pas 2147). The floor is reached at Timer 200 (13 - 12 = 1) and stays at 1 until the gear is deleted at Timer > 250 (857). |
| Shake scaled by camera zoom | `round(amount * zoom / 2)` (theirs, uWorld.pas 2147). At zoom 1 the start is about 6-7 px; the rounding mode was not checked. |
| Random jitter in -a..+a per axis | `random(1 + 2*amount)` minus `amount` (theirs, uWorld.pas 2148-2149). The RNG binding was not confirmed (see section 6). |
| Cadence of the jitter | Donor: "Timer and 5 = 0" (851), which depends on the accumulated millisecond count, not on the frame count. Fix in the sketch: a 16 ms accumulator (a choice, not a donor constant). |
| Duration | 250 (theirs, 857). |
| Explosion size picks the visual | Radius > 50 gives the big one (120); radius > 10 gives the small one (121). |
| Big-explosion particle counts | 47 fire, 16 + 16 particles, 1 smoke ring (theirs, 871-884). |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's amplitude curve (13 px falling to a 1 px floor over 250 ms, scaled by zoom/2) and the random jitter in -a..+a on both axes. It changes three things: (1) the jitter is replaced at each interval and goes to 0 at the end, instead of accumulating into the camera offset; (2) the cadence is a fixed 16 ms accumulator, not the donor's `Timer and 5 = 0` test on the step count; (3) the offset is kept apart from the follow base, so the base is never written. It omits the explosion spawns (smoke ring, fire, particles), the mobile vibration, the explosion damage, and the sprite drawing. The cursor-visible skip is kept as a flag, but the sketch still advances the timer while skipping, as the donor does. Math.round may differ from the donor's round on exact .5 values (the donor's rounding mode was not checked).

```ts
// clean-room sketch from the described mechanism (donor is GPL v2; not a translation)
// Times in ms. The donor's Timer is in ms (hwengine.pas step = SDL ticks delta).
const SHAKE_MS = 250;        // donor: the explosion gear is deleted when Timer > 250
const START_PX = 13;         // donor: amount = 13 - (Timer * 15) div 250, floor 1
const MIN_PX = 1;
const JITTER_EVERY_MS = 16;  // fix: fixed-interval accumulator (donor gates on Timer and 5 = 0)

interface Shake {
  ms: number;   // elapsed ms since the impact, clamped to SHAKE_MS
  acc: number;  // ms since the last jitter draw
  offX: number; // replaced on each draw, never accumulated
  offY: number;
}

export function newShake(): Shake {
  return { ms: 0, acc: 0, offX: 0, offY: 0 };
}

// Amplitude in px at an elapsed time, scaled by zoom (donor: round(amount * zoom / 2), floor 1).
export function amplitudePx(ms: number, zoom: number): number {
  const base = Math.max(MIN_PX, START_PX - Math.floor((ms * 15) / 250));
  return Math.max(MIN_PX, Math.round((base * zoom) / 2));
}

// Advance by dtMs. allowed = false while the aim cursor is visible (donor skips the jitter then).
export function stepShake(s: Shake, dtMs: number, zoom: number, allowed: boolean, rng: () => number): void {
  if (s.ms >= SHAKE_MS) { s.offX = 0; s.offY = 0; return; }
  s.ms = Math.min(SHAKE_MS, s.ms + dtMs);
  s.acc += dtMs;
  if (s.acc >= JITTER_EVERY_MS) {
    s.acc -= JITTER_EVERY_MS; // one draw per call even if dtMs spans several intervals
    if (allowed) {
      const a = amplitudePx(s.ms, zoom);
      s.offX = -a + Math.floor(rng() * (2 * a + 1));
      s.offY = -a + Math.floor(rng() * (2 * a + 1));
    } else {
      s.offX = 0;
      s.offY = 0;
    }
  }
  if (s.ms >= SHAKE_MS) { s.offX = 0; s.offY = 0; }
}

// The camera is drawn at base + offset. The follow base is never written by the shake.
export function drawnCamera(baseX: number, baseY: number, s: Shake): { x: number; y: number } {
  return { x: baseX + s.offX, y: baseY + s.offY };
}

export {};
```

## 5. Lands in

- TARGET `src/fight/impact.ts` (new module): the engine emits one impact event per heavy hit or blast (tick, radius, source id); the shake state (`Shake`) and the offset are client-only and live in the world camera. The Pit camera is frozen, so the shake is off there.
- Parity-checklist row 10 (hit impact / hitstop).
- Reuse tag: rewrite-from-idea (GPL v2, clean-room only; no code copied)
- Brief rule served: 1 (one engine emits the event; camera is client-only; the shake never touches the ledger or the kill check)

## 6. Gaps and risks

- GPL v2 (COPYING and file headers): clean-room only. The sketch was written from the described mechanism.
- Defect 1, accumulated offset: the donor applies each jitter as a change to `WorldDx` (uWorld.pas 2148-2149) and never resets it to its base value. Nothing I read restores it, so the camera can stay off-centre after the shake. Fix: keep a separate shake offset that is replaced each interval and goes to 0 at the end (sketch `stepShake`).
- Defect 2, frame-gated cadence: `(Timer and 5) = 0` (uVisualGearsHandlers.pas 851) is tested once per call on a Timer that grows by the frame's millisecond count (hwengine.pas 327; uVisualGears.pas 82). Whether a frame shakes depends on the low bits of the accumulated ms, so the cadence follows frame timing. Fix: a 16 ms accumulator (a fix choice).
- Defect 3, follow is per drawn frame: `MoveCamera` is called from `DrawWorld` (uWorld.pas 937) and eases by 1/8 per call (1975). That makes the follow frame-rate dependent. Not fixed here; relevant to the world-camera cells, not to the shake.
- The random source: `random` at uWorld.pas 2148 is not the seeded `GetRandom` in uRandom.pas 35 (uWorld.pas 23 uses uRandom). I did not confirm which RTL unit binds `random`. Frankendom should not depend on the jitter being deterministic.
- Aim leak: `WorldDx` also feeds the aim point sent over IPC (uWorld.pas 2017), and the shake skips when the cursor is visible (2145), so the aim does not pick up the shake. Frankendom must keep the shake out of hit and kill checks; kills are server-verified.
- Not written as a note, observed in the same donor: the hedgehog death sequence (uGearsHedgehog.pas 660-702). It sets a 6 x 200 timer (662), spawns the death explosion and a gravestone, then plays a voice line. It is a candidate for row 17 (death/respawn), not for this cell.
- Not read: the explosion damage path, the `vgtBigExplosion` drawing, and the WorldDx wrap branch in full.
