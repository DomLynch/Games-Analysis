# ModernUO (pets-mounts-taming, cell 2)

Donor: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Skills/AnimalTaming.cs` (taming attempt, whole file 466 lines) with `Projects/UOContent/Mobiles/BaseCreature.cs` 1752-1842 (`CheckControlChance`, `GetControlChance`), 4556-4584 (feeding), 5940-6060 (`LoyaltyTimer`), `Projects/UOContent/Skills/SkillCheck.cs` 108-120 and 178-195 (`CheckSkill`, `CheckTarget`), `Projects/Server/Utilities/Utility.cs` 546-560 and 890 (`CoinFlips`, `Random`), `Projects/Server/Random/BuiltInRng.cs` 34 | Licence: GPL-3.0 (`LICENSE` file, "Version 3, 29 June 2007"; no "or later" wording read; source files have no per-file licence header) | C# | symbol `AnimalTaming.InternalTarget` / `InternalTimer`, `BaseCreature.GetControlChance`

Checked: Read in full: `AnimalTaming.cs` (OnUse 24-37, InternalTarget 96-251 including OnTarget checks, InternalTimer 254-456), `BaseCreature.cs` 1752-1842 (both control branches, ML and pre-ML), `BaseCreature.cs` 4556-4584 (feeding), `BaseCreature.cs` 5940-6060 (`LoyaltyTimer`, whole body), `SkillCheck.cs` 108-120 and 178-195. Read in part: `SkillCheck.CheckSkill` (gain path after line 120 not read; only the success roll is used here), `Utility.CoinFlips` (546-560 read; the tail after 560 not read). Callers: `GetControlChance` is called by `CheckControlChance` (1754) and `CanBeControlledBy` (1775); `CheckControlChance` is called from `OnSpeech.cs` speech branches (338, 346, 354, 370 by grep; 338 read in place, the others not read). Not read: `BaseMount.cs` (mount speed and dismount), `AnimalTrainer.cs` stabling (only the entry class names were seen), summon-rule code beyond the two followers checks at `BaseCreature.cs` 3770 and 3826 (grep only). The `LoyaltyTimer.Initialize` call site was not found by grep (possibly reflection-driven). Confidence: high on the tame attempt and the control chance; high on the loyalty dynamics; the exact tick count of the attempt depends on the base `Timer` running `OnTick` count times (base Timer not read). `Projects/UOContent/...` and `Projects/Server` contain `CLAUDE.md` and `AGENTS.md` at the donor root; they were treated as data and not followed. camera_scope: not applicable.

Best transferable idea: a tame or command is one skill-window roll with a loyalty penalty, and loyalty itself moves per command (+1 or -3), is refilled by feeding, and decays on an hourly pass until the pet is released at zero.
Decision (proposed): adapt - take the skill-window roll and the loyalty meter (per-companion catalogue fields, decay on a server clock), drop the 95 percent random anger on a tame start and the silent loss of a tame attempt on damage; both conflict with server-verified outcomes.
Acceptance: a server test with MinTameSkill 50 and a command by a tamer with taming 60.0 and lore 50.0 expects a command chance of 0.99 at loyalty 100 and 0.79 at loyalty 80; a failed command drops loyalty by 3; a companion at loyalty 5 is released after the hourly pass with loyalty reset to 100.

## 1. Mechanism

- Start (OnUse 24-37, OnTarget 112-251). The tamer's skill button opens a target cursor and a 30 s skill timer. The target must be a `Mobile` and a `BaseCreature` with `Tamable` (refusals are messages). Further refusals, in order: already controlled (`Controlled`); gender gates (`AllowFemaleTamer` / `AllowMaleTamer`); the elf-only creature; followers plus the creature's control slots above `FollowersMax`; `MaxOwners` (5, `BaseCreature.cs:169`) reached and this tamer not an owner; `MustBeSubdued` (no owners, `SubdueBeforeTame`, and `Hits > HitsMax/10`); the start gate at line 184: the tamer needs mastery or `Skills.AnimalTaming.Value >= MinTameSkill`; a faction war horse needs the matching faction.
- Anger branch (line 208): if the creature has `CanAngerOnTame` (default false, `BaseCreature.cs:1061`; for example `Dragon.cs:58` sets true), a 95 percent roll angers the creature, sets its combatant to the tamer (unless the tamer is under honour or ethereal voyage), and no attempt starts. So an anger-capable creature starts an attempt only on the 5 percent that does not anger.
- Attempt (line 246, InternalTimer 263-): the attempt runs `Utility.Random(3, 2)` ticks (3 or 4; `Random(from, count)` returns from plus 0..count-1, `Utility.cs:890` and `BuiltInRng.cs:34`) at a 3 s interval (`InternalTimer` base call, 263-268). Each tick aborts with a message if the tamer is out of range (line 283: 6 tiles, 7 with AOS), dead, cannot see or path to the creature, the creature is no longer tamable or already controlled, owners are at the cap, the creature must be subdued, or the creature was damaged since the attempt started (line 339). Each progress tick plays a random overhead message and a passive Animal Lore check.
- Final roll (lines 396-423, on the last tick): `minSkill = MinTameSkill + 6 x Owners.Count` (396); if the tamer has mastery and `minSkill > -24.9` it is clamped to -24.9 (397-402); then `minSkill += 24.9` (403). Success is automatic if the tamer has mastery or already owns the creature (405); otherwise `CheckTargetSkill(AnimalTaming, minSkill - 25, minSkill + 25)` (406). So the roll window is 50 wide and starts about 0.1 below the minimum.
- Skill window (`SkillCheck.cs` 178-195): value below min fails (182); value at or above max, or min at or above max, passes (187); else `chance = (value - min) / (max - min)` (192), rolled by `CheckSkill` as `chance >= RandomDouble()` (115).
- On the first tame (line 423 area): skills scale to 90 percent (`ScaleSkills`, 0.90), or 86 percent if the creature was paralysed during the attempt, or 72 percent with a 90 cap for greater dragons; stats halve if `StatLossAfterTame`. The tamer is added to owners, control is set, `IsBonded` false, order Follow.
- Control check after tame (`BaseCreature.cs` 1752-1772): `CheckControlChance` rolls `GetControlChance(m)`. Success: `Loyalty += 1` (1756). Failure: animal or monster anger sound and animation, then `Loyalty -= 3` (1771).
- Control chance (`GetControlChance`, 1777-1842): returns 1.0 if `MinTameSkill <= 29.1`, if the creature is summoned, or if the tamer is a GM (1779). Mastery clamps `minTameSkill` to -24.9 (1786-1789). Skills are fixed point (tenths). Pre-ML branch (1825-1828): `difficulty = (int)(minTameSkill*10)`, `weighted = (taming*4 + lore)/5`, `bonus = weighted - difficulty`, then `bonus *= 14` if bonus <= 0 else `*= 6`. (The Core.ML branch, 1800-1821, is the one a live ModernUO server runs: separate per-skill bonuses, taming bonus times 6, or 28 if negative, lore bonus times 6, or 14 if negative, averaged. The sketch has both. For the worked values below it gives (100 x 6 + 0 x 6) / 2 = 300, the same 990 cap.) Then `chance = clamp(700 + bonus, 220, 990)` (1839), then `chance -= (100 - loyalty) * 10` (1841), then `return chance / 1000`.
- Loyalty: range 0 to 100 (`MaxLoyalty`, 165; `LoyaltyIncreasePerFood` 10, 166; the setter clamps, `BaseCreature.cs:525-527`, read). Feeding (4568-4577): on SE rules loyalty is set to 100; otherwise `+10 x CoinFlips(amount, 10)` capped at 100, and the message "Your pet looks happier" only if the gain is above 0. `CoinFlips` (`Utility.cs` 546-560) counts heads in `amount` fair flips and returns the maximum once heads reach it.
- Hourly pass (`LoyaltyTimer`, 5940-6060): the timer ticks every 5 minutes (5949) and does the work at most once per hour (5963-5966). For each controlled, commandable creature not on `Map.Internal` (6012): loyalty drops by 10 (6014); a "looks around desperately" line plays below 10 (6016); at zero or below the creature is queued for release (6022). After the loop the release sets loyalty to 100 and order Release (6051-6052). Dead pets are abandoned after `BondingAbandonDelay` (1 day, 1391) when the owner is away (5987-6007). Mounts with a rider skip the loyalty drop and reset their abandon timer (5981-5985); only creatures that are `Controlled && Commandable` lose loyalty (the final else-if after the dead-pet branch, from 6008).
- Ticks and order of operations: the tame attempt is driven by its own 3 s timer, not the server tick. The control check runs when the speech command is heard. Loyalty decay runs on the 5-minute timer with an hourly gate.

## 2. Key functions

- `AnimalTaming.InternalTarget.OnTarget`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Skills/AnimalTaming.cs` 112-251 (start checks 184-208, timer start 246).
- `AnimalTaming.InternalTimer.OnTick`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Skills/AnimalTaming.cs` 276-455 (aborts 283-339; final roll 393-423).
- `BaseCreature.CheckControlChance`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/BaseCreature.cs` 1752-1772.
- `BaseCreature.GetControlChance`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/BaseCreature.cs` 1777-1842 (both branches read).
- `BaseCreature` feeding: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/BaseCreature.cs` 4556-4584.
- `LoyaltyTimer.OnTick` and hourly body: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/BaseCreature.cs` 5947-6060.
- `SkillCheck.CheckTarget`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Skills/SkillCheck.cs` 178-195; `SkillCheck.CheckSkill` success roll: 115.
- `Utility.CoinFlips`: `/mnt/frankendom-donors/ModernUO/Projects/Server/Utilities/Utility.cs` 546-560.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant (where) |
|---|---|
| Tame start gate | Skill >= MinTameSkill, or mastery (AnimalTaming.cs:184) |
| Anger on tame start | 95 percent, only if CanAngerOnTame (208); default false (BaseCreature.cs:1061) |
| Attempt length | 3 s x (3 or 4) ticks (246; interval 263-268) |
| Attempt range | 6 tiles, 7 with AOS (283) |
| Owner cap | 5 (BaseCreature.cs:169) |
| Minimum tame skill per owner | +6 per existing owner (AnimalTaming.cs:396) |
| Roll window | centre + 24.9, width 50 (396-406) |
| Skill window chance | (value - min) / (max - min) (SkillCheck.cs:192) |
| First-tame skill scale | 0.90; 0.86 if paralysed; 0.72 with 90 cap for greater dragons (423 and nearby) |
| Control chance clamp | 220 to 990, tenths (BaseCreature.cs:1839) |
| Control chance difficulty multipliers | pre-ML: 14 if bonus <= 0, else 6 (just after 1827); ML: taming 6 or 28, lore 6 or 14 (1800-1821) |
| Loyalty penalty | 10 per point below 100 (1841) |
| Loyalty per command | +1 success, -3 failure (1756, 1771) |
| Loyalty per food | 10 per head of `amount` coin flips, capped at 10 heads (4573; `MaxLoyaltyIncrease` = 100/10) |
| Loyalty decay | -10 per hourly pass (6014); release at 0 (6022) |
| Hourly gate | 5-minute timer, hour gate (5949, 5963) |

Worked values (my arithmetic, not run): MinTameSkill 50, taming 60.0 (600 tenths), lore 50.0 (500): difficulty 500, weighted (2400 + 500) / 5 = 580, bonus 80, times 6 = 480, clamp(1180) = 990; loyalty 100 gives 0.99; loyalty 80 gives 790, i.e. 0.79. Final tame roll for the same creature with no owners: window [49.9, 99.9]; a tamer at skill 60 has chance (60 - 49.9)/50 = 0.20.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order inside each function, but leaves out the tame timer and its abort checks (range, death, line of sight, damage since start), the anger branch, the owner and follower checks, the faction and gender gates, the first-tame skill scaling and stat loss, the Core.ML control branch, the SE feeding rule, and the mastery clamp of minTameSkill. The pre-ML control formula is kept as the donor has it. Loyalty is clamped in one place (the setter in the donor). Feeding is a loop over fair coin flips, which has the same distribution as the donor's batched popcount.

```ts
// Licence: GPL-3.0 (donor LICENSE file). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Tame and command checks: a skill window for the tame roll, a loyalty-weighted control chance, loyalty moves and an hourly decay.
const MAX_LOYALTY = 100;
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

// Skill window: below min fails, at or above max passes, otherwise a linear chance across the window.
function skillWindow(value: number, min: number, max: number, rnd: () => number): boolean {
  if (value < min) return false;
  if (value >= max || min >= max) return true;
  return (value - min) / (max - min) >= rnd();
}

// Final tame roll. The minimum rises by 6 per existing owner; the window is 50 wide and centred on that minimum.
function finalTameRoll(minTameSkill: number, owners: number, taming: number, rnd: () => number): boolean {
  const centre = minTameSkill + owners * 6 + 24.9;
  return skillWindow(taming, centre - 25, centre + 25, rnd);
}

// Per-command control chance (pre-ML branch). Skills are in tenths; minTameSkill is in skill points.
function controlChance(minTameSkill: number, taming10: number, lore10: number, loyalty: number): number {
  if (minTameSkill <= 29.1) return 1.0;
  const difficulty = Math.trunc(minTameSkill * 10);
  const weighted = Math.trunc((taming10 * 4 + lore10) / 5);
  let bonus = weighted - difficulty;
  bonus *= bonus <= 0 ? 14 : 6;
  const chance = clamp(700 + bonus, 220, 990) - (MAX_LOYALTY - loyalty) * 10;
  return chance / 1000;
}

// Loyalty after one command: +1 on success, -3 on failure, kept in 0..100.
function afterCommand(loyalty: number, ok: boolean): number {
  return clamp(loyalty + (ok ? 1 : -3), 0, MAX_LOYALTY);
}

// Per-command control chance, Core.ML branch (the donor's live one). Same inputs.
function controlChanceML(minTameSkill: number, taming10: number, lore10: number, loyalty: number): number {
  if (minTameSkill <= 29.1) return 1.0;
  const diff = Math.trunc(minTameSkill * 10);
  const sb = taming10 - diff;
  const lb = lore10 - diff;
  const bonus = Math.trunc((sb * (sb < 0 ? 28 : 6) + lb * (lb < 0 ? 14 : 6)) / 2);
  return (clamp(700 + bonus, 220, 990) - (MAX_LOYALTY - loyalty) * 10) / 1000;
}

// Hourly pass for a pet that is controlled, commandable, not a ridden mount and off the internal map
// (the caller applies those gates): -10; at 0 or below it is released and reset to 100.
function hourlyLoyalty(loyalty: number): { loyalty: number; release: boolean } {
  const next = clamp(loyalty - 10, 0, MAX_LOYALTY);
  return next <= 0 ? { loyalty: MAX_LOYALTY, release: true } : { loyalty: next, release: false };
}

// Feeding (pre-SE): heads in `amount` fair coins, capped at `max`; each head is worth 10 loyalty.
function feedGain(amount: number, max: number, rnd: () => number): number {
  let heads = 0;
  for (let i = 0; i < amount; i++) {
    if (rnd() < 0.5) heads++;
    if (heads >= max) return max * 10;
  }
  return heads * 10;
}

// Worked check: minTameSkill 50, taming 60.0, lore 50.0. Expect 0.99 at loyalty 100 and 0.79 at loyalty 80.
console.log(controlChance(50, 600, 500, 100), controlChance(50, 600, 500, 80));
console.log(controlChanceML(50, 600, 500, 100), controlChanceML(50, 600, 500, 80));
console.log(afterCommand(100, false), hourlyLoyalty(5).release, finalTameRoll(50, 0, 60, () => 0.5));
console.log(feedGain(3, 10, () => 0.2));
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, PASSED (exit 0), file with `export {}` as the last line (work copy: `/private/tmp/p2/wave2-haiku/batch3/PM001/work/ModernUO-tame-control.ts`).

## 5. Lands in

- TARGET `src/fight/tame.ts` (new module: catalogue fields for tame and command, one loyalty ledger per companion). Parity-checklist row 21 (catalogue fields: MinTameSkill, CanAngerOnTame, SubdueBeforeTame, MaxOwners and the control rule are catalogue fields).
- Today: no tame or command code in Frankendom (not read in this pass; the target is a proposal).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 1 (one engine: the tame and command rules are data; the server rolls and logs the outcome).

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism.
- Note 1, mastery window: the mastery clamp and the +24.9 offset together centre the window at 0 (chance 0.5 at skill 0). The donor comment there reads "50% at 0.0?" with a question mark, so the author was unsure; the arithmetic agrees with the comment. Fix: state the window as catalogue data (centre and width) and test it.
- Defect 2, skill window start (line 184): the start gate is at MinTameSkill, but the final window starts 0.1 below MinTameSkill, so a tamer exactly at the minimum has about 0.2 percent per roll. That is an arithmetic consequence (from read lines), not a bug the donor claims. Fix: decide the start gate and the window floor together in the catalogue.
- Defect 3, anger roll (line 208): a 95 percent anger on tame start for CanAngerOnTame creatures, and the attempt is lost on damage with a message (339). For Frankendom's server-verified outcomes this is a random penalty the server must log. Fix: keep the abort-on-damage rule as a visible state, drop the random anger in favour of a catalogue flag.
- Control chance and loyalty: the pre-ML and Core.ML branches disagree (different formulae), and the Core.ML one is what the donor runs live. Frankendom must pick one formula and test it. Fix: pick the pre-ML formula (simpler, in the sketch as `controlChance`) or the ML one (`controlChanceML`) and record the choice in the catalogue. The acceptance numbers (0.99, 0.79) hold under both.
- `CanBeControlledBy` (1775) gates followers on `GetControlChance > 0`, which is the simplest place the control chance blocks summoning or commands. The failed command also plays an anger sound and animation (1757-1771).
- Loyalty decay is wall-clock (an hourly pass). Frankendom's server tick is the clock; a decay per server hour must be deterministic and must not run during a Pit bout.
- The release at zero clears to 100 and drops control. In a one-character one-ledger model, a released companion must return to the ledger, not disappear silently.
- Mounts override the control chance to 1.0 (SwampDragon.cs:122, Ridgeback, SavageRidgeback, ScaledSwampDragon; FireBeetle.cs:88 too; LesserHiryu.cs:100 adjusts it). This is a donor rule for mounts; Frankendom has no mount rule in the fight, so it is not adopted.
- MAX_ATTACKERS = 3: a companion would count as an attacker in a many-on-one fight. Not designed here; the engine owns that count.
- Not read: BaseMount.cs (mount speed and dismount), AnimalTrainer.cs stabling, and the Core.ML branch's effect on live values. The stabling and mount sub-topics are not covered by this note.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: 1 (one engine: tame and command rules are catalogue data; the server rolls and logs)


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
Errors: Verified: CheckControlChance 1752-1772 (+1 success, -3 failure), GetControlChance 1777-1844 incl. clamp(700+bonus,220,990) at 1839 and (MaxLoyalty-loyalty)*10 at 1841, pre-ML multipliers 14/6, ML branch 6/28 and 6/14, feeding 4566-4581 (SE sets 100, else CoinFlips*10), CoinFlips semantics, LoyaltyTimer 5947-6060 (5 min timer, hourly gate 5963, -10 at 6014, <10 desperate line 6016, <=0 release 6022, release sets Loyalty 100 and Release order 6051-6052), AnimalTaming OnTarget gate order 116-208, anger 95% at 208, Random(3,2) = 3 + Next(2) (3 or 4 ticks), 3 s interval, range 6/7 at 283, final roll 396-406 with +24.9 and window +-25, first-tame scale 0.90/0.86/0.72, MaxOwners 5, CanAngerOnTame false at 1061, BondingAbandonDelay 1 day at 1391, worked numbers (0.99 / 0.79 and 0.20). Errors: (1) Mastery clamp is at BaseCreature.cs 1786-1789, note cites 1780-1783. (2) Mount-rider skip and dead-pet abandon are at 5981-5985 and 5987-6007, note cites 5968-5971 and 5980-5995 (the note flags these as 'read, not receipted' so honest but line numbers wrong). (3) Note builds the Acceptance and sketch on the PRE-ML formula, but the live donor branch is Core.ML (1800-1821: per-skill bonus, 6/28 and 6/14, averaged); note admits both exist and recommends pre-ML. Acceptance numbers happen to be identical under both branches (990 cap), so no test failure, but any other numbers would differ. (4) Mount GetControlChance=1.0 list omits FireBeetle.cs:88 and LesserHiryu.cs:100 override; trivial. Acceptance (0.99 at loyalty 100, 0.79 at 80; failed command -3; loyalty 5 released and reset to 100 after hourly pass) all hold against the donor.
Missed: Decay is gated on Controlled && Commandable and skipped for mounts with a rider; neither is in the acceptance. Not covered: Loyalty also decays only when Map != Internal (noted). Missed minor: CheckControlChance anger sound/animation on failure and the CanBeControlledBy (GetControlChance>0) follower gate, which is the simplest way the control chance gates summoning/commands.

Fixed 2026-10-12 (Sonnet fixer): line cites corrected (mastery clamp 1786-1789, mount rider 5981-5985, dead-pet abandon 5987-6007); the ML control branch added to the sketch (typechecked on the VPS) and noted as the live one, acceptance numbers confirmed equal under both; decay eligibility (Controlled && Commandable, not a ridden mount) stated; mount override list completed. Also found: CanBeControlledBy gates on GetControlChance > 0. Not verified: nothing further.
