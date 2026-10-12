# TurningWheel-Barony (character-stats-skills, cell 3)

Donor: `/mnt/frankendom-donors/TurningWheel-Barony/src/entity.cpp` (functions `Entity::increaseSkill`, `Entity::attack` combat-hit skill gain, `playerStatIncrease`, level-up block) with data in `/mnt/frankendom-donors/TurningWheel-Barony/src/monster.hpp` (`classStatGrowth`) and `/mnt/frankendom-donors/TurningWheel-Barony/src/stat.hpp` | Licence: BSD-2-Clause (`LICENSE.txt` line 3, "This open source release of Barony is licensed under the BSD 2-Clause License:"; Copyright Turning Wheel LLC 2013-2020) | C++ | symbol `playerStatIncrease`

Checked: Read in full: `Entity::increaseSkill` (2464-2530 region; cap at 2504-2506; stat link at 2716-2722), the combat skill-gain block in `Entity::attack` (13148-13268: eligibility 13148-13176, crystal 13189-13212, kill 13213-13243, plain hit 13244-13267); the object-destruction branch at 12060-12152 was also read and is a different rule (see section 1), the level-up XP block (4062-4080), the player stat-pick branch (4280-4345 region, the 4311-4313 bonus roll), `getStatForProficiency` (20950-20990), `playerStatIncrease` (26205-26340), `classStatGrowth` table (monster.hpp 566-592), `stat.hpp` proficiency and skill-level constants (172-203). Not read: `local_rng.discrete` implementation (assumed weighted draw), `MAX_PLAYER_STAT_VALUE`, the class-to-index mapping of `client_classes`, the rest of `increaseSkill` (milestone messages, compendium events), the other proficiency gain sites (`item_tool.cpp`, `magic/`), and damage and accuracy formulas. Callers of `increaseSkill` were checked by grep (about 20 sites); the combat-hit callers (13203-13266) and the object-destruction caller (12154) were read. Confidence: high for the combat gain rates, cap, XP-to-level and the weighted picks (the picks were simulated on the VPS with 20,000 seeded trials); medium for the bonus-roll rate, which follows from the per-pick loop I read. camera_scope: not applicable (not camera).

Best transferable idea: Level up by three stat picks drawn from a per-class weight row (first pick uniform, the next two weighted without replacement), so a class's growth shape is a 6-number data row and no two picks repeat.
Decision (proposed): adapt — keep the weighted picks and the use-based combat skill gain (per hit 1 in 10, killing hit 1 in 8, crystal weapon 1 in 6), make the class weight rows catalogue data, and replace the trained-stat bonus with an explicit flag and a stated rate. Drop the race multipliers until Frankendom has a race ruling.
Acceptance: A server test: a level-up for weights {7,2,6,1,2,6} returns three distinct stats in every trial; over 20,000 seeded level-ups the Warrior's STR is picked most often and CHR is picked more often than INT; a 250 XP award at level 1 ends at level 3 with 50 XP (the donor gets there one level per tick; the engine may do it in one step); a combat hit test shows gain rates of 1 in 10 (hit), 1 in 8 (kill), 1 in 6 (crystal weapon) and no gain against a dummy at proficiency 20 or above.

## 1. Mechanism

- Use-based proficiency gain in combat (`Entity::attack`, 13148-13268). Eligible when the attacker is a player and the target is not an ally, another player, a stasis target or a turret other than a dummy bot (13148-13176). Per landed hit with a melee, unarmed or whip weapon (13186-13187): a crystal weapon gives 1 in 6 (13195, 1 in 10 for a goblin), checked first whether or not the hit kills; otherwise a killing hit (`hitstats->HP <= 0`) gives 1 in 8 (13213-13221, 1 in 12 for a goblin); otherwise a plain hit gives 1 in 10 (13246-13252, 1 in 14 for a goblin). A flail swing multiplies the plain and kill odds by 4 (13229-13232, 13254-13257). A training dummy (DUMMYBOT) only teaches while the proficiency is below Basic 20 (13206, 13237, 13261). There is no Basic gate on other targets. Then `increaseSkill` adds one point (cap in the next bullet).
- A separate, smaller rule: destroying an object (decoration, chest, door, mimic or furniture; the HP variable at 12060-12066) with a weapon at zero HP, when the target was alive before the hit (`oldHP > 0`, 12145), gives a player attacker a 1-in-20 roll only while the proficiency is below `SKILL_LEVEL_BASIC` (20, `stat.hpp:196`; 12151-12152). It does not apply to killing monsters.
- `increaseSkill` (2464): adds 1 when the proficiency is under 100 (2504-2506); each point also posts a message, a skill-up animation and compendium events; milestone messages at 20, 40, 60, 80 and 100 (not read in full). It then links the trained proficiency to a stat: `getStatForProficiency(skill)` (2716) and `PLAYER_LVL_STAT_BONUS[statBonusSkill] = skill` (2722). The stored value is the last proficiency that trained that stat, and -1 means none (`stat.cpp:463`).
- Stat-to-proficiency map (`getStatForProficiency`, 20950-20990): STR for sword, mace, axe, polearm, unarmed; DEX for stealth and ranged; CON for shield and thaumaturgy; INT for sorcery and mysticism; PER for alchemy and lockpicking (20976; `stat.hpp:172` says lockpicking is dex, a comment mismatch, the code wins); CHR for trading and leadership.
- XP to level: a fixed 100 XP per level (`expToLevel = 100`, 4062). At 4065 the check is `if` (one level per check): subtract 100, add a level while below 255 (4070-4072). The block sits in `Entity::handleEffects` (starts 3810), called every tick for players and monsters (actplayer.cpp:10759, actmonster.cpp:3627), so a large award levels one per tick and no XP is stranded. Spell MP increments for three casting skills follow (not read in full).
- Level-up stat picks (player branch, 4114): `playerStatIncrease(client_classes[player], increasestat)` (26205). The class weight row is loaded (26207) from `classStatGrowth` (monster.hpp 566-592; 26 rows, each summing to about 24 per the comment at 568-569). Shapeshift forms replace the class row entirely: RAT {1,6,1,3,1,1}, SPIDER {1,1,3,1,6,1}, TROLL {6,1,3,1,1,1}, IMP {1,1,1,3,1,6} (26214-26236). A circlet of wisdom forces INT as a last pick or zeroes INT's weight (26238-26253). Race adjustments then multiply weights (26254-26324): MYCONID triples every non-DEX weight and triples DEX only when DEX is below 5 (otherwise DEX is unchanged); GNOME does the same with STR, GREMLIN with CON, DRYAD with CHR. Picks: `chosenStats[0] = rand % 6` (26326, uniform); that weight is zeroed (26327); `chosenStats[1]` is a weighted draw (26329); `chosenStats[2]` is a weighted draw unless INT is forced and not yet picked (26332-26338).
- Applying the picks (4280-4345): each pick adds +1 to its stat. For a pick whose stat has a trained linked proficiency (`PLAYER_LVL_STAT_BONUS >= PRO_LOCKPICKING`, 4311), one roll of `rand % 5 == 0` (4313) adds one more point. The first success sets `rolledBonusStat`, which stops the rolls for the rest of this level-up. Because each trained pick rolls, the chance that a level-up gets the bonus is `1 - 0.8^k`, where k is the number of trained picks (49 percent when k is 3). The same pattern repeats at 4340-4342.
- Monsters (not the target of this note) use `monsterRollLevelUpStats` (3792-3807): uniform picks without repetition.

## 2. Key functions

- `Entity::increaseSkill` in `/mnt/frankendom-donors/TurningWheel-Barony/src/entity.cpp` 2464-2530 region. Point gain, cap 100, stat link.
- The combat skill-gain block of `Entity::attack` in the same file, 13148-13268. Per-hit, kill and crystal gain rolls. (The 12141-12160 branch is object destruction.)
- Level-up XP block in the same file, 4062-4080. Level from XP.
- Player stat-pick branch in the same file, 4280-4345 region. Three picks and bonus roll.
- `playerStatIncrease` in the same file, 26205-26340. Weights, race multipliers, picks.
- `classStatGrowth` in `/mnt/frankendom-donors/TurningWheel-Barony/src/monster.hpp` 566-592. The class data table.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Skill gain per landed combat hit, a better roll for a kill, none from allies or players | Plain hit 1 in 10 (13246-13259), killing hit 1 in 8 (13213-13234), crystal weapon 1 in 6 (13195-13203), flail x4 odds, goblin slower; dummy bots teach only below 20 (stat.hpp:196); cap 100 (2504). Object destruction: 1 in 20 below 20 (12151-12152) |
| One stat point per tier crossing, milestone messages | Milestones at 20, 40, 60, 80, 100 (2530 region, not read in full) |
| XP per level | 100 (entity.cpp:4062), no growth term (the growth term is commented out) |
| Three stat picks per level-up, first uniform, rest weighted without repeats | Three picks (26326-26338); class rows of six weights, sum about 24 (monster.hpp:568-592) |
| Race multiplier on the class row | x3 on every non-DEX weight for MYCONID, and on DEX only when DEX < 5 (26256-26272); the same pattern for GNOME (STR), GREMLIN (CON), DRYAD (CHR) (26273-26323). Shapeshift rows replace the class row (26214-26236) |
| Bonus point on a trained stat | Roll 1 in 5 per trained pick, first success ends the rolls (4313) |
| Level cap | 255 (4070) |

## 4. TypeScript sketch

simplified: the sketch keeps the combat proficiency gain (hit, kill, crystal rates, dummy gate), the three weighted stat picks (first uniform, rest weighted without repeats), the bonus roll with an explicit trained flag, and the XP-to-level loop. It omits the race multipliers, shapeshift rows, the circlet rule, the INT force, the MP increments on level-up, the milestone messages, the compendium events, the goblin and flail odds, the object-destruction rule and the non-combat proficiency sites. Fix: the donor tests the trained flag as `>= PRO_LOCKPICKING`, which is `>= 0` because the constant is 0 (stat.hpp:172); the sketch takes an explicit boolean. The XP loop applies in one step what the donor does one level per tick. The VPS run `npx -p typescript tsc --noEmit --strict --target es2020` exited 0 on the first draft and again after the 2026-10-12 fix (combatSkillGain). Seeded checks on the VPS (first draft, picks and XP code unchanged): 20,000 warrior level-ups gave zero duplicate picks; the bonus rate was 0.496 with all three picks trained and 0.000 untrained; a 250 XP award at level 1 gave level 3 with 50 XP.

```ts
// Licence: BSD-2-Clause (donor LICENSE.txt, Turning Wheel LLC 2013-2020). Code may be adapted; this sketch is written from the described mechanism.
// Fixes applied: (1) the donor compares the trained-proficiency id with PRO_LOCKPICKING (= 0), which is a disguised "trained" flag; the sketch takes an explicit boolean.
// Note: the donor checks XP for one level per call of handleEffects, but that runs every tick, so a large award levels one per tick and nothing is stranded; the sketch applies them in one step.

type Rng = () => number; // returns a value in [0, 1)

const SKILL_BASIC = 20;   // donor stat.hpp:196
const SKILL_CAP = 100;    // donor entity.cpp:2504
const XP_PER_LEVEL = 100; // donor entity.cpp:4062
const LEVEL_CAP = 255;    // donor entity.cpp:4070 (LVL < 255 check)

// Combat proficiency gain, per landed weapon hit (donor entity.cpp 13186-13268): 1 in 10 on a normal hit, 1 in 8 on a killing hit,
// 1 in 6 with a crystal weapon (checked first, kill or not). No tier gate on normal targets; a training dummy only teaches below Basic.
// No gain against allies, other players or stasis targets (the caller passes eligible = false). Cap 100 (increaseSkill, entity.cpp:2504).
interface CombatHit { eligible: boolean; killingBlow: boolean; crystalWeapon: boolean; targetIsDummy: boolean; }

function combatSkillGain(prof: number, hit: CombatHit, rng: Rng): number {
  if (!hit.eligible || prof >= SKILL_CAP) return prof;
  if (hit.targetIsDummy && prof >= SKILL_BASIC) return prof;
  const oneIn = hit.crystalWeapon ? 6 : hit.killingBlow ? 8 : 10;
  if (Math.floor(rng() * oneIn) !== 0) return prof;
  return prof + 1;
}

// Three distinct stats for a level-up. First pick uniform over 6 stats; second and third are weighted draws
// without replacement from the class weight row (weights of 0 are never drawn).
function pickThreeStats(weights: number[], rng: Rng): number[] {
  const w = weights.slice();
  const picks: number[] = [];
  const first = Math.floor(rng() * 6);
  picks.push(first);
  w[first] = 0;
  for (let k = 0; k < 2; k++) {
    const total = w.reduce((a, b) => a + b, 0);
    let idx = -1;
    if (total > 0) {
      let t = rng() * total;
      for (let i = 0; i < w.length; i++) {
        t -= w[i];
        if (t < 0) { idx = i; break; }
      }
    }
    if (idx < 0) idx = w.findIndex((v, i) => !picks.includes(i)); // no weight left: take the first unused stat
    picks.push(idx);
    w[idx] = 0;
  }
  return picks;
}

// Apply the three picks: +1 each. Each pick whose stat has a trained linked proficiency rolls 1 in 5 for +2; the first success ends the rolls.
// With all three picks trained this fires on about 1 - 0.8^3 = 49 percent of level-ups (donor entity.cpp:4311-4313, same pattern at 4340-4342).
function applyLevelUp(stats: number[], picks: number[], trained: boolean[], rng: Rng): number[] {
  const out = stats.slice();
  let rolled = false;
  for (const s of picks) {
    out[s] += 1;
    if (trained[s] && !rolled && Math.floor(rng() * 5) === 0) {
      out[s] += 1;
      rolled = true;
    }
  }
  return out;
}

// XP award: the donor checks once per tick (handleEffects), so a big award levels one per tick; this applies them all in one step.
function awardXp(exp: number, lvl: number, gained: number): { exp: number; lvl: number; levelsGained: number } {
  let e = exp + gained;
  let l = lvl;
  let levelsGained = 0;
  while (e >= XP_PER_LEVEL && l < LEVEL_CAP) {
    e -= XP_PER_LEVEL;
    l += 1;
    levelsGained += 1;
  }
  return { exp: e, lvl: l, levelsGained };
}

export {};
```

## 5. Lands in

- TARGET `src/fight/progression.ts` (new module): the level-up stat picks, the combat weapon proficiency gain, and the XP-to-level step, run by the engine so the server applies them. Parity-checklist row 21 (catalogue fields): the class weight rows and the proficiency-to-stat map are catalogue data; the gate, roll and cap are engine constants.
- Data fields (zone data vs engine constant) are listed in the JSON sidecar. The class weight rows are catalogue data; no field differs by zone, so all are engine constants.
- Reuse tag: rewrite-from-idea (BSD-2-Clause; code may be adapted, this is clean-room from the mechanism)
- Brief rule served: 1 (one engine, server-verified progression); row 21

## 6. Gaps and risks

- The bonus roll is per trained pick, so the stated "1 in 5" in the donor's intent is really about 49 percent per level-up when all picks are trained. Frankendom should state the rate it wants and test it. Fix: an explicit `bonusChancePerLevelUp` field instead of a per-pick roll, or keep per-pick and document it as such.
- Defect 1: the trained check is `PLAYER_LVL_STAT_BONUS >= PRO_LOCKPICKING` (4311). PRO_LOCKPICKING is 0 (stat.hpp:172), so the test means "any trained proficiency", not a threshold. Fix: store a boolean or the proficiency level and compare explicitly (the sketch does the first).
- Not a defect (checker correction): the XP check is `if` (4065) but it runs every tick inside `handleEffects`, so a large award levels one per tick and no XP waits for another award. Frankendom may still apply all levels in one server step (the sketch loops).
- Defect 3: `stat.hpp:172` says lockpicking is "base attribute: dex" and `stat.hpp:187` says alchemy is "base attribute: int", but `getStatForProficiency` maps both to PER (20976 and the PER block). The code wins; fix the comments or the map, and keep one source of truth in the catalogue.
- Gap: the race multipliers, shapeshift rows and the circlet rule are game content. Frankendom has no race ruling; do not port them without one.
- Missed by the first pass: the combat gain rules at 13186-13268 are the real progression mechanism; the goblin rule (a goblin player that gains one combat skill raises all of them, 12155 and 13270 onward) was only seen in passing.
- Gap: `local_rng.discrete` was not read; the weighted draw is assumed to be a standard weighted choice. The simulation used the sketch's own draw.
- Gap: `MAX_PLAYER_STAT_VALUE` (the stat cap on picks) was not read.

Reuse tag: rewrite-from-idea (BSD-2-Clause; code may be adapted, this is clean-room from the mechanism)
Brief rule served: 1 (one engine, server-verified progression); row 21

## SK table (stat and skill rows, donor numbers)

Donor has six stats (STR, DEX, CON, INT, PER, CHR) with HP, MP, LVL and EXP on the stats struct (`stat.hpp` 335-339). No luck stat: `GEM_LUCK` is an item, not a stat (items.hpp:150). Magic and social skills are proficiencies. Stat-linked proficiencies (the stat that a trained proficiency raises at level-up) come from `getStatForProficiency`.

| name | what it does | formula | number ranges | caps | file:line |
|---|---|---|---|---|---|
| STR, DEX, CON, INT, PER, CHR | six base stats; level-up picks add one each | +1 per pick; +2 bonus on a trained stat by roll | class row weights 1-8 | MAX_PLAYER_STAT_VALUE (not read) | stat.hpp:337; entity.cpp:4300-4345 |
| HP, MP | pools (MAXHP, MAXMP) | level-up adds HP_MOD and MP_MOD (values not read) | not read | not read | stat.hpp:335-336; entity.cpp region near 4280 (not read in full) |
| Proficiency (16) | skill points, 0 to 100 | +1 per gain event; combat hit 1 in 10, killing hit 1 in 8, crystal weapon 1 in 6; dummy bots only below 20; object destruction 1 in 20 below 20 | 0 to 100 | 100 | stat.hpp:188, 196-203; entity.cpp:2504-2506, 13186-13268, 12151-12152 |
| Skill level tiers | Novice 1, Basic 20, Skilled 40, Expert 60, Master 80, Legendary 100 | threshold labels and milestone messages | 1, 20, 40, 60, 80, 100 | 100 | stat.hpp:195-200 (BASIC at 196 receipted; NOVICE line not receipted) |
| Capstone unlock | tier needed for the capstone of each proficiency | table starting at 203; first 8 entries read, all 100 | 100 | none | stat.hpp:203 onward |
| XP per level | experience needed for the next level | 100 flat | 100 | level 255 | entity.cpp:4062-4070 |
| Level-up picks | three stat points per level | first uniform, rest weighted from class row | class rows of six weights, sum about 24 | none | entity.cpp:26326-26338; monster.hpp:566-592 |
| Stat-linked proficiency | trained proficiency enables the level-up bonus roll | last trained proficiency stored per stat | per stat | none | entity.cpp:2716-2722; 20950-20990 |

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: WRONG
- Main claim wrong: the 1-in-20 below-Basic gain at entity.cpp 12141-12152 is the object-destruction branch (entityHP is collider, chest, door, mimic or furniture HP, 12060-12066), not killing monsters. Real combat gain is at 13186-13268: plain hit 1 in 10, killing hit 1 in 8, crystal weapon 1 in 6, no Basic gate except for training dummies. Confirmed.
- Defect 2 false: the XP check at 4065 is inside Entity::handleEffects (3810), called every tick for players and monsters (actplayer.cpp:10759, actmonster.cpp:3627), so no XP is stranded. Confirmed.
- Race multiplier misdescribed: MYCONID triples every non-DEX weight and triples DEX only when DEX < 5; same for GNOME, GREMLIN, DRYAD (26256-26323). Confirmed.
- Missed: shapeshift rows (RAT, SPIDER, TROLL, IMP) replace the class row (26214-26236). Confirmed. Combat gain rules were missed. Confirmed.
- Verified OK by checker: licence, expToLevel, level cap, pick order, classStatGrowth rows, bonus roll, PRO_LOCKPICKING = 0 defect, increaseSkill cap, stat link, getStatForProficiency comment mismatch.
Fixed 2026-10-12: rewrote the skill-gain mechanism, table rows, SK table, Decision, Acceptance and sketch (combatSkillGain replaces killSkillGain); removed Defect 2 and the loop-fix claim; corrected race multiplier text and added shapeshift rows; updated the JSON sidecar fields.
