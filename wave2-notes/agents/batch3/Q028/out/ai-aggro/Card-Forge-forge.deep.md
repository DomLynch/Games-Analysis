# Card-Forge-forge (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/Card-Forge-forge/forge-ai/src/main/java/forge/ai/AiAttackController.java` | Licence: GPL-3.0 (LICENSE, "GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007"; copyleft: clean-room, shape only) | Java (MTG AI) | symbol `declareAttackers`

Checked: `declareAttackers` (807-1350) read end to end, including the level ladder (1077-1276), the level-to-commit switch in `shouldAttack` (1472-1565), the attacker loop (1285-1349), the Exalted and attack-max paths (1015-1058), the reconnaissance path (1061-1071); `doAssault` (577-764) read in full; `chooseDefender` (766-796) read in full; `SpellAbilityFactors` fields and `calculate`/`canBeBlocked` (1352-1457). Confidence: high on the order of steps and on the level ladder; medium on the per-unit gate, because `isEffectiveAttacker` (269-316), `sortAttackers` (235-268), `notNeededAsBlockers` (339-), and the `ComputerUtilCombat` helpers (`canDestroyAttacker`, `evaluateCreature`, `canBeBlockedProfitably`, `lifeInDanger`) were NOT read. `AiProps.java` read in full as the profile table. Not a camera cell.

## 1. Mechanism

- Entry: `declareAttackers(combat)` (807) runs once per combat for this AI's creatures. It first re-checks the defender list (809-814), then calls `doAssault()` (817) and `chooseDefender` (820). If the chosen defender differs it refreshes the lists (824-836).
- Order of steps:
  1. Reconnaissance: when the full-simulation AI has Reconnaissance in play, every attacker that can attack is added and the level is set to 6 (1061-1071).
  2. Mandatory attacks: each attacker with a must-attack flag, end-of-turn leave-play flag, or a requirement is assigned in a thread pool with the game's AI timeout (883-956). The add is guarded because the multimap is not thread-safe (943). If nothing is left, return (963-965).
  3. Assault: if `doAssault()` is true and the defender is the opponent, the remaining attackers are added biggest first while attack-max allows and each is an effective attacker (985-1001). Then it returns the current `aiAggression` field (79, initial 0).
  4. Remembered trick attackers are added (1004-1012).
  5. Exalted: if the Exalted bonus count is over 2 (or Rafiq / Battlegrace Angel / Finest Hour on the first combat) the level is 6, and the first attacker that passes `shouldAttack` attacks alone (1015-1040).
  6. Attack max: if a maximum applies, the level is 6 and attackers are added by power until the max (1044-1058).
  7. Force count (1077-1125): our creatures that can attack next turn with power above 0 (or an attack effect) are `computerForces` and their damage is `candidateUnblockedDamage` (1088-1096). The defender's creatures that can attack next turn are `humanForces`, and their damage is `candidateCounterAttackDamage` (1109-1115).
  8. Ratios (1128-1149): `aiRatio = ai.life / candidateCounterAttackDamage` (1130). `humanRatio = (defender life - possible non-combat damage) / candidateUnblockedDamage` (1136). One is subtracted from `aiRatio` for each defender blocker that can block (1142-1146). `outNumber = computerForces - humanForces` (1140). `ratioDiff = aiRatio - humanRatio` (1149).
  9. Attritional kill (1159-1186): attackers sorted by power ascending. The first `attackers - humanForces` attackers are used. Each round the group's damage is taken off the player's life and the last `humanForcesForAttritionalAttack` attackers are dropped, until life is 0 or below, the list is empty, or 99 rounds. `doAttritionalAttack` is set when life is 0 or below.
  10. Unblockable clock (1194-1231): damage from attackers no blocker can block is summed now (1198-1211) and next turn (1212-1225). If unblockable damage is above 0 and the defender can lose life, the turns-until-death is `1 + (life - unblockable) / nextUnblockable` (1226-1228). `doUnblockableAttack` is set true whenever the defender can lose life (1229-1231).
  11. Level ladder (1239-1272), first match wins: 5 if `ratioDiff > 0` and the attritional kill (1239-1240). 4 if `ratioDiff >= 1`, more than one attacker, and (`humanRatio < 2` or `outNumber > 0`) (1241-1243). Also a chance-based 4 (1244-1258) that needs the profile roll and the mana and life-pressure checks. 3 if `ratioDiff >= 0` and more than one attacker (1259-1260). 2 if `ratioDiff + outNumber >= -1`, or `aiRatio > 1`, or `-ratioDiff < turns-until-unblockable-death` (1261-1266). 1 if `doUnblockableAttack` (1267-1268). Otherwise 0 (1271-1272).
  12. Attacker loop (1285-1349): the remaining attackers are sorted (1286-1287). Below level 5, an attacker whose first-strike block power would kill it is skipped (1299-1302). Each other attacker goes through `shouldAttack` (1307). With a planeswalker defender, the inner loop stops early once the unblocked damage would kill it (1312-1329). The loop repeats on the next planeswalker, else the opponent (1333-1346).
- Per-unit gate `shouldAttack` (1472-1565): (a) an attacker with a non-combat priority is held back if power times the priority is under the opponent's smallest life and it has an affordable tap ability (1474-1492). (b) `isEffectiveAttacker` (1494), not read. (c) `SpellAbilityFactors.calculate` runs unless the level is 5 (1498-1501). (d) Free kill: it cannot block, can kill all blockers, and is worth less than all killers (1505-1509). (e) Survive-and-trample (1510-1514). (f) The switch on the level (1517-1563): 6 is exalted or unblockable; 5 is all in; 4 is "can kill all", or a dangerous blocker it can kill, or it cannot be blocked, or the defence power is 0; 3 is kill-equal-value, or an attack or combat effect with no single killer, or unblockable; 2 is unblockable, or kill-all or effect with no single killer and survival; 1 is unblockable, or one blocker that cannot kill it.
- `calculate` (1376-1456): valid blockers are the defender's creatures that can block this attacker (1383). Blocker counting stops at two unless a flag still needs it (1401). Per blocker: `canBeKilledByOne` if one can destroy it, unless it has undying and no +1/+1 counters (1403-1405). `isWorthLessThanAllKillers` is cleared if the blocker is valued at or below the attacker, unless the attacker is marked SacMe (1408-1410). `canKillAll` is cleared when the attacker cannot destroy a blocker, but only while `canKillAllDangerous` is still true (1415-1416). A blocker with a combat or block effect, lifelink or wither clears `canKillAllDangerous` (1418-1420). A reckless check clears it too if the attacker would die to the total defence power, or if the AI avoids attacking into a certain block and the attack is useless and adds nothing (1426-1439). Last, a profitable-block check (1452-1455). `canBeBlocked()` is true for more than two blockers, or one or two blockers that can block for the attacker's amount (1370-1374).
- `doAssault` (577-764) is a lethal check. A fog effect makes it return false (596-598). Attackers are sorted by power, descending (600). Attackers that cannot be blocked go to the unblocked group (663-665). If the total attack tax is payable, the taxes are cleared (641-648); otherwise attackers whose tax is above free mana are dropped (653-661). The current blockers take away attackers they can already block (680-690). The defender's remaining blockers each stop the next attacker in power order, and extra blocks are counted (693-709). The unblocked rest is summed (710). Trample excess over blockers counts (712-731). The attack is lethal if trample excess, or unblocked power, or non-combat damage reaches life (733-745), or poison reaches 10 (748-761).
- `chooseDefender` (766-796): with one defender, that one. If `doAssault` said lethal, the opponent (773-776). Else a planeswalker (778-783), then a battle (785-793), else the opponent.
- Tick: none. `declareAttackers` runs once per declare-attackers step, and the mandatory step has a wall-clock timeout (956).

## 2. Key functions

- `AiAttackController.declareAttackers`: `/mnt/frankendom-donors/Card-Forge-forge/forge-ai/src/main/java/forge/ai/AiAttackController.java` 807-1350. Steps 1-12 above.
- `AiAttackController.doAssault`: same file, 577-764. Lethal all-in check.
- `AiAttackController.shouldAttack`: same file, 1472-1565. Per-unit commit by level.
- `SpellAbilityFactors.calculate`: same file, 1376-1456. Per-attacker blocker facts.
- `AiProps`: `/mnt/frankendom-donors/Card-Forge-forge/forge-ai/src/main/java/forge/ai/AiProps.java` 26-167. The profile keys and defaults (values read at 43-48).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant |
|---|---|
| Group level from force and damage ratios; more than one attacker needed for 3 and 4 | Level 4 needs `ratioDiff >= 1` and `humanRatio < 2` or `outNumber > 0` (1241). Level 3 needs `ratioDiff >= 0` (1259). Level 2 needs `ratioDiff + outNumber >= -1` (1261). |
| Attritional rounds before a kill | Round cap 99 (1169). |
| Exalted (all-in one-at-a-time bonus) | Bonus count over 2 (1016). Level 6. |
| Lethal check for an all-in | Trample, unblocked and non-combat damage against life (733-745); poison at 10 (749). |
| Attack cap | `attackMax` from the combat restriction (844); the loop stops at the max (991, 1050). |
| Chance-based commit | AI profile percentages: chance to attack into a trade 40 (AiProps.java 44), chance when the opponent has mana 0 (47). Not used in the deterministic core. |
| Blockers counted up to two | Stop at two unless flags need more (1401). |

Profile values read: `RANDOMLY_ATKTRADE_ONLY_ON_LOWER_LIFE_PRESSURE` true (45), `ATTACK_INTO_TRADE_WHEN_TAPPED_OUT` false (46), `CHANCE_TO_ATKTRADE_WHEN_OPP_HAS_MANA` 0 (47), `PLAY_AGGRO` false (43), `TRY_TO_AVOID_ATTACKING_INTO_CERTAIN_BLOCK` true (48).

## 4. TypeScript sketch

simplified: keeps the donor's order for the parts it covers: the lethal all-in check (`assaultLethal`, which stands in for `doAssault`), then the level ladder (`groupLevel`, 5, 4, 3, 2, 1, else 0), then the per-unit commit (`commits`, levels 5 to 1). It omits: the random chance branch of level 4 and the profile rolls; Exalted, reconnaissance and attack-max paths; the trample, tax, poison and non-combat terms in the lethal check (non-combat is one number here); the first-strike skip; planeswalker and battle re-targeting; the non-combat-priority hold; `isEffectiveAttacker`; the worth-less-than and dangerous-blocker tests in `commits` (level 3 and level 2 are simplified); all card-evaluation helpers (`canDestroyAttacker`, `evaluateCreature`). The unblockable attackers in `assaultLethal` skip the blocker count (as in the donor at 663-665). The sketch is typechecked, not run.

```ts
// Licence: GPL-3.0 (donor, LICENSE "Version 3, 29 June 2007"). Clean-room sketch of the shape only: a group level from force and life ratios, a lethal check, and a per-unit gate by level. No donor line is translated.
export interface Unit { id: string; power: number; canBeBlocked: boolean; }

export type Level = 0 | 1 | 2 | 3 | 4 | 5;

export interface Ratios {
  enemyRatio: number;        // enemy life / player damage that can come back at us
  playerRatio: number;       // (player life - non-combat) / our unblocked damage
  outNumber: number;         // our attackers minus their counter-attackers
  attritionalKill: boolean;  // repeated all-in rounds would kill the player
  playerCanLoseLife: boolean;
}

// Ladder order as in the donor: 5, then 4, then 3, then 2, then 1, else 0.
export function groupLevel(r: Ratios, attackerCount: number, turnsUntilUnblockableKill: number): Level {
  const ratioDiff = r.enemyRatio - r.playerRatio;
  if (ratioDiff > 0 && r.attritionalKill) return 5;
  if (ratioDiff >= 1 && attackerCount > 1 && (r.playerRatio < 2 || r.outNumber > 0)) return 4;
  if (ratioDiff >= 0 && attackerCount > 1) return 3;
  if (ratioDiff + r.outNumber >= -1 || r.enemyRatio > 1 || -ratioDiff < turnsUntilUnblockableKill) return 2;
  if (r.playerCanLoseLife) return 1;
  return 0;
}

// Would an all-in attack kill the player if the blockers stop the biggest blockable attackers first?
export function assaultLethal(attackers: Unit[], blockers: number, playerLife: number, nonCombat: number): boolean {
  const unblockable = attackers.filter((a) => !a.canBeBlocked);
  const blockable = attackers.filter((a) => a.canBeBlocked).sort((a, b) => b.power - a.power);
  const through = blockable.slice(Math.min(blockers, blockable.length));
  const dmg = [...unblockable, ...through].reduce((s, a) => s + a.power, 0);
  return dmg + nonCombat >= playerLife;
}

export interface Gate { canKillAll: boolean; canBeKilledByOne: boolean; canBeBlocked: boolean; defPower: number; }

// One attacker's commit test at a given level (level 5 commits everything).
export function commits(level: Level, g: Gate): boolean {
  switch (level) {
    case 5: return true;
    case 4: return g.canKillAll || !g.canBeBlocked || g.defPower === 0;
    case 3: return (g.canKillAll && !g.canBeKilledByOne) || !g.canBeBlocked;
    case 2: return !g.canBeBlocked || (g.canKillAll && !g.canBeKilledByOne);
    case 1: return !g.canBeBlocked;
    default: return false;
  }
}
```

## 5. Lands in

- TARGET `src/fight/ai.ts` (new group director, engine side): choose one group level for the enemy pack from force and life ratios, then let each enemy commit only if its gate passes at that level, with the attack cap of 3 applied first. Parity-checklist row 2 (AI brain).
- Repo state of `src/fight/` not read; this is the planned home.

## 6. Gaps and risks

- One engine: the ratios in the donor use card evaluation (`ComputerUtilCombat`, `evaluateCreature`) that Frankendom does not have. The port must use engine stats only (power, toughness, hp, damage) and must not copy the card-value terms.
- Zones as data: the donor's chances and flags live in an AI profile text file (`AiProps.java`). In Frankendom they become creature or zone data fields (see the JSON `data_fields`). The level thresholds (2, 1, 0, -1, 99, the Exalted count of 2) are magic numbers in the donor. Keep them as named engine constants, not zone data.
- Determinism and replay: the donor rolls `MyRandom.percentTrue` in the level-4 branch (1244-1258). Frankendom's fight record (row 19) needs a seeded roll or no roll at all. The sketch drops the roll.
- Timeouts: the mandatory-attack step runs in a thread pool with a wall-clock AI timeout (883-956). That result changes with machine load. Frankendom's server tick must use a fixed step and the per-tick NPC budget (post-K item 3 sub-line "server tick: fixed step, input intake, per-tick NPC budget") instead of a wall-clock cut-off.
- Threading: the donor needs a `synchronized` add because the multimap is not thread-safe (943). A single-threaded fixed tick needs no lock; do not port the thread pool.
- MAX_ATTACKERS = 3: the donor's cap is a combat restriction (`attackMax`, 844) checked in the loop (991, 1050). Frankendom's cap of 3 is one engine rule, so the cap belongs in `src/fight/ai.ts`, not in each enemy. The donor sorts attackers by power (1046, 1287). Frankendom must break power ties by a stable id for replay.
- Level 1 is the floor: `doUnblockableAttack` is set whenever the defender can lose life (1229-1231), so level 0 ("stay home") only happens when the defender cannot lose life. A fighting game's player can always lose life, so a port gets level 1 at minimum. If a real hold level is wanted, the port must define it, not inherit this.
- Gate incomplete: `isEffectiveAttacker` (269-316), `sortAttackers` (235-268), and the `ComputerUtilCombat` helpers were not read. The sketch's `Gate` takes booleans that the donor computes from those helpers, so the sketch is a shape, not a full gate.
- Camera: not a camera cell; no camera values.

Best transferable idea: Pick one group aggression level for the enemy pack from its force ratio and its damage-to-life ratio, let each enemy commit only if its gate passes at that level, and override to all-in when the unblocked damage would kill the player.

Decision (proposed): adapt — the level ladder and the lethal all-in check fit Frankendom's AI brain (row 2) and the attack cap of 3; the card-value terms, the random roll and the wall-clock thread pool do not fit our rulings (replay, one engine, fixed tick).
Acceptance: In a 1-vs-3 fight at low player health where the three enemies' unblocked damage would kill, all three attack (level 5). In a healthy 1-vs-3 fight only attackers that cannot be blocked commit, and never more than 3 attack at once (server test asserts both, with a fixed seed).

Reuse tag: rewrite-from-idea (GPL-3.0: copyleft, clean-room only; the sketch is written from the described shape, not translated)
Brief rule served: 1 (one engine: the group decision lives in src/fight, not in a client); MAX_ATTACKERS = 3 as the attack cap; rules 7-9 n/a
