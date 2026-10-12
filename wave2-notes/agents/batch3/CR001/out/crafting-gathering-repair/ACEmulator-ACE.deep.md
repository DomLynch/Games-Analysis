# ACEmulator-ACE (crafting-gathering-repair, cell 3)

Donor: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Player_Crafting.cs` (with `Managers/RecipeManager.cs`, `WorldObjects/SkillCheck.cs`, `Managers/PropertyManager.cs`, `ACE.Database/Models/World/Recipe.cs`) | Licence: AGPL-3.0 (`/mnt/frankendom-donors/ACEmulator-ACE/LICENSE`, read: "GNU AFFERO GENERAL PUBLIC LICENSE Version 3, 19 November 2007") | C# | symbols `Player.HandleSalvaging`, `Player.AddSalvage`, `Player.TryAddSalvage`, `Player.GetStructure`, `Player.CalcNumUnits`, `RecipeManager.GetRecipeChance`, `SkillCheck.GetSkillChance`

Checked: cell 3 of 3 in cells-CR001.tsv (list column 4). camera_scope: not a camera cell. Read in full: `Player_Crafting.cs` 118-189 (HandleSalvaging entry), 191-233 (AddSalvage), 235-292 (TryAddSalvage), 294-333 (GetStructure), 342-369 (CalcNumUnits and GetSalvageBag), 16-40 (material to bag table, first rows). `PropertyManager.cs` 590 (salvage_handle_overages, default false, with its comment). `RecipeManager.cs` 159-198 (non-tinkering chance) and 354-366 (roll head). `SkillCheck.cs` 1-24 (whole file). `Recipe.cs` 9-80 (model fields only). Not read: `CreateDestroyItems` body, `GetTinkerChance` (200-250, skimmed), `Tailoring.cs`, the rest of the material table, the WCID data for bag capacity (not in the donor; the code falls back to 100), `SalvageResults.cs` (message aggregation only, 1-62). Repair and durability: none in ACE.Server (grep for repair, durability and armour wear: no hits outside enum names). Gathering nodes: none in ACE.Server (grep for gather, harvest and mining: only a skill comment and an admin enum). So the crafting-gathering-repair cell is STRONG for salvage and recipe rows only; repair and gathering are NONE. Confidence high for salvage (every line of the path read); high for the recipe chance (the function is three lines); the recipe row's success and failure outputs are shape only (model read, creation not read).

Best transferable idea: salvage turns a taken piece into material units in proportion to skill times the piece's quality, stores the units in per-material bags with a fixed capacity that open a new bag when full, and raises the bag's value with skill.
Decision (proposed): adapt — the units formula and the capped bags suit take-one loot (a taken piece becomes a material ledger row), but Frankendom should fix the workmanship double count (defect 1) and must choose its own overflow policy instead of copying the retail loss (see gaps).
Acceptance: a server test salvages a piece of quality 4.5 at skill 300 with no augments and asserts 7 units; with 100 units of capacity a bag fills and a new bag opens for the rest; a piece split across two bags adds its quality to each bag in proportion to the units it put there.

## 1. Mechanism

Salvage (one piece at a time, from `HandleSalvaging`, `Player_Crafting.cs` 142-189):
- Only pieces with workmanship and not retained are salvaged (171). Each piece goes through `AddSalvage` and is then consumed from the inventory (173-176). New bags are created at the end (179-181).
- Units from the piece (`GetStructure`, 294-333): a bag of salvage returns its own structure (305-306). For a piece: `salvageAmount = CalcNumUnits(salvageSkill, workmanship, augs) * stack` (318), where `CalcNumUnits` is `1 + floor(skill / 194 * workmanship * (1 + 0.25 * augs))` (342-348). The tinkering path gives `CalcNumUnits(trained tinkering skill, workmanship, 0)` capped at the piece's rounded workmanship, and that cap is then multiplied by the stack size (319-322; comment at 297), so a stack of ten with quality 4.5 can tinker up to 10 x 4 = 40 units. The larger of the two wins (325); the skill used is recorded for the message (327).
- Bags (`AddSalvage`, 191-233): one bag per material (`GetSalvageBag`, 350-369: the first bag of that material with room; otherwise a new bag from the material table, lines 20-40). Units go into the bag up to its capacity; the rest goes to the next bag (`TryAddSalvage`, 237-244). Capacity is `MaxStructure ?? 100` (237).
- Workmanship: `TryAddSalvage` adds `workmanship_item * item_numItems` to the bag's workmanship (251) and the same item count to the bag's item counter. For a raw piece this is added in full on every call, including each overflow call (see defect 1). A combined bag of salvage (tinkering material) that overflows takes a different branch (254-273) that scales the item count and workmanship by the share that fits and leaves the rest on the source bag, so the double count is a raw-piece problem only.
- Value: for a piece (not a bag), `valueFactor = (units added / units produced) * (skill / 387) * (1 + 0.25 * augs)` (218-220); the bag gains `round(item.Value * valueFactor)` (222), capped at 75000 (224).
- Overflow option: when two bags of salvage are combined, the overage is lost unless `salvage_handle_overages` is on (280-288; PropertyManager.cs 590 gives the default false, with the comment "in retail, if 2 salvage bags were combined beyond 100 structure, the overages would be lost").

Recipe rows (non-tinkering path, `RecipeManager.GetRecipeChance` 159-198): a recipe with no difficulty always succeeds (chance 1.0, early return at 164-165); otherwise the chance is `SkillCheck.GetSkillChance(skill + LumAugSkilledCraft, recipe.Difficulty)` (193-195), where the player must be trained in the recipe skill (185-189; otherwise no chance is returned). The chance is `1 - 1/(1 + exp(0.03 * (skill - difficulty)))` clamped to [0, 1] (`SkillCheck.cs` 7-12). The roll is `Next(0,1) < chance` (`HandleRecipe` 363). Recipe rows (`Recipe.cs` 9-80) hold the skill, difficulty, the success and failure outputs (WCID and amount), and a chance and amount to destroy the source or target on success or failure.

Numbers, worked from the code: skill 300, quality 4.5, no augments: `1 + floor(300/194 * 4.5) = 1 + floor(6.96) = 7` units. With 4 augment levels (factor 2.0): `1 + floor(13.9) = 14`. A coin value of 1000 with all 7 units in one bag at skill 300 and no augments adds `round(1000 * 1 * 300/387) = 775` (line 222). Recipe chance at difficulty 100: skill 100 gives 0.50; skill 130 gives 0.71; skill 70 gives 0.29.

## 2. Key functions

- `Player.HandleSalvaging`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Player_Crafting.cs` 142-189.
- `Player.AddSalvage`: same file, 191-233. `Player.TryAddSalvage`: 235-292. `Player.GetStructure`: 294-333. `Player.CalcNumUnits`: 342-348. `Player.GetSalvageBag`: 350-369.
- `RecipeManager.GetRecipeChance`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/Managers/RecipeManager.cs` 159-198. Roll: 354-366.
- `SkillCheck.GetSkillChance`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/SkillCheck.cs` 7-12.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Units from one action = 1 + floor(skill x quality x augment factor / divisor) | Divisor 194 (Player_Crafting.cs 347); augment factor 0.25 per level (347) |
| Tinkering yield capped at the item's quality, times stack | Round of workmanship, x stack size (322) |
| Bags per material, capacity, new bag on overflow | Default capacity 100 (237); material to bag table (20-40) |
| Bag value grows with skill and share of units | Divisor 387 (220); cap 75000 (224) |
| Logistic success chance on skill minus difficulty | Factor 0.03 (SkillCheck.cs 9); magic uses 0.07 (SkillCheck.cs 21) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for one piece: units from the piece, then fill the bags of that material in order (skip a full bag, open a new one for the rest), then the value share. It omits the tinkering path and its cap, the augment bonus on value (set to none), the message aggregation, the trained-skill check and the recipe destroy and output rules, and the overflow toggle (the sketch always keeps overflow). It fixes defect 1: the donor adds the full piece workmanship to every bag it touches (`Player_Crafting.cs` 251); the sketch shares it out by units. The logistic chance and roll are the donor's, with real division.

```ts
// Licence: AGPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Piece {
  quality: number; // workmanship of the piece (1 to about 10 in the donor)
  value: number;   // item value in coins
  stack: number;   // stack size (1 for a single piece)
}

export interface Bag {
  material: string;
  structure: number;     // units stored
  maxStructure: number;  // capacity per bag
  workmanship: number;   // sum of quality of pieces that went in
  value: number;         // bag value in coins
}

export const VALUE_CAP = 75000;

// Units from one salvage action: 1 + floor(skill / 194 * quality * (1 + 0.25 * augs)), times stack.
export function salvageUnits(skill: number, quality: number, augs: number, stack: number): number {
  return (1 + Math.floor((skill / 194) * quality * (1 + 0.25 * augs))) * stack;
}

// Put units into bags of one material. A full bag is skipped and a new bag opens for the rest.
// Workmanship and value are shared out by the share of units each bag takes (the donor adds the
// full piece workmanship to every bag it touches; the sketch shares it out instead).
export function addUnits(
  bags: Bag[],
  material: string,
  units: number,
  piece: Piece,
  skill: number,
  maxCap = 100,
): number {
  let remaining = units;
  while (remaining > 0) {
    let bag = bags.find((b) => b.material === material && b.structure < b.maxStructure);
    if (bag === undefined) {
      bag = { material, structure: 0, maxStructure: maxCap, workmanship: 0, value: 0 };
      bags.push(bag);
    }
    const space = bag.maxStructure - bag.structure;
    const amount = Math.min(remaining, space);
    const share = amount / units;
    bag.structure += amount;
    bag.workmanship += piece.quality * piece.stack * share;
    bag.value = Math.min(bag.value + piece.value * share * (skill / 387), VALUE_CAP);
    remaining -= amount;
  }
  return units;
}

// Recipe success chance: logistic in (skill - difficulty), factor 0.03 by default.
export function recipeChance(skill: number, difficulty: number, factor = 0.03): number {
  const chance = 1 - 1 / (1 + Math.exp(factor * (skill - difficulty)));
  return Math.min(1, Math.max(0, chance));
}

// One craft roll against the chance.
export function rollRecipe(chance: number, rng: () => number): boolean {
  return rng() < chance;
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/ACEmulator-ACE-salvage.ts`: exit 0.

## 5. Lands in

- TARGET `src/fight/salvage.ts` (new, engine): turns a taken piece into material units in capped bags, one ledger row per material. If Lead wants salvage outside the fight folder, the same module can sit in the loot code; the shape does not change.
- Parity-checklist row 18 (loot roll and XP award): salvage is the other half of the take-one loot economy.
- Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
- Brief rule served: 1 (one engine, server-written ledger); rules 7-9 n/a

## 6. Gaps and risks

- AGPL-3.0: clean-room only. The sketch is written from the mechanism.
- Defect 1 (Player_Crafting.cs 247-251): `TryAddSalvage` adds the piece's full workmanship (and full item count) to a bag on every call, including each overflow call, while the value share (218-222) is proportional. A raw piece split across two bags adds its workmanship to both. (Combined bags of salvage are scaled correctly in the overflow branch, 254-273, so this defect is for pieces only.) Fix: add `quality * stack * (units put in / units produced)`, as the sketch does.
- Design choice, not proven defect (PropertyManager.cs 590; Player_Crafting.cs 285-288): with `salvage_handle_overages` off (the default), overage from combining two salvage bags is lost (the function reports the full amount as consumed, 285-288; it is the only place the toggle matters). The donor says this is retail behaviour. Frankendom must decide; the default should be "keep the units", since a silent loss of loot is hard to explain to a player.
- Recipe rows: Frankendom wants recipes as rows. The donor's row (Recipe.cs 9-80) has success and failure outputs and destroy chances, which fits. The creation path (`CreateDestroyItems`) is not read.
- The logistic chance has no hard gate: a player well below difficulty still has a small chance (skill 70 against difficulty 100 gives 0.29 in the worked numbers). Frankendom's rulings do not say whether a craft can fail outright below a floor; this must be decided, not copied.
- Repair and durability are NONE in this donor; gathering nodes are NONE. Do not use this donor for row 23 (zone population) or for repair.
- Frankendom's grades replace workmanship; the formula needs the grade number as an input (data field, not a constant).


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
Errors: Mechanism says tinkering path is capped at the piece's rounded workmanship (319-322); real code (Player_Crafting.cs GetStructure) is min(tinkeringAmount, round(workmanship)) * stackSize, so the cap is multiplied by stack size; note drops that. GetRecipeChance also returns 1.0 early when !HasDifficulty(recipe) (RecipeManager.cs ~164-165) so non-difficulty recipes always succeed; note says only the logistic chance. Everything else verified: CalcNumUnits 1+floor(skill/194*w*(1+0.25*augs)), bag capacity MaxStructure ?? 100, workmanship added in full per TryAddSalvage call (defect 1 real), value factor skill/387, cap 75000, 775 example, salvage_handle_overages default false and comment, SkillCheck 0.03 and 0.07, HandleRecipe roll, AGPL licence.
Missed: RecipeManager.GetRecipeChance early return 1.0 for recipes with no difficulty; stack multiplier on the tinkering path; the TinkeringMaterial bag-combining branch in TryAddSalvage (scales items and workmanship on overflow) which is the only place overage handling actually differs, so 'Defect 1' applies to pieces not combined bags.

Fixed 2026-10-12 (Sonnet fixer): added the stack-size multiplier on the tinkering cap; added the no-difficulty recipe always-succeeds return (RecipeManager 164-165); added the combined-bag overflow branch of TryAddSalvage and narrowed defect 1 to raw pieces. Sketch not changed (it already omits the tinkering path and overflow toggle).
