# open-duelyst-duelyst (spawns-encounters, cell 4)

Donor: `/mnt/frankendom-donors/open-duelyst-duelyst/app/sdk/playerModifiers/playerModifierEndTurnRespawnEntityAnywhere.coffee` | Licence: CC0-1.0 (LICENSE and COPYING line 3 read; package.json "license": "CC0-1.0") | CoffeeScript | symbol `PlayerModifierEndTurnRespawnEntityAnywhere.onEndTurn`

Checked: Symbol `PlayerModifierEndTurnRespawnEntityAnywhere.onEndTurn` at playerModifierEndTurnRespawnEntityAnywhere.coffee 20-30 (read in full). Also read: utils_game_session.coffee 97-108 (`getSmartSpawnPositionsFromPattern`, body read), gameSession.coffee 1326, 1845-1849, 1881-1885, 2431-2435, 837-838; modifier.coffee 2111-2132, 2215-2219; spells/spellDeathIncoming.coffee 8-22 (whole file); cards/factory/unity/faction4.coffee 84-91; app/common/config.js 1106-1114. camera_scope: not applicable. Callers: `getSmartSpawnPositionsFromPattern` has more than 20 callers (grep, output truncated at 30 lines); I read only the respawn caller and describe the function body, not every caller. Not read: PlayCardSilentlyAction, `getObstructionAtPositionForEntity`, the client side that replays authoritative sub-actions, and the card's in-game text. Confidence: high on what the code does per end turn; medium on the exact interleaving of the spawn and the duration phase (read from event push order, not run).

## 1. Mechanism

- The effect is "a unit dies now and comes back at the next end turn on a random free cell". It is a two-part effect: a death, then a queued respawn.
- Order of steps when the card resolves (`spellDeathIncoming.coffee` 8-20): (a) if the target is a unit and not a General, build a respawn modifier from a snapshot of the unit's card data taken before the kill (13); (b) apply that modifier to the caster's General (14); (c) then execute the kill (17-20). The General is never respawned: line 12 skips it.
- The respawn modifier has `durationEndTurn: 1` (`playerModifierEndTurnRespawnEntityAnywhere.coffee` 12). The only hook it overrides is `onEndTurn` (20-30).
- At each end turn, `onEndTurn` (20-30) does, only on the authoritative session (23): (a) resolve the cached card from the snapshot (24); (b) collect candidate cells with `getSmartSpawnPositionsFromPattern` over `CONFIG.PATTERN_WHOLE_BOARD` from `{x:0,y:0}` (25); (c) if the list is non-empty (26), pick one index uniformly with `getRandomIntegerForExecution` (27); (d) play the card there as a silent play action owned by the modifier's player (28-30).
- If the candidate list is empty, nothing is placed (26 has no else branch). The modifier still expires (see below), so the unit is lost for good. This is the donor's behaviour, not a feature.
- Candidate filter (`utils_game_session.coffee` 97-108): for each pattern offset, add it to the source cell (104), keep the cell if it is on the board and `getObstructionAtPositionForEntity` is empty for this card (105). Nothing else is checked here.
- Expiry: the end-turn event is pushed when the turn ends (gameSession 1326, with `executeAuthoritativeSubActions: !@getIsRunningAsAuthoritative()`). The duration counter moves later, in a `modifier_end_turn_duration_change` event that is pushed only once the action queue is empty (1845-1849, and 1881-1885 on the other branch). That handler increments `numEndTurnsElapsed` (modifier.coffee 2117) and removes the modifier when it reaches `durationEndTurn` (2124-2126 for active modifiers; 2131-2132 for inactive ones).
- Tick: no per-frame loop. It runs once per end-turn event. Not a timer in seconds.

## 2. Key functions

- `PlayerModifierEndTurnRespawnEntityAnywhere.onEndTurn`: `/mnt/frankendom-donors/open-duelyst-duelyst/app/sdk/playerModifiers/playerModifierEndTurnRespawnEntityAnywhere.coffee` 20-30. The whole respawn: authoritative gate, candidate list, random pick, silent play.
- `UtilsGameSession.getSmartSpawnPositionsFromPattern`: `/mnt/frankendom-donors/open-duelyst-duelyst/app/common/utils/utils_game_session.coffee` 97-108. Pattern offsets, on-board and unobstructed filter. Returns the list (not a random pick).
- `SpellDeathIncoming.onApplyEffectToBoardTile`: `/mnt/frankendom-donors/open-duelyst-duelyst/app/sdk/spells/spellDeathIncoming.coffee` 8-20. Queues the snapshot, then kills.
- `GameSession.getRandomIntegerForExecution`: `/mnt/frankendom-donors/open-duelyst-duelyst/app/sdk/gameSession.coffee` 2431-2435. `min + Math.floor(Math.random() * (max - min))`, and marks the executing action as having randomness.
- `Modifier._onEndTurnDurationChange`: `/mnt/frankendom-donors/open-duelyst-duelyst/app/sdk/modifiers/modifier.coffee` 2111-2132. Counts end turns, expires the modifier.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Snapshot the unit before it dies, queue it, place it later | None (ordering in spellDeathIncoming.coffee 13 then 20) |
| Candidate cells = whole board, filtered by on-board and unobstructed | Whole board: offsets from -BOARDCOL to BOARDCOL-1 and -BOARDROW to BOARDROW-1 (config.js 1108-1109, theirs) |
| Uniform random pick among the free candidates | `Math.random` via getRandomIntegerForExecution (gameSession.coffee 2432, theirs) |
| Respawn happens once, on the next end-turn event | `durationEndTurn: 1` (playerModifierEndTurnRespawnEntityAnywhere.coffee 12, theirs) |
| Empty candidate list means the respawn is dropped | None (no else branch, line 26) |
| Respawn is decided only on the authoritative side | `getIsRunningAsAuthoritative()` gate (line 23, theirs) |
| Card cost of the effect | `card.manaCost = 3` (faction4.coffee 91, theirs; not a respawn rule) |

## 4. TypeScript sketch

simplified: the sketch merges the donor's two phases (spawn in the end-turn event, counting in the later duration-change event) into one loop, and scans cells x-outer from 0 instead of the donor's pattern order (x from -BOARDCOL), so the same random number can pick a different cell. It omits the cached-card lookup, the silent play action and its effects on other units, the source attribution, the owner check on the General, the authoritative sub-action replay, the randomness flag used for replay, and the multi-source conflict resolver (not used by this modifier).

```ts
// Licence: CC0-1.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface Pos { x: number; y: number; }

interface PendingRespawn {
  ownerId: number;
  unitData: unknown;        // snapshot taken before the unit died
  endTurnsElapsed: number;
  durationEndTurns: number; // donor: 1
}

interface Board {
  cols: number;
  rows: number;
  isFree(p: Pos): boolean;  // on board and unoccupied (donor: isOnBoard + obstruction check)
  place(p: Pos, ownerId: number, unitData: unknown): void;
}

// Called at the moment a unit is killed by the respawn effect: the snapshot is queued, not placed.
function queueRespawn(pending: PendingRespawn[], ownerId: number, unitData: unknown): void {
  pending.push({ ownerId, unitData, endTurnsElapsed: 0, durationEndTurns: 1 });
}

// Called once per end turn. Only the authoritative side chooses a cell; non-authoritative sessions do not (donor flag, replay not read).
function onEndTurn(pending: PendingRespawn[], board: Board, isAuthoritative: boolean, rng: () => number): void {
  for (const r of pending) {
    if (isAuthoritative) {
      const free: Pos[] = [];
      for (let x = 0; x < board.cols; x++) {
        for (let y = 0; y < board.rows; y++) {
          if (board.isFree({ x, y })) free.push({ x, y });
        }
      }
      if (free.length > 0) {
        const pick = free[Math.floor(rng() * free.length)];
        board.place(pick, r.ownerId, r.unitData);
      }
      // no free cell: nothing is placed and the entry is still removed below (donor behaviour)
    }
  }

  // duration phase, after the queue drains: count the end turn, expire entries at their duration
  for (const r of pending) r.endTurnsElapsed += 1;
  for (let i = pending.length - 1; i >= 0; i--) {
    if (pending[i].endTurnsElapsed >= pending[i].durationEndTurns) pending.splice(i, 1);
  }
}
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population, engine logic; numbers as zone data). Parity-checklist row 23 (zone population: spawn caps, respawn, despawn). Server-verified: the spawn decision only runs on the server.
- Reuse tag: rewrite-from-idea (CC0-1.0 is permissive; code may be adapted, but the card rule itself is not a Frankendom rule)
- Brief rule served: 1 (the server decides the spawn; clients do not choose it); zones as data for the spawn numbers.
Best transferable idea: when a creature dies, queue a snapshot with a timer, and when the timer fires the server places it on a random free spawn cell and (our change, the donor drops it) keeps it queued if none is free.
Decision (proposed): adapt — the queue-then-place-on-the-server shape fits row 23 respawn, but the donor drops the unit when no cell is free and uses a card-turn timer; Frankendom should use a seconds timer from zone data and keep the entry queued while the zone is full.
Acceptance: a server test where a creature killed in zone Z with respawn_s = R reappears at one free spawn anchor after R seconds, only on the server tick; with every anchor occupied or the cap reached, no spawn occurs and the entry stays queued until a slot frees.

## 6. Gaps and risks

- The donor's rule is a card returning to the board at the next end turn, not a zone respawn. The timer is one end turn, not seconds. Frankendom's row 23 needs seconds from zone data.
- Donor drops the respawn when no cell is free (line 26 has no else; the modifier expires at 2124-2126 or 2131-2132 either way). Frankendom must choose: keep queued, or drop with a logged reason. The donor's silent drop is a defect for a fast zone, not a feature to copy.
- Donor picks any free cell on the whole board. Frankendom's zones need spawn anchors and coverage as data. The whole-board pattern (config.js 1106-1114) is the donor's choice, not a rule to port.
- Randomness: `getRandomIntegerForExecution` uses `Math.random` (gameSession.coffee 2432). The donor flags the action as random (2433-2434) so replays know it was random; it does not make the result reproducible. Frankendom wants a seeded server RNG so a fight record can be replayed exactly (row 19).
- The respawn is owned by the caster's player (`getPlayer().getPlayerId()`, line 28) and the modifier sits on the General. Zones have no owner. Frankendom's respawn must not copy the owner rule.
- The respawn fires on the next end-turn event the modifier receives; the onEndTurn body does not check whose turn ended (lines 20-23). Whether an inactive General's modifier receives end-turn events was not verified.
- The snapshot is taken before the kill (spellDeathIncoming.coffee 13, then the kill at 17-20). Frankendom must take the snapshot and apply the kill in one server-side step so one ledger records both.
- Licence CC0-1.0 is a public-domain dedication. It is not in the MIT/Apache/BSD/ISC list, so `licence_class` is recorded as permissive here, with that caveat.
