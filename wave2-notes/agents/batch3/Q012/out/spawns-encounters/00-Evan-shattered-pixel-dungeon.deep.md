# 00-Evan-shattered-pixel-dungeon (spawns-encounters, cell 4)

Donor: `/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/actors/mobs/MobSpawner.java` | Licence: GPL-3.0-or-later (LICENSE.txt is GNU GPL Version 3; MobSpawner.java header: "either version 3 of the License, or (at your option) any later version") | Java | symbol `MobSpawner.act`

Checked: Symbol `MobSpawner.act` at MobSpawner.java 39-55 (read in full). Helpers it calls were read in full: `Level.spawnMob` 770-792, `Level.randomRespawnCell` 794-810, `Level.respawnCooldown` 752-768, `Level.mobCount` 718-726, `Level.createMob` 536-544, `RegularLevel.mobLimit` 206-217. Confidence high on the respawn loop and its numbers. Not read: `Random.Int` range, `GameMath.gate` body, `ChampionEnemy.rollForChampion`, `Statistics.amuletObtained`, where `Level.feeling` is set, `RegularLevel.createMobs` after line 275, `Mob.reset`. Callers of `spawnMob` by grep: SacrificialFire.java:97 (read 92-100), AscensionChallenge.java:275 (grep line only, not read), MobSpawner.java:43 (read). The spawn check is only traced from its own actor; the other two callers are not analysed.

Best transferable idea: a per-zone director that on each timer step counts live enemies (weighted), compares with a cap, places at most one new enemy at a distance from the players and outside their view, and reschedules itself: a short retry on failure, a longer cooldown on success.
Decision (proposed): adapt - the cap, check, place, reschedule shape fits zone population (row 23), but the donor is single-hero, turn-based, and never despawns, so we take the shape only: cap and timings become zone data, the cap is rolled once per respawn cycle (the donor re-rolls it on every read), and a failed placement does not consume the next kind.
Acceptance: a server test with two players in a zone with cap 6 and respawn 50 s: with 6 enemies alive nothing spawns; with 5 alive, one spawn occurs after the cooldown, at path distance of at least 12 tiles from both players and outside each player's line of sight (a server approximation; the donor's view test is not transferable as is); a failed placement retries after 1 s and leaves the zone's next kind unused.

## 1. Mechanism

- The donor has no zone object. One `MobSpawner` actor is added to the level's timeline when a level is entered: `Dungeon.java:491` calls `level.addRespawner()`, which creates it with `Actor.addDelayed(respawner, respawnCooldown())` (Level.java 739-750), or re-adds it and resets it if its cooldown is longer than the new respawn cooldown.
- Time is discrete and turn-based, not a fixed frame step. `Actor.process` picks the actor with the smallest `time` (Actor.java 262-269, ties broken by `actPriority`), sets `now` to that time (277) and calls `act()`. `spend(t)` adds `t` to the actor's own time (Actor.java 61-62). `TICK` is 1 (Actor.java 39). The spawner runs at BUFF priority (MobSpawner.java 35).
- Order of steps in one `MobSpawner.act` (MobSpawner.java 39-55):
  (a) Count: `mobCount()` sums `spawningWeight()` over enemy-aligned mobs that are not MINIBOSS, then rounds (Level.java 718-726).
  (b) Cap: `mobLimit()` is evaluated on the same line (41). On depth 1 it is 0 until the amulet is found (RegularLevel.java 207-209). Otherwise it is `3 + depth % 5 + Random.Int(3)`, multiplied by 1.33 and rounded up on a LARGE feeling (RegularLevel.java 212-215). The random term is inside the cap function, so every read re-rolls it. The mining level uses one fewer (MiningLevel.java 155).
  (c) If count < cap: `spawnMob(12)` (43). On success, the next act is after `respawnCooldown()` (44). On failure, the next act is after one turn (46-47).
  (d) If count >= cap: no spawn, next act after `respawnCooldown()` (51).
- `spawnMob(disLimit)` (Level.java 770-792): (1) `createMob()` (773) removes the next kind from the depth's rotation (536-541). The rotation is rebuilt by `getMobRotation(depth)` when empty (538). The kind is used up even if placement later fails. (2) The new mob is set WANDERING unless it is PASSIVE (775-776). (3) Up to 30 tries (777-781): `randomRespawnCell` picks a cell (up to 30 random cells, rejecting cells in the hero's view on the current level, impassable cells, LARGE mobs off open space, and occupied cells; 799-811), and the cell is accepted only if its path distance from the hero is at least `disLimit` (783). (4) If the hero is alive and a cell was found, the mob is added to the scene and the call returns true (784-788). Otherwise it returns false and the mob is discarded.
- `respawnCooldown()` (Level.java 752-768): base `TIME_TO_RESPAWN` = 50 turns (149, 765). Feeling DARK gives 2/3 of the base (762-763). The amulet branch (754-761) gives count x 2 on depth 1 and `round(gate(5, count x 5, 25))` deeper. Then the result is divided by the sundial multiplier (767): day `0.95 - 0.05 x level`, night (hours 20 to 7) `1.25 + 0.25 x level`, otherwise 1 (DimensionalSundial.java 59-98, values at 84 and 96). The mining level returns 3 x base (MiningLevel.java 173-176).
- Weights: `Mob.spawningWeight()` is 1 by default (Mob.java 1168-1170). Ghoul overrides it to 0.5 (Ghoul.java 80-81). Mimic overrides it to 0 (Mimic.java 284-285).
- Rotation: `standardMobRotation(depth)` gives a fixed list per depth (MobSpawner.java 71-212). `addRareMobs` adds one extra kind with a 2.5% chance at depths 4, 9, 14 and 19 (215-241). `swapMobAlts` swaps each entry for its alt with chance `1/50 x RatSkull multiplier` (244-255), run at refill time (65). The list is then shuffled (66).
- Initial population is separate. `RegularLevel.createMobs` places `mobLimit()` mobs at level build, or 8 on depth 1 (222). Only lines 219-275 were read (room choice and the placement loop start).

## 2. Key functions

- `MobSpawner.act`: `/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/actors/mobs/MobSpawner.java` 39-55. The whole director step: count, cap, spawn or wait, reschedule.
- `Level.spawnMob`: `.../levels/Level.java` 770-792. One placement attempt with up to 30 tries at distance >= disLimit.
- `Level.randomRespawnCell`: `.../levels/Level.java` 794-810. Up to 30 random cells; rejects hero view, walls, large mobs off open space, occupied cells.
- `Level.respawnCooldown`: `.../levels/Level.java` 752-768. Base 50, dark 2/3, amulet count-based branch, sundial divisor.
- `Level.mobCount` and `RegularLevel.mobLimit`: `.../levels/Level.java` 718-726 and `.../levels/RegularLevel.java` 206-217.
- `Level.createMob` and `MobSpawner.getMobRotation`: `.../levels/Level.java` 536-544 and `.../actors/mobs/MobSpawner.java` 62-68 (the refill, shuffle and alt swap).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Count live enemies with per-kind weight, spawn only below cap, re-check on a timer | Cap `3 + depth % 5 + Random.Int(3)`, x1.33 LARGE (theirs, RegularLevel.java 212-214); depth 1 gets 0 before the amulet (207) |
| Place at path distance >= minimum from the player, up to 30 tries; retry after 1 turn on failure | Minimum distance 12 (theirs, MobSpawner.java 43); 30 tries (Level.java 777, 799); retry after 1 turn (MobSpawner.java 47) |
| Cooldown after success, scaled by a state flag and a time multiplier | Base 50 turns (theirs, Level.java 149, 765); dark x 2/3 (763); sundial divisor 0.95 to 1.25 (DimensionalSundial.java 84, 96); mining x 3 (MiningLevel.java 175) |
| Shuffled deck of kinds, refilled when empty, with rare extras and swaps | Extra kind 2.5% at depths 4, 9, 14, 19 (theirs, MobSpawner.java 223); alt chance 1/50 times RatSkull multiplier (245) |
| Kind taken before placement (design side effect) | None: `mobsToSpawn.remove(0)` (Level.java 541) runs before placement (773) |

## 4. TypeScript sketch

simplified: keeps the donor order (count, cap roll, compare, one spawn attempt with up to 30 placements at distance >= minDist, then schedule). It omits the amulet cooldown branch, the sundial multiplier, the enemy-alignment test (it keeps the miniboss flag), the rare extras at depths 4/9/14/19, the champion roll, the hero-alive check, the RegularLevel initial placement and the per-kind rule for LARGE mobs. Rotation, alt table and weights are passed in as data, and the alt roll runs at refill as in the donor. Time is not modelled: `directorStep` returns the next tick and the caller schedules it. It keeps the donor's side effect that a failed placement uses up the kind; the Frankendom gap list says not to copy that.

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Kind = string;
type Rng = () => number; // returns a number in [0, 1)

interface Mob {
  kind: Kind;
  cell: number;
  weight: number;   // donor: spawningWeight(); 1 by default, 0.5 for Ghoul, 0 for Mimic
  miniboss: boolean;
  wandering: boolean;
}

interface Zone {
  depth: number;
  large: boolean;            // donor: feeling LARGE raises the cap x1.33 (ceil)
  dark: boolean;             // donor: feeling DARK shortens the respawn to 2/3
  baseRespawnTicks: number;  // donor: TIME_TO_RESPAWN = 50 turns
  timeMultiplier: number;    // donor: sundial multiplier (1 when none); cooldown is divided by it
  mobs: Mob[];
  queue: Kind[];             // spawn rotation, consumed one kind per attempt
}

interface Grid {
  cellCount: number;
  passable: (cell: number) => boolean;
  inHeroView: (cell: number) => boolean;
  occupied: (cell: number) => boolean;
  pathFromHero: (cell: number) => number;
}

interface World {
  zone: Zone;
  grid: Grid;
  rotation: (depth: number) => Kind[];        // data: standard list for this depth
  altFor: (kind: Kind) => Kind | undefined;   // data: rare alt for a kind
  altChance: number;                          // data: per-entry alt roll at refill time
  weightOf: (kind: Kind) => number;
  miniboss: (kind: Kind) => boolean;
  rng: Rng;
}

// Cap is re-rolled every time it is read (donor: mobLimit() includes Random.Int(3) and is called on each act).
function cap(z: Zone, rng: Rng): number {
  if (z.depth <= 1) return 0; // before the amulet, floor 1 gets no respawns
  let n = 3 + (z.depth % 5) + Math.floor(rng() * 3);
  if (z.large) n = Math.ceil(n * 1.33);
  return n;
}

function weightedCount(z: Zone): number {
  let total = 0;
  for (const m of z.mobs) {
    if (!m.miniboss) total += m.weight;
  }
  return Math.round(total);
}

function respawnTicks(z: Zone): number {
  const base = z.dark ? (2 * z.baseRespawnTicks) / 3 : z.baseRespawnTicks;
  return base / z.timeMultiplier;
}

// Refill builds a shuffled rotation; each entry may swap to its alt at refill time (donor: swapMobAlts).
function refill(w: World): void {
  const rot = w.rotation(w.zone.depth).slice();
  for (let i = 0; i < rot.length; i++) {
    const alt = w.altFor(rot[i]);
    if (alt !== undefined && w.rng() < w.altChance) rot[i] = alt;
  }
  for (let i = rot.length - 1; i > 0; i--) {
    const j = Math.floor(w.rng() * (i + 1));
    const tmp = rot[i];
    rot[i] = rot[j];
    rot[j] = tmp;
  }
  w.zone.queue = rot;
}

// The kind is consumed here, before placement, so a failed placement still uses up the entry.
function nextKind(w: World): Kind {
  if (w.zone.queue.length === 0) refill(w);
  return w.zone.queue.shift() as Kind;
}

// Donor randomRespawnCell: up to 30 random cells, skipping cells in hero view, walls and occupied cells.
function randomCell(w: World): number {
  for (let t = 0; t < 30; t++) {
    const c = Math.floor(w.rng() * w.grid.cellCount);
    if (!w.grid.inHeroView(c) && w.grid.passable(c) && !w.grid.occupied(c)) return c;
  }
  return -1;
}

// Donor spawnMob: up to 30 placement tries, each needing a path distance >= minDist from the hero.
function spawnMob(w: World, minDist: number): boolean {
  const kind = nextKind(w);
  for (let t = 0; t < 30; t++) {
    const c = randomCell(w);
    if (c !== -1 && w.grid.pathFromHero(c) >= minDist) {
      w.zone.mobs.push({
        kind,
        cell: c,
        weight: w.weightOf(kind),
        miniboss: w.miniboss(kind),
        wandering: true,
      });
      return true;
    }
  }
  return false;
}

// One director step (donor MobSpawner.act). Returns the tick of the next step.
function directorStep(w: World, now: number, minDist: number): number {
  if (weightedCount(w.zone) < cap(w.zone, w.rng)) {
    if (spawnMob(w, minDist)) return now + respawnTicks(w.zone);
    return now + 1; // donor TICK: try again next turn
  }
  return now + respawnTicks(w.zone);
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS with `export {};` appended, exit 0.

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population director on the server, not the client and not `src/fight`). Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer). The donor provides the cap, respawn timer and placement half of row 23 only. It has no despawn and no grace timer.
- Server tick: this donor drives the director by event time (Actor.java 250-277), not a fixed step. The Frankendom tick sub-line "server tick: fixed step, input intake, per-tick NPC budget" (row 18 / post-K item 3) must take the director as one budgeted step per tick.
- Reuse tag: adapt-shape (GPL-3.0-or-later; clean-room only, no copying of donor lines)
- Brief rule served: zones as data (cap, timers, distances are zone data fields); server-verified spawns (the server places and records every spawn)

## 6. Gaps and risks

- Turn-based donor. "Respawn 50" and "retry after 1 turn" are turns. Frankendom needs a stated tick rate and seconds to convert them; the donor gives no real-time value.
- Single hero. The donor measures distance and view from `Dungeon.hero` only. Frankendom needs the distance from the nearest player and a line-of-sight test the server can run. The donor's hero view (`heroFOV`, set outside this code, not read) is client-side state, so it cannot be copied as is.
- Cap re-roll. `mobLimit()` includes `Random.Int(3)` and is read on every act, so the cap can change between two reads in one cycle. Frankendom must roll the cap once per cycle and store it on the zone, or the server result depends on how often the check runs. Server-verified kills need the count to be deterministic.
- Failed placement uses up the kind (Level.java 541, 773). That is a side effect, not a design. The acceptance above says the opposite on purpose.
- The donor's numbers are constants in code: depth switch (RegularLevel.java 212), 50 (Level.java 149), 1/50 (MobSpawner.java 245). Under the zones-as-data ruling they become zone data fields (see the JSON sidecar).
- No despawn and no grace timer. Row 23's despawn-on-empty must be designed by us; the donor never removes an idle mob.
- Weights and miniboss exclusion (Mob.java 1168, Mimic.java 285) are per kind. In Frankendom they belong in the creature catalogue (row 21 fields), not in a zone number.
- The initial population path (RegularLevel.java 219-275) was only partly read. Not used for the sketch.
