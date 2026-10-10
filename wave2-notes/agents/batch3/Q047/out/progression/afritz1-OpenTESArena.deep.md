# afritz1-OpenTESArena (progression, cell 10)

Donor: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Game/GameState.cpp` (with `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Stats/CharacterClassDefinition.cpp`, `.../src/Combat/CombatLogic.cpp`, `.../src/Entities/ArenaEntityUtils.cpp`) | Licence: MIT (`/mnt/frankendom-donors/afritz1-OpenTESArena/LICENSE.txt`: "The MIT License (MIT)", Copyright 2016-2026 The OpenTESArena Developers) | C++ | symbol `GameState::tickPlayerLevel`

Checked: Symbol `GameState::tickPlayerLevel` is defined at 1649 and closes at 1706 (read in full). `CharacterClassDefinition::getExperienceCap` 121-136 and its multiplier helper 11-23 (read in full). Kill XP: `CombatLogic.cpp` 372-490 read (420-422 is the health reduction). `onEntityHitByPlayer`, which starts at 305, was not read at 305-371, where `sourceDamage` and the hit checks are. Human XP formula `ArenaEntityUtils::getHumanEnemyExperience` 674-682 (read in full). Callers checked by grep in `src/`: `getExperienceCap` is called only from `tickPlayerLevel` (GameState.cpp 1662); `getHumanEnemyExperience` only from CombatLogic.cpp 477; `tickPlayerLevel` only from Game.cpp 934; the award at CombatLogic 468 and 478 is the only writer of `player.experience` outside the reset path. Not read: the exe tables `initialExperienceCaps`, `humanEnemyExpMultipliers` and `creatureBaseExps`/`creatureExpMultipliers` (their values are in the game's exe file), the `ArenaPlayerUtils::calculateEnduranceDerivedBonuses` body, the popup function `GameWorldUI::showTextPopUp`, the enclosing function header of Game.cpp 934 (not read), and the body of `onEntityHitByPlayer` at 305-371 and 413-439 and after 490. Camera scope: not a camera cell. Confidence: high for the XP curve, the level-up gate and the award formulas (all read in full); depth is thin because the front of the kill path (305-371) is unread, so the damage that reaches zero health is not verified.

Best transferable idea: Keep XP as one running total, derive the next threshold from a band-based cumulative curve, and only apply level-ups between fights (the level check waits while a live enemy is within 8 units), rolling points and HP once per level gained.
Decision (proposed): adapt - Frankendom keeps one XP ledger and one curve per class, but takes the shape of the banded cumulative cap and the presence-gated, batched level-up; the donor's HP-after-popup timing and its exe-table values are not taken.
Acceptance: A server test asserts that a kill which leaves an enemy within 8 units defers the level-up, that clearing that enemy applies every level earned in one pass with one 4-6 point roll per level, and that a second hit on a dying enemy adds no XP.

## 1. Mechanism

- Two separate steps. (a) The kill award happens inside the hit that takes an enemy to zero health. (b) A per-frame check turns total XP into levels. Total XP is never reset; it only grows.
- Step (a), kill award (`CombatLogic.cpp`). A hit on an entity runs the kill block only if the target can still be killed: `canHitEntityBeKilled = !hitEntityCombatState->isInDeathState()` (379). Death state is `isDying || isDead` (`EntityChunkManager.cpp` 282-284). If health is exactly `0.0` after the hit (453), the target is marked `isDying = true` (455). The health reduction itself is `max(health - sourceDamage, 0.0)` (420-422); `sourceDamage` is set in lines 305-371, which were not read. Then XP depends on what it was:
  - Citizen: no XP here; a citizen-killed hook runs instead (458-462).
  - Creature: `baseExp + (maxHP * expMultiplier)` is added to `player.experience` (467-468).
  - Human enemy: `(level * level) * humanEnemyExpMultipliers[categoryID]` is added (473-478). `level` is the enemy's own combat level.
  - The award runs in `GameState::tickCombatResults` (1827-1838), which the donor comments as running after the physics step (1829).
- Step (b), level check, once per frame (`Game.cpp` 934, inside the update sequence after `tickPlayerAttack` and before `tickVoxels`/physics).
  1. Gate: if `anyEnemiesNearby(playerEyePosition)` is true, return without changing anything (1656-1658). `anyEnemiesNearby` checks every enemy in the enemy list, skips any in death state (2108), and returns true if any remaining one is within `SAFE_SLEEP_DISTANCE = 8.0` (2102-2118; `Player/Player.h` 54). The donor's grep shows the same test also gates resting and travel (`GameWorldUiState.cpp` 3214, 3362; those were not read).
  2. Loop: `while (player.experience >= getExperienceCap(player.level)) player.level++` (1661-1665). Start count saved first so the gain can be measured (1661, 1667).
  3. Cap: `getExperienceCap(L)` for `L <= 0` is 0 (123-125). Otherwise start from the class `initialExpCap` (128) and, for each level `l` from 2 up to `L`, `cap = floor(cap * m(l))` (129-133), where `m(l) = 30/16` for `2 <= l <= 8` and `1.5` above (11-23). So the threshold for leaving level 1 is `initialExpCap`; leaving level 2 needs `floor(initialExpCap * 30/16)`; leaving level 9 is one more step of `x 1.5`.
  4. Rewards for each level gained (1677-1684): attribute points `4 + random.next(3)`, which is 4 to 6 (1679-1680; the 4 and 6 constants are in `Player/CharacterLevelUpState.h` 9-10). HP gain `enduranceBonus + (1 + random.next(healthDie))`, which is the endurance bonus plus 1 to `healthDie` (1682-1683). `random.next(n)` is a modulo of a uniform int, so it returns 0 to n-1 (`Math/Random.cpp` 19, 33, 38).
  5. Presentation: a fanfare plays (1687), then a text popup (1692). The HP is added to `maxHealth` and `currentHealth` only inside the popup's close callback (1693-1697); the callback then opens the level-up screen with the points (1699-1704).

## 2. Key functions

- `GameState::tickPlayerLevel`: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Game/GameState.cpp` 1649-1706. Gate, loop, rewards, popup.
- `CharacterClassDefinition::getExperienceCap` and the static `GetExperienceMultiplierForLevel`: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Stats/CharacterClassDefinition.cpp` 11-23 and 121-136. The banded cumulative cap.
- `CombatLogic::onEntityHitByPlayer`, kill-award block: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Combat/CombatLogic.cpp` 372-490 (305-371 not read). Dying guard at 379, health reduction at 420-422, award at 453-480.
- `ArenaEntityUtils::getHumanEnemyExperience`: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Entities/ArenaEntityUtils.cpp` 674-682. Level squared times the class-category multiplier.
- `EntityChunkManager::anyEnemiesNearby`: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Entities/EntityChunkManager.cpp` 2100-2122. The proximity gate.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Cumulative XP threshold per level: start value, multiply by a band factor, floor after each step | Class `initialExpCap` (per class, exe table `initialExperienceCaps[18]`, values not read; `Assets/ExeData.h` 75) |
| Band factor: a low band to level 8, then a high band | `30/16` for levels 2-8 and `1.5` from 9 (theirs, `CharacterClassDefinition.cpp` 13-15) |
| Presence gate: defer level-up while a live enemy is inside a radius | Radius `8.0` (theirs, `Player/Player.h` 54); the donor names it for sleep |
| Per-level attribute roll | `4` to `6` points (theirs, `Player/CharacterLevelUpState.h` 9-10) |
| Per-level HP roll: a fixed bonus plus a die | Die size per class (`healthDie`, e.g. d8 or d20 per the field comment, `Stats/CharacterClassDefinition.h` 25) |
| Creature kill XP: base plus max HP times a multiplier | `creatureBaseExps[24]` (uint32) and `creatureExpMultipliers[24]` (uint8), values not read (`Assets/ExeData.h` 167-168) |
| Human kill XP: level squared times a category multiplier | `humanEnemyExpMultipliers[3]`, values not read (`Assets/ExeData.h` 196); the multiplier index is `charClassDef.categoryID` (`ArenaEntityUtils.cpp` 678) |
| Award once: a dying flag blocks a second award | None (the flag itself) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for the level check (gate first, then the cap loop, then one reward roll per level gained). It omits the citizen branch, the creature and human award formulas beyond taking numbers as arguments, the endurance bonus lookup (passed in as a number), the popup and its HP timing (the donor applies HP inside the popup close callback; the sketch applies it in the returned object), the audio, and the UI context switch. It takes the enemy-near flag as an input rather than computing a distance.

```ts
// Licence: MIT (donor, OpenTESArena LICENSE.txt). Clean-room sketch written from the described mechanism.
// clean-room
interface LevelCurve {
  initialCap: number;          // XP cap for leaving level 1 (donor: per-class exe table)
  lowBandMultiplier: number;   // donor: 30 / 16, applied for levels 2 to lowBandEnd
  highBandMultiplier: number;  // donor: 1.5, applied above lowBandEnd
  lowBandEnd: number;          // donor: 8
}

// Cumulative XP cap for leaving `level`. Level 0 has cap 0.
function xpCap(curve: LevelCurve, level: number): number {
  if (level <= 0) return 0;
  let cap = curve.initialCap;
  for (let l = 2; l <= level; l++) {
    const m = l <= curve.lowBandEnd ? curve.lowBandMultiplier : curve.highBandMultiplier;
    cap = Math.floor(cap * m);
  }
  return cap;
}

interface Hero { level: number; xp: number; }

interface LevelUpReward { levelsGained: number; bonusPoints: number; hpGain: number; }

// Runs once per update pass. Waits while any live enemy is near, then applies every level
// earned since the last pass, rolling points and HP once per level.
function tickLevel(
  hero: Hero,
  curve: LevelCurve,
  enemyNear: boolean,
  rng: (exclusiveMax: number) => number,   // returns 0 .. exclusiveMax - 1
  healthDie: number,
  enduranceHpBonus: number,
): LevelUpReward | null {
  if (enemyNear) return null;
  const before = hero.level;
  while (hero.xp >= xpCap(curve, hero.level)) hero.level++;
  const gained = hero.level - before;
  if (gained <= 0) return null;
  let bonusPoints = 0;
  let hpGain = 0;
  for (let i = 0; i < gained; i++) {
    bonusPoints += 4 + rng(3);                    // donor: BonusPointsRandomMin 4 .. Max 6
    hpGain += enduranceHpBonus + (1 + rng(healthDie));
  }
  return { levelsGained: gained, bonusPoints, hpGain };
}

// Kill XP, awarded once: the caller checks the target is not already dying.
function creatureXp(baseExp: number, maxHp: number, expMultiplier: number): number {
  return baseExp + maxHp * expMultiplier;
}
function humanXp(enemyLevel: number, categoryMultiplier: number): number {
  return enemyLevel * enemyLevel * categoryMultiplier;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/xp.ts` (new module): the banded cap curve, the kill-award formulas and the presence-gated level-up step. Runs on the server after a kill is verified, not in the client.
- Parity-checklist row 18 (loot roll and XP award), sub-line for the level step.
- Reuse tag: rewrite-from-idea (MIT: adaptation allowed; this note's sketch is clean-room and was not translated line by line)
- Brief rule served: one engine (XP and levels are engine state; the client only shows the popup); zones as data (creature and class tables, encounter level feed the award); server-verified kills (the award runs where the kill is verified).

## 6. Gaps and risks

- One engine and server-verified kills: the donor awards XP and levels up inside the single game process; there is no server. In Frankendom the award must sit in the server step that verifies the kill, and the client must not write `xp` or `level`.
- One ledger: the donor keeps one `experience` integer and a per-class cap table; the table values are in an exe file the donor reads at start. Frankendom needs the table as zone-independent data, with the curve parameters written down, not hard-coded.
- The presence gate in the donor checks every live enemy within 8 units, including ones that are not in the fight. In a many-on-one fight with MAX_ATTACKERS = 3, that gate holds the level-up until every nearby enemy is dead, even one that is not attacking. Frankendom should gate only on enemies in the current fight.
- The donor applies the HP gain only when the popup closes (1693-1697). If Frankendom copies that, a player who skips the popup gets no HP. The server should apply XP, level and HP in one ledger write and let the popup only display them.
- The donor's `SAFE_SLEEP_DISTANCE` is also used for resting and travel. Frankendom should give the level-up gate its own named constant so changing one does not move the other.
- The human-enemy award uses the enemy's level squared (CombatLogic 473, 477), so a level-10 enemy is worth four times a level-5 one. Check this against the Frankendom catalogue before copying the formula; it is a designer choice in the donor, and the exe multiplier values were not read.
- Frankendom's kill rule is server-side, so the "dying flag blocks a second award" guard (379, 455) must live in the engine's kill record, not in a per-frame client flag.
- Not read: `onEntityHitByPlayer` lines 305-371 and after 490, the popup function, and the exe values. The numbers in section 3 for initial caps, creature and human multipliers are the donor's shape only; do not copy them as tuning.
