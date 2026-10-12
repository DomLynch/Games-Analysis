# ModernUO (magic-spells-powers, cell 2)

Donor: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Spells/Base/Spell.cs` | Licence: GPL-3.0 (LICENSE: "GNU GENERAL PUBLIC LICENSE", "Version 3, 29 June 2007"; clean-room, shape only) | C# | symbol `Spell.Cast`, `Spell.Disturb`, `Spell.GetCastDelay`, `Spell.GetCastRecovery`, `Spell.GetDisturbRecovery`, `Spell.CheckSequence`, `MagerySpell.CheckResisted`

Checked: Read end to end: the cast start gate and timer (Spell.cs 463-602), the cast timer that fires the spell (CastTimer, 942-990), the sequence step that spends reagents and mana and rolls the fizzle (CheckSequence 736-800 and the fizzle branch to 832), `CheckFizzle` (614-628), `GetCastDelay` / `GetCastRecovery` / `GetDisturbRecovery` (654-732), `Disturb` (394-433), `OnCasterHurt` (85-97), `OnCasterMoving` (108-117), `ScaleMana` (633-652), the damage path `GetNewAosDamage` (198-258) and `GetDamageScalar` (275-326), and `MagerySpell.cs` 1-116 (mana table, skill window, cast delay, resist percent and roll). Candidate files opened: 5 (Spell.cs, MagerySpell.cs, SpellCircle.cs, DisturbType.cs, Misc/AOS.cs) plus a grep of the Spells tree. Confidence: high on the cast, delay, recovery, interrupt and mana order; medium on the resist and damage numbers (read, but the `Skills.CheckSkill` gain function and `Utility.Random` are not read). Not read: `SpellHelper.cs` (1373 lines, targeting and harmful checks), `Skills.cs` `CheckSkill`, the per-spell `OnCast` bodies, Necromancy summons (AnimateDead, SummonFamiliar), Mysticism and Spellweaving bodies, the reagent base `ConsumeReagents` past its first lines, `Misc/RegenRates.cs`. The folder CLAUDE.md, AGENTS.md and GEMINI.md in the donor were treated as data and not followed. camera_scope: n/a (magic cell).

Best transferable idea: an interrupted cast locks the caster out for a time that falls as the cast nears completion (1 - sqrt of elapsed over cast time, floor 0.2 s), so a hit at the start of a cast costs the most, which a fast fight can tune as data.

Decision (proposed): adapt - keep the interrupt-lockout curve and the cast-delay-as-data shape, but make the lockout a field in the engine's hit step on the one ledger, store the cast delay once at cast start, and check reagents and mana before spending either (the donor spends reagents first).
Acceptance: In a zone or Pit fight a caster hit at the very start of a 0.75 s cast sees a "Disrupted" cue and a 1.0 s lockout before the next cast; a server test asserts `disturbRecoverySec(0, 0.75) == 1.0`, `disturbRecoverySec(0.6075, 0.75) == 0.2`, and that a cast short on mana spends no reagents.

## 1. Mechanism

- Start (Spell.cs 463-602). `Cast()` stamps `StartCastTime`, then refuses the cast when the caster is dead, already casting, under a transformation, paralysed or frozen, still inside `NextSpellTime` (501), calmed, or the spell is feature-blocked. Otherwise it checks mana against `ScaleMana(GetMana())` (520). If the caster is free and the spell's `CheckCast` and region hook pass, the state becomes Casting (527) and the cast delay is read once (537). A non-zero delay starts a `CastTimer` (572); a zero delay fires it at once.
- Delay (`GetCastDelay`, Spell.cs 691-732; magery override at MagerySpell.cs 101-112). AOS path: base is `(3 + circle)` quarter-seconds (MagerySpell.cs 25; so First = 0.75 s, Eighth = 2.5 s). Fast-cast points are capped at 2 for magery and necromancy, 4 for other skills (704). Protection removes 2 more points (712-713). Essence of Wind debuff subtracts more (717). Each point removes 0.25 s (729). The delay never drops below 0.25 s (731). Non-AOS magery: `0.5 + 0.25 * circle` (MagerySpell.cs 110).
- Fire (`CastTimer.OnTick`, 951-980). If the caster is still casting this spell, state becomes Sequencing (962), the caster's `NextSpellTime` is set to now plus the cast recovery (967), the spell's `OnCast` runs, and the target timeout is set to 30 s for players who change target.
- Recovery (`GetCastRecovery`, 669-689). Non-AOS: flat 0.75 s (19, 673). AOS: `units = 6 - fast-recovery points` (72, 679), floored at 0, then `seconds = units / 4` (74, 688). So the base is 1.5 s and each point saves 0.25 s; six points remove it.
- Sequence and spend (`CheckSequence`, 736-800). The step first checks that the caster is alive, still casting this spell (740), and that a scroll or wand still exists (744-748). Then reagents are consumed (750), then the mana check (754) against the scaled cost (738), then the frozen and calmed checks, then the fizzle roll (768). Only on a passed roll is mana spent (770); a fizzle calls `DoFizzle` and costs no mana (after 800, not quoted).
- Interrupt (`Disturb`, 397-433; `OnCasterHurt` 85-97). A hurt on a player who is casting disturbs the spell, unless protection is active and `d < 1000 && d < Random(1000)` fails (88-91). Disturbed casts stop their timers and set `NextSpellTime` to now plus `GetDisturbRecovery()` (419). Disturb recovery (`GetDisturbRecovery`, 654-667) is zero on AOS (656-658). Otherwise it is `max(1 - sqrt(elapsed / delay), 0.2)` (661-662), with elapsed in seconds since `StartCastTime` and delay from `GetCastDelay()` again (662).
- Movement (`OnCasterMoving`, 108-117): while casting and `BlocksMovement` (default: casting), moves are refused (110).
- Fizzle window (`GetCastSkills` 41, `CheckFizzle` 614-628). Minimum skill is `_requiredSkill[circle + 2]` for a book cast, `[circle]` for a scroll (41); maximum is minimum plus 40. The roll is `Caster.CheckSkill(CastSkill, min, max)` (628); the internals of `CheckSkill` were not read.
- Cost (`GetMana` 45 and `ScaleMana` 633-652). Mana per circle: 4, 6, 9, 11, 14, 20, 40, 50 (MagerySpell.cs 8, 45). Scaled: `mana * (1 - min(LowerManaCost, 40) / 100)`, truncated (644-651).
- Resist (MagerySpell.cs 47-86). Chance is `GetResistPercent / 100` (63). The percent is the larger of `MR / 5` and `MR - ((cast skill - 20) / 5 + (1 + circle) * 5)`, halved (92-96). A chance of 0 never resists (65) and 1 always does (70); otherwise resisted when `chance >= RandomDouble()` (85). The check also gives a magic-resist skill gain roll when the skill is below a threshold (78-81).
- Damage (`GetNewAosDamage`, 218-257). `dice d sides + bonus`, times 100 (220). Inscribe bonus `(f + 1000 * (f / 1000)) / 200`, where f is the fixed-point inscribe skill (223). Intelligence bonus `Int / 10` (226). Spell-damage property `SDI` (capped at 15 in player-vs-player, 233). Damage scaled by `100 + bonus` percent (248), then by `30 + 9 * evalSkill / 100` (251), then by the target scalar (`GetDamageScalar`), then divided by 100 (257).
- Damage scalar, pre-AOS only (`GetDamageScalar` 275-326). `1 + (EI - MR) / 500` when EI is above MR, `1 + (EI - MR) / 200` otherwise (293, 297). Plus `(magery skill - 100) / 400` (301). Doubled against non-human monsters (305). Evasion sets it to 0 for single-target spells (320).

## 2. Key functions

- `Spell.Cast`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Spells/Base/Spell.cs` 463-602.
- `CastTimer.OnTick`: same file, 942-990 (fires the spell; sets recovery at 967).
- `Spell.CheckSequence`: same file, 736-832 (reagents, mana, fizzle, spend).
- `Spell.Disturb`, `OnCasterHurt`, `GetDisturbRecovery`: same file, 85-97, 394-433, 654-667.
- `Spell.GetCastDelay`, `GetCastRecovery`: same file, 669-732.
- `MagerySpell` (cast delay, mana table, fizzle window, resist): `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Spells/Base/MagerySpell.cs` 1-116.
- `Spell.GetNewAosDamage`, `GetDamageScalar`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Spells/Base/Spell.cs` 198-326.

## 3. Numbers vs mechanism

Reusable algorithm: a cast is a timed state with a start, a cast delay, a completion and a recovery; an interrupt sets a lockout from progress; mana and reagents are checked before a roll and spent after it; a resist is a chance from the target's resist and the caster's skill.

Game-specific constants: the circle scale (3 + circle quarter-seconds), the 6-unit recovery at four units per second, the fast-cast caps (2 or 4), the mana table, the skill window of 40, the LMC cap of 40 percent, the 1000-to-200 inscribe term, and the 30 + 9 per hundred eval term.

TABLE (name | effect | formula | number ranges | cost | cooldown / cast time | caps | file:line):

| name | effect | formula | number ranges | cost | cooldown / cast time | caps | file:line |
|---|---|---|---|---|---|---|---|
| Cast delay (AOS) | time between start and fire | `max((3 + circle) * 0.25 - 0.25 * fc, 0.25)` s; fc = min(FC, cap), minus 2 if protected | First 0.75 s to Eighth 2.5 s; with FC 2 First gives 0.25 s | none at start | 0.25 s floor | FC cap 2 (magery, necro) or 4; protection -2 | MagerySpell.cs:25; Spell.cs:704-731 |
| Cast delay (pre-AOS) | time between start and fire | `0.5 + 0.25 * circle` s (wands zero) | 0.5 s to 2.25 s | none at start | none | none | MagerySpell.cs:110 |
| Cast recovery (AOS) | lockout after a cast fires | `max(6 - FCR, 0) / 4` s | 0 to 1.5 s | none | 1.5 s base | min 0 | Spell.cs:72, 74, 679, 688 |
| Cast recovery (pre-AOS) | lockout after a cast fires | flat 0.75 s | 0.75 s | none | 0.75 s | none | Spell.cs:19, 673 |
| Interrupt lockout (pre-AOS) | lockout after a hit breaks a cast | `max(1 - sqrt(elapsed / delay), 0.2)` s | 1.0 s at start, 0.5 s at 25 percent, 0.2 s floor (from 64 percent) | none | replaces the cast recovery | floor 0.2 s | Spell.cs:661-662, 419 |
| Interrupt lockout (AOS) | same | zero | 0 s | none | 0 | none | Spell.cs:656-658 |
| Hurt disturb | a player's cast breaks on damage | unprotected: disturbs; protected: disturbs only when d < 1000 and d < Random(1000) | protection d; at 1000 or more never disturbs | none | per hit | monsters and pets never disturbed | Spell.cs:88, 91 |
| Movement lock | no moving while casting | refuse move while casting and BlocksMovement | none | none | while casting | none | Spell.cs:110 |
| Mana cost | pool spent for a cast | `(int)(MANA[circle] * (1 - min(LMC, 40) / 100))` | 4, 6, 9, 11, 14, 20, 40, 50 base; LMC 0-40 | mana | none | LMC cap 40 | MagerySpell.cs:8, 45; Spell.cs:633-651 |
| Fizzle window | the skill roll that can fail a cast | `CheckSkill(skill, min, max)` with min from table, max = min + 40 | book min 0 (First) to 70 (Eighth); scroll min -50 (First) to 50 (Eighth) | reagents spent, mana not spent on fizzle | per cast | none | MagerySpell.cs:17, 41; Spell.cs:614-628 |
| Reagents and mana order | reagents first, then mana, then roll | consume reagents; if mana < cost, fail; if fizzle, fail; else spend mana | none | reagents and mana | none | none | Spell.cs:750-770 |
| Resist chance (magery) | a target resists | `max(MR / 5, MR - ((cast - 20) / 5 + (1 + circle) * 5)) / 2` percent | chance 0 to 100 percent | none | per cast | 0 never, 100 always | MagerySpell.cs:63, 92-96 |
| Damage scale (AOS) | spell damage | `dice * 100 * (100 + bonus) / 100 * (30 + 9 * eval / 100) / 100` | eval 0 gives 0.3x, 100 skill gives 1.2x; Int / 10 percent | none | none | SDI capped at 15 in PvP | Spell.cs:220-257; AOS.cs:251 |

Derived by hand (not run):
- Resist at MR 100, cast 100, First circle: first 20, second 79, max 79, halved 39.5 percent.
- Resist at MR 50, cast 100, Eighth circle: first 10, second -6, max 10, halved 5 percent.
- Inscribe bonus at fixed 999 (99.9 skill): 999 / 200 = 4 percent. At fixed 1000 (100.0 skill): (1000 + 1000) / 200 = 10 percent. A jump of 6 points between 99.9 and 100.0 (see defect 4 below).
- Mana for an Eighth circle cast (50) with LMC 40: floor(50 * 0.6) = 30.

Which numbers suit a fast mobile fight: cast delays of 0.25 s to 0.75 s for the first two circles are close to a melee beat; a lockout of 1.0 s at the start of a cast is punishing but simple; the 0.2 s floor is a good minimum; the fast-cast cap idea (points capped per class) is a clean data field.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for the cast delay (cap first, then protection, then the 0.25 s floor), the lockout curve, the mana scale, the reagent-then-mana-then-roll order (with the fix: reagents are spent by the caller and only on "ok" or "fizzle"), and the resist chance with its two ends. It omits the wand path, the Core.SA and ML version rules, the Thunderstorm and Essence of Wind debuffs, the protection-spell check for the hurt disturb (the sketch takes a protection value only as a flag), the stance and paralysis checks, the karma and garlic branches, the fizzle skill-gain calls, the pre-AOS scalar, and the duel context. It uses floating seconds where the donor uses milliseconds from `Core.TickCount`.
```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

// Mana cost per circle, index 0 (first circle) to 7 (eighth). Data, not an engine rule.
export const MANA_BY_CIRCLE: readonly number[] = [4, 6, 9, 11, 14, 20, 40, 50];

// Cast delay in seconds. Base is (3 + circle) quarter-seconds; each fast-cast point after the cap removes 0.25 s;
// a protection effect costs 2 points first; the floor is 0.25 s.
export function castDelaySec(circle: number, fastCastRaw: number, fastCastCap: number, protectionOn: boolean): number {
  let fc = Math.min(fastCastRaw, fastCastCap);
  if (protectionOn) fc -= 2;
  const base = (3 + circle) * 0.25;
  return Math.max(base - fc * 0.25, 0.25);
}

// Recovery after a finished cast: 6 units of 0.25 s less one unit per fast-recovery point, floor 0.
export function castRecoverySec(fastRecovery: number): number {
  const units = Math.max(6 - fastRecovery, 0);
  return units / 4;
}

// Recovery after an interrupt: 1 - sqrt(elapsed / delay), floor 0.2 s. An early interrupt waits longest.
// The delay is passed in by the caller (the cast-start value), not recomputed.
export function disturbRecoverySec(elapsedSec: number, delaySec: number): number {
  return Math.max(1 - Math.sqrt(elapsedSec / delaySec), 0.2);
}

// Mana after lower-mana-cost (capped at 40 percent). Truncates like the donor's integer cast.
export function scaledMana(base: number, lowerManaCostPercent: number): number {
  const lmc = Math.min(lowerManaCostPercent, 40);
  return Math.floor(base * (1 - lmc / 100));
}

export type CommitResult = "no-reagents" | "no-mana" | "fizzle" | "ok";

// Order: reagents present, then mana present, then the skill roll. Nothing is spent here;
// the caller spends reagents on "ok" and "fizzle" and mana on "ok" only.
// This is the fix to the donor order, which spent reagents before the mana check.
export function commitCast(mana: number, cost: number, hasReagents: boolean, fizzleRoll: () => boolean): CommitResult {
  if (!hasReagents) return "no-reagents";
  if (mana < cost) return "no-mana";
  if (fizzleRoll()) return "fizzle";
  return "ok";
}

// Chance (0..1) that the target resists a circle spell. Halved; rises with the target's magic resist and
// falls with the caster's cast skill and the spell circle.
export function resistChance(targetMagicResist: number, casterCastSkill: number, circle: number): number {
  const first = targetMagicResist / 5;
  const second = targetMagicResist - ((casterCastSkill - 20) / 5 + (1 + circle) * 5);
  const percent = Math.max(first, second) / 2;
  return Math.min(Math.max(percent / 100, 0), 1);
}

// Resisted when the chance is at least the roll; certain at 1 and never at 0 (no roll is needed at the ends).
export function isResisted(chance: number, roll: number): boolean {
  if (chance <= 0) return false;
  if (chance >= 1) return true;
  return chance >= roll;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/MG002-modernuo-casting.ts) exits 0.

## 5. Lands in

- TARGET `src/fight/casting.ts` (new module, shared with the gemrb note): cast delay, recovery, the lockout on hit, the mana and reagent commit, and the resist chance. Parity-checklist row 13 (specials).
- The lockout is applied in the engine's damage step, on the same ledger as the hit, not as a flag set by the attacker. Server-side: the server computes the lockout and the caster's client only shows the cue.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 1 (one combat core, two clients); cast timing and costs as data (MG-FOCUS a, b, g).

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism.
- Defects (keep the idea, fix the defect):
  1. Reagents are spent before the mana check (Spell.cs 750 before 754). A cast short on mana loses its reagents and does not cast. Fix: check both, spend both on one commit (sketch `commitCast`).
  2. The interrupt lockout reads the cast delay again (662), not the value used at cast start (537). If fast-cast changes during a cast, the curve uses a different delay. Fix: store the delay at cast start and pass it to the lockout.
  3. Two different skill-gain thresholds for the same magery resist: `1 + circle * 10` (MagerySpell.cs 51) against `(1 + circle) * 10` (78). The author says the split is deliberate (75-76), but the two differ by nine skill points at every circle. Fix: name both thresholds, or use one helper.
  4. The inscribe bonus `(f + 1000 * (f / 1000)) / 200` (Spell.cs 223) is not continuous: 999 gives 4 percent and 1000 gives 10 percent. Fix: pick one curve, either `f / 200` or an explicit tier table if the step is intended. Not checked against OSI.
  5. The sqrt lockout is zero on AOS (656-658) and non-zero before it. For a mobile game pick one rule and keep the lockout as data.
- Frankendom rulings: the donor has no server-verified kill step in this file; the cast completes in the same callback that fires `OnCast`. The lockout and the hit must land in one server tick (row 18 sub-line: server tick, fixed step).
- Not covered (not read): targeting and harmful checks (`SpellHelper.cs`, 1373 lines, MG-FOCUS b), status ladder and charm, fear and sleep bodies (c, d), Necromancy summons and their upkeep, leash and corpse rules (e), dragons (f), spell purchase and spell-making (h), reagent base logic beyond its first lines (i), resource regen (`Misc/RegenRates.cs`). Those are not claimed here.
- Resource pools: mana is a pool on the caster (`Caster.Mana`), spent at fizzle-free completion; regen was not read. Health and stamina rows are not in this file.
- The fizzle window (40 wide) is a skill roll from the skill system (`CheckSkill`, not read). A duel should use a stamina or focus gate instead of a skill roll for a fast cast; the skill-window shape is noted, not adopted.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: 1 (one combat core, two clients); MG-FOCUS (a) casting model and interrupt, (b) targeting timing, (g) resistances, data for cast delay and cost.
