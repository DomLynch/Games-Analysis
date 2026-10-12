# tmewett-BrogueCE (character-stats-skills, cell 21)

Donor: `/mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/Items.c` (metered generation, 560-760) with the table in `/mnt/frankendom-donors/tmewett-BrogueCE/src/variants/GlobalsBrogue.c` (616-650) | Licence: GNU AGPL-3.0 (`LICENSE.txt`: "GNU AFFERO GENERAL PUBLIC LICENSE Version 3, 19 November 2007"; copyleft, shape only) | C | symbol `populateItems` (Items.c 537; level item generation; the metered block is inside it)

Checked: The metered block in `populateItems` (Items.c 576-580 increments, 665-713 depth offset and forcing, 743-750 decrement) was read in full, with the weighted pick loop (410-416) read from grep output. The table (GlobalsBrogue.c 616-650) and its struct (Rogue.h 1450-1460) were read in full. Power and magic formulas were read in PowerTables.c 1-220 (the damage, accuracy and defence lookups read end to end; staff, charm and wand rows from 45-60 and 83-120 read but mostly not receipted). Strength and hit chance: Combat.c 55-130. Ally XP: Time.c 740-750, 940-990; Movement.c 2290-2300; Monsters.c 3205-3262 (corpse absorption, partly). History: CHANGELOG.md head (1.15.1) and grep for frequency, guarantee and metered terms. Not read in full: the food guarantee block (Items.c 688-695, read in the fix pass), the heat-map placement, the metered save and restore (Items.c 740-800), the charm and regeneration tables beyond the lines listed, the other variants' tables beyond the rows named, the save format. camera_scope: not applicable. Confidence: high on the metered schedule and the strength and enchant formulas (read in order). Medium on the ally XP, which is read but not traced through every caller.

Best transferable idea: A small progression engine on three numbers per item kind (a weight that rises each level, falls when one is generated, and a threshold that forces the kind when the run falls behind a depth schedule) gives stat growth at a predictable pace without a fixed script.
Decision (proposed): adapt - take the rise-on-level, fall-on-spawn weight and the depth threshold for stat-growth tokens (life and strength), with a seeded roll and the numbers as data rows; keep the schedule per run in the one ledger.
Acceptance: Server test with a fixed seed over 40 generated levels: every forced life token satisfies 4 x (tokens so far) + 3 < depth + offset, the offset stays within -2..2, and a strength token appears in the run at a rate within 10 percent of the row's target.

## 1. Mechanism

Once per generated level (not after the amulet depth), the code walks every metered row and adds its increment to that row's frequency (Items.c 576-579). Then the level gets `numberOfItems = 3` plus one more for every 60 percent roll that succeeds (580-581), plus 2 on depths 1 and 2 and 1 on depths 3 and 4 (not receipted), plus the variant's extra items.

Depth offset (665-669): zero on depths 1 and 2; from depth 3, two rolls of -1..1 summed (the comment says it keeps food and life tokens "slightly less predictable", 667).

Per item (the loop at about 672-750):
(a) Copy each metered row's frequency into the live potion or scroll table (678-682) so the normal weighted pick sees the metered weight.
(b) Food guarantee first (Items.c 688-695, uses the same depth offset): if the food schedule is behind, the category is forced to food and the metered forcing below does not run for this item. Past the amulet depth the category is gems instead, and metered forcing also does not run. So threshold forcing only happens in the final else branch (698-718).
(c) and (d) are ONE loop over the metered rows j (702-715), with both tests inside it. For each row in index order: (c) threshold forcing (702-707): if the row has a level scale and `spawned x genMultiplier + genIncrement < depth x levelScaling + offset`, force that row's category and kind and break; then (d) by-level guarantee (710-714): if depth equals the row's `levelGuarantee` and fewer than `itemNumberGuarantee` have spawned, force it and break. Row order interleaves the two tests; the earliest row whose test fires wins. `levelGuarantee` is 0 in the main Brogue table, so (d) is off there; the Rapid and Bullet variants set it (detect magic at level 2 with one guaranteed in Rapid, level 1 in Bullet).
(e) If nothing forced: a weighted pick over the table (`chooseKind`, 409-416), total = sum of positive weights, random point in 1..total, walk the table subtracting each weight.
(f) Generate the item; place it (strength potions avoid hallways; not read in full).
(g) For the generated kind, if it is metered: frequency -= decrementFrequency and spawned += 1 (743-750).

Tokens on the main variant table (GlobalsBrogue.c):
- Enchanting scroll: starts at 60, +30 per level, -50 per spawn (627).
- Potion of life: starts at 0, +34 per level, -150 per spawn; threshold multiplier 4, increment 3, level scale 1 (641). So the nth forced life token comes when depth + offset > 4n + 3, about one every four levels.
- Potion of strength: starts at 40, +17 per level, -50 per spawn (642).
- Other scrolls and potions are listed with no numbers, so they are not biased.

Stat effects of the tokens: life adds `magnitude` to max HP and heals fully (Items.c 7271-7276); strength adds `magnitude` to strength and clears weakness (7306-7307; CHANGELOG 82).

## 2. Key functions

- `populateItems` (Items.c 537): level item generation. Metered increment 576-579; item count 580-581; depth offset 665-669; table copy 676-682; threshold forcing 702-707; by-level guarantee 710-714; decrement 743-750.
- `chooseKind` (Items.c 409): the weighted pick (sum of positive weights at 412, random point at 414, walk at 415-416).
- Table: `.../src/variants/GlobalsBrogue.c` 616-650 (`meteredItemsGenerationTable_Brogue`); other variants: `.../src/variants/GlobalsRapidBrogue.c` 645 and `.../src/variants/GlobalsBulletBrogue.c` 655 (guarantee rows).
- Struct: `.../src/brogue/Rogue.h` 1450-1460 (`meteredItemGenerationTable`).
- Strength and hit chance: `.../src/brogue/Combat.c` `strengthModifier` (receipted lines 61, 63, 65), `netEnchant` from 69 (clamp comment 74), `hitProbability` from 105 (receipted lines 125, 127).
- Power formulas: `.../src/brogue/PowerTables.c`: staff damage 49-51; regeneration 125-135 (comment 132); damage fraction 138-157; accuracy fraction 161-180; defence fraction 184-202; wand of domination 45-46 (not receipted beyond line 45).
- Ally XP: `.../src/brogue/Time.c` 747 (discover), 946-960 (per ally), 966-984 (pass over three levels; reset 984); bond constant `Rogue.h` 1130; companion thresholds `variants/GlobalsBrogue.c` 1060 (10400) and `variants/GlobalsBulletBrogue.c` 1074 (1600).
- Corpse absorption (monsters learn a bolt by eating a fallen monster): `.../src/brogue/Monsters.c` 3220 (counter 20), 3258-3262 (learn the absorption bolt).

## 3. Numbers vs mechanism

Brogue has no XP, no skill trees and no luck stat (grep of the source: no "luck" hits; "experience" appears only in the ally counter; "skill" appears only in text and a flag comment). Its progression is items plus enchant. Rows (name | what it does | formula | number ranges | caps | file:line):

| name | what it does | formula | number ranges | caps | file:line |
|---|---|---|---|---|---|
| strength surplus | bonus for heavy gear | diff = strength - weakness - required; diff > 0 gives +0.25 enchant per point | 0.25 per point | none | Combat.c 61-63 |
| strength deficiency | penalty for heavy gear | diff < 0 gives 2.5 enchant per point (removed from net enchant) | -2.5 per point | none | Combat.c 65 |
| net enchant | one number for weapon or armour power | enchant1 + strengthModifier (weapons and armour only), clamped to [-20, 50] | -20 to 50 | hard clamp | Combat.c 69-74 |
| damage fraction | damage multiplier from net enchant | 1.065 to the power of net enchant, table in 0.25 steps | 1.065^-20 to 1.065^50 | table ends | PowerTables.c 138-157 (comment 140) |
| accuracy fraction | accuracy multiplier from weapon | same 1.065 table; player base accuracy 100 | base accuracy 100 | | Combat.c 56, 125; PowerTables.c 161-180 |
| defence fraction | hit chance multiplier from armour | 0.877 to the power of displayed armour, table in 0.25 steps | armour 0 to about 20 in the table | table ends | PowerTables.c 184-202 (comment 186, index 202) |
| hit probability | hit chance | accuracy x defence fraction, clamped 0 to 100; 100 if the defender is stuck, captive, seized (by the attacker), or slain by a slaying runic | 0 to 100 | clamp | Combat.c 105-127 |
| potion of life | max HP and heal | max HP += magnitude; then heal fully | magnitude from the item's range | | Items.c 7271-7276 |
| potion of strength | strength | strength += magnitude; weakness cleared | magnitude from the item's range | | Items.c 7306-7307; CHANGELOG 82 |
| staff damage | damage per zap | low = (2 + e) x 3/4; high = 4 + 5e/2; clumped roll with clump 1 + e/3 | e = staff enchant; e = 2 gives 3 to 9; e = 3 gives 3 to 11 (clump 2) | | PowerTables.c 49-51 (receipts 49-51) |
| staff protection, blink, haste, blades, discord, entrancement | other staff effects | per-enchant formulas (for example protection 130 x 1.4^(e - 2), blink 2 + 2e) | e = enchant | | PowerTables.c 52-59 (not receipted) |
| wand of domination | chance to take a monster | 100 if HP x 5 < max HP, else 100 x missing HP / max HP | 0 to 100 | | PowerTables.c 45-46 (line 45 receipted) |
| regeneration | turns to full heal | 0.75 to the power of bonus, table, plus a 2000 thousandths term; "Syd nerf" comment | bonus -10 to 50 | index clamp | PowerTables.c 125-135 (comment 132) |
| charm recharge | turns to recharge | effect duration + base x 1.x to the power of enchant; minimum recharge turns; enchant clamped 1..50 | enchant 1 to 50 | min turns | PowerTables.c 206-218 (not receipted) |
| metered frequency | weight of a token kind | +increment per level; -decrement per spawn | enchant scroll 60 start, +30, -50; life 0, +34, -150; strength 40, +17, -50 | none | Items.c 576-579, 749; GlobalsBrogue.c 627, 641-642 |
| metered threshold | forced token | spawned x 4 + 3 < depth + offset (life only); skipped when food forced or past the amulet depth | about one life token every four levels | none | Items.c 702-704; GlobalsBrogue.c 641 |
| by-level guarantee | forced token at a set depth | depth == levelGuarantee and spawned < itemNumberGuarantee | 0 in main Brogue; 2 for detect magic in Rapid; 1 in Bullet | per row | Items.c 710-711; GlobalsRapidBrogue.c 645; GlobalsBulletBrogue.c 655 |
| items per level | item count | 3 + geometric (60 percent continue) + early bonus | mean about 4.5 plus early bonus | none | Items.c 580-581 |
| ally XP per turn | shared counter | (allies only; MONST_INANIMATE and MONST_IMMOBILE allies get none, Time.c 941-944) each newly discovered passable cell adds 1 to a shared counter; each ally on this and adjacent levels adds the counter to its meter; counter resets each pass | | | Time.c 747, 946, 966-984 |
| ally telepathic bond | ally reveal | meter >= 1400 (constant) sets the bond flag once | 1400 | | Time.c 949; Rogue.h 1130 |
| ally companion feat | feat for a companion | meter >= companion threshold: 10400 in the main variant, 1600 in Bullet | 10400 or 1600 | once per run | Time.c 960; GlobalsBrogue.c 1060; GlobalsBulletBrogue.c 1074 |
| corpse absorption | monster learns a bolt | 20-turn counter at a fallen monster, then the absorption bolt is added to its bolts | 20 turns | | Monsters.c 3220, 3258-3262 |

As-data shape:
- Skills: NOT PRESENT in this donor (no skill rows, no skill trees, no use-based skill-up). The table-driven progression is the metered token table below.
- Metered table (C struct in Rogue.h 1450-1460): category (unsigned short), kind (short), initialFrequency (int), incrementFrequency (int), decrementFrequency (int), genMultiplier (int), genIncrement (int), levelScaling (int), levelGuarantee (int), itemNumberGuarantee (int). Rows are in the variant file; the variant picks the table at build time (`meteredItemsGenerationTable` pointer in Globals.c 63).
- Run state per metered row: `rogue.meteredItems[i]` with frequency and numberSpawned (saved with the run; save format not read).
- Potion and scroll tables are fixed arrays with a frequency field, overwritten from metered memory each item and restored after the level (Items.c 676-682; restore at about 792, not read).
- Power curves are arrays in code (PowerTables.c lookup arrays, fixed-point), not rows.
- Ally thresholds: a `#define` (Rogue.h 1130) and a per-variant struct field (`companionFeatRequiredXP`).

A new item kind that is metered: ONE ROW, yes, when the kind already exists (set incrementFrequency and decrementFrequency). A new kind's effect is code: a switch on kind (Items.c 7271-7306 and similar), so a new effect is code, not a row.

Provenance: all of the above is from `tmewett-BrogueCE` (AGPL-3.0 `LICENSE.txt`). Shape only. Variant files are in `src/variants/`.

What they patched later (CHANGELOG.md head is version 1.15.1; no metered-table entries found by grep for frequency, guarantee, metered and generation, except the ally-room note):
- "Drinking a strength potion now causes weakness to be removed from a character" (CHANGELOG 82; code at Items.c 7306-7312 sets the weakened status to 1 when present and clears weaknessAmount to 0).
- "Wands of empowerment have been strengthened to a middle-ground between" (CHANGELOG 782), with the guarantee of early wands moved between versions (CHANGELOG 601, 780).
- "The frequencies of various special ally-related rooms have been reverted" (CHANGELOG 787).
- Regeneration comment: "This is the Syd nerf, after Syd broke the game over his knee with a +18 ring of regeneration." (PowerTables.c 132). A balance patch after an exploit.
- Item generation comment: "Include a random factor in food and potion of life generation to make things slightly less predictable." (Items.c 667).

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order for one level: the once-per-level increment; then for each item the metered weights are taken from memory, one loop over the rows applies the threshold and then the by-level guarantee per row (earliest row wins), unless food forced the item or the level is past the amulet depth (`allowForce` false), otherwise a weighted pick, then the decrement for the kind generated. It uses plain numbers where the donor uses 16-bit fixed-point tables. It omits item categories and counts, heat-map placement, the strength-potion hallway rule, the food guarantee itself, the save and restore of the global tables, and the staff and charm tables beyond the damage range. The strength and hit functions match the donor's arithmetic apart from the fixed-point tables.

```ts
// Licence: GNU AGPL-3.0 (donor LICENSE.txt). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface MeteredRow {
  initialFrequency: number;   // starting weight (memory is set to this at run start)
  incrementFrequency: number; // added once per generated level; 0 = not biased
  decrementFrequency: number; // removed each time one is generated
  genMultiplier: number;      // threshold: spawned x multiplier + increment must stay below depth x scale + offset
  genIncrement: number;
  levelScaling: number;       // 0 = no threshold forcing
  levelGuarantee: number;     // 0 = off; otherwise force this kind on exactly this depth
  itemNumberGuarantee: number; // ... while fewer than this many have spawned
}
interface MeteredState { frequency: number; spawned: number; }

// Roll helper: roll(a, b) returns an integer in [a, b] from the engine's seeded stream (not Math.random).
type Roll = (a: number, b: number) => number;

// Once per generated level, before any item is placed.
function addLevelIncrement(state: MeteredState[], rows: MeteredRow[]): void {
  rows.forEach((r, j) => {
    if (r.incrementFrequency !== 0) state[j].frequency += r.incrementFrequency;
  });
}

// Depth offset: zero on depths 1 and 2; otherwise the sum of two rolls of -1..1 (so -2..2).
function depthOffset(depth: number, roll: Roll): number {
  if (depth <= 2) return 0;
  return roll(-1, 1) + roll(-1, 1);
}

// Forcing: ONE loop over the rows, both tests inside it, so row order interleaves them (the earlier row wins whichever test fires).
// Per row: the depth-schedule threshold first, then the by-level guarantee.
function forcedMetered(rows: MeteredRow[], state: MeteredState[], depth: number, offset: number): number | null {
  for (let j = 0; j < rows.length; j++) {
    const r = rows[j];
    if (r.levelScaling !== 0 && state[j].spawned * r.genMultiplier + r.genIncrement < depth * r.levelScaling + offset) {
      return j;
    }
    if (depth === r.levelGuarantee && state[j].spawned < r.itemNumberGuarantee) {
      return j;
    }
  }
  return null;
}

// Weighted pick. Non-positive weights count as 0. Returns the chosen index.
function pickWeighted(weights: number[], roll: Roll): number {
  const total = weights.reduce((s, w) => s + Math.max(0, w), 0);
  let r = roll(1, total);
  for (let i = 0; i < weights.length; i++) {
    const w = Math.max(0, weights[i]);
    if (r <= w) return i;
    r -= w;
  }
  return weights.length - 1;
}

// When a metered kind is generated: its weight drops and its count rises.
function onGenerated(state: MeteredState[], rows: MeteredRow[], j: number): void {
  state[j].frequency -= rows[j].decrementFrequency;
  state[j].spawned += 1;
}

// One item: metered rows take their weight from memory; a threshold or guarantee forces a kind; otherwise a weighted pick.
// allowForce is false when the food guarantee fired for this item or the level is past the amulet depth: the donor only forces metered kinds in the branch where neither applies (food wins first).
// simplified: metered rows are assumed to occupy the first rows.length kind indices; the donor keeps separate tables and does not model the food guarantee itself, heat-map placement or categories.
function generateKind(rows: MeteredRow[], state: MeteredState[], baseWeights: number[], depth: number, offset: number, roll: Roll, allowForce: boolean): number {
  const weights = baseWeights.slice();
  for (let j = 0; j < rows.length; j++) weights[j] = state[j].frequency;
  let kind = allowForce ? forcedMetered(rows, state, depth, offset) : null;
  if (kind === null) kind = pickWeighted(weights, roll);
  if (kind < rows.length) onGenerated(state, rows, kind);
  return kind;
}

// Strength: a surplus adds 0.25 enchant per point; a deficiency removes 2.5 per point. Weakness lowers strength first.
function strengthModifier(strength: number, weakness: number, required: number): number {
  const diff = strength - weakness - required;
  return diff > 0 ? diff * 0.25 : diff * 2.5;
}

// Net enchant is clamped to [-20, 50].
function netEnchant(enchant: number, strength: number, weakness: number, required: number): number {
  return Math.min(50, Math.max(-20, enchant + strengthModifier(strength, weakness, required)));
}

// Damage and accuracy scale by 1.065 per net enchant point; armour scales hit chance by 0.877 per displayed armour point.
// simplified: floats here; the donor uses 16-bit fixed-point lookup tables at 0.25-point steps.
function damageFactor(net: number): number {
  return Math.pow(1.065, net);
}
function hitChance(accuracy: number, armourDisplayed: number): number {
  return Math.min(100, Math.max(0, accuracy * Math.pow(0.877, armourDisplayed)));
}

// Staff damage range by enchant (donor integer formulas); the clump is the width of the clumped roll inside the range.
function staffDamageRange(enchant: number): { low: number; high: number; clump: number } {
  return {
    low: Math.trunc((2 + enchant) * 3 / 4),
    high: Math.trunc(4 + 5 * enchant / 2),
    clump: 1 + Math.trunc(enchant / 3),
  };
}

export {};
```

## 5. Lands in

- TARGET `origins/catalogue/progression.ts` (new; proposed path, not checked against the Frankendom repo): the stat-growth token rows (life, strength; initial weight, increment, decrement, threshold multiplier, increment, level scale) and the strength-and-enchant curve parameters as catalogue fields. Parity-checklist row 21 (catalogue fields).
- Reuse tag: rewrite-from-idea (AGPL-3.0: clean-room only; shape only).
- Brief rule served: zones as data (the run's token schedule is a row, not code); one ledger (per-run token counts in the character record); server-verified (seeded roll, generation counted by the server).

## 6. Gaps and risks

- The schedule is per run. Frankendom must keep the counts in the one character ledger and generate on the server; a client that generates a drop breaks the count.
- Counting by generation, not pickup: the donor counts a token when it is generated, so a token left on the floor or lost still uses up the schedule. That is deterministic and matches replays; Frankendom should say so in the row.
- The table is copied into the live potion and scroll weights and restored after each level (Items.c 676-682; restore not read). Frankendom should pass the weights as a parameter; a shared mutable table is a hazard if a level fails midway.
- The by-level guarantee path is dead in the main Brogue variant (levelGuarantee is 0 there) and live only in Rapid and Bullet. Keep it as a row field, and test it in the variant that sets it.
- Strength and enchant use one net number for weapons and armour (clamped -20 to 50). Frankendom's guard and stagger rules are separate; do not merge them into this number.
- Fast fights: the enchant-to-damage factor is 1.065 per point, so one enchant point is about 6.5 percent damage and accuracy; a strength deficiency of one point costs 2.5 enchant (about 15 percent). These are per-item numbers; a fast mobile fight should keep them as data.
- Ally XP counts every discovered passable cell on the player's level and the two neighbours; in a many-on-one or open PvP world the counter would be shared by all allies. Frankendom should scope it per character.
- Donor defects with the fix (keep the idea): none found in the metered mechanism as read. Design hazards are listed above (global table mutation, dead guarantee path, generation counting). Not verified: the save and restore of the metered memory. The food guarantee (Items.c 688-695) pre-empts a forced life token on that item, so a food pick can delay the schedule by one item.

Rulings for Dom:
1. Put stat-growth tokens (life and strength) on a metered schedule with a forced spacing (about one life token every four levels), or leave them random? Recommend metered, with the spacing as data rows.
2. Count tokens when they are generated (the donor's rule, replay-safe) rather than when a player picks them up? Recommend generated.
3. Keep exploration-fed ally XP with the bond at 1400 and a companion feat at a data threshold (10400 in the main variant)? Recommend yes, scoped per character.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
- Verdict: MINOR.
- Steps (c) threshold and (d) guarantee were described as two sequential phases; the code is one loop over rows j with both tests inside (Items.c 702-715), so row order interleaves them. The sketch dropped the guarantee.
- Ally XP row omitted that MONST_INANIMATE / MONST_IMMOBILE allies get no XPXP (Time.c 941-944).
- Missed: the food guarantee (Items.c 688-695) runs before the metered forcing and pre-empts it; forcing happens only in the else branch (not past the amulet depth, not when food forced).

Fixed 2026-10-12: steps (b)-(d) rewritten; ally XP row; sketch (and work/brogue-metered.ts) now has levelGuarantee/itemNumberGuarantee in one forcing loop and an allowForce flag for food/amulet depth; gaps line on food pre-emption.
