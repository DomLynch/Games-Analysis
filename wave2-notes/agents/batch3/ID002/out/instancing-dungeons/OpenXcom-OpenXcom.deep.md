# OpenXcom-OpenXcom (instancing-dungeons, cell 19)

Donor: /mnt/frankendom-donors/OpenXcom-OpenXcom | Licence: GPL-3.0-or-later (LICENSE.txt is GPL v3; src header "either version 3 of the License, or (at your option) any later version") | C++ | symbol BattlescapeGenerator::nextStage
Checked: camera_scope not applicable (not a camera cell). Opened BattlescapeGenerator.cpp (nextStage 193-545 in full; run 545-645; deployXCOM 645-795; header 1-12), BattlescapeGame.cpp (endTurn 355-510), BattlescapeState.cpp (finishBattle 2013-2075), NextTurnState.cpp (165-182), AbortMissionState.cpp (196-206), SavedBattleGame.cpp (getSpawnNode 1245-1290), BattleUnit.cpp (isOut 1303-1306, isInExitArea 2109-2112, goToTimeOut 3056-3059), AlienDeployment.cpp (118, 187-188), AlienDeployment.h (51), bin/standard/xcom2/alienDeployments.rul (1215-1240, 1226-1237, 2717). Callers: nextStage has 1 caller in src (BattlescapeState.cpp:2048); finishBattle has 5 call sites in src (BattlescapeGame.cpp 485/494/497/503, NextTurnState.cpp:180, AbortMissionState.cpp:205), all read. Not read: placeUnitNearFriend body, deployAliens, deployCivilians, how the debriefing recovers unconscious soldiers, what applies despawnPenalty. Confidence: high on the order of operations in nextStage and the victory/abort paths; medium on what the battle does with an unplaced soldier in play (defect D1 is from code reading only, not traced in play).
Best transferable idea: Treat a multi-stage instance as a hand-off with explicit carry rules (who stays, what drops, what goes to the next stage) read from zone data, rather than rebuilding the zone from scratch.
Decision (proposed): adapt - take the stage hand-off shape (stage chain in data, exit-tile gate, abort keeps only exit-tile members, three-bucket loot outcome) but run it on the server and into the one ledger; reject the X-COM ammo, research-gate and craft-inventory specifics as not part of our rulings.
Acceptance: A server test: a 2-stage zone run aborted with 2 of 4 party members on the exit tile loads stage 2 with exactly those 2 alive members placed on spawn nodes, the other 2 flagged out, and no unplaced party member counted live in the next tick.

## 1. Mechanism
A battle instance is one map. A "stage" is one alien deployment entry; the chain is set by the ruleset field nextStage (alienDeployments.rul:1226 names STR_CARGO_SHIP_P2, and STR_CARGO_SHIP_P2 is its own entry at rul:1237 with no nextStage of its own). The battle screen decides whether to advance (BattlescapeState.cpp:2042) and calls BattlescapeGenerator::nextStage (BattlescapeState.cpp:2048). Order of operations inside nextStage:
1. Items that hold a unit (a carried body) are dropped on the soldier's tile (BattlescapeGenerator.cpp:203-216, read; the soldier loop starts at line 203).
2. Every unit is visited. Enemies alive and not out are counted (line 241-245). A unit that is not dead gets goToTimeOut (line 263) when it is an enemy, or when it is a party member, the run was aborted, and it is not on the END_POINT floor tile (lines 235-238). Every unit is detached from its tile and moved to position -1,-1,-1 (lines 282-283). Units are flagged, never erased from the list (grep: no unit erase in nextStage).
3. Items are bucketed (lines 309-377). Ammo follows its weapon. Items owned by a living party member always carry to the next stage (line 365). Loose recoverable items: if all enemies are down, corpses and unresearched items go home and the rest carry (protocol 1, line 309); if enemies survive, items on START_POINT go home, items on END_POINT carry (unless they are corpses), other items are conditional (protocol 2, line 326). In protocol 2, items with no tile are discarded.
4. Items in the discard bucket are deleted (not read in full, only the delete at the end of the bucket loop).
5. The new deployment sets turn limit and chrono trigger (lines 414-415), a random terrain pick, the map script, and generateMap.
6. Party members that are not out get a spawn node of rank NR_XCOM (line 457, chosen by SavedBattleGame::getSpawnNode). If none, placeUnitNearFriend is tried (line 458). If that fails too, nothing else happens in that loop (defect D1).
7. Carry items go to the craft tile, enemies and civilians are deployed, and the abort flag is cleared (line 534).

The battle-end side (BattlescapeGame::endTurn, 355-510): an exit count of party units on END_POINT (lines 456-467), liveSoldiers counts every party unit that is not out, tile or not (line 473), a turn limit that fires when the turn is strictly past the limit (line 488), and a chrono trigger that decides the outcome: FORCE_ABORT finishes with aborted=true and the exit count (lines 493-494), FORCE_WIN finishes with the live soldier count, the default FORCE_LOSE finishes with aborted=true and 0 (lines 502-503). Player abort (AbortMissionState.cpp:204-205) sets aborted and finishes with the exit count. NextTurnState.cpp:178-180 finishes with the live soldier count when all enemies are down (non-final mission) or no soldiers remain.

## 2. Key functions
- BattlescapeGenerator::nextStage (BattlescapeGenerator.cpp:193): the hand-off, steps 1-7 above.
- BattlescapeState::finishBattle (BattlescapeState.cpp:2013): the stage gate. It loads the next stage only when the mission names one and inExitArea is positive. It does not look at abort (line 2042).
- BattlescapeGame::endTurn (BattlescapeGame.cpp:355): counts exit and live soldiers (455-476), applies turn limit and chrono (488-503).
- SavedBattleGame::getSpawnNode (SavedBattleGame.cpp:1245): candidate spawn nodes of the rank; priority 0 is not a spawn (line 1261); the highest priority wins; ties are chosen with the global RNG (line 1278).
- BattleUnit::isOut (BattleUnit.cpp:1303-1306): dead, unconscious, or ignore-me. BattleUnit::goToTimeOut (BattleUnit.cpp:3056-3059) sets ignore-me.

## 3. Numbers vs mechanism
- turnLimit: default 0 (AlienDeployment.cpp:118), read from the ruleset (AlienDeployment.cpp:187). 0 means no limit. The check is strictly greater than the limit (BattlescapeGame.cpp:488). I grepped the .rul and .yml files under bin/ and found no turnLimit or chronoTrigger key, so the standard sets use the defaults.
- chronoTrigger: default FORCE_LOSE (AlienDeployment.cpp:118). The enum has three values, FORCE_LOSE, FORCE_ABORT, FORCE_WIN (AlienDeployment.h:51). It is read as an integer from the ruleset (AlienDeployment.cpp:188), so 0=lose, 1=abort, 2=win.
- Exit count: a party unit on an END_POINT floor tile (BattlescapeGame.cpp:467). Carry rule when aborted: also END_POINT (BattlescapeGenerator.cpp:237-238).
- Stage size from the ruleset: STR_CARGO_SHIP_P1 (type line alienDeployments.rul:1093, the block that holds nextStage at 1226) is 30 x 70 x 4 with 16 civilians and script SHIP_P1 (rul:1219-1223, read, not receipted as numbers).
- despawnPenalty: 1000 on cargo stage one (rul:1236), 2000 on another mission (rul:1811, grep only). Where the penalty is applied: not read.
- Cheat turn: default 20 (AlienDeployment.cpp:118); only setCheatTurn copies it in nextStage (not read further).
- Stage chains in data: cargo ship is 2 stages; the TLETH chain has 3 (rul:2574 nextStage STR_TLETH_P2 and rul:2717 nextStage STR_TLETH_P3).

## 4. TypeScript sketch
simplified: omits terrain and map generation, music, civilians, vehicles, ammo linkage, fuse timers, mind-control faction checks and the RNG spawn tie-break; placement is a yes/no input instead of a spawn-node search. It returns buckets instead of mutating containers. It adds the fix for D1 (toRecovery) that the donor lacks, and the stage gate and turn-limit helpers are split out. Written from the rules, not translated from the donor.
```ts
// Clean-room shape of a multi-stage instance hand-off (rules re-expressed in our own words; no donor code copied).
type Status = 'alive' | 'unconscious' | 'dead' | 'out';
interface Unit { id: number; party: boolean; status: Status; onExit: boolean; canPlace: boolean; }
type Where = 'start' | 'exit' | 'other' | 'none';
interface Item { id: number; ownerId: number | null; recoverable: boolean; researched: boolean; isCorpse: boolean; isAmmo: boolean; at: Where; }
type Bucket = 'home' | 'conditional' | 'nextStage' | 'discard';
type Chrono = 'FORCE_LOSE' | 'FORCE_ABORT' | 'FORCE_WIN';

export interface Handoff {
  carried: number[];            // party ids placed on the next stage
  flaggedOut: number[];         // ids kept in the list but detached and inactive
  toRecovery: number[];         // fix: party members that could not be placed go to recovery, not to the live count
  enemiesAlive: number;
  buckets: Map<number, Bucket>;
}

const isOut = (u: Unit): boolean => u.status === 'dead' || u.status === 'unconscious' || u.status === 'out';

export function handOff(units: Unit[], items: Item[], aborted: boolean, allEnemiesDown: boolean): Handoff {
  const res: Handoff = { carried: [], flaggedOut: [], toRecovery: [], enemiesAlive: 0, buckets: new Map<number, Bucket>() };

  // 1. Units. Enemies always leave the stage. Party members who are not dead leave only
  //    if the run was aborted and they are not on the exit tile.
  for (const u of units) {
    if (u.party) {
      if (u.status === 'dead') continue;
      if (aborted && !u.onExit) { u.status = 'out'; res.flaggedOut.push(u.id); }
    } else {
      if (!isOut(u)) res.enemiesAlive++;
      u.status = 'out';
      res.flaggedOut.push(u.id);
    }
  }

  // 2. Items. Ammo follows its weapon; owned items stay with a living party member;
  //    loose recoverable items are bucketed by protocol.
  for (const it of items) {
    if (it.isAmmo) continue;
    const owner = it.ownerId === null ? undefined : units.find(u => u.id === it.ownerId);
    let b: Bucket = 'discard';
    if (owner !== undefined && owner.party && !isOut(owner)) {
      b = 'nextStage';
    } else if (it.recoverable && it.ownerId === null) {
      if (allEnemiesDown) {
        b = it.isCorpse || !it.researched ? 'home' : 'nextStage';
      } else if (it.at === 'start') {
        b = 'home';
      } else if (it.at === 'exit') {
        b = it.isCorpse ? 'conditional' : 'nextStage';
      } else if (it.at === 'other') {
        b = 'conditional';
      }
    }
    res.buckets.set(it.id, b);
  }

  // 3. Placement. A party member that is not out is placed on the next stage if a spawn works;
  //    otherwise it goes to recovery and is flagged out (donor leaves it unplaced and still live).
  for (const u of units) {
    if (!u.party || isOut(u)) continue;
    if (u.canPlace) {
      res.carried.push(u.id);
    } else {
      u.status = 'out';
      res.toRecovery.push(u.id);
    }
  }
  return res;
}

// Stage gate: the next stage loads only if the mission names one and someone is still counted (exit tile or survivors).
export function stageGate(nextStage: string | undefined, countedForGate: number): 'loadNext' | 'debrief' {
  return nextStage !== undefined && nextStage !== '' && countedForGate > 0 ? 'loadNext' : 'debrief';
}

// Turn limit: only when the limit is above 0 and the turn is past it. The chrono trigger picks the outcome.
export function turnLimitOutcome(turn: number, limit: number, trigger: Chrono): 'none' | 'abort' | 'win' | 'lose' {
  if (limit <= 0 || turn <= limit) return 'none';
  if (trigger === 'FORCE_ABORT') return 'abort';
  if (trigger === 'FORCE_WIN') return 'win';
  return 'lose';
}

export {};
```
Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in
Target: origins/server/world-spawns.ts (proposed: the stage hand-off as a server function there or in a new origins/server/instance-stage.ts; the new file name is my proposal, not checked against the repo). Parity row: 23 (zone population: spawn caps, respawn, despawn, with the grace timer). Row 17 (death/respawn) is the nearest alternative for the carry rule, but row 23 is the hinted row. The server tick has no row of its own; the hand-off runs at a turn or zone-clear boundary, not in the tick.

## 6. Gaps and risks
- One engine: the donor runs the hand-off from a UI state (BattlescapeState.cpp:2048 then pushState of BriefingState). Ours must run in the engine or on the server; the client only shows the result.
- Zones as data: the stage chain and turnLimit/chronoTrigger are data already (rul:1226, AlienDeployment.cpp:187-188). We still need an explicit onAbort field in zone data, because abort-with-exit-occupants advances the chain in the donor (BattlescapeState.cpp:2042 does not read abort) and that choice should be data, not an accident.
- Server-verified kills: liveSoldiers and the exit count are computed in the battle screen's endTurn path (BattlescapeGame.cpp:455-476). They must be computed by the server from its own state.
- One ledger: the donor splits loot into three containers (home, conditional, next stage). Our single ledger needs a bucket field, not three arrays.
- Pit as client: the donor gate is in the battle screen. The Pit must not own stage transitions.
- MAX_ATTACKERS = 3: no party-size limit read in the donor's hand-off, so the donor says nothing about this ruling.
- Defect D1 (fix: route to recovery): if getSpawnNode and placeUnitNearFriend both fail (BattlescapeGenerator.cpp:457-458), the party member stays in the list with no tile and is not out, so endTurn counts it in liveSoldiers (BattlescapeGame.cpp:473). Not traced in play. Fix: the sketch's toRecovery path.
- Defect D2 (design to make explicit): the stage gate ignores abort (BattlescapeState.cpp:2042). Fix: an onAbort field in zone data (advance or debrief).
- Defect D3 (unconscious party members): isOut includes STATUS_UNCONSCIOUS (BattleUnit.cpp:1305), and placement skips isOut units (BattlescapeGenerator.cpp:447). An unconscious soldier who was not timed out is therefore not placed on the next stage. What happens to them afterwards: not read. Fix: an explicit unconsciousCarry field in zone data (home, next, or lost), not an implicit rule.
- Defect D4 (memory): units are flagged, never erased (grep), so the list grows across stages. Fix: compact the list when a stage ends.
- Randomness: spawn ties use the global RNG (SavedBattleGame.cpp:1278). For server-verified replay each instance needs its own seeded RNG.

Reuse tag: clean-room shape only (GPL-3.0-or-later). No OpenXcom code is copied; the sketch is written from the rules.
Brief rule served: addendum "find the DATA tables first" (alienDeployments.rul, read); "keep the idea, fix the defect" (D1 to D4, each with a fix); section 5 parity row 23.
