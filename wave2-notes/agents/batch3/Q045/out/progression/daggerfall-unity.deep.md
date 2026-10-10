# daggerfall-unity (progression, cell 3)

Donor: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Entities/PlayerEntity.cs` | Licence: MIT (repo LICENSE, "Copyright (c) 2009-2023 Daggerfall Workshop") | C# | symbol `PlayerEntity.RaiseSkills` / `TallySkill` / `CheckForLevelUp` (formulas in `FormulaHelper`)

Checked: The hint was INFERRED (no file given), so I searched for the topic words (TallySkill, LevelUp, RaiseSkills, CalculatePlayerLevel, SkillUses) and found the mechanism in `PlayerEntity.cs` (not the hint). Read in full: `PlayerEntity.cs` 1240-1266 (TallySkill override), 1356-1415 (RaiseSkills), 1436-1501 (level sums, starting-sum estimate, CheckForLevelUp); `FormulaHelper.cs` 139-175 (bonus pool, RollMaxHealth), 316-354 (uses-to-advance, player level, hit-point roll); `DaggerfallDateTime.cs` 468-486 (classic minutes); `DaggerfallCharacterSheetWindow.cs` 366-392 (level-up apply) and 776-790 (progress label); `DaggerfallEntity.cs` 578-590 (base TallySkill, empty); `DaggerfallSkills.cs` 478-520 (advancement multipliers, partial: the table continues after 520, not read); `LICENSE` header. Callers (grep, lines only unless stated): RaiseSkills has 2 call sites, the rest window 731 and the travel popup 380 (grep-read, not opened in full); TallySkill has 33 matches including 2 definitions, and the 4 call sites checked are ClimbingMotor 828, EnemySenses 522 and 647, TalkManager 650 (grep-read); CheckForLevelUp has 1 call site, inside RaiseSkills (read); SetCurrentLevelUpSkillSum has 4 call sites (PlayerEntity 1388 read; StartGameBehaviour 425 and 578 and SerializablePlayer 297 grep-read); the ReadyToLevelUp setter in the Oghma effect is grep-read. Not read: the `PlayerReflexes` enum values, the career multiplier loader (`DFCareer.cs` 585, grep only), the rest of the multiplier table after 520, the stats rollout UI, the other TallySkill call sites. Notable: `EstimateStartingLevelUpSkillSum` has one caller in `Assets/`: `Serialization/SerializablePlayer.cs` 350, on load when `StartingLevelUpSkillSum` is 0 or less (found in the checker pass; the first-pass grep missed it). Confidence: high on the order of steps and the constants (each has a receipt); medium-high on "one level per pass" (read from the single `Level++` and the boolean flag; not run). Depth full: the end-to-end path from tally to level-up was read. camera_scope: n/a.

Best transferable idea: Count each skill use into a per-skill tally, settle the tally into a skill rise only at a gated checkpoint (rest or travel), and derive the character level from the sum of advanced skills rather than from kills.
Decision (proposed): adapt - take the tally, the threshold that scales with current value and level, and the level-from-sum rule, but tally only server-verified fight events (parries, dodges, blocks), and settle at a zone rest point, not on a timer. The 6-game-hour gap does not fit fast duels, so the gap becomes a rest-point rule.
Acceptance: A server test asserts that after 10 verified parries the parry tally rises by 10, that a skill rises by one only when the tally passes the threshold and then resets, that the level increases exactly when the sum of advanced skills passes 15 points above the starting sum, and that a second settlement inside the same rest does nothing.

## 1. Mechanism

- Use events tally, not level. A use calls `TallySkill(skill, amount)`. The override adds to the per-skill counter and clamps it to 0..20000 (`PlayerEntity.cs` 1243-1254). Use amounts differ by event: climbing 1 (`ClimbingMotor.cs` 828), a language use 3 on success where the donor comment says classic used 1 (`EnemySenses.cs` 522), stealth 1 (647), etiquette 1 (`TalkManager.cs` 650).
- Nothing settles per frame. `RaiseSkills` runs only from the rest window (`DaggerfallRestWindow.cs` 731) and the travel popup (`DaggerfallTravelPopUp.cs` 380).
- Gate, in order: return if the player is dying (`PlayerEntity.cs` 1363-1364); return if 360 or fewer classic minutes have passed since the last check (1367-1368). `ToClassicDaggerfallTime` returns minutes (`DaggerfallDateTime.cs` 472-478), so this is 6 game hours. The check time is stored before the loop (1370).
- Per skill, threshold: `uses needed = floor(value * multiplier * class multiplier * 1.04^level * 2/5 + 1)` (`FormulaHelper.cs` 325-326). The per-skill multiplier comes from `DaggerfallSkills.GetAdvancementMultiplier` (e.g. Medical 12 at 490, Jumping 5 at 495, Lockpicking 2 at 507, Dodging 4 at 520; the case lines are receipted). The class multiplier is set per class (custom-class formula, `CreateCharCustomClass.cs` 498).
- Reflexes: `scaled = (uses * (65536 - (reflexes - 2) * 8192)) >> 16` (`PlayerEntity.cs` 1377-1378). That is 1.0 at reflexes 2 and 0.125 per point either way; the enum values are not read.
- Rise: if scaled uses reach the threshold, uses reset to 0 first (1380-1382), then the value rises by 1 if it is below 100 and either below 95 or no primary skill is at 100 (1384-1386). The sum is refreshed (1388) and a popup shows. A primary skill reaching 100 plays a fanfare and a message (1390-1407).
- Level sum (`SetCurrentLevelUpSkillSum`, 1439-1475): all primary skill values, plus the major skills minus the lowest major, plus the highest minor.
- Level check (`CheckForLevelUp`, 1493-1501; called at 1413): `level = floor((current - starting + 28) / 15)` (`FormulaHelper.cs` 336). If level is below that, `readyToLevelUp` is set and the character sheet is posted to open (`PlayerEntity.cs` 1414).
- Level-up apply (`DaggerfallCharacterSheetWindow.cs` 370-392): bonus pool rolled 4 to 6 (`FormulaHelper.cs` 146-152), `Level++` once (379), max health gains a hit-point roll (380), then the flag clears (392). The roll is from half of the class hit points to the full class value, plus an endurance modifier, floored at 1 (`FormulaHelper.cs` 346-353).
- Oghma item effect sets `ReadyToLevelUp` directly (`OghmaInfiniumEffect.cs` 42). In the sheet, the Oghma branch uses its own bonus pool and skips `Level++` (`DaggerfallCharacterSheetWindow.cs` 376-383).
- Starting sum: `EstimateStartingLevelUpSkillSum` (1480-1488) estimates from `level + 0.5`, but keeps the current sum when the stored start is ahead of it. It is called on load, from `SerializablePlayer.cs` 350, when the stored starting sum is 0 or less.
- Tick: none per frame. This is a settlement at rest or travel, with a time gate.

## 2. Key functions

- `PlayerEntity.TallySkill` (override): `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Entities/PlayerEntity.cs` 1243-1266. Clamp of the tally to 0..20000.
- `PlayerEntity.RaiseSkills`: same file, 1359-1415. The gate, the per-skill threshold, the rise, the level check.
- `PlayerEntity.SetCurrentLevelUpSkillSum`: same file, 1439-1475. The level sum.
- `PlayerEntity.EstimateStartingLevelUpSkillSum` and `CheckForLevelUp`: same file, 1480-1501.
- `FormulaHelper.CalculateSkillUsesForAdvancement` and `CalculatePlayerLevel`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Formulas/FormulaHelper.cs` 319-337. Both have a mod override hook (`TryGetOverride`, 322 and 333).
- `FormulaHelper.BonusPool` and `CalculateHitPointsPerLevelUp`: same file, 140-153 and 340-354.
- `DaggerfallCharacterSheetWindow.UpdatePlayerValues`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/UserInterfaceWindows/DaggerfallCharacterSheetWindow.cs` 367-392.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Per-use tally with a cap | Cap 20000 (theirs, `PlayerEntity.cs` 1250-1251) |
| Gate settlement to a checkpoint with a minimum gap | 360 classic minutes = 6 game hours (theirs, 1367); settles only at rest or travel |
| Threshold that scales with value, multiplier and level | Factor 1.04 per level (theirs, `FormulaHelper.cs` 325); 2/5 scale and +1 (326); per-skill multipliers (12 Medical, 5 Jumping, 2 Lockpicking, 4 Dodging; theirs, `DaggerfallSkills.cs` 490, 495, 507, 520) |
| Fixed-point speed factor from a stat | 65536 base, 8192 per point from reflexes 2 (theirs, 1377-1378) |
| Mastery gate: above 95 a skill rises only if no primary skill is mastered | 95 and 100 (theirs, 1384) |
| Level from the sum of advanced skills | Base 28, step 15 (theirs, `FormulaHelper.cs` 336) |
| Bonus pool and hit-point roll on level-up | Pool 4 to 6 (theirs, 146-147); hit points from half to full class value, plus endurance, floor 1 (346-353) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: the dying gate is left out, the gap check comes first, then per skill: threshold from value, multiplier and level, reflexes factor, reset of uses before the cap test (as in the donor), then the rise and the level-sum refresh, then the level check. It omits the dying gate, the popups and fanfare, the Oghma branch, the stats rollout, the override hooks and the other TallySkill sites. It includes the starting-sum estimate (donor: run on load when the stored sum is 0 or less, SerializablePlayer.cs 350). The mastery test is evaluated per skill inside the loop, as the donor calls `AlreadyMasteredASkill()` for each skill (1384), so a primary skill that reaches 100 mid-pass blocks later skills at 95 or above in the same pass. The level sum is refreshed only when a skill rises (donor 1388), not again after the loop. It takes the random bonus roll and hit-point gain as inputs (the donor seeds from frame count). The donor's C# integer division in the level formula is written with `Math.floor`, which matches it only for non-negative numerators.

```ts
// Licence: MIT (donor LICENSE). Written fresh from the described mechanism, not a line-by-line translation.
type Skill = { value: number; uses: number; multiplier: number };
type Hero = {
  level: number;
  skills: Skill[];
  primary: number[];   // skill indexes
  major: number[];
  minor: number[];
  startingSum: number;
  currentSum: number;
  reflexes: number;    // 2 = neutral; the donor's enum values are not read
  readyToLevelUp: boolean;
  lastCheckMin: number; // classic game minutes at the last check
};

const USE_CAP = 20000;
const CHECK_GAP_MIN = 360;      // minimum game minutes between skill checks
const MASTER = 100;
const MASTER_GATE = 95;         // a skill below this may always rise; above it only if no primary skill is mastered
const LEVEL_BASE = 28;
const LEVEL_STEP = 15;
const LEVEL_GROWTH = 1.04;
const BONUS_MIN = 4, BONUS_MAX = 6;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

// Each use adds to a per-skill tally, capped.
function tally(h: Hero, skill: number, amount: number): void {
  h.skills[skill].uses = clamp(h.skills[skill].uses + amount, 0, USE_CAP);
}

// Uses needed to rise: grows with the skill value, its multiplier, the class multiplier and 1.04 per level.
function usesNeeded(value: number, multiplier: number, careerMult: number, level: number): number {
  return Math.floor(value * multiplier * careerMult * Math.pow(LEVEL_GROWTH, level) * 2 / 5 + 1);
}

// Reflexes as a 16.16 fixed multiplier: 1.0 at reflexes 2, each point 0.125 either way.
function reflexesMod(reflexes: number): number {
  return 0x10000 - ((reflexes - 2) << 13);
}

// Sum of primary skills, plus major skills minus the lowest major, plus the highest minor.
function currentLevelSum(h: Hero): number {
  const primary = h.primary.reduce((a, i) => a + h.skills[i].value, 0);
  const majorVals = h.major.map(i => h.skills[i].value);
  const major = majorVals.reduce((a, v) => a + v, 0) - (majorVals.length ? Math.min(...majorVals) : 0);
  const minorVals = h.minor.map(i => h.skills[i].value);
  const minor = minorVals.length ? Math.max(...minorVals) : 0;
  return primary + major + minor;
}

// Starting sum: keep the lower of the stored value and the current sum when the stored one is ahead; else estimate.
function estimateStartingSum(h: Hero): number {
  const estimatedLevel = h.level + 0.5;
  const estimated = -Math.trunc(estimatedLevel * LEVEL_STEP - (LEVEL_BASE + h.currentSum));
  if (h.currentSum > 0 && h.startingSum > h.currentSum) return h.currentSum;
  return estimated;
}

// Level implied by the sums; a level-up only flags the hero, the level itself is raised later in the UI.
function checkForLevelUp(h: Hero): boolean {
  const calculated = Math.floor((h.currentSum - h.startingSum + LEVEL_BASE) / LEVEL_STEP);
  const up = h.level < calculated;
  if (up) h.readyToLevelUp = true;
  return up;
}

// Donor AlreadyMasteredASkill: true when any primary skill is at 100 right now (evaluated per skill, not once per pass).
function alreadyMastered(h: Hero): boolean {
  return h.primary.some(i => h.skills[i].value === MASTER);
}

// Settle skill advancement once per gated check (called at rest or travel, not per frame).
function raiseSkills(h: Hero, nowMin: number, careerMult: number): boolean {
  if (nowMin - h.lastCheckMin <= CHECK_GAP_MIN) return false;
  h.lastCheckMin = nowMin;
  for (let i = 0; i < h.skills.length; i++) {
    const s = h.skills[i];
    const need = usesNeeded(s.value, s.multiplier, careerMult, h.level);
    const scaled = Math.floor((s.uses * reflexesMod(h.reflexes)) / 65536);
    if (scaled >= need) {
      s.uses = 0;                       // reset happens before the cap check, as in the donor
      if (s.value < MASTER && (s.value < MASTER_GATE || !alreadyMastered(h))) {
        s.value += 1;
        h.currentSum = currentLevelSum(h);
      }
    }
  }
  return checkForLevelUp(h); // donor: the sum was refreshed at each rise
}

// On the level-up screen: one level, a bonus pool roll, and a hit point gain. The roll is passed in.
function applyLevelUp(h: Hero, bonusRoll: number, hpGain: number): { bonusPool: number; maxHpGain: number } {
  h.level += 1;
  h.readyToLevelUp = false;
  return { bonusPool: clamp(bonusRoll, BONUS_MIN, BONUS_MAX), maxHpGain: hpGain };
}

export {};
```

## 5. Lands in

- TARGET `src/fight/progression.ts` (new module: skill-use tally, rest-point settlement, level from the skill sum). Parity-checklist row 18 (loot roll and XP award), the nearest row: the donor's level comes from skill use, not kills, so this is an adaptation of the row's XP side, not a copy of kill XP.
- The tally must be fed only by server-verified fight events (parries, dodges, blocks) and written into the one ledger.
- Reuse tag: rewrite-from-idea (MIT: code may be adapted; this sketch is still written fresh from the described mechanism).
- Brief rule served: 1 (one engine; progression written server-side); rules 7-9 n/a.

## 6. Gaps and risks

- The donor's level-up is client-side: the level increment happens in the character sheet (`DaggerfallCharacterSheetWindow.cs` 379). Frankendom must raise the level on the server and send it down; the Pit client must not change it.
- Many-on-one fights create many more uses per fight than a duel. The donor caps the tally at 20000 but has no per-fight cap. Frankendom needs a per-fight cap or a per-target rule (MAX_ATTACKERS = 3 limits the count, but the tally rule must still be set).
- One level per pass, by reading: a two-level jump gives one level at the sheet, and the second waits for the next accepted check, at least 360 minutes later (not run). Frankendom must decide whether a jump is taken in one step or several.
- The bonus roll is seeded from `Time.frameCount` (`FormulaHelper.cs` 151): not deterministic, so it cannot be used on the server as is. The sketch takes the roll as an input.
- The 6-game-hour gap is a world-clock rule. Fast duels have no such clock; the rest-point rule replaces it. The gap should be zone data, not an engine constant, if kept.
- Mods can replace the formulas through `TryGetOverride`. Frankendom should keep the constants as data with defaults, not as hooks.
- The estimate function is live in the donor: it runs on load when the stored starting sum is 0 or less (`SerializablePlayer.cs` 350). Frankendom should store the starting sum and not need an estimate; port it only if old saves must be repaired.
- Lockpicking, stealth and other tallies are per-use. Frankendom's guard and parry rules (parity row 3) are the candidate tallies; the rest of Frankendom's skill list was not read here.

Reuse tag: rewrite-from-idea (MIT; written fresh)
Brief rule served: 1 (one engine, server-side progression); rules 7-9 n/a


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** (1) FALSE: 'EstimateStartingLevelUpSkillSum has no caller in Assets/' (stated in header, mechanism and Gaps 'do not port as if live'). It is called from Serialization/SerializablePlayer.cs:350 when StartingLevelUpSkillSum <= 0 on load. (2) Sketch raiseSkills computes `mastered` once before the loop; donor calls AlreadyMasteredASkill() per skill (1384), so a primary skill reaching 100 mid-pass blocks later >=95 skills in the donor but not in the sketch (undisclosed). (3) Sketch re-computes currentSum after the loop (donor only refreshes at 1388 inside the rise) - harmless but undisclosed. Verified OK: TallySkill 1243-1255 cap 20000/floor 0, RaiseSkills 1359-1415 order, 360-minute gate (ToClassicDaggerfallTime returns minutes, DaggerfallDateTime 475), uses formula 1.04^level *2/5 +1 (FormulaHelper 325-326), reflexes 0x10000-((r-2)<<13)>>16, 95/100 mastery gate, level sum 1439-1475, CheckForLevelUp 1493-1501, level=(cur-start+28)/15 (336), bonus pool 4-6 (146-152, frameCount seed), HP roll 346-353, sheet 370-392, multipliers 12/5/2/4 at DaggerfallSkills 490/495/507/520, RaiseSkills callers rest 731/travel 380, TallySkill amounts (ClimbingMotor 828, EnemySenses 522=3, 647, TalkManager 650), MIT licence.

**Missed:** DaggerfallSkills table also has Running=50 and language skills=15 (very slow rise); SerializablePlayer.cs:350 shows the starting sum is re-estimated on load when missing.
