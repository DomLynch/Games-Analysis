# ModernUO (character-stats-skills, cell 1)

Donor: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Skills/SkillCheck.cs` | Licence: GPL-3.0 (as read: `LICENSE`, GNU General Public License Version 3, 29 June 2007, copyright 2019-2020 ModernUO Development Team; SkillCheck.cs has no per-file licence header) | C# | symbol `SkillCheck.CheckSkill`

Checked: Read in full: `CheckSkill` (SkillCheck.cs 108-159), `Gain` (236-310), `RollStatIncreaseChance` and the stat-gain settings (11-30), `RegenRates.cs` (1-258, whole file), `StaminaSystem.FatigueOnDamage` (276-289) and `GetStamLoss` (416-431), `Mobile` regen timers (Mobile.cs 9005-9054). Partly read: `LegacyGain` (312-330), `GainStat` (444-505, body after 500 not read), `IncreaseStat` (372-417; `CanLower`, `CanRaise` and `_statMax` not read), `AllowGain` (226-234; the anti-macro body not read), `ProcessPlayerMovement` (317-372). Callers of `CheckSkill` were not read (only its body), so the statement that it runs on every use is from the function's own comments and parameters, not from a caller. Confidence: high for the skill-gain chain (read end to end); medium for stat atrophy (helpers not read). The donor's CLAUDE.md and AGENTS.md were not opened and not followed.

## 1. Mechanism

- Learning by use, event-driven. A skill use passes a success chance `chance` (0-1). The donor rolls `success = chance >= random` (115). If the mobile is alive and its region allows gain (118): a skill under 10.0 points always goes to `Gain` (120-123); otherwise, if `AllowGain` passes (124; anti-macro and, in AoS, faction loss, 226-234), it computes a gain chance `gc` (126-133), floors it at 0.01 (135-138), doubles it for controlled pets (140-142), and gains when `gc >= random` (145).
- The gain chance has four steps, in order: average of room left in the total budget (126) and room left in this skill (127) (128); then add a hard-check bonus `(1 - chance) * (0.5 on success, 0.2 on failure, 0 on failure under AoS)` (130) and average again (131); then multiply by the skill's `GainFactor` (133). A success on a low-chance check gets the largest bonus.
- `Gain` (236-310): only when the skill is below its cap and its lock is Up (248). Amount is 1 tenth of a point, or 1-4 tenths when the skill is at or under 10.0 points (250-255). For players, with chance Total/Cap (259), it first lowers one other skill that is locked Down by the same amount (263-270), so a full budget can move points away from a skill the player has stopped training. A recently accelerated skill multiplies the amount by 2-5 (273-276). The skill is then raised and clamped to its cap (278-281); players stop gaining once Total reaches the budget (278).
- Stats are a separate roll. The legacy path runs unless `_usePub45StatGain` is set; its default is `Core.ML` (line 30), so non-ML cores use the legacy path. After a successful use (152-154), each stat is rolled with chance `statGain / 33.3 * multiplier` (19), only if its lock is Up, and at most once per stat per delay (457-462; 10 minutes, or 0.05 minutes under ML, 26). Pub-45 path (284-309): a flat 5% per `Gain` call (300); then the primary stat with 75% (25) when the primary is Up, else the secondary (303-305).
- Atrophy: `GainStat` calls `IncreaseStat(from, stat, atrophy)` with `atrophy` rolled as `RawStatTotal / StatCap >= random` (501) and forced when the raw total is at the stat cap (374). A Str raise lowers Dex by one when Dex is below Int or Int cannot be lowered, otherwise it lowers Int (382-389); the raised stat is clamped to `_statMax` (394).
- No tick and no timer for skills. Hits, stamina and mana regen are timers (see section 3).

## 2. Key functions

- `CheckSkill(Mobile, Skill, object, double)`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Skills/SkillCheck.cs` 108-159 (success roll, gain chance, pet doubling, legacy stat roll).
- `Gain(Mobile, Skill)`: SkillCheck.cs 236-310 (cap and lock gate, amount, make-room, accelerate, cap clamp, pub-45 stat roll).
- `RollStatIncreaseChance`: SkillCheck.cs 18-19.
- `LegacyGain`: SkillCheck.cs 312-330 (partly read). `GainStat`: 444-505 (partly read). `IncreaseStat`: 372-417 (partly read).
- Regen rates: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Misc/RegenRates.cs` `Configure` 13-26, `Mobile_HitsRegenRate` 44-86, `Mobile_StamRegenRate` 88-129, `Mobile_ManaRegenRate` 131-221. Timers: `/mnt/frankendom-donors/ModernUO/Projects/Server/Mobiles/Mobile.cs` `ManaTimer` 9005-9020, `HitsTimer` 9022-9037, `StamTimer` 9039-9054.
- Fatigue and weight: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Misc/StaminaSystem.cs` `FatigueOnDamage` 276-289, `ProcessPlayerMovement` 317-372 (partly), `GetStamLoss` 416-431.

## 3. Numbers vs mechanism

Table of every stat, derived pool and skill rule read in this pass. Values are the donor's own numbers. "Fixed" means tenths of a point as stored (Skills.cs 201, 224).

| Name | What it does | Formula | Number ranges (min/max/typical) | Caps (soft/hard) | file:line |
|---|---|---|---|---|---|
| Skill value (any) | learned level used in checks | Base = BaseFixedPoint / 10 (display points) | 0 to 100.0 display (fixed 0-1000); the 1000 default is written only when the cap differs (save rule) | hard cap per skill, default 100.0 (fixed 1000) | SkillCheck.cs 126-127; Skills.cs 201, 224, 360 |
| Skill budget (total) | sum of all skill values | Total = sum of fixed BaseFixedPoint | budget 7000 fixed = 700.0 display (initial value set at construction; the line is under 15 characters, no receipt) | hard: players stop gaining at Total >= Cap; soft: make-room lowers a Down-locked skill | Skills.cs 463 (not receipted), 836; SkillCheck.cs 259-281 |
| Gain amount | points per successful gain | 1 tenth; 1-4 tenths at or under 10.0 points; then x2-5 when accelerated | 1-4 tenths (low skill), 1 tenth (higher), 2-5 times (accelerated) | per-skill cap | SkillCheck.cs 250-276 |
| Gain chance per use | chance that one use raises the skill | gc = avg(budget room, skill room); gc = avg(gc + (1 - chance) * 0.5 on success, 0.2 on failure, 0 under AoS); gc = gc * GainFactor; min 0.01; pets x2 | floor 0.01; GainFactor per skill (skill table not read) | none | SkillCheck.cs 126-142 |
| Make-room | keeps a full budget changing | roll Total/Cap; lower one Down-locked skill by the gain amount, floor 0 | one skill per gain | floor 0 | SkillCheck.cs 259-270 |
| Strength (raw) | max HP; the stat itself | HitsMax = 50 + Str / 2 | raw 1-65000 (clamp); starting values not read | stat total cap 225 default (per mobile); `_statMax` not read | Mobile.cs 1854, 2069, 7826 |
| Dexterity | max stamina | StamMax = Dex | raw 1-65000 | as Str | Mobile.cs 2114 |
| Intelligence | max mana | ManaMax = Int | raw 1-65000 | as Str | Mobile.cs 2169 |
| Hits (health) regen | +1 HP per tick | default 11 s per point; AOS: 10 / (1 + points) s, points = RegenHits (+4 non-animated-dead creature, +2 human under ML, ML player cap 18) | 11 s default; ML player intervals about 10 s to 0.5 s | HitsMax | RegenRates.cs 15, 44-86 (85); Mobile.cs 9028-9036 |
| Stamina regen | +1 stamina per tick | default 7 s per point; AOS: 1 / (0.1 * (2 + points)) s, points = int(Focus * 0.1) + RegenStam (+15 vampiric, +20 kirin, ML cap 24) | 7 s default; AOS about 0.4 s (ML cap 24) to 10 s | StamMax = Dex | RegenRates.cs 16, 88-129 (97, 128); Mobile.cs 9049, 9052 |
| Mana regen (meditation, focus) | +1 mana per tick | default 7 s; AOS: medPoints = (Int + Meditation * 3) * (0.025 below 100, 0.0275 at 100+); focus = Focus * 0.05; any meditation-blocking armour zeroes medPoints; ML cap 18 extra | default 7 s; AOS points floored at -1; non-AOS rate clamped to 0.5-7.0 s (RegenRates.cs 217) | ManaMax = Int | RegenRates.cs 17, 131-221 (148-150) |
| Fatigue on damage ("tired body") | stamina lost per hit | Standard: stam -= int(damage * (100 / Hits) * (Stam / 100) - 5) when above 0 | offset -5.0 stamina; mode default not read (PainSpike is the other mode) | stam floor 0 | StaminaSystem.cs 276-289 (280) |
| Overweight drain | stamina per step over the weight limit | loss = base 5 + overweight / 25 stones; /3 when mounted; x2 when running; when running below 10% of max stamina, an extra 1 stamina per step (StaminaSystem.cs 349-352) | allowance 4 stones over max; 25 stones per point; base 5 | at 0 stamina the move is blocked | StaminaSystem.cs 47-49, 302, 317-372, 416-431 |
| Stat gain (legacy) | +1 to Str/Dex/Int after a successful use | chance = statGain / 33.3 * multiplier (default 1.0); needs stat lock Up; delay per stat | per stat; delay 10 min (0.05 min under ML); pets 5 min | per-stat delay | SkillCheck.cs 19, 25-27, 152-154, 457-462 |
| Stat gain (pub-45) | +1 stat on a skill gain | flat 5% per gain call; primary 75% when primary is Up, else secondary | 5% flat | per-stat delay | SkillCheck.cs 25, 284-307 |
| Stat atrophy | a stat +1 costs 1 point from another stat | atrophy if raw total / stat cap >= random, or when total is at cap; Str raise lowers Dex, else Int | 1 point per raise | total stat cap 225 | SkillCheck.cs 374, 382-389, 501 |
| Accelerated skill | temporary gain multiplier | gain amount x random 2 to 5 | window length not read | none | SkillCheck.cs 273-276 |
| Ninjitsu (animal form) | extra hits regen | points += Ninjitsu / 3 under Dog or Cat form | not read beyond this line | none | RegenRates.cs 80-83 |
| Luck | not read in this pass (luck is used in loot code, Misc/LootPack.cs, not opened) | (not read) | (not read) | (not read) | (not read) |
| Spell power, resistances, social skills | not read in this pass (magic lives in Spells/, not opened) | (not read) | (not read) | (not read) | (not read) |

Fast-fight read: the numbers that suit a fast mobile fight are the 1-4 tenth early gain, the 0.5 versus 0.2 hard-check bonus, and the 1 / (0.1 * (2 + points)) stamina curve. The 10-minute stat delay and the 225 stat cap are slow-game numbers; Frankendom would take the shape and set its own times as data.

Defects: none found in the read gain path (floor 0.01 and the cap clamp are present). Design hazard: atrophy can take a point from one stat on every raise (SkillCheck.cs 382-389). Fix: no swap in Frankendom; stats change only by a player choice.

simplified: the sketch is clean-room; it keeps the chance formula, amount, make-room, accelerate and cap clamp in the donor's order. It omits the region and anti-macro gates, faction loss, the pet check (kept as a multiplier only), stat delays, the pub-45 stat roll, and the atrophy swap (only the roll is kept). Units are tenths, as in the donor.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: success is decided by the caller, then the gain chance, then the make-room step before the amount is multiplied and the cap clamp runs. It omits region and anti-macro gates, faction loss, the pub-45 stat roll, stat delays, and the atrophy swap (only its roll is kept). Skill values are tenths of a point, as in the donor.

```ts
// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Skill values are tenths of a point (fixed point), as the donor's BaseFixedPoint and CapFixedPoint are.
interface Skill { base: number; cap: number; lock: "up" | "down" | "hold"; }
interface Learner { skills: Skill[]; totalCap: number; isPlayer: boolean; }

function totalOf(l: Learner): number {
  return l.skills.reduce((sum, s) => sum + s.base, 0);
}

// Chance that one use of a skill raises it. success = (chance >= roll) is decided by the caller.
export function gainChance(
  l: Learner, s: Skill, chance: number, success: boolean,
  gainFactor: number, aos: boolean, isPet = false,
): number {
  let gc = (l.totalCap - totalOf(l)) / l.totalCap;     // room left in the total budget
  gc += (s.cap - s.base) / s.cap;                       // room left in this skill
  gc /= 2;
  gc += (1 - chance) * (success ? 0.5 : aos ? 0 : 0.2); // hard checks are worth more
  gc /= 2;
  gc *= gainFactor;
  if (isPet) gc *= 2;
  return Math.max(gc, 0.01);
}

// Make room in a full budget: a player near the total cap lowers one "down" skill by the gain amount.
function makeRoom(l: Learner, target: Skill, toGain: number, rnd: () => number): void {
  if (!l.isPlayer || totalOf(l) / l.totalCap < rnd()) return;
  for (const other of l.skills) {
    if (other !== target && other.lock === "down" && other.base >= toGain) {
      other.base = Math.max(other.base - toGain, 0);
      return;
    }
  }
}

// One successful gain roll. Low skills gain 1 to 4 tenths; higher skills gain 1 tenth.
export function gain(l: Learner, target: Skill, rnd: () => number, accelerate = 1): void {
  if (target.base >= target.cap || target.lock !== "up") return;
  let toGain = target.base <= 100 ? 1 + Math.floor(rnd() * 4) : 1;
  makeRoom(l, target, toGain, rnd);
  toGain *= accelerate;
  if (!l.isPlayer || totalOf(l) < l.totalCap) {
    target.base = Math.min(target.base + toGain, target.cap);
  }
}

// Stat roll used by the legacy path: chance = statGain / 33.3 * multiplier.
export function statRollChance(statGain: number, multiplier = 1): number {
  return (statGain / 33.3) * multiplier;
}

// Atrophy: a stat gain swaps one point away from another stat when the raw stat total is near its cap.
export function atrophyRoll(rawStatTotal: number, statCap: number, rnd: () => number): boolean {
  return rawStatTotal / statCap >= rnd();
}

export {};
```

## 5. Lands in

- TARGET `src/fight/skills.ts` (new, engine progression step; the use-gain is the skill side of the XP award). Parity-checklist row 18 (loot roll and XP award; sub-line: server tick is not this row). The stamina and focus regen rows in section 3 belong to row 3 (guard/parry/stamina), but they are not in the sketch.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 1 (one combat core, two clients); SK focus item 8 (use-based skill gain); item 2 (stamina regen, section 3 only)

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism and was not translated line by line.
- One ledger: the gain roll and the budget must run on the server. A client that reports its own use would let a player grind skills; the roll belongs in the engine after the server verifies the hit.
- Grinding is the real risk here. ModernUO's answer is an anti-macro system (AllowGain, SkillCheck.cs 124 and 226-234), which is not read. Frankendom needs a per-fight gain cap or a rule that only hard, server-verified checks gain, and a test for it.
- Make-room lowers another skill with no player choice. Frankendom's rulings (one character, one ledger) would need an explicit player action before any skill drops.
- Stat atrophy (section 3) changes a stat without a player choice. Rejected for Frankendom (see decision).
- Zones as data: the budget (700), GainFactor per skill and the early-gain threshold are numbers a designer would set per class or encounter; they are data fields in the sidecar.
- Units: the donor works in tenths of a point and uses a random roll per use. Frankendom's replay (row 19) needs a seeded roll so a fight record reproduces the same gains.

Best transferable idea: a skill learned by use gains more often on hard checks and when there is room in both the skill and a fixed total budget, and it keeps the budget by lowering a skill the player has stopped training.
Decision (proposed): adapt - the gain chance and the make-room budget fit Frankendom's melee skill ladder (guard, parry, stance) and keep one budget per character; the stat atrophy swap is rejected because a stat must not move without a player choice.
Acceptance: a seeded server test over 10000 uses asserts that a parry which succeeds at chance 0.3 raises the parry skill more often than one that succeeds at chance 0.9, and that no skill ever exceeds its cap or the total budget.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: 1 (one combat core, two clients); SK focus item 8 (skill gain) and item 2 (stamina regen rows)
