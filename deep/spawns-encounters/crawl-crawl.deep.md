# crawl-crawl (spawns-encounters, cell 4)

Donor: /mnt/frankendom-donors/crawl-crawl/crawl-ref/source/dungeon.cc | Licence: GPL-2 | C++ | symbol _builder_monsters / _num_mons_wanted (opened: _builder_monsters 4391-4446, _num_mons_wanted 1776-1794)

## 1. Mechanism

- Monsters are placed once, at level generation, not on a timer. `_build_dungeon_level()` (dungeon.cc 2868-2969) calls `_builder_monsters()` at line 2935, after vault placement, uniques, traps and `_dgn_verify_connectivity` (2932) and before `_builder_items()` (2938). `builder()` (247) is the outer entry; the call into `_build_dungeon_level` is not on its first lines and was not read.
- Input: the branch and depth being built, the player's entrance position, and the level's map-mask markers (cells marked `MMT_NO_MONS` are excluded).
- `_builder_monsters` returns at once in the Temple branch. `_num_mons_wanted()` (1776-1794) returns 0 for disconnected branches (other than Pandemonium) and for branches with no monsters. Otherwise it rolls `roll_dice(3, _mon_die_size())`, caps the result at 60, and for Zot depth 5 takes `max(10, n - 4)`. `_mon_die_size` (1730-1773) is a per-branch table value; for the main Dungeon it is a per-depth switch (12 at depth 1 down to 4 at depth 10, then up to 6, default 12); Lair depth 5 uses the default die.
- Each monster gets a behaviour and a proximity rule. At absolute depth 0 it sleeps and must stay away from the entrance. Else in a connected branch, 1 in 8 keeps the default behaviour (the `mgen_data` constructor default is `BEH_HOSTILE`, in mgen_data.h, so awake) and is kept away from all stairs. Else (not Pandemonium) it sleeps, and at the delver starting depth it stays away from the entrance. Pandemonium monsters keep the default awake behaviour. Bands are permitted and cells marked `MMT_NO_MONS` are excluded.
- `place_monster` (mon-place.cc 631-833): refuses if the level already holds `MAX_MONSTERS - 1` monsters (line 643), picks a random in-bounds cell, retrying up to 45 times until `_valid_monster_generation_location` passes (stairs or entrance within `LOS_RADIUS`, lines 581-607) and the cell is not masked, then places the monster and, if a band is wanted, its members around it.
- After the loop: aquatic monsters are placed (`_place_aquatic_monsters`, 4299-4337; skipped in Shoals, Abyss, Pandemonium, Zot and Dungeon depth below 6), unless in the Crypt, where `_place_assorted_zombies` (4361) is called instead.
- Output: sleeping or awake monster objects on the level grid. Nothing ticks; the level is fixed after build.

## 2. Key functions

| Name | Path | Lines | What it does |
|---|---|---|---|
| _build_dungeon_level (calls _builder_monsters at 2935) | /mnt/frankendom-donors/crawl-crawl/crawl-ref/source/dungeon.cc | 2868-2969 | Runs _builder_monsters after the connectivity check, before items |
| _builder_monsters | /mnt/frankendom-donors/crawl-crawl/crawl-ref/source/dungeon.cc | 4391-4446 | Loops the wanted count, sets behaviour and proximity per monster, places it |
| _num_mons_wanted | /mnt/frankendom-donors/crawl-crawl/crawl-ref/source/dungeon.cc | 1776-1794 | Chooses the monster count from 3d(die), capped at 60 |
| _mon_die_size | /mnt/frankendom-donors/crawl-crawl/crawl-ref/source/dungeon.cc | 1730-1773 | Returns the die size for the branch, with a depth table for the Dungeon |
| place_monster | /mnt/frankendom-donors/crawl-crawl/crawl-ref/source/mon-place.cc | 631-833 | Places one monster plus its band; checks the monster cap; 45 position tries |
| _valid_monster_generation_location | /mnt/frankendom-donors/crawl-crawl/crawl-ref/source/mon-place.cc | 543-613 (proximity checks at 581-607) | Rejects cells near stairs or the entrance according to the proximity flag |
| _place_aquatic_monsters | /mnt/frankendom-donors/crawl-crawl/crawl-ref/source/dungeon.cc | 4299-4337 | Places water monsters after the main loop |

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Count from a dice roll with a hard cap, adjusted per location | 3d(die), cap 60 (theirs) |
| Per-location die size table, default for the main path | Die size from branch table (theirs) |
| Awake/asleep split by a 1-in-8 roll, placement kept away from entrance or stairs | 1-in-8 chance (theirs) |
| Build-time placement, no tick | Level is fixed after build (theirs) |

## 4. TypeScript sketch

Licence: GPL-2. CLEAN-ROOM sketch: written from the mechanism above, not translated from the donor.

simplified: bands, the 45-try position search and the monster cap (the `place` callback hides them); the Temple early return, the Zot depth 5 adjustment and the aquatic / zombie pass are omitted; the die size is passed in instead of read from the branch and depth table; 'awake' means the default hostile behaviour.

```ts
// clean-room sketch of build-time encounter placement.
// Licence line: GPL-2 donor; this sketch is clean-room, written from mechanism only.
type Behaviour = 'asleep' | 'awake';
type Proximity = 'any' | 'away-from-entrance' | 'away-from-stairs';
interface Placement { behaviour: Behaviour; proximity: Proximity; }
const CAP = 60;                 // theirs: maximum count
const AWAKE_ONE_IN = 8;         // theirs: awake chance in connected branches
function rollDice(count: number, sides: number, rnd: () => number): number {
  let total = 0;
  for (let i = 0; i < count; i++) total += 1 + Math.floor(rnd() * sides);
  return total;
}
function wantedCount(dieSize: number, rnd: () => number): number {
  return Math.min(CAP, rollDice(3, dieSize, rnd));
}
function choosePlacement(
  isFirstLevel: boolean,      // absolute depth 0 (D1)
  isStartingDepth: boolean,   // the depth the player begins on (can differ from D1)
  connected: boolean,
  alwaysAwakeBranch: boolean, // Pandemonium: never asleep
  rnd: () => number,
): Placement {
  if (isFirstLevel) return { behaviour: 'asleep', proximity: 'away-from-entrance' };
  if (connected && Math.floor(rnd() * AWAKE_ONE_IN) === 0) {
    return { behaviour: 'awake', proximity: 'away-from-stairs' };
  }
  if (alwaysAwakeBranch) return { behaviour: 'awake', proximity: 'any' };
  return { behaviour: 'asleep', proximity: isStartingDepth ? 'away-from-entrance' : 'any' };
}
// Build-time: run once per level after connectivity is verified.
function buildEncounters(
  dieSize: number,
  isFirstLevel: boolean,
  isStartingDepth: boolean,
  connected: boolean,
  alwaysAwakeBranch: boolean,
  rnd: () => number,
  place: (p: Placement) => boolean,
): number {
  const n = wantedCount(dieSize, rnd);
  let placed = 0;
  for (let i = 0; i < n; i++) {
    if (place(choosePlacement(isFirstLevel, isStartingDepth, connected, alwaysAwakeBranch, rnd))) placed++;
  }
  return placed;
}
```

## 5. Lands in

- TARGET origins/mobs/populate.ts (camps from rows + zone Params + seed; the zone's `density.creatures` budget replaces the donor's dice, so only the sleep/awake split and the away-from-stairs/entrance proximity rule are new). Checklist row 4 (fight loop: aggro, chase, leash) for the sleep-or-awake start state; the engaged-attacker cap lives in src/fight/world.ts (`MAX_ATTACKERS`, today there already). Creature actor and clips are origins' own copy (row 7).
- Parity-checklist row: 4.
- Reuse tag: adapt
- Brief rule served: 4 (zones are data on one runtime); rules 7-9 n/a

## 6. Gaps and risks

- MAX_ATTACKERS = 3: the donor's count (up to 60 per level, plus bands) says nothing about how many fight the player at once, because Crawl monsters act on their own turns. Frankendom's camps may hold more than 3 creatures, but at most 3 may be engaged on one player and the rest must hold at the ring (src/fight/world.ts). A camp count is therefore meaningful even though each fight is a duel.
- Zones as data: the donor's count comes from code (a per-depth die table). Frankendom's count comes from the zone's `density.creatures` and `footprint`; a die table must not be copied into code.
- Server-verified kills: placement must use the seeded stream (origins/mobs/populate.ts is pure and seeded) so the server can recompute which creatures exist; the donor's `one_chance_in(8)` draws from the shared RNG.
- One engine: sleep/awake is decided once at build in the donor. Frankendom's wake and aggro rules are the shared brain's (src/fight/ai.ts, row 2 and row 4); placement data may only set the start state.
- Conflict check: build-time placement in a client file would split the one-engine rule. The placement must come from zone data on the server.
