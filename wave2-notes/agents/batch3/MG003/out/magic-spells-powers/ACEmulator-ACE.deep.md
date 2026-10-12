# ACEmulator-ACE (magic-spells-powers, cell 22)

Donor: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Player_Magic.cs` (plus Creature_Magic.cs, SkillCheck.cs, WorldObject_Magic.cs, Player.cs, Monster_Magic.cs, ACE.DatLoader/Entity/SpellBase.cs) | Licence: GNU AGPL-3.0, read from the LICENSE file ("GNU AFFERO GENERAL PUBLIC LICENSE, Version 3, 19 November 2007"); clean-room, shape only | C# | symbol `DoCastSpell_Inner`

Checked: Read in order: `CreatePlayerSpell` (Player_Magic.cs 1000-1040), `GetCastingPreCheckStatus` (528-564), `CalculateManaUsage` (566-590), `DoCastSpell` (746-799), `DoCastSpell_Inner` (835-933), private `CreatePlayerSpell` (1062-1140), `VerifyCastRadius` (1336-1348), Creature `CalculateManaUsage` and `GetManaCost` (Creature_Magic.cs 14-93), `GetEffectiveMagicDefense` (172-183), `SkillCheck.cs` (whole file), `MagicDefenseCheck` and `TryResistSpell` (WorldObject_Magic.cs 104-186, rest of TryResistSpell not read). Confidence: high on the order of operations and on every number listed. Not read: `FailCast` (Player_Magic.cs 1309), the caller of `VerifyCastRadius`, `HandleCastSpell`, `GetWeaponManaConversionModifier`, `DoWindupGestures` and `DoCastGesture` bodies, `SpellFormula.GetCastTime` (SpellFormula.cs 319), the spell-data fields `Power`, `PowerMod`, `BaseRangeMod` (DAT), spell damage and projectile code. camera_scope: not a camera cell.

Best transferable idea: Resolve a cast in a fixed order (roll the fizzle and price at cast start, charge at resolution, re-check movement before charging, then roll one resist per target) so that a broken cast never costs the caster anything they should not pay.
Decision (proposed): adapt - the order and the one-roll-per-decision shape fit a server-side fight step; the double mana roll with a luck term is too noisy for a fast duel and we keep one roll.
Acceptance: A server test casts a spell, moves the caster 6.5 units after the windup starts, and asserts the outcome is "disrupted" with mana unchanged; a fizzle deducts exactly the fizzle fee; and a 30-point skill lead gives the target a resist chance of about 29 percent over 10,000 seeded rolls.

## 1. Mechanism

A cast is one server-side pipeline with a price check at start and a single charge at resolution.

- Cast start (`CreatePlayerSpell`, Player_Magic.cs 1000-1040). The magic skill is the caster's current skill in the spell's school (or the item's spellcraft for item-built spells). `VerifySpellRange` runs (range rule below). `GetCastingPreCheckStatus` (528) rolls the fizzle and applies the war/void lockout. `CalculateManaUsage` (566) prices the cast: a fixed 5 on a fizzle, the discounted cost on success. If that price is above current mana the cast is refused at 1029-1030, before any windup. Nothing is charged at this point.
- Windup and gesture. Cast animation runs at `CastSpeed` 2.0 (Player_Magic.cs 603). The donor does not describe a numeric cast time here; the cast time comes from the animation length (not read).
- Resolution (`DoCastSpell` 746 then `DoCastSpell_Inner` 835). `DoCastSpell` re-checks the target and the range. `DoCastSpell_Inner` then (1) charges the mana (857), (2) measures the distance from the windup start (871). If the distance is over 6.0 and the caster is not NPK, it sends "Your movement disrupted spell casting!" and ends the cast (874-880). It also checks player-killer status (`CheckPKStatusVsTarget`). On success it calls the private `CreatePlayerSpell` (1062). A fizzle takes the default branch: fizzle effect and "YourSpellFizzled".
- Resist (private `CreatePlayerSpell` 1105, then `TryResistSpell` WorldObject_Magic.cs 119). For a non-projectile spell, `TryResistSpell` runs before `HandleCastSpell`. Exemptions come first: non-resistable spells, self-targeted spells, and casts from a cloak return "not resisted". The roll is `MagicDefenseCheck` (104-113): success chance = logistic(caster magic skill vs target effective magic defense, factor 0.03); resisted when that chance is at or below a uniform roll, so resist probability = 1 - chance. Self-targets are never resisted (185-186). Invincible targets are always resisted (173-174). Lifestone-protected players are always resisted.
- Fizzle (Player_Magic.cs 534-545). If magic skill is 0, or below power minus 50, the cast fails. Otherwise it succeeds when logistic(skill vs power, factor 0.07) is above a uniform roll. Built-in item spells never fizzle (543-544).
- Lockout (546-557). A war cast right after a successful void cast, or the reverse, fails if less than a random 3.0-5.0 s has passed since the last successful cast. The failed cast is priced at the fizzle fee.
- Mana discount (`GetManaCost`, Creature_Magic.cs 55-93). If the mana-conversion skill is 0, cost is the base. Otherwise: roll one check at half difficulty (63); on success cost becomes round(base x (1 - (p - roll x luck))) (75). If cost is still above 1, roll a second check at full difficulty (83-85) with the same discount. Minimum cost 1 (92). Monsters use the same function (Monster_Magic.cs 194).
- Movement during gesture. `VerifyCastRadius` (1336-1348) cancels the cast with `FailCast` if the caster has moved more than 6.0 from the start, with the same not-NPK test (1340-1342). Its caller was not read.

## 2. Key functions

- `CreatePlayerSpell` (public, Player_Magic.cs 1000-1040): `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Player_Magic.cs` 1000-1040. Precheck, price, affordability, then windup.
- `GetCastingPreCheckStatus`: Player_Magic.cs 528-564. Fizzle roll and lockout.
- `CalculateManaUsage` (Player): Player_Magic.cs 566-590. Fizzle fee 5 (571-572), success price from `GetManaCost`.
- `DoCastSpell_Inner`: Player_Magic.cs 835-933. Charge (857), movement cap (871-880), resolution switch.
- `TryResistSpell` and `MagicDefenseCheck`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/WorldObject_Magic.cs` 104-113 and 119-186.
- `GetManaCost`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Creature_Magic.cs` 55-93.
- `SkillCheck`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/SkillCheck.cs` 7-21.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Logistic skill check: chance = 1 - 1/(1+exp(f x (skill - diff))), clamped 0..1 | Factor f = 0.03 for ordinary and resist rolls (SkillCheck.cs 7; resist comment WorldObject_Magic.cs 106); factor f = 0.07 for the cast fizzle roll (SkillCheck.cs 21; Player_Magic.cs 536) |
| Fizzle gate: below a skill floor, always fail; else roll once | Floor = power - 50 (Player_Magic.cs 534) |
| Cost discount by skill roll with a minimum | Minimum cost 1 (Creature_Magic.cs 92); discount roll at difficulty / 2 (63), then full difficulty (85) |
| Movement cancel of a windup | Cap 6.0 (Player_Magic.cs 373) |
| Range = constant + skill x mod, capped | Cap 75 (Player.cs 74; `MaxRadarRange_Outdoors`); constant from spell data (SpellBase.cs 69) |
| Resist: caster skill vs target defense, then at or above a roll | Target defense = skill x weapon modifier + imbue (WorldObject_Magic.cs 165; Creature_Magic.cs 172-183) |
| Lockout window random between two values | 3.0-5.0 s (Player_Magic.cs 551) |
| Fixed fee on failure | 5 mana, marked todo in donor (Player_Magic.cs 572) |

Mechanism table (MG focus). Units are donor world units; the scale of skill ranks is not read, so the fizzle window and the factors have no known unit.

| name | effect | formula | number ranges | cost | cooldown / cast time | caps | file:line |
|---|---|---|---|---|---|---|---|
| Fizzle roll | cast fails, fizzle fee charged | skill below power-50: fail; else logistic(skill, power, 0.07) > roll | window 50; factor 0.07 | 5 mana (fee) | none stated (gesture animation, not read) | built-in item spells never fizzle | Player_Magic.cs 534-544, 571-572 |
| War/void lockout | cast fails, fee charged | opposite school succeeded < random(3.0, 5.0) s ago | 3.0-5.0 s | 5 mana (fee) | window itself | applies to war/void pairs only | Player_Magic.cs 546-557 |
| Base cost | mana cost before discount | BaseMana from spell data | per spell (DAT, not read) | base mana | none | none | SpellBase.cs 68 |
| Mana discount | cheaper cast | p = logistic(conv skill, power/2, 0.03); if roll < p, cost = round(base x (1 - (p - roll x luck))); second roll at full power if cost > 1 | p in 0..1 | reduced mana | none | min 1 | Creature_Magic.cs 55-93 |
| Windup/gesture speed | animation speed | CastSpeed 2.0 | 2.0 | none | cast time from animation length (not read) | none | Player_Magic.cs 603 |
| Movement cancel | cast disrupted, ends | distance from windup start > 6.0, caster not NPK | 6.0 units | mana already charged (857) | at resolution and during gesture | applies to any non-NPK caster | Player_Magic.cs 373, 857, 871-880, 1340-1342 |
| Range | cast refused if too far | min(BaseRangeConstant + skill x BaseRangeMod, 75) | constant per spell; cap 75 | none | none | outdoor cap 75 | Player_Magic.cs 500; Player.cs 74; SpellBase.cs 69 |
| Magic resist | target resists | resist = 1 - logistic(caster skill, target defense, 0.03) | 0..1 | none | none | self never; invincible always; lifestone always | WorldObject_Magic.cs 104-113, 119-186 |
| Fizzle/failure fee | flat mana for a failed cast | fixed 5 | 5 | 5 mana | none | none | Player_Magic.cs 571-572 |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (fizzle roll and price at start; range; movement cap; charge; resist) but (1) checks movement BEFORE charging mana, where the donor charges first (857 then 874); (2) keeps one mana discount roll and drops the second full-difficulty roll and the luck term; (3) uses real division for the half difficulty, where the donor's uint divide truncates; (4) adds an affordability re-check at resolution, where the donor checks only at start. It omits windup timing, the war/void lockout, PK status, lifestone protection, dispel rules, fellowship targets, item-built spells, proficiency XP and projectile spells.

```ts
// Donor licence: AGPL-3.0 (ACEmulator-ACE). Clean-room sketch from the described mechanism, not a translation of the donor lines.
type Pos = { x: number; y: number };

interface Caster { magicSkill: number; manaConv: number; mana: number; pos: Pos; }
interface SpellDef { power: number; baseMana: number; rangeConst: number; rangeMod: number; }
interface Target { magicDefense: number; pos: Pos; invincible: boolean; }
type Outcome = 'hit' | 'resisted' | 'fizzle' | 'disrupted' | 'out-of-range' | 'no-mana';
interface Pending { ok: boolean; cost: number; startPos: Pos; spell: SpellDef; }

const FIZZLE_WINDOW = 50;   // a caster this far below the spell power cannot roll at all
const CAST_FACTOR = 0.07;   // steeper curve for the cast roll
const SKILL_FACTOR = 0.03;  // gentler curve for the resist roll and the mana roll
const FAIL_MANA = 5;        // flat cost of a fizzle (the donor marks this value as todo)
const MOVE_CAP = 6.0;       // units moved since cast start that disrupt the cast
const RANGE_CAP = 75;       // outdoor cap on spell range

function chance(skill: number, diff: number, factor: number): number {
  const c = 1 - 1 / (1 + Math.exp(factor * (skill - diff)));
  return Math.min(1, Math.max(0, c));
}

function dist(a: Pos, b: Pos): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Fizzle roll, once, at cast start.
function precheck(c: Caster, spell: SpellDef, rng: () => number): boolean {
  if (c.magicSkill <= 0 || c.magicSkill < spell.power - FIZZLE_WINDOW) return false;
  return chance(c.magicSkill, spell.power, CAST_FACTOR) > rng();
}

// Mana cost: a fizzle pays the flat fee; a success gets one discount roll at half difficulty.
function castCost(c: Caster, spell: SpellDef, ok: boolean, rng: () => number): number {
  if (!ok) return FAIL_MANA;
  const p = chance(c.manaConv, spell.power / 2, SKILL_FACTOR);
  if (rng() < p) return Math.max(1, Math.round(spell.baseMana * (1 - p)));
  return spell.baseMana;
}

// Step 1, at cast start: roll the fizzle, price the cast, refuse if the caster cannot pay. Nothing is charged here.
function startCast(c: Caster, spell: SpellDef, rng: () => number): Pending | 'no-mana' {
  const ok = precheck(c, spell, rng);
  const cost = castCost(c, spell, ok, rng);
  if (c.mana < cost) return 'no-mana';
  return { ok, cost, startPos: { ...c.pos }, spell };
}

// Step 2, after the windup: range, then movement (fixed: checked before any charge), then charge, then resist.
function finishCast(c: Caster, p: Pending, target: Target, self: boolean, rng: () => number): Outcome {
  const maxRange = Math.min(p.spell.rangeConst + c.magicSkill * p.spell.rangeMod, RANGE_CAP);
  if (dist(c.pos, target.pos) > maxRange) return 'out-of-range';
  if (dist(p.startPos, c.pos) > MOVE_CAP) return 'disrupted';
  if (c.mana < p.cost) return 'no-mana';
  c.mana -= p.cost;
  if (!p.ok) return 'fizzle';
  if (self) return 'hit';
  if (target.invincible) return 'resisted';
  const resistChance = 1 - chance(c.magicSkill, target.magicDefense, SKILL_FACTOR);
  return rng() < resistChance ? 'resisted' : 'hit';
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/mg003-ace-spell-cast.ts), exit 0.

## 5. Lands in

- TARGET `src/fight/spells.ts` (new engine step: cast start, resolution, resist per target). Parity-checklist row 13 (specials).
- Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only, no line-by-line translation)
- Brief rule served: 1 (one engine: cast resolution lives in src/fight, not in the client); the server does the charge and the movement check.

## 6. Gaps and risks

- AGPL-3.0: clean-room only. The sketch is written from the mechanism.
- Donor defects, each kept as an idea and fixed in the sketch:
  - Mana is charged (Player_Magic.cs 857), and spell components are burned (`TryBurnComponents`, 868, for non-weapon casts), before the movement cancel (874). A moved caster loses mana, components and the spell. Fix: check movement first, charge after (sketch step 2).
  - Affordability is checked once at start (1029) and not at resolution. Fix: re-check at charge (sketch step 2).
  - `difficulty / 2` on a uint truncates. Fix: real division in the sketch.
  - The mana discount uses a luck roll and two rolls. Fix: one roll, which is easier to replay in the fight record (checklist row 19).
  - The fizzle fee of 5 is marked "todo: verify with retail" (572). Fix: make it a data field with a default, not a constant.
- The movement cap applies only to non-NPK players, and the code carries a question about it ("only PKs affected by these caps?", 873). Frankendom must decide the rule explicitly before it ships.
- Frankendom rulings: the server must take the windup start position from its own tick, never from the client. The donor does this on the server, but the Pit client must not show a "disrupted" result the server did not send.
- Spell numbers come from a binary client table (DAT). Frankendom must author them in the catalogue (checklist row 21), not read a client file.
- Fast-fight numbers: 6.0 units is a very short cancel distance in donor units (the donor's unit scale is not verified as metres). For a fast duel it may be too small, and the 75 range cap may be too large for the Pit. Both are engine constants until a playtest sets them. The fizzle window of 50 and the factors depend on the skill scale, which is not read.
- Not covered: spell damage, projectiles, dispel rules, summons, mind effects. Those need a separate cell.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
- All cited lines, numbers and the 28.9 percent resist figure verified.
- Missed (minor): TryBurnComponents (Player_Magic.cs 868) consumes spell components at the same charge point, before the movement check, for non-weapon casts; the note and sketch mention only mana. Confirmed; added to the charge-before-move defect line. The sketch models mana only (components omitted on purpose).
- Missed (minor): TryResistSpell exempts cloak casts (WorldObject_Magic.cs 132, `Cloak.IsCloak(itemCaster)`). Confirmed in code; not modelled.
Fixed 2026-10-12: charge-before-move defect line now names components. Sketch unchanged.
