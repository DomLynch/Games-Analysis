# alexbatalov-fallout1-ce (zones-world, cell 2)

Donor: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/worldmap.cc` (with `src/game/map.cc`) | Licence: Sustainable Use License 1.0 (`LICENSE.md`: use "only for your own internal business purposes or for non-commercial or personal use"; restricted, not OSI) | C | symbol `world_map` (encounter block 1548-1640), `CalcTimeAdder`, `WorldEcountChanceTable`

Checked: The hint was INFERRED (no file given). I grepped `src/` for encounter, transition, wmap, spawn and zone words; hits were `src/game/worldmap.cc`, `src/game/map.cc`, `map.h`, `object.cc`, `scripts.cc`, `gdialog.cc`. Read in full: the random-encounter block `worldmap.cc` 1548-1640 (the step counter, 3d6 tier roll, special gate, d100 pick), the map pick and load 2097-2160, and the tables 250-306 and 495-532. Read in part: `worldmap.cc` 214-250, 1020-1032 (session reset), 1400-1432 (movement loop head), 1820-1832, 3665-3734 (`worldmap_script_jump`, `CalcTimeAdder`); `map.cc` 1224-1230 and 1287-1288 (exit-transition store and arrival). Not read: `world_move_step` and the terrain-cost branches of the movement loop, the save/load of the rest of the world map, `map.cc` `map_check_state` beyond 1288, `object.cc`, `scripts.cc`. Candidates opened for this topic: `worldmap.cc`, `map.cc` (plus grep only of `map.h`, `object.cc`, `scripts.cc`, `gdialog.cc`). Callers: the encounter block is inside the world-map loop of `world_map` (1020-1032 reset at entry); `worldmap_script_jump` (3665) runs a separate movement loop that does not roll encounters (3704-3712 show only the mile heal). Confidence: high on the encounter roll, the special budget and the map pick; medium on transitions (only the exit store and arrival were read). Not a camera cell, so no camera_scope. Licence is restricted, so this is clean-room, shape only.

Best transferable idea: Make encounter risk a per-zone tier checked every N travel steps, with a once-per-character budget of unique encounters held in the ledger, so a rare special cannot repeat.
Decision (proposed): adapt - the per-zone tier roll on a travel interval and the once-per-character unique pool fit zones as data and the one ledger; the donor's 3d6 curve, luck and perk gate and skill-scaled interval are shape only and would be zone or engine data we set ourselves; no donor code or tables are taken (restricted licence).
Acceptance: A server test walks one character 1000 travel steps through a top-tier zone and asserts that encounters appear only outside town zones, and that a unique encounter id appears at most once in the character ledger across a save and a reload.

## 1. Mechanism

- Trigger: travel steps. The world map keeps a step counter (`wmap_mile`). Every movement sub-step increments it (1562 is inside the movement loop that runs at most twice per pass, 1426). When it reaches `wmap_day` the counter resets and the encounter check runs (1562-1564; the party also gets a rest heal of 24 at the same point).
- Interval: `wmap_day` is set from the Outdoorsman skill, capped at 100: `(skill/100) x 60 + 60` (3725-3729). So the interval runs from 60 to 120 steps. Time per step is `864000 / wmap_day`, cut by 25% per Pathfinder level (3730, 3733). The second line is a time model, not an encounter rule.
- Zone tier: each check rolls 3d6 (1566-1568). The tier is the 30 by 28 grid cell at `[y/50][x/50]` of the world map (`WorldEcountChanceTable`, 300-301; index at 1570). Tier 0 fires when the sum is below 6, tier 1 below 7, tier 2 below 9, tier 3 below 10 (1572, 1577, 1582, 1587). Town cells never set the encounter flag (1569), although the roll itself still happens.
- Special gate: if an encounter fires, the code rolls 3d6 again, subtracts 5, adds the Luck stat and 2 per Explorer perk level (1597-1602). A special is offered only when the result is at least 18 (1603). The gate also passes to a plain encounter when all six specials are already used (`encounter_specials == 63`, 1603).
- Special pick: a d100 roll selects one of six ranges (`SpclEncRange`, 256-262, with the value table at 256-262 and the roll at 1608). If that special's bit is already set in `encounter_specials`, the inner loop breaks and the whole gate starts again from the 3d6 roll (1610-1613; the outer `while (v142 == 0)` at 1596 repeats). If the range is free, its bit is set (1616) and `special_enc_num` names the fixed map (1618).
- Budget: `encounter_specials` is a six-bit mask. It is cleared when the world map initialises (892), and it is written to and read from the save (911, 926). So each special fires at most once per save.
- Map pick: a special loads its fixed map from `spcl_map_name` (2134). A plain encounter takes the terrain from `WorldTerraTable` (2140), then picks a slot 0 to 2 at random and rerolls while the slot is empty (2142-2146). Each terrain has one to three map names (497-518); the table has a non-empty slot in every row, so the reroll ends. The value of a second 30 by 28 table, `WorldEcounTable` (334), for the same cell is stored as the world-terrain global (2126, 2138); what that value means was not read.
- Arrival and exit (`map.cc`): leaving a map stores the transition in `map_state` (1230). On arrival the dude is moved to the stored tile and elevation (1287-1288).

## 2. Key functions

- Encounter block: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/worldmap.cc` 1555-1623 (step counter, 3d6 tier, special gate and pick). The enclosing movement loop is 1423-1639.
- Interval and time: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/worldmap.cc` 3720-3734 (`CalcTimeAdder`).
- Map pick and load: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/worldmap.cc` 2097-2160 (special map, terrain map with reroll, world global for the tier).
- Budget save and load: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/worldmap.cc` 906-937 (`save_world_map`, `load_world_map`), with the reset at 892.
- Exit store and arrival: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/map.cc` 1224-1230 and 1287-1288.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant |
|---|---|
| Check every N travel steps; N rises with a skill | N = 60 + 0.6 x skill, skill capped at 100 (theirs, `worldmap.cc` 3725-3729) |
| Per-zone chance tier, checked by a dice sum | 3d6; limits 6 / 7 / 9 / 10 for tiers 0 to 3 (theirs, 1572-1587); grid 30 by 28 cells of 50 tiles (theirs, 300, 1570) |
| No encounter in a town cell | Rule (theirs, 1569) |
| Rare special gate that luck and a perk shift | 3d6 - 5 + Luck + 2 x Explorer, must reach 18 (theirs, 1597-1603) |
| Unique-encounter budget, once per save | Six d100 ranges; mask value 63 means all used (theirs, 256-262, 1603, 1611) |
| Reroll the gate when a used special is picked | Rule (theirs, 1610-1613, outer loop 1596) |
| Random map from a terrain slot list, reroll empty | Three slots per terrain (theirs, 497-518; 2142-2146) |
| Time per step | 864000 / N, minus 25% per Pathfinder level (theirs, 3730, 3733); game-clock units not checked |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order: a town check and the 3d6 tier first, then the special gate (rolled before the d100 pick), then the reroll when a used range comes up, then the plain terrain outcome. It omits the step counter itself, the rest heal, the time-per-step model, the world global set for the tier, the map loading, and the save file. It bounds the gate loop at 1000 attempts (the donor loops until a special or a plain outcome; with all six used it exits at once). It throws instead of looping forever when a terrain has no map (the donor's loop cannot end in that case, but its table has none). Numbers are passed in as zone data or engine values, not copied from the donor's tables.

```ts
// Licence: Sustainable Use License 1.0 (donor fallout1-ce). Clean-room: shape only; no donor code or tables copied.
type Roll = (sides: number) => number; // returns 1..sides
type Encounter = { kind: "none" } | { kind: "terrain" } | { kind: "special"; id: number };
type SpecialRange = { id: number; lo: number; hi: number }; // d100 range that picks this special

// Ledger for one character: which unique specials have already fired (donor: a bitmask saved with the game).
interface Ledger { usedSpecials: Set<number>; }

function dice3d6(roll: Roll): number {
  return roll(6) + roll(6) + roll(6);
}

// Travel steps between checks: a skill raises the interval (donor: 60 plus 0.6 x skill, skill capped at 100).
function stepsPerCheck(skill: number, base: number, perSkillPoint: number): number {
  return Math.floor(base + perSkillPoint * Math.min(skill, 100));
}

// Called once per check. Zone tier is zone data: a 3d6 sum below tierLimit starts an encounter.
function checkEncounter(
  ledger: Ledger,
  roll: Roll,
  inTown: boolean,
  tierLimit: number,
  luck: number,
  explorerLevel: number,
  specials: SpecialRange[],
): Encounter {
  if (dice3d6(roll) >= tierLimit || inTown) {
    return { kind: "none" };
  }

  // Rare gate: the 3d6 sum, shifted by luck and a perk, must reach 18 before a special can fire.
  for (let attempt = 0; attempt < 1000; attempt++) {
    const gate = dice3d6(roll) - 5 + luck + 2 * explorerLevel;
    if (gate < 18 || ledger.usedSpecials.size === specials.length) {
      return { kind: "terrain" };
    }
    const pick = roll(100);
    const hit = specials.find((s) => pick >= s.lo && pick <= s.hi);
    if (hit !== undefined && !ledger.usedSpecials.has(hit.id)) {
      ledger.usedSpecials.add(hit.id);
      return { kind: "special", id: hit.id };
    }
    // Range already used (or none matched): the donor starts the gate again.
  }
  return { kind: "terrain" };
}

// Normal encounter: take one of the terrain's map slots at random, rerolling empty slots.
function pickTerrainMap(slots: (string | null)[], roll: Roll): string {
  if (slots.every((s) => s === null)) {
    throw new Error("terrain has no encounter map");
  }
  for (;;) {
    const name = slots[roll(slots.length) - 1];
    if (name !== null) {
      return name;
    }
  }
}
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population: the per-zone encounter tier and the once-per-character unique pool, as zone data and a ledger record). Parity-checklist row 23 (zone population). Against row 23 the donor has a tier per zone and a budget that stops repeats; it has no respawn timer and no despawn grace, and this is a travel roll, not a population cap.
- Reuse tag: rewrite-from-idea (restricted licence: clean-room, shape only; no donor code or tables)
- Brief rule served: row 23; zones as data (tier limit per zone); one ledger (the unique-pool record lives with the character, server-verified).

## 6. Gaps and risks

- The donor rolls per travel step and the step count is also the clock for time; Frankendom has no travel-step counter. The server needs a defined step (or a move-distance unit) for the check, and the check must be a server event so a client cannot skip it.
- The donor's unique pool is a bitmask in the save, which is client-side in the donor. Under one ledger and server-verified rules, the record belongs to the character on the server; the donor shows only the shape.
- The 3d6 curve is the donor's game feel. Frankendom should set tiers as explicit probabilities per zone rather than port the dice; the donor gives no reason for its numbers, so do not claim its feel.
- The loop's `while (v142 == 0)` has no bound in the donor. The sketch bounds it; the server must also bound it, or it can spin on a full pool.
- Skill and perk modifiers come from the character sheet. Frankendom has no skill model in the duel; only the interval and gate shape transfer.
- A town cell is excluded from encounters (1569) but the roll still happens; a server version should skip the roll entirely in a town so no state changes.
- Transitions: only the exit store and the arrival tile (`map.cc` 1230, 1288) were read. The rest of `map_check_state` and the walk-out path were not read, so the zone-transition rules are not verified.
- The donor's time model (864000 over the interval) is in game-clock units that are not checked against any Frankendom clock; do not transfer the constant.
