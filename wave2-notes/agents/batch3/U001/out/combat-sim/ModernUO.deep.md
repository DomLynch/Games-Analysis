# ModernUO (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Items/Weapons/BaseWeapon.cs` | Licence: GPL-3.0 (repo `LICENSE`, GNU GPL version 3; BaseWeapon.cs and AOS.cs carry no per-file licence header in the lines read) | C# | symbols `BaseWeapon.CheckHit`, `BaseWeapon.OnHit`, `BaseWeapon.ScaleDamageAOS`, `AbsorbDamageAOS`, `AOS.Damage` (in `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Misc/AOS.cs`)

Checked: Read in full: `CheckHit` (BaseWeapon.cs 1208-1337), `OnSwing` hit/miss branch (834-900), `OnHit` damage pipeline (1732-2060, through the `AOS.Damage` call at 1993 and the start of the leech block), `AbsorbDamageAOS` (1576-1640), `CheckParry` (1491-1573), `GetBaseDamage`/`ScaleDamageAOS` (2451-2590), `GetDamageTypes` element split (2340-2371), `AOS.Damage` (AOS.cs 37-241), `AOS.Scale` (251), `SkillCheck` direct roll (SkillCheck.cs 77-150), `Mobile.Damage` head (Mobile.cs 5956-5975), `Mobile.CheckSkill` chance overload (8094). Not read: the leech and `SpellHelper.DoLeech` body, the rest of `Mobile.Damage` after 5975, `AllowGain`/`Gain` skill-gain internals, the Consecrated branch in detail. Confidence: high on the hit-chance ratio and the damage order; medium on the exact parry branch for non-shield weapons (read, but not traced to every caller). Camera scope: not applicable.

## 1. Mechanism

- Entry: a swing calls `CheckHit` once (BaseWeapon.cs 888). A true result calls `OnHit`; a false result calls `OnMiss` (894). Callers checked: the weapon swing path (888) and the ranged path (BaseRanged.cs 78) and a spell (MysticArc.cs 81). Only the swing path was read end to end.
- Hit roll (`CheckHit`, 1208): under AOS the attacker side is `(attackSkill + 20) x (100 + accuracy bonus)` (1272) and the defender side is `(defendSkill + 20) x (100 + defence bonus)` (1321). Both bonuses are capped at 45 percentage points (1267, 1316). The chance is `ourValue / (theirValue x 2)` (1331). Equal skills and no bonuses give 0.5. The chance is floored at 0.02 under AOS (1335-1337). The final roll is `CheckSkill`, which in `SkillCheck.cs` returns false below 0 (93-95), true at 1 or more (98-100), and otherwise `chance >= RandomDouble()` (115). The same roll also feeds skill gain (130).
- Damage pipeline (`OnHit`, 1732): (a) base damage is a random roll between min and max (`GetBaseDamage`, 2455; the inclusivity and distribution of `Utility.RandomMinMax` were not read); (b) `ScaleDamageAOS` adds a percentage: strength, anatomy and tactics each add a bonus, plus the weapon damage bonus capped at 100 (2540-2586); (c) named percentage sources are summed into `percentageBonus` (ability, special move, Slayer +100 (1797), enemy-of-one, pack instinct, double strike -10 (1832), honour +25, talisman); the sum is capped at 300 (1861) and applied as `damage x (100 + pct) / 100` (1863); (d) `AbsorbDamage` (1873) runs the parry check (`CheckParry`, 1582): a parry sets damage to 0 (1586-1587) and an unparried hit rolls one armour piece for durability (1622); (e) `AOS.Damage` (1993) splits the damage by element and applies each element's resist as `damage x share x (100 - resist)` summed, divided by 10000 (AOS.cs 126-132), with a minimum of 1 unless armour is ignored (144). The physical share is the remainder after the other elements (BaseWeapon.cs 2364).
- Order matters: the percent sources (c) run before the parry (d); the resist split (e) runs after both. Pre-AOS, `AOS.Damage` hands the damage straight to the mobile (AOS.cs 62-64), and the hit uses a different hit value (`atkValue + 50`, 1327) and a halved damage rule (2688-2689). Not part of the sketch.
- Tick: none. This is a single synchronous resolution per swing, one call per swing. The swing delay is `GetDelay` (1356) and is not part of this mechanism.

## 2. Key functions

- `CheckHit`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Items/Weapons/BaseWeapon.cs` 1208-1337. The ratio hit chance, the caps and the 2% floor.
- `OnHit`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Items/Weapons/BaseWeapon.cs` 1732-2060 (read through 2060; the leech block after 2009 was not traced). The order of the damage steps (base, percent sources capped at 300, parry and armour, resist split).
- `ScaleDamageAOS`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Items/Weapons/BaseWeapon.cs` 2519-2586. Strength, anatomy and tactics bonuses and the weapon damage cap of 100.
- `AbsorbDamageAOS`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Items/Weapons/BaseWeapon.cs` 1576-1640. Parry zeroes the damage; armour durability on a random location otherwise.
- `AOS.Damage`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Misc/AOS.cs` 47-241. Element split and resist formula (126-132), minimum 1 (144), ignore-armour path (167).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Hit chance is a ratio: attacker (skill + offset) x (100 + bonus) over twice the defender side | Offset 20 (`+ 20.0`, BaseWeapon.cs 1272 and 1321); bonus caps 45 (1267, 1316); floor 0.02 under AOS (1335-1337) |
| Equal fighters hit half the time; a 120-skill attacker against 100 gives 0.583 with no bonuses (14000 / 24000) | none, a consequence of the ratio |
| Named percentage sources summed, then capped | Cap 300 (1861); double strike malus 10 (1832); Slayer +100 (1797) |
| Strength, anatomy and tactics add a percentage of the base damage | Strength 0.300 per point with threshold 100 and +5 at threshold (2540); anatomy 0.500 with +5 at 100 (2541); tactics 0.625 with +6.25 at 100 (2542); each bonus divided by 100 (2486-2495) |
| Weapon damage bonus capped at 100 before adding the virtual bonus | Cap 100 (2578) |
| Element share times (100 - resist), summed, divided by 10000, at least 1 | Divisor 10000 (AOS.cs 132); minimum 1 (144); physical share is the remainder (BaseWeapon.cs 2364) |
| Parry is a separate roll that zeroes the hit | Parry chance `parry / 800` for the AOS roll (1542); shield chance `(parry - bushido non-racial) / 400` (1508) |

## 4. TypeScript sketch

simplified: the sketch follows the donor order for one landed swing: hit roll, then base scaling by strength, anatomy and tactics, then the named percent sources with the cap of 300, then the element resist split with a minimum of 1. It omits the parry and armour step (`AbsorbDamageAOS`, which zeroes a parried hit and rolls armour durability), the mirror-image diversion, the Consecrated override, the chaos and quiver terms, the reflect and barding steps, the leech after damage, and the skill-gain side effect of the roll. The 0.02 floor is applied always, while the donor applies it only under AOS. The base damage is passed in rather than rolled. The strength, anatomy and tactics terms are the donor's constants, written here as data.

```ts
// Licence: GPL-3.0 (donor, LICENSE file). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Fighter {
  skill: number;            // attack skill as attacker, defend skill as defender
  str: number;
  anatomy: number;
  tactics: number;
  accuracyPct: number;      // attacker accuracy bonus, percentage points
  defendPct: number;        // defender defence bonus, percentage points
  weaponDamagePct: number;  // attacker weapon damage bonus, percentage points
}

export interface Split { phys: number; fire: number; cold: number; pois: number; nrgy: number; }  // percent, sums to 100
export interface Resist { phys: number; fire: number; cold: number; pois: number; nrgy: number; } // percent

const SKILL_OFFSET = 20;   // added to both skills in the hit ratio
const BONUS_CAP = 45;      // accuracy and defence bonus cap, percentage points
const HIT_FLOOR = 0.02;    // minimum hit chance
const DAMAGE_PCT_CAP = 300;

function bonus(value: number, scalar: number, threshold: number, offset: number): number {
  let b = value * scalar;
  if (value >= threshold) b += offset;
  return b / 100;
}

// Hit chance: attacker side over twice the defender side. Equal fighters give 0.5.
export function hitChance(atk: Fighter, def: Fighter): number {
  const ours = (atk.skill + SKILL_OFFSET) * (100 + Math.min(atk.accuracyPct, BONUS_CAP));
  const theirs = (def.skill + SKILL_OFFSET) * (100 + Math.min(def.defendPct, BONUS_CAP));
  return Math.max(HIT_FLOOR, ours / (theirs * 2));
}

// Certain miss below 0, certain hit at 1 or more, otherwise one roll against the chance.
export function rollHit(chance: number, rand: () => number): boolean {
  if (chance < 0) return false;
  if (chance >= 1) return true;
  return chance >= rand();
}

// Attacker strength, anatomy and tactics add a percentage of the base damage.
export function scaleDamage(base: number, atk: Fighter): number {
  const total =
    bonus(atk.str, 0.3, 100, 5) +
    bonus(atk.anatomy, 0.5, 100, 5) +
    bonus(atk.tactics, 0.625, 100, 6.25) +
    Math.min(atk.weaponDamagePct, 100) / 100;
  return Math.trunc(base + base * total);
}

// Named percentage sources (ability, slayer, honour, malus...) are summed, capped at 300, then applied.
export function applyPercentSources(damage: number, sourcesPct: number[]): number {
  let pct = 0;
  for (const s of sourcesPct) pct += s;
  pct = Math.min(pct, DAMAGE_PCT_CAP);
  return Math.trunc((damage * (100 + pct)) / 100);
}

// Each element hits at its share times (100 minus the target's resist); divide by 10000; at least 1 unless armour is ignored.
export function resistedDamage(damage: number, split: Split, res: Resist, ignoreArmour = false): number {
  if (damage <= 0) return 0;
  if (ignoreArmour) return damage;
  const sum =
    damage * split.phys * (100 - res.phys) +
    damage * split.fire * (100 - res.fire) +
    damage * split.cold * (100 - res.cold) +
    damage * split.pois * (100 - res.pois) +
    damage * split.nrgy * (100 - res.nrgy);
  return Math.max(1, Math.trunc(sum / 10000));
}

// One swing: roll the hit, then scale base damage, apply percent sources, then resists. Returns 0 on a miss.
export function resolveSwing(
  atk: Fighter, def: Fighter, base: number, sourcesPct: number[],
  split: Split, res: Resist, rand: () => number
): number {
  if (!rollHit(hitChance(atk, def), rand)) return 0;
  const scaled = scaleDamage(base, atk);
  const withSources = applyPercentSources(scaled, sourcesPct);
  return resistedDamage(withSources, split, res);
}
```

## 5. Lands in

- TARGET `src/fight/damage.ts` (proposed engine damage step; one function resolves a swing, server-side). Parity-checklist row 1 (duel step / sim). The hit roll and the damage pipeline belong in the same engine step so one ledger changes health.
- Parity row 1 only; the parry and armour step is row 3 (guard/parry/stamina) and is not in this note's sketch.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 1 (one combat core, two clients); rules 7-9 n/a

Best transferable idea: a hit chance as a ratio of attacker to defender skill with a fixed offset and capped bonuses, and a resist-weighted damage split with a minimum of one, both as pure functions the server can run for each swing.
Decision (proposed): adapt — take the ratio hit roll and the resist split, but not the strength/anatomy/tactics multipliers (a stat-driven damage ladder that Frankendom has no ruling for) and not the percent-source stack as it stands. Frankendom needs one hit roll with explicit caps and the parry and guard gates in row 3, not a tower of multipliers.
Acceptance: a server test with equal skills and no bonuses gives a hit chance of 0.5, a 120-skill attacker against a 100 defender gives 0.583 with no bonuses, a defender far above the attacker never pushes the hit chance below the 0.02 floor, and any bonus above 45 counts as 45, and a landed hit never does less than 1 damage unless armour is ignored.

## 6. Gaps and risks

- GPL-3.0 (copyleft): clean-room only. The sketch is written from the mechanism, not translated. Nothing here is adopted line by line.
- The donor's roll is `Utility.RandomDouble()` (SkillCheck.cs 115) with no seed. Frankendom needs fight replay (checklist row 19) and server-verified kills, so the roll must come from a seeded or server-recorded stream. The donor does not provide that.
- The roll also drives skill gain (SkillCheck.cs 130). Progression is a separate ledger in Frankendom; the hit roll must not grant XP as a side effect. Keep it out of the damage step.
- The donor's minimum-1 rule means a landed hit always does at least 1 damage after resist. Frankendom must decide whether guard or parry can reduce a landed hit to 0 (row 3); the donor zeroes damage in the parry step, before the resist split.
- The strength, anatomy and tactics ladder is a stat-driven damage multiplier with thresholds at 100. It would make the duel depend on character stats the rulings do not cover. Do not port it without a ruling. If it is ever wanted, it becomes a catalogue or hero-stat field, not a zone field.
- Per-weapon min and max damage is catalogue data (BaseWeapon `MinDamage`/`MaxDamage`), not zone data. Frankendom should keep it on the weapon catalogue.
- Many-on-one: this resolves one attacker against one defender. The donor's multi-target handling (`WhirlwindAttack.cs` 74 calls `weapon.OnHit` per target; not read end to end) is a different caller and was not traced. MAX_ATTACKERS = 3 must be enforced by the caller, not the damage function.
- Element types: the donor has five elements plus chaos and direct. Frankendom has no element model. Only the resist-split shape transfers unless Frankendom adds damage types.
