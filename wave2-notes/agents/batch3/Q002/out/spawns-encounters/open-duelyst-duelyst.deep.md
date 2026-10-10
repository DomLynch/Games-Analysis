# open-duelyst-duelyst (spawns-encounters, cell 1)

Donor: `/mnt/frankendom-donors/open-duelyst-duelyst/app/sdk/playerModifiers/playerModifierEndTurnRespawnEntityAnywhere.coffee` | Licence: CC0-1.0 (root LICENSE file is CC0 1.0 Universal; package.json line 3 `"license": "CC0-1.0"`) | CoffeeScript | symbol `PlayerModifierEndTurnRespawnEntityAnywhere.onEndTurn`

Checked: The hint file is read in full (32 lines). The spell that queues it, `app/sdk/spells/spellDeathIncoming.coffee`, is read in full (22 lines). The tile picker `UtilsGameSession.getSmartSpawnPositionsFromPattern` (97-108) and `getRandomSmartSpawnPositionsFromPattern` (120-139) are read. The turn-end dispatch (gameSession.coffee 1326, 1843-1849) and the modifier duration code (modifier.coffee 2111-2131, 2215-2218) are read. Confidence: high on the order of steps and the numbers. Not read: how the `end_turn` event is routed to a card-attached modifier, so it is not checked whether the respawn fires on the owner's own turn end or on either player's turn end (the hook has no turn check in this file); the obstruction test body `getObstructionAtPositionForEntity`; the `KillAction` path; the board size constants `BOARDCOL` and `BOARDROW` (values not read). Callers: `createContextObject` has one caller in the code, the spell (spellDeathIncoming.coffee:13); `modifierFactory.coffee:2141` only rebuilds the class on deserialize.

## 1. Mechanism

- Trigger: a non-General unit is targeted by the Death Incoming spell. The spell first queues a player-level respawn modifier on the owner's General (lines 13-14) and only then executes a kill action on the unit (lines 17-20). The queue step records the unit's card data (`target.createNewCardData()`), so the copy is made from the unit as it was at death.
- Waiting: the modifier has `durationEndTurn: 1` (line 12). It does nothing until the next end-turn event reaches its `onEndTurn` hook (line 20). The hook is gated on `cachedIsActive` in the base class (modifier.coffee 2216-2218).
- Firing (authoritative side only, line 23): build the candidate list from the whole-board pattern centred on (0,0) (line 25, `CONFIG.PATTERN_WHOLE_BOARD`, config.js 1106-1114). Each offset is kept only if it is on the board and the tile is not obstructed for that card type (utils_game_session.coffee 104-106).
- Pick: if the list is empty, nothing happens (line 26). Otherwise one random index is drawn over the list length (line 27) and a silent play-card action places a copy of the unit on that tile (line 28, executed at line 30).
- Expiry: the end-turn duration tick runs in the end-turn phase, after the `end_turn` event (gameSession.coffee 1843-1849: "this must always be the last thing in the end turn phase"). The modifier is removed when its end-turn count reaches 1 (modifier.coffee 2124-2126). So the respawn hook runs before the tick removes the modifier.
- Result: a unit killed by the spell comes back once, on a random free tile, at the next end-turn event the modifier receives while it is active. If the modifier is not active, the inactive branch of the duration tick removes it without calling the hook (modifier.coffee 2128-2132). If no tile is free at that moment, the respawn is dropped with no retry.

## 2. Key functions

- `PlayerModifierEndTurnRespawnEntityAnywhere.onEndTurn`: `/mnt/frankendom-donors/open-duelyst-duelyst/app/sdk/playerModifiers/playerModifierEndTurnRespawnEntityAnywhere.coffee` 20-30. Gate, candidate list, random pick, silent play.
- `SpellDeathIncoming.onApplyEffectToBoardTile`: `/mnt/frankendom-donors/open-duelyst-duelyst/app/sdk/spells/spellDeathIncoming.coffee` 8-20. Queue the respawn on the General, then kill the unit.
- `UtilsGameSession.getSmartSpawnPositionsFromPattern`: `/mnt/frankendom-donors/open-duelyst-duelyst/app/common/utils/utils_game_session.coffee` 97-108. Pattern offsets filtered by board and obstruction.
- `UtilsGameSession.getRandomSmartSpawnPositionsFromPattern`: `/mnt/frankendom-donors/open-duelyst-duelyst/app/common/utils/utils_game_session.coffee` 120-139. Same filter, then `spawnCount` random picks without replacement (splice at 135). Used by other modifiers, not by this hook (read for comparison).
- `GameSession.getRandomIntegerForExecution`: `/mnt/frankendom-donors/open-duelyst-duelyst/app/sdk/gameSession.coffee` 2431-2434. Random integer from `Math.random`, and it flags the executing action as random.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Queue the respawn before the death is applied, so the copy uses the unit's data at death | None (ordering) |
| Respawn lasts one boundary, then expires | `durationEndTurn: 1` (theirs, playerModifierEndTurnRespawnEntityAnywhere.coffee 12) |
| Candidate tiles = pattern offsets from an origin, kept if on board and unobstructed | Origin (0,0) and whole-board pattern (theirs, playerModifierEndTurnRespawnEntityAnywhere.coffee 25; config.js 1108-1110 builds the offsets from -BOARDCOL/-BOARDROW up to the board size) |
| Pick one candidate uniformly at random | Count 1 (theirs, playerModifierEndTurnRespawnEntityAnywhere.coffee 27) |
| No free tile means no respawn, no retry | Silent drop (theirs, playerModifierEndTurnRespawnEntityAnywhere.coffee 26) |
| Random draw is not seeded: it is `Math.random` and the action is flagged | Flag set at gameSession.coffee 2432-2433 |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (queue, then on a boundary event build candidates, pick one, spawn, then expire the entry). It omits the authoritative-only gate (the server runs it; the sketch is server code by assumption), the card-type obstruction rule (any occupied tile blocks here), the cached active-state check, the `createNewCardData` copy (the sketch stores only the kind), the silent-play flag, and the bonus-turn duration change. It also fires for every queued entry at any boundary, with no owner or active-state check, which the donor does have (the hook is gated on `cachedIsActive`). It does not reorder anything: the donor spawns before the duration tick removes the entry, and so does the sketch. It also keeps the donor's silent drop when no tile is free, as the donor does.

```ts
// clean-room sketch from the described mechanism; not a translation of the donor
type Cell = { x: number; y: number };

interface Board {
  cols: number;
  rows: number;
  occupied(c: Cell): boolean; // true when a unit or blocker sits on the tile
}

interface PendingRespawn {
  owner: number;
  kind: string;
  boundariesLeft: number; // donor: durationEndTurn = 1, so one boundary
}

// Called when a unit dies. The donor queues the respawn before the kill is applied.
function queueRespawn(pending: PendingRespawn[], owner: number, kind: string): void {
  pending.push({ owner, kind, boundariesLeft: 1 });
}

// Candidate tiles: pattern offsets from an origin, kept only if on the board and free.
function candidateTiles(board: Board, origin: Cell, pattern: Cell[]): Cell[] {
  const out: Cell[] = [];
  for (const o of pattern) {
    const c = { x: origin.x + o.x, y: origin.y + o.y };
    if (c.x < 0 || c.y < 0 || c.x >= board.cols || c.y >= board.rows) continue;
    if (board.occupied(c)) continue;
    out.push(c);
  }
  return out;
}

// Called at each boundary event. Spawns at most one unit per queued entry, then expires it.
function onBoundary(
  pending: PendingRespawn[],
  board: Board,
  pattern: Cell[],
  rand: (n: number) => number, // server-side integer in [0, n)
  spawn: (owner: number, kind: string, at: Cell) => void,
): PendingRespawn[] {
  const keep: PendingRespawn[] = [];
  for (const p of pending) {
    const free = candidateTiles(board, { x: 0, y: 0 }, pattern);
    if (free.length > 0) spawn(p.owner, p.kind, free[rand(free.length)]);
    p.boundariesLeft -= 1;
    if (p.boundariesLeft > 0) keep.push(p);
  }
  return keep;
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS exits 0 (file `/tmp/q002-tc/q002-open-duelyst-respawn.ts`).

## 5. Lands in

- TARGET `origins/server/world-spawns.ts`: the server-side respawn of a dead zone unit onto a free tile inside the zone's coverage. Parity-checklist row 23 (zone population: spawn caps, respawn, despawn). Respawn timing is a real-time timer there, not an end-turn boundary (see section 6).
- Reuse tag: adapt-allowed (CC0-1.0: code may be adapted; the sketch above is written from the mechanism).
- Brief rule served: 1 (one engine; zones as data).

## 6. Gaps and risks

- Turn boundary vs real time: the donor's trigger is the owner's end turn (or, as far as this file shows, any end-turn event). Frankendom has no turn; the trigger has to be a timer (respawn s) on the zone. The donor does not give a timer value; the one-boundary rule is the only timing.
- Zones as data: the donor hard-codes `durationEndTurn: 1` and a whole-board pattern in the class. In Frankendom both belong to zone data: respawn seconds and coverage (a radius or a patch, not the whole board).
- Server-verified: the donor gates the spawn on `getIsRunningAsAuthoritative()` (line 23), so the client never places the unit. The random draw itself is `Math.random` (gameSession.coffee 2432); the donor only flags the action as random (2433). Frankendom must draw on the server and send the chosen tile; a client must not be able to re-roll it.
- Silent drop: if the candidate list is empty the respawn is lost (line 26). For a zone that is a player-visible bug (the mob never comes back). Frankendom should decide explicitly: retry each tick until a tile is free, or cap the wait.
- Whose turn: this hook has no turn check, and how the event reaches a card-attached modifier was not read. Do not copy a turn rule from it.
- Duelyst's obstruction test is per card type (passed as `cardToSpawn`); a Frankendom zone needs the same test per creature size (not read in the donor).
- Count is fixed at one. Multi-spawn with conflicts between several sources is in the donor (`getRandomNonConflictingSmartSpawnPositionsFromPatterns`, utils_game_session.coffee 151-305, read but not traced end to end). That is a sibling mechanism, not part of this cell.

Reuse tag: adapt-allowed (CC0-1.0). Brief rule served: 1 (one engine; zones as data).

Best transferable idea: queue a dead unit's respawn before its death is applied, then on the next boundary pick one free tile from a coverage pattern and spawn it there, dropping nothing silently.
Decision (proposed): adapt — the free-tile pick inside a zone's coverage fits row 23 respawn, but the turn trigger does not fit real time, and the server must draw the tile itself.
Acceptance: when a zone creature dies with respawn set to N seconds, a creature of that kind appears on a free tile inside the zone coverage within N seconds, chosen on the server; a server test asserts the tile is free and inside coverage, and that a full zone retries instead of dropping the respawn.
