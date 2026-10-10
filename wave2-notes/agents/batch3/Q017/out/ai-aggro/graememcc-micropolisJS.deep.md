# graememcc-micropolisJS (ai-aggro, cell 3)

Donor: `/mnt/frankendom-donors/graememcc-micropolisJS/src/copterSprite.js` (with `monsterSprite.js`, `spriteUtils.js`, `spriteManager.js`, `game.js`, `random.ts`, `blockMapUtils.js`) | Licence: GPL-3.0 (`COPYING`: "Version 3, 29 June 2007") with additional terms stated in each source header (trademark note for "MICROPOLIS") | JavaScript (ES modules; a port of the 1990s SimCity-style Micropolis engine) | symbols `CopterSprite.prototype.move`, `MonsterSprite.prototype.move`, `SpriteUtils.turnTo`, `SpriteUtils.absoluteDistance`

Checked: Read in full: `src/copterSprite.js` (117 lines) and `src/monsterSprite.js` (182 lines). Read in the ranges that matter: `src/spriteUtils.js` 18-54 and 76-114 (`turnTo`, `getDir`, `absoluteDistance`), `src/spriteManager.js` 36-45 and 76-94 (`getSprite`, `moveObjects`), `src/game.js` 264-268 and 660-696 (the tick and the animation callback that moves sprites), `src/simulation.js` 177-218 (the simulation tick, which does not move sprites), `src/random.ts` 23-26 (`getChance`), `src/blockMapUtils.js` 292-304 (the pollution peak). Hint file `src/trainSprite.js`: not read beyond one grep (trains run on rails and have no target). Callers of `move`: `spriteManager.js` 90, which is called from `moveObjects` (game.js 687). Confidence: high for the copter's order of steps and its constants; high for the frame-based timing (read at the call site); the 1-in-4 figure for `getChance(10)` is computed from the bit mask, not measured. Camera: not applicable.

## 1. Mechanism

The donor has no player-level aggro. Its "AI" is one flying sprite (the helicopter, `CopterSprite`) that picks its destination on each move once its delay has run out, and a second sprite (the monster) that heads for a fixed point and then leaves. Both are in the simulation's sprite list and are moved once per animation frame, not once per simulation tick: `commonAnimate` calls `spriteManager.moveObjects` when the game is not paused (`game.js` 686-687, driven by `requestAnimationFrame` at 266-268). `simTick` (`simulation.js` 177-218) handles the economy and does not move sprites.

Helicopter (`copterSprite.js`). Created with a 1500 count (28), a random wander point on the map (29-30), and its spawn point as home (31-32). Each `move`, in order:
(a) decrement the sound timer (43-44) and the count, but only while the count is above zero (46-47);
(b) if the count is exactly 0 (49), choose a destination: the first live monster (51-55), else the first live tornado (58-62), else home (63-66). Then, if the Manhattan distance to home is under 30 (70-71), set the frame to 0 (landed) and return (72-73). Landing is tested against home, not against the chosen target;
(c) the heavy-traffic sound (77-88), which is not part of the mechanism;
(d) every fourth sprite cycle (`(spriteCycle & 3) === 0`, 92), recompute the direction to the destination and turn the sprite one 45-degree step toward it (93-95; `turnTo`, `spriteUtils.js` 28-54);
(e) move one step using a fixed table of nine entries (39, 98-99): index 0 is no movement, and the other eight are the 3 or 5 px steps in eight directions.

Until the count reaches 0, step (b) does not run. The copter keeps steering toward the spawn-time wander point (its only destination until then); nothing in this file picks a new one (the only writes to `destX`/`destY` are at 29-30 and 54-65). What it does once it is at that point was not traced.

Monster (`monsterSprite.js`). Created with count 1000 (42). Its first destination is the most polluted tile at spawn (43-44; the peak is kept by `blockMapUtils.js` 296-302, with ties re-rolled by `getChance(3)` at 298). Its 16 sprite frames are 12 diagonal frames (three per diagonal class) and 4 cardinal frames (13-16). Each `move`:
(a) The arrival test runs only while it shows a diagonal (the branch at 70-98): Manhattan distance to the current destination under 60 (86-88). The first arrival (flag 0) sets the flag to 1 and the destination to home (89-92). The second arrival (flag 1) sets the frame to 0 and emits `SPRITE_DYING` (93-96).
(b) While on a diagonal, it turns when the wanted direction, reduced to one of four classes (`getDir` at 101-102), differs from its current class and `Random.getChance(10)` passes (104). It then shows a cardinal frame and does not step (105-111; `xDelta[4]` and `yDelta[4]` are 0, `monsterSprite.js` 54-55). `getChance(mask)` returns `(rng() & mask) === 0` (`random.ts` 25); for mask 10, two bits set, that is about one in four on a uniform 16-bit RNG (computed, not run). So the target decides when a turn starts, not where it turns.
(c) While it shows a cardinal frame, it has a one-in-four roll per move (`getRandom16() & 3`, 123) to switch to one of the two diagonals next to that cardinal (124-132). The choice between the two is a coin flip (`getRandom16() & 1`, 124). The new heading is therefore a random neighbour of the old one, not a turn toward the target.
(d) It steps 2 px on each axis along its diagonal (142-143). Its count is decremented on every move (145-146). A tile of -1 (off the map), or a river tile once the count is below 500 (150-151), sets frame 0, and the death event fires (167-168).
(e) Any live airplane, helicopter, ship or train it overlaps is exploded (156-165, `explodeSprite` at 164). This is the "certain doom" for the helicopter in its own comment (`copterSprite.js` 50).

Target selection in the donor is by list order. `getSprite(type)` returns the first sprite of that type with a non-zero frame (`spriteManager.js` 36-45). There is no nearest, no score, and no threat.

## 2. Key functions

- `CopterSprite.prototype.move`: `/mnt/frankendom-donors/graememcc-micropolisJS/src/copterSprite.js` 42-100. Count gate, target priority, landing, heading and step.
- `MonsterSprite.prototype.move`: `/mnt/frankendom-donors/graememcc-micropolisJS/src/monsterSprite.js` 61-172. Arrival test with the two-arrival rule, the cardinal switch, the count and river rule, and the collision rule.
- `SpriteUtils.turnTo`: `/mnt/frankendom-donors/graememcc-micropolisJS/src/spriteUtils.js` 30-54. One 45-degree step, the short way round.
- `SpriteUtils.absoluteDistance`: `/mnt/frankendom-donors/graememcc-micropolisJS/src/spriteUtils.js` 110-114. Manhattan distance.
- `SpriteManager.moveObjects` and `getSprite`: `/mnt/frankendom-donors/graememcc-micropolisJS/src/spriteManager.js` 76-94 and 36-45.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Engage delay: a countdown that holds the chaser on a wander point, then switches to chase | 1500 (theirs, `copterSprite.js` 28), counted in animation frames (about 25 s at 60 frames a second, computed) |
| Priority then fallback then home: first live primary, else first live secondary, else home | Monster before tornado before home (theirs, 51-66) |
| Land when within a small Manhattan radius of home | 30 px (theirs, 71) |
| Turn-rate limit: one 45-degree step per heading refresh, refresh every 4th cycle | 45 degrees (theirs, `spriteUtils.js` 28); refresh mask 3 (theirs, `copterSprite.js` 92) |
| Movement by a fixed table of 8 steps | 3 and 5 px per frame (theirs, 39) |
| Arrival test by Manhattan radius; first arrival re-targets home, second arrival ends the sprite | 60 px (theirs, `monsterSprite.js` 88); count 1000 (theirs, 42); river rule below 500 (theirs, 151) |
| Random turn check | `getChance(10)`, a bit-mask test, about 1 in 4 (theirs, 104; computed) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order (count decremented first, then the zero test; while the delay runs, fly to the wander point; at zero, land if within the radius of home, else pick priority, fallback, home). It takes the target choice as inputs (the caller decides what counts as "first live"). It changes four things. (1) Time is in server ticks, not animation frames. (2) The heading turns continuously, at most `maxTurnPerTick` each tick, where the donor turns one 45-degree step every fourth cycle. (3) Movement is a vector, not the 8-entry table. (4) The arrival radius is Manhattan, as the donor's is, but the sketch uses it only for landing. It omits the sound timer, the frame and sprite-sheet state, the collision rule, the monster's two-arrival despawn, the river and off-map death, and the map tile destruction.

```ts
// Licence: GPL-3.0 with additional terms (donor, micropolisJS). Clean-room: shape only, rewritten.

export interface ChaserData {
  engageDelayTicks: number;   // ticks before the chase starts (donor: count = 1500 animation frames)
  landRadius: number;         // units: distance to home that lands the chaser (donor: 30 px, Manhattan)
  speed: number;              // units per tick (donor: 3 or 5 px per frame, 8 fixed directions)
  maxTurnPerTick: number;     // radians per tick: the heading may change this much at most
}

export interface Vec { x: number; y: number; }

export interface Chaser {
  pos: Vec;
  home: Vec;
  delay: number;              // ticks left before engaging
  landed: boolean;
  heading: number;            // radians
}

// Manhattan distance, as the donor measures its arrival radius.
function manhattan(a: Vec, b: Vec): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

// Priority: first live primary, else first live secondary, else home.
export function pickDestination(primary: Vec | null, secondary: Vec | null, home: Vec): Vec {
  if (primary !== null) return primary;
  if (secondary !== null) return secondary;
  return home;
}

// Shortest signed angle from a to b, in (-pi, pi].
function angleDiff(a: number, b: number): number {
  let d = b - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d <= -Math.PI) d += 2 * Math.PI;
  return d;
}

// One server tick. wander is the spawn-time point used while the delay runs.
export function stepChaser(c: Chaser, d: ChaserData, wander: Vec, primary: Vec | null, secondary: Vec | null): void {
  if (c.landed) return;

  if (c.delay > 0) c.delay -= 1;             // donor: decrement, then test for zero
  let dest: Vec;
  if (c.delay > 0) {
    dest = wander;
  } else {
    if (manhattan(c.pos, c.home) < d.landRadius) { c.landed = true; return; }
    dest = pickDestination(primary, secondary, c.home);
  }

  const want = Math.atan2(dest.y - c.pos.y, dest.x - c.pos.x);
  const turn = Math.max(-d.maxTurnPerTick, Math.min(d.maxTurnPerTick, angleDiff(c.heading, want)));
  c.heading += turn;
  c.pos = { x: c.pos.x + d.speed * Math.cos(c.heading), y: c.pos.y + d.speed * Math.sin(c.heading) };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/chase.ts` (proposed new module; the Frankendom repo was not read, so this name is a proposal). Parity-checklist row 4 (fight loop: aggro, chase, leash). The engage delay and the home landing are the leash; the priority list is the target choice, which the engine supplies.
- Reuse tag: adapt (GPL-3.0 with additional terms; clean-room, shape only)
- Brief rule served: one engine (chase and leash run in the server tick); zones as data (the delay and the wander point are encounter data)

## 6. Gaps and risks

- Frame-based timing: the donor's 1500 and its 4-cycle heading refresh run per animation frame (`game.js` 687). On a 120 Hz screen the copter engages twice as fast. Frankendom must use server ticks for every count.
- Target choice is list order (`spriteManager.js` 38). Our priority rules (many-on-one, MAX_ATTACKERS = 3) must come from the hate table (row 4; see the l1j-en-classic cell), not from which sprite the list returns first.
- Landing is tested against home, not the target. In Frankendom a chase that ends at home must be a leash with a defined re-engage rule; the donor does not say what happens after landing, because a landed sprite is skipped for good (`spriteManager.js` 87-88).
- The 8-direction quantised movement and the one-step-per-refresh turn are client-animation shortcuts. The server must move by vector and the client may draw the 8 frames. Reject the quantisation as a rule.
- Arrival and landing use Manhattan distance (`spriteUtils.js` 110-114). Frankendom's duel ranges are Euclidean in our engine; choose one metric per rule and state it in the test.
- `getDir` has a known bug: its own comment says it "always chooses south if we're already there" (`spriteUtils.js` 72-73). Do not copy `getDir`; a zero-distance case must return "no direction".
- `Random.getChance(10)` is a bit-mask test, about one in four, not one in ten. If the idea is used, give every probability as a plain data field.
- The monster's two-arrival rule (go to a point, return home, despawn at home) is a useful leash shape, but its despawn belongs to zone population (row 23), not to the fight loop. Do not put it in `src/fight`.
- Licence: GPL-3.0 with additional terms. Clean-room only; the sketch is written from the mechanism.

Best transferable idea: Give a chaser an engage delay counted in server ticks, a priority list with a fallback to home, and a landing radius around home, so it leashes back to its anchor when there is no valid target.
Decision (proposed): adapt — the delay, the priority-then-home destination and the landing radius are the right leash shape for a single fast chaser or boss; we take it with server ticks and plain probability fields, pick targets from the engine's hate table, and do not take the frame counter, the 8-way quantised movement, or the first-in-list choice.
Acceptance: server test — chaser with engageDelayTicks 10 and home at (0, 0), starting at (200, 0) with wander point (200, 200): for 10 ticks it steers toward the wander point and not toward a player at (50, 0); after the delay with a live primary it steers toward the primary; with no primary and a live secondary it steers toward the secondary; once within landRadius 30 (Manhattan) of home it lands and does not move again.
