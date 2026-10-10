# OpenTTD-OpenTTD (vfx-blood-finishers, cell 13)

Donor: `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/effectvehicle.cpp` | Licence: GPL-2.0 (`COPYING.md` is GNU GPL version 2, June 1991; the file header says "version 2", not "or later") | C++ | symbol `BubbleTick`

Checked: Cell 13 = category_no in cells-VF004.tsv. Not a camera cell. The file is about environment and vehicle effects (smoke, sparks, explosions, breakdown smoke, a bulldozer, bubbles from a bubble generator industry). It has no blood, wound, decal or gore code: grep for blood, gore, wound, decal, hitstop and finisher over `src/` found nothing relevant. The only transferable piece is the bubble's scripted beat list with end codes. Read in full: effectvehicle.cpp 1-300 (IncrementSprite and the smoke, spark, explosion and breakdown init and tick functions), 327-345, 344-474 (all bubble movement tables; 400-454 read as a sequence of beat rows, not row by row), 475-660 (BubbleTick 485-541, EffectProcs table 559-582, CreateEffectVehicle, CreateEffectVehicleAbove, CreateEffectVehicleRel, EffectVehicle::Tick). Read in part: industry_cmd.cpp 822-840 (the spawn helper that ends at 836; its name and caller not read). Candidates opened: effectvehicle.cpp (main), industry_cmd.cpp (the only writer of `animation_substate` found by grep, line 835), effectvehicle_base.h (field declaration, line 26), core/random_func.hpp (`Chance16I`), disaster_vehicle.cpp and aircraft_cmd.cpp only by grep (callers of CreateEffectVehicleRel). Not read: BulldozerTick body (effectvehicle.cpp 300-326), the sprite id constants (`SPR_BUBBLE_GENERATE_*`, `SPR_BUBBLE_0`), `_bubble_spawn_location`, the caller of `EffectVehicle::Tick` (the game-tick rate is not read), and the other spawn sites. Confidence: high on the bubble beat logic and its numbers (read and receipted); medium on the generator phase (only the threshold line is receipted).

## 1. Mechanism

- A bubble is a small effect entity that plays a script. Each script is a fixed list of beats. A beat is `{x, y, z, image}`: a move in x, y and z plus a sprite image. Two special beats are end markers (`ME(code)` = `{code, 4, 0, 0}`, so y = 4 and the code is in x): code 0 removes the bubble, code 1 is a float cycle end, code 2 is an event that does not stop the script (342, 508-539).
- Spawn (industry_cmd.cpp 826-835): the bubble generator picks `dir = Random() & 3` and creates the effect above the tile at a spawn offset for that direction, then stores `dir` in `animation_substate`. The enclosing helper is not named here.
- Start (effectvehicle.cpp 485-508): the first phase runs the generator sprite (`sprite` increments per acted step until it reaches `SPR_BUBBLE_GENERATE_3`, line 494). After that the path is chosen once: if `animation_substate != 0`, the bubble floats in a random direction `GB(Random(), 0, 2) + 1` (1 to 4) (498-499); otherwise it takes the absorb path (spritenum 6, 501). So dir 0 (one in four) is absorbed; the other three in four float in a direction that is rolled again (the spawn dir only decides float versus absorb).
- Timing: the step runs once per 4 ticks: `progress++` every tick, and the beat is taken only when `(progress & 3) == 0` (489-490). The effect's tick is called through `EffectVehicle::Tick` and the per-type table `_effect_procs` (642-644, 580). The caller of `Tick` and the game-tick rate are not read.
- Beat loop (508-539). Order as the code runs for one acted step: read `b` at `animation_state + 1` (505, 508); end code 0 returns false, so the bubble is deleted (510-513); end code 1 (515-521): if `z_pos > 180` or `Chance16I(1, 96, Random())`, switch to the burst script (517); in both cases `anim_state` becomes 0 and the beat at 0 is taken; end code 2 (523-531): play the success sound, check the industry tile for the catcher, and advance `anim_state` by one before applying the next beat; then store `animation_state` (533), re-read `b` (534), add the beat's deltas to x, y and z (536-538) and set the sprite image (539).
- The scripts (344-470): four float scripts of four beats (`_bubble_float_sw`, `_ne`, `_se`, `_nw`, 344-374). Each float beat rises by 1 in z, two of them also drift 1 in x or y, and the cycle ends with `ME(1)` (349, 358, 366, 374). Burst (377-382): four beats that rise by 1 with images 2, 7, 8, 9, then `ME(0)`. Absorb (385-470): a wobble that rises by 1 per beat, then a fast drift (x 1 or 2, y 1, z 3; rows from 448), then a slower segment (rows from 455), then `ME(2)` (464), then five image-only beats (0xA to 0xE, no motion) and `ME(0)` (470).
- Chance: at each float cycle end the bubble bursts with probability about 1 in 96 (`Chance16I(1, 96, r)`, core/random_func.hpp 126-129), or at once if its absolute z is above 180 (516). Because z is absolute (the map height plus the spawn offset, from `CreateEffectVehicleAbove`), a bubble born on high ground reaches the cut-off sooner.

## 2. Key functions

- `BubbleTick`: `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/effectvehicle.cpp` 485-541. The whole beat loop; read end to end.
- `BubbleInit`: same file, 327-332. Sets the generator sprite, `spritenum = 0`, `progress = 0`.
- Movement tables and the end-marker macro: same file, 342 (`ME`), 344-470 (tables), 475-482 (`_bubble_movement`, indexed by `spritenum - 1`).
- Dispatch: same file, 570-582 (`_effect_procs`, the bubble row at 580) and 642-644 (`EffectVehicle::Tick`).
- Spawn with direction: `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/industry_cmd.cpp` 826-835.
- Creation helpers: same file, `CreateEffectVehicle` 593 (sets z absolute), `CreateEffectVehicleAbove` 621 (adds the slope height to the offset), `CreateEffectVehicleRel` 637 (used by aircraft and disaster code).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Scripted beat list: each beat moves and sets an image | Beats are data: 4 per float cycle, 4 per burst, a longer absorb list (344-470) |
| End codes: 0 remove, 1 loop-or-branch, 2 event then carry on | 0 at 342 (`ME(0)`), 1 at 349, 2 at 464 |
| Acting every N ticks (`progress & 3`) | Step of 4 ticks (489-490) |
| Random branch with a chance per cycle | 1 in 96 (`Chance16I(1, 96, ...)`, 516) |
| Height cut-off on an absolute height | 180 (516) |
| Random spawn split (1 in 4 absorbed) | `Random() & 3` (826); 0 means absorb (501) |
| Rise per beat | +1 in z per float and burst beat; +3 in the absorb drift (rows 448-452) |

The rise values are read from the table rows (for example `MK(0, 0, 1, 0)` and `MK(2, 1, 3, 0)`); the table rows are not each receipted.

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order for one acted step (end code 0 removes; end code 1 may switch to the burst script and loops the float from beat 0; end code 2 fires the event and moves on to the next beat; then the beat's deltas and image are applied). It uses one absolute `z` and a `rand` function. It leaves out the generator sprite phase (the `spritenum == 0` branch, lines 492-507), the sprite ids, the sound calls and their client setting, the industry-tile catcher check (530), the animation-tile hook, the `Chance16I` 16-bit arithmetic beyond the threshold test, the transparency option, and the spawn-offset table. The beat tables are supplied by the caller, not copied from the donor. `export {}` is appended only for the typecheck. Typecheck: `tsc --noEmit --strict --target es2020` passed on the VPS.

```ts
// Licence: GPL-2.0 (donor, version 2). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Beat =
  | { kind: 'move'; dx: number; dy: number; dz: number; image: number }
  | { kind: 'end'; code: 0 | 1 | 2 };   // 0 = remove, 1 = float cycle end (maybe burst), 2 = event, then carry on

interface Scripts {
  floats: Beat[][];   // four float directions; each ends with an end-1 beat
  burst: Beat[];      // ends with an end-0 beat
  absorb: Beat[];     // wobble, one end-2 event, a short tail, ends with end-0
}

interface Effect {
  script: Beat[];
  pc: number;          // index of the last beat played (-1 before the first)
  x: number; y: number; z: number;   // z is absolute, as in the donor
  image: number;
  progress: number;    // ticks since spawn
}

const STEP_TICKS = 4;        // a beat is taken every 4 ticks
const BURST_HEIGHT = 180;    // absolute z above which a float bursts

// spawnDir 0 takes the absorb path; any other value floats in a random one of four directions.
function startEffect(sc: Scripts, spawnDir: number, x: number, y: number, z: number, rand: () => number): Effect {
  const script = spawnDir !== 0 ? sc.floats[rand() & 3] : sc.absorb;
  return { script, pc: -1, x, y, z, image: 0, progress: 0 };
}

// One tick. Returns false when the effect is gone.
function tickEffect(e: Effect, sc: Scripts, rand: () => number, onEvent: (code: 2) => void): boolean {
  e.progress += 1;
  if ((e.progress & (STEP_TICKS - 1)) !== 0) return true;

  let idx = e.pc + 1;
  let beat = e.script[idx];
  if (beat.kind === 'end' && beat.code === 0) return false;

  if (beat.kind === 'end' && beat.code === 1) {
    // float cycle end: burst if too high, or on a roll of about 1 in 96; otherwise loop the float
    const roll = rand() & 0xffff;
    if (e.z > BURST_HEIGHT || ((roll * 96 + 48) >>> 16) < 1) e.script = sc.burst;
    idx = 0;
    beat = e.script[idx];
  } else if (beat.kind === 'end' && beat.code === 2) {
    onEvent(2);
    idx += 1;
    beat = e.script[idx];
  }

  if (beat.kind !== 'move') return false;
  e.pc = idx;
  e.x += beat.dx;
  e.y += beat.dy;
  e.z += beat.dz;
  e.image = beat.image;
  return true;
}
```

## 5. Lands in

- TARGET `src/fight/finisher-beats.ts` (new, proposed): a client-side module that plays a finisher as a beat list. The engine sends the finisher's start and result; the beats only show them. Open point for Lead, as in the other cells: `src/fight` is the engine, so this may belong on the Pit client path instead. Not decided here.
- Parity-checklist row: 9 (finishers).
- today: the current Frankendom finisher code was not read.
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
- Brief rule served: client-only presentation (the engine keeps no beat state; the Pit and zones are clients). The cosmetic branch roll must never decide a finisher's outcome.

## 6. Gaps and risks

- No finisher or gore code. The donor's effects are smoke, sparks, explosions and bubbles. The transferable part is only the beat-script shape with end codes; blood, wounds and decals get nothing from this donor.
- Cosmetic randomness only. The donor's 1-in-96 roll and the height cut-off only pick which sprite plays. In Frankendom a finisher's kill, loot and result are server-verified (rulings), so the beat script may branch for looks only, never for the result. Keep its roll in a client RNG.
- Absolute height. The donor's cut-off (180) is an absolute z. Frankendom arenas differ in height, so the cut-off must be relative to the arena floor and set as zone or catalogue data (`where: zone data`).
- Step rate. The beat runs every 4 engine ticks. Frankendom's fixed-step rate was not read, so the 4 must be converted to its tick rate before any beat timing is written down.
- Drift without collision. The beat deltas move the effect with no ground or wall test (the tick code has none). A finisher beat that drifts through a wall will look wrong; keep finisher motion inside the arena or check it.
- Licence: GPL-2.0, version 2 only (not "or later"). Clean-room only: the sketch was written from the mechanism.
- Many-on-one: if several finishers run in one exchange (MAX_ATTACKERS = 3), each script needs its own bounded lifetime; the donor's scripts always end with an end-0 beat, so the same rule should hold.

Best transferable idea: A finisher is a fixed list of beats (a move in x, y and z plus a sprite image) with three end codes: remove, a cosmetic branch with a chance or height check, and a mid-script event that fires once and lets the script carry on.
Decision (proposed): adapt — the beat-list-with-end-codes shape fits client finisher timelines, but the donor's random branch and absolute height are cosmetic and must not decide a result; Frankendom keeps the outcome server-verified and puts the beat lists in the catalogue as data.
Acceptance: On a finisher, the beats play in order at a fixed step, the mid-finisher event (a flash or a sound) fires exactly once, and the finisher ends with its end code; a server test asserts that the kill and loot result are identical whatever the client cosmetic roll returns.
