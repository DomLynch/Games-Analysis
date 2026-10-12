# AAEmu-AAEmu (character-stats-skills, cell 3)

Donor: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Models/Game/Units/Unit.cs` (CalculateWithBonuses, 755-800) with `Models/Game/Char/Character.cs` and `Models/Game/Skills/DynamicBonus.cs` | Licence: unclear as read. README "Licensing information" names LGPL version 3 or later; `LICENSE.GPL` is the GPL version 3 text; `LICENSE.MIT` is an MIT licence (Copyright (c) 2019 Rain0Ash). No per-file header was checked beyond `BaseUnit.cs`. Treated as clean-room, shape only | C# | symbols `Unit.CalculateWithBonuses`, `Character.Str/Sta/MaxHp/Armor/HpRegen`, `Character.RegenTick`, `Unit.RegenTick`, `DynamicBonus.Evaluate`, `CharacterCombat.DoDie`

Checked: read `Unit.cs` 95-112 (stat properties), 687-700 and 735-750 (bonus collection, first lines only), 755-800 (CalculateWithBonuses, full), 876-886 (NeedsRegen), 1555-1575 (RegenTick and the once-per-second comment). `Character.cs` 325-375 (Str, Dex, Sta), 428-446 (MaxHp), 450-470 (HpRegen), 1115-1150 (Armor), 2965-3003 (RegenTick). `DynamicBonus.cs` 1-75 (Evaluate, full). `UnitAttribute.cs` (enum read to line 149; the cut output ended there), `UnitFormulaKind.cs` (full), `UnitModifierType.cs` (full), `UnitPointsRegenTask.cs` (full), `CharacterCombat.cs` 60-90 (DoDie XP loss), `FormulaManager.cs` 1-60 (fields and lookups, not `Load`). Confidence: high on the stat stack order and regen cadence as written; medium on the death XP path (only the XP lines read). Not read: the formula expressions (the donor has no formula data file in its Data or Resources folders, so they are database rows); `LinearFunc.GetValue` (the donor's comment says start to end; the body was not read); the population of `Bonuses` and `DynamicBonuses` (who adds a bonus); the caller of `OnActiveRegionTick`; `WorldManager.DefaultCombatTimeout` (value not read); `ComputeDeathWaitTime`; the Npc, Slave, Mate and Transfer regen overrides (seen as overrides only); the crafting skill (`ActabilityTemplate`).

Best transferable idea: Compute every stat as one base formula plus flat equipment, then run one bonus stack in a fixed order (static flat, dynamic flat, static percent, dynamic percent) so buffs and gear combine the same way for every stat.
Decision (proposed): adapt — take the single stack and its fixed order for melee, guard and regen stats in `src/fight/stats.ts`, but keep the percent rule explicit (percent compounds), move the base formulas into catalogue data, and fix the donor's integer regen (no delta, truncated rate) in the sketch.
Acceptance: A server test asserts a 100-attack base with +10 flat gear and a +20 percent buff gives 132, and that two +10 percent buffs on 100 give 121 (compounding), and that health regen at 0.5 per second over four one-second steps gives exactly 2 points, not 0.

## 1. Mechanism

(a) Base. The six attributes (Str, Dex, Sta and the rest) are formulas over level only (`Character.Str` passes just `level`, Character.cs 326-340). The derived stats are formulas over level and the attributes (for example `MaxHp` 428-443; `HpRegen` 450-468). The formulas come from `FormulaManager` keyed by owner and kind (`UnitFormulaKind`: Str, Dex, Sta, Int, Spi, Fai, MaxHealth, MaxMana, HealthRegen, ManaRegen, Armor, MagicResist, MeleeCritical, MeleeAntiMiss, Block, Dodge and about 40 more).

(b) Flat equipment. Equipped items with `IsNotDestroyed` add their own flat stat values to the base before the stack (`Str` 334-336; `Dex` 351-353; `Sta` similar). For armour, the base is the sum of `armor.BaseArmor` for armour pieces (1135), `weapon.Armor` for weapons (1138) and `accessory.BaseArmor` for accessories (1141), then the stack (1146).

(c) The stack. `CalculateWithBonuses(value, attr)` (755-800) runs four passes in this fixed order (comment at 757):
1. static flat: add every `Value`-type bonus for the attribute (764-769);
2. dynamic flat: add each dynamic bonus that evaluates (772-777);
3. static percent: `value += value * bonus.Value / 100` for each `Percent`-type bonus, in list order (781-786);
4. dynamic percent: the same rule for dynamic bonuses (789-795).
Because each percent is applied to the running value, percent bonuses compound (+10 and +10 gives x1.21, not x1.20). The caller casts the result to int (for example `(int)res` in each getter).

(d) Dynamic bonuses (time-based). `DynamicBonus.Evaluate` (24-58) computes `ratio = elapsed / duration` from the source buff's start time, clamped to 0..1 (46-47), and returns the function's value at that ratio (`LinearFunc`; its `GetValue` was not read). A permanent buff (duration zero or less) is treated as fully elapsed. A `ManualFunc` returns no value (not implemented).

(e) Regeneration. Two rates per unit: `HpRegen` (out of battle) and `PersistentHpRegen` (in battle; default 30 on `Unit` at 104). `Character.RegenTick(delta)` (2970-2992) does nothing when dead, not needing regen, or drowning; otherwise it adds `PersistentHpRegen` if `IsInBattle` (2981-2983) and `HpRegen` otherwise (2987), the same for mana with a post-cast flag, and clamps to max. The delta is passed in but not used in the add. The base comment says the hook is called "about once per second" for units in active player regions (1565). Battle ends after `WorldManager.DefaultCombatTimeout` seconds without combat activity (`CombatTick`, not read in full; the timeout value was not read).

(f) Death. `DoDie` (CharacterCombat 62-92) first calls `ComputeDeathWaitTime` (an escalating respawn timer, body not read) and sets a durability loss ratio (`LastDurabilityLoss`, zero below `MinimumExpLossLevel`). XP is lost only if the player is below max level, in the default instance, and at or above `MinimumExpLossLevel`: then the loss comes from `GetExpLoss`, is capped to the XP earned in the current level (77), and 80 percent of it is recoverable (78). Below the minimum level the player gets a free resurrection; at max level or in another world no XP is lost (`LastExpLoss` is 0) but the durability loss still applies.

## 2. Key functions

- `Unit.CalculateWithBonuses`: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Models/Game/Units/Unit.cs` 755-800. Four passes; percent compounding at 786 and 795.
- `Character.Str`, `Character.Sta` (and `Dex`): `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Models/Game/Char/Character.cs` 326-373. Base formula, equipment flat, then the stack.
- `Character.MaxHp`, `Character.Armor`: Character.cs 428-446 and 1115-1150.
- `Character.HpRegen` and `RegenTick`: Character.cs 450-470 and 2970-2992.
- `DynamicBonus.Evaluate`: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Models/Game/Skills/DynamicBonus.cs` 24-58.
- `UnitPointsRegenTask.Execute`: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Models/Tasks/UnitPointsRegenTask.cs` 9-20. No caller found in `AAEmu.Game` (a grep for the class name only finds its own file), so it is dead code as far as this box shows.
- `CharacterCombat.DoDie`: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Models/Game/Char/CharacterCombat.cs` 60-90.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| One stat stack, fixed order | flat, dynamic flat, percent, dynamic percent (Unit.cs 757) |
| Percent unit | value / 100 (786, 795) |
| Dynamic ratio | elapsed / duration, clamped 0..1 (DynamicBonus.cs 46-47) |
| Regen per unit | HpRegen out of battle, PersistentHpRegen in battle, default 30 for the persistent rate on `Unit` (Unit.cs 104); Character overrides both with formulas (Character.cs 450, 475) |
| Death XP | loss capped to the current level's XP (CharacterCombat.cs 77); 80 percent recoverable (78); none at max level or outside the default instance; durability loss and an escalating respawn timer also run (62-70) |

### 3b. Catalogue rows (SK-FOCUS table format)

| name | what it does | formula | number ranges | caps | file:line |
|---|---|---|---|---|---|
| Str, Dex, Sta, Int, Spi, Fai | six base attributes | level formula, plus equipment flat, then the stack | formula data not in donor (database) | int cast | Character.cs 326-373 (Str, Dex, Sta; Int, Spi, Fai follow the same shape, not read) |
| MaxHp | max health | level formula over level and the six attributes, then the stack | formula not read | int cast | Character.cs 428-446 |
| MaxMp | max mana | same shape as MaxHp | formula not read | int cast | Character.cs 502-520 |
| HpRegen | health per call out of battle | level and attribute formula, then the stack | formula not read | int cast | Character.cs 450-468 |
| PersistentHpRegen | health per call in battle | `= 30` default on Unit; Character overrides | Character formula not read | int cast | Unit.cs 104; Character.cs 475 |
| Armor | armour total | sum of piece armour (armour, weapon, accessory), then the stack | piece values in item data (not read) | int cast | Character.cs 1115-1150 |
| Melee, ranged and spell critical, anti-miss, dodge, block, parry | combat chances | formula kinds exist (MeleeCritical, MeleeAntiMiss, Block, Dodge, MeleeParry, and so on) | formulas not read | not read | UnitFormulaKind.cs (enum values 1-46; line not recorded) |
| Facet, MagicResist | resistance and other | formula kinds exist (values 19 and 20 in the enum) | not read | not read | UnitFormulaKind.cs (enum values 19-20; line not recorded) |
| Actability (crafting) | crafting skill levels | attribute ids (enum values 99-118, for example Archemy and Cook) | not read | not read | UnitAttribute.cs (enum values 99-118; line not recorded); CharacterAbilities.cs 53-57 (grep only) |
| Luck | none | no luck attribute; the one luck hit is a random craft roll (CharacterCraft.cs 401) | none | none | grep only |
| Death XP loss | XP lost on death | `GetExpLoss(level, rate)`, capped to in-level XP; only below max level, in the default instance, at or above the minimum level | rate in configuration (not read) | cap to in-level XP | CharacterCombat.cs 72-78 |
| Recoverable XP | XP that can be recovered | 80 percent of the loss | 0.80 | none | CharacterCombat.cs 78 |

Not read in this pass, so no rows: the encumbrance or tired-body state (not searched), the stamina or fatigue cost of actions (not searched), poise and stagger, block, parry and riposte windows, damage types against armour, hit location and wounds, skill gain formulas, talents, level-50 curves, magic schools.

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order of operations: the four-pass stat stack with compounding percents, the elapsed ratio for dynamic bonuses (the value function is the caller's input, because `LinearFunc.GetValue` was not read), and the battle switch for regen. The regen step is the fix (see section 6): it scales by the real delta and carries the fraction. It omits the formulas (database rows), the drowning and post-cast mana branches, the combat timeout, the death XP path and the packet broadcast, and it assumes the caller's cadence is one second only as a cap, not as a rule.

```ts
// Licence: unclear as read (README names LGPL-3.0; LICENSE.GPL is GPL-3.0 text; LICENSE.MIT is MIT, Rain0Ash 2019). Clean-room, shape only: written from the order of operations in Unit.cs, Character.cs and DynamicBonus.cs.
// Frankendom target: src/fight/stats.ts (stat stack and regen step).

export interface Bonus {
  pct: boolean;   // true = percent (value / 100), false = flat
  value: number;
}

// Order: static flat -> dynamic flat -> static percent -> dynamic percent.
// A percent adds value * p / 100 to the running value, so percent bonuses compound.
export function statStack(base: number, statics: readonly Bonus[], dynamics: readonly Bonus[]): number {
  let v = base;
  for (const b of statics) if (!b.pct) v += b.value;
  for (const d of dynamics) if (!d.pct) v += d.value;
  for (const b of statics) if (b.pct) v += (v * b.value) / 100;
  for (const d of dynamics) if (d.pct) v += (v * d.value) / 100;
  return v;
}

// Dynamic bonus ratio: elapsed over duration, clamped to 0..1 (donor DynamicBonus.cs 46-47).
export function elapsedRatio(elapsedMs: number, durationMs: number): number {
  if (durationMs <= 0) return 1;
  const r = elapsedMs / durationMs;
  return r < 0 ? 0 : r > 1 ? 1 : r;
}

export interface RegenState {
  hp: number;
  maxHp: number;
  carry: number;   // fraction of a point carried between steps
}

// Regen step: rate per second, scaled by the real elapsed time, whole points applied, the fraction carried.
// Fix (donor defect): the donor adds an integer per call and ignores the delta, and its int cast drops rates under 1.
export function regenStep(s: RegenState, ratePerSec: number, dtSec: number): void {
  if (s.hp <= 0 || s.hp >= s.maxHp) return;
  const dt = dtSec > 1 ? 1 : dtSec;   // cap the step at one second
  s.carry += ratePerSec * dt;
  const whole = Math.trunc(s.carry);
  s.carry -= whole;
  s.hp = Math.min(s.maxHp, s.hp + whole);
}

// Battle selects the persistent rate (donor Character.cs 2981-2987).
export function regenRate(inBattle: boolean, outOfBattleRate: number, inBattleRate: number): number {
  return inBattle ? inBattleRate : outOfBattleRate;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/stats.ts` (new): one stat stack for guard, parry, dodge, regen and damage stats, fed by flat gear, percent buffs and time-based buffs. Base formulas and regen rates are catalogue data.
- Parity-checklist row 21 (catalogue fields): the base formulas, the per-piece armour values and the regen rates become catalogue fields; the stack order is an engine rule. The guard and parry stat use is row 3 and is not claimed here.
- today: not checked in this pass (the Frankendom repo was not opened).
- Reuse tag: rewrite-from-idea (licence unclear: clean-room, shape only).
- Brief rule served: Frankendom rulings: one engine (the stack lives in the engine, not in the client), server-verified state (regen is server-side), data-driven values (row 21); rules 7-9 n/a.

## 6. Gaps and risks

- Defect, regen ignores the delta: `Character.RegenTick(delta)` adds `HpRegen` or `PersistentHpRegen` as a whole amount per call (2983, 2987). The rate is therefore per call, not per second. If the hook runs late or early, regen speeds up or slows down, and the donor's own comment says only "about once per second" (1565). Fix: scale the rate by the real delta and carry the fraction (the sketch's `regenStep`).
- Defect, truncated rate: `HpRegen` is an `int` property (`public override int HpRegen`, 450; `return (int)res;`), so a formula value under 1 becomes zero and the fraction is lost. Fix: keep the rate as a float and carry the remainder (the sketch's `carry`).
- Dead code: `UnitPointsRegenTask` (9-20) adds `HpRegen` and checks `unit.Hp > 0` before adding mana (the code reads `Hp` in the mana test), and it has a TODO that battle rates are not applied (13). No caller was found in `AAEmu.Game`. Fix: delete it or route it through `regenRate`.
- Compounding percents: `value += value * bonus / 100` (786, 795) makes +10 and +10 give x1.21. This is probably intended, but the donor does not say so. Frankendom must state the rule in its catalogue, and a test should pin it.
- The stack order is fixed, but the list order of percents comes from dictionary iteration (`Bonuses.Values`, Unit.cs 694) and is not sorted. Compounding is commutative, so the result is the same, but any rounding inside the loop could differ. The sketch does not reproduce the dictionary order.
- Death XP cap: the loss is capped to in-level XP (77), so a player cannot lose a level by death. This is a rule Frankendom can keep (progression, row 17), but it is not a stat mechanism; it was read only in part.
- Licence: unclear. README names LGPL-3.0, `LICENSE.GPL` is GPL-3.0 and `LICENSE.MIT` is MIT. Keep clean-room. Do not copy any line.
- Not claimed for fast fights: the formula values (database), so no numbers are chosen from this donor. The regen constant (30 for persistent) is a default, and the character override was not read for its value.

Reuse tag: rewrite-from-idea (licence unclear; clean-room, shape only)
Brief rule served: Frankendom rulings (one engine, server-verified state, data-driven values); parity row 21


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
Errors: (1) Mechanism (a) says every stat is a formula over level, Str, Dex, Sta, Int, Spi, Fai; Character.Str (Character.cs 326-340) passes only {level}; the full attribute set is used by derived stats (HpRegen 450-468 etc.). (2) Death XP (f): note says only 'below MinimumExpLossLevel the death is free'; DoDie (CharacterCombat.cs 62-92) has three branches: loss only if Level < MaxPlayerLevel AND in the default instance AND Level >= MinimumExpLossLevel; max-level or other worlds lose no XP (LastExpLoss=0); it also sets LastDurabilityLoss and calls ComputeDeathWaitTime first. Cap to in-level XP (77) and 0.80 recoverable (78) are correct. (3) Licence: README names LGPL v3 (either version 3 ... lines 36-37; 'or later' not seen in the lines I printed), fine as 'unclear'. Verified OK: CalculateWithBonuses 755-800 four passes and order comment, percent compounding at 786/795, Evaluate 24-58 with clamp 46-47 and ManualFunc false, PersistentHpRegen = 30 at Unit.cs:104, HpRegen (int)res, RegenTick 2970-2992 ignoring delta (2983/2987), UnitPointsRegenTask dead code (only own file), its mana test reads Hp, equipment IsNotDestroyed, Armor sum 1135-1146, acceptance maths 132 and 121.
Missed: Durability loss on death (LastDurabilityLoss) and escalating respawn timer in DoDie; XP loss exemption at max level.

Fixed 2026-10-12 (Sonnet fixer): attribute formulas now stated as level-only (derived stats use the attributes); death section now covers the three branches (loss, free resurrect, max level or other world) plus the durability loss and escalating respawn timer. Licence line left as 'unclear' (checker agreed). Sketch not changed.
