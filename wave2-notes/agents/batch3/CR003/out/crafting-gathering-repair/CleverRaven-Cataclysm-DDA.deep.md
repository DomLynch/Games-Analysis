# CleverRaven-Cataclysm-DDA (crafting-gathering-repair, cell 30)

Donor: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/item_degrade.cpp` (wear; repair in `iuse_actor.cpp`, salvage in `crafting.cpp`, gathering in `activity_actor.cpp`) | Licence: CC BY-SA 3.0 (`LICENSE.txt` line 1: "Cataclysm is licensed under the Creative Commons Attribution-ShareAlike 3.0 Unported License") | C++ | symbol `item::damage_armor_durability`

Checked: Read end to end: `item::damage_armor_durability` (item_degrade.cpp 898-960), `item::mod_damage` (856-887), `get_degrade_amount` (843-854), `force_set_damage` (273-277), `damage_adjusted_armor_resist` (252-265), `repair_item_actor::repair_chance` (3339-3396), `repair_item_actor::repair` (3466-3560), `damage_item` (3434-3456), `harvest_activity_actor::finish` (activity_actor.cpp 7455-7490). Callers read: armour hit path character_armor.cpp 222-298 (both 249 and 287 call sites) and the worn-item loop character_attire.cpp 1832-1890; repair callers iuse_actor.cpp 3491 and activity_handlers.cpp 575-600. Salvage: `complete_disassemble` read from 5520 through the component loop (5532-5600); lines 5497-5519 (start of the function) and the yield tally after 5600 read only in part. Gathering loader read at harvest.cpp 143-180 only. Not read: `melee.cpp` 2118 (shield caller), the per-type `degrade_increments` values, `item::max_damage()` (I assume it equals `itype::damage_max()`, 4000, for the examples below), the terrain/furniture harvest rows and recipe JSON rows (only the materials JSON repair rows at lines 29, 217 and 250 were read). Confidence: high on wear and repair; medium on salvage; high on the gathering roll. Data half: `data/json/materials.json` (repair_difficulty rows), no recipe or harvest-list data rows read.

Best transferable idea: Keep wear in two numbers, a repairable damage counter that repair can lower and a degradation floor that wear raises at each new level, so repair cannot restore a piece worn past its floor.

Decision (proposed): adapt — the two-counter wear and the per-hit wear chance fit a one-ledger, server-verified fight; the skill-based repair roll only fits if Frankendom adds a crafting skill, so it stays optional.
Acceptance: A server test in a 3-vs-1 fight: each damaging hit moves one armour piece down one durability step at most, a repaired piece never drops below its degradation floor, and protection falls 12.5 percent per level above 1 (the player sees the durability step change once per damaging hit).

## 1. Mechanism

Three linked loops on the item itself. Wear is per hit, repair is per activity, salvage is per disassembly.

- Wear per hit. `Character::armor_absorb` (character_armor.cpp 262) calls `damage_armor_durability` (called at 249 and 287) with the pre-mitigation damage. Order inside it: (a) energy-shield pieces lose shield HP instead and return early (not read in full); (b) UNBREAKABLE or zero enchant multiplier returns undamaged; (c) the threshold is `armors_own_resist` = fragile ? resist x 0.6666 : max(10, resist x 1.3333) (940); (d) steepness k = fragile ? 0.1 : 1.0 (942); (e) chance = 0.8 / (1 + e^(-k (premitigated - threshold))), and for non-fragile pieces divided by the number of body parts covered (943, 950); (f) sturdy pieces return undamaged below the threshold (954); (g) a roll `x_in_y(chance, 1.0)` (956) calls `mod_damage(1000)`, which returns DAMAGED or DESTROYED.
- Levels and their cost. Damage counter runs 0 to 4000 (itype.h 1665). Level is 0 at zero, else `1 + 4 * damage / 4000`, clamped to 5 (itype.cpp 176). Protection = resist x (1 - 0.125 x (level - 1)) (item_degrade.cpp 263), so a level-5 piece keeps half its resist. A fresh piece takes four damaging rolls to reach 4000 and the fifth destroys it (`destroy = (damage_ + qty) > max_damage()`, 866).
- Two counters. `mod_damage` also raises `degradation_` by `get_degrade_amount`, which counts levels crossed (843-854, 870). `force_set_damage` clamps the damage counter to [degradation, max] (275). So a repair (`mod_damage(-1000)`, iuse_actor.cpp 3537) cannot take the piece below its degradation floor. `repairable_levels` (889-896) counts only the levels above that floor.
- Repair roll. `repair()` picks RT_REPAIR when damage > degradation (3400-3401). Difficulty = most difficult material's `repair_difficulty` (iuse_actor.cpp 3242; material rows in `data/json/materials.json` at lines 29 = 4, 217 = 0, 250 = 5) plus the damage level (3353, 3369). Success % = 10 + 2 x skill - 2 x difficulty + tool_quality / 5 (3387). Failure % = difficulty - skill - (tool_quality + dex) / 5 (3389). Both clamp to 0..1, and success is capped at 1 - failure. A roll u in [0,1): u above 1 - failure is FAILURE, which calls `damage_item` and adds one wear step (3439, 3525); u below success is SUCCESS, which removes one step (3537); otherwise the activity retries (AS_RETRY). Practice is added on every attempt until the skill passes `trains_skill_to` (`practice_amount` = material difficulty / 2 + 1, 3492; zeroed past `trains_skill_to` at 3514-3515; the call is 3517).
- Salvage (disassembly). `complete_disassemble` gives each component of the piece two checks. Skill check: `skill_dice = 2 + 4 x skill` dice of `16 + INT` sides against the recipe difficulty as dice (5556-5562, 5589). Damage check: `0.8^damage_level` (5571, 5591). A component is recovered only if both pass, and a failed component is tallied as destroyed. If the piece has no recorded components, the recipe's component list is used (5532-5538).
- Gathering. `harvest_activity_actor::finish` (activity_actor.cpp 7455): for each entry on the node, `min = base_min + scale_min x survival skill` and max likewise (7470-7471), roll = min(entry.max, round(uniform(min, max))) (7472). Loader defaults: base 1..1, scale 0 (harvest.cpp 177-178). After the entries, the node becomes its transform (`ter_set(..., get_ter_transforms_into)`, 7487): one-shot depletion. The "nothing harvested" message is set by the last entry only (defect, see section 6).

## 2. Key functions

- `item::damage_armor_durability`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/item_degrade.cpp` 898-960. Whole wear pipeline: threshold, curve, body-part split, sturdy gate, roll, step.
- `item::mod_damage` and `get_degrade_amount`: item_degrade.cpp 856-887 and 843-854. Step, destroy check, degradation rise.
- `repair_item_actor::repair_chance`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/iuse_actor.cpp` 3339-3396. Success and failure percentages.
- `repair_item_actor::repair`: iuse_actor.cpp 3466-3560. Roll bands at 3500-3502, outcomes at 3519-3537.
- `Character::complete_disassemble`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/crafting.cpp` 5497-5600. Per-component skill and damage checks.
- `harvest_activity_actor::finish`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/activity_actor.cpp` 7455-7490. Entry roll and node depletion.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Wear chance is a capped logistic around a threshold | cap 0.8; threshold 1.3333 x resist with floor 10 (item_degrade.cpp 940); k 1.0 (942); 40 percent at the threshold (comment 931) |
| Fragile pieces have a lower threshold and a flatter curve | threshold 0.6666 x resist; k 0.1 (940, 942) |
| Large pieces take less wear per body part | chance / covered parts (950) |
| Wear ceiling and step | max 4000 (itype.h 1665); step 1000 (itype.h 1685); level = 1 + 4 d / 4000 clamped 0..5 (itype.cpp 176) |
| Protection falls with level | minus 12.5 percent per level above 1 (item_degrade.cpp 263) |
| Repair success and failure rolls | success 10 + 2 skill - 2 difficulty + tool/5; failure difficulty - skill - (tool + dex)/5 (iuse_actor.cpp 3387, 3389) |
| Difficulty from the hardest material | material repair_difficulty rows, values 0 to 5 seen (materials.json 29, 217, 250) |
| Salvage yield gated by damage | 0.8 per damage level (crafting.cpp 5571) |
| Salvage skill dice | 2 + 4 x skill dice (5556) |
| Gathering roll | base 1..1 plus scale x survival skill, cap at entry max (harvest.cpp 177-178; activity_actor.cpp 7470-7472) |

## 4. TypeScript sketch

simplified: the sketch keeps the wear roll, the level-based protection factor, the two-counter floor and the repair roll. It omits the energy-shield path, UNBREAKABLE and enchantment multipliers, the donor's exact degradation amount (the sketch uses a per-level constant `degradePerLevel` standing for the per-type `degrade_increments`, not read), the destroy case (the sketch returns 'destroyed' without changing damage; the donor clamps damage first), faults, tool charges and material use, the refit and resize repair paths, practice gain, and the activity retry loop. The sketch does not apply the wear step on a failed repair; the caller must.

```ts
// clean-room: shape of the mechanism only (donor is CC BY-SA 3.0). Numbers are data fields, not copied.
interface Piece {
  damage: number;        // repairable wear, 0..maxDamage
  degradation: number;   // permanent floor set by wear; repair cannot go below it
  resist: number;        // the piece's own resist to this hit type
  fragile: boolean;
  sturdy: boolean;
  coveredParts: number;  // body parts covered (large pieces take more punishment)
  maxDamage: number;     // data field, donor default 4000
}

interface RepairInput {
  skill: number;
  dex: number;
  toolQuality: number;
  materialDifficulty: number; // hardest material of the piece
}

const STEP = 1000;   // one wear or repair step = one damage level
const LEVELS = 5;

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

// 0 = pristine; 1..5 by share of maxDamage.
function damageLevel(p: Piece): number {
  if (p.damage === 0) return 0;
  return clamp(1 + Math.floor((4 * p.damage) / p.maxDamage), 0, LEVELS);
}

// Protection left after wear: each level above 1 removes 12.5% of resist.
function protectionFactor(p: Piece): number {
  return Math.max(0, 1 - Math.max(0, damageLevel(p) - 1) * 0.125);
}

// Chance one hit wears the piece: logistic, 40% at the midpoint, capped at 80%.
function wearChance(p: Piece, premitigated: number): number {
  const mid = p.fragile ? p.resist * 0.6666 : Math.max(10, p.resist * 1.3333);
  const k = p.fragile ? 0.1 : 1.0;
  if (p.sturdy && premitigated < mid) return 0;
  let c = 0.8 / (1 + Math.exp(-k * (premitigated - mid)));
  if (!p.fragile) c /= p.coveredParts;
  return c;
}

// Applies one wear step when the roll hits. Returns 'destroyed' if the step would pass maxDamage.
function hitWear(p: Piece, premitigated: number, roll: number, degradePerLevel: number): 'undamaged' | 'damaged' | 'destroyed' {
  if (!(roll < wearChance(p, premitigated))) return 'undamaged';
  if (p.damage + STEP > p.maxDamage) return 'destroyed';
  const before = damageLevel(p);
  p.damage += STEP;
  const crossed = damageLevel(p) - before;
  if (crossed > 0) p.degradation = Math.min(p.maxDamage, p.degradation + crossed * degradePerLevel);
  p.damage = Math.max(p.damage, p.degradation);
  return 'damaged';
}

// One repair attempt. On 'failure' the caller must apply one wear step (donor damage_item); this function does not.
function repairOutcome(p: Piece, r: RepairInput, roll: number): 'success' | 'retry' | 'failure' {
  const difficulty = r.materialDifficulty + damageLevel(p);
  const success = clamp((10 + 2 * r.skill - 2 * difficulty + r.toolQuality / 5) / 100, 0, 1);
  const fail = clamp((difficulty - r.skill - (r.toolQuality + r.dex) / 5) / 100, 0, 1);
  const succ = Math.min(success, 1 - fail);
  if (roll > 1 - fail) return 'failure';
  if (roll < succ) return 'success';
  return 'retry';
}

function applyRepair(p: Piece): void {
  p.damage = Math.max(p.degradation, p.damage - STEP);
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS with the block plus `export {};` (file `/tmp/cr003-cdda-gear-wear.ts`): exit 0.

## 5. Lands in

- TARGET `src/fight/gear-wear.ts` (new module): per-piece wear on each hit, after armour absorb and before the death check, plus the repair roll. Parity-checklist row 18 (loot roll and XP award), since the salvage and repair rolls pay out gear. Frankendom's current gear code was not read in this pass.
- Reuse tag: rewrite-from-idea (CC BY-SA 3.0, copyleft: clean-room, shape only)
- Brief rule served: one ledger (wear is written to the item in the engine, not in the client); server-verified (the roll runs on the server); rule 2 (judge the idea, not the genre)

## 6. Gaps and risks

- Copyleft (CC BY-SA 3.0): clean-room only. The sketch restates the mechanism with Frankendom names; every number is a data field, listed in the sidecar.
- One ledger: the donor changes damage, degradation and armour in the middle of the hit. Frankendom must run wear in the same server transaction as the hit, in one fixed order (armour, then wear), and test that order.
- MAX_ATTACKERS = 3: nothing in the donor limits how many wear rolls one exchange makes. Three attackers can each roll on the same piece. Frankendom needs a per-exchange cap or an explicit rule.
- Seeded RNG: the donor uses its global RNG (`x_in_y`, `rng_float`). Frankendom needs the server RNG seeded per fight so fight record and replay (row 19) reproduce wear.
- Destruction mid-fight: the donor removes the piece at once. What the player loses is a Lead decision; not decided here.
- Gathering as zone rows: the harvest entry shape (base, scale, max, per node) fits zone data. The donor's node depletes into a transform (7487); whether a timer respawns it was not read (row 23 territory).
- Defect 1 (gathering, fix: keep the idea): activity_actor.cpp 7473 writes `got_anything = roll > 0;` inside the entry loop, so the "couldn't harvest anything" message (7479) reflects only the last entry. Fix: `got_anything = got_anything || roll > 0;`.
- Defect 2 (stale comment, fix: state it in Frankendom data): iuse_actor.cpp 3252-3253 says difficulty can come from the lowest-level recipe. The code reads only material `repair_difficulty` and `repairs_like` (3235-3268). Fix: define repair difficulty on the material row only.
- Defect 3 (stale comment, fix: table covers 0 to 5): crafting.cpp 5570 says damage level is 0 to 4, but `itype::damage_level` can return 5 (itype.cpp 176). At level 5 the salvage yield is 0.8^5, about 33 percent.
- Not verified: the donor's hoodie sample row (iuse_actor.cpp 3373) is consistent with a material difficulty of 2 for cotton. I did not read cotton's material row, so I did not confirm it.
- Not checked: whether `get_covered_body_parts().count()` can be 0 (division at item_degrade.cpp 950).

Reuse tag: rewrite-from-idea (CC BY-SA 3.0, copyleft: clean-room, shape only)
Brief rule served: one ledger; server-verified kills; rule 2 (judge the idea, not the genre)
