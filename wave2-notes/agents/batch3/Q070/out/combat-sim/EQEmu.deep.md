# EQEmu (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/EQEmu/zone/attack.cpp` (with `common/random.h`, `zone/mob.h`; the hint file `utils/combat-sim/app.js` is a histogram visualiser of `Mob::RollD20` and is read in full) | Licence: GPL version 3 or any later version (`zone/attack.cpp` header lines 7-8; repo `LICENSE.md` is the GPL version 3 text) | C++ (with a JS visualiser) | symbol `Mob::DoAttack`

Checked: The list's hint (`utils/combat-sim/index.html` and `app.js`) is a visualiser: it draws a 20-bucket histogram of the index that `Mob::RollD20` computes, and nothing else. The real mechanism is in `zone/attack.cpp`. Read: 170-200 (`GetTotalToHit`, partial), 300-327 (`GetTotalDefense`), 329-368 (`CheckHitChance`), 370-680 (`AvoidDamage`: riposte, block, parry, dodge, shield and two-hand block; the immunity and enrage conditions only in part), 1036-1058 (`RollD20`), 1060-1108 (`MeleeMitigation`), 1474-1563 (`DoAttack`), 5351-5362 and 5429-5492 (`TryCriticalHit` start and the melee crit), 6347-6430 (`CommonOutgoingHitSuccess`, from 6405), `common/random.h` 60-110 (`Roll`, `Roll0`). Not read: `Int` (range taken as inclusive from its use), `GetMitigationAC` source (`ACSum`), `compute_tohit`, `compute_defense`, `GetCriticalChanceBonus`, `GetCritDmgMod`, `ApplyDamageTable`, `DoRiposte`, the slay-undead damage body, `TryFinishingBlow`, deadly strike, the NPC stun block (from 1512), the pet crit branch. Callers: `DoAttack` is called from `Mob::Attack` (1715) and `NPC::Attack` (2377); I read the `Mob::Attack` call site only in grep. Confidence high on the order of operations and the melee numbers; medium on skill and stat inputs. Depth is thin because those inputs are not read. Camera: not applicable.

## 1. Mechanism

- One melee swing resolves in `Mob::DoAttack` (attack.cpp 1474-1563), in this order. The first step that succeeds decides the swing.
  - (a) Avoidance ladder, `other->AvoidDamage(this, hit)` (1488). `InFront` is computed from the attacker's position (417). The checks run in this order and stop at the first success (the comment block right after the function header states the same order): riposte (from 489; needs a weapon or fists, front, and no immunity), block, which also has a separate roll for blocking from the rear (531-534, gate at 536), parry (from 564; front and not ranged), dodge (from 591; front or monk), shield block (from 618), two-hand blunt block (from 630, read to 644). A success sets `damage_done` to a negative code and returns true.
  - (a1) Strikethrough (1489-1501). If the attacker has a strikethrough bonus and it rolls, a message is shown and `damage_done = 1` (1499), which lets the swing continue to the hit test. If the strikethrough roll fails and the avoidance code is a riposte, `DoRiposte` runs and the swing returns (`DoRiposte` not read). A successful strikethrough overwrites the riposte code with 1 first, so the riposte is skipped.
  - (b) Hit test (1510-1511), only when `damage_done >= 0`. `CheckHitChance` (329-368): avoidance = `GetTotalDefense()` (349); accuracy = `hit.tohit` (353); a defender that is a sitting client, bot or mercenary is always hit before any roll (345-347); an avoidance of -1 (auto avoid) returns a miss (349-351), checked before the accuracy test; an accuracy of -1 is an automatic hit (353-355, read). Otherwise `tohit_roll = Roll0(accuracy)` (360) and `avoid_roll = Roll0(avoidance)` (361); if they are equal, a coin flip `Roll(50)` (365-366); else hit if `tohit_roll > avoid_roll` (367). A miss sets damage to 0 (1544-1545).
  - (c) Stun from behind (from 1512, not read in full). An NPC behind a client with a level of at least 5 and a non-zero animation may stun, after `Roll(RuleI(Combat, StunChance))` and the stun resists.
  - (d) Mitigation, `other->MeleeMitigation(this, hit, opts)` (1536), in `Mob::MeleeMitigation` (1060-1108): if damage is negative or base is zero it returns (1071). `mitigation = GetMitigationAC()` (1075; cached total, source not read). Client against client: `mitigation * 80 / 100` (1076-1077). Armour penetration: `mitigation *= (1 - armor_pen_percent)` (1080) and `-= armor_pen_flat` (1081). Then `roll = RollD20(offense, mitigation)` (1084). Level gap: if the rule `LevelDifferenceRollCheck` is non-negative and `attacker level - defender level` is above it, `roll += LevelDifferenceRollBonus`, capped at 2.0 (1087-1096); below its negative, `roll -=` the bonus, floored at 0.1 (1098-1101). Damage is `max(int(roll * base + 0.5), 1)` (1107).
  - (e) Outgoing success (1537-1539): `ApplyDamageTable` and `CommonOutgoingHitSuccess` run only when damage is still positive.
- `CommonOutgoingHitSuccess` (6347): the melee damage mods are applied (6420), then the minimum-damage mod (SPA 186), then `TryCriticalHit` (6425), and only then `hit.damage_done += hit.min_damage` (6427). So the crit multiplies the mitigated damage, and the weapon's minimum is added after the crit.
- `RollD20(offense, mitigation)` (1036-1058) is the core ratio roll. Let `atk = Roll0(offense + 5)` (1049) and `def = Roll0(mitigation + 5)` (1050). `avg = max(1, (offense + mitigation + 10) / 2)` (1052). `index = max(0, (atk - def) + avg / 2)` (1053). `index = Clamp(index * 20 / avg, 0, 19)` (1055). Return `mods[index]`, where the table is 0.1, 0.2, ... 2.0 (1038-1040, read). A sitting client is given `mods[19]` (1045-1046).
- Random helpers (`common/random.h`): `Roll(n)` is `Int(0, 99) < n` (75), a percent check with n of 100 or more always true; `Roll0(max)` is `Int(0, max - 1)` when `max - 1 > 0`, else 0 (89).
- Crit, `TryCriticalHit` (5351): skipped when damage is below 1 (5362). Pets and swarm pets take a separate branch (not read). Slay undead runs first when the body type is undead (read in part, after the pet and NPC gates). Melee crit (5429-5492): `crit_chance = GetCriticalChanceBonus(skill)` (5434). Innate crit for warriors and berserkers at level 12 or more, rangers in archery and rogues in throwing at level 12 or more (5435-5440). If innate or a chance bonus exists (5444): `roll = Int(1, difficulty)` (5455); `dex_bonus = DEX`, and above 255 it becomes `255 + (dex - 255) / 5` (5456-5459); `+= 45` (5462); if not innate (or a berserker throwing), `dex_bonus = dex_bonus * 3 / 5` (5465-5466); `dex_bonus += dex_bonus * crit_chance / 100` (5469-5470). Success is `roll < dex_bonus` (5474). A finishing blow is checked first (not read). Then `damage = max(damage, base) + 5` (5481), `crit_mod = 170 + GetCritDmgMod(skill)` floored at 100 (5483-5486), `damage = damage * crit_mod / 100` (5489). Deadly strike follows (not read).
- Avoidance and accuracy inputs. `GetTotalToHit` (170-200): `accuracy = compute_tohit(skill) + 10` (176), times a chance modifier if positive, then `* 121 / 100` (182), plus the flat hit-chance item bonus, and a percent bonus (read in part). `GetTotalDefense` (301-326): `avoidance = compute_defense() + 10` (303), an AC-avoidance percent, then the evasion percent `avoidance * (100 + evasion) / 100` (321). An evasion bonus of 10000 or more returns -1 (automatic avoid).
- Avoidance chances, each read as a percent check. Chance is `(skill + 100)`, plus a bonus percent `chance * bonus / 100` (the sum of aa, spell and item bonuses), then divided by a skill divisor, then plus the heroic stat term minus the attacker's strikethrough (cancelled up to the term's value). Divisors: riposte 50 (504), block 25 (547), parry 45 (574), dodge 45 (601). Heroic term: DEX/25 for riposte, block and parry (505, 548, 575); AGI/25 for dodge. Counter and modify percentages from the attacker's special abilities adjust each chance (read).

## 2. Key functions

- `Mob::DoAttack`: `/mnt/frankendom-donors/EQEmu/zone/attack.cpp` 1474-1563. Read in full.
- `Mob::AvoidDamage`: `attack.cpp` 370-680. Read in full (the immunity rule switch at 473 and the enrage branch are read; the rule's live and legacy behaviour is described from the donor comment only).
- `Mob::CheckHitChance`: `attack.cpp` 329-368. Read in full.
- `Mob::GetTotalDefense` and `GetTotalToHit`: `attack.cpp` 301-326 and 170-200. Read in part (inputs not read).
- `Mob::MeleeMitigation`: `attack.cpp` 1060-1108. Read in full.
- `Mob::RollD20`: `attack.cpp` 1036-1058. Read in full.
- `Mob::TryCriticalHit` (melee crit): `attack.cpp` 5429-5492. Read in full.
- `Mob::CommonOutgoingHitSuccess`: `attack.cpp` 6347-6430. Read from 6405.
- Visualiser (hint file): `utils/combat-sim/app.js` 80-113 and `index.html` read in full. It repeats the RollD20 index path (uniform offense and mitigation draws, `avg/2`, scale to 20, clamp) and counts buckets. It has no avoidance, hit, mitigation ratio or crit.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Offense against mitigation as a 20-step ratio table, 0.1 to 2.0 | Table 0.1..2.0 (theirs, attack.cpp 1038-1040); draws `Roll0(offense + 5)` and `Roll0(mitigation + 5)` (1049-1050) |
| Damage is base times ratio, rounded, never below 1 | `+ 0.5` rounding and min 1 (theirs, 1107) |
| Level gap shifts the ratio by a fixed bonus, capped at 2.0 and floored at 0.1 | `LevelDifferenceRollBonus`, `LevelDifferenceRollCheck` rule values (theirs, 1090-1101) |
| PvP mitigation at 80 percent | `* 80 / 100` (theirs, 1077) |
| Avoidance ladder, first success wins | Divisors 50 / 25 / 45 / 45 (theirs, 504, 547, 574, 601); base skill + 100 (502, 545, 572, 599) |
| Accuracy and avoidance as two uniform draws, tie is a coin | `Roll0(accuracy)`, `Roll0(avoidance)`, `Roll(50)` (theirs, 360-366) |
| Crit die vs a DEX threshold | Threshold `dex + 45` (theirs, 5462); above 255 counts one fifth (5459); non-innate `* 3 / 5` (5466) |
| Crit multiplier | `170 + crit dmg mod`, floor 100 (theirs, 5483-5486) |
| Random helper | `Roll(n)` is percent (theirs, random.h 75) |

## 4. TypeScript sketch

simplified: the sketch keeps the order of `DoAttack` (avoidance ladder, hit test, mitigation ratio, crit die, minimum damage added last) and the numbers of the ratio roll, the hit test, the crit threshold and multiplier. It omits: shield block and two-hand blunt block (the last two rungs of the donor ladder, 618 and 630), the sitting-defender auto-hit (345-347), the strikethrough override (a roll that lets an avoided swing reach the hit test, and that also cancels a riposte), the riposte immunity rule and the riposte-from-riposte flag, the stun from behind, the parry's weapon-hand check, class, skill and stat inputs (the chances are passed in as final values; `avoidChance` is the formula helper, and the sketch does not call it), the level-gap roll bonus, the PvP 80 percent and armour penetration, slay undead, finishing blow and deadly strike, and the pet branch. The `roll` helper skips the draw when the chance is zero or below, where the donor always draws, so the random sequence differs but the probabilities do not. The crit die is rolled only when the swing has an innate crit or a non-zero crit-chance bonus (attack.cpp 5444), as in the donor. The sketch takes `max(1, x)` for the two `Roll0` arguments, where the donor returns 0 for values of 1 or less. The random source is a parameter, so a seeded run replays.

```ts
// Licence: GPL-3.0-or-later (donor). Clean-room sketch written from the described mechanism; not a translation of the donor lines.
export type Rng = (n: number) => number; // integer in [0, n)

// Percent check: true with probability chance/100 (Roll(x) taken as a percent check).
const roll = (rng: Rng, chance: number): boolean => chance > 0 && rng(100) < chance;

// Ratio roll: offense against mitigation gives a multiplier from 0.1 to 2.0 in steps of 0.1.
export function rollRatio(offense: number, mitigation: number, rng: Rng): number {
  const atk = rng(offense + 5);
  const def = rng(mitigation + 5);
  const avg = Math.max(1, Math.floor((offense + mitigation + 10) / 2));
  let index = Math.max(0, (atk - def) + Math.floor(avg / 2));
  index = Math.min(Math.max(Math.floor((index * 20) / avg), 0), 19);
  return (index + 1) / 10;
}

// Hit test: accuracy against avoidance, one roll each; a tie is a coin flip. (Sitting-defender auto-hit not modelled.)
export function hitLands(accuracy: number, avoidance: number, rng: Rng): boolean {
  if (avoidance === -1) return false; // auto avoid, checked first (donor 349-351)
  if (accuracy === -1) return true;
  const t = rng(Math.max(1, accuracy));
  const a = rng(Math.max(1, avoidance));
  if (t === a) return rng(100) < 50;
  return t > a;
}

// One avoidance chance: skill plus 100, scaled by bonus percent, divided by a per-skill divisor,
// then a heroic stat term less the attacker's strikethrough (never below zero from the stat).
export function avoidChance(skill: number, bonusPct: number, divisor: number, heroic: number, strikethrough: number): number {
  let chance = skill + 100;
  chance += Math.floor((chance * bonusPct) / 100);
  chance = Math.floor(chance / divisor);
  return chance + heroic - Math.min(strikethrough, heroic);
}

export interface Defender {
  inFront: boolean;
  canRiposte: boolean; riposteChance: number;   // divisor 50
  canBlock: boolean;   blockChance: number;     // divisor 25
  blockBehindChance: number;                    // separate roll that lets a block work from the rear
  canParry: boolean;   parryChance: number;     // divisor 45
  canDodge: boolean;   dodgeChance: number;     // divisor 45; canDodge already folds in the front-or-monk rule
}

// Avoidance ladder: the first success ends it. Order: riposte, block (front or rear), parry, dodge.
// Shield block and two-hand blunt block (donor rungs after dodge) are not modelled.
export function avoidLadder(d: Defender, rng: Rng): 'riposte' | 'block' | 'parry' | 'dodge' | null {
  if (d.canRiposte && d.inFront && roll(rng, d.riposteChance)) return 'riposte';
  const rearBlock = roll(rng, d.blockBehindChance);
  if (d.canBlock && (d.inFront || rearBlock) && roll(rng, d.blockChance)) return 'block';
  if (d.canParry && d.inFront && roll(rng, d.parryChance)) return 'parry';
  if (d.canDodge && roll(rng, d.dodgeChance)) return 'dodge';
  return null;
}

// Critical: a die from 1..difficulty must fall under a DEX-based threshold.
export function critLands(dex: number, critChanceBonus: number, innate: boolean, difficulty: number, rng: Rng): boolean {
  if (!innate && !critChanceBonus) return false; // donor only rolls a crit with innate crit or a chance bonus (5444)
  const die = 1 + rng(difficulty);
  let dexBonus = dex > 255 ? 255 + Math.floor((dex - 255) / 5) : dex;
  dexBonus += 45;
  if (!innate) dexBonus = Math.floor((dexBonus * 3) / 5);
  if (critChanceBonus) dexBonus += Math.floor((dexBonus * critChanceBonus) / 100);
  return die < dexBonus;
}

// Whole swing: avoidance, hit test, mitigation ratio, critical, then the minimum damage added last.
export function resolveSwing(
  d: Defender, accuracy: number, avoidance: number, base: number, offense: number, mitigation: number,
  minDamage: number, crit: { dex: number; bonusPct: number; innate: boolean; difficulty: number; critDmgMod: number },
  rng: Rng,
): number {
  if (avoidLadder(d, rng) !== null) return 0;
  if (!hitLands(accuracy, avoidance, rng)) return 0;
  let dmg = Math.max(Math.floor(rollRatio(offense, mitigation, rng) * base + 0.5), 1);
  if (critLands(crit.dex, crit.bonusPct, crit.innate, crit.difficulty, rng)) {
    const mod = Math.max(170 + crit.critDmgMod, 100);
    dmg = Math.floor(((Math.max(dmg, base) + 5) * mod) / 100);
  }
  return dmg + minDamage;
}
```

## 5. Lands in

- TARGET `src/fight/hit.ts` (new module: the avoidance ladder, the hit test and the crit die; the one place a swing is accepted or refused). Parity-checklist row 1 (duel step / sim). The parry and block steps are the same job as the existing stamina-gated guard; this note supplies only the order and the one-roll-per-check shape, not a second parry system.
- today: `src/combat.ts` (moving).
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: 1 (one combat core, two clients); rules 7-9 n/a

Best transferable idea: a swing is a fixed sequence of single percent checks (avoid ladder, then a hit test, then a crit die), and damage comes from one offense-versus-mitigation ratio roll on a 20-step table rather than a formula.
Decision (proposed): adapt — take the ratio table and the one-roll-per-check order into the duel step, because a 20-step table is easy to read in a replay and to tune per zone; drop the skill-scaled avoidance divisors and heroic-stat terms (EverQuest stats we do not have), and keep parry and block inside the existing guard.
Acceptance: a seeded server test runs 100,000 swings at equal offense and mitigation, and the damage histogram equals an independent recount of the 20-step table (not a bell curve); a crit happens only when the die falls under the DEX threshold; each avoided swing reports exactly one avoidance reason.

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism; no donor line was translated.
- The ladder is per attacker and defender pair. MAX_ATTACKERS = 3 and the many-on-one target choice come from the hate list (row 4), not from this ladder, so the note does not answer many-on-one.
- Server-verified kills: the donor resolves all of this in the zone process, which fits our server-side verdict. Its random source is shared zone RNG. For replay (row 19), the RNG must be seeded per fight.
- Frankendom's guard, parry and stamina are already a single stamina-gated system (row 3). Keeping a second parry roll here would be a second ledger for the same action. Only the order and one-roll shape transfer.
- The level-gap bonus fits zones as data (a per-zone level gap), but only if it stays a zone field, not a per-player rule.
- Many inputs are EverQuest-specific: skill caps, special-ability ids, heroic stats, and the riposte immunity rule. None of these should be ported. The 80 percent PvP reduction is a rule for a live PvP mode we do not have; reject it unless the Pit needs it.
- The 20-step table is a quantisation of the ratio. Frankendom should choose its own steps as zone data, and the test must check the table, not the donor's values.
- Not read and therefore unclaimed: the source of `GetMitigationAC`, `compute_tohit`, `compute_defense`, `GetCriticalChanceBonus`, `GetCritDmgMod`, `ApplyDamageTable`, `DoRiposte`, the slay-undead body, finishing blow and deadly strike, the stun block, and the pet branch.


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** (1) Sketch resolveSwing calls critLands for every swing; donor TryCriticalHit only rolls when innate_crit || crit_chance != 0 (attack.cpp 5444). Without that gate a normal character crits at 3/5*(dex+45) chance. The note describes the gate in section 1 but the sketch neither implements nor declares dropping it. (2) Sketch avoidLadder omits shield block (618) and two-hand blunt block (630) which section 1 lists, not declared as omitted. (3) Note says a riposte result calls DoRiposte, but if strikethrough rolls it overwrites damage_done with 1 (1499) first, so riposte is skipped. All other cites verified: DoAttack 1474-1563, AvoidDamage 370-643 incl. divisors 50/25/45/45 at 504/547/574/601 and DEX/25, AGI/25, CheckHitChance 329-368, RollD20 1036-1058, MeleeMitigation 1060-1108 (80 percent PvP 1077, +0.5 and min 1 at 1107), crit 5429-5492 (+45, 3/5, 170, +5), CommonOutgoingHitSuccess 6420-6427, random.h Roll/Roll0, GPL header lines 7-8.

**Missed:** CheckHitChance 345-347: a sitting client/bot defender is always hit (before any roll), and 349-351 an avoidance of -1 returns a miss before the accuracy -1 test; neither is in the note or sketch. TryCriticalHit is also skipped for damage < 1.
