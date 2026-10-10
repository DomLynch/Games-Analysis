# ModernUO (progression, cell 10)

Donor: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Skills/SkillCheck.cs` | Licence: GPL-3.0 (LICENSE header: "GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007", copyright 2019-2020 ModernUO Development Team) | C# | symbol `CheckSkill`

Checked: Read `SkillCheck.cs` lines 1-505 in full (`CheckLocation`, `CheckTarget`, `CheckSkill`, `AllowGain`, `Gain`, `LegacyGain`, `GainStat`, `IncreaseStat`); read `Titles.cs` in full (the hint file: fame and karma awards, `ComputeKillAwards`, `AwardFame`, title tables, skill title index); read `Skill.NonRacialValue` in `Skills.cs` 231-320 (the chance input is `skill.Value`); read `Distribution/Data/skills.json` first rows for GainFactor and gain fields. Callers: 70 lines containing `CheckSkill(` in 40 files under `Projects/UOContent` (grep count, includes the definitions in `SkillCheck.cs`); read 2 (`CorpseSkin.cs` 70, `LockableContainer.cs` 22). Not read: `AntiMacroSystem.AntiMacroCheck` (the player gate inside `AllowGain`), `Region.AllowGain` base body, the skill-lock save format, `Skill.Info` values for every skill, the Pub45 vs legacy default (depends on the configured expansion, see section 3). Confidence: high on the order of the chance, gain and drain steps; medium on the default stat path, which is set by config. Camera: n/a (not a camera topic).
Best transferable idea: A skill rises by use: a success ramp between a min and max value, and a gain chance that falls as the skill nears its own cap and as the character nears a shared skill budget, so progression slows at the top with no level wall.
Decision (proposed): adapt - keep the success ramp and falling gain chance for two or three duel skills (parry, guard, dodge), rolled on the server and counted in the one ledger; drop the cross-skill drain and the stat atrophy, which move points between skills or stats in ways duel tuning cannot see.
Acceptance: A server test runs 1000 seeded parry attempts at a success chance of 0.5: parry points rise, gains stop once the shared budget is full, and an attempt below the min value gains nothing and rolls nothing.

## 1. Mechanism

- Entry: a call site asks for a check with `CheckSkill(skill, min, max)` (a location or target variant). The `Mobile` wrappers forward it to the handler (`Mobile.cs` 8091-8092), which runs `CheckLocation` or `CheckTarget`.
- Step 1, the success ramp. `value = skill.Value`. If `value < min`: fail, with no roll and no gain. If `value >= max` (or `min >= max`): succeed, with no roll and no gain (`CheckLocation`, lines 60-68; `CheckTarget` has the same ramp at 182-190). Otherwise `chance = (value - min) / (max - min)` (line 70) and `success = chance >= random` (line 115).
- Step 2, the gain gate (lines 118-148). Only if the character is alive and `region.AllowGain` passes. Skills below 10.0 always try to gain (lines 120-122), still inside the alive and region gate. Otherwise `AllowGain` must also pass (line 124; for players it calls the anti-macro check, which was not read, and under AOS it refuses during faction skill loss, `SkillCheck.cs` 226-234), then the gain chance is:
  - `gc = ((cap - total) / cap + (skillCap - base) / skillCap) / 2` (lines 126-129): room in the character's total-skill budget and room in this skill, averaged;
  - `gc += (1 - chance) * (0.5 on success, 0.2 on failure)` (line 130), so a hard try earns more;
  - `gc /= 2`, `gc *= GainFactor` (line 133), floored at 0.01 (lines 135-137), doubled for a controlled pet (lines 140-141);
  - if `gc >= random`, `Gain()` runs (line 145-147).
- Step 3, legacy stat gain (lines 151-154): if the Pub45 path is off and the check succeeded, `LegacyGain` rolls each stat with chance `statGain / 33.3 * multiplier` (line 19), and `GainStat` applies the per-stat cooldown.
- `Gain()` (lines 236-310): called only from `CheckSkill` (lines 122 and 147, grep). It returns early for a dead pet (238-241) and for the Focus skill on a creature (243-246), and does the skill step only when `base < cap` and the skill lock is Up (line 248). The step is 1 tenth of a point, or 1 to 4 tenths when base <= 10.0 (line 254). A player whose total is at the budget may pay for it: with chance `total / cap` the first lock-down skill with enough points loses the step (lines 259-268). An accelerated skill multiplies the step by 2 to 5 (line 275). A player only gains while total < cap (line 278). The step is added and clamped to the skill cap (line 280).
- Pub45 stat block (lines 284 to the end of `Gain` at 310; it sits inside `Gain`, so it runs only when `Gain` was called, not after every use): if the skill lock is Up (284) and an unlocked stat exists, a flat 5 percent roll (line 300), then the primary stat with 0.75 (line 303) or else the secondary, then `GainStat`.
- `GainStat` (lines 444-504): a per-stat cooldown (default 3 seconds on `Core.ML`, the Pub45 path, and 10 minutes on the legacy path, from `TimeSpan.FromMinutes(Core.ML ? 0.05 : 10)` at line 26; 5 minutes for pets; line 457 for Str, same shape for Dex and Int). Then `atrophy = rawTotal / statCap >= random` (line 501). `IncreaseStat` forces atrophy at or over the stat cap (line 374), lowers another stat by 1 when the lock allows, and raises this stat by 1 clamped to the stat max (line 394).

## 2. Key functions

- `CheckSkill`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Skills/SkillCheck.cs` 108-159. The success roll, the gain gate, the gain roll and the legacy stat call, in that order.
- `CheckLocation` and `CheckTarget`: same file, 56-75 and 178-195 (checked for the ramp only: lines 60-70 and 182-192).
- `Gain`: same file, 236-310 (skill step at 248-281, then the Pub45 stat roll at 284-310).
- `GainStat` and `IncreaseStat`: same file, 372-504 (cooldown, atrophy, clamp).
- `Titles.AwardFame` (second mechanism, from the hint file): `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Misc/Titles.cs` 133-160. A fame award is reduced by current fame / 100 before it is clamped to 0 to 15000 (line 142 and 151). Fame does not grow linearly: the more fame, the less each award gives.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Linear success ramp between a min and max value; below min always fails, at or above max always succeeds, no roll in either case | min and max are per call site (e.g. `CorpseSkin.cs` 70 uses 0.0 to 120.0; `LockableContainer.cs` 22 uses -5.0 to 15.0) |
| Gain chance = average of budget room and skill room, plus a bonus for hard tries, then scaled | 0.5 on success, 0.2 on failure, 0 on failure under AOS (`SkillCheck.cs` 130); floor 0.01 (135-137); GainFactor per skill (133; the first three rows of `Distribution/Data/skills.json` carry 1) |
| Shared budget: a player at the cap may pay for a gain by lowering a lock-down skill | Cap per character is set in the `Skills` constructor (`Skills.cs` 463, `Cap = 7000;`, not receipted: 11-character line) |
| Step of 1 tenth, or 1 to 4 tenths below 10.0 | `Utility.Random(4) + 1` (`SkillCheck.cs` 254) |
| Accelerated skill multiplies the step | 2 to 5 (`SkillCheck.cs` 275) |
| Stat gain: per-stat cooldown and an atrophy chance that rises with the stat total | Cooldown 3 seconds on `Core.ML`, 10 minutes legacy (line 26, `Core.ML ? 0.05 : 10`), pets 5 minutes (line 27); stat max 100, 125 on LBR (line 23); primary stat 0.75 (line 25); Pub45 flat 0.05 (line 300); legacy `/33.3` (line 19); stat total cap default 225 (`Mobile.cs` 7826, not receipted: short line) |
| Fame awards shrink as current fame grows | `fame / 100` subtracted from the award (`Titles.cs` 142); MaxFame 15000 (line 11) |

Default stat path: `_usePub45StatGain` defaults to `Core.ML`, and `Core.ML` is `Expansion >= Expansion.ML` (`Main.cs` 336). So the stat path depends on the configured expansion. The comment "Gain one stat per 10 minutes" (line 28) and the 10-minute delay describe the legacy path only; in the legacy path the stat roll also needs a success, and the cooldown is per stat.

## 4. TypeScript sketch

simplified: the sketch covers the success ramp, the gain chance, the step with the shared budget and the lock-down drain, and the stat helpers (not called from `useSkill`). It uses the base points only where the donor uses `skill.Value` (base plus stat offset plus skill mods, `Skills.cs` 231-320). It omits: the alive and region and anti-macro gates (`AllowGain`), the AOS failure rule (uses the non-AOS 0.2), the pet doubling, the accelerated multiplier, the Pub45 stat roll, the cooldown and atrophy inside the stat helpers (they are standalone), the dead-pet and Focus-on-creature early returns in `Gain`, the skill-cap-zero early return, and the stat-to-skill offset. It reorders nothing else: the order is ramp, gain roll, then step.

```ts
// Licence: GPL-3.0 (donor, ModernUO LICENSE). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Skill { base: number; cap: number; factor: number; lockUp: boolean; lockDown: boolean; } // base and cap in tenths of a point
interface Ledger { skills: Skill[]; totalCap: number; }        // one budget shared by all skills of one character

const total = (l: Ledger): number => l.skills.reduce((sum, k) => sum + k.base, 0);

// Gain chance for one try: budget room and skill room averaged, plus a bonus for hard tries, then scaled.
export function gainChance(l: Ledger, s: Skill, chance: number, success: boolean): number {
  let gc = (l.totalCap - total(l)) / l.totalCap;
  gc += (s.cap - s.base) / s.cap;
  gc /= 2;
  gc += (1 - chance) * (success ? 0.5 : 0.2);
  gc /= 2;
  gc *= s.factor;
  return Math.max(gc, 0.01);
}

// One step of gain. A player at the budget cap pays for it by lowering one lock-down skill.
export function applyGain(l: Ledger, s: Skill, rnd: () => number, isPlayer: boolean): void {
  if (s.base >= s.cap || !s.lockUp) return;
  const step = s.base <= 100 ? 1 + Math.floor(rnd() * 4) : 1; // 1 to 4 tenths below 10.0, else 1 tenth
  if (isPlayer && total(l) / l.totalCap >= rnd()) {
    const donor = l.skills.find(k => k !== s && k.lockDown && k.base >= step);
    if (donor) donor.base = Math.max(donor.base - step, 0);
  }
  if (!isPlayer || total(l) < l.totalCap) s.base = Math.min(s.base + step, s.cap);
}

// One use of a skill. Below min: fail, no roll. At or above max: success, no gain roll.
export function useSkill(l: Ledger, s: Skill, min: number, max: number, rnd: () => number, isPlayer: boolean): boolean {
  const value = s.base / 10;
  if (value < min) return false;
  if (value >= max || min >= max) return true;
  const chance = (value - min) / (max - min);
  const success = chance >= rnd();
  if (s.base < 100) applyGain(l, s, rnd, isPlayer);                  // below 10.0 always gains
  else if (gainChance(l, s, chance, success) >= rnd()) applyGain(l, s, rnd, isPlayer);
  return success;
}

// Stat side (not called above): one stat per cooldown, and the chance to trade a point away near the stat cap.
export function canStatGain(lastMs: number, nowMs: number, delayMs: number): boolean {
  return !(lastMs + delayMs >= nowMs);
}
export function statAtrophyChance(rawTotal: number, statCap: number, rnd: () => number): boolean {
  return rawTotal / statCap >= rnd();
}
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/q044-progression-skill-use.ts`: exit 0.

## 5. Lands in

- TARGET `src/fight/progression.ts` (new module, proposed): use-based skill points for duel skills, rolled by the server and stored in the one ledger. Parity-checklist row 18 (loot roll and XP award), as the skill-gain analogue of the XP award; the server-tick sub-line is not involved.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room, shape only)
- Brief rule served: 18 (XP and progression in the one ledger, rolled on the server); rules 7-9 n/a

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism, and the donor's own shape (ramp, gain chance, budget drain) is not copied line for line.
- Use-based gain is a random roll per try. Frankendom must roll on the server from a seeded RNG recorded in the fight record (row 19), or replays and tests will disagree.
- The shared budget is a good fit for "one ledger", but the donor's drain (lowering a different skill to pay for a gain) moves points between skills. Port it only if the rulings let a duel skill go down; otherwise drop it.
- The stat atrophy trades one stat for another. Do not port it unless duel stats are meant to move; if they are fixed per character, reject it. Either way a silent trade would be invisible in the fight record unless it is logged.
- The donor gates gain by place (`region.AllowGain`, the jail region returns true only for staff: `JailRegion.cs` 23) and by an anti-macro system that was not read. A duel farm could need the same gate, but the donor's version is not read and must not be copied blind.
- A skill-up on use rewards repetition. A duel that is farmed against a weak target would raise the skill fast. The donor's answer is the anti-macro check (not read). Frankendom needs its own cap per opponent, or the rule must sit with the zone population caps (row 23).
- The donor's stat path depends on the expansion flag (`Core.ML`, `Main.cs` 336). Frankendom must pick one path and test it; there is no second config.
- `Titles.cs` fame awards shrink as fame grows. That is a fair idea for reputation, but it is not in the duel brief and was not sketched.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: 18 (progression and XP in one ledger, server roll)


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** (1) Step 1 ramp cited at SkillCheck.cs 62-67; real lines are CheckLocation 60-68 (and CheckTarget 182-190). (2) Mechanism says GainStat cooldown is 10 minutes, but the default path is Pub45 on Core.ML, where the delay is TimeSpan.FromMinutes(Core.ML ? 0.05 : 10) at line 26, i.e. 3 s; the 10 min figure is the legacy path only (the table cell shows the ternary but the bullet and 'Best idea' text do not). (3) Gain() early returns for dead pets (238-241) and Focus on creatures (243-246) not mentioned. All other numbers verified: 0.5/0.2/0 AOS, 0.01 floor, pet x2, Random(4)+1 at 254, 2-5 accel at 275, total/cap drain 259, 0.05 at 300, 0.75 at 303, /33.3 at 19, statMax 125/100 at 23, Cap=7000 Skills.cs:463, StatCap 225 Mobile.cs:7826, Titles fame/100 at 142/151, MaxFame 15000, JailRegion.cs:23, CorpseSkin 70, LockableContainer 22, 70 CheckSkill( lines in 40 files; sketch order matches donor.

**Missed:** Gain() guards for dead pet and Focus; Pub45 gate also needs skill.Lock==Up (284)
