# crawl-crawl (magic-spells-powers, cell 1)

Donor: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/spl-cast.cc` | Licence: GPL-2.0-or-later (`/mnt/frankendom-donors/crawl-crawl/LICENSE` line 7: "either version 2 of the License, or" and "any later version"; some files say the code may carry other GPL-compatible licences) | C++ | symbols `raw_spell_fail`, `calc_spell_power`, `your_spells` (fail roll), `max_miscast_damage`

Checked: Read in full: `raw_spell_fail` (470-554), `_skill_power` (443-456), `_stepdown_spellpower` (435-441), `calc_spell_power` (565-615), `_apply_spellcasting_success_boosts` (376-420), `spell_mana` (545-572 in spl-util.cc), the MP charge in `cast_a_spell` (1059-1068), the fail roll and raw-fail comparison in `your_spells` (2346-2412), `max_miscast_damage` (2961-2971), `stepdown.cc` (14-50), `random2avg` (random.cc 339-347), `player_armour_shield_spell_penalty` (player.cc 2419-2434). Not read: `_do_cast` body, `miscast_effect` body, `_spellcasting_aborted` (1247 onward), the spellmotor gizmo branch; the god-penance branches (2346-2378) were read only as far as their one_chance_in(20) gates. Confidence: high on the fail, power, cost and roll formulas (read end to end); medium on the exact call chain between `cast_a_spell` and the roll (read the calls, not every line in between). camera_scope: not applicable.

Best transferable idea: give every spell one data-driven failure curve (base, caster-stat terms, armour penalty, level table, smoothing clamp) and one roll that pays the cost before it, so a heavy caster in armour gets a visible penalty instead of a hidden one.
Decision (proposed): adapt — keep the shape (armour penalty on casting, cost paid before the roll, miscast severity from level and failure), but replace the three-dice roll and the cubic with a single server roll on a simple table, because a turn-based curve is tuned for turns, not a fast mobile fight.
Acceptance: the cast tooltip shows the formula's failure figure (for example 4% for a level-5 spell with skill_power 5000, INT 20 and armour penalty 40); a server test with 10,000 seeded rolls lands within 1 point of that figure, a failed cast still spends its MP, and a level-5 spell at 100% failure deals 59 miscast units.

## 1. Mechanism

- A cast is one synchronous action. `cast_a_spell` pays the MP first (`spl-cast.cc` 1059-1061), then calls `your_spells` (1068). Inside `your_spells`, the caster's raw failure chance is computed (2400) and one roll is taken (2356). The roll is `random2avg(100, 3)`: it adds one `random2(100)` and two `random2(101)` and divides the sum by 3 with integer division (random.cc 341-346). A failure is recorded only when the roll is below the raw failure chance (2402-2403), and the fail value is `raw - roll`. The spell then runs with `force_failure || fail` (2410-2411), and a failure calls the miscast path.
- Order of steps for one cast: (a) MP spent, always, even on failure (1061); (b) raw failure computed from caster stats, spell level and armour (470-554); (c) roll (2356); (d) fail if roll < raw failure (2402); (e) on a fail, the miscast path runs; its damage comes from the formula at 2961-2971 and is zero unless `level x level x fail > 150` (2967).
- Raw failure: start at 60; subtract `skill_power x 6 / 100` (483); subtract `INT x 2` (484); add the armour and shield penalty (490); add a per-level table value (513); cap the chance at 400 (520); pass it through a cubic `(x^3 + 426x^2 + 82670x + 7245398) / 262144`, written in Horner form (537); clamp to 0-100 (554). Wizardry and some armour egos then scale the result by `6 / (7 + wizardry)` (419).
- Power: `skill_power` is the average discipline skill (scaled by 200) plus SpellCasting (scaled by 50) (455). Power = `skill_power x INT / 10` (572). Then a step-down: below 50000 (millis, see the x10 at 438) power is linear; above it grows as `50000 x log2(1 + x / 50000)` with a ceiling of 200000 (stepdown.cc 16, 19-50), then divided by 1000 and capped per spell (604-608).
- Tick: none. Crawl is turn-based. The spell-table layout comment (`spl-data.h` 11-21) lists level, power cap, range and noise. It has no cast-time field and no cooldown field. The action cost of a cast (action energy) was not read.

## 2. Key functions

- `raw_spell_fail`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/spl-cast.cc` 470-554. Failure chance before the roll.
- `_skill_power`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/spl-cast.cc` 443-456. Discipline skills averaged, plus SpellCasting.
- `calc_spell_power`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/spl-cast.cc` 565-615. INT scale, step-down, cap, then the diminished-spells (611-612) and claustrophobia (614-615) modifiers.
- `_stepdown_spellpower`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/spl-cast.cc` 435-441. Calls `stepdown_value(power x 10, 50000, 50000, 150000, 200000)` and divides by 1000.
- `your_spells` fail roll: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/spl-cast.cc` 2356-2412. The roll, the raw-fail comparison, the forced-failure argument.
- `spell_mana`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/spl-util.cc` 545-572. Cost = spell level, halved (rounded up) under Brilliance, 0 while enkindled.
- `max_miscast_damage`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/spl-cast.cc` 2961-2971.
- `stepdown.cc` 14-50 and `random2avg` (random.cc 339-347) are the helpers the above depend on.

## 3. Numbers vs mechanism

TABLE (name | effect | formula | number ranges | cost | cooldown/cast time | caps | file:line)

| name | effect | formula | number ranges | cost | cooldown / cast time | caps | file:line |
|---|---|---|---|---|---|---|---|
| Base failure | starting failure | 60 | fixed | 0 | none in data | none | spl-cast.cc:478 |
| Skill cut | better skill, lower failure | skill_power x 6 / 100 | skill_power 2500 (discipline 10 + SpellCasting 10) gives -150 | 0 | none | none | spl-cast.cc:483, 455 |
| INT cut | more INT, lower failure | INT x 2 | INT 10 gives -20; INT 40 gives -80 | 0 | none | none | spl-cast.cc:484 |
| Armour / shield | heavy armour raises failure | 19 x adjusted body + 19 x adjusted shield, divided by the scale of 100 | robe 0; heavy armour tens of points (donor comment "a midlevel melee character in plate might have 40 or 50") | 0 | none | max(...,0) | player.cc:2424; spl-cast.cc:490 |
| Level table | harder spells fail more | difficulty_by_level[level] | levels 0-9 add 0, 3, 15, 35, 70, 100, 150, 200, 260, 340 | 0 | none | level 0-9 | spl-cast.cc:511-513 |
| Clamp before the cubic | keeps the cubic in range | min(chance, 400) | cap 400 | 0 | none | 400 | spl-cast.cc:520 |
| Smoothing | maps chance to a smooth percent | (x^3 + 426x^2 + 82670x + 7245398) / 262144, then clamp | output 0-100 | 0 | none | 0-100 | spl-cast.cc:537, 554 |
| Wizardry | scales failure down | fail x 6 / (7 + wizardry) | wizardry 1 gives x 0.75 | 0 | none | none | spl-cast.cc:419 |
| Power | damage or effect strength | (skill_power x INT) / 10 | 2500 x 10 gives 25; 2500 x 20 gives 50; 5000 x 20 gives 79 (after step-down) | 0 | none | per-spell cap | spl-cast.cc:572, 604 |
| Step-down | diminishing returns on power | linear below 50000 (millis); above it 50000 x log2(1 + x / 50000), ceiling 200000 | knee at power 50 | 0 | none | ceiling 200 | spl-cast.cc:438; stepdown.cc:16 |
| Per-spell cap | hard max power | min(power, cap) | Magic Dart 25 (spl-data.h:45); Fireball 200 (spl-data.h:56) | 0 | none | per spell | spl-cast.cc:606-608 |
| MP cost | spell cost | cost = spell level | level 1-9 gives 1-9 MP; Brilliance: ceil(level / 2); enkindled: 0 | level | none | none | spl-util.cc:557 |
| Roll | the cast die | (random2(100) + random2(101) + random2(101)) / 3, integer | 0-100, centred near 50 | 0 | none | none | random.cc:341-346; spl-cast.cc:2356 |
| Failure | a cast fails | fail if roll < raw failure; fail value = raw - roll | raw 0 never fails; raw 100 always fails | MP still spent | none | none | spl-cast.cc:1061, 2402-2403 |
| Miscast gate | no miscast damage at low risk | damage 0 if level x level x fail <= 150 | threshold 150 | 0 | none | none | spl-cast.cc:2967; spl-miscast.h:14 |
| Miscast damage | damage on fail | ceil(level x (fail + level) / 9) | level 5 at fail 100 gives 59 | 0 | none | none | spl-cast.cc:2970; spl-miscast.h:11 |

Sample failure values, computed from these formulas by hand-checked integer arithmetic (not measured in game): L1, no skill, INT 10, no armour: 44%. L1, skill_power 2500, INT 10: 7%. L1, skill_power 2500, INT 20: 5%. L5, skill_power 5000, INT 20: 1%; same with armour penalty 40: 4%. L5, no skill, INT 10: 100%. L9, skill_power 5000, INT 30: 43%.

Which numbers suit a fast mobile fight: the 0-100 failure scale, MP cost = level, the per-spell cap and the 50-point knee for power are easy to read on a phone. The cubic and the three-dice roll are too fine for a fight that resolves in seconds; one die on the same table is enough. The armour term (19 per point) is the transferable number: it turns armour weight into a cast penalty without any new stat.

Caveat: this is turn-based. No cast time, no channel, no interrupt-by-hit was read here (`_spellcasting_aborted` at 1247 not read). Crawl gives no cooldown field in the spell table.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (MP spent, raw failure from stats, armour, level table, clamp, cubic, one roll, miscast only on failure) and the power step-down. It keeps the donor's cubic and three-dice roll on purpose, because the sketch shows the donor's shape; the Frankendom adaptation in section 5 would replace both with one die and a table. It drops the enkindled, wild-magic, subdued-magic, horror, claustrophobia, Vehumet, god-penance, wizardry-ego and spellmotor branches, the spell-specific miscast effects, the HP cost of some spells, and the `_do_cast` effect. It keeps the donor's integer truncation.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface CasterStats {
  intel: number;          // INT
  skillPower: number;     // donor units: average discipline skill x 200, plus SpellCasting x 50
  armourPenalty: number;  // body armour + shield penalty, integer points
}

const DIFFICULTY_BY_LEVEL = [0, 3, 15, 35, 70, 100, 150, 200, 260, 340]; // index = spell level

// Raw failure chance, 0..100, before the roll. Integer maths as in the donor.
export function rawFail(c: CasterStats, spellLevel: number): number {
  let chance = 60;
  chance -= Math.trunc((c.skillPower * 6) / 100);
  chance -= c.intel * 2;
  chance += c.armourPenalty;
  chance += DIFFICULTY_BY_LEVEL[spellLevel];
  chance = Math.min(chance, 400);
  // Smoothing cubic (x^3 + 426x^2 + 82670x + 7245398) / 262144, written in Horner form.
  const poly = Math.trunc((((chance + 426) * chance + 82670) * chance + 7245398) / 262144);
  return Math.min(Math.max(poly, 0), 100);
}

// Spell power: skill x INT / 10, then a log step-down above 50 (donor works in millis here), then the spell cap.
export function castPower(c: CasterStats, cap: number): number {
  const power = Math.trunc((c.skillPower * c.intel) / 10);
  const base = power * 10;
  const STEP = 50000;
  const CEILING = 200000;
  const stepped = base < STEP ? base : Math.min(STEP * Math.log2(1 + base / STEP), CEILING);
  const out = Math.trunc(Math.trunc(stepped) / 1000);
  return cap > 0 ? Math.min(out, cap) : out;
}

// Miscast damage: none below a threshold, else level x (fail + level) / 9, rounded up.
export function miscastDamage(spellLevel: number, fail: number): number {
  if (spellLevel * spellLevel * fail <= 150) return 0;
  return Math.ceil((spellLevel * (fail + spellLevel)) / 9);
}

// The roll: average of three dice (100, 101, 101) with integer division by 3, so it sits near 50.
// The cast fails only when the roll is below the raw failure chance.
export function failValue(fail: number, rand: (max: number) => number): number {
  const roll = Math.trunc((rand(100) + rand(101) + rand(101)) / 3);
  return roll < fail ? fail - roll : 0;
}

// Order of operations: MP is paid before the roll. A failed roll still spends the MP and triggers a miscast.
export function castSpell(
  mp: number,
  cost: number,
  c: CasterStats,
  spellLevel: number,
  rand: (max: number) => number,
): { mp: number; ok: boolean; miscast: number } {
  const after = mp - cost;
  const fail = rawFail(c, spellLevel);
  if (failValue(fail, rand) === 0) return { mp: after, ok: true, miscast: 0 };
  return { mp: after, ok: false, miscast: miscastDamage(spellLevel, fail) };
}

export {};
```

## 5. Lands in

- TARGET `src/fight/cast.ts` (new module, engine step): MP spend, raw failure, one server roll, miscast on fail. Also the armour penalty term is read from the hero's gear in `src/fight/` (not in the zone data). Spell caps and costs are per-spell data.
- Parity-checklist row 13 (specials). Cast outcomes are server-verified like hits.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: one engine (the MP spend and the roll are server-owned, in the engine); server-verified outcomes; clean-room only

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, not translated from the donor.
- Turn-based: the donor has no cast time, channel or cooldown. Frankendom needs a cast-time and a global cooldown shared with melee specials (row 13); the donor gives no model for that. Not read: `_spellcasting_aborted` (1247), so interrupt-by-hit and move rules are unknown here.
- The donor gates the roll on Sif Muna penance (`one_chance_in(20)`) and Vehumet / Kikubaaqudgha penance. These are god rules and do not transfer.
- Against the one-ledger ruling: MP is spent before the roll and kept on a fail. Frankendom must pick one order and test it. The donor's order is a clear choice, so keep it.
- Against server-verified outcomes: the donor rolls in the caster's own process. Frankendom must roll on the server and send the result; the client shows the failure figure only.
- Against zones as data: the level table, the 60 base, the 19-per-armour term, the 400 clamp and the 150/9 miscast constants are fixed engine rules (`where: engine constant`). The power cap and cost are per-spell data.
- Defects found: none. The donor uses integer division throughout. The cubic is documented as a fit to an older breakpoint curve and the comment says it was "tweaked slightly", so its values are a fit and should be re-tuned, not trusted as a law.
- Reject candidates considered: the three-dice roll (too fine for a fast fight) and the cubic (too opaque for a designer).

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: one engine; server-verified outcomes; clean-room only (GPL). Parity row 13.
