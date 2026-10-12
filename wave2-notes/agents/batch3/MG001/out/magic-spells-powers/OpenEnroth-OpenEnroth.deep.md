# OpenEnroth-OpenEnroth (magic-spells-powers, cell 3)

Donor: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/Spells/Spells.cpp` (spell table, buffs, damage) with `CastSpellInfo.cpp` (cast gate, mind and undead spells), `src/Engine/Objects/Character.cpp` (mana, party damage reduction), `src/Engine/Objects/Actor.cpp` (monster damage-type gate) | Licence: GNU LESSER GENERAL PUBLIC LICENSE Version 3, 29 June 2007 (root `LICENSE`, line 2 as read) | C++ | symbol `CastSpellInfoHelpers::castSpell`, `CalcSpellDamage`, `Character::CalculateIncommingDamage`, `Actor::DoesDmgTypeDoDamage`

Checked: Read: `Spells.cpp` 150-170 (SpellData constructor), 193-301 (the regular-spell table; 99 rows by grep, rows 195, 219, 255, 278, 283 read), 462-483 (SpellBuff::Apply), 485-500 (table loader header), 813-846 (CalcSpellDamage); `CastSpellInfo.cpp` 117-240 (cast queue, mana, recovery, cursed failure), 612-660 (Mind Charm), 2088-2120 (Mass Fear), 2728-2772 (Control Undead); `Actor.cpp` 3779-3819 (DoesDmgTypeDoDamage); `Monsters.cpp` 327 and 545-554 (resistance columns); `Character.cpp` 306-312 (bonus tables), 345-362 (mana), 1147-1192 (incoming damage up to the armour branch), 2032-2050 (GetActualResistance start), 2128-2140 (GetParameterBonus); `RandomEngine.cpp` 11-19; `Core/Time/Duration.h` 28-60; `GameConfig.h` 252. Read in part: `Spells.cpp` 548-640 (eventCastSpell: sprite and sound setup only, the rest of its 260 lines is presentation, not read); `CastSpellInfo.cpp` 240-2728 used for the grep of spell cases and SpendMana sites, not read in full. Candidate files opened for the topic: Spells.cpp, CastSpellInfo.cpp, Character.cpp, Actor.cpp, Monsters.cpp, RandomEngine.cpp, Duration.h. Confidence: high for the mana and recovery path, the failure rules, the damage formula, the monster gate and the party halving (read end to end). Medium for the mind branches (read for the gate and duration; the monster AI reaction to Charm and Afraid was not read). Not read: summon code (Summon Elemental and others), `GetActualResistance` after its first lines, the armour branch of CalculateIncommingDamage, `Spells_ut.cpp`, the spell-fx sprite code, the spells.txt blob itself (not located in the donor during this read; the loader is at Spells.cpp 485-547). Camera: not applicable (magic note).

## 1. Mechanism

- Spell data is one row per regular spell (`pSpellDatas`, Spells.cpp 193-301): mana cost for each of the four masteries (novice, expert, master, grandmaster), recovery for each mastery in ticks, base damage, bonus damage faces per skill level, flags and the required mastery to learn it (constructor 150-170).
- Cast queue (`CastSpellInfoHelpers::castSpell`, CastSpellInfo.cpp 117-): for each queued cast, the skill level and mastery come from the caster's skill (`getActualSkillValue`, the level and mastery are read from it). Mana cost = `mana_per_skill[mastery]` (208). Recovery = `recovery_per_skill[mastery]` (211). Failure recovery = recovery times `SpellFailureRecoveryMod` (215, config default 0.5, GameConfig.h 252).
- Free casts: Dark spells cost 0 at hour 0 minute 0 and Light spells at hour 12 minute 0 (218).
- Not enough mana: refused before any spend, with a failure message (224-226).
- Cursed caster: a regular spell fails with 50% chance (233). The failure sets a fixed 100-tick recovery (234; constant at line 50), spends the mana (236), and `return`s (237).
- Mana: `CanCastSpell` is `mana >= cost` (Character.cpp 345-350); `SpendMana` subtracts the cost (357-362).
- Damage (`CalcSpellDamage`, Spells.cpp 813-846): generic spells are `baseDamage + randomDice(skillLevel, bonusFaces)` (841). `randomDice(count, faces)` sums `1 + random(faces)` for each of `count` dice (RandomEngine.cpp 11-19). Special cases: Fire Spike rolls `skillLevel` dice with 6, 6, 8, 10 faces by mastery (833); Death Blossom at grandmaster is base plus `2 * skillLevel` (835); Mass Distortion takes `(base + bonus * skillLevel) / 100` percent of the `currentHp` argument (837; whose HP is passed in was not read).
- Monster gate (`Actor::DoesDmgTypeDoDamage`, Actor.cpp 3779-3819): each monster has a resistance value per damage type (Monsters.cpp 545-554; "Imm" is encoded as 200, comment at Monsters.cpp 327). A value of 200 or more is immune (3816). Otherwise the check passes when `random(level/4 + resist + 30) < 30` (3817), so the pass chance is 30 divided by `(level >> 2) + resist + 30` (computed arithmetic, not a donor constant).
- Mind spells use that gate: Mind Charm (CastSpellInfo 614-650): a wrong target (not an actor) is a failure with failure recovery and no mana spend (the `continue` branch, comment at 2730-2731 for Control Undead). The gate is at 624. The charm buff is applied for a duration set by mastery (638 for master: `10 * spell_level` game minutes; expert and novice 5 * level, GM one year), after clearing Berserk and Enslaved (649-650).
- Control Undead (2728-2772): wrong target gives failure with failure recovery and no mana (2732-2735); a non-undead target is a failure that spends mana and sets the normal recovery (2756-2760, the undead check); the Dark gate is at 2762; success applies Enslaved for 3 * level minutes (expert, 2742), 5 * level (master, 2745), one year (GM, 2749) and resets Berserk and Charm (2770 Enslaved apply).
- Mass Fear (2088-2120): for each actor in the affected set (the loop head was not read), skips undead (2110), then applies Afraid only if the mind gate passes (2114-2115).
- Buffs (`SpellBuff::Apply`, Spells.cpp 462-483): a new buff does not replace an existing one that lasts longer (468 returns false when the new expiry is earlier). Otherwise it sets mastery, power, expiry and caster.
- Party damage reduction (`Character::CalculateIncommingDamage`, Character.cpp 1147-1191): mind, body and spirit damage is 0 for liches (1149-1153). Otherwise a resist value is read per damage type (1157-1182). Then `divider = luckBonus + resist + 30` (1185-1186). If `luckBonus + resist > 0` (1188), up to four checks run in a row (1189): a check of `random(divider) >= 30` halves the damage (1190-1191, integer division) and a failed check stops the loop (`break`). Armour for physical damage follows (not read).
- Luck bonus (`GetParameterBonus`, Character.cpp 2128-2140): a 28-row threshold table (306-307: 500, 400, ..., 3) maps the luck value to a bonus (309-310: 30, 25, ..., -5). Values below the last threshold give -6 (the zero sentinel in the table ends the scan, 2131).
- Time: `Duration` counts 128 ticks per real second and game time runs 30 times faster (Duration.h 28-29); `fromTicks` is raw ticks (39); `fromMinutes` is game minutes (44). So a recovery of 110 ticks is 0.86 real seconds, and one game minute is 2 real seconds.

## 2. Key functions

- `CastSpellInfoHelpers::castSpell`: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/Spells/CastSpellInfo.cpp` 117-2980. The cast queue; the mana, recovery and failure rules are at 208-237.
- `CalcSpellDamage`: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/Spells/Spells.cpp` 813-846.
- `SpellBuff::Apply`: same file 462-483.
- `Actor::DoesDmgTypeDoDamage`: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/Objects/Actor.cpp` 3779-3819.
- `Character::CalculateIncommingDamage` and `GetParameterBonus`: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/Objects/Character.cpp` 1147-1191 and 2128-2140.

## 3. Numbers vs mechanism

The reusable part is the data shape: one spell row that holds cost and recovery per mastery, and a recovery that gets shorter as the caster masters the spell. The numbers below come from the table or the formulas as written.

TABLE (magic mechanisms; cost column = mana unless stated):

| name | effect | formula | number ranges | cost | cooldown / cast time | caps | file:line |
|---|---|---|---|---|---|---|---|
| Spell row | per-spell data | 4 mana, 4 recovery ticks, base, faces, flags, required mastery | 99 regular rows; Fire Bolt row 195: mana 2 at every mastery, recovery 110/110/100/90 ticks, base 0, faces 3 | mana per mastery | recovery per mastery | required mastery to learn | Spells.cpp 193-301; 150-170; 195 |
| Mana check | cast refused when short | `mana >= cost` | cost from the row | mana | n/a | none | Character 345-350; CastSpellInfo 224-226 |
| Mana spend | cost removed | `mana -= cost` | cost from the row | mana | n/a | some failures spend (e.g. 457, 702) | Character 362; CastSpellInfo 236, 308 |
| Recovery | cooldown after a cast | ticks per mastery divided by 128 | Fire Bolt 110 to 90 ticks (0.86 s to 0.70 s); Light Day of the Gods 500 ticks (3.9 s) | n/a | recovery per mastery | none | CastSpellInfo 211; Spells.cpp 166, 195, 283; Duration.h 28 |
| Failure recovery | shorter cooldown on a failed cast | `recovery * 0.5` (config default) | half the recovery | n/a | failure recovery | config validated | CastSpellInfo 215; GameConfig 252 |
| Free casts | Dark at hour 0:00, Light at hour 12:00 | mana 0 | two moments per day | 0 | n/a | those minutes only | CastSpellInfo 218 |
| Curse | regular spells fail half the time | `random(100) < 50` | 50% | mana spent | 100 ticks (0.78 s) | one failure per queue pass (return at 237) | CastSpellInfo 233-237, 50 |
| Generic damage | base plus dice | `base + randomDice(skillLevel, faces)` | one die per skill level, 1..faces each | n/a | n/a | faces from the row | Spells.cpp 841; RandomEngine 11-19 |
| Fire Spike | dice by mastery | dice = skill level; faces 6, 6, 8, 10 | per mastery | n/a | n/a | none | Spells.cpp 833 |
| Death Blossom (GM) | base plus per-level | `base + 2 * skillLevel` | 2 per skill point | n/a | n/a | none | Spells.cpp 835 |
| Mass Distortion | percent of current HP | `currentHp * (base + bonus * level) / 100` | percent of current HP | n/a | n/a | none | Spells.cpp 837 |
| Monster damage-type gate | the hit does damage | pass if `random(level/4 + resist + 30) < 30` | pass chance 30 / (level/4 + resist + 30); resist 200 or more is immune | n/a | n/a | immune at 200 | Actor 3779-3817; Monsters 327, 545-554 |
| Mind Charm | charm a monster | gate, then Charm buff | master 10 game min per level (638); expert and novice 5 per level; GM one year | mana | cast on wrong target: failure, no spend | GM lasts until leaving the map | CastSpellInfo 614-650 |
| Control Undead | enslave an undead | undead check, Dark gate, Enslaved buff | expert 3 per level, master 5 per level (game minutes), GM one year | mana | wrong target: no spend; non-undead and gate fail: spend | undead only | CastSpellInfo 2728-2772 (2732, 2742-2749, 2756, 2762, 2770) |
| Mass Fear | afraid each non-undead in range | per actor: undead skip, mind gate, Afraid | per actor | mana | n/a | undead immune | CastSpellInfo 2088-2115 |
| Buff overwrite | new buff | never shortens an existing buff | expiry compared | n/a | expiry | none | Spells.cpp 468 |
| Party damage reduction | halve incoming hit | up to 4 checks, each `random(divider) >= 30` halves | divider = luckBonus + resist + 30; only if luckBonus + resist > 0 | n/a | per hit | at most four halvings | Character 1186-1191 |
| Lich immunity | no mind, body or spirit damage | early return 0 | class check | n/a | n/a | lich only | Character 1148-1149 |
| Luck bonus | luck to a bonus | table lookup | 500 gives 30; 3 gives -5; below 3 gives -6 | n/a | n/a | fixed table | Character 306-310, 2128-2140 |

Which numbers suit a fast mobile fight: a recovery of 0.7 to 0.9 s per cast for the common bolts is close to what a duel would want, and the failure recovery at half of that is a tuned penalty for a failed cast. Mind Charm and Control Undead durations are game minutes (2 real seconds each), so a master-level charm of level 10 lasts 200 real seconds; a fast fight needs durations in seconds. The halving pass chance (30 / divider) gives a useful one-number resist for the party: luck 50 (bonus 9) with no resist gives a divider of 39, so a single check halves about 23% of hits.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order of the cast-independent rules: recovery lookup and failure factor, the damage roll (base plus one die per level), the party halving checks (in the donor order, with the donor's luck-plus-resist gate), the luck bonus lookup and the buff overwrite rule. It omits the table flags (monster-castable, shift-click), the mana check and spend, the cursed and wrong-target branches, the free-cast hours, the fire-spike, death-blossom and mass-distortion special cases, the monster damage-type gate, the mind durations, and the lich immunity. Nothing is reordered. The sketch takes `rnd(n)` as returning 0..n-1, as the donor `random` does.

```ts
// Licence: LGPL-3.0 donor (clean-room). Sketch written from the described mechanism, not a translation of the donor lines.
export type Mastery = 1 | 2 | 3 | 4; // novice, expert, master, grandmaster

export interface SpellRow {
  mana: [number, number, number, number];            // cost per mastery
  recoveryTicks: [number, number, number, number];   // recovery per mastery, in donor ticks
  baseDamage: number;
  bonusPerLevel: number;                              // die faces per skill level (0 = no dice)
}

export const TICKS_PER_REAL_SECOND = 128;             // donor Duration: 128 ticks per real second

// Recovery in real seconds. A failed cast uses the recovery times a failure factor (donor default 0.5).
export function recoverySeconds(row: SpellRow, m: Mastery, failed: boolean, failureMod = 0.5): number {
  const ticks = row.recoveryTicks[m - 1] * (failed ? failureMod : 1);
  return ticks / TICKS_PER_REAL_SECOND;
}

// Damage: base plus one roll of 1..faces per skill level. rnd(n) returns 0..n-1 (donor random).
export function spellDamage(row: SpellRow, level: number, rnd: (n: number) => number): number {
  if (row.bonusPerLevel === 0) return row.baseDamage;
  let total = row.baseDamage;
  for (let i = 0; i < level; i++) total += 1 + rnd(row.bonusPerLevel);
  return total;
}

// Party damage reduction: up to four checks; each check at or above 30 halves the damage.
// Only applies when luck bonus plus resistance is positive (donor CalculateIncommingDamage).
export function reduceIncoming(dmg: number, luckBonus: number, resist: number, rnd: (n: number) => number): number {
  if (luckBonus + resist <= 0) return dmg;
  const divider = luckBonus + resist + 30;
  let out = dmg;
  for (let i = 0; i < 4; i++) {
    if (rnd(divider) >= 30) out = Math.trunc(out / 2);
    else break;
  }
  return out;
}

// Luck to bonus: first threshold the value meets; below the last threshold the last bonus applies (donor table lookup).
const PARAM_TO: number[] = [500, 400, 350, 300, 275, 250, 225, 200, 175, 150, 125, 100, 75, 50, 40, 35, 30, 25, 21, 19, 17, 15, 13, 11, 9, 7, 5, 3];
const BONUS: number[] = [30, 25, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, -1, -2, -3, -4, -5, -6];

export function parameterBonus(p: number): number {
  for (let i = 0; i < PARAM_TO.length; i++) {
    if (p >= PARAM_TO[i]) return BONUS[i];
  }
  return BONUS[BONUS.length - 1];
}

export interface Buff {
  expire: number;   // game time the buff ends
  power: number;
}

// A new buff replaces the old one only if it does not end earlier (donor SpellBuff::Apply).
export function applyBuff(current: Buff | null, next: Buff): Buff {
  if (current && next.expire < current.expire) return current;
  return next;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 /tmp/openenroth-spell-rules.ts` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/spell-table.ts` (new module): one spell catalogue row with cost, recovery, damage dice and flags per mastery, read by the engine at cast time. It is the runtime source for the specials table (catalogue fields).
- Parity-checklist row 21 (catalogue fields). The damage-reduction and buff rules belong in the same engine step as row 13 (specials); row 21 is the one cited here because the donor's value is the row shape.
- Reuse tag: rewrite-from-idea (LGPL-3.0; clean-room, shape only)
- Brief rule served: 1 (one engine: one table, one gate), row 21; rules 7-9 n/a

## 6. Gaps and risks

- LGPL-3.0: clean-room, shape only. The sketch is written from the mechanism.
- Defect 1, the queue exits early (kept idea, fixed in the sketch's design). The cursed failure at CastSpellInfo 233-237 ends with `return` inside the loop over the queued casts. Every other failure in the same loop uses `continue`. So one cursed failure stops the processing of the other queued casts in that pass; whether they are kept for the next pass was not read. Fix: `continue`, with a test that a second queued cast still resolves after a cursed failure.
- Defect 2 is not a defect in the code but a unit trap: recovery is in ticks at 128 per real second, while `fromMinutes` counts game minutes at 30 per real second (Duration.h 28-29, 44). A Frankendom table must say which unit each field uses.
- Mind effects depend on monster AI that was not read. Charm and Afraid apply buffs (CastSpellInfo 650, 2115); what a charmed or afraid monster does is in the monster code (not read). Frankendom's engage is a state change, so a charm must be a state, and the donor's buff does not say who may attack whom.
- Player-vs-player: no PvP consent or flag rules are in these functions. Frankendom's flagged-off rules are not supplied by the donor.
- Summons: the summon code (Summon Elemental is a regular row with a 140-tick recovery in the table) was not read; leash, upkeep and kill ownership are not claimed.
- The party halving is a damage rule for the player party. Frankendom's single-character duel needs the same reduction only if the resist value is per character; the donor's resist values come from items and skills (GetActualResistance, read only in its first lines).
- Spell names and flags are loaded from a spells.txt blob (Spells.cpp 485-547). The blob was not located in the donor during this read, so names and descriptions are not claimed.

Best transferable idea: keep spell cost and recovery in one row per mastery, so a higher mastery shortens the recovery instead of raising the cost, and a failed cast uses a fixed fraction of that recovery.
Decision (proposed): adapt - take the per-mastery row shape into `src/fight/spell-table.ts` with recovery in seconds and cost in stamina or focus; fix the cursed-failure `return` by using continue; drop the luck table and Mind Charm durations until a PvP consent rule exists.
Acceptance: a server test with a Fire Bolt row of recovery 110, 110, 100, 90 ticks (0.86, 0.86, 0.78, 0.70 s) asserts a grandmaster cast waits 0.70 s, a failed cast waits half of that, and a second queued cast still resolves after a failure.

Reuse tag: rewrite-from-idea (LGPL-3.0; clean-room, shape only)
Brief rule served: 1 (one engine: one table, one gate), 21 (catalogue fields)
