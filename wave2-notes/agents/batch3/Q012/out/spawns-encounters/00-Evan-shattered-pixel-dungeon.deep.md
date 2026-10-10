# 00-Evan-shattered-pixel-dungeon (spawns-encounters, cell 4)

Donor: `/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/actors/mobs/MobSpawner.java` | Licence: GPL-3.0-or-later (LICENSE.txt is GPL v3; the MobSpawner.java header says "either version 3 of the License, or (at your option) any later version") | Java | symbol `MobSpawner.act`

Checked: Read `MobSpawner.java` in full (act at 39-55, resetCooldown 57-60, rotation 62-255). Read `Level.java` 536-546 (createMob), 714-726 (mobLimit, mobCount), 739-810 (addRespawner, respawnCooldown, spawnMob, randomRespawnCell), 149 and 273 (TIME_TO_RESPAWN, DARK feeling). Read `RegularLevel.java` 206-218 (mobLimit override). Read `DimensionalSundial.java` 59-74 (multiplier; the nighttime value function is not read). Read `GameMath.gate` (SPD-classes/.../GameMath.java 37-40). Read `Mob.java` 1167-1170 and `Wraith.java` 92-94 (spawningWeight). Read `SacrificialFire.java` 93-100 (second caller), `Dungeon.java` 484-493 (level-load call), `Actor.java` line 39 (TICK). Confidence high on the spawn loop, cap, cooldown and placement order. The list hint SpawnerSprite.java was not opened (not read). Not read: `Actor.spend` internals, `GameScene.add`, `ChampionEnemy.rollForChampion`, `AscensionChallenge.java` 275 beyond the call. Despawn: a grep for "despawn" over the donor's .java files returned nothing, so the spawner has no despawn path (grep result only, not a full read of every file).

## 1. Mechanism

- The spawner is a turn-timer actor (`MobSpawner`, actPriority BUFF_PRIO). One exists per level: `Level.addRespawner` creates it with `addDelayed(respawner, respawnCooldown())` the first time (Level.java 739-744); on later visits it is re-added and its cooldown is clamped down to the current value (745-747). The level-load call is at Dungeon.java 491. Time is game turns, not wall-clock; TICK is 1 turn (Actor.java 39).
- Each fire (`MobSpawner.act`, lines 41-52):
  - If the level's enemy population is below the cap (`mobCount() < mobLimit()`, line 41), it calls `spawnMob(12)` (line 43). On success it sleeps `respawnCooldown()` (line 44). On failure it sleeps one turn and tries again (line 47).
  - If the population is at or above the cap, it sleeps `respawnCooldown()` (line 51) and checks again later. Nothing spawns in that fire.
- Population (`mobCount`, Level.java 718-726): sums `spawningWeight()` over every ENEMY mob that is not MINIBOSS, then rounds. Default weight is 1 (Mob.java 1168-1169). Some kinds return 0 (Wraith.java 92-93; Piranha and CrystalSpire also return 0 per grep, not read).
- Cap (`RegularLevel.mobLimit`, 206-218): on depth 1 it is 0 unless the amulet is held (then 10). Otherwise `3 + depth % 5 + Random.Int(3)`, multiplied by 1.33 and rounded up on a LARGE-feeling level (212-214). This function runs fresh on every check, so the cap is re-rolled each time the spawner fires.
- Cooldown (`respawnCooldown`, Level.java 752-767): base 50 turns (TIME_TO_RESPAWN, line 149; used at 765). If the level feeling is DARK, 2/3 of that (762-763). With the amulet: on depth 1, `mobCount * 2`; deeper, `round(clamp(5, mobCount * 5, 25))` (754-760). Finally divided by the Sundial multiplier (767), which is 1 with no Sundial (DimensionalSundial 71-72 region; the night value is not read).
- Placement (`spawnMob`, 770-792): build a walking-distance map from the hero (771). Create the mob (773) by popping the next kind from the zone's bag (`createMob` 536-541). Set it to WANDERING unless it is PASSIVE (774-776). Then up to 30 outer tries (777-781); each calls `randomRespawnCell`, which draws up to 30 random cells over the whole level and rejects any cell that is in the hero's field of view, not passable, or occupied (794-810). A cell is accepted only if its walking distance from the hero is at least `disLimit` (783). If no cell is accepted, the function returns false and the created mob object is dropped. The kind was already popped, so the failed attempt consumes a rotation entry.
- The bag: when empty, `getMobRotation(depth)` builds a fixed list for that depth (MobSpawner 71-210 per depth), adds a rare kind with 2.5% chance on a few depths (215-241, e.g. line 223), swaps each entry for its alt with chance 1/50 times a trinket multiplier (244-255), then shuffles (66). The bag is refilled only when empty (Level.java 537-538).
- Other callers: `SacrificialFire` spawns with `spawnMob(4)` only when `mobCount() == 0` and it has bonus spawns left (SacrificialFire.java 95-99). `AscensionChallenge` calls `spawnMob(12)` (line 275, grep only).

## 2. Key functions

- `MobSpawner.act`: `/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/actors/mobs/MobSpawner.java` 39-55. Cap check, then spawn or sleep.
- `Level.spawnMob(disLimit)`: `.../levels/Level.java` 770-792. Distance map, create mob, up to 30 outer placement tries, distance gate, return success.
- `Level.randomRespawnCell`: `.../levels/Level.java` 794-810. Up to 30 random draws per call; rejects view, impassable, occupied.
- `Level.respawnCooldown`: `.../levels/Level.java` 752-768. Base 50 turns; DARK x2/3; amulet formulas; sundial division.
- `RegularLevel.mobLimit`: `.../levels/RegularLevel.java` 206-218. Depth formula with random term, re-rolled per call.
- `Level.mobCount`: `.../levels/Level.java` 718-726. Weighted, excludes MINIBOSS.
- `MobSpawner.getMobRotation`: `.../actors/mobs/MobSpawner.java` 62-68. Standard list, rare add, alt swap, shuffle.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Spawn only while the weighted population is under a cap; check again after a full cooldown when at cap | Cap formula `3 + depth % 5 + Random.Int(3)`, x1.33 on LARGE (theirs, RegularLevel 212-214); depth 1 = 0 without amulet (208) |
| After a successful spawn, sleep a fixed cooldown | 50 turns (theirs, Level.java 149, 765). Turns, not seconds |
| Dark zone shortens the cooldown | x2/3 (theirs, Level.java 763) |
| After a failed placement, retry soon (not a full cooldown) | 1 turn (theirs, MobSpawner.java 47; TICK 1f, Actor.java 39) |
| Place only out of the player's view, passable, unoccupied, and at least N walking steps away | N = 12 for the spawner (theirs, MobSpawner.java 43); N = 4 for sacrificial fire (theirs, SacrificialFire.java 97) |
| Placement tries: 30 outer x 30 inner random draws | 30 and 30 (theirs, Level.java 777, 799) |
| Shuffled bag of kinds, refilled when empty | Rare kind 2.5% (theirs, MobSpawner.java 223); alt swap 1/50 (theirs, 245) |
| Weight 0 mobs do not count toward the cap | Weight 0 for Wraith (theirs, Wraith.java 93); default weight 1 (Mob.java 1169) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: cap check first, then the kind is taken from the bag, then placement (outer x inner draws with view, passable, occupied and path-distance gates), then the cooldown. It is in seconds, not turns. It omits the amulet cooldown formulas and their clamp, the Sundial multiplier, the LARGE-creature open-space rule, the champion roll, the WANDERING/PASSIVE state, the re-entry cooldown clamp, the rare-kind and alt-swap additions, the sacrificial-fire caller, and the depth-1 pre-spawn of eight mobs. The cap is passed in as a function because the donor re-rolls it on every call; a Frankendom build should not copy the re-roll (see section 6).

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface SpawnMob { enemy: boolean; miniboss: boolean; weight: number; }
export interface SpawnCell { passable: boolean; inView: boolean; occupied: boolean; pathDist: number; }
export interface ZoneSpawn {
  cap: () => number;        // re-evaluated on every check (the donor re-rolls it each call)
  baseCooldownS: number;    // seconds after a successful spawn
  dark: boolean;            // dark zone flag
  darkFactor: number;       // cooldown multiplier for a dark zone
  retryS: number;           // delay after a failed placement
  minPathDist: number;      // minimum walking distance from the player
  attempts: number;         // outer placement tries
  rotation: string[];       // zone monster kinds, drawn from a shuffled bag
}

function shuffle<T>(a: T[], rng: () => number): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class ZoneSpawner {
  private bag: string[] = [];
  constructor(private z: ZoneSpawn, private rng: () => number) {}

  population(mobs: SpawnMob[]): number {
    let c = 0;
    for (const m of mobs) if (m.enemy && !m.miniboss) c += m.weight;
    return Math.round(c);
  }

  cooldownS(): number {
    return this.z.baseCooldownS * (this.z.dark ? this.z.darkFactor : 1);
  }

  private nextKind(): string {
    if (this.bag.length === 0) this.bag = shuffle(this.z.rotation.slice(), this.rng);
    return this.bag.shift() as string; // taken before placement, so a failed placement consumes it
  }

  private placeCell(cells: SpawnCell[]): number {
    for (let outer = 0; outer < this.z.attempts; outer++) {
      let cell = -1;
      for (let inner = 0; inner < 30; inner++) {
        const i = Math.floor(this.rng() * cells.length);
        const c = cells[i];
        if (c.passable && !c.inView && !c.occupied) { cell = i; break; }
      }
      if (cell !== -1 && cells[cell].pathDist >= this.z.minPathDist) return cell;
    }
    return -1;
  }

  // One timer fire. Returns the placed cell (or -1) and the delay until the next fire.
  fire(mobs: SpawnMob[], cells: SpawnCell[]): { cell: number; kind: string | null; sleepS: number } {
    if (this.population(mobs) >= this.z.cap()) {
      return { cell: -1, kind: null, sleepS: this.cooldownS() };
    }
    const kind = this.nextKind();
    const cell = this.placeCell(cells);
    if (cell === -1) return { cell, kind: null, sleepS: this.z.retryS };
    return { cell, kind, sleepS: this.cooldownS() };
  }
}
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population: cap, spawn, respawn; server-side, since spawns must be authoritative). Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer). The donor has no despawn, so only the cap, respawn timer and placement gate map to row 23; despawn is a Frankendom design item.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: zones as data on one runtime (numbers per zone in the zone file); rules 7-9 n/a

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism, not translated from the donor lines.
- Time base: the donor counts game turns and a turn is the hero's action. Frankendom is real-time, so every number must be re-set in seconds. The one-turn retry has no equivalent; pick a short fixed delay and test it, do not port "1 turn".
- No despawn in the donor (grep). Row 23 asks for despawn on empty with a grace timer. That is not donor logic; design it ourselves and do not cite this donor for it.
- The cap is re-rolled on every check (`Random.Int` inside `mobLimit`). A Frankendom zone must store its cap per zone (or per wave) as data and read it, not re-roll it per tick, or the population will jitter and make kills feel random.
- The kind is popped from the bag before placement, so a failed placement loses a rotation entry and the mob object is dropped. Frankendom's one ledger should pop only on a successful spawn.
- The placement gate uses the hero's client field-of-view array (`heroFOV`). That is a single-player client value. Frankendom's camera is client-only and the server never reads it. The server needs its own visibility test (for example line of sight on the server map, or a zone rule). Do not port the field of view.
- The distance gate is walking distance (path map from the hero), not straight-line distance. Frankendom must use its own pathing; the 12-step number is a donor value and should be zone data.
- The amulet cooldown formulas and the Sundial multiplier are endgame and item effects. Drop them or express them as data with defaults; do not copy the constants.
- Population cap is not the same as MAX_ATTACKERS = 3. MAX_ATTACKERS limits simultaneous attackers in one fight; the zone cap limits how many enemies exist on the map. Do not merge the two.
- The donor is single-player. Spawn authority, server verification and the kill ledger are not in this code at all.

Best transferable idea: a zone spawner that is a timer actor: each fire checks a weighted enemy cap, places one enemy at a walking distance of at least 12 steps from the player and out of sight, then sleeps for a cooldown, with a short retry on failure.
Decision (proposed): adapt - the shape (cap check, cooldown wheel, out-of-sight and minimum-distance placement, bag of kinds) fits row 23, but the numbers go to zone data, the cap is stored not re-rolled, the kind is popped only on success, and the timing is in seconds.
Acceptance: server test with a zone cap of 6 and a 20 s cooldown: after kills drop the population from 6 to 4, no spawn happens in the 20 s after a success, the population never exceeds 6 at any tick, and every spawn is at walking distance of at least 12 and outside the player's line of sight on the server map.
