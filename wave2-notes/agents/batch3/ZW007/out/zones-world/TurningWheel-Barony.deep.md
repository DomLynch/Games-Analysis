# TurningWheel-Barony (zones-world, cell 3)

Donor: `/mnt/frankendom-donors/TurningWheel-Barony/src/maps.cpp` (with the placement loop in `assignActions`, and the caller `src/actsummontrap.cpp`) | Licence: BSD-2-Clause (LICENSE.txt: "Barony Open Source License ... licensed under the BSD 2-Clause License", Copyright (c) 2013-2020, Turning Wheel LLC) | C++ | symbol `monsterCurve`

Checked: Read in full: `monsterCurve` (`maps.cpp` 291-596: the cheat override, every zone branch from The Mines to fortress, and the SKELETON fallback). The placement caller inside `assignActions` (6998): the placeholder branch (7863-7891), the custom-curve setup (7038-7046), and the seeded entity RNG call (7891). Also read: `actsummontrap.cpp` 107 (the only other call of `monsterCurve`, a summon trap). Not read: the definition and file format of `monsterCurveCustomManager` (only its call sites: `maps.cpp` 1301, 7040-7044, 7869; `actsummontrap.cpp` 88-181); `map_rng` and `map_server_rng` definitions; the placement loop beyond 7900; any stairs or floor transitions. Callers checked: `monsterCurve` has two callers (maps.cpp 7866 and actsummontrap.cpp 107). Confidence: high for the zone tables, the level gates and the order of rolls (all read end to end); medium for the placement loop (read only at the marker branch). In this donor "zone" means a named map (The Mines, The Swamp, The Labyrinth, The Ruins, Underworld, Hell, Caves, Citadel) or a fortress map file, and "level" means the depth (`currentlevel`). camera_scope: n/a (zones-world topic). No streaming: each level is built whole; no chunk loading was read in this cell.

## 1. Mechanism

- Placement: an editor marker with a fixed monster type keeps that type. A marker whose type is NOTHING gets its type from `monsterCurve(currentlevel)` (`maps.cpp` 7863-7866).
- `monsterCurve` first checks a cheat-only console override (293-304, only when `SV_FLAG_CHEATS` is set). Otherwise it picks the zone by the start of the map name, or by the map filename for fortresses (306-594, the zone branches in order). Each branch rolls `map_rng.rand() % N` (N = 10, 20 or 15; 4 for fortress) and maps the roll to a monster by band. Some bands read the level or draw again: The Mines (321, 330), Caves (482, a second table from level 27 on), Ruins (408: a second roll decides bugbear or vampire), Hell (456: on a map whose name contains "Boss", the imp band becomes a demon). Anything not matched falls back to SKELETON (595).
- Level gate by substitution: below level 2 The Mines puts a skeleton in the spider and troll bands (321 and 330). The table keeps its 10 slots, so the skeleton share rises from 40 to 60 percent; nothing is re-rolled.
- Custom curve: when the map has a custom curve (the check at 7044 uses the map name), a flag `customMonsterCurveExists` is set at map build (7038-7046). At each placeholder marker the base curve is rolled first (7866), which consumes the level stream. If the flag is on, the custom roll is taken (7869). If the custom roll returns NOTHING, the flag is switched off for the rest of this map build (7876), so the custom curve can only override until its first empty roll.
- Determinism: the layout rolls come from one level stream (`map_rng`). Each monster then gets its own RNG seeded from the server-side map RNG (7891). So the order in which markers are placed decides which roll each monster gets.

## 2. Key functions

- `monsterCurve`: `/mnt/frankendom-donors/TurningWheel-Barony/src/maps.cpp` 291-596. The whole per-zone table, with the level gates and the SKELETON fallback.
- Placeholder branch in `assignActions`: `/mnt/frankendom-donors/TurningWheel-Barony/src/maps.cpp` 7863-7891. Base roll, custom override with the switch-off flag, seeded entity RNG.
- Custom-curve setup: `/mnt/frankendom-donors/TurningWheel-Barony/src/maps.cpp` 7038-7046 (inside `assignActions`, which starts at 6998).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants (theirs) |
|---|---|
| Zone table = modulus and bands of roll ranges | The Mines: N = 10; RAT 0-3 (40%), SKELETON 4-7 (40%), roll 8 SPIDER (10%), roll 9 TROLL (10%), both gated to level 2 and up, else SKELETON (`maps.cpp` switch at 308; gates at 321 and 330) |
| The Swamp: N = 10; SPIDER 20%, GOBLIN 30%, SLIME 30%, GHOUL 20% (switch at 343) |
| The Labyrinth: N = 20; GOBLIN 20%, SCORPION 25%, TROLL 20%, SCARAB 20%, INSECTOID 15% (switch at 363) |
| The Ruins: N = 10; GOBLIN 10%, GNOME 40%, BUGBEAR 39%, VAMPIRE 1% (roll 8 draws again, 408), DEMON 10% (switch at 394) |
| Underworld: N = 10; SLIME 10%, SHADOW 10%, CREATURE_IMP 30%, GHOUL 30%, SKELETON 20% (switch at 422) |
| Hell: N = 20; SUCCUBUS 10%, INCUBUS 10%, CREATURE_IMP 25% (DEMON on Boss maps, 456-458), DEMON 30%, GOATMAN 20%, SHADOW 5% (switch at 443) |
| Caves, level 26 or below: N = 15; KOBOLD 33.3%, INSECTOID 33.3%, SCARAB 13.3%, AUTOMATON 6.7%, INCUBUS 6.7%, CRYSTALGOLEM 3.3%, COCKATRICE 3.3% (switch at 484) |
| Caves, level 27 and up: N = 15; KOBOLD 26.7%, INSECTOID 26.7%, CRYSTALGOLEM 20.0%, SCARAB 6.7%, AUTOMATON 6.7%, INCUBUS 6.7%, COCKATRICE 6.7% (switch at 525) |
| Citadel: N = 15; GOATMAN 26.7%, INCUBUS 20.0%, CRYSTALGOLEM 13.3%, VAMPIRE 13.3%, COCKATRICE 13.3%, SHADOW 6.7%, AUTOMATON 6.7% (switch at 554) |
| Fortress map file: N = 4; DRYAD, MYCONID, GREMLIN, MOTH_SMALL 25% each (switch at 583) |
| Fallback: SKELETON (595) |
| Level split for Caves: 26 (482) |
| Custom curve: flag set per map build (7044-7046), switched off after the first empty roll (7876) |

Percentages are the donor's band widths divided by N; the Caves shares that come from a second 50/50 draw are split evenly. Not measured by running the code.

## 4. TypeScript sketch

simplified: the sketch keeps the band tables for The Mines (with its level gate), The Ruins (with its nested draw), and Hell (with the boss swap), the SKELETON fallback, the base roll taken before the custom roll, and the custom override with the switch-off flag. It omits: the cheat override; the other zone tables (Swamp, Labyrinth, Underworld, both Caves halves, Citadel, fortress); the name matching (the sketch takes a zone key directly); the map filename test; the editor marker types and the placement loop; the per-monster seeded RNG (one `rand` stream is passed in). It replaces the donor's `rand() % N` with an exact `rand(n)`, which the donor's modulo only approximates. It keeps the donor's order of rolls for the parts it includes.

```ts
// Licence: BSD-2-Clause (donor LICENSE.txt, Turning Wheel LLC 2013-2020). Mechanism re-expressed from the read code; this sketch is not a line-by-line translation.
export type Monster = string;
export type Rand = (n: number) => number; // integer in [0, n)

// A band takes the inclusive roll range lo..hi. `pick` may consult the level (a gate by substitution)
// and may draw again from the same stream (the donor does this in some zones).
export interface Band { lo: number; hi: number; pick: (level: number, rand: Rand) => Monster; }
export interface ZoneCurve { modulus: number; bands: Band[]; }

export const BASIC: Monster = "SKELETON"; // the donor's fallback for every zone and every unmatched roll

export function rollZone(curve: ZoneCurve | undefined, level: number, rand: Rand): Monster {
  if (curve === undefined) return BASIC;
  const r = rand(curve.modulus);
  for (const b of curve.bands) {
    if (r >= b.lo && r <= b.hi) return b.pick(level, rand);
  }
  return BASIC;
}

// The Mines (modulus 10): rats 0-3, skeletons 4-7; roll 8 is a spider and roll 9 a troll from level 2 on,
// otherwise a skeleton. Below level 2 the skeleton share is 60 percent, not 40.
export const MINES: ZoneCurve = {
  modulus: 10,
  bands: [
    { lo: 0, hi: 3, pick: () => "RAT" },
    { lo: 4, hi: 7, pick: () => "SKELETON" },
    { lo: 8, hi: 8, pick: (level) => (level >= 2 ? "SPIDER" : "SKELETON") },
    { lo: 9, hi: 9, pick: (level) => (level >= 2 ? "TROLL" : "SKELETON") },
  ],
};

// Hell (modulus 20). On a boss map the imp band becomes a demon (the donor's own performance note).
export function hellCurve(isBossMap: boolean): ZoneCurve {
  return {
    modulus: 20,
    bands: [
      { lo: 0, hi: 1, pick: () => "SUCCUBUS" },
      { lo: 2, hi: 3, pick: () => "INCUBUS" },
      { lo: 4, hi: 8, pick: () => (isBossMap ? "DEMON" : "CREATURE_IMP") },
      { lo: 9, hi: 14, pick: () => "DEMON" },
      { lo: 15, hi: 18, pick: () => "GOATMAN" },
      { lo: 19, hi: 19, pick: () => "SHADOW" },
    ],
  };
}

// The Ruins (modulus 10): roll 8 draws again, so it is bugbear 90 percent and vampire 10 percent.
export const RUINS: ZoneCurve = {
  modulus: 10,
  bands: [
    { lo: 0, hi: 0, pick: () => "GOBLIN" },
    { lo: 1, hi: 4, pick: () => "GNOME" },
    { lo: 5, hi: 7, pick: () => "BUGBEAR" },
    { lo: 8, hi: 8, pick: (_level, rand) => (rand(10) > 0 ? "BUGBEAR" : "VAMPIRE") },
    { lo: 9, hi: 9, pick: () => "DEMON" },
  ],
};

// Per-level spawner. The zone's curve is always rolled first (this consumes the level stream); a custom
// curve, when the map has one, may then replace the result. After its first empty roll the custom curve
// is switched off for the rest of the level.
export class LevelSpawner {
  private customOn: boolean;
  constructor(
    private readonly curves: Record<string, ZoneCurve>,
    private readonly zone: string,
    private readonly rand: Rand,
    private readonly custom: ((zone: string) => Monster | null) | null,
  ) {
    this.customOn = custom !== null;
  }

  next(level: number): Monster {
    const base = rollZone(this.curves[this.zone], level, this.rand);
    if (this.customOn && this.custom !== null) {
      const c = this.custom(this.zone);
      if (c !== null) return c;
      this.customOn = false;
    }
    return base;
  }
}

export {};
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (engine spawn logic; the per-zone band tables and the level gates as zone data). Parity-checklist row 23 (zone population). This row fits: the donor's core is a spawn table per zone. It does not cover caps, respawn or despawn, which this donor does not show in the code read.
- today: Frankendom's current spawn code was not read in this pass.
- Reuse tag: rewrite-from-idea (BSD-2-Clause; code may be adapted with the notice kept; this note uses the shape only)
- Brief rule served: zones as data (the tables are data, not C switch statements); server-verified spawns (the roll is made on the server, not the client)

Best transferable idea: Keep each zone's spawn table as data (a roll modulus and bands of roll ranges), gate a band by substituting a lower-tier monster below a level rather than re-rolling, and let a custom curve override the base roll only until its first empty result on a level.
Decision (proposed): adapt - the band table as zone data with a substitution gate fits row 23; reject the name-prefix zone lookup and the hard-coded switch statements; keep the custom override only as an explicit per-level state that resets at each level build.
Acceptance: A server test with the Mines table asserts that over 10,000 spawn rolls, skeletons are 60 percent plus or minus 1 at level 1, and spiders and trolls are each 10 percent plus or minus 1 at level 2; and a custom curve that returns nothing once is not consulted again on that level.

## 6. Gaps and risks

- Zone identity comes from a name prefix (`strncmp(map.name, ...)`, 306 onward). A renamed map silently falls to the SKELETON fallback or to another zone's table. Frankendom needs a zone id as a data key.
- The base roll is taken before the custom roll (7866 before 7869), so a custom override still consumes the base stream and changes every later roll on the level. Frankendom must pick one order and test it.
- One shared level stream (`map_rng`) decides every table roll, so reordering placement reshuffles every monster on the level. Frankendom should seed each spawn from the zone seed and the spawn index.
- The nested draw in The Ruins (408) makes the odds depend on a second roll. Write nested outcomes as explicit weights in the data instead.
- The Hell boss swap is keyed on the name "Boss" (456). A zone data flag is needed in its place.
- The level gate by substitution changes the shares: below level 2 The Mines is 60 percent skeleton. That is what the donor does; a designer must see it in the data.
- The tables are hard-coded C switch statements. The donor's data path for custom curves (`monsterCurveCustomManager`, file format not read) is the more useful part to study, in a second note if it is wanted.
- Population, caps, respawn and despawn are not in this code. Row 23 needs those from another source; this note does not supply them.
- Nothing in this mechanism covers many-on-one targeting or MAX_ATTACKERS.
- Stairs and floor transitions were not read in this cell.

## Checker findings

- Verdict: CLEAN
- Corrected: nothing to correct
- Missed: The caves level split reads the global currentlevel (monster.cpp line 482), not the function's level parameter that the Mines gate uses (321, 330); the note does not say which variable and the TypeScript sketch has only a level parameter
