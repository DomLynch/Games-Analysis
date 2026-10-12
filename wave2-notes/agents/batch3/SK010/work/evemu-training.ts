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
