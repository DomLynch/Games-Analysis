# OpenEnroth-OpenEnroth (character-stats-skills, cell 3)

Donor: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/Objects/Character.cpp` (stat bonus, derived pools, attack, hit contest, damage, resistance, armour, recovery, skill bonus, regeneration), `.../src/Engine/Objects/CombinedSkillValue.cpp`, `.../src/Engine/mm7_data.cpp` (recovery and skill-cap tables), `.../src/Engine/Engine.cpp` (regen loop), `.../src/Application/GameConfig.h` (regen and recovery config) | Licence: GNU LESSER GENERAL PUBLIC LICENSE Version 3, 29 June 2007 (LICENSE line 2), so LGPL-3.0 (copyleft): clean-room, shape only | C++ | symbols: `Character::GetParameterBonus`, `GetMaxHealth`, `GetMaxMana`, `GetActualAttack`, `CalculateMeleeDamageTo`, `characterHitOrMiss`, `CalculateIncommingDamage`, `receiveDamage`, `GetAttackRecoveryTime`, `GetSkillBonus`, `GetMultiplierForSkillLevel`, `tickRegeneration`

Checked: camera_scope n/a (stats topic). Read: Character.cpp 130-140 and 207-214 (class table samples), 300-316 (bonus tables), 633-648, 712-729, 855-945, 1147-1217, 1364-1420, 1723-1863, 1864-1976, 2083-2112, 2128-2138, 2486-2500 (start only), 2636-2800, 2835-2850, 3719-3728, 4273-4309 (hit contest; the attack loop after 4309 not read), 4499-4524, Engine.cpp 1340 (grep), 1440-1535 (regen assembly and drain), Character.h 56-60, GameConfig.h 205-211, 272, 293 (grep), mm7_data.cpp 339-385, CombinedSkillValue.cpp 1-96 (whole). NOT read: `CalculateMeleeDmgToEnemyWithWeapon` (945-997), `GetRangedAttack` body (998-1011), `GetItemsBonus` (2156-2408), `GetMagicalBonus` (2409-2485), `actualSkillLevel` body after 2500, `GetSkillBonus` cases after 2800 (blaster and monster-id tails), `GetActualResistance` (2032-2082), `ticksBetween` definition, `grng->random` range (the note assumes [0, n)), the monster side in Actor.cpp and Monsters.cpp, and the `Recover` callers. Confidence: high on the hit contest, resistance halving, death buffer and the recovery sum (all read); medium on the RNG range assumption. Depth: full for the mechanisms listed in section 1.

## 1. Mechanism

- **Attribute to bonus step table.** Each attribute value is looked up in a threshold table sorted high to low (`param_to_bonus_table`, Character.cpp 306-308): the first threshold the value meets gives its bonus from `parameter_to_bonus_value` (309-311). The bonus runs from +30 at the top to -6 at the bottom and is not a linear rule (the table gives +9 at 50 and +11 at 100). The lookup walks until a threshold is met, and the sentinel is a 0 threshold at the end of the list (2128-2135).
- **Derived pools.** Max health = full-health bonus + class base + per-level x (level + endurance bonus) + items + bodybuilding skill bonus, floored at 0 (Character.cpp 1864-1876; the bodybuilding term is 2672-2674). Max mana: the stat used depends on class (Intelligence for mage classes at 1897, Personality for priests at 1913, both for mixed classes at 1925-1928); max mana = class per-level mana x (level + stat bonus) + items + class base + mana skill bonus, floored at 0 (1879-1946).
- **Attack and damage.** Actual attack = accuracy bonus (step table) + attack skill bonus + weapon + magic + a private term (855-866). Melee damage: unarmed = random 1 to 3 (907); spear in two hands adds one dice (911-913); off-hand weapons add damage; a might bonus and a damage-skill bonus are added, and the total is floored at 1 (901-943; minimum and maximum 869-898).
- **Hit contest (one roll, two sides).** `characterHitOrMiss` (4273-4309): target armour = natural armour, halved by the halved-armour buff, plus a shield or stoneskin buff term (4274-4287). The positive side = skill modifier + random below (armour + 2 x attack + 30) (4295-4296). The negative side depends on distance: close = armour + 15; medium = (armour + 15) / 2 + armour + 15 (4302); far = 2 x armour + 30 (4304). The hit lands when positive > negative (4309). Distance also picks the attack: ranged attack for a ranged shot (4290-4291).
- **Resistance by halving.** `CalculateIncommingDamage` (1147-1215): a lich ignores the mind, body and spirit resist types (1149-1155). The resist value is the element or type resist. Luck bonus is read (1184). If luck bonus + resist > 0, the damage is halved on each of up to four successful checks; each check passes when `random(divider) >= 30` where divider = luck bonus + resist + 30 (1186-1195), and the loop stops at the first failure. So each check succeeds with probability (bonus + resist) / (bonus + resist + 30).
- **Physical armour mastery.** Plate at master or above returns half damage (1202-1205); chain at grandmaster returns two thirds (1208-1211). This runs after the resist halving.
- **Death buffer (knockout before death).** `receiveDamage` (1389-1417): damage is subtracted from health first. If health < 1: if health + base endurance >= 1, the character is unconscious; otherwise dead (1397-1404). The preservation buff also keeps the character unconscious (1399). Armour breaks at health <= -10 unless hardened (1406-1408).
- **Attack recovery (the attack cooldown).** `GetAttackRecoveryTime` (1723-1842): base recovery = weapon (1725-1741) + armour (1761-1779) + shield (1746-1752); minus armsmaster level (doubled at grandmaster, 1799-1807), minus expert sword, axe or bow level in ticks (1783-1794), minus haste 25 ticks (1809-1813), minus swift or darkness or the Puck artifact 20 ticks (1815-1821), minus speed bonus in ticks (1781, using the step table). The result is floored at the melee, ranged or blaster minimum (1829-1839; defaults 30, 5, 5 at GameConfig 205-211). The donor's TODO (1743-1744) says the weapon is chosen before the bonuses are applied.
- **Armour recovery multipliers by mastery.** Leather: 1.0 at novice (1768). Chain: 1.0 at novice, 0.5 at expert (1770). Plate: 1.0, 0.5, 0.5 at expert, master (1772). The base recovery per armour type: shield 10, leather 10, chain 20, plate 30 ticks (mm7_data 369-370).
- **Skill bonus = mastery multiplier x level.** `GetMultiplierForSkillLevel(skill, m1, m2, m3, m4)` returns m1 at novice, m2 at expert, m3 at master, m4 at grandmaster, and 0 at none (2835-2850). Each skill bonus is that multiplier times the skill level, e.g. bodybuilding 1/2/3/5 (635), meditation 1/2/3/5 (643), blaster 1/2/3/5 (2751), unarmed 1/1/2/2 (2743), dodge 1/2/3/3 (2730). Dodge adds to armour class only when no armour is worn, or when leather is worn at grandmaster (2728-2733).
- **Skill value encoding.** A skill is a (level, mastery) pair (CombinedSkillValue.cpp 9-14): level 0-63 in six bits, mastery in bits 0x40 (expert), 0x80 (master), 0x100 (grandmaster) (55-74). A level-0 skill must have no mastery (25-26). A skill above zero is at least novice (2640-2641). Skill maximum level 60 for most skills, 1 for club and misc (mm7_data 339-352).
- **Learning speed.** Learning percent = hireling bonus + learning multiplier x learning skill + 9 when the skill is above zero (712-727; multipliers 1/2/3/5 at 721).
- **Regeneration in game time.** The regen loop computes `ticks5` = whole 5-minute intervals crossed (Engine.cpp 1340). Each character collects RegenData: hit points and mana per interval from items and artifacts, and a regeneration buff of 5 x power for hit points (Engine.cpp 1461-1505; Character.h 56-60). `tickRegeneration` (Character.cpp 4499-4523) adds `tick5 x rate` and clamps at the max, either stacking the item and buff rates or using the buff rate alone; with `regen_keeps_overflow` on, regen never lowers a pool that is above its max (4502-4504; config defaults true, GameConfig 272 and 293). A lich drains 2 health per interval and a zombie 1 per interval, each down to half of max (Engine.cpp 1522-1531).

## 2. Key functions

- Bonus lookup: `Character::GetParameterBonus` 2128-2136; tables 306-311.
- Pools: `GetMaxHealth` 1864-1876; `GetMaxMana` 1879-1946; regen `tickRegeneration` 4499-4523; loop 1440-1535.
- Attack and damage: `GetActualAttack` 855-866; `GetMeleeDamageMinimal` 869-883; `GetMeleeDamageMaximal` 885-898; `CalculateMeleeDamageTo` 901-943.
- Hit: `characterHitOrMiss` 4273-4309.
- Damage in: `CalculateIncommingDamage` 1147-1215; `receiveDamage` 1389-1417.
- Recovery: `GetAttackRecoveryTime` 1723-1842; `GetArmorRecoveryMultiplierFromSkillLevel` 1845-1861; `Recover` 2083-2098; `SetRecoveryTime` 2101-2110.
- Skills: `actualSkillLevel` 2486 (start); `getActualSkillValue` 2636-2644; `GetSkillBonus` 2647-2834; `GetMultiplierForSkillLevel` 2835-2850; `AddSkillByEvent` 3719-3726; `learningPercent` 712-727.
- Value encoding: `CombinedSkillValue` 9-96.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Stat to bonus by threshold table, first met wins | 29-entry table from 500 down to 0 (Character.cpp 306-311) |
| Hit contest: skill plus random against a distance-scaled armour side | Random span armour + 2 x attack + 30; close armour + 15; medium (armour + 15)/2 + armour + 15; far 2 x armour + 30 (4296-4306) |
| Resist by halving: up to four checks, first failure stops | Check divider = bonus + resist + 30; success at roll >= 30; max 4 (1186-1190) |
| Death buffer below zero | Threshold health + base endurance >= 1 (1398); armour break at -10 (1406) |
| Mastery ladder for skill multipliers | Per-skill tuples like 1/2/3/5 (635, 643, 2751) |
| Recovery = sum of base parts minus reductions, floored at minimum | Base 90 sword, 100 staff, 30 plate-type etc. (mm7_data 357-370); minimum 30 melee, 5 ranged (GameConfig 205-211) |
| Game-time regen per interval | 5 game minutes (Engine.cpp 1340) |

### 3b. Stat table (SK focus: name | what it does | formula | number ranges | caps | file:line)

| name | what it does | formula | number ranges | caps | file:line |
|---|---|---|---|---|---|
| Stat bonus (any attribute) | Converts a stat to a bonus | step table, first threshold met | +30 at 500+; about +9 at 50; 0 at 13; -6 below 0 | none read | Character.cpp:306-311, 2128-2135 |
| Accuracy to attack | Attack term | parameter bonus of Accuracy plus attack skill plus weapon plus magic | depends on stat table | none read | Character.cpp:855-866 |
| Might to melee damage | Damage term | parameter bonus of Might, added to weapon min and max | stat table | result floored at 1 | Character.cpp:869-898 |
| Max health | HP pool | class base + per-level x (level + End bonus) + per-level x bodybuilding + items | class base 40 knight (line 131) | floored at 0 | Character.cpp:130-134, 207-210, 1864-1876, 2672-2674 |
| Max mana | Mana pool | class per-level mana x (level + stat bonus) + class base + mana skill + items | stat by class: Int, Per, or both | floored at 0 | Character.cpp:1879-1946 |
| Endurance death buffer | Unconscious vs dead | health + base End >= 1: unconscious, else dead | End base value | none | Character.cpp:1397-1404 |
| Armour break | Gear damage | break at health <= -10 unless hardened | -10 | n/a | Character.cpp:1406-1408 |
| Luck resist check | Halve damage | per check (bonus + resist) / (bonus + resist + 30), max 4 checks | up to 1/16 of damage | runs only if bonus + resist > 0 | Character.cpp:1184-1195 |
| Plate mastery | Physical damage | master or above: x 0.5 | 0.5 | n/a | Character.cpp:1202-1205 |
| Chain mastery | Physical damage | grandmaster: x 2/3 | 0.667 | n/a | Character.cpp:1208-1211 |
| Hit contest | Hit or miss | positive: skill + random(armour + 2 x attack + 30); negative: close armour + 15, medium (armour + 15)/2 + armour + 15 (integer halving), far 2 x armour + 30 | depends on stats | none read | Character.cpp:4273-4309 |
| Halved armour buff | Armour | natural armour halved | x 0.5 | n/a | Character.cpp:4277-4278 |
| Unarmed damage | Bare hands | random 1 to 3 | 1 to 3 | floored at 1 | Character.cpp:901-943 |
| Melee damage | Weapon | weapon dice + might + skill + magic | from weapon data | floored at 1 | Character.cpp:869-943 |
| Armsmaster | Recovery and attack | level in ticks off recovery; GM doubles | level ticks, x2 at GM | none | Character.cpp:1799-1807, 2651-2659 |
| Expert sword, axe, bow | Recovery | level in ticks off recovery at expert and up | level ticks | none | Character.cpp:1783-1794 |
| Attack recovery | Cooldown after a swing | weapon + armour + shield - reductions; floored at minimum | e.g. sword 90 base, minimum 30 melee | floor by config | Character.cpp:1723-1842 |
| Armour recovery multipliers | Cooldown | leather 1.0 novice; chain 1.0/0.5; plate 1.0/0.5/0.5 by mastery | 0 to 1 | n/a | Character.cpp:1768-1772, 1845-1861 |
| Minimum recovery | Cooldown floor | melee 30, ranged 5, blasters 5 ticks | 5 to 30 ticks | config | GameConfig.h:205-211 |
| Skill mastery multiplier | Skill bonus | m1 novice, m2 expert, m3 master, m4 grandmaster, 0 at none | e.g. 1/2/3/5 | none | Character.cpp:2835-2850 |
| Skill level | Skill | level 0 to 63 (six bits); normal max 60 | 0 to 60 | max 60; club and misc 1 | CombinedSkillValue.cpp:57-74; mm7_data.cpp:339-352 |
| Dodge | Armour class | multiplier x dodge level, only if no armour (or leather at GM) | 1/2/3/3 by mastery | n/a | Character.cpp:2728-2733 |
| Learning percent | Training speed | hireling bonus + multiplier x learning + 9 | +9 base when skill > 0 | none | Character.cpp:712-727 |
| Regen per interval | HP and mana | rate x 5-minute intervals crossed, clamped to max; buff 5 x power | per interval | clamp to max; overflow kept | Engine.cpp:1340, 1461-1527; Character.cpp:4499-4523 |
| Lich drain | Self-harm | -2 per interval to half max | 2 | floor at half max | Engine.cpp:1522 |
| Zombie drain | Self-harm | -1 per interval to half max | 1 | floor at half max | Engine.cpp:1531 |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for the step-table bonus, the mastery ladder, the hit contest (positive side against a distance-scaled negative side), the resist halving with up to four checks, the death buffer, attack recovery as base minus reductions floored at a minimum, the health pool, and the regen clamp that keeps overflow. It omits the item and magic bonuses, the armsmaster and expert-weapon reductions as separate inputs, the resist value and luck lookup (passed in as the luck bonus), the lich and zombie rules, the armour break, the preservation buff and the RNG (passed in). All thresholds and tuning constants are placeholders, not donor values (LGPL: shape only).

```ts
// Licence: LGPL-3.0 (donor OpenEnroth, LICENSE file). clean-room sketch written from the described mechanism; no donor lines or tables copied.
// clean-room
export {};

// Step table: a stat maps to a bonus through thresholds sorted high to low; the first threshold the stat meets wins.
// Shape only. Placeholder thresholds, not the donor's values.
export interface Step { atLeast: number; bonus: number; }
export function stepBonus(stat: number, table: Step[], floorBonus: number): number {
  for (const s of table) {
    if (stat >= s.atLeast) return s.bonus;
  }
  return floorBonus;
}
const placeholderSteps: Step[] = [
  { atLeast: 100, bonus: 10 }, { atLeast: 50, bonus: 5 }, { atLeast: 20, bonus: 2 }, { atLeast: 0, bonus: 0 },
];

// Mastery ladder: a skill's multiplier depends on its mastery tier (novice to grandmaster).
export type Mastery = 0 | 1 | 2 | 3 | 4; // 0 = none (level must be 0), 1 = novice, 2 = expert, 3 = master, 4 = grandmaster
export interface Tiers { novice: number; expert: number; master: number; grandmaster: number; }
export function tierMultiplier(mastery: Mastery, t: Tiers): number {
  switch (mastery) {
    case 1: return t.novice;
    case 2: return t.expert;
    case 3: return t.master;
    case 4: return t.grandmaster;
    default: return 0;
  }
}
export function skillBonus(level: number, mastery: Mastery, t: Tiers): number {
  return tierMultiplier(mastery, t) * level;
}

// Melee-style contest: a skill-and-stat term must beat a defence term that grows with distance.
// Shape: positive = skillMod + rand(armour + 2 x attack + k1); negative = armour + k2 (close), larger at range.
export interface Contest { skillMod: number; armour: number; attack: number; range: "close" | "medium" | "far"; }
export function contestHit(c: Contest, rand: (n: number) => number): boolean {
  const k1 = 30; // placeholder for a tuning constant
  const k2 = 15; // placeholder for a tuning constant
  const positive = c.skillMod + rand(c.armour + 2 * c.attack + k1);
  let negative: number;
  if (c.range === "medium") negative = Math.trunc((c.armour + k2) / 2) + c.armour + k2;
  else if (c.range === "far") negative = 2 * c.armour + k1;
  else negative = c.armour + k2;
  return positive > negative;
}

// Resist by halving: each successful check halves the damage, up to four checks.
// A check succeeds with probability (bonus + resist) / (bonus + resist + 30) and stops at the first failure.
// simplified: uses one tuning constant (30) for the check size; no clean-up of the integer halving (1 damage can become 0).
export function resistHalving(damage: number, luckBonus: number, resist: number, rand: (n: number) => number): number {
  const divider = luckBonus + resist + 30;
  if (luckBonus + resist <= 0) return damage;
  let d = damage;
  for (let i = 0; i < 4; i++) {
    if (rand(divider) >= 30) d = Math.trunc(d / 2);
    else break;
  }
  return d;
}

// Attack recovery: base weapon + armour + shield, minus reductions, never below the minimum.
export interface RecoveryInput { weaponBase: number; armourBase: number; shieldBase: number; reductions: number; minimum: number; }
export function attackRecovery(r: RecoveryInput): number {
  const total = r.weaponBase + r.armourBase + r.shieldBase - r.reductions;
  return Math.max(total, r.minimum);
}

// Health pool: class base + per-level x (level + endurance step) + per-level x bodybuilding + items; floored at 0.
export function maxHealth(classBase: number, perLevel: number, level: number, enduranceStep: number, bodybuilding: number, items: number): number {
  const total = classBase + perLevel * (level + enduranceStep) + perLevel * bodybuilding + items;
  return Math.max(0, total);
}

// Death buffer: health below 1 is unconscious while health + endurance is still at least 1; otherwise dead.
// simplified: omits preservation buff, the armour-break at -10 and the wake-up on regen.
export type Outcome = "alive" | "unconscious" | "dead";
export function receiveDamage(health: number, endurance: number, damage: number): { health: number; outcome: Outcome } {
  const h = health - damage;
  if (h >= 1) return { health: h, outcome: "alive" };
  if (h + endurance >= 1) return { health: h, outcome: "unconscious" };
  return { health: h, outcome: "dead" };
}

// Regen per whole 5-minute game interval: a pool grows by the rate times the number of intervals crossed, capped at the max.
// keepOverflow: a pool that is already above the max is not reduced by regen.
export function regenPool(current: number, max: number, perInterval: number, intervals: number, keepOverflow: boolean): number {
  const result = Math.min(max, current + perInterval * intervals);
  return keepOverflow ? Math.max(current, result) : result;
}

// Demo values (not donor data).
const rng = (n: number): number => Math.floor(n / 2);
const tiers: Tiers = { novice: 1, expert: 2, master: 3, grandmaster: 5 };
const sb = stepBonus(60, placeholderSteps, -1);
const sk = skillBonus(20, 2, tiers);
const hitOk = contestHit({ skillMod: 40, armour: 30, attack: 25, range: "medium" }, rng);
const halved = resistHalving(40, 5, 10, rng);
const rec = attackRecovery({ weaponBase: 90, armourBase: 30, shieldBase: 0, reductions: 12, minimum: 30 });
const mh = maxHealth(40, 5, 10, 2, 3, 0);
const dead = receiveDamage(5, 20, 30);
const alive = receiveDamage(5, 20, 22);
const reg = regenPool(40, 100, 2, 3, true);
void [sb, sk, hitOk, halved, rec, mh, dead.outcome, alive.outcome, reg];
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 /tmp/sk001-openenroth-stats.ts` run on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/stats.ts` (new module, shared with the OpenMW and Daggerfall notes): the step-table bonus, the mastery ladder, the hit contest, resist halving, the death buffer, attack recovery and the regen clamp. Parity-checklist row 21 (catalogue fields): the 3b table is the catalogue source.
- Server tick: regen is driven by elapsed game time (whole 5-minute intervals), not by frames; that matches the server-tick sub-line "server tick: fixed step, input intake, per-tick NPC budget" (row 18 / post-K item 3) for the time base only.
- Reuse tag: rewrite-from-idea (LGPL-3.0; clean-room only)
- Brief rule served: one ledger (the death buffer is one health ledger with a KO window, not a separate state); tunable numbers as data; server-verified outcomes (RNG injected).

## 6. Gaps and risks

- LGPL-3.0: clean-room only; the sketch uses placeholder thresholds and constants, and no donor table is copied.
- **D1, mastery added to a level-zero skill.** `AddSkillByEvent` (Character.cpp 3719-3726) builds a mastery at level 0 when only a mastery is added, and the donor's own TODO (3723-3724) says that then asserts in the constructor (CombinedSkillValue.cpp 25-26). The donor notes no script does this. Fix: reject or raise the level in the add-skill event, and test it.
- **D2, recovery order of operations.** The donor's TODO (Character.cpp 1743-1744) says the weapon with the larger recovery is chosen before the bonuses apply. Keep the idea; fix by computing each candidate's reductions first, then taking the minimum.
- **D3, speed bonus can be negative.** `GetParameterBonus(speed)` is used as a reduction (1781), and the table goes to -6, so a slow character gets a longer recovery. This may be intended; decide and document it.
- **D4, skill level range.** `CombinedSkillValue::isValid` allows 63 while the table cap is 60 (CombinedSkillValue.cpp 22 and mm7_data 339-352; the donor's TODO says 60). Fix: use the table cap.
- **D5, lich and damage-type casts.** The TODO at Character.cpp 1148 notes weird casts between damage types and attributes; the lich immunity (1149-1155) depends on them. Fix: a typed map from damage type to resist.
- **D6, halving rounds to zero.** `dmg /= 2` (1191) can take 1 damage to 0. Probably fine; decide whether a hit always does at least 1.
- **D7, step-table sentinel.** The lookup stops at a 0 threshold (2131). A table without a 0 entry would read past its end. Fix: bound the loop by the table length.
- The 'hit contest' random term is `grng->random(n)`; the note assumes a uniform [0, n). Not confirmed (grng not read).
- Items, magic, the resistance values and the monster side were not read; they feed these formulas (the item bonus enters the attack term at 863-865, and the resistance at 1160-1178).
- Frankendom should decide whether a Luck-based halving chance is wanted at all: it makes resist random per hit, which the server must replay (RNG injected).

Best transferable idea: Endurance sets a knockout window below zero health: a hit that leaves health under 1 knocks the fighter out while health plus Endurance is still at least 1, and only a larger hit kills.

Decision (proposed): adapt — take the knockout window (Endurance below zero) for the Pit and zones as a state change, not a death, and keep the hit contest's distance-scaled negative side as a shape; reject the halving-by-luck resist unless playtests want random per-hit reduction, and fix D1 and D2 in the add-skill and recovery code before any port.

Acceptance: a fighter with 5 health and Endurance 20 takes a 22-damage hit and is unconscious (health -17, -17 + 20 = 3); a 30-damage hit kills (health -25, -5); a server test asserts both outcomes with the state changes recorded in the one ledger.

Reuse tag: rewrite-from-idea (LGPL-3.0; clean-room only)
Brief rule served: one ledger (one health value with a KO window); tunable numbers as data; server-verified kills (RNG injected, outcome computed on the server).
