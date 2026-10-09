# OpenXcom-OpenXcom (progression, cell 10)

Donor: /mnt/frankendom-donors/OpenXcom-OpenXcom/src/Savegame/SavedGame.cpp | Licence: GPL-3.0-or-later per SavedGame.cpp header | C++ | symbol SavedGame::handlePromotions
Symbol check: handlePromotions opens at 1510 and closes at 1608; inspectSoldiers 1643-1660; getSoldierScore 1667-1675; Soldier::promoteRank 323-331; Soldier::addKillCount 399-402; BattleUnit::updateGeoscapeStats 2182-2186; postMissionProcedures 2195-2261 (closing brace at 2261; improveStat 2268-2275 follows). All opened this pass. Callers opened: /mnt/frankendom-donors/OpenXcom-OpenXcom/src/Battlescape/DebriefingState.cpp lines 600-635, 1175-1220, 1255-1275.

## 1. Mechanism
- Donor: OpenXcom soldier career. A soldier has a rank (rookie, squaddie, sergeant, captain, colonel, commander; Soldier.h 28), a mission count, a kill count and stats. Kills are counted in combat, then folded into the soldier after the mission.
- Per-mission path (DebriefingState.cpp, the debrief builder): a soldier who died has BattleUnit::updateGeoscapeStats called directly (1190); one who went missing likewise (1269); a surviving soldier who counts as having left the field properly (1211 condition) gets postMissionProcedures (1214). updateGeoscapeStats (2182-2186) adds one mission and the battle's kills to the soldier (addMissionCount, addKillCount 399-402). postMissionProcedures (2195-2261) calls updateGeoscapeStats itself (2203), so it is not a second step after it.
- postMissionProcedures: sets wound recovery to a random value between 0.5 and 1.5 of the health lost (2208-2210); for bravery, reactions, firing, melee, throwing, psi skill and psi strength it adds a gain when the experience counter is non-zero and the stat is under the soldier's cap (bravery +10 with chance, others by improveStat, which maps the counter to a random 0-1 / 1-3 / 1-4 / 2-6 gain, 2268-2275). If any of the experience counters for bravery, reactions, firing, psi skill, psi strength or melee is non-zero (throwing is not in that test, line 2242) it also sets the rookie to squaddie via promoteRank (2245-2246) and adds small random gains to TU, health, strength and stamina below their caps (2247-2255). It returns whether that improved flag was set.
- Rank ladder: SavedGame::handlePromotions (1510-1608) is called once from the debrief (DebriefingState.cpp 629) with the list of soldiers who were units in the battle (dead ones included, 620-628). It counts the soldiers in all bases and soldier transfers by rank (1516-1531, processSoldier 1615-1634). The roster size is that total. Then, top down: if there is no commander and the roster is 30 or more, the best colonel (by score) becomes commander (1535-1549, one only). Then colonels are filled to roster / 23 from captains, captains to roster / 11 from sergeants, sergeants to roster / 5 from squaddies, each in a loop that stops at once when no eligible soldier is found (1551-1605). It returns true if any promotion happened. Rookies are never promoted here.
- inspectSoldiers (1643-1660): among soldiers of the asked rank, the highest score strictly above 0 wins; with Options::fieldPromotions on, only soldiers who were in the battle's participant list count.
- Score (getSoldierScore 1667-1675): 2 x health + 2 x stamina + 4 x reactions + 4 x bravery, plus 3 x (TU + 2 x firing), plus melee, throwing and strength, plus psi strength + 2 x psi skill only when psi skill is above 0, plus 10 x (missions + kills).
- Output: new ranks, a promotion flag for the debrief screen (soldiers promoted above squaddie set _recentlyPromoted in promoteRank, 326-329).

## 2. Key functions
- Soldier::promoteRank | /mnt/frankendom-donors/OpenXcom-OpenXcom/src/Savegame/Soldier.cpp | 323-331 | moves the rank up one step and flags a recent promotion above squaddie.
- Soldier::addKillCount | /mnt/frankendom-donors/OpenXcom-OpenXcom/src/Savegame/Soldier.cpp | 399-402 | adds battle kills to the soldier's total.
- SavedGame::handlePromotions | /mnt/frankendom-donors/OpenXcom-OpenXcom/src/Savegame/SavedGame.cpp | 1510-1608 | one commander if none and roster >= 30, then fills colonel, captain and sergeant quotas top down, by score.
- SavedGame::inspectSoldiers | /mnt/frankendom-donors/OpenXcom-OpenXcom/src/Savegame/SavedGame.cpp | 1643-1660 | returns the highest-scoring (score above 0) soldier of a rank (participants only in field mode).
- SavedGame::getSoldierScore | /mnt/frankendom-donors/OpenXcom-OpenXcom/src/Savegame/SavedGame.cpp | 1667-1675 | the weighted score used to rank candidates.
- BattleUnit::updateGeoscapeStats | /mnt/frankendom-donors/OpenXcom-OpenXcom/src/Savegame/BattleUnit.cpp | 2182-2186 | adds one mission and the battle kills to the soldier.
- BattleUnit::postMissionProcedures | /mnt/frankendom-donors/OpenXcom-OpenXcom/src/Savegame/BattleUnit.cpp | 2195-2261 | calls updateGeoscapeStats, then wound recovery, stat gains from battle experience, and the rookie promotion.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Rank quota = roster size divided by a per-rank divisor, filled from the top rank down | Divisors 23 (colonel), 11 (captain), 5 (sergeant) (theirs, SavedGame.cpp 1551, 1570, 1589) |
| Commander seat only when the roster is large enough | Threshold 30 soldiers (theirs, SavedGame.cpp 1537) |
| Promote the best-scored candidate in the rank below | Score weights 2, 2, 4, 4, 3, 6, 1, 1, 1, psi 1 and 2, 10 per mission or kill (theirs, SavedGame.cpp 1670-1674) |
| Experience counters turn into stat gains bounded by a cap | Per-stat caps (theirs, soldier rules getStatCaps, not read) and gain tables (theirs, BattleUnit.cpp 2268-2275) |
| One-shot per-mission bookkeeping after the debrief | Recovery range 0.5 to 1.5 of health lost (theirs, BattleUnit.cpp 2210) |

## 4. TypeScript sketch
simplified: rookie and the rookie-to-squaddie step are omitted (ranks here start at squaddie = 0); the transfers and base scan is replaced by a plain roster; the score is passed in as a number, not computed from stats; soldiers promoted do not set a recent-promotion flag; the count bookkeeping is replaced by counting the roster per rank each pass (same result); stat gains and wound recovery are omitted.
```ts
// Licence: GPL-3.0-or-later | clean-room: written from the mechanism, no donor lines.
// Rank by quota: commander first (one seat, only if none and the roster is big enough), then each lower
// rank is filled to roster / divisor from the best-scored candidate of the rank below.
// Ranks: 0 squaddie, 1 sergeant, 2 captain, 3 colonel, 4 commander.
interface Soldier { id: string; rank: number; score: number; onMission: boolean; }

const QUOTA = [
  { to: 3, from: 2, perSoldiers: 23 },   // colonel from captain (theirs)
  { to: 2, from: 1, perSoldiers: 11 },   // captain from sergeant (theirs)
  { to: 1, from: 0, perSoldiers: 5 },    // sergeant from squaddie (theirs)
];
const COMMANDER_ROSTER = 30;             // theirs

function best(roster: Soldier[], rank: number, fieldOnly: boolean): Soldier | undefined {
  let top: Soldier | undefined;
  for (const s of roster) {
    if (s.rank !== rank || s.score <= 0) continue;          // the scan starts at 0, so a score must beat 0
    if (fieldOnly && !s.onMission) continue;
    if (!top || s.score > top.score) top = s;
  }
  return top;
}

function promote(roster: Soldier[], fieldOnly: boolean): Soldier[] {
  const made: Soldier[] = [];
  if (roster.length >= COMMANDER_ROSTER && !roster.some(s => s.rank === 4)) {
    const c = best(roster, 3, fieldOnly);
    if (c) { c.rank = 4; made.push(c); }
  }
  for (const q of QUOTA) {
    const want = Math.floor(roster.length / q.perSoldiers);
    while (roster.filter(s => s.rank === q.to).length < want) {
      const pick = best(roster, q.from, fieldOnly);
      if (!pick) break;                  // nobody eligible: the seat stays empty
      pick.rank = q.to;
      made.push(pick);
    }
  }
  return made;
}
```

## 5. Lands in
- Frankendom file(s): none for the quota ladder. origins/progression/model.ts already makes rank a pure function of total credit (its comment: levelOfCredit "drives rank, and only this"; tierOf, nextLegend), and the award is paid by origins/server/mob-rewards.ts (mobBatch) and origins/server/career.ts (pitBatch). A roster-relative rank quota would contradict that, so the donor's ladder is not ported. The only reusable part is the score formula idea (a weighted sum of stats plus 10 per mission or kill) as a possible tie-break or leaderboard ordering, which would be a new pure function in origins/progression/model.ts built only from server-recorded fields; nothing needs it today.
- Parity-checklist row: 18 (loot roll and XP award; progression state paid by the server). The per-mission record in row 19 (fight record and replay) is the only source an award may read.
- Reuse tag: rewrite-from-idea (GPL-3; mechanism only), not planned.
- Brief rule served: (category default, not per-cell) one-character, one-ledger rule; rules 7-9 n/a

## 6. Gaps and risks
- Frankendom ruling "one ledger": rank is derived from credit, so a quota pass that writes ranks separately would create a second source of truth for rank.
- Frankendom ruling "server-verified kills": the donor takes kills from the battle unit and experience counters from the client-side battle state; Frankendom may only pay from a server-replayed fight.
- The donor ladder is relative (roster size and other soldiers' scores decide promotion), so one player's rank changes when others join or leave. Frankendom's career is per character and absolute; a relative ladder cannot sit in the same ledger.
- Stat gains use RNG.generate (BattleUnit.cpp 2210-2255, 2268-2275). Frankendom awards are integer and seeded (model.ts), so any ported gain table must use the seeded stream.
- The pass runs once per debrief, not per kill (DebriefingState.cpp 629), and counts the dead as participants. Frankendom pays per verified kill.
- Stat caps come from soldier rules (getStatCaps, not read). Frankendom would need catalogue fields ("no hidden numbers").
- GPL-3: mechanism only, no code lifted.
