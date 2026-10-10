# angband-angband (loot-drops, cell 3)

Donor: `/mnt/frankendom-donors/angband-angband/src/mon-make.c` (`mon_create_drop_count` 699-743, `mon_create_drop` 751-893, spawn call 1046) with `src/mon-util.c` (`monster_death` 952-1009, `monster_carry` 1371-1403) and `src/obj-make.c` (`get_obj_num` 1114-1146, `make_object` 1162-1234) | Licence: GPL v2 option, dual with the "Angband licence" (both stated in the file headers of mon-make.c, mon-util.c and obj-make.c; no top-level COPYING file in the donor). Treated as copyleft: clean-room, shape only | C | symbol `mon_create_drop`

Checked: Opened and read `mon-make.c` 690-905 (functions end at 743 and 893) (`mon_create_drop_count` and `mon_create_drop`; the quest-artifact loop at 800-825 read in part), 1020-1050 (the spawn call), `mon-util.c` 945-1000 (`monster_death`, read to the drop loop; the treasure note after it not read) and 1371-1400 (`monster_carry`, first 30 lines), `obj-make.c` 1060-1200 (`get_obj_num`, `make_object` up to the kind choice at 1186). Not read: `apply_magic` and artifact creation inside `make_object`, `drop_near` in `obj-pile.c`, the `monster_death` tail. Callers: grep shows `mon_create_drop` is called once (1046, from the spawn path); `monster_death` is the death path. camera_scope: not applicable (no camera). Confidence: high on the order of rolls and the numbers (read in code); medium on the item-kind allocation, which is only read to the kind choice.

## 1. Mechanism

- Drops are rolled once, when the monster is created in the dungeon, and carried on the monster. Nothing is rolled at death. The spawn path calls `mon_create_drop` only when an origin is passed (1045-1046); with origin 0 (loading a saved level) no drop is created.
- Order of rolls inside `mon_create_drop` (as the code runs):
  1. Count: `mon_create_drop_count` (non-maximize branch) adds random items from the race's drop flags: 20/40/60 percent flags add one item each on a percent roll (721-723); the 4, 3 and 2 flags add a random count (rand 2..6, 2..4, 1..3) (724-726); the 1 flag adds one (727).
  2. Level: `monlevel` is the race level, or min(level+15, level*2) for a unique (785), and the drop level is max((monlevel + depth)/2, monlevel) capped at 100 (791-792).
  3. Specific entries (the race's own drop list): each entry passes on `randint0(100) < percent_chance` (831). A passing entry makes `randint0(max-min) + min` of its kind, or an item of its tval (831-860 region, read in part).
  4. Counted items: for each counted slot, gold if items are barred, or 50/50 gold/item when both are allowed (868); otherwise `make_object` at the drop level (871).
- Carry: each made object goes to `monster_carry` (1371). A mergeable stack already held is absorbed into the held stack (1378); otherwise the object is linked into the monster's held list (1391-1399).
- Death: `monster_death` walks the held list and drops every object at the monster's grid through `drop_near` (993). The origin tag only decides the dump count; an invisible monster's drops have their origin tag reset to unknown (990-991). No owner or protection timer is set anywhere in this path.

## 2. Key functions

- `mon_create_drop_count`: `/mnt/frankendom-donors/angband-angband/src/mon-make.c` 699-743. Random count from the flags and the entry counts.
- `mon_create_drop`: same file, 751-893. Level, unique bonus, specific entries, counted items, gold/item split.
- Spawn call: same file, 1020-1050; the `mon_create_drop` call is at 1045-1046.
- `monster_death`: `/mnt/frankendom-donors/angband-angband/src/mon-util.c` 952-1009. Drops the held list at death (read to 1000).
- `monster_carry`: same file, 1371-1403. Merge or link a carried object (read to 1400).
- `get_obj_num` and `make_object`: `/mnt/frankendom-donors/angband-angband/src/obj-make.c` 1114-1146 and 1162-1234 (read to 1200). Level boost, base level, kind choice.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Random extra items from flags: each flag is a percent roll (+1) or a random count range | Percent flags 20, 40, 60 (theirs, mon-make.c 721-723); count ranges 2..6 (`drop_4_max` = 6, line 704), 2..4 (`drop_3_max` = 4, line 705), 1..3 (`drop_2_max` = 3, line 706; ranges at 724-726) |
| Each specific entry is an independent percent roll, then a count in [min, max-1] | Count is `randint0(max-min)+min` (theirs, mon-make.c 731): the upper bound is excluded, so a min-max range of 1..3 yields 1 or 2 |
| Drop level is the mean of monster level and depth, never below the monster level, capped | Unique bonus min(level+15, level*2) (theirs, mon-make.c 785); cap 100 (mon-make.c 792) |
| Uniques lose drop count by a stolen count | `number - lore->thefts` (theirs, mon-make.c 779); only for uniques |
| Gold or item split | 50 percent gold when both allowed (theirs, mon-make.c 868) |
| Good items use level plus 10 | `base = lev + 10` when good (theirs, obj-make.c 1182); artifact roll 1 in 10 when good, 1 in 1000 otherwise (theirs, obj-make.c 1170) |
| Occasional level boost in item choice | One-in-`great_obj` roll (theirs, obj-make.c 1121) rescales the level (1123) |

## 4. TypeScript sketch

simplified: keeps the donor's order of random draws: the flag count first, then each specific entry's percent roll and count, then one gold-or-item decision per counted slot; drops are carried at spawn and released on death. It omits the unique theft reduction, the quest-artifact loop, the choice of item kind (`make_object`, `get_obj_num`, artifacts, `apply_magic`), the mimic and polymorphed-race cases (`original_race`), the origin tags, and the `drop_near` placement. The count range is [min, max-1] as the donor's `randint0` gives.

```ts
// Licence: GPL-2.0 option of the donor (dual with the Angband licence). Clean-room sketch of the mechanism; no donor lines copied.
interface Rng {
  below(n: number): number;            // 0..n-1
  between(lo: number, hi: number): number; // lo..hi inclusive
}

interface DropFlags { drop20: boolean; drop40: boolean; drop60: boolean; drop4: boolean; drop3: boolean; drop2: boolean; drop1: boolean; }
interface DropEntry { chance: number; min: number; max: number; kind: string; } // chance is a percent
interface Race { level: number; flags: DropFlags; entries: DropEntry[]; onlyGold: boolean; onlyItem: boolean; }
interface Drop { kind: string; count: number; level: number; }

const DROP4_MAX = 6;
const DROP3_MAX = 4;
const DROP2_MAX = 3;

// Level the drops are made at: the mean of monster level and depth, never below the monster level, capped at 100.
function dropLevel(monLevel: number, depth: number, unique: boolean): number {
  const base = unique ? Math.min(monLevel + 15, monLevel * 2) : monLevel;
  return Math.min(Math.max(Math.floor((base + depth) / 2), base), 100);
}

// Random item-count from the flags, plus each specific entry that passes its percent roll.
function rollCounts(race: Race, rng: Rng): number {
  const f = race.flags;
  let n = 0;
  if (f.drop20 && rng.below(100) < 20) n++;
  if (f.drop40 && rng.below(100) < 40) n++;
  if (f.drop60 && rng.below(100) < 60) n++;
  if (f.drop4) n += rng.between(2, DROP4_MAX);
  if (f.drop3) n += rng.between(2, DROP3_MAX);
  if (f.drop2) n += rng.between(1, DROP2_MAX);
  if (f.drop1) n++;
  return n;
}

// Rolled once at spawn and carried by the monster; nothing is rolled at death.
function rollSpawnDrops(race: Race, depth: number, unique: boolean, rng: Rng): Drop[] {
  const level = dropLevel(race.level, depth, unique);
  const out: Drop[] = [];
  const n = rollCounts(race, rng);
  for (const e of race.entries) {
    if (rng.below(100) >= e.chance) continue;
    out.push({ kind: e.kind, count: rng.below(e.max - e.min) + e.min, level });
  }
  for (let j = 0; j < n; j++) {
    // Gold or item: gold only if items are barred, or 50/50 when both are allowed.
    const gold = !race.onlyItem && (race.onlyGold || rng.below(100) < 50);
    out.push({ kind: gold ? "gold" : "item", count: 1, level });
  }
  return out;
}

// On death every carried drop lands on the monster's cell. No owner is recorded.
function onDeath(carried: Drop[]): Drop[] {
  return carried.slice();
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (run this turn, after the order fix).

## 5. Lands in

- TARGET `src/fight/loot.ts` (drop roll and carried drops; server side). Parity-checklist row 18 (loot roll and XP award). The spawn-time roll is the zone-population step (row 23) and the zone drop counts are zone data. Cite row 18 for the loot; row 23 applies to the spawn that carries it.
- Reuse tag: rewrite-from-idea (GPL-2 option; clean-room only, shape not code)
- Brief rule served: server-verified kills and one ledger: the roll is made once, on the server, when the creature is made, so a death cannot re-roll it.

Best transferable idea: Roll a monster's drop list once when it is created on the server, carry it on the creature, and release exactly that list on death so a kill cannot re-roll the loot.
Decision (proposed): adapt. Take the spawn-time roll stored on the creature and released on death: the server rolls once and a client cannot re-roll by dying, which fits server-verified kills. Take the flag-to-count rule and the level formula as zone data. Reject the Angband item economy numbers (50/50 gold, 1 in 1000 artifact) as they stand; Frankendom sets its own.
Acceptance: a server test spawns a creature with a percent entry, reads its carried drops, kills it, and asserts that exactly the spawn-time list is dropped on its cell with no re-roll; a player sees the pile where the creature fell.

## 6. Gaps and risks

- The drop list is fixed at spawn, so a creature that spawns and is never killed still holds a roll. Frankendom must decide whether a despawn on the zone grace timer (row 23) discards it.
- Angband has no owner or protection rule on drops (the origin tag only marks where the item came from). Frankendom's loot ownership and any party share are not in this donor.
- The count range is [min, max-1]; a copied table with max = min+1 always yields min. Frankendom must choose inclusive or exclusive and test it.
- Item kind choice (`get_obj_num`, `make_object`) is an allocation table and artifact system that was only read to the kind choice. Not needed for zone loot; not read further.
- The donor is GPL v2 or the Angband licence (non-profit clause in the header). Clean-room only.
