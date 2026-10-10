# 00-Evan-shattered-pixel-dungeon (ai-aggro, cell 1)

Donor: `/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/actors/mobs/Mob.java` | Licence: GPL-3.0 (LICENSE.txt is GPL version 3, 29 June 2007; the Mob.java header says "either version 3 of the License") | Java | symbol `Mob.act` / `chooseEnemy` / `Hunting.act`

Checked: Read in full the AI paths of Mob.java: act 263-313 (enemy choice at 289, state.act at 301), chooseEnemy 357-524, aggro/clearEnemy 921-932, damage 938-962, defenseProc 843-899, Sleeping 1219-1299, Wandering 1301-1353, Hunting 1358-1445, Fleeing 1474-1524, Char.stealth 1284-1290. Callers: chooseEnemy has two callers, both read (Mob.act 289 and Hunting.handleUnreachableTarget 1428); defenseProc has one caller read (Char.java 483; other callers not searched). Overrides read only in part: Bee.java 145-152. Not read: Passive (1526-1530), stealth-gameplay classes (1539-1700), Investigating body (1449-1473), DM300.java 314 override, Obfuscation.stealthBoost, Char.distance, the Actor scheduler that calls act (tick loop), ChampionEnemy reach, and the Random.Int(n) range. camera_scope not applicable. Confidence: high on the target and flee flow as written; medium on what the un-read overrides change.

## 1. Mechanism

- Each creature turn runs `Mob.act()`. It saves the just-alerted flag and clears it (267-268), skips the turn while paralysed (278), switches to FLEEING under Terror or Dread (285-287), then calls `chooseEnemy()` (289), computes `enemyInFOV` as enemy alive, in FOV and not invisible (291), and hands the turn to the current state's `act` (301). States: Sleeping, Wandering, Hunting, Fleeing.
- Target choice (`chooseEnemy`, 357-524). The current enemy is kept (returned unchanged, 522-523) unless it is dead, gone, or the creature is WANDERING, which forces a fresh choice every tick (393). A fresh choice for an enemy-side mob builds a candidate set: allies in FOV and the hero if in FOV (457-466); the source of a Charm is dropped (471-477). The set is a HashSet (416), so its order is not fixed. The closest candidate is then picked by path distance to a tile next to it (484-507). Written preference: an attackable candidate beats a non-attackable one (499-500, 501-503), and on a tie the hero wins (504-506). A final afterimage swap replaces the hero with a Feint afterimage (510-517). Caveat from the code: `closestDist` is set only for the first candidate (496-498) and is not updated when `closest` changes (503, 506), so later candidates are compared with the first candidate's distance.
- Sleeping (1224-1277). Any negative buff wakes it (1227-1235). Otherwise, when the enemy is in view or invisible, it looks over visible non-allied, non-neutral characters (1243-1262) and keeps the one with the lowest detection value (1257); silent-steps and flying characters are forced to infinite value for that pick (1247-1256). It then rolls `Random.Float() < detectionChance(closestHostile)` (1264) with chance 1/(distance + stealth) (1282). Waking: if the enemy is in view, HUNTING with target = enemy position (1287-1290); else WANDERING toward a random destination (1292-1294). Waking costs TIME_TO_WAKE_UP = 1f (141, used at 1297).
- Wandering (1301-1353). The enemy is re-chosen each tick (393). If the enemy is in view and (the creature was just alerted, or a roll passes with chance 1/(distance/2 + stealth)) (1307, 1320), it becomes HUNTING with target = enemy position (1323-1329). Otherwise it walks toward its target with getCloser, or picks a new random destination (1334-1346).
- Hunting (1358-1400). If the enemy is in view and can be attacked (adjacent, or ChampionEnemy extra reach, 559-569), the hit queue is cleared, target = enemy position, and it attacks (1365-1369). Otherwise `handleRecentAttackers` runs (1375, 1402-1417): each recent attacker that is alive, on the other side, in view and not invisible is taken as enemy if it can be attacked, or no enemy is set, or it is nearer than the current enemy (1406-1409). The queue is then cleared (1414). If the enemy is in view, target = enemy position (1379-1380); if there is no enemy, WANDERING (1381-1387). Otherwise step toward the target (1390). If that step fails, `handleUnreachableTarget` (1424-1444) re-runs chooseEnemy once with a recursion guard (1425-1435); if still not in view it spends a tick and wanders (1438-1442).
- Being hit (defenseProc, 843-899, called by the attacker through Char.java 483). If the creature is not fleeing (871): when it is not hunting (872), `aggro(enemy)` sets enemy = attacker and HUNTING unless passive (921-926), and target = attacker position (874). When already hunting, the attacker is queued in `recentlyAttackedBy` (876). `Mob.damage` (938-962) also wakes a sleeper (942-943), sets `alerted = true` for a non-hunting, non-fleeing creature so that the next tick skips the notice roll (945-947), and for hero Wand, ClericSpell or ArmorAbility hits calls `aggro(hero)` (949-952).
- Fleeing (1474-1524). The escape check fires if there is no enemy, or the enemy is out of view and `1 + Random.Int(distance)` is 6 or more (1482); `escaped()` is a no-op by default (1509-1511). Otherwise, with enemy in view, target = enemy position (1490-1491) and it steps further away (1495). If no step is possible, `nowhereToRun` (1514-1523) turns it to HUNTING when the enemy was seen, else WANDERING, unless Terror or Dread is still active.
- Leash: none in Mob.java (a search for leash, homePos or spawnPos in the actors folder found YogDzewa, GnollGeomancer and GnollSapper, not Mob.java).

## 2. Key functions

- `Mob.act`: `/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/actors/mobs/Mob.java` 263-313.
- `chooseEnemy`: same file 357-524 (candidate set 416-466, closest pick 484-523).
- `defenseProc` (attack-on-hit aggro): same file 843-899, hook 871-878.
- `Mob.damage`: same file 938-962.
- Sleeping, Wandering, Hunting, Fleeing states: same file 1219-1299, 1301-1353, 1358-1445, 1474-1524.
- Stealth value: `/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/actors/Char.java` 1284-1290 (base is 0 plus the Obfuscation glyph boost).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Notice roll per tick, chance falls with distance; a just-hit creature skips the roll | Wandering chance 1/(distance/2 + stealth) (theirs, 1320); sleeping chance 1/(distance + stealth) (theirs, 1282) |
| Stealth as an additive term in the roll | Base stealth 0; Obfuscation glyph boost otherwise (Char.java 1284-1287; Obfuscation.stealthBoost not read) |
| Attackable candidate beats a nearer one | Melee reach = adjacent (560); ChampionEnemy extra reach (560-568, values not read) |
| Escape roll per tick, rising with distance from the threat | Threshold 6 on `1 + Random.Int(distance)` (theirs, 1482). Derived by me, assuming Random.Int(n) gives 0 to n-1 (Random not read): escape chance (d-5)/d for d of 6 or more, zero below |
| Wake costs a fixed time | TIME_TO_WAKE_UP = 1f (theirs, 141) |
| Sticky target, hit queue, swap rule | None (rule only, no number) |

## 4. TypeScript sketch

simplified: the sketch keeps the sticky hunting target, the attackable-first then nearest pick, the hitter swap (same last-qualifying-wins order as the donor loop), and the notice roll with the just-alerted shortcut for wanderers only. It omits: Sleeping's lowest-value pick across several foes (the sketch uses the same pick as wandering), the silent-steps and flying overrides, Terror and Dread, the Fleeing state and the escape roll, Passive, the Feint afterimage swap, the awake spend, the recursion re-choose in handleUnreachableTarget, the Charm source filter, the HashSet order, and the path step. It corrects the donor's closestDist quirk (it compares each candidate with the best so far) and adds a distance floor of 1 that the donor does not have.

@@SKETCH@@

## 5. Lands in

- TARGET `src/fight/ai.ts` (new module, proposed): the one creature-AI brain for the duel and the many-on-one zones. Parity-checklist row 2 (AI brain).
- Reuse tag: rewrite-from-idea (GPL-3.0 copyleft; clean-room only)

## 6. Gaps and risks

- GPL-3.0 copyleft: clean-room only. The sketch is written from the described mechanism and was not translated line by line.
- Notice dice: a per-tick random roll that decides when a creature sees the player does not fit an engage that is a state change (addendum ruling). It belongs in zones (wandering creatures finding a player), not in the duel step, and only if the owner asks for it.
- Sticky target plus hitter swap is the useful part for many-on-one. The donor caps nothing: the candidate set takes every visible enemy (457-466, no limit in 484-507). MAX_ATTACKERS = 3 must be applied in the engine after the choice, not inside the roll.
- Determinism: the donor's candidate set is a HashSet (416) and its first-candidate distance quirk (496-506) makes the result depend on the order. The server choice must be deterministic and replayable (parity row 19, fight record), so the sketch uses a fixed order and the test should check it.
- The attacker that the swap uses must come from the server's hit record, not from the client; the donor's `enemy` is set by the attack call (Char.java 483) and that is a convention, not a check.
- The creature's random rolls (notice, escape) need a seeded RNG in the engine, or a replay will differ.

Best transferable idea: A hunting creature keeps its target until it dies or leaves view, and swaps to whoever hit it last only if that attacker can be hit now or is nearer, which gives many-on-one fights one explainable target rule.
Decision (proposed): adapt - keep the sticky target, the attackable-first pick and the hitter swap in the engine (src/fight/ai.ts), but drop the per-tick stealth roll for duels because an engage is a state change and dice would make it random.
Acceptance: In a 3-vs-1 server test, a creature that is in reach and hit the hero last becomes the target on the next tick, a farther creature that never hit is not chosen, and the same seed gives the same target sequence on replay.
Reuse tag: rewrite-from-idea (GPL-3.0 copyleft; clean-room only)
Brief rule served: 1 (many-on-one target logic lives in the engine, not the client); rules 7-9 n/a
