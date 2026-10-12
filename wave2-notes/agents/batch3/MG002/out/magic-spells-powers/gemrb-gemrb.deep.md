# gemrb-gemrb (magic-spells-powers, cell 1)

Donor: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/Scriptable/Scriptable.cpp` | Licence: GPL-2.0-or-later (COPYING is the GPL v2 text; REUSE.toml sets SPDX GPL-2.0-or-later; clean-room, shape only) | C++ | symbol `Scriptable::SpellCast`, `Actor::CheckSpellDisruption`, `Actor::GetSavingThrow`, `EffectQueue::RollDispelChance`

Checked: Read end to end: `Scriptable::Update` tick (Scriptable.cpp 161-185), `CastSpell`/`CastSpellPoint` entry (1264-1340), `SpellCast` (1346-1400; timing read at 1353-1379, effect queueing at 1395-1398), `Actor::GetHit` disruption call (Actor.cpp 4110-4131), `Actor::CheckSpellDisruption` (4138-4193), `Spell::GetHeaderIndexFromLevel` (Spell.cpp 62-75), the memorised-spell header copy (Spellbook.cpp 1060-1078), and the interrupt consumer `InterruptSpellcasting` (GameScript/GSUtils.cpp 2187-2200, only its head). Partly read: `Actor::GetSavingThrow` (3273-3390, first-edition and third-edition branches; iwd2 tweaks skimmed), `EffectQueue::CheckSaves` (EffectQueue.cpp 994-1040), `EffectQueue::DispelEffects` and `RollDispelChance` (1697-1729), `fx_dispel_effects` (FXOpcodes.cpp 2645-2683). Candidate files opened: 8. Confidence: high on the casting and disruption order and the numbers; medium on the save path (only the two main branches). Not read: the `.spl` binary parse, the body of `HandleCastingStance` beyond its signature (resource depletion), `CastSpellPoint` target handling beyond the entry, charm, fear, sleep, summon and polymorph bodies, the `LuckyRoll` and `core->Roll` sources, the `ROUND_SECONDS` table value, and any purchase or spell-making path. camera_scope: n/a (magic cell).

Best transferable idea: a spell's cast time is data in tenths of a round, and a hit taken mid-cast breaks it on a roll that rises with the hit's damage and the spell's level, so casting is always a gamble under pressure.

Decision (proposed): adapt - keep the cast-time-as-data and the hit-breaks-cast roll, but make the roll one step of the engine's hit resolution in `src/fight` (one ledger) with the threshold as data, and drop the first-edition "any damage breaks, no roll" rule and the level-0 sentinel.
Acceptance: In a zone or Pit fight a caster hit mid-cast sees a "Disrupted" cue and the cooldown is spent; a server test asserts a cast with 0 cast time never opens an interrupt window, and that with simple mode a hit of damage 10 at spell level 3 breaks the cast on d20 < 13 (12 of 20 rolls).

## 1. Mechanism

- Two entry points start a cast: `CastSpell` (a target) and `CastSpellPoint` (a point). Both clear the last-target fields, set the aura cooldown when the cast is not instant and not `noInterrupt` (Scriptable.cpp 1264-1340), refuse the cast if `CanCast` fails, then run the wild-surge check and call `SpellCast`.
- Order inside `SpellCast` (Scriptable.cpp 1353-1379, as read):
  (a) Tier pick. If `level` is 0 it becomes the caster's level (1353); `SpellHeader = GetHeaderIndexFromLevel(level)` (1354). The tier is the extended header whose next tier needs more level than the caster has (Spell.cpp 70).
  (b) Cast time. `casting_time` = the tier's `CastingTime` (1360). If a casting-speed cap (`CastingSpeedModifier`, parameter 2) is set below 10 and the value is above it, the value is replaced by the cap (1370-1371). Otherwise the caster's mental-speed stat is subtracted (1373). The result is clamped to 0..10 (1375). Ten units is one full round.
  (c) Duration. `duration = (casting_time * round_size) / 10` (1379); instant casts get 0. The donor calls this conversion "a guess which seems approximately right" (1378).
  (d) After the duration, the casting glow is queued earlier in the function and the spell's effect block is built and queued at 1395-1398. If the target is an actor the effects go to it, otherwise to the caster. The rest of `SpellCast` was not read.
- Interruption. Every time an actor takes damage, `GetHit` calls `CheckSpellDisruption(damage)` (Actor.cpp 4129). If that returns true, `InterruptCasting` is set (4130). The check returns false at once when no cast is in progress (4140). The flag is read by `InterruptSpellcasting` (GSUtils.cpp 2187-2200), which prints a "disrupted" or "failed" line and returns true. Its four call sites (GSUtils.cpp 2376, 2382, 2496, 2501) were not read, so the actual stop of the cast is not verified. The flag is cleared at the end of `Scriptable::Update` (Scriptable.cpp 184), so it lasts one tick.
- The disruption rule depends on the rule set:
  - First-edition path (`!third`, Actor.cpp 4174-4176): any damage returns true with no roll.
  - Simplified path (feature `SIMPLE_DISRUPTION`, 4151-4152): a d20 roll; disrupt when `roll < damage + spellLevel`.
  - EE path with the `concentr` table (from 4153, read but not receipted): check mode 0 to 4 picks one of five formulas, each with a damage or spell-level term.
  - Third-edition path (4178-4191): `roll + concentration + bonus` fails when it is at most `10 + damage + spellLevel`. Concentration is the skill (4178), +4 for the Combat Casting feat (4180-4181), +10 when the actor has the driven flag (4183-4184).
- Saves (Actor.cpp 3273): first-edition path, `ret = stored d20 + modifier + luck` (3282), success when `ret >= stat` (3295). Third-edition path, `ret = roll + save + modifier` (3313), DC = `10 + spellLevel + saveBonus` (3317), success when `ret >= saveDC` (3384). The caller `CheckSaves` (EffectQueue.cpp 994-1040) adds the effect's save bonus and any school bonuses from the target and subtracts the caster's school focus. It tries each save type in the effect's mask and stops at the first success (1031-1040).
- Dispel (EffectQueue.cpp 1697-1711): skips the dispeller itself (1700) and any effect without `FX_CAN_DISPEL` (1703), and rolls once per remaining effect (1707). `RollDispelChance` (1713-1729): diff = dispeller level minus the effect's caster level (1717); +5 per level above, -10 per level below (1718-1721); base 50 (1723); a d100 of 1 always fails, 100 always succeeds, else the roll must be under the chance (1725-1727). A success sets `TimingMode = FX_DURATION_JUST_EXPIRED` (1709).
- Stacking limit (EffectQueue.cpp 1248): when the effect carries `SF_LIMIT_EFFECT_STACKING` and the target already has the same opcode from the same source, the apply body is skipped and the effect is kept with `FX_APPLIED` (1248-1251). A second copy does not stack.

## 2. Key functions

- `Scriptable::SpellCast`: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/Scriptable/Scriptable.cpp` 1346-1400 (tier, cast time, cap, haste, clamp, duration; effect queue at 1395-1398).
- `Scriptable::Update`: same file, 161-185 (tick; clears `InterruptCasting` at 184).
- `Actor::GetHit` and `Actor::CheckSpellDisruption`: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/Scriptable/Actor.cpp` 4110-4131 and 4138-4193.
- `Spell::GetHeaderIndexFromLevel`: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/Spell.cpp` 62-75.
- `Actor::GetSavingThrow`: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/Scriptable/Actor.cpp` 3273-3390.
- `EffectQueue::RollDispelChance` and `DispelEffects`: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/EffectQueue.cpp` 1697-1729.

## 3. Numbers vs mechanism

Reusable algorithm: cast time is a clamped small integer scaled to the round; the hit-disruption roll depends on damage plus spell level; saves are a roll against a DC of 10 plus level; dispel is a percent chance from a level difference.

Game-specific constants: the 10-unit cast-time scale, the round length (data table `ROUND_SECONDS`, value not read), the +4 Combat Casting, the +10 driven, the dispel base 50 and the +5 / -10 per level steps, the first-edition "any hit" rule.

TABLE (name | effect | formula | number ranges | cost | cooldown or cast time | caps | file:line):

| name | effect | formula | number ranges | cost | cooldown / cast time | caps | file:line |
|---|---|---|---|---|---|---|---|
| Tier pick | chooses the extended header for the caster's level | highest tier whose next tier needs more level than the caster has | tiers in the `.spl` file (count not read) | none | none | last tier when all are met | Spell.cpp:70 |
| Cast time | turns the tier value into a delay | `units = clamp(tier - MentalSpeed, 0, 10)`; `ms = units * round_size / 10` | units 0-10; `round_size = round_sec * ticks` (data) | none in this step (memorisation is separate, not read) | 0 to 1 round | 10 units max; a cap below 10 replaces the value and skips haste | Scriptable.cpp:1360, 1370-1379 |
| Cast-time cap | caps the cast time when a casting-speed effect sets a maximum | if cap < 10 and tier > cap, units = cap | cap 0-9 | none | none | only when set | Scriptable.cpp:1370-1371 |
| Disrupt, simple (feature flag) | a hit breaks a cast | disrupt when d20 < damage + spellLevel | d20 1-20 (assumes LuckyRoll returns 1-20; not read); chance = (damage + spellLevel - 1) / 20, max 1 | none | per hit, one tick | none | Actor.cpp:4150-4152 |
| Disrupt, third-edition | a hit breaks a cast unless the caster holds it | fail when d20 + skill + bonus <= 10 + damage + spellLevel | skill 0+; bonus +4 Combat Casting; +10 driven | none | per hit | none | Actor.cpp:4178-4191 |
| Disrupt, first-edition | any damage breaks a cast | return true, no roll | none | none | per hit | none | Actor.cpp:4174-4176 (not receipted) |
| Interrupt flag | carries the disruption to the action code | set in GetHit; read in GSUtils; cleared at end of Update | boolean | none | one tick | none | Actor.cpp:4129-4130; Scriptable.cpp:184 |
| Save DC, third-edition | the bar for a save | DC = 10 + spellLevel + saveBonus; success when d20 + save + mod >= DC | DC 10 + level | none | per effect | none | Actor.cpp:3313, 3317, 3384 |
| Save, first-edition | roll against the stat | roll + modifier + luck >= stat | stat is the target | none | per effect | none | Actor.cpp:3282, 3295 |
| Dispel chance | removes a dispellable effect | chance = 50 + 5 x (dispel level - caster level) if positive; 50 + 10 x (diff) if negative | percent 1-100; roll 1 fails, 100 succeeds | none | once per effect | only FX_CAN_DISPEL; dispeller skipped | EffectQueue.cpp:1700, 1703, 1707, 1715-1727 |
| Stack limit | a repeat from the same source does not stack | if opcode and source already present, skip apply, return FX_APPLIED | count 1 | none | effect duration | one per opcode-source pair | EffectQueue.cpp:1248-1251 |
| Resource pool | spell use | memorised slot with a deplete flag (only the deplete check read) | not read | memorised spell, not mana | none | none | Actor.cpp:4195, 4199 (not receipted) |

Which numbers suit a fast mobile fight: a cast time of 1 to 3 units (roughly 0.1 to 0.3 of a round) is quick enough for a melee pace; the disrupt roll with a damage term makes a hit of 10 at spell level 3 break 12 in 20 casts, which is harsh for a mobile game, so the threshold should be a data field with a lower default. The dispel base of 50 with the 5 / 10 per-level steps is a good shape for a duel effect cleanup (a level-5 dispeller on a level-3 caster succeeds 60 in 100).

Derived by hand (not run): the simple-mode chance at damage 10, spell level 3 is 12/20 = 60%; the dispel at dispeller 5 vs caster 3 is 60%, and at 1 vs 5 is 10%.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (tier pick, cap test first, otherwise haste, then the clamp, then scale to ms), but uses floating milliseconds where the donor uses integer division, and omits the casting glow, the wild-surge check, the memorisation and stance checks, the effect queue, the first-edition race and class save bonuses, the EE concentration table modes, and the Combat Casting and driven bonuses inside the concentration case. The disruption and dispel rules are kept as pure functions that take the roll as an input (the donor rolls inside the function).
```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

// One extended header per caster-level tier. castingTimeUnits is 0..10 (10 = one full round).
export interface CastTier { requiredLevel: number; castingTimeUnits: number; }

// Donor order: walk the tiers and stop at the first one whose next tier needs more level than the caster has.
export function pickTier(tiers: CastTier[], casterLevel: number): CastTier {
  for (let i = 0; i < tiers.length - 1; i++) {
    if (tiers[i + 1].requiredLevel > casterLevel) return tiers[i];
  }
  return tiers[tiers.length - 1];
}

export interface CastInput { tier: CastTier; mentalSpeed: number; capUnits?: number; roundMs: number; }

// Cast time in ms. A cap (if set below 10) replaces the tier value and skips haste; otherwise haste is subtracted.
// The result is clamped to 0..10 units before it is scaled to milliseconds.
export function castTimeMs(i: CastInput): number {
  let units = i.tier.castingTimeUnits;
  if (i.capUnits !== undefined && i.capUnits < 10 && units > i.capUnits) units = i.capUnits;
  else units -= i.mentalSpeed;
  units = Math.min(10, Math.max(0, units));
  return (units * i.roundMs) / 10;
}

// Which rule a hit uses to break a cast in progress.
export type DisruptRule =
  | { kind: "simple" }                                                // break when d20 < damage + spellLevel
  | { kind: "concentration"; skill: number; bonus: number }           // break when d20 + skill + bonus <= 10 + damage + spellLevel
  | { kind: "any-hit" };                                              // first-edition style: any damage breaks, no roll

export function castBroken(rule: DisruptRule, d20: number, damage: number, spellLevel: number): boolean {
  switch (rule.kind) {
    case "simple":
      return d20 < damage + spellLevel;
    case "concentration":
      return d20 + rule.skill + rule.bonus <= 10 + damage + spellLevel;
    case "any-hit":
      return true;
  }
}

// Dispel chance in percent. Base 50; +5 per level the dispeller is above the effect's caster, -10 per level below.
// A d100 roll of 1 always fails and 100 always succeeds.
export function dispelSucceeds(dispelLevel: number, casterLevel: number, d100: number): boolean {
  let diff = dispelLevel - casterLevel;
  if (diff > 0) diff *= 5;
  else if (diff < 0) diff *= 10;
  diff += 50;
  if (d100 === 1) return false;
  return d100 === 100 || d100 < diff;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/MG002-gemrb-casting.ts) exits 0.

## 5. Lands in

- TARGET `src/fight/casting.ts` (new module): cast-time tiers, the one disruption step inside the engine's hit resolution, and the one dispel roll. Parity-checklist row 13 (specials).
- The disruption step must run inside the engine's damage step, not as a flag set by whoever hit the caster (the donor's pattern). Server-side: the server applies the roll and the caster's client only shows the cue.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one combat core, two clients; cast and interrupt in the engine); spell cast times and chances as data (MG-FOCUS a, g).

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism.
- Defects (keep the idea, fix the defect):
  - The duration conversion is labelled a guess (Scriptable.cpp 1378). Fix: store cast time in explicit milliseconds per tier in the spell data; no unit conversion.
  - `if (!level)` (1353) treats 0 as "use caster level", so tier 0 cannot be requested. Fix: use an undefined or null sentinel.
  - A capped cast skips haste entirely (1370-1373). Fix: apply haste first, then the cap, as one documented ordered step.
  - The first-edition disruption rule breaks on any damage with no roll (4174-4176). Fix: use the simple roll (4152) as the default and make the "any hit" rule a data value (chance 1.0), off for mobile.
  - The interrupt is a flag set in `GetHit` and read later by action code, one tick long (4130, 184). Fix: resolve the roll inside the engine's hit step, with the cast state on the same ledger; no flag between systems.
- Frankendom rulings: nothing in the code read here models PvP consent or teams, so mind-control and friendly-fire gates do not transfer from this file. Caster-vs-target order (cast, then hit) must be tested on the server.
- Not covered (not read): summons and upkeep (`SummonCreature` bodies), charm, fear and sleep bodies, polymorph, resource depletion (`HandleCastingStance`), spell purchase and spell-making, the `.spl` file format, and the reagent economy. Those are MG-FOCUS items (c), (d), (e), (h), (i) and are not claimed here.
- Resource pools: GemRB uses memorised slots, not mana or focus. Not a data row for Frankendom's health, stamina, mana and focus table.
- The first-edition save path (3282, 3295) and the third-edition path (3313, 3317, 3384) are different games; only the third-edition DC shape (10 + level + bonus) is a candidate for us.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: 1 (one combat core, two clients); MG-FOCUS (a) casting model, (g) resistances and interrupt, data for cast time and chances.
