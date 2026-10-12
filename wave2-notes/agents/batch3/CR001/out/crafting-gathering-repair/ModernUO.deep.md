# ModernUO (crafting-gathering-repair, cell 1)

Donor: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Items/Armor/BaseArmor.cs` (with `Items/Weapons/BaseWeapon.cs`, `Engines/Craft/Core/Repair.cs`, `Items/Containers/SalvageBag.cs`, `Engines/Craft/Core/CraftItem.cs`, `Engines/Craft/DefBlacksmithy.cs`, `Engines/Harvest/Core/HarvestBank.cs`, `Engines/Harvest/Core/HarvestSystem.cs`, `Engines/Harvest/Mining.cs`) | Licence: GPL-3.0 (`/mnt/frankendom-donors/ModernUO/LICENSE`, read: "GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007"; header "Copyright 2019-2020 ModernUO Development Team") | C# | symbols `BaseArmor.OnHit`, `Repair` (InternalTarget.OnTarget, armour branch), `CraftItem.GetSuccessChance`, `HarvestSystem` (harvest success), `HarvestBank.Consume`

Checked: cell 1 of 3 in cells-CR001.tsv (list column 4). camera_scope: not a camera cell. Read in full: `BaseArmor.OnHit` (727-780), `ScaleArmorByDurability` (986-996), `ArmorRating` getter (289-328), the durability setter (676-700), `Repair.cs` (1-507, all branches), `CraftItem.CheckSkills`/`GetSuccessChance`/`GetExceptionalChance` (812-912), `SalvageBag.cs` (1-333), `HarvestBank.cs` (1-100), `HarvestSystem.cs` (100-262), `HarvestDefinition.cs` (60-140), `Mining.cs` (80-130). Callers read: `OnHit` is called from `BaseWeapon.cs` 1636 (AbsorbDamageAOS) and 1669 (AbsorbDamage), both read. `Mobile.CheckSkill(min,max)` is read to `SkillCheck.cs` 42-75 (the window and the chance it passes on); the body of `SkillCheck.CheckSkill(from, skill, loc, chance)` at 108 is (not read). Repair callers (who calls `Repair.Do`) are (not read). Confidence high for wear and repair numbers; medium for salvage (read fully, the failure path is a defect found in reading, not run). Recipe rows read as a sample (DefBlacksmithy 187-224), not all 100+ rows. Donor data are C# rows in code; no JSON/XML data file under Projects was read (not checked).

Best transferable idea: a piece of gear has its own durability; hits wear it a little at a time, its protection falls as it wears, and each repair permanently costs a little of its maximum, so a piece can be repaired only a limited number of times before it is spent.
Decision (proposed): adapt — the wear and repair shape fits a take-one gear economy, but only as server-written piece state in the duel step (one ledger), with the ceiling moving only on overflow wear and on repair.
Acceptance: a server test with a seeded RNG runs a 10-hit fixture on a chest piece and asserts hp and ceiling after each hit; a repair at skill 40 on a 50/100 piece asserts the ceiling drops by 3 when the weaken roll passes and hp returns to the ceiling only on a passed skill roll.

## 1. Mechanism

Two halves: wear (a hit lowers the durability of the one armour slot it struck) and repair (a repair attempt costs ceiling points and rolls a skill window).

Wear, in order:
- Hit location: each struck hit picks one slot by weight: neck under 0.07, hands under 0.14, arms under 0.28, head under 0.43, legs under 0.65, otherwise chest (so 7%, 7%, 14%, 15%, 22%, 35%). Only that piece's `OnHit` runs (BaseWeapon.cs 1624-1637 for the AOS path; 1657-1670 for the pre-AOS path, where a shield `OnHit` runs first at 1650-1653).
- `OnHit` soaks damage: `halfar = ArmorRating / 2`, `absorbed = int(halfar + halfar * rnd)`, so the soak is spread over [halfar, 2 x halfar). Damage taken is `max(0, damage - absorbed)` (BaseArmor.cs 729-732). The soak is taken before any wear check.
- Wear happens on 1 hit in 4 (735). Bashing weapons wear `max(1, absorbed / 2)` points; others wear 0 or 1 at random (743). AOS pieces with self-repair can add 2 hp instead (737-739).
- Wear eats current hp first (747-756). Any remainder lowers the ceiling `MaxHitPoints` for good (758-762). If the remainder is not less than the ceiling, the piece is deleted (770-773).
- `ArmorRating` (the getter, 289-328) is scaled by durability at the last step (326): `scale = 50 + 50 * hp / max` (986-995), so a piece at zero hp still gives 50% of its rating.

Repair, armour branch (`Repair.cs` 310-379), in order:
- Full check (347): nothing to do at full hp. Ceiling check (351): if `MaxHitPoints <= toWeaken`, refuse ("will break if repaired again").
- Ceiling cost `toWeaken` (313-335): 1 under AOS; 0 for tailoring pre-AOS (319); otherwise 1 at skill 90 or more, 2 at 70 or more, 3 below 70 (armour uses `Skills[skill].Base`, line 321).
- Weaken roll (357-361): chance in percent = `40 + (maxHits - curHits) - skill / 10` (41-42, using the current hp before the repair; `Skills.Value`), no clamp. If the roll passes, the ceiling drops by `toWeaken` and hp drops by the same (min 0).
- Difficulty (47-48, 52): `difficulty = ((maxHits - curHits) * 1250 / max(maxHits, 1) - 250) * 0.1`, using the values after the weaken step. Range about -25 (no damage) to 100 (hp at zero).
- Skill roll (75): `CheckSkill(skill, difficulty - 25, difficulty + 25)`. Success sets hp to the ceiling (367); failure plays the effect and keeps the piece at its reduced ceiling (371-375). The weaken step happens whether or not the repair succeeds.
- Deed path (`RepairDeed`) uses a linear chance between min and max instead of the skill roll (56-72) and the deed is consumed.

Skill window (read through): `CheckLocation` (SkillCheck.cs 56-75): below min fails; at or above max succeeds; otherwise the chance is `(value - min) / (max - min)` and it is passed to `CheckSkill(from, skill, loc, chance)` (body not read).

Recipes as rows: `AddCraft(type, group, cliloc, minSkill, maxSkill, resource, amount, msg)` (DefBlacksmithy.cs 171, rows 187-224; e.g. PlateChest 75.0 to 125.0 at 25 iron, line 202). Success chance (CraftItem.cs 860-912): any required skill below its min gives 0 (879-900); otherwise `chance = minChance + (val - min) / (max - min) * (1 - minChance)` (904). Blacksmithy `minChance` = 0.0 (DefBlacksmithy.cs 28). Exceptional (812-839, 852): `chance - clamp(0.60 - (skill - 95) * 0.03, 0.45, 0.60)` for blacksmithy (DefBlacksmithy.cs 26 sets the ECA). The exceptional roll (852-855) is separate from the success roll (857).

Salvage (SalvageBag.cs, `Resmelt`, 45-138): turns a taken metal piece into ingots. Difficulty by resource (75-86): dull copper 65, shadow iron 70, copper 75, bronze 80, gold 85, agapite 90, verite 95, valorite 99, other resources 0. Player-made pieces yield `((4 + min(mining, 100)) * recipe amount - 4) * 0.0068`, floored, at least 2 (100-109); other pieces yield 2 (112). If `difficulty > Mining.Value` the result is a failure (115-119).

Gathering nodes as bank rows (Harvest): the map is cut into banks (`HarvestDefinition.GetBank`, 104-127: `x / BankWidth`, `y / BankHeight`, Mining uses 8 x 8). A bank draws a pool in [MinTotal, MaxTotal] at creation (HarvestBank.cs 14-15; Mining rows 88-89 use 10 to 34 for ore). Each harvest consumes `ConsumedPerHarvest` (1) or `ConsumedPerFeluccaHarvest` (2) (Mining.cs 97-98). The first consume from a full bank starts a respawn clock at a random time in [MinRespawn, MaxRespawn] (Mining.cs 90-91 use 10 to 20 minutes; HarvestBank.cs 81-87). Respawn is lazy: `CheckRespawn` runs on every read and refills the bank when the clock has passed (52-67), with no timer object. The success gate (HarvestSystem.cs 142-147) is a hard `Base >= ReqSkill` plus a `CheckSkill(min, max)` roll per resource row (Mining rows: iron 0 / 0 / 100, dull copper 65 / 25 / 105, shadow iron 70 / 30 / 110). Consume happens before the item is given (197), so a full pack loses the ore but still uses the bank (199-207). A tool loses one use only on success (226-240).

## 2. Key functions

- `BaseArmor.OnHit`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Items/Armor/BaseArmor.cs` 727-780. Soak, 1-in-4 wear, overflow to ceiling, delete at zero ceiling.
- `ScaleArmorByDurability`: same file, 986-996. The 50-100% durability scale.
- `ArmorRating` getter: same file, 289-328. Ends with the durability scale (326).
- Hit-slot pick and `OnHit` call: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Items/Weapons/BaseWeapon.cs` 1622-1637 (AOS) and 1657-1670 (pre-AOS).
- Repair, armour branch: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/Craft/Core/Repair.cs` 310-379; weaken and difficulty helpers 41-48; skill roll 75.
- Craft success and exceptional: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/Craft/Core/CraftItem.cs` 812-912.
- Salvage: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Items/Containers/SalvageBag.cs` 45-138.
- Harvest bank: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/Harvest/Core/HarvestBank.cs` 12-98. Harvest success: `HarvestSystem.cs` 100-251.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Soak a fraction of the hit, spread over [half, double half] of the rating | Rating is the piece's own rating (BaseArmor.cs 730) |
| Wear on 1 hit in 4 (`Random(4) == 0`) | 25% (BaseArmor.cs 735) |
| Wear eats current hp first, then the ceiling; ceiling zero deletes | Bashing wear max(1, absorbed/2) (743); other wear 0 or 1 (743) |
| Durability scale: 50% at zero hp, 100% at full | 50 + 50 * hp / max (992); integer division (see defects) |
| Repair costs ceiling points, more when the skill is low | 3 below 70, 2 at 70, 1 at 90, 1 under AOS, 0 for tailoring pre-AOS (Repair.cs 313-335) |
| Weaken chance grows with damage, falls with skill | 40 + deficit - skill/10 (Repair.cs 41-42) |
| Skill window centred on a difficulty that grows with damage | (deficit * 1250 / max - 250) * 0.1, window +/-25 (Repair.cs 47-48, 52, 75) |
| Recipe row: min and max skill, chance at min is zero for blacksmithy | 0.0 at min (DefBlacksmithy.cs 28); exceptional bonus clamp 0.45-0.60 (CraftItem.cs 831) |
| Yield grows with skill and recipe cost | ((4 + mining) * amount - 4) * 0.0068, floor, min 2 (SalvageBag.cs 100-112) |
| Lazy respawn of a node pool after a random delay from first harvest | Pool 10-34 ore, respawn 10-20 min (Mining.cs 88-91); elf 25% faster (HarvestBank.cs 82-84) |

Worked example (non-AOS, non-tailoring, chest at 50/100 hp, skill 40, all numbers from the code above): toWeaken = 3 (skill below 70). Weaken chance = 40 + 50 - 4 = 86%. If it passes: ceiling 97, hp 47, deficit 50, difficulty = (50 * 1250 / 97 - 250) * 0.1, about 39.4, window about [14.4, 64.4], chance about 0.51 (passed to CheckSkill). If it fails: ceiling 100, hp 50, difficulty 37.5, window [12.5, 62.5], chance 0.55. The donor does not give a single number for the whole repair chance; it is the weaken roll times the skill roll.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for wear (soak, 1-in-4 roll, slot wear, overflow to ceiling, delete at zero ceiling) and for repair (refuse at ceiling, weaken roll, difficulty from the post-weaken state, skill window). It omits: the AOS self-repair branch, the shield hit, the golem and deed paths, tailoring and the AOS toWeaken (fixed to the pre-AOS, non-tailoring tier), the hit-slot weights (the caller passes one piece), the item messages, the backpack and poison checks, the Base-versus-Value split (the sketch uses one skill number for both), and the anti-macro location check inside CheckSkill. It uses real division where the donor truncates (skill/10, the difficulty term, the scale), which is the defect fix listed in section 6.

```ts
// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Piece {
  hp: number;      // current durability
  maxHp: number;   // ceiling; only overflow wear lowers it
  blunt: boolean;  // bashing weapon type
  rating: number;  // armour rating before durability scaling
}

export type Rng = () => number; // returns a value in [0, 1)

// Durability scale on the rating: 50% at zero hp, 100% at full hp.
export function scaledRating(p: Piece): number {
  const scale = p.maxHp > 0 && p.hp < p.maxHp ? 0.5 + 0.5 * (p.hp / p.maxHp) : 1;
  return p.rating * scale;
}

// Damage soaked by the piece for one hit: uniform in [halfar, 2*halfar), floored.
export function soak(p: Piece, rng: Rng): number {
  const halfar = p.rating / 2;
  return Math.floor(halfar + halfar * rng());
}

// One struck piece (only the slot the hit landed on is passed in).
export function wearOnHit(p: Piece, absorbed: number, rng: Rng): "ok" | "destroyed" {
  if (rng() >= 0.25) return "ok"; // 25% of hits wear the piece
  if (p.maxHp <= 0) return "ok";
  let wear = p.blunt ? Math.max(1, Math.floor(absorbed / 2)) : (rng() < 0.5 ? 1 : 0);
  if (wear === 0) return "ok";
  if (p.hp >= wear) {
    p.hp -= wear;
    wear = 0;
  } else {
    wear -= p.hp;
    p.hp = 0;
  }
  if (wear > 0) {
    if (p.maxHp > wear) {
      p.maxHp -= wear; // overflow lowers the ceiling for good
    } else {
      return "destroyed";
    }
  }
  return "ok";
}

// Points of ceiling lost per repair attempt (pre-AOS rule; AOS is always 1).
export function toWeakenFor(skill: number, aos: boolean, tailoring: boolean): number {
  if (aos) return 1;
  if (tailoring) return 0;
  return skill >= 90 ? 1 : skill >= 70 ? 2 : 3;
}

export type RepairResult = "full" | "refused" | "repaired" | "failed";

// One repair attempt. skillCheck(min, max) is the skill roll with a difficulty window.
export function repair(
  p: Piece,
  skill: number,
  rng: Rng,
  skillCheck: (min: number, max: number) => boolean,
): RepairResult {
  const toWeaken = toWeakenFor(skill, false, false);
  if (p.maxHp <= 0 || p.hp === p.maxHp) return "full";
  if (p.maxHp <= toWeaken) return "refused"; // the next repair would break it
  const deficit = p.maxHp - p.hp;
  const weakenPct = 40 + deficit - skill / 10; // chance in percent, before the roll
  if (weakenPct > rng() * 100) {
    p.maxHp -= toWeaken;
    p.hp = Math.max(0, p.hp - toWeaken);
  }
  const difficulty = ((p.maxHp - p.hp) * 1250 / Math.max(p.maxHp, 1) - 250) * 0.1;
  if (skillCheck(difficulty - 25, difficulty + 25)) {
    p.hp = p.maxHp;
    return "repaired";
  }
  return "failed";
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/ModernUO-gear-wear.ts`: exit 0.

## 5. Lands in

- TARGET `src/fight/gear-wear.ts` (new, engine): per-piece durability written on each struck hit in the duel step, the durability scale applied to the armour rating, and the repair attempt. The engine owns the write; the client only shows the bar.
- Parity-checklist row 18 (loot roll and XP award). This is the nearest row; no row covers durability, so Lead may want a new row for gear state.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 1 (one engine, server-written state); rules 7-9 n/a

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism, and the donor's line-level code is not translated.
- Defect 1 (BaseArmor.cs 992): `50 + 50 * _hitPoints / _maxHitPoints` is integer division, so the scale floors (for example 1 of 3 hp gives 66%, not 66.7%). The error is under one point of scale; still a defect. Fix: real division (`0.5 + 0.5 * hp / max`). Sketch does this.
- Defect 2 (SalvageBag.cs 115-125, 130): on a failed smelt the ingot is deleted (118) and then added to the backpack (125); the item is deleted only on success (122), so a failure keeps the piece; `Resmelt` returns true either way (130), so the piece counts as salvaged (212-217). Fix: on failure delete the piece and grant nothing (or a smaller yield), and count it as not salvaged. Not run; the donor's AddToBackpack on a deleted item is (not read).
- Defect 3 (Repair.cs 48): the difficulty term and the weaken chance (42) truncate, a sub-point error. Fix: real division. Sketch does this.
- Question (not a defect proven): pre-AOS tailoring repairs never lower the ceiling (Repair.cs 319). This may be intended; Frankendom should decide, not copy.
- Ruling conflicts: Frankendom takes one piece per kill (take-one loot), so a finite repair life on the piece is a sink that only matters if repair is a player action. The durability and soak must be server-written in the duel step, with one order of operations (soak, then wear, then ceiling, as the donor does; Frankendom must choose and test that order itself).
- Frankendom has no cost model yet for repair materials; the donor charges iron (DefBlacksmithy rows) and the deed path is a separate item. Both are (not read) for their item economy.
- Gathering and salvage are summarised, not sketched. The bank model (pool, first-harvest clock, lazy refill) is the zone-row shape for row 23 (zone population), not for row 18: nodes as zone rows need the pool, respawn and cap as zone data.


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
Errors: No false claims found. Verified: BaseArmor.OnHit 727-780 (soak, 1-in-4 at 735, wear 743, ceiling 758-762, delete 770-773), ScaleArmorByDurability 992, BaseWeapon slot weights 1624-1637 and 1657-1670, Repair.cs weaken/difficulty/toWeaken/refuse order, SalvageBag 75-130 incl. failure-path defect, CraftItem 812-912, DefBlacksmithy GetChanceAtMin 0.0 and ECA, HarvestBank/Mining numbers (8x8, 10-34, 10-20 min, 1/2 consumed, elf x0.75), HarvestSystem hard ReqSkill gate plus CheckSkill. Minor imprecision only: Mining resource-row numbers (iron 0/0/100 etc) not re-verified by me (grep found only the sand row at Mining.cs:254). Acceptance (10-hit fixture; repair at skill 40 on 50/100 piece, ceiling -3 when weaken roll passes) is consistent with donor and sketch; no build-fail risk.
Missed: Not flagged as missed: pre-AOS shield OnHit runs first (noted). Not covered: BaseArmor.OnHit applies the soak even though sketch ignores the shield; AOS branch has the SelfRepair hp+2 (noted).
