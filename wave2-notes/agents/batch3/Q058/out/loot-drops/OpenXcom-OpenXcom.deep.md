# OpenXcom-OpenXcom (loot-drops, cell 1)

Donor: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Battlescape/BattlescapeGenerator.cpp` (with `src/Battlescape/DebriefingState.cpp`) | Licence: GPL-3.0 (LICENSE.txt: "GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007"; file headers: "either version 3 of the License, or (at your option) any later version") | C++ | symbol `BattlescapeGenerator::nextStage` (stage-end sort) and `DebriefingState::prepareDebriefing` (recovery)

Checked: `nextStage` is defined at BattlescapeGenerator.cpp 193 and was read through 402 (the timeout, sort and cleanup blocks). `prepareDebriefing` is at DebriefingState.cpp 786; the recovery code at 805-806 and 1328-1467 was read; `recoverItems` at 1648 was read through 1700 (not 1700-1730). Hint file `UnitDieBState.cpp` was read in full (200 lines): it is the death-animation and danger-node state and moves no items, so it is the wrong file for loot. `nextStage` has one caller found by grep (BattlescapeState.cpp 2048); that caller's context was not read. `camera_scope` does not apply (loot cell). Confidence: high on the bucket rules and their order; medium on what happens to items held by dead enemies (I read the owner check at 304 and the removal loop at 382-402, but not the path a dead enemy's gear takes).

Best transferable idea: When an encounter ends, sort every drop into "safe" (taken home regardless), "at risk" (taken home only on a clean clear), or "carried" (stays with a surviving player), and decide the bucket from the drop's place and the clear state, not from a roll.
Decision (proposed): adapt - keep the three-bucket split and the "at risk only on a clean clear" gate as one server-side rule in `src/fight/loot.ts`, run once when a zone is cleared or left, writing ledger rows with a state; do not copy the physical floor-item model, because Frankendom loot is ledger rows on one ledger, and zones are data (the exit area belongs in zone data).
Acceptance: In a two-player zone fixture, the server ledger credits a drop lying in the zone only after a clean clear, and a player who aborts leaves that drop uncredited while a drop held by a surviving player moves on to the next zone stage.

## 1. Mechanism

- Trigger: `nextStage` runs once when a battle moves to its next stage. Every item in the battle is sorted into one of four containers: take home guaranteed, take home conditional, carry to next stage, or remove (BattlescapeGenerator.cpp 193, 291-293, 382-402).
- Order of the steps as the code runs:
  (a) Player units that are not out drop any unit-body item they carry onto their tile (loop 201-222; the drop is the addItem at 216). An unconscious body is moved to that tile.
  (b) Hostile units are counted. A hostile unit (original faction hostile, not out) that still has its original faction is counted in `aliensAlive` (241-245). Only a hostile unit whose faction has changed and that has a tile reaches the item drop: its non-fixed items go to the STR_GROUND inventory and are erased from its own inventory (246-253).
  (c) Timeout. Any unit that passes the test at 235-239 (not dead, and either not a player unit, or a soldier in an aborted battle who is not in the exit area) is sent to timeout (263) and loses its AI module (264-266). The abort gate is at 237, with the exit test at 233.
  (d) The sort. Ammo is skipped at the top (300) and handled with its weapon (373-374). An item is sorted only if it is unowned and is either a soldier's unit-body or recoverable (304). A primed grenade (fuse timer -1 check, 307) is not sorted. Then:
  - Protocol 1, when `aliensAlive == 0` (310): unit-bodies of enemies or dead units, and unresearched items, go to take home guaranteed (316-318); everything else goes to carry to next stage (323).
  - Protocol 2, when hostiles are still alive (326-327): an item on a tile goes to take home conditional (334). If the floor under it is the start point (the skyranger), it goes to guaranteed (338-340). If the floor is the exit grid (343), unit-bodies of enemies or dead units stay conditional (350) and other items go to carry (354). An item with no tile is not placed in either container (331, the `if (tile)` has no else).
  - Last rule: an item still owned by a player soldier always goes to carry to next stage (365).
- Tick: `nextStage` is a one-shot batch call at stage change, not a per-frame loop.
- Debrief (DebriefingState.cpp 786): `aborted = battle->isAborted()` (805); `success = !aborted || battle->allObjectivesDestroyed()` (806). The conditional and floor recovery sits inside the block that runs when `(!aborted || success) && playersSurvived > 0` (1328). Inside it, when not aborted, conditional items and the floor items of every tile are recovered (1368-1394); when aborted, only floor items on start-point tiles are recovered (1397-1402). Guaranteed items are recovered whenever `playersSurvived > 0` (1446-1467).
- Randomness: the recovery rule has none. The one roll in this area is spawn equipment: each alien picks an index with `RNG::generate(0,9)` into the row of `alienItemLevels` for the current month (BattlescapeGenerator.cpp 1064-1075 chooses the row, 1098 picks the entry). A built-in weapon list clamps the level to its last entry (1104-1106).

## 2. Key functions

- `BattlescapeGenerator::nextStage`: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Battlescape/BattlescapeGenerator.cpp` 193-402. The stage-end sort: the classification block is 300-374, the removal and clear is 382-402.
- The protocol split inside it: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Battlescape/BattlescapeGenerator.cpp` 310 (protocol 1) and 326-356 (protocol 2 with start and exit branches).
- `DebriefingState::prepareDebriefing`: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Battlescape/DebriefingState.cpp` 786; the recovery block is 1328-1467.
- `DebriefingState::recoverItems`: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Battlescape/DebriefingState.cpp` 1648-1700. It converts each battle item into base storage, counts rounds left in clips separately, and skips fixed items.
- The two bucket getters: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Savegame/SavedBattleGame.cpp` 2008 (guaranteed) and 2017 (conditional).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Sort each drop once at the encounter end into a bucket, decided by owner, then clear state, then place | Bucket names are theirs (guaranteed, conditional, next stage). No number. |
| "Clean clear" test: no hostile still on its own faction | `aliensAlive == 0` (theirs, BattlescapeGenerator.cpp 310) |
| Outcome gate on the at-risk bucket | Not aborted (theirs, DebriefingState.cpp 1368). `success` does not gate it: aborted with all objectives done still skips conditional items. |
| Survivor gate on the safe bucket | `playersSurvived > 0` (theirs, DebriefingState.cpp 1446) |
| Owner beats place | An owned item goes to carry regardless of place (theirs, BattlescapeGenerator.cpp 365) |
| Equipment tier roll per enemy | 10 rolls, `RNG::generate(0,9)` (theirs, BattlescapeGenerator.cpp 1098). Row for month 0 in `bin/standard/xcom1/alienItemLevels.rul` line 2 is `[0, 0, 0, 0, 0, 0, 0, 1, 1, 2]` (theirs, data file). Months past the table use the last row (1068-1070). |

## 4. TypeScript sketch

simplified: the sketch follows the donor order for the sort (owner first, then the drop gate, then protocol 1 or 2 by whether hostiles remain, then the place rules) and the debrief gate (safe on survival, at risk only on a clean finish). It omits: the separate "unit-body of a soldier" branch of the drop gate (folded into `recoverable`), ammo following its weapon, the mission-map objects counted as stats, the research requirement check (taken as a boolean), the UFO and craft-floor branches, the abort-only start-point floor recovery (folded into `safe`), the alien-alloy divide-by-10/150 rule, and the `(!aborted || success) && playersSurvived > 0` outer gate (the sketch applies the survivor gate to both buckets and the abort gate to at-risk only). Protocol 1 ignores the place (as in the donor).

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Bucket = "safe" | "atRisk" | "carried" | "discard";
type Where = "start" | "exit" | "other" | "none";

interface Drop {
  id: string;
  owner: "none" | "player" | "enemy";  // a unit holding the item
  primed: boolean;                     // live fuse: never recovered
  recoverable: boolean;                // item rules allow recovery
  researched: boolean;                 // false: unresearched find, always taken home
  isBody: boolean;                     // the drop is a unit body
  bodyIsEnemyOrDead: boolean;          // enemy body, or a dead soldier
  where: Where;                        // floor marker under the drop at stage end
}

interface Outcome { aborted: boolean; survivors: number; objectivesDone: boolean; }

// Stage end. Hostiles still alive = protocol 2 (position decides); none left = protocol 1.
function classifyStageEnd(drops: Drop[], hostilesAlive: number): Map<string, Bucket> {
  const out = new Map<string, Bucket>();
  for (const d of drops) {
    if (d.owner === "player") { out.set(d.id, "carried"); continue; }   // held by a soldier: always moves on
    if (d.owner === "enemy" || d.primed || !d.recoverable) { out.set(d.id, "discard"); continue; }
    if (hostilesAlive === 0) {
      out.set(d.id, d.bodyIsEnemyOrDead || !d.researched ? "safe" : "carried");
      continue;
    }
    if (d.where === "none") { out.set(d.id, "discard"); continue; }
    if (d.where === "start") { out.set(d.id, "safe"); continue; }
    if (d.where === "exit") {
      out.set(d.id, d.isBody && d.bodyIsEnemyOrDead ? "atRisk" : "carried");
      continue;
    }
    out.set(d.id, "atRisk");
  }
  return out;
}

// Debrief. Safe drops come home if anyone lived. At-risk drops come home only on a clean finish.
function recoverAtDebrief(buckets: Map<string, Bucket>, o: Outcome): string[] {
  if (o.survivors === 0) return [];
  const home: string[] = [];
  for (const [id, b] of buckets) {
    if (b === "safe") home.push(id);
    else if (b === "atRisk" && !o.aborted) home.push(id);
  }
  return home;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/loot.ts` (new module, proposed): the stage-end sort and the at-risk gate, run once on the server when a zone is cleared or left. Writes ledger rows with a state. Not a client module.
- Parity-checklist row 18 (loot roll and XP award). The server-side run is the "server tick: fixed step, input intake, per-tick NPC budget" sub-line in post-K item 3, because it runs once per zone end, not per tick.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: one ledger (drops are ledger rows with a state, server-verified); zones as data (the exit area and the stage end belong to zone data)

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism. No line of the donor is translated.
- The donor's loot is physical: items on tiles and in inventories, moved between containers. Frankendom has one ledger, so the sort must write ledger rows with a state, not move objects. Do not port the floor model.
- The donor runs the sort once per stage change. Frankendom must make the zone-end run idempotent on the server, so a repeated zone-end does not credit a drop twice. The donor's idempotence was not read (not checked).
- Zones as data: the donor uses the floor marker under the item (START_POINT, END_POINT). Frankendom needs the start and exit areas declared per zone. Both are data fields, not constants.
- Enemy-owned items are discarded in the donor. Frankendom needs a decision on dropped enemy gear, since the server owns loot. The path a dead enemy's gear takes was not read.
- Research gating (unresearched items go safe) depends on progression. The sketch takes it as a boolean. Frankendom must tie it to the progression ledger (row 18 XP award), not to a separate research flag.
- Not read: the BattlescapeState.cpp caller context (2048), `convertUnitToCorpse`, `recoverAlien` (DebriefingState.cpp 1731), and the score/addStat path.
- The alien equipment roll (BattlescapeGenerator.cpp 1098) is spawn gear, not a drop. It is a separate idea (a month-indexed tier table with 10 uniform rolls) and is not part of this decision.
- Pit as client: the sort and the at-risk gate must run on the server only. The Pit may show the result.
