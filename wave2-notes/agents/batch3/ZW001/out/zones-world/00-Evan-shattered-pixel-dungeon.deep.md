# 00-Evan-shattered-pixel-dungeon (zones-world, cell 1)

Donor: `/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/actors/mobs/MobSpawner.java` | Licence: GPL-3.0-or-later (per the MobSpawner.java header, lines 8-11: "either version 3 of the License, or (at your option) any later version"; `/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/LICENSE.txt` is the GPL v3 text) | Java | symbol `MobSpawner.act` (with `Level.spawnMob`, `Level.randomRespawnCell`, `Level.respawnCooldown`, `Level.mobCount`, `RegularLevel.mobLimit`; all under `levels/` and `actors/mobs/` in the same package)

Checked: Read in full: `MobSpawner.act` (actors/mobs/MobSpawner.java 39-55), `getMobRotation` and the standard depth table (62-69, 71-210), the rare-mob and alt swaps (215-255). Read: `Level.createMob`, `mobCount`, `respawnCooldown`, `spawnMob`, `randomRespawnCell` (levels/Level.java 536-544, 714-726, 739-818), `addRespawner` (739-750), `reset` (355-363), `RegularLevel.mobLimit` (206-217), generation placement (219-280, read in part), `MiningLevel.mobLimit` (155), `Ghoul.spawningWeight` (80-81), `Mob.spawningWeight` (1167-1170), `Dungeon.java` 489-492, `Actor.java` 39 (TICK). Not read: `DimensionalSundial.spawnMultiplierAtCurrentTime`, `ChampionEnemy.rollForChampion`, how `heroFOV` is computed, `Mob.reset`, the Level feeling generation (only grep hits, lines 260-296), and the other two callers of `spawnMob` (`actors/blobs/SacrificialFire.java:97` with `spawnMob(4)`, `actors/buffs/AscensionChallenge.java:275` with `spawnMob(12)`), which I found by grep only. Confidence: high on the spawn loop, the cap and the cooldown numbers; medium on how turns map to real time (the Actor scheduler was not read beyond TICK = 1). The Ghoul weight 0.5 (Ghoul.java:81) has no receipt because that line is shorter than the 15-character minimum. Camera: not applicable (zones topic). Scope: the mechanism is a per-level director, i.e. one zone population.

Best transferable idea: One timer per zone spawns at most one enemy per cooldown while the weighted live count is under a cap re-rolled on each check, and only into a cell that no player can see and that is at least 12 walk steps from the nearest player.
Decision (proposed): adapt — we keep the director shape (weighted live cap, one spawn per cooldown, unseen and far-by-walk placement, short retry on failure) but move the cap base, roster and cooldown into zone data in origins/server/world-spawns.ts, use a seeded server roll, check every player's view, and add the despawn-on-empty grace rule that this donor does not have.
Acceptance: Server test: a zone with cap 4, three live enemies and a 50 s cooldown gets exactly one spawn after the cooldown, the cell is out of view of every connected player and at least 12 walk steps from the nearest, a failed placement retries after 1 s, and the same seed gives the same spawn sequence.

## 1. Mechanism

- One spawner actor per level. `Dungeon.java:491` calls `level.addRespawner()` on each level entry. `addRespawner` (Level.java 739-750) creates a `MobSpawner` on first use, delayed by `respawnCooldown()`, and reuses it on later visits.
- Each act (MobSpawner.java 39-55) does one of three things. (a) If `mobCount() < mobLimit()`, it tries `spawnMob(12)`. On success it waits `respawnCooldown()`. On failure it waits one turn (`TICK`). (b) If the level is at or over the cap, it waits `respawnCooldown()` and spawns nothing.
- Live count (Level.java 718-725): sum of `spawningWeight()` over living mobs whose alignment is ENEMY, skipping MINIBOSS, rounded at the end. Ghoul weighs 0.5 (Ghoul.java 80-81); the base `Mob.spawningWeight` method is at Mob.java 1168 and the weight-comment line is 1167.
- Cap (RegularLevel.java 206-217): `3 + depth % 5 + Random.Int(3)`; if the level has the LARGE feeling it is multiplied by 1.33 and rounded up. The base `Level.mobLimit` returns 0 (Level.java 714-716), so a level type with no override never respawns. Depth 1 returns 0 unless the amulet is held, then 10 (RegularLevel.java 207-210). MiningLevel subtracts 1 (MiningLevel.java 155).
- The cap is re-rolled every time it is read. `RegularLevel.mobLimit` calls `Random.Int(3)` on each call, and `MobSpawner.act` calls `mobLimit()` on each act (MobSpawner.java 41). The ceiling therefore wobbles by up to 2 from check to check. The generation path (RegularLevel.java 222) reads it once.
- Species: `createMob` (Level.java 536-544) takes the next entry from a queue. When the queue is empty it refills from `MobSpawner.getMobRotation(depth)` (MobSpawner.java 62-68): the depth table (71-210, e.g. depth 1 is "3x rat, 1x snake", line 76), then rare additions (215-241), then alt swaps (244-255), then a shuffle (66). The entry is removed before placement (Level.java 541), so a failed placement loses that species.
- Cooldown (Level.java 752-768): base `TIME_TO_RESPAWN` = 50 (line 149). On the DARK feeling it is 2/3 of that (762-763). If the amulet is held, the cooldown scales with `mobCount()` instead (754-761). Then it is divided by `DimensionalSundial.spawnMultiplierAtCurrentTime()` (767; not read).
- Placement (Level.java 770-792): build a walk-distance map from the hero (771); `createMob` (773); a non-PASSIVE mob is set to WANDERING (774-776); up to 30 tries of `randomRespawnCell` that keep only cells with walk distance >= 12 (777-781); accept only if the hero is alive and the distance is >= 12 (783); add to the scene (784).
- `randomRespawnCell` (Level.java 794-810): up to 30 random cells; rejects a cell that is in the hero's field of view (805), not passable, LARGE on a non-open cell, or occupied.
- Generation (RegularLevel.java 219-280): depth 1 starts with 8 mobs (222). During generation, mobs avoid the 8-tile field of view and 8-tile walk from the entrance (235-252).
- No despawn: `grep -rn` for "despawn" over the shatteredpixeldungeon package returned no hits. A mob stays on its level until it dies or the level is reset (Level.reset, 355-363, calls `mob.reset()` and drops the mob if that returns false; `Mob.reset` not read).
- Timing is turn-based: every delay is an `Actor.spend` in turns, with `TICK` = 1 (Actor.java 39). The game is not a fixed real-time loop.

## 2. Key functions

- `MobSpawner.act`: `/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/actors/mobs/MobSpawner.java` 39-55. The director: cap check, one spawn attempt, cooldown or one-turn retry.
- `Level.spawnMob(int disLimit)`: `.../levels/Level.java` 770-792. One mob, placed at walk distance >= disLimit and not in view (via randomRespawnCell); the caller is the spawner with 12.
- `Level.randomRespawnCell(Char ch)`: `.../levels/Level.java` 794-810. Random cell draw with the hero-FOV, passability, LARGE and occupancy rejections; 30-draw limit.
- `Level.respawnCooldown()`: `.../levels/Level.java` 752-768. Base 50, DARK 2/3, amulet branch, sundial divisor.
- `Level.mobCount()`: `.../levels/Level.java` 718-725. Weighted live count, minibosses excluded.
- `RegularLevel.mobLimit()`: `.../levels/RegularLevel.java` 206-217. The cap formula with the re-rolled jitter.
- `MobSpawner.getMobRotation(int depth)`: `.../actors/mobs/MobSpawner.java` 62-68, with the table in `standardMobRotation` (71-210).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Director timer: one spawn attempt per cooldown; cooldown on success, one turn on failure, full cooldown when at cap | Base cooldown 50 turns (theirs, Level.java 149); retry 1 turn (theirs, MobSpawner.java 47) |
| Population cap over a weighted live count (minibosses excluded) | Cap = 3 + depth % 5 + 0..2 jitter (theirs, RegularLevel.java 212); LARGE x1.33 (theirs, 214) |
| Count weight per species (default 1, Ghoul 0.5) | Ghoul 0.5 (theirs, Ghoul.java 81, not receipted) |
| Spawn cell must be out of the player's view and at least N steps by walk distance | N = 12 (theirs, MobSpawner.java 43); 30 draws (theirs, Level.java 777, 799) |
| Calmer cooldown when the zone feels "dark" | 2/3 factor (theirs, Level.java 763) |
| Per-zone species roster refilled and shuffled when empty | Depth table (theirs, MobSpawner.java 71-210) |
| Zone with no respawn | Base cap 0 (theirs, Level.java 715); depth 1 without the amulet 0 (theirs, RegularLevel.java 208) |

## 4. TypeScript sketch

simplified: keeps the donor order: cap check first, then the next species is taken from the roster (and lost if placement fails, as in the donor), then a far unseen cell is searched, then the mob is placed or the spawner retries after one turn. It omits: the donor's nesting of 30 cell draws inside 30 outer tries (here one loop of `tries`), the rounding of the weight sum, the WANDERING state on spawn, the champion roll, the depth-1 and amulet rules, the LARGE-feeling cap bump, the DimensionalSundial divisor, the hero-alive check, and the revisit reset. The `dark` flag is passed in by the caller.

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Rng = () => number;

interface SpawnTuning {
  baseCap: number;           // zone data: donor 3 + depth % 5 on regular levels
  capRange: number;          // engine constant: donor adds Random.Int(3), i.e. 0..2 extra, re-rolled on every check
  cooldownTurns: number;     // engine constant: donor TIME_TO_RESPAWN = 50
  darkFactor: number;        // engine constant: donor uses 2/3 of the cooldown when the zone feeling is DARK
  minPathDist: number;       // engine constant: donor spawnMob(12), walk steps from the hero
  tries: number;             // engine constant: donor 30 cell draws
  retryTurns: number;        // engine constant: donor TICK = 1 after a failed placement
}

interface ZoneSpawner {
  rotation: string[];                  // remaining species of the current refill
  refill: () => string[];              // zone data: the species table for this depth, shuffled
  liveWeight: () => number;            // sum of spawn weights of living enemies, minibosses excluded
  randomCell: () => number;            // any walkable cell, or -1
  pathDist: (cell: number) => number;  // walk steps from the nearest player
  inView: (cell: number) => boolean;   // visible to any player
  place: (species: string, cell: number) => void;
}

function findFarCell(z: ZoneSpawner, t: SpawnTuning): number {
  for (let i = 0; i < t.tries; i++) {
    const c = z.randomCell();
    if (c >= 0 && !z.inView(c) && z.pathDist(c) >= t.minPathDist) return c;
  }
  return -1;
}

// One act of the spawner. Returns the delay in turns until the next act.
function spawnerAct(z: ZoneSpawner, t: SpawnTuning, rng: Rng, dark: boolean): number {
  const cooldown = dark ? t.cooldownTurns * t.darkFactor : t.cooldownTurns;
  const cap = t.baseCap + Math.floor(rng() * t.capRange); // re-rolled on every check
  if (z.liveWeight() >= cap) return cooldown;              // at the cap: wait a full cycle
  if (z.rotation.length === 0) z.rotation = z.refill();
  const species = z.rotation.shift();                       // consumed before placement, as in the donor
  if (species === undefined) return cooldown;
  const cell = findFarCell(z, t);
  if (cell < 0) return t.retryTurns;                        // species is lost on this path, as in the donor
  z.place(species, cell);
  return cooldown;
}
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population engine logic, per the addendum; this donor sketch is not yet in the Frankendom repo, and I did not read the Frankendom repo). Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with grace timer). The donor covers caps and respawn only; it has no despawn (see section 6).
- Server tick sub-line: the spawner is a timer-driven actor on the fixed step (`server tick: fixed step, input intake, per-tick NPC budget`, post-K item 3). The donor's timer is in turns, so the server version must count ticks, not turns.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only, shape only, no line-by-line translation)
- Brief rule served: zones as data (the cap base, the roster and the cooldown are zone data; the director is engine logic); server-verified spawns. Rules 7-9 n/a.

## 6. Gaps and risks

- Zones as data: in the donor the depth table and the cap formula are code (MobSpawner.java `switch`, RegularLevel.java 212). Frankendom must read the roster, cap base and cooldown from zone data, not copy the switch.
- No despawn: row 23 asks for despawn on empty with a grace timer. The donor has none (grep found no "despawn" in the package). The grace timer must be designed by us; do not claim it from this donor.
- Server-verified spawns: the donor checks visibility against one hero (`heroFOV`, RegularLevel and Level 805). Frankendom must check every connected player's view and walk distance before placing a mob, on the server.
- Order of consumption: the donor takes the species before placement, so a failed placement loses a roster entry and still runs the champion roll (`createMob`, Level.java 541-542). Frankendom must pick one order (find the cell first, then take the species) and test it.
- Re-rolled cap: the donor's cap moves by up to 2 on each check (RegularLevel.java 212 with MobSpawner.java 41). That makes spawn timing non-repeatable. Frankendom's replay and fight record (row 19) need a seeded roll per zone.
- Turn-based timing: 50 turns is not a time. Frankendom must set the cooldown in seconds as zone data and convert it on the server tick; the donor's turn length was not read.
- Cap is population, not attackers. It has no link to MAX_ATTACKERS = 3. Do not use this cap as an attacker limit.
- Several callers: `spawnMob` is also called by `SacrificialFire` (spawnMob(4)) and `AscensionChallenge` (spawnMob(12)); I read neither. Do not assume the director is the only spawn path.
- The Pit is a fixed arena (row 22) and does not use zone population. Keep the spawner off the Pit client.

## Checker findings

- Verdict: CLEAN
- Corrected: nothing to correct
- Missed: Level.reset (Level.java 355-363) calls createMobs() again after mob.reset(), so a revisited level regenerates its population; the note says Mob.reset was not read but omits this createMobs call
