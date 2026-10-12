# daggerfall-unity (magic-spells-powers, cell 1)

Donor: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Formulas/FormulaHelper.cs` | Licence: MIT License, Copyright (c) 2009-2023 Daggerfall Workshop (read from `/mnt/frankendom-donors/daggerfall-unity/LICENSE`; code may be adapted) | C# (Unity) | symbol `SavingThrow`

Checked: Read end to end: `FormulaHelper.SavingThrow` (1443-1546), `MagicResist` (93-99), `ModifyEffectAmount` (1575-1583), the cost chain `CalculateTotalEffectCosts` (2203-2240), `CalculateEffectCosts` (2261-2340), `ApplyTargetCostMultiplier` (2345-2366), `GetEffectComponentCosts` (2372-2381). Also read: `EntityEffectManager.cs` 312-441 (ready and cast), 443-600 (AssignBundle), 2068-2112 (release), 1160-1290 (absorb, reflect, resist), 1676-1745 (constant and magic-round tick), 1932-1944 (silence), 2043-2101 (enemy cast and release); `EntityEffectBroker.cs` 36 and 202-240 (minute tick); `EntityEffect.cs` 745-810 (chance, magnitude); `Thaumaturgy/CharmEffect.cs` and `Thaumaturgy/SpellResistance.cs` in full; `DaggerfallEntity.cs` 670-692 and 815-858; `Dice100.cs`. Confidence: high for the saving-throw chain and the cost formula (every line of both read; callers of `SavingThrow` found by grep are AssignBundle, the `IEntityEffect` wrapper used by `ModifyEffectAmount`, the disease paths, MaceOfMolag and MehrunesRazor; `ModifyEffectAmount` has one caller, `GetMagnitude` at EntityEffect.cs 806). Not read: the spell record reader (SPELLS.STD layout), the duration formula (EntityEffect.cs around 900-935), the absorption body after 1205, `DamageHealth.cs`, `PacifyEffect.cs`, the body of `CalculateSpellPointRecoveryRate` (FormulaHelper 219), and the body of the Charm "until attacked" reset (not found in the files read). Camera: not applicable (magic note).

## 1. Mechanism

- One resisted spell effect passes through up to four gates, in this order, all inside the engine's effect manager (`AssignBundle`, EntityEffectManager.cs 439-600):
  (a) Spell-level resistance: a Spell Resistance incumbent effect rolls its own chance (`TryResistance`, 1247-1262). It is skipped for caster-only spells (1256). It is only called for bundles of type Spell and only when bypass is not set (525). Absorption (`TryAbsorption`, body at 1160) and Reflection (`TryReflection`, body at 1207, called at 521) run before it.
  (b) Element pre-check: each entity keeps a resist chance per element (`resistanceChances`, DaggerfallEntity 679 and 691). `SavingThrow` rolls it first and returns 0 (full resist) on success (FormulaHelper 1452-1454). The chances are summed from every source that raised them in the frame and are cleared by `ClearConstantEffects` (852).
  (c) Saving throw value: start at 50 (1458). Add tolerance steps and race/career flags (1465-1519), add biography and caller modifiers (1521). If the total is 100 or more, the result is full save (1526-1527). Otherwise add `MagicResist` = floor(Willpower / 10) (1530, 99), then clamp to 5..95 (1532).
  (d) Roll 1..100 (1535). Kept percent: if roll is above the save value, kept stays 100 (the failed save; the default set before the branch). If roll is at or below the save value, and `save - 20 <= roll`, kept = `100 - 5 * (save - roll)` (1540-1541), so kept rises from 0 at `save - 20` to 100 at `save`. Below `save - 20`, kept = 0 (1542-1543). The final clamp to 0..100 is at 1546.
- The kept percent is used in two different ways:
  - Effects with a magnitude (damage, drain, heal): `GetMagnitude` rolls the magnitude, then scales it with `ModifyEffectAmount` (EntityEffect.cs 798-806; FormulaHelper 1575-1583). Self-cast (caster-only) bundles are not scaled (805).
  - Effects without a magnitude (e.g. paralysis, disease): `AssignBundle` only checks for exactly 0 and skips the effect (EntityEffectManager 565-575). Partial values are ignored on that path.
- Order of steps matters: the immunity test (1526) happens before `MagicResist` is added, and a race-immune player is set to 100 directly (1471), so later tolerance steps can still subtract from that value (see section 6).
- Casting model (EntityEffectManager 312-441, 2098-2101): `SetReadySpell` calls `CalculateTotalEffectCosts` (327) for the cost, and, for the player only (`IsPlayerEntity`, 337), refuses to ready the spell when current spell points are below it; enemies are exempt (comment 334-335) as long as they have at least 1 spell point. Silence and an in-progress cast block readying (315). Caster-only spells are cast instantly (350). `CastReadySpell` (401) checks silence (404), then for a touch spell checks the aim ray is in touch range (413), deducts the cost (426), and for the player plays the cast animation with `castInProgress` set (435). The player's release happens in `PlayerSpellCasting_OnReleaseFrame` (2098), which clears `castInProgress`, tallies skills, and then either assigns a caster-only bundle to self or launches a missile carrying the spell as payload (`DaggerfallMissile`; its hit handling was not read). For enemies the same method calls `EnemyCastReadySpell` at once (439; the enemy branch of the update is at 273-277; the release code is 2043-2092). No cast time is stored in data in these paths; the animation length was not read.
- Time model: one magic round per game minute (`EntityEffectBroker.Update`, 202-234; the comment at 209). After a long rest or travel the tick catches up, capped at 2 days = 2880 rounds (`maxCatchupDays = 2` at line 36; the cap is applied at 223). Effects with rounds remaining tick (1733); a duration effect with no rounds left is ended (1735-1736, `effect.End()`).
- Constant effects (stat mods, flags such as silence and resist) are cleared at the start of each constant tick (`DoConstantEffects` 1679-1682), and spell points are clamped to max after them (1701).

## 2. Key functions

- `FormulaHelper.SavingThrow(elementType, effectFlags, target, modifier)`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Formulas/FormulaHelper.cs` 1443-1546. The whole resist chain, steps (b) to (d) above.
- `FormulaHelper.SavingThrow(IEntityEffect, target)` wrapper: same file 1559-1573. Builds the flags and element from the effect (`GetEffectFlags`, `GetElementType`) and the modifier from the element's resistance (`GetResistanceModifier`, 1654-1671).
- `FormulaHelper.ModifyEffectAmount`: same file 1575-1583. `amount * kept / 100`, truncated.
- `FormulaHelper.MagicResist`: same file 93-99. `floor(willpower / 10)`.
- `EntityEffectManager.AssignBundle`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/MagicAndEffects/EntityEffectManager.cs` 443-600. Instantiates the effects, runs absorb, reflect, resist, the chance roll (533-541), and the no-magnitude save (565-575).
- `EntityEffectManager.TryResistance`: same file 1247-1262. The spell-level resist.
- `EntityEffectManager.SetReadySpell` (312-359) and `CastReadySpell` (401-441): cost gate, touch-range check, cost deduction, release for enemies.
- `FormulaHelper.CalculateTotalEffectCosts` (2203-2240) and `CalculateEffectCosts` (2261-2340): cost per effect, summed, multiplied, floored.
- `EntityEffect.GetMagnitude` (EntityEffect.cs 786-808): base and plus roll, caster-level multiplier, then saving-throw scaling.
- `EntityEffectBroker.Update` (202-234): minute-based magic rounds with catch-up cap.
- `Dice100.Roll` (Assets/Scripts/Game/Utility/Dice100.cs 10-13) and `Dice100.SuccessRoll` (15-18): 1..100 roll, and success when the 0..99 roll is below the chance.

## 3. Numbers vs mechanism

The mechanism is a single resist roll that returns a percent (0..100) of the effect that survives. The numbers are constants in the engine, except the per-effect cost and magnitude settings, which come from spell data.

TABLE (magic mechanisms; cost column = spell points unless stated):

| name | effect | formula | number ranges | cost | cooldown / cast time | caps | file:line |
|---|---|---|---|---|---|---|---|
| Element pre-check | full resist if roll passes the element chance | `roll <= chance` (Dice100 0..99 `<` chance) | chance is the sum raised this frame (e.g. ElementalResistance.cs 207 raises it by ChanceValue) | none | instant | chances cleared each constant tick | FormulaHelper 1452-1454; DaggerfallEntity 679, 691, 852; EntityEffectManager 1682 |
| Base save | starting save chance | 50 | 50 | none | instant | none | FormulaHelper 1458 |
| Race tolerance (player only) | race resist +30, race immune = 100, low -25, critical -50 | additive, immune overwrites | +30 / 100 / -25 / -50 | none | instant | immune overwrites the running total | FormulaHelper 1465-1475 |
| Career tolerance | Immune +50, CriticalWeakness -50, LowTolerance -25, Resistant +25 | additive | +50 / -50 / -25 / +25 | none | instant | none | FormulaHelper 1512-1519 |
| Biography and caller modifier | player bio mod plus per-element modifier | additive | bio mod from save file; modifier from element resistance | none | instant | none | FormulaHelper 1521; 1654-1671 |
| Full-immunity gate | total >= 100 gives full save before MagicResist | `if (s >= 100) return 0` | threshold 100 | none | instant | none | FormulaHelper 1526-1527 |
| MagicResist | save bonus from Willpower | `floor(Willpower / 10)` | e.g. Willpower 50 gives +5 (arithmetic from the formula) | none | instant | none | FormulaHelper 99, 1530 |
| Save clamp | keeps the save chance between 5% and 95% | clamp(save, 5, 95) | 5..95 | none | instant | 5 and 95 | FormulaHelper 1532 |
| Roll | uniform roll | `Random.Range(1, 101)` | 1..100 | none | instant | none | FormulaHelper 1535; Dice100.cs 12 |
| Kept percent (proration) | share of the effect that survives | roll > S: 100; S-20 <= roll <= S: 100 - 5*(S-roll); else 0 | with S = 50: rolls 1-30 give 0%, 31-50 give 5% to 100% in steps of 5, 51-100 give 100%. Chance of full save 30%, partial 20%, full effect 50% (arithmetic from the formula) | none | instant | proration band is 20 points wide | FormulaHelper 1537-1546 |
| Magnitude scaling | scale rolled magnitude | `trunc(amount * kept / 100)` | 0..amount | none | instant | not applied to caster-only bundles | FormulaHelper 1581-1583; EntityEffect 805-806 |
| Magnitude roll | base plus level-scaled plus | `base + plus * floor(casterLevel / perLevel)`; base and plus each random in their min..max | per spell data (MagnitudeBaseMin/Max, PlusMin/Max, PerLevel) | none | instant | caster level defaults to 1 if no caster | EntityEffect 798-801; FormulaHelper 856 |
| Spell points pool (player) | max spell points | `floor(Intelligence * class multiplier)` | class multiplier from the career data (not read) | none | n/a | none | FormulaHelper 90 |
| Spell points pool (enemy) | max spell points | `10 * level + 100` | level-dependent | none | n/a | none | EnemyEntity 456 |
| Spell point regen (player) | regen on the exhaustion path and in the rest window | `CalculateSpellPointRecoveryRate` (body not read) | not read | none | per rest or exhaustion event | clamped to max (EntityEffectManager 1701) | PlayerEntity 2432-2436; DaggerfallRestWindow 517; FormulaHelper 219 |
| Gold cost of an effect | cost of one effect's components | `offset + CostA * base + CostB * trunc(plus / perLevel)` | per effect: e.g. Charm chance uses CostA 40, CostB 60, offset 0 | gold (converted below) | n/a | none | FormulaHelper 2380; CharmEffect 43 |
| Spell points from gold | conversion by caster skill | `trunc(gold * (110 - skill) / 400)` | skill 10 gives 25% of gold, skill 100 gives 2.5% (arithmetic from the formula) | spell points | n/a | none | FormulaHelper 2339 |
| Target multiplier | scale cost by aim | self 1.0, touch 1.0, single at range 1.5, area around caster 2.0, area at range 2.5 | x1.0 to x2.5 | spell points | n/a | none | FormulaHelper 2345-2366 (multipliers 2358-2365) |
| Cost floor | minimum cost of a spell | `max(5, total)` | 5 | spell points | n/a | 5 minimum (also for absorbed spells, EntityEffectManager 1279) | FormulaHelper 2209, 2239 |
| Ready gate | player cannot ready if short of points; enemies exempt | `IsPlayerEntity && CurrentMagicka < cost` refused | cost computed at ready | spell points checked | cast start | silence blocks (1934) | EntityEffectManager 327-337 |
| Cast commit (player) | cost deducted when the cast starts, before the animation | `DecreaseMagicka(cost)` after silence check (426), then animation and `castInProgress` set (435) | one cast at a time (`castInProgress`) | spell points | the release at 2098-2101 clears `castInProgress` and does not charge | one cast in progress | EntityEffectManager 404, 426, 435, 2098-2101 |
| Cast time | none in data | instant or animation-driven | animation length not read | n/a | not read | n/a | FPSSpellCasting (not read beyond start) |
| Enemy cast | enemies skip the animation | `CastReadySpell()` at once | n/a | enemy cost computed from player skills by default | none | n/a | EntityEffectManager 273 |
| Magic round | effect tick | one per game minute | 1 per minute; catch-up capped 2880 rounds (2 days) | n/a | per minute | `maxCatchupDays = 2` | EntityEffectBroker 36, 202-234 |
| Duration | rounds remaining | ticks while > 0; a duration effect with none left is ended with `End()` | formula not read | n/a | one round per game minute | none | EntityEffectManager 1733-1736; EntityEffect 572-575 |
| Touch range | touch spells only fire at a target in reach | aim ray from the camera checked with `GetEntityTargetInTouchRange` | range value not read | n/a | n/a | none | EntityEffectManager 413 |
| Projectile spells | non-caster spells fly as a missile carrying the bundle | `InstantiateSpellMissile` then `missile.Payload = readySpell` | speed and hit rule not read (DaggerfallMissile not read) | n/a | player: cast animation, then launch at release | one cast in progress for the player | EntityEffectManager 381-382 (no-animation cast), 2079-2080 (release path); 2124 is a second site (not read) |
| Charm | enemy classes turn non-hostile | `IsHostile = false` each magic round | enemy classes only; chance cost 40 and 60 | spell points (chance-based) | n/a | duration support disabled in code (comment) | CharmEffect 43, 65, 78 |

Other numbers: `ready` refuses below cost; a spell cannot be cast while silenced (1934); `Charm` affects only enemy classes, not monstrous humanoids (78). The comment on Charm says the effect holds "permanently until player attacks them" (24), but the reset path was not read.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (per-element pre-check, base 50, tolerance steps, immunity gate, MagicResist, clamp, roll, kept percent). It omits the race and career tables and their flags, the biography modifier source, the element-to-flag mapping, float rounding (the sketch uses integer math where the donor uses `(int)(amount * percent)`), the absorption and reflection checks, the per-spell cost tables and the caster-only exclusion. Two intentional changes against the donor, both listed in section 6: `hardImmune` is a final override that later steps cannot lower, and `perLevel` is floored at 1 so a zero in data cannot divide by zero.

```ts
// Licence: MIT (donor LICENSE: Copyright (c) 2009-2023 Daggerfall Workshop). Shape adapted from the donor SavingThrow chain.
export type Tolerance = "normal" | "resistant" | "lowTolerance" | "criticalWeakness" | "immune";

export interface SaveInput {
  base: number;          // donor: 50
  tolerance: Tolerance;  // donor: race/career tolerance steps
  bioMod: number;        // donor: biography modifier (player only)
  modifier: number;      // donor: per-effect resistance modifier from the caller
  willpower: number;     // donor: MagicResist = floor(willpower / 10)
  hardImmune: boolean;   // FIX: immunity as a final override (donor sets 100, later steps can lower it)
}

const TOLERANCE_STEP: Record<Tolerance, number> = {
  normal: 0,
  resistant: 25,
  lowTolerance: -25,
  criticalWeakness: -50,
  immune: 50,
};

// Returns the save chance clamped to 5..95, or "immune" (full save) before MagicResist is added.
export function saveChance(i: SaveInput): number | "immune" {
  if (i.hardImmune) return "immune";
  let s = i.base + TOLERANCE_STEP[i.tolerance] + i.bioMod + i.modifier;
  if (s >= 100) return "immune";              // donor: returns 0 here, before MagicResist
  s += Math.floor(i.willpower / 10);          // donor: MagicResist
  return Math.min(95, Math.max(5, s));        // donor: clamp 5..95
}

// roll is 1..100. Returns percent of damage or duration kept (0..100).
export function keptPercent(save: number | "immune", roll: number): number {
  if (save === "immune") return 0;
  if (roll > save) return 100;                           // failed save: full effect
  if (save - 20 <= roll) return 100 - 5 * (save - roll); // prorated band: 0% at save-20, 100% at save
  return 0;                                              // deep save: no effect
}

// Per-element pre-roll (donor FormulaHelper: Dice100.SuccessRoll(chance)); roll is 1..100.
export function precheckResists(chance: number, roll: number): boolean {
  return roll <= chance;
}

// One magnitude after the save. amount is the rolled magnitude before the save.
export function scaledMagnitude(amount: number, i: SaveInput, roll: number, precheck: { chance: number; roll: number }): number {
  if (precheck.chance > 0 && precheckResists(precheck.chance, precheck.roll)) return 0;
  return Math.trunc((amount * keptPercent(saveChance(i), roll)) / 100);
}

export interface EffectCostParams {
  offsetGold: number;
  costA: number;
  costB: number;
  base: number;      // donor: DurationBase / ChanceBase / average of magnitude min and max
  plus: number;      // donor: DurationPlus / ChancePlus / average of magnitude plus min and max
  perLevel: number;
}

// Gold cost of one effect component set. FIX: perLevel floored at 1 (donor divides with no guard).
export function effectGold(p: EffectCostParams): number {
  const perLevel = Math.max(1, p.perLevel);
  return Math.trunc(p.offsetGold + p.costA * p.base + p.costB * Math.trunc(p.plus / perLevel));
}

// Spell points from gold and caster skill (donor: gold * (110 - skill) / 400, FormulaHelper 2338-2339).
// The donor applies this once to the SUMMED gold of duration, chance, magnitude and fudge cost of one effect;
// pass the summed gold here, not each component, or the truncation differs.
export function effectSpellPoints(gold: number, skill: number): number {
  return Math.trunc((gold * (110 - skill)) / 400);
}

const TARGET_MULT = { self: 1.0, touch: 1.0, singleAtRange: 1.5, areaAroundCaster: 2.0, areaAtRange: 2.5 } as const;

// Whole-spell cost: sum of effect points, times the target multiplier, floor 5.
export function spellCost(effectPoints: number[], target: keyof typeof TARGET_MULT): number {
  const sum = effectPoints.reduce((a, b) => a + b, 0);
  return Math.max(5, Math.trunc(sum * TARGET_MULT[target]));
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 /tmp/daggerfall-unity-save.ts` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/magic-resist.ts` (new module). One resolve function per resisted hit or spell: returns the kept percent and the scaled amount, called once by the engine's damage and effect step, so the one ledger receives one number. Client code only displays it.
- Parity-checklist row 13 (specials). Spells are the magic branch of specials and share the same engine path.
- Reuse tag: adapt (MIT: code may be adapted; the sketch is written from the formula shape and the defects are fixed)
- Brief rule served: 1 (one engine: one resolve step, not one per effect), row 13; rules 7-9 n/a

## 6. Gaps and risks

- MIT licence: adaptation is allowed. The sketch follows the formula shape and is not a line translation.
- Three donor defects, kept idea and fixed:
  - Immunity order. Race immunity is set to 100 directly (FormulaHelper 1471), then the career and tolerance steps (1512-1519) and the biography and modifier add (1521) run after it. A race-immune player with a critical-weakness step would fall to 50 in principle. Fix: `hardImmune` is a final override in the sketch.
  - Divide by zero. `perLevel` is used as a divisor with no guard (`trunc(increase / perLevel)` at 2380, `casterLevel / MagnitudePerLevel` at 800). Fix: floor `perLevel` at 1 at data load (sketch `effectGold`).
  - Comment and code disagree. The comment says the proration is "within 20 of failed roll" (1539). The code prorates the 20 points below the save value (1540-1541). Fix: state the band as [save-20, save] in the data table and in the tests.
- One engine: the donor applies the save at three places (per-element pre-check on entity state, `AssignBundle` for no-magnitude effects, `GetMagnitude` for magnitude effects). Frankendom must do it in one resolve step, or the Pit and the zones will disagree. Server verifies the kept percent; the client does not roll.
- No-magnitude effects use only the zero result (EntityEffectManager 571). A partial save does nothing for paralysis-type effects in this code. Frankendom must choose binary or prorated for crowd control; this is the Proof 3 CC ladder question.
- Diminishing returns: none found. A grep for "iminish" over `Assets/Scripts` finds only spell names ("Diminish Fire") and no crowd-control diminishing returns ladder. This note does not claim one exists elsewhere in the donor.
- Interrupts: none found. `castInProgress` is written only in EntityEffectManager.cs (59, 315, 397, 408, 435, 1809, 2090, 2100); no damage path touches it in the files grepped. So damage does not cancel a cast in this grep (damage code itself not read).
- Mind control and PvP: the donor has no PvP. Charm is enemy-class only (78), and its "until attacked" reset is only a comment (24). No consent, reflect-PvP or duration cap rules for player-on-player control.
- Numbers for a fast mobile fight: a 1-100 roll with a 20-point band and a 5-95 clamp is cheap to evaluate and easy to show as one number ("resisted 40%"). The spell point costs are slow for a fast fight: the magic round is per game minute, so duration is in minutes, not in the 0.1 s to 2 s range a duel needs. Spell cost tables must be rescaled for fights.
- Zero-component effects (for example Teleport) are not free: `GetEffectComponentCosts(MakeEffectCosts(60,100,160),1,1,1)` adds a fudge gold cost (FormulaHelper 2332-2334). The sketch leaves it out; add it as a data default if such effects exist. The element pre-check runs only when the target has the resistance flag for that element (`HasResistanceFlag`, 1450).
- Donor licence and data: the spell records are read from SPELLS.STD (binary, not in the repo; the reader was not read), so the numbers in section 3 are formula constants, not per-spell values.

Best transferable idea: resolve a resisted hit or spell as one roll that returns a kept percent with a 20-point proration band, a 5-95 clamp, and an immunity gate that is a final override.
Decision (proposed): adapt - take the one-roll kept-percent shape for a single server-side resolve step, drop the race and career tables and the biography modifier, and fix the immunity order and the perLevel divide-by-zero in the sketch.
Acceptance: a server test with save 50 (base 50, Willpower 0 so MagicResist adds 0, no tolerance or modifier, no pre-check chance) and a rolled magnitude of 100 asserts that rolls 1-30 deal 0, rolls 31-50 deal 5% to 100% in steps of 5%, rolls 51-100 deal full damage, and a hardImmune target takes 0 with its HP ledger unchanged.

Reuse tag: adapt (MIT donor; clean sketch; defects fixed)
Brief rule served: 1 (one engine), 13 (specials)


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
Errors: (1) Table row 'Cast commit (player)' says cost is deducted 'at release (2098-2101)'. Real: CastReadySpell deducts DecreaseMagicka at EntityEffectManager.cs 426, BEFORE the cast animation starts (435); release at 2098 does not charge. The Mechanism text says 426 correctly, so the table contradicts it. (2) 'SetReadySpell refuses to ready the spell when spell points are below cost (337)': the refusal applies only when IsPlayerEntity (337); enemies are exempt (comment 334-335). Note omits the player-only condition. (3) Dice100 cited as 'Utility/Dice100.cs 10-13'; real path is Assets/Scripts/Game/Utility/Dice100.cs (lines 10-18 correct). (4) Sketch effectGold truncates but donor spell points = goldCost*(110-skill)/400 uses integer division on the SUMMED gold of duration+chance+magnitude+fudge (FormulaHelper 2338-2339), whereas sketch computes per effect then sums; small rounding difference. Verified correct: SavingThrow 1443-1547 incl. base 50 (1458), race +30/100/-25/-50 (1469-1475), career +50/-50/-25/+25 (1512-1519), >=100 returns 0 (1526), MagicResist floor(wp/10) (93-99, 1530), clamp 5..95 (1532), roll 1..100 (1535), proration 100-5*(S-roll) for S-20<=roll<=S else 0 (1537-1544), ModifyEffectAmount 1575-1583, target multipliers 1.5/2/2.5 (2358-2365), cost floor 5 (2209, 2239-2240), gold formula 2380, EntityEffect.GetMagnitude 786-808 and CasterOnly exclusion 805, magic round cap 2880 (Broker 36, 223), TryResistance 1247-1262, MIT licence. Acceptance arithmetic (save 50: rolls 1-30 -> 0, 31-50 -> 5..100 in steps of 5, 51-100 -> 100) is correct provided willpower 0 / no MagicResist and amount is large (e.g. 100) so truncation does not zero the 5% step.
Missed: Zero-component effects (e.g. Teleport) get a fudge gold cost GetEffectComponentCosts(MakeEffectCosts(60,100,160),1,1,1) at FormulaHelper 2332-2334, so they are not free; note and sketch omit it. Also the precheck is gated by HasResistanceFlag (1450) before the chance roll.

Fixed 2026-10-12 (Sonnet fixer): verified and corrected the cast-commit table row (cost is charged at 426 before the animation, release does not charge), the player-only ready gate (337), the Dice100 path, the per-effect versus summed-gold rounding comment in the sketch, and the acceptance preconditions (Willpower 0, magnitude 100 so the 5 percent step does not truncate to 0). Added the missed zero-component fudge cost and the HasResistanceFlag gate. Sketch code unchanged (comment only), no retypecheck needed beyond comment edit.
