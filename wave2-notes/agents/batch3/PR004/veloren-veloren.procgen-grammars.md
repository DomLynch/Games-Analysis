# veloren-veloren (procgen-grammars, feel, cell PR004)

Donor: `/mnt/frankendom-donors/veloren-veloren` | Licence: GPL-3.0 (LICENSE line 1; README says the project is GPL v3.0) | Rust | topic `procgen-grammars`

Checked: read in full `world/src/site/namegen.rs` (name grammars, 935 lines). Read `world/src/site/mod.rs` `generate_city` (1242-1330 and the plot arms to 1395 and 1545-1600). Read `world/src/layer/spot.rs` (generate 30-40, spot calls 41-120, generate_spots 334-360, spot_config 382-420 and 528, is_valid 590-611). Read `world/src/civ/mod.rs` naming block (880-905). Read `assets/world/manifests/spots.ron`. Listing only: the 47 plot kinds in `world/src/site/plot/mod.rs` (names and the foreach list, not the bodies), the other town lotteries (1884, 1997, 2191, 2384, heads only), 26 spot structure `.ron` files (two read). Confidence: high on the name grammar and the town roll (read line by line). Medium on the spot placement rule (read, not run).

## 1. What the player sees and feels

- You walk into a generated town and the first thing is a plaza in the middle. Houses are then placed along the roads. About one roll in five makes a field. Workshops and taverns are guaranteed or capped by the town's size, and airship docks are gated on size, so a small town can still have one of each.
- Names describe the land. A water body over 200 tiles is called a 'Lake' or 'Loch' plus a made-up name. A water body over 10 tiles becomes 'Pool', 'Well' or 'Pond' after a made-up name. Grassland over 750 tiles gets a name built from an English word pair or a made-up one, then 'Grasslands', 'Plains', 'Meadows' or 'Fields'. The name tells you how big the place is.
- A tavern is 'The <adjective> <subject>' seven times in ten. One time in ten it is 'The <adjective> <tavern word>', and two times in ten it is 'The <adjective> <subject> <tavern word>'.
- At 375 wide the sign or card name is the first readable thing. The name is short, two or three syllables from consonant clusters and vowels.

## 2. Why it works / is striking

- Readable silhouette or beat at 375 wide: a plaza plus roadside houses reads as a town from a distance. This is the plot design; the render was not read.
- One signature behaviour: a failed placement leaves an open plaza, not an empty hole. This is the best transferable idea here: the open square is where a fight can happen.
- One signature sound or effect: none in the world code (client presentation not read).
- Could be made ours at 20-30 per cent resemblance: a name grammar keyed to the area of the land, and a weighted town roll with minimums, caps and gates.

## 3. The rule behind it

Name grammar. `NameGen::location` draws 1 to 3 syllables (namegen.rs:14). `generate` joins a start token, then vowel plus middle repeated for (syllables minus 2), then an end token, and capitalises the first letter (namegen.rs:21-54). Biome names pick between an English-word pair and a made-up name. `civ/mod.rs` picks the biome name by area: lake over 200 tiles (line 890 family), lake over 10 tiles, grassland over 750 tiles (line 897). Town names use four tables: start 59 entries, middle about 40, vowel 6, end about 65 (counted from the listing, namegen.rs 572-600).

Town roll. A weighted `Lottery` picks the next plot (site/mod.rs:1269-1277): house 64, guard tower 5, field 25, castle commented out (line 1273), workshop 5, airship dock 15, tavern 15, barn 5. Total 134 (castle not counted). The loop runs `size * 200` rounds (line 1286). Each house tries `attempt(32)` to find a roadside rectangle (line 1328 for the size draw, 1361 for the fallback). A failed house becomes a plaza (line 1361). Gates: airship dock only when size is over 0.125 and none exists (1545); tavern only when size is over 0.125 and fewer than two (1583). A gated roll does nothing (the match falls through to `_ => {}` at line 1625).

Plot size. Base plus spread times a draw raised to the fifth power, then rounded. House: 1.5 + 1.0 x u^5 (line 1328). Workshop: 3.0 + 1.5 x u^5 (line 1291). Tavern: 4.5 + 2.0 x u^5 (line 1585). Most plots take the base size; the big one is two to three times larger.

Spot placement. Attempts per world = ceil(tiles x freq / 1000^2) (spot.rs:349-350). Each attempt probes one random point snapped to a 4-chunk grid (spot.rs:353). It is kept only if its condition passes and there is no site on it (`is_valid`, 590-611). When the spot has spawn turned off, the chunk's tree density and spawn rate are set to zero.

Spot kinds. Twenty spot kinds have their frequency and conditions written in Rust (20 hard-coded `generate_spots` calls). One kind is read from data: `assets/world/manifests/spots.ron`, and that file holds one entry, a mage tower with freq 1.0 and condition All([Typical, MaxGradient(0.2), Biome([Forest, Taiga, Snowland, Grassland])]) (spots.ron:13-16). Each spot config has a base structure list, an entity radius, and entity groups with count ranges. Example: dwarven grave, radius 60 (spot.rs:387), 6 to 11 robbers. Example: jungle temple, radius 40, 2 to 7 of each of three saurok kinds (spot.rs:413 onward).

Numbers table (designer data fields):

| Name | Donor value | Unit |
|---|---|---|
| name syllables | 1 to 3 | syllables |
| town rounds per size | 200 | rolls per size unit |
| plot roll weights | house 64, guard tower 5, field 25, workshop 5, airship 15, tavern 15, barn 5 | weight |
| house size | base 1.5, spread 1.0, exponent 5 | tiles |
| workshop size | base 3.0, spread 1.5, exponent 5 | tiles |
| airship gate | size over 0.125 | fraction 0-1 |
| tavern cap | 2 | count |
| spot attempts | freq x tiles / 1000^2 | attempts (not spawns) |
| spot radius | 40 to 60 | tiles |

## 4. TypeScript sketch

simplified: the sketch keeps the weighted roll, the minimums in their own pass, the caps and gates, the open-ground fallback and the rounds count. It omits the site geometry (tryPlace is injected), the door and road logic, the per-building size draws beyond the one helper, and the seeded reseed per plot. It fixes the donor's workshop guard, which made every roll a workshop attempt while none was placed (site/mod.rs:1289), by placing the minimum before the rolls.

```ts
// Licence: GPL-3.0 (donor). Clean-room sketch of the rule, not a translation of the donor lines.
// clean-room
export {};

interface PlotRule {
  kind: string;
  weight: number;      // roll weight (designer data field)
  minCount?: number;   // guaranteed before the weighted rolls
  maxCount?: number;   // cap: a roll over the cap is a no-op
  minSize?: number;    // gate on town size, 0..1: a roll below it is a no-op
  tries: number;       // placement attempts before the open-ground fallback
}

interface TownResult { placed: Map<string, number>; openGround: number; }

// tryPlace is injected: the site geometry (free rectangle, door, road) is not in the sketch.
export function buildTown(
  rules: PlotRule[],
  size: number,
  rounds: number,               // donor: size * 200
  rand: () => number,           // seeded generator, one per site
  tryPlace: (kind: string, tries: number) => boolean,
): TownResult {
  const placed = new Map<string, number>();
  let openGround = 0;
  const add = (k: string): void => { placed.set(k, (placed.get(k) ?? 0) + 1); };

  // Minimums first, as their own pass, so they do not take over every roll.
  for (const r of rules) {
    for (let i = 0; i < (r.minCount ?? 0); i++) {
      if (tryPlace(r.kind, r.tries)) add(r.kind);
      else openGround++;
    }
  }

  const total = rules.reduce((s, r) => s + r.weight, 0);
  for (let n = 0; n < rounds; n++) {
    let x = rand() * total;
    let picked = rules[rules.length - 1];
    for (const r of rules) {
      x -= r.weight;
      if (x < 0) { picked = r; break; }
    }
    if (picked.minSize !== undefined && size < picked.minSize) continue;
    if (picked.maxCount !== undefined && (placed.get(picked.kind) ?? 0) >= picked.maxCount) continue;
    if (tryPlace(picked.kind, picked.tries)) add(picked.kind);
    else openGround++;          // a failed placement leaves open ground, not a gap
  }
  return { placed, openGround };
}

// Plot size: base + spread * u^exp. With exp 5 most plots take the base size.
export function plotSize(base: number, spread: number, exp: number, rand: () => number): number {
  return Math.round(base + spread * Math.pow(rand(), exp));
}
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` for the spot part: row 23 (zone population). A spot is an encounter template: its count range, radius and base props are zone data, its spawn is server-verified, and the cap, respawn and despawn-on-empty rules are the row 23 fields.
- The town roll is zone layout, not population. No parity row covers it (1-22). Flagged as a gap for Lead, not forced into a row.
- FOR FRANKENDOM, 700 zones as data: each zone carries its own weight table, minimums, caps, gates and size scalar. The 100 Pit characters are the entity pool for spot groups, reused across zones with a different weight.
- Many-vs-one: a spot group of 6 to 11 is a population, not a simultaneous attack. The engine admits three at a time (MAX_ATTACKERS = 3), so a spot group must be sized for the engine's queue, not for a crowd.
- Keep: weighted rolls with minimums, caps and gates held as data; an open square when a placement fails; the area-based naming threshold.
- Change: remove dead rolls and dead arms (guard tower roll places nothing, lines 1366-1385; castle arm at 1393 cannot be reached because its lottery entry is commented out at 1273); stop the workshop minimum from taking over every roll (1289); draw one name, not two (civ/mod.rs 897-904 generates both names and keeps one, so every later seeded draw shifts); move spot kinds into data (spots.ron holds one entry); state the unit of the spot frequency in the data field (spots.ron comment says per 1000 km^2, the code comment says per km^2, and the arithmetic depends on tile size).

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: 23 (zone population) for spots; zone layout has no row

Best transferable idea: when a placement fails, leave an open square instead of a gap, and use that square as the place a fight can happen.

## 6. Look test (Dom, 5 minutes on a phone)

- Town grey-box, 375 wide: one zone at three seeds in the same biome. Each shows the plaza, the roadside plots, one tavern and one field. Dom judges: does a zone read as a place at a glance, and is the open square a good fight space.
- Name cards: ten names from the region grammar (lake, grassland, tavern) beside ten current Frankendom zone names, shown as phone titles. Dom picks which style fits the tone.

## 7. Licence and IP

GPL-3.0. Clean-room only: the syllable tables and word lists are donor content and are not reproduced; we write our own lists. The sketch is written from the described rule. The `assets/` content licence was not read.

## 8. Gaps

- Half read: both. Read the world crate (generation code) and the `assets/world/manifests` data for the spot and town rules. The client presentation (voxygen) was not read, so the sound, camera and HUD of a spot or town are unknown.
- Not read: the bodies of the 47 plot kinds; `make_plaza`, `find_roadside_aabr` and `generate_farm` bodies; the cliff, savannah, coastal and desert town lotteries past their first lines; `layer/scatter.rs`, `layer/tree.rs`, `layer/wildlife.rs` (the walk density of trees and wildlife is not known); the 24 spot structure files not opened.
- Not measured: spot density in tiles. The frequency is an attempt count, not a spawn count; the real density is lower wherever the condition fails.
- Idle, death, loot ceremony and 375-wide readability of entities: not read in this donor's world code.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN. lottery weights, size*200, gates 0.125, tavern<2, size formulas, tavern 7/1/2 split, 20 generate_spots calls, spots.ron single mage tower, dead guard-tower arm, workshop==0 guard all match.
- No errors or missed items found.
