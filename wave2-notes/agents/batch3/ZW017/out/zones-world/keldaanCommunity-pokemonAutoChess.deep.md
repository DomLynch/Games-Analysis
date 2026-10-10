# keldaanCommunity-pokemonAutoChess (zones-world, cell 2)

Donor: /mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/core/mini-game.ts (roll and lock at 265-297; timer at 312-325) | table: /mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/config/game/town-encounters.ts 17-81 | RNG: /mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/utils/random.ts 15-37 | Licence: GPL-3.0 per the LICENSE file (header "Version 3, 29 June 2007"); package.json says "BSD-3-Clause". The two conflict; treated as copyleft, clean-room only | TypeScript | symbol `MiniGame.initialize`

Checked: The hint file gen/generate-maps.ts (13 lines, read in full) is an export script that writes Tiled JSON samples from app/core/design.ts. It is not the zone spawn mechanism. The per-zone spawn table is app/config/game/town-encounters.ts 17-81 (read in full) and is rolled in app/core/mini-game.ts 265-297 (read in full), with the timer at 299-330 (read) and the RNG at app/utils/random.ts 15-37 (read in full). Callers read: app/rooms/commands/game-commands.ts 2050-2052 and app/rooms/game-room.ts 713-730. Also read: app/rooms/states/game-state.ts 64, app/config/game/stages.ts 22-23, LICENSE (header), package.json (licence field), app/core/design.ts (279 lines, read in full; see section 6), app/config/maps/regions.ts 1-60 (region metadata only). Not read: app/models/pve-stages.ts beyond its header (1-30), the per-encounter effects in mini-game.ts 318-430, the update loop 463-520, the client (app/public/src/game/components/board-manager.ts; only the music lookup seen in grep), the stop path (832+). Other callers of initialize were not searched beyond the two found. Confidence: high on the roll, the lock and the spawn position; high on the timer; the stage totals in section 3 are my arithmetic from the table, not a donor constant.
Best transferable idea: Give each zone a weighted spawn table whose leftover mass means "nothing spawns", and lock each entry to once per run so that a repeat roll is voided rather than rerolled.
Decision (proposed): adapt - Frankendom needs a zone population rule with a per-run cap, and a table with explicit empty mass is a cheap, checkable designer knob; adapt rather than copy because the donor's void-on-repeat lowers the real rate through a run, so Frankendom must either publish the effective per-run rate or reroll on purpose.
Acceptance: Server test: for a zone table whose entries sum to 0.475, 10,000 seeded rolls give an entry on 47.5 percent of rolls (within 1 point) and none on the rest; after entry X has spawned once, every later roll that picks X returns none, and the run's spawn list holds X once.

## 1. Mechanism

- Entry: a town phase starts with `initializeTownPhase` (game-commands.ts 2050-2052), which sets the phase and calls `miniGame.initialize`. Game start also calls the same method (game-room.ts 729, inside `startGame` at 713). Stage 0 has no table, so it rolls nothing.
- Table gate (mini-game.ts 270): only stages present in the table roll. The table has six keys: 4, 12, 17, 22, 27, 34 (town-encounters.ts 20, 32, 44, 55, 66, 74). Any other stage clears the encounter (296).
- The roll (271-274): `randomWeighted(table, 1)` on every stage except the festival rule, which passes no total (273). In random.ts, when no total is given the total is the sum of the weights (22-27). A uniform draw is scaled by the total (the luck and apScaling factors are 1 because the defaults are 0; random.ts 28-32). Entries are subtracted in table order, and the first entry that drives the value below zero wins (33-34). If no entry does, the result is null (36). So the mass the table does not cover is "no encounter".
- Once-per-run lock (276-281): if the pick is not null, the game is not a festival, and the pick is already in `state.townEncounters`, the pick becomes null. It is not rerolled. A new pick is added to the set (283-284). The set is a field of the game state (game-state.ts 64), so it lasts for one game.
- Spawn (282, 286-293): the pick is stored on the state, and a static circle of radius 20 is added at the town centre. The table chooses which encounter appears. It never chooses where.
- Town clock (312-325): the base is 10000 ms with an encounter and 5000 ms without, plus 2000 ms times (alive players minus the player's rank) (313-314). The rank's direction (whether rank 1 is best) was not checked. Stage 0 is fixed at 12000 (316-317). Portal stages (`PortalCarouselStages` = [0, 10, 20], stages.ts 22) are fixed at 8000 (318-319). Stages below 5 use only the encounter test and drop the rank term (320-321). Bots add a random 1000 to 6000 ms (324-325).

## 2. Key functions

- `MiniGame.initialize`: /mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/core/mini-game.ts 265-297 (roll, lock, spawn circle). The retention timer is in the same method at 299-330.
- `randomWeighted`: /mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/utils/random.ts 15-37. Weighted pick with an optional total.
- `TownEncountersByStage`: /mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/config/game/town-encounters.ts 17-81. The per-stage table.
- Callers: /mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/rooms/commands/game-commands.ts 2050-2052 and /mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/rooms/game-room.ts 729.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Weighted pick over per-entry chances, with the leftover mass meaning "nothing" (random.ts 15-37 with total 1, mini-game.ts 273) | Total 1 (theirs, mini-game.ts 273); festival passes no total (same line) |
| Per-run cap of one per entry, voided not rerolled (mini-game.ts 276-281) | Cap 1 per game (theirs, mini-game.ts 280 comment) |
| Stage table: entries and chances (town-encounters.ts) | Stage 4: nine at 1/20 plus one at 1/40 (theirs, lines 21-30; the 1/40 is line 28). Stage 12: nine at 1/20 plus one at 1/40 (theirs, lines 33-42; the 1/40 is line 42). Stage 17: nine at 1/20 (lines 45-53). Stage 22: nine at 1/20 (lines 56-64). Stage 27: six at 1/20 (lines 67-72). Stage 34: five at 1/20 (lines 75-79) |
| Entry total per stage (arithmetic from the table: 0.475, 0.475, 0.45, 0.45, 0.30, 0.25) | Not a donor constant |
| Encounter block radius at the centre | 20 (theirs, mini-game.ts 286) |
| Town time: base with an encounter | 10000 ms (theirs, mini-game.ts 313) |
| Town time: base without an encounter | 5000 ms (theirs, mini-game.ts 313) |
| Town time: per step of (alive players minus rank) | 2000 ms (theirs, mini-game.ts 314) |
| Town time: stage 0 | 12000 ms (theirs, mini-game.ts 317) |
| Town time: portal stages | 8000 ms (theirs, mini-game.ts 319) |
| Bot extra time | 1000 to 6000 ms (theirs, mini-game.ts 325) |

## 4. TypeScript sketch

simplified: the sketch keeps the weighted pick (with and without a total), the once-per-run lock with void-not-reroll, and the festival switch. It omits the zone-entry call site, the encounter block circle, the town timer, the bot delay, the stage-number keys (the sketch uses a Map of zone ids), and the per-encounter effects. The donor's festival switch skips both the total and the lock; the sketch does the same. It does not guard against a zone table with a sum above 1.

```ts
// Licence: GPL-3.0 per the LICENSE file (package.json says BSD-3-Clause; treated as copyleft). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type SpawnTable<T extends string> = Partial<Record<T, number>>;

// Per-entry chances. With totalWeight given, the mass left over is "nothing spawns".
// Without it, the weights are normalised and an entry always comes up when the table is not empty.
function pickWeighted<T extends string>(table: SpawnTable<T>, totalWeight?: number): T | null {
  const entries = Object.entries(table) as [T, number][];
  const total = totalWeight ?? entries.reduce((sum, [, w]) => sum + w, 0);
  let r = Math.random() * total;
  for (const [item, weight] of entries) {
    if ((r -= weight) < 0) return item;
  }
  return null;
}

export class SpawnRun<T extends string> {
  private readonly seen = new Set<T>();

  constructor(
    private readonly zoneTables: Map<number, SpawnTable<T>>,
    private readonly festival: boolean = false
  ) {}

  // Rolled once per zone visit. An entry already seen in this run is voided, not rerolled,
  // so its share of the chance is lost for the rest of the run.
  rollZone(zone: number): T | null {
    const table = this.zoneTables.get(zone);
    if (table === undefined) return null; // zone has no table: nothing spawns
    let pick = pickWeighted(table, this.festival ? undefined : 1);
    if (pick !== null && !this.festival && this.seen.has(pick)) pick = null;
    if (pick !== null) this.seen.add(pick);
    return pick;
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/ZW017/pokemonautochess-spawn-table.ts) exited 0 with no output.

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (the row-23 engine module named in the addendum; the roll would be a function there, the table would be zone data). I did not read the Frankendom repo for this note, so the current file is (not read).
- Parity-checklist row 23 (zone population). Good fit: the once-per-run cap is a spawn cap of one, and the weighted table is the spawn chance. Row 23 does not cover the town timer; it is not a respawn or despawn rule.
- Reuse tag: rewrite-from-idea (GPL-3.0 per LICENSE file, package.json says BSD-3-Clause; clean-room only)
- Brief rule served: zones as data (the table is keyed per stage in the donor, so it is data, not code); server-verified (the roll and the lock run in the room's server state, mini-game.ts 265-297 and game-state.ts 64).

## 6. Gaps and risks

- Licence conflict: the LICENSE file is GPL-3.0 and package.json says BSD-3-Clause. Frankendom should treat it as GPL and write clean-room only.
- Void-not-reroll lowers the real rate through a run. After a stage-4 encounter X has spawned, a later stage-4 pick of X yields nothing, so the effective chance of an encounter falls each time an entry is used up (the arithmetic is in section 3). Frankendom must either publish the effective per-run rate or reroll on purpose, and test whichever it picks.
- The festival switch (mini-game.ts 273, 278) skips both the leftover mass and the lock. A special rule of that kind must be a flag in zone data with its own test, not a silent branch.
- The lock lives in the room's game state (game-state.ts 64), per game. For Frankendom it must live on the server's one run ledger. The donor does not persist it across a server restart (not read).
- The table picks which encounter, never where: the circle is always at the centre (mini-game.ts 286). Frankendom zones need a position per spawn, which this table does not give.
- The town timer (312-325) is the stage clock, not a respawn. Do not adopt it as respawn or despawn logic under row 23.
- The sketch and the donor both assume the total is at most 1. If a designer writes a table summing above 1, the donor's cumulative pick never reaches the later entries, and nothing reports it. Frankendom must validate table sums at load.
- Secondary idea, not written up as a note: app/core/design.ts (read in full) builds arena terrain from noise thresholds (96-98), then forces the arena rectangle to ground (107-119) and forces reserved slots to ground after the noise (143-162). Reserved anchors forced after generation are a layout idea that could place spawn anchors in arenas. It does not cover spawn tables and is not row 23.
- Not read: pve-stages.ts body (only 1-30), per-encounter effects (mini-game.ts 365-430), the update loop (463-520), the client (board-manager.ts), and the stop path (832+).
