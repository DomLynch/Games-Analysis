# Warzone2100-warzone2100 (vfx-blood-finishers, cell 3)

Donor: `/mnt/frankendom-donors/Warzone2100-warzone2100/src/effects.cpp` (symbols `updateGraviton` 957-1089 and `effectSetupGraviton` 1905-1950; the giblet spawn in `src/component.cpp` `compPersonToBits` 1142-1182; the death trigger in `src/droid.cpp` `removeDroidFX` 650-670; timing in `lib/gamelib/gtime.h` 209-212) | Licence: GPL-2.0-or-later (per `effects.cpp` header lines 6-9 and `COPYING`) = copyleft, clean-room | C++ | symbol `updateGraviton`

Checked: Opened and read in full: `src/effects.cpp` 1-60 (header and display-only contract), 120-160 (timing constants), 372-486 (`addEffect` gate and setup), 518-560 (update dispatch), 878-905 (`updateBlood`), 957-1100 (`updateGraviton`, the giblet physics and bounce), 1895-1960 (`effectSetupGraviton`); `src/component.cpp` 1120-1182 (`compPersonToBits`); `src/droid.cpp` 640-672 (`removeDroidFX`, first half); `lib/gamelib/gtime.h` 190-225 (time helpers). Grep only, not read: `effectSetupBlood` body (2123-2128, line 2126 receipted), `src/display3d.cpp:1387` (the call), `lib/gamelib/gtime.cpp:321` (receipted by line), the caller of `removeDroidFX` (not read), the bodies of `iSinR` and `iCosR`, `GRAVITON_GRAVITY` definition (line 94, cited by line only: value too short for a receipt). The hint `src/terrain.cpp` is terrain tile splatting and tile decals (its header, line 30, says decals are a hack for tile overlays); it is not wounds, so the real mechanism is in `effects.cpp`. Also checked for blood and gore terms in `src/map.cpp` and `src/map.h` (tile decal sets, not wounds). Confidence: high for the giblet flight and bounce (read in full, order of steps confirmed). Medium for the death trigger (one caller read, `compPersonToBits`, through its call in `removeDroidFX`). camera_scope: n/a.

## 1. Mechanism

- Scope: the effect system is display-only by contract (effects.cpp 38-40): no game state, no synchronised RNG (plain `rand()` for visuals), and the active list only advances from the 3D draw path (41-43; `processEffects` is called from `display3d.cpp:1387`). `addEffect` returns at once when paused or headless (374-377).
- Trigger: when a droid is removed (the caller of `removeDroidFX` was not read) and is visible on this client, `removeDroidFX` (droid.cpp 657-669) builds a velocity from the droid's facing and move direction, scaled by `DROID_EXPLOSION_VELOCITY_FACTOR` 0.9 (86, 664-665), and unless the droid is in its dying animation (667) calls `compPersonToBits` (669). That function spawns four giblets, one each for head, legs, arm and body (component.cpp 1178-1181), using the passed velocity.
- Spawn (`effectSetupGraviton`, effects.cpp 1909-1912): x += 50 - (rand % 100) (integer, so -49 to 50; 147), z likewise (148), and vertical speed is set to 12 (1912, `GIBLET_INIT_VEL_Y` 149). Spin is random (1931-1937). Giblets are "essential" (1940, `SET_ESSENTIAL`). Trail delay is 200 + (rand % 100) (1944, 135). `specific` (bounce count) starts at 0 (481).
- Update, per display frame, in this order (`updateGraviton`, 957-1089):
  (a) If paused, return true with no motion (972-975).
  (b) Move: position += velocity x graphics-time fraction, on all three axes (979-981). The fraction is `deltaGraphicsTime / 1000` (gtime.cpp 321; `GAME_TICKS_PER_SEC` is 1000, gtime.h 37). So the step is variable: one step per draw frame, no accumulator.
  (c) Off-map: kill (984-987). Ground height read under the piece (989). If it is rising and under the ground: kill (992-995).
  (d) Trail: for a giblet only, if the piece is more than 5 above the ground (1017) and the trail delay has passed (1020-1021), spawn one `EFFECT_BLOOD` at the piece's position (1029).
  (e) Spin (1034-1036). Gravity: accel = -800 x fraction is added to vertical velocity (1039-1040).
  (f) Off-map check on x and z against the tile units (1043-1046).
  (g) Ground test (1049). Water: kill (1052-1054). If falling (velocity y < 0): bounce if |vy| > 16 and the bounce count is at most 2 (1059-1061). A bounce halves and flips vertical velocity (1064), halves x and z (1067-1068), and sets the piece to ground height (1071). Otherwise: giblets are removed with no explosion (1075-1076); other gravitons add a very-small explosion (1076-1082).
- Blood: each trail puff is an `EFFECT_BLOOD` sprite (`effectSetupBlood`, 2123-2128): frame delay 150 (2125), fall speed -(20 to 39) (2126; `BLOOD_FALL_SPEED`, 141), size 100 +/- 30 (2128; `BLOOD_SIZE`, 140). The sprite is drawn translucent at alpha 128 (159, 1503).
- Ticks: no game tick. This is a display-frame loop with a variable step. A long frame gives a long step, and the ground test is a point test each step, so a fast giblet can pass through a thin surface without a sweep (see Gaps).
- Pause: `updateEffect` skips the graviton update while paused (544-549), and `updateGraviton` also returns early (972).

## 2. Key functions

- `updateGraviton`: `/mnt/frankendom-donors/Warzone2100-warzone2100/src/effects.cpp` 957-1089 (order (a) to (g) above).
- `effectSetupGraviton`: same file, 1905-1950 (giblet velocity 1909-1912; trail delay 1942-1944).
- `addEffect` gate: same file, 372-377 (paused or headless returns).
- `compPersonToBits`: `/mnt/frankendom-donors/Warzone2100-warzone2100/src/component.cpp` 1142-1182 (display-only check 1148; four giblets 1178-1181).
- `removeDroidFX`: `/mnt/frankendom-donors/Warzone2100-warzone2100/src/droid.cpp` 650-670 (visibility 657; velocity 662-665; dying check 667; call 669).
- Time helpers: `/mnt/frankendom-donors/Warzone2100-warzone2100/lib/gamelib/gtime.h` 209-212.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Gib flight: gravity applied per step | -800 units/s^2 (theirs, effects.cpp 94 by line; applied at 1039) |
| Launch velocity: kill velocity plus random sideways jitter, fixed up speed | x and z jitter 50 - (rand % 100), i.e. -49 to 50 units/s (theirs, 147-148, applied at 1910-1911); up speed 12 units/s (theirs, 149, set at 1912) |
| Kill velocity from the dying unit | Facing and move direction, scaled by 0.9 (theirs, droid.cpp 86, 664-665) |
| Bounce: only while fast enough, then halve | Bounce if |vy| > 16 (theirs, 1059); vy halved and flipped, vx and vz x 0.5 (theirs, 1064, 1067-1068); at most 3 bounces (theirs, 1059-1061: count at most 2 before the increment) |
| Trail rate for a flying piece | 200 + (rand % 100) ms between blood puffs (theirs, 135, 1944, 1020); only while more than 5 above ground (theirs, 1017) |
| Blood puff | Fall speed -(20 to 39) (theirs, 141, 2126); size 100 +/- 30 (theirs, 140, 2128); frame delay 150 (theirs, 128, 2125) |
| Layer count per person | 4 giblets: head, legs, arm, body (theirs, component.cpp 1178-1181) |
| Units | Game ticks are ms: `GAME_TICKS_PER_SEC` 1000 (theirs, gtime.h 37) |

Worked case (illustrative landing speeds, not a simulation): a piece that lands at 60 units/s downward bounces to 30 units/s upward with x and z halved; a second landing at 30 units/s bounces again (it is above 16); a third at 15 units/s is removed without a bounce, since 15 is not above 16.

## 4. TypeScript sketch

simplified: The sketch keeps the donor order: move; off-map and rising-under-ground kills; ground height; trail when above ground + 5 and the delay has passed; gravity; ground test; water kill; bounce while fast enough and under the bounce limit; otherwise kill with no explosion. It omits: the spin and rotation; the lighting list for non-giblet gravitons; the explosion for non-giblets; the integer truncation the donor applies to the ground test (`(int)` casts at 1049); the second off-map check against tile units (1043), which the sketch folds into the first; the donor's use of `graphicsTime` ticks (the sketch uses ms passed in); the sprite itself (the `emitBlood` callback). The donor adds the jitter to the passed velocity (+=); the sketch does too. The donor's `specific` counter is the sketch's `bounces`.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Vec3 { x: number; y: number; z: number }
export interface Gib { pos: Vec3; vel: Vec3; bounces: number; lastTrailMs: number; trailDelayMs: number; alive: boolean }
export interface Env {
  groundHeight(x: number, z: number): number; // terrain height under the piece
  isWater(x: number, z: number): boolean;
  inMap(x: number, z: number): boolean;
  emitBlood(p: Vec3): void;                   // display-only trail puff
}

export const GRAVITY = -800;          // units per second squared (donor GRAVITON_GRAVITY)
export const TRAIL_MIN_MS = 200;      // donor GRAVITON_BLOOD_DELAY = 200 + rand % 100
export const BOUNCE_MIN_SPEED = 16;   // donor: abs(vy) > 16 to bounce again
export const MAX_BOUNCES = 3;         // donor: specific <= 2 before the increment

const kill = (g: Gib): boolean => { g.alive = false; return false; };

// killVel: the velocity of the killing movement (donor: facing x speed x 0.9); the jitter is added to it, as in the donor.
export function initGib(origin: Vec3, killVel: Vec3, rnd: () => number, nowMs: number): Gib {
  const jitter = (): number => 50 - Math.floor(rnd() * 100); // donor: 50 - rand() % 100
  return {
    pos: { ...origin },
    vel: { x: killVel.x + jitter(), y: 12, z: killVel.z + jitter() },
    bounces: 0,
    lastTrailMs: nowMs,
    trailDelayMs: TRAIL_MIN_MS + Math.floor(rnd() * 100),
    alive: true,
  };
}

// One display step. Returns false when the piece is removed. Paused pieces do not move.
export function stepGib(g: Gib, dt: number, env: Env, nowMs: number, paused: boolean): boolean {
  if (!g.alive) return false;
  if (paused) return true;
  g.pos.x += g.vel.x * dt;
  g.pos.y += g.vel.y * dt;
  g.pos.z += g.vel.z * dt;
  if (!env.inMap(g.pos.x, g.pos.z)) return kill(g);
  const ground = env.groundHeight(g.pos.x, g.pos.z);
  if (g.pos.y < ground && g.vel.y > 0) return kill(g); // rising under the ground: remove
  if (g.pos.y > ground + 5 && nowMs - g.lastTrailMs > g.trailDelayMs) {
    g.lastTrailMs = nowMs;
    env.emitBlood({ ...g.pos });
  }
  g.vel.y += GRAVITY * dt;
  if (g.pos.y < ground) {
    if (env.isWater(g.pos.x, g.pos.z)) return kill(g);
    if (g.vel.y < 0) {
      if (Math.abs(g.vel.y) > BOUNCE_MIN_SPEED && g.bounces < MAX_BOUNCES) {
        g.bounces++;
        g.vel.y = -g.vel.y / 2; // half the vertical speed, flipped
        g.vel.x *= 0.5;
        g.vel.z *= 0.5;
        g.pos.y = ground;
      } else {
        return kill(g); // giblets are removed without an explosion
      }
    }
  }
  return true;
}
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (copy at /tmp/warzone-giblet.ts), exit 0.

## 5. Lands in

- TARGET `src/fight/gibs.ts` (new, client-only, display-only). The server sends the kill (the killing blow's direction and the unit id); the client launches the pieces and steps them in the draw loop. Health, kills and the ledger are never touched. Parity-checklist row 8 (blood, wounds, decals).
- today: (not read; no Frankendom repo was opened in this pass).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room, shape only)
- Brief rule served: 8 (blood and wounds, client-only); rule 1 (one engine: the gibs are a visual of a server-verified kill, and the display-only contract stops them writing state).
Best transferable idea: death gibs are a display-only particle system with a few fixed rules (gravity, half-speed bounce up to three times, a blood trail timer, no explosion), and the whole layer is barred from writing game state or using the simulation's random source.
Decision (proposed): adapt - take the display-only contract as a rule for every src/fight visual module, and the gib rules as data (gravity, bounce limit, trail delay); do not take the donor's facing-based launch velocity, which should come from the server's killing blow.
Acceptance: When a gladiator dies in the Pit, four gib pieces (head, legs, arm, body) leave with a velocity from the killing blow, fall at the data gravity, bounce at most three times with half vertical speed, and leave a blood puff about every 0.2 to 0.3 s while airborne; a test asserts the gib module never writes health and never draws from the duel's random source.

## 6. Gaps and risks

- Display-only contract: the donor's rule (effects.cpp 38-40) is the same shape as Frankendom's rule that the camera, HUD and sound are client-only. Adopt it, and write a test that the visual modules never import the duel's state or random source.
- Launch velocity: the donor takes it from the droid's facing and move direction (droid.cpp 662-665). Frankendom must take it from the server's killing blow (direction and force) so both clients agree; a facing-based value would not match the server.
- Variable step and tunnelling: the donor steps by frame time with no accumulator (gtime.cpp 321; effects.cpp 979-981) and tests the ground at a point. A long frame, or a fast piece, can pass through a thin floor. If Frankendom's floor is thin, either clamp the step or sweep the ground test; the donor does neither.
- Water and tile type: the donor kills a piece on water tiles (1052-1054). If an arena ever has water, the rule must come from the arena data, not a constant.
- Pause: the donor freezes motion while paused but still pushes lights (972-976). Frankendom's Pit pause should freeze gibs fully.
- Pieces per death: four per person in the donor (component.cpp 1178-1181), fixed in code. Frankendom should make the count data per creature type (zone data).
- Blood puff volume: each trail puff is one sprite (1029). Frankendom must cap live puffs (see the blood spray note, row 8) and share the cap with the spray.
- Not read: `effectSetupBlood` body beyond lines 2125-2128, the caller of `removeDroidFX` (its visibility gate is read, the trigger is not), and the bodies of `iSinR` and `iCosR`. The velocity line (664-665) is read, but how `iSinR` and `iCosR` scale by speed is not.
