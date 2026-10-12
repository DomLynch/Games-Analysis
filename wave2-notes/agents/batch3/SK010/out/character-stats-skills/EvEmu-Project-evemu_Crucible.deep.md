# EvEmu-Project-evemu_Crucible (character-stats-skills, cell 21)

Donor: `/mnt/frankendom-donors/EvEmu-Project-evemu_Crucible/src/eve-common/utils/EvEMath.cpp` (with `EvEMath.h`, `src/eve-server/character/Skill.cpp`, `src/eve-server/character/Character.cpp`) | Licence: mixed. `Skill.cpp` header: GNU Lesser General Public License, "either version 2 of the License, or (at your option) any later version" (lines 10-11), so LGPL-2.0-or-later. `EvEMath.h` and `EvEMath.cpp` carry no licence block (checked: no "licen" match in either file); the header says the formulas are "pulled directly from http://wiki.eve-id.net/Equations" (EvEMath.h:6). Treat this mechanism as unclear: clean-room, shape only | C++ | symbol `EvEMath::Skill::EndTime` (training end time from attribute-based rate)

Checked: Read in full: `EvEMath.cpp` 17-51 (PointsAtLevel, LevelForPoints, PointsPerMinute, StartTime, EndTime), `EvEMath.h` 19-31 (constants and signatures), `Skill.cpp` 72-139 (GetLevelForSP, GetSPForLevel, GetCurrentSP, GetRemainingSP, GetTrainingTime), `Character.cpp` 559-563 (GetSPPerMin) and the EndTime callers at 794, 970, 980. Call check: `LevelForPoints` is called from `Skill::GetLevelForSP` (Skill.cpp:73); `GetSPForLevel` from Character.cpp 789-863 and 925. Confidence: high for the formulas (read end to end; the arithmetic in section 3 is from the code). Data read: `sql/base/dgmTypeAttributes.sql.gz` (attribute 275 rank, 180 primary and 181 secondary attribute for the 426 skill types; attribute ids mapped by AttributeEnum.h:156-172; counts for 180 and 181 cover both the int and float columns) and `sql/base/sklBaseSkills.sql.gz` (9 starting skills, not used for rates). Not read: the skill-queue management in full (Character.cpp 780-1000 only at the EndTime lines), `AttributeEnum.h` multiplier values (names only: lines 208-232), the attribute base values (`chrAttributes` and `chrCharacterAttributes` dumps not read), the API code (APICharacterManager uses its own names), and the combat, invention and industry formulas beyond the names. No luck stat exists in this tree (a search for "luck" finds only a failure message and author names). camera: not a camera topic.

Best transferable idea: Skill points accrue at a rate set by two attributes (primary plus half the secondary, per minute), and the server stores an end time computed from that rate instead of ticking progress.
Decision (proposed): adapt — use the attribute-rate and stored-end-time pattern for non-combat progression (crafting, unlocks, class training that runs while offline); do not use it for in-fight stats (duels are engine ticks, not wall-clock waits); fix the integer divisions in section 6.
Acceptance: A player queues a 100 SP skill at 27 SP per minute and the screen says done in 4 minutes (the donor's arithmetic would say 3); a server test asserts that 1415 SP at rank 1 reports level 2 (the donor reports 1) and that a skill already at its target returns end time 0.

## 1. Mechanism

Progression is points, not kills. Each skill has a time constant (rank) and two attributes. The engine converts the attributes to a rate, the rate turns a remaining SP gap into minutes, and the server keeps a start and end time instead of ticking. Order of steps:

(a) Rate. SP per minute = primary + 0.5 x secondary, stored in a uint8 (EvEMath.cpp:36-38). The attributes come from the character (Character.cpp:561-562).

(b) Level thresholds. SP needed to reach level L at rank r = ceil(250 x r x sqrt(32)^(L-1)) (EvEMath.cpp:21-22). Level is capped at 5 (EvEMath.h:19). Rank 1, by the formula: level 1 at 250 SP, level 2 at 1415 (250 x 5.657, rounded up), level 3 at about 8000, level 5 at about 256000 (250 x 32^2; float rounding in pow can add 1 at these two).

(c) Level from points (inverse). The donor computes baseSLC = rank x 250, then ret = log(currentSP / baseSLC) / DIVCONSTANT + 1, where DIVCONSTANT = ln2 x 2.5 = ln(sqrt(32)) (EvEMath.cpp:27, 32; EvEMath.h:21). The division currentSP / baseSLC is integer division, so the log sees a truncated ratio (section 6).

(d) Training end time. If current SP >= next-level SP, the end is 0 (EvEMath.cpp:48). Otherwise end = now + ((next - current) / SPM) x minute, with the division in integers (EvEMath.cpp:50). Start time is the mirror image (43). The queue stores this end time (Character.cpp:794, 970, 980).

(e) Progress while logged out or between reads. `Skill::GetCurrentSP` adds (elapsed seconds / 60) x SPM, so SP accrues in whole minutes (Skill.cpp:101). The function carries a comment "@todo this isnt completely right" (Skill.cpp:96).

(f) Remaining and time left. `GetRemainingSP` subtracts (timeLeft / 60) x SPM from the remaining SP when more than a minute is left (Skill.cpp:125). `GetTrainingTime` returns (remaining SP / SPM) x 60 seconds, again in integer steps (Skill.cpp:139).

(g) Training-time multipliers per attribute (AttributeEnum.h:208-217) and the skill-training time bonus (AttrSkillTrainingTimeBonus, 322) exist as attribute names. The formulas that use them were not read; the rate in (a) does not include them.

## 2. Key functions

- `EvEMath::Skill::PointsAtLevel` (EvEMath.cpp:17-23): SP threshold per level.
- `EvEMath::Skill::LevelForPoints` (EvEMath.cpp:25-34): level from SP (integer division defect).
- `EvEMath::Skill::PointsPerMinute` (EvEMath.cpp:36-39): SPM.
- `EvEMath::Skill::StartTime` / `EndTime` (EvEMath.cpp:41-51): time from rate.
- `Skill::GetSPForLevel` (Skill.cpp:76-78) and `Skill::GetLevelForSP` (Skill.cpp:72-74): wrappers that pass the skill's time constant as rank.
- `Skill::GetCurrentSP` (Skill.cpp:80), `GetRemainingSP` (110), `GetTrainingTime` (130): progress and time left.
- `Character::GetSPPerMin` (Character.cpp:559-563): attribute lookup for the rate.

## 3. Numbers vs mechanism

Stat table (name | what it does | formula | number ranges | caps | file:line). Data values come from `sql/base/dgmTypeAttributes.sql.gz` (read: attribute 275 for 426 skill types, 180 and 181 for all 426 skill types: 386 hold the value in valueInt and 40 in valueFloat, counted from both columns). Character attribute base values were not read.

| name | what it does | formula | number ranges | caps | file:line |
|---|---|---|---|---|---|
| primary attribute | sets most of the training rate | SPM = primary + 0.5 x secondary (truncated to uint8) | attribute id 180 in data (all 426 rows): 164 charisma (38 skill types), 165 intelligence (157), 166 memory (78), 167 perception (124), 168 willpower (29) | uint8 result | EvEMath.cpp:36-38; Character.cpp:561-563; dgmTypeAttributes (180) |
| secondary attribute | half-weight part of the rate | as above | attribute id 181 in data (all 426 rows): 164 charisma (29), 165 intelligence (52), 166 memory (156), 167 perception (48), 168 willpower (141) | uint8 | Character.cpp:562; dgmTypeAttributes (181) |
| skill time constant (rank) | scales SP per level | used as rank in thresholds | attribute 275 in data: 426 skill types, values 0.01 to 42; counts for 1, 2, 3, 4, 5 are 67, 67, 66, 39, 92 | uint8 when passed to LevelForPoints | Skill.cpp:73, 77; dgmTypeAttributes (275) |
| SP multiplier | base SP unit | 250 x rank | 250 (constant) | none | EvEMath.h:20 |
| level cap | highest trained level | min(level, 5) | 1-5 | 5 | EvEMath.h:19; EvEMath.cpp:19-20 |
| SP per level | SP to reach level L | ceil(250 x rank x sqrt(32)^(L-1)) | rank 1 by formula: 250, 1415, about 8000, about 45255, about 256000 (L=1..5) | level 5 | EvEMath.cpp:21-22 |
| level from SP | current level | floor(log(SP / (250 x rank)) / ln(sqrt(32)) + 1), SP-to-base in integers | 0 below base; 1 to 5 | 5 | EvEMath.cpp:25-33; EvEMath.h:21 |
| training end time | when the next level finishes | now + ((next - current) / SPM) minutes, integer division | minutes; 0 when already at target | none | EvEMath.cpp:46-50; Character.cpp:794, 970, 980 |
| training start time | back-dated start | now - ((next - current) / SPM) minutes | minutes | none | EvEMath.cpp:41-43 |
| SP gained so far | progress during training | floor(elapsed seconds / 60) x SPM | whole minutes | none | Skill.cpp:101 |
| remaining SP | SP left to the next level | SP for level minus current; less (timeLeft / 60) x SPM when more than a minute left | as above | uint32 (can wrap; not checked) | Skill.cpp:125 |
| training time | seconds left | (remaining SP / SPM) x 60 | seconds | uint32 | Skill.cpp:139 |
| training-time multipliers | per attribute, plus a bonus | names only (AttrIntelligenceSkillTrainingTimeMultiplier = 224 etc.) | not read | not read | AttributeEnum.h:208-232 |
| luck | none | no luck attribute; the only word is a failure message for invention | n/a | n/a | RamProxyService.cpp:739 (message) |
| level for a combat skill | not in this donor's skill maths | n/a | n/a | n/a | not read (combat not in this cell) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: rate from the two attributes, level thresholds, level from points, end time from the rate, progress in whole minutes. It fixes the integer division in the inverse and the minute truncation in the end time (section 6). It omits the start-time mirror, the queue, the training-time multipliers, the attribute remap, the `uint32` wrap in the remaining-SP subtraction, and the zero-rate guard's message. The constants are the donor's (EvEMath.h:19-21).

```ts
// Licence: LGPL-2.0-or-later (donor Skill.cpp header); EvEMath.h/.cpp carry no licence block. clean-room sketch written from the described mechanism only, not a translation of the donor lines.
// clean-room
const MAX_LEVEL = 5;                          // EvESkill::MAXSKILLLEVEL (EvEMath.h:19)
const SP_MULTIPLIER = 250;                    // EvESkill::skillPointMultiplier (EvEMath.h:20)
const LEVEL_STEP = Math.sqrt(32);             // pow(sqrt(32), level - 1) (EvEMath.cpp:21)
const LN_LEVEL_STEP = Math.log(LEVEL_STEP);   // equals DIVCONSTANT = ln2 x 2.5 (EvEMath.h:21)

// SP needed to reach `level` at a rank (time constant). Donor: ceil(250 x rank x sqrt(32)^(level-1)).
function spForLevel(level: number, rank: number): number {
  const L = Math.min(level, MAX_LEVEL);
  return Math.ceil(SP_MULTIPLIER * rank * Math.pow(LEVEL_STEP, L - 1));
}

// Level reached for an SP total. The donor divides SP by the base in integers before the log (EvEMath.cpp:32);
// this version keeps the division real, so 1415 SP at rank 1 gives level 2 (the donor gives 1).
function levelForSp(sp: number, rank: number): number {
  const base = SP_MULTIPLIER * rank;
  if (base <= 0 || sp < base) return 0;
  const lvl = Math.floor(Math.log(sp / base) / LN_LEVEL_STEP) + 1;
  return Math.min(lvl, MAX_LEVEL);
}

// SP per minute from the primary and secondary attributes: primary + secondary / 2 (EvEMath.cpp:38).
function spPerMinute(primary: number, secondary: number): number {
  return Math.floor(primary + 0.5 * secondary);
}

// Minutes until `target` SP at a fixed rate. The donor divides integers, which drops a partial minute;
// this version rounds up. Zero rate is refused here (the donor divides by it).
function minutesToTarget(current: number, target: number, spm: number): number {
  if (current >= target) return 0;
  if (spm <= 0) return Infinity;
  return Math.ceil((target - current) / spm);
}

// End time from the rate alone: no tick loop. The server stores this and reads it back.
function endTimeMs(current: number, target: number, spm: number, nowMs: number): number {
  const m = minutesToTarget(current, target, spm);
  if (m === 0) return 0;
  return nowMs + m * 60000;
}

// SP gained in a training run, counted in whole minutes (as the donor does at Skill.cpp:101).
function spGained(elapsedMs: number, spm: number): number {
  const minutes = Math.floor(elapsedMs / 60000);
  return minutes * spm;
}

const lvlA = levelForSp(1415, 1);      // 2
const lvlB = levelForSp(1414, 1);      // 1
const need2 = spForLevel(2, 1);        // 1415
const m = minutesToTarget(0, 100, 27); // 4
export { lvlA, lvlB, need2, m, spPerMinute, endTimeMs, spGained };
```

Typecheck: `tsc --noEmit --strict --target es2020` run on the VPS (`/tmp/SK010-evemu-training.ts`, the same block): exit 0.

## 5. Lands in

TARGET `origins/server/skill-training.ts` (new module: attribute-rate training, level thresholds, stored end times for non-combat progression). It runs on the server with no tick loop, so the end time is a value the client reads, not a timer the client runs. Parity-checklist row 21 (catalogue fields): the primary and secondary attributes, the rank and the SP curve are catalogue fields with a data source.

## 6. Gaps and risks

- Licence: LGPL-2.0-or-later for Skill.cpp; EvEMath has no licence block and cites an external wiki. Clean-room, shape only. Do not copy the formulas' text; the constants are written from the code and the wiki reference should be checked before reuse.
- Defect, integer division in the inverse: `log(currentSP / baseSLC)` divides first (EvEMath.cpp:32). At rank 1, 1415 SP is level 2 by the threshold (250 x sqrt(32) rounded up), but the code reads level 1 because 1415 / 250 = 5 in integers. Fix: keep the division real (the sketch does) and test the boundary values 1414 and 1415.
- Defect, rank truncation: `GetLevelForSP` passes the rank through `get_uint32()` into a `uint8 rank` parameter (Skill.cpp:73; EvEMath.h:31), while `GetSPForLevel` uses the float (Skill.cpp:77). Any rank below 1 (data has values from 0.01) truncates to 0, so baseSLC is 0 and `LevelForPoints` returns 0 for those skills, and fractional ranks above 1 lose their fraction. Fix: pass the rank as a float to both (the sketch does).
- Defect, minute truncation: end time uses integer (SP remaining / SPM) (EvEMath.cpp:50) and training time uses (remaining / SPM) x 60 (Skill.cpp:139). A partial minute is dropped, so 100 SP at 27 SP/min shows 3 minutes instead of 4. Fix: ceil the minutes (the sketch does) and use the same rule in every caller.
- Defect, zero rate: both EndTime and StartTime divide by SPM (EvEMath.cpp:43, 50). SPM is primary + secondary / 2, so a character with both attributes at 0 would divide by zero. Whether attributes can be 0 was not checked. Fix: a guard (the sketch returns infinity).
- Defect, uint32 wrap: `GetRemainingSP` subtracts a float from a uint32 (Skill.cpp:125). If the subtraction goes below zero the value wraps. Not checked whether the caller clamps first. Fix: clamp at 0 before the subtraction.
- The donor's own comment says progress is "not completely right" (Skill.cpp:96). Keep the whole-minute progress only if the end time uses the same rule (the sketch does this).
- Frankendom ruling: the end time is server-verified and stored; the client reads it. Do not put a training timer in the duel loop. Combat stats are engine ticks, and the wall-clock rate is for non-combat progression only.
- Data: the rank and attribute columns were read from the dump (dgmTypeAttributes). Two things are not: the character attribute base values (`chrAttributes`) and the training-time multipliers (AttributeEnum.h names only). Rank values run from 0.01 to 42, so a Frankendom catalogue needs a range check. Frankendom authors its own values as catalogue data.
- Not read: the skill queue in full (Character.cpp), the API, the attribute remap, and the combat and invention formulas beyond their names.

Reuse tag: rewrite-from-idea (LGPL-2.0-or-later and an unlicensed formula file; clean-room only)
Brief rule served: 1 (one engine: the training rate and end time are computed on the server; the client only displays them); the parity row is 21 (catalogue fields), and the table above is the catalogue input (SK-FOCUS items 1, 8 and 9).

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- Error: attribute 180/181 counts covered only the 40 float-column rows. Recounted from the dump: both attributes have 426 rows (386 in valueInt, 40 in valueFloat). 180: 164:38, 165:157, 166:78, 167:124, 168:29; 181: 164:29, 165:52, 166:156, 167:48, 168:141. Confirmed and fixed; the rank (275) counts were right.
- Missed: rank is cast to uint8 in GetLevelForSP (Skill.cpp:73), so ranks below 1 make LevelForPoints return 0. Added as a defect with fix.

Fixed 2026-10-12: data-read line, attribute 180/181 table rows, rank-truncation defect added. Sketch unchanged (it already uses a real rank).
