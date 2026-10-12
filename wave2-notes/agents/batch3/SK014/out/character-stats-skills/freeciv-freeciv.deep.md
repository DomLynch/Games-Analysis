# freeciv-freeciv (character-stats-skills, cell 1)

Donor: `/mnt/frankendom-donors/freeciv-freeciv/` (data/civ2civ3/units.ruleset `[veteran_system]` and `[unit_warriors]`; common/combat.c; common/unittype.c; common/movement.c; server/unittools.c; server/unithand.c) | Licence: GPL-2.0 (COPYING is GNU GPL version 2, June 1991; combat.c header is the Freeciv GPL notice, read lines 1-3 only) | C + ruleset data | symbol `maybe_become_veteran_real` / `combat_veterans` / `unit_versus_unit`

Checked: opened and read the veteran path end to end: the ruleset table (units.ruleset 73-91, 266-267, 316, 668-686), the level loader (unittype.c 2722-2740), attack/defence/move power (combat.c 530-640), the win-chance closed form (combat.c 334-372), the round loop and odds (unittools.c 293-345), the veteran raise and gate (unittools.c 239-280, 406-420) and the call site (unithand.c 5040-5095, partly). win_chance was read to line 372 only (its end was not read). Confidence high for the veteran ladder and the round loop. Not read: the EFT_VETERAN_COMBAT, EFT_COMBAT_ROUNDS and EFT_ATTACK_BONUS values in the effects rulesets, the terrain class-flag check before combat.c 601, the diplomat/spy veteran branch (server/diplomats.c, only grep lines seen), and the `Killed`-side handling. Donor has no `.git` directory, so history is ChangeLog only. camera_scope: n/a (not a camera topic).

## 1. Mechanism

- Each unit type has a veteran system, and the default ladder is four levels in civ2civ3: green, veteran, hardened, elite (units.ruleset 75). Each rank is one column across five parallel arrays (names, power %, move bonus, combat raise %, work raise %). Per-level values are data, not code (units.ruleset 75-91).
- Derived power: attack = base attack x level power % / 100 (combat.c 561-562); defence = base defence x level power % / 100 (combat.c 585-586), then a terrain bonus for classes with the terrain flag (combat.c 601-602).
- Tired attack: if the game flag is on and the unit has less than one full move, attack power is scaled by moves left / one move (combat.c 534, 564-565).
- Attack bonus effects multiply attack as a percentage: `mod = 100 + effects`, result `attackpower * mod / 100` (combat.c 626, 637). The effect values are not read.
- Fight, in order (unittools.c 293-345): (a) attack and defence power are computed; (b) strength = power x hp x firepower for each side (320); (c) odds % for the attacker = 100 x defender strength x 2 / (sum of both strengths), so 100 at equal strength and above 100 against a stronger foe (326); (d) round loop, capped by the EFT_COMBAT_ROUNDS effect when it is above 0 (334): the attacker wins a round when the roll `fc_rand(attack + defence)` is at least the defence power (339), which is probability attack / (attack + defence); the round winner removes the other side's firepower in HP (340); (e) HP is clamped at zero (after the loop).
- Veterancy, after the fight (unithand.c 5094 calls combat_veterans, unittools.c 406-420): skipped when the fight was powerless and the only-real-fight flag is set (409); skipped when only-killing is set and nobody died; when the odds-scaled flag is off, both odds are forced to 100 (412-413). Each surviving side then rolls `maybe_make_veteran(side, odds)` (417 for the attacker).
- The raise roll (unittools.c 239-280): no raise at the top level, and none unless the ruleset's ACTION_GAIN_VETERANCY enabler allows it for that unit (both tested together at 256: `veteran + 1 >= levels || !is_action_enabled_unit_on_self(ACTION_GAIN_VETERANCY)`); mod = odds + EFT_VETERAN_COMBAT effect (260); chance = base raise % x mod / 100 (265); `fc_rand(100) < chance` raises the level by one (275-276).
- Move rate: type move rate + level move bonus (movement.c 61); for damage-slowed classes the rate is scaled by hp / max hp (64-66).
- Readout: `win_chance` gives the closed-form win chance (combat.c 334-372), and the client shows it as a percent (clientutils.c 326).

## 2. Key functions

- `base_get_attack_power`: `/mnt/frankendom-donors/freeciv-freeciv/common/combat.c` 550-569 (power = attack x POWER_FACTOR x level %; tired-attack scaling at 564-565).
- `base_get_defense_power`: `/mnt/frankendom-donors/freeciv-freeciv/common/combat.c` 574-587 (defence x level %).
- `get_defense_power` (terrain): `/mnt/frankendom-donors/freeciv-freeciv/common/combat.c` 594-608 (terrain multiply at 601-602).
- `win_chance`: `/mnt/frankendom-donors/freeciv-freeciv/common/combat.c` 334 onward (read to 372, end not read; closed form, per-round loss probability at 340).
- `unit_versus_unit`: `/mnt/frankendom-donors/freeciv-freeciv/server/unittools.c` 293-352 (strengths, odds, round loop, HP clamp).
- `maybe_become_veteran_real`: `/mnt/frankendom-donors/freeciv-freeciv/server/unittools.c` 239-280 (gate, raise roll).
- `combat_veterans`: `/mnt/frankendom-donors/freeciv-freeciv/server/unittools.c` 406-421 (flags and odds forcing).
- `utype_move_rate`: `/mnt/frankendom-donors/freeciv-freeciv/common/movement.c` 47-70.
- `veteran_system_definition` (loader): `/mnt/frankendom-donors/freeciv-freeciv/common/unittype.c` 2722-2740.
- Call site: `/mnt/frankendom-donors/freeciv-freeciv/server/unithand.c` 5080-5094 (`unit_versus_unit` then `combat_veterans`).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Rank ladder as one data table: each rank carries a power multiplier, a move bonus and a raise chance | 4 ranks: power 100/150/175/200, combat raise 50/33/20/0, work raise 3/2/1/0, move bonus 0 (units.ruleset 75-91) |
| Rank-up after a fight is a roll whose chance is scaled by the odds of that fight | Odds % = 100 x foe strength x 2 / (own + foe strength) (unittools.c 326 attacker, 327 defender: each side's odds use the other side's strength); base raise x odds / 100 (265) |
| Round win chance = own power / (own + foe power); the round loser loses the other side's firepower | Firepower per won round (ruleset 'firepower', Warriors 1) |
| Top rank is a hard stop; raises are also data-gated | Elite raise chance is 0 in the ruleset, and the code returns at the top level (256); the same test also needs the ACTION_GAIN_VETERANCY enabler (ruleset data) to be true |
| Move slows as HP falls (only for damage-slowed classes) | Scale = hp / max hp (movement.c 66) |

### Stat and skill rows (SK table, donor numbers)

Skills are TABLE-DRIVEN: yes. The veteran ladder is a parallel-array table in `[veteran_system]`, and each unit type is a `[unit_*]` row. More copies of the `veteran_*` keys appear at units.ruleset 650, 2285, 2446 and 2575 (grep lines only; they are per-unit overrides or sub-tables, not read in full). Freeciv has no character stats, no XP, no mana and no skill tree; the only progression is the veteran rank.

| name | what it does | formula | number ranges (donor) | caps | file:line |
|---|---|---|---|---|---|
| veteran level | rank of one unit (skill tier) | index into the ladder | 0..3 (civ2civ3); the doc allows up to 20 levels | no raise at the top level | units.ruleset 73-75; unittools.c 256 |
| power % | multiplies attack and defence | base x pct / 100 | 100, 150, 175, 200 | none | units.ruleset 86; combat.c 561-562, 585-586 |
| combat raise % | chance to gain the next rank after a fight | base % x (odds % + effect) / 100 | 50, 33, 20, 0 | 0 at elite | units.ruleset 78; unittools.c 260, 265 |
| work raise % | chance per turn of useful work (settlers, engineers), not in fights | base % x mod / 100 | 3, 2, 1, 0 | 0 at elite | units.ruleset 82; unittools.c 269 (grep line only, not read in full) |
| move bonus | extra moves per rank | move_rate + bonus | 0 in all four ranks (civ2civ3) | none | units.ruleset 91; movement.c 61 |
| odds % | pre-fight strength ratio used for the raise | 100 x foe x 2 / (own + foe) | 100 at equal strength; above 100 vs stronger foe | none (no zero guard in the donor) | unittools.c 320, 326 |
| round win chance | chance a round goes to the attacker | own power / (own + foe) | 0..1 | none | unittools.c 339 |
| firepower | HP removed per won round | ruleset `firepower` | Warriors 1 (units.ruleset 684); "at least 1" (267) | min 1 | units.ruleset 267, 684 |
| hitpoints | HP pool of a unit type | ruleset `hitpoints` | Warriors 10 (units.ruleset 683) | none | units.ruleset 266, 683 |
| attack / defence | base power of a unit type | ruleset `attack`, `defense` | Warriors 1 / 1 (units.ruleset 681-682) | none | units.ruleset 681-682 |
| tired attack | attack power under one move | power x moves / one move | on when game flag set | flag | combat.c 534, 564-565 |
| attack bonus effects | percent bonus on attack | 100 + effects, then x / 100 | effect-defined (not read) | effect-defined | combat.c 626, 637 |
| terrain defence | percent bonus on defence | 100 + terrain defense bonus | terrain ruleset (not read) | class flag | combat.c 601-602 |
| damage-slow move | move scales with HP | move x hp / max hp | 0..1 | class flag | movement.c 64-66 |
| win-chance readout | percent shown to the player | closed form (win_chance) | 0..100 | none | combat.c 334-340; clientutils.c 326 |
| magic / mana / spells / schools / resistances | none in this donor | n/a | n/a | n/a | not present (checked units and combat files) |
| luck | none (only `fc_rand`) | n/a | n/a | n/a | not present |
| strength, dexterity, endurance, intelligence | none; no character attributes | n/a | n/a | n/a | not present |
| stamina, poise, stagger, bleed, hit location, armour pieces | none | n/a | n/a | n/a | not present |
| XP, skill decay, talents, respec | none; rank is a dice roll per fight | n/a | n/a | n/a | not present |

As-data shape: the ladder is `[veteran_system]` in data/civ2civ3/units.ruleset (lines 73-91), with five parallel arrays (names, base raise, work raise, power, move bonus), each of the same length. Unit type row fields (Warriors block 668-686): name (string), class (string), obsolete_by (string), graphic (string), sound_move (string), sound_fight (string), build_cost (int), pop_cost (int), attack (int), defense (int), hitpoints (int), firepower (int), move_rate (int), vision_radius_sq (int), transport_cap (int), fuel (int), uk_happy (int), uk_shield (int), plus optional veteran_* overrides. A new unit type is one row: yes (a new `[unit_*]` section). A new veteran rank: no, it is one edit to five parallel arrays of equal length (units.ruleset 75-91, doc at 313-320), not one row.

Provenance per claim: repo `freeciv-freeciv`, licence GPL-2.0 (COPYING). Every claim above cites the file and line in the receipts (receipts.tsv, 49 rows, verified). Licence class: copyleft, so shape only.

What they patched later (ChangeLog only, no git): ChangeLog 2452 "Fix combat veterancy chance"; ChangeLog 51359 "Add support for combat veterancy chance being relative to the challenge" (odds scaling added, controlled by a ruleset setting); ChangeLog 51850 "Killing defenseless units will not grant veterancy any more."; ChangeLog 52500 "Add only_real_fight_makes_veteran ruleset setting". Hidden rule: a kill on a defenceless unit does not grant rank any more (ChangeLog 51850); the ruleset switch that gates this is `only_real_fight_makes_veteran` (unittools.c 409).

Best transferable idea: store a rank ladder as one data table (power %, move bonus, raise chance per rank) and roll the rank-up after each fight with a chance scaled by the odds of that fight.
Decision (proposed): adapt - keep the data ladder and the odds-scaled raise, rewrite the round loop for real-time hits with server-seeded rolls, because the donor is turn-based and GPL.
Acceptance: after a duel against a stronger foe, the winner's rank-up chance on the fight record is above the base rate; a server test asserts the top rank never rises and a below-odds fight never raises above base.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (power, round loop, odds from pre-fight strengths, then veterancy with the same two gates). It omits the POWER_FACTOR integer scaling (floats instead), the terrain class-flag check (terrain applies to every defender), the EFT_ATTACK_BONUS, EFT_VETERAN_COMBAT and EFT_COMBAT_ROUNDS effect lookups (the combat round cap is a parameter, the effect bonus is passed as 0), the fortify and non-native defence terms, the diplomat branch, the damage-slowed move rule's class flag (it is a flag here), and the end-of-turn work raise. Fix: the donor's odds line (unittools.c 326) has no zero guard; the sketch returns 100 when both strengths are zero.

```ts
// Licence: GPL-2.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Target: src/fight/veterancy.ts (proposed). Parity row 21 (catalogue fields).

export {};

// One row per veteran level. The donor keeps these as parallel arrays in [veteran_system].
interface VeteranLevel {
  name: string;
  powerPct: number;      // attack and defence multiplier, percent
  moveBonus: number;     // extra moves, in the ruleset's fractional units
  baseRaisePct: number;  // chance to gain the next level after a fight, percent
  workRaisePct: number;  // chance per turn of useful work, percent (not used in fights)
}

const LADDER: VeteranLevel[] = [
  { name: "green", powerPct: 100, moveBonus: 0, baseRaisePct: 50, workRaisePct: 3 },
  { name: "veteran", powerPct: 150, moveBonus: 0, baseRaisePct: 33, workRaisePct: 2 },
  { name: "hardened", powerPct: 175, moveBonus: 0, baseRaisePct: 20, workRaisePct: 1 },
  { name: "elite", powerPct: 200, moveBonus: 0, baseRaisePct: 0, workRaisePct: 0 },
];

interface Unit {
  attack: number;
  defense: number;
  hp: number;
  maxHp: number;
  firepower: number;   // HP removed from the other side per won round
  moveRate: number;
  moves: number;
  level: number;       // index into LADDER
  damageSlows: boolean;
}

interface VetRules {
  oddsScaled: boolean;     // combat_odds_scaled_veterancy
  onlyRealFight: boolean;  // only_real_fight_makes_veteran
  onlyKilling: boolean;    // only_killing_makes_veteran
}

// Attack power: base attack x level power factor. A tired attack (under one move) scales by moves left.
function attackPower(u: Unit, tiredAttacks: boolean): number {
  let p = u.attack * LADDER[u.level].powerPct / 100;
  if (tiredAttacks && u.moves < 1) {
    p = p * u.moves;
  }
  return p;
}

// Defence power: base defence x level power factor. Terrain bonus is passed in as a percent.
function defencePower(u: Unit, terrainBonusPct: number): number {
  return u.defense * LADDER[u.level].powerPct / 100 * (100 + terrainBonusPct) / 100;
}

// Round loop: each round the attacker wins with probability attack / (attack + defence).
// The winner of a round removes the other side's firepower in HP.
function resolveFight(a: Unit, d: Unit, rng: () => number, maxRounds: number):
    { aHp: number; dHp: number; rounds: number } {
  const att = attackPower(a, true);
  const def = defencePower(d, 0);
  let aHp = a.hp;
  let dHp = d.hp;
  let rounds = 0;
  while (aHp > 0 && dHp > 0 && (maxRounds <= 0 || rounds < maxRounds)) {
    if (rng() * (att + def) >= def) {
      dHp -= a.firepower;
    } else {
      aHp -= d.firepower;
    }
    rounds++;
  }
  return { aHp: Math.max(0, aHp), dHp: Math.max(0, dHp), rounds };
}

// Odds percent from the pre-fight strength ratio, for either side of ONE fight (donor unittools.c 320-327):
// att_strength = attack power x attacker hp x attacker firepower; def_strength = defence power x defender hp x defender firepower.
// attacker odds = 100 x def_strength x 2 / sum; defender odds = 100 x att_strength x 2 / sum. 100 at equal strength.
// Fix: the donor divides here with no zero guard; this sketch returns 100 when both strengths are zero.
function oddsPct(a: Unit, d: Unit, forAttacker: boolean): number {
  const attStrength = attackPower(a, false) * a.hp * a.firepower;
  const defStrength = defencePower(d, 0) * d.hp * d.firepower;
  if (attStrength + defStrength === 0) {
    return 100;
  }
  return forAttacker
    ? 100 * defStrength * 2 / (attStrength + defStrength)
    : 100 * attStrength * 2 / (attStrength + defStrength);
}

// Raise after a fight: chance = base raise % x (odds % + effect bonus) / 100. Never past the top level.
function maybeRaise(u: Unit, oddsPctValue: number, effectBonusPct: number, rng: () => number): boolean {
  if (u.level + 1 >= LADDER.length) {
    return false;
  }
  const mod = oddsPctValue + effectBonusPct;
  const chance = LADDER[u.level].baseRaisePct * mod / 100;
  if (rng() * 100 < chance) {
    u.level++;
    return true;
  }
  return false;
}

// Settle veterancy for both sides after a fight, with the same gates as the donor.
function settleVeterancy(a: Unit, d: Unit, aHp: number, dHp: number,
                         aOdds: number, dOdds: number, powerless: boolean,
                         rules: VetRules, rng: () => number): void {
  if (powerless && rules.onlyRealFight) {
    return;
  }
  if (aHp > 0 && dHp > 0 && rules.onlyKilling) {
    return;
  }
  const useA = rules.oddsScaled ? aOdds : 100;
  const useD = rules.oddsScaled ? dOdds : 100;
  if (aHp > 0) {
    maybeRaise(a, useA, 0, rng);
  }
  if (dHp > 0) {
    maybeRaise(d, useD, 0, rng);
  }
}

// Move rate: type move rate plus level move bonus; damage-slowed classes scale by hp / max hp.
function moveRate(u: Unit): number {
  let m = u.moveRate + LADDER[u.level].moveBonus;
  if (u.damageSlows) {
    m = m * u.hp / u.maxHp;
  }
  return m;
}

// Usage check (not a test): a green Warriors-like unit against an elite defender.
const att: Unit = { attack: 1, defense: 1, hp: 10, maxHp: 10, firepower: 1, moveRate: 1, moves: 1, level: 0, damageSlows: false };
const def: Unit = { attack: 1, defense: 1, hp: 10, maxHp: 10, firepower: 1, moveRate: 1, moves: 1, level: 3, damageSlows: false };
const fight = resolveFight(att, def, Math.random, 0);
void fight;
void moveRate(att);
```

## 5. Lands in

- TARGET `src/fight/veterancy.ts` (proposed new module). Ladder rows are catalogue data; the odds-scaled raise and the round loop are engine logic (one engine, rule 1). Parity-checklist row 21 (catalogue fields). Its fight record hook is row 19 (replay), so the round rolls must be server-seeded and written to the record.
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only, shape only)
- Brief rule served: 1 (one engine: the rank ladder and the odds rule live in the engine, values are data); parity row 21.

## 6. Gaps and risks

- Turn-based donor: the donor resolves a whole combat in one call per attack and rolls veterancy once per fight. Frankendom's duel is a per-hit stream with a state change per hit. The round loop must become a per-hit step and the raise must be decided once at fight end on the server.
- Kills are server-verified in Frankendom, but the donor's raise rolls use the global `fc_rand` inside the server routine, with no record of the roll. Frankendom must seed the roll and write the result (raise or not) into the fight record (row 19), so a replay gives the same rank.
- One ledger: the rank change must be written to the character's single record, not a client badge. The donor has no ledger rule.
- Many-on-one: the donor resolves one attacker against one defender. With MAX_ATTACKERS = 3, the odds for each attacker must be taken against the defender's pre-fight strength, and the rule for who gets the raise when three attack must be decided. Not in the donor; a gap.
- Integer math: the donor uses integer division (unittools.c 320-326; combat.c 562). The odds and the raise chance must be integer-only in TypeScript for determinism across client and server.
- Power % stacks on attack and on defence; with three attackers and a stacked elite, the ratio can run away. Clamp the odds (for example to 0..200) and test it, the donor has no such clamp.
- Not read: the effect values for EFT_VETERAN_COMBAT, EFT_COMBAT_ROUNDS, EFT_ATTACK_BONUS (so the stock bonus sizes are unknown); the terrain class flag; the diplomat branch.

## Reuse tag and rulings for Dom (max 3)

1. Should Frankendom rank-ups come from wins against stronger foes (odds-scaled, like the donor) or only from kills? Recommendation: odds-scaled, and no rank from a free kill on a helpless target.
2. Start with four ranks at 100/150/175/200 percent power and 50/33/20/0 percent raise? Recommendation: yes, tune in playtests and keep the values as catalogue rows.
3. Does the rank power multiplier apply to both attack and defence? Recommendation: yes (the donor does), with the odds clamp from section 6.

Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
Brief rule served: 1 (one engine); parity row 21 (catalogue fields)


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR.
- Sketch oddsPct(self, foe) always used self attack and foe defence, so the defender's odds (donor def_vet, unittools.c 327) came out wrong; fixed with a side flag.
- Gate at unittools.c 256 omitted its second condition, is_action_enabled_unit_on_self(ACTION_GAIN_VETERANCY); added, so all raises are ruleset-enabler gated (data-driven).
- All other numbers held (ladder, raise, work, round roll, odds formula, ChangeLog lines, GPL-2).
- Missed (added): the enabler gates every raise; win_chance guards zero strength, the odds line has no guard (note already says so).

Fixed 2026-10-12: gate description (section 1, section 3 table), odds line for the defender, and the TypeScript sketch oddsPct (now takes attacker, defender and a side flag), in both the note and work/freeciv-freeciv-veterancy.ts.
