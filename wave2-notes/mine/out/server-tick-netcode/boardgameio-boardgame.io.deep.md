# boardgameio-boardgame.io (server-tick-netcode, cell 5)

Donor: `/mnt/frankendom-donors/boardgameio-boardgame.io/src/master/master.ts` | Licence: MIT (LICENSE: "MIT License, Copyright (c) 2017 The boardgame.io Authors") | TypeScript | symbol `Master.onUpdate`

Checked: `onUpdate` starts at 167 and its body was read through 335 (the metadata save after 335 was not read).

## 1. Mechanism

- There is no timed tick. The server runs one step per client action. `onUpdate(credAction, stateID, matchID, playerID)` is that step: a sequence of rejections, then one state change, then a broadcast.
- Order of checks, each one returns without changing anything: (a) action is missing or has no type (174); (b) the action type is not on the public list of client actions (177); (c) no payload (183); (d) the client marked the action `automatic`, which only the server may do (186); (e) credentials fail the auth check (199); (f) the match is not found (227-229); (g) the game is over (232); (h) undo or redo when more than one player could move (starts 249); (i) the player is not active this turn (267); (j) the named move does not exist for that player (276-284); (k) the client's `stateID` differs from the server's `_stateID` (293).
- If all pass: the action is applied to a copy of the state with a reducer (306). The server then broadcasts either a patch (old state to new state) when the game opts into delta mode, or the whole state (315-325). Each recipient gets a view filtered for that player (`playerView`, filter-player-view.ts 23), so hidden information is not sent.
- Lag handling is by rejection, not rollback: a client acting on out-of-date state is told nothing and is simply ignored (293-300) unless the move opts out with `ignoreStaleStateID`. The client resyncs with `onSync` (478).

## 2. Key functions

- `Master.onUpdate`: `src/master/master.ts` 167-335. The whole intake pipeline above.
- `Master.onSync`: `src/master/master.ts` 478. Full-state resend for a client that fell behind (declaration only read).
- `filterPlayerView`: `src/master/filter-player-view.ts` 23. Builds the per-player copy of state.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Layered rejection: shape, allowed type, no client "automatic", auth, active player, move exists, fresh state id | None (all are checks, no tuning numbers) |
| Optimistic concurrency: monotonic `_stateID`, client must echo it | None |
| Patch or full-state broadcast, filtered per player | `deltaState` per-game flag (theirs, master.ts 315) |

## 4. TypeScript sketch

simplified: omits auth, storage fetch and save, undo/redo rules, per-move opt-out of the stale check, the transient-error middleware and the match metadata update. Errors are returned as strings; the donor mostly logs and returns silently.

```ts
// Licence: MIT (donor). Sketch is our own code, not copied.
interface Action { type: string; payload?: { type: string; args?: unknown[] }; automatic?: boolean }
interface State { stateID: number; over: boolean; active: Set<string>; }
interface Rules {
  publicTypes: Set<string>;
  moveExists(s: State, name: string, player: string): boolean;
  apply(s: State, a: Action, player: string): State;
  view(s: State, player: string): unknown;
}

export function intake(
  rules: Rules, s: State, a: Action, claimedStateID: number, player: string,
  send: (player: string, view: unknown) => void, recipients: string[],
): { error: string } | { state: State } {
  if (!a || !a.type || !a.payload) return { error: "missing action" };
  if (!rules.publicTypes.has(a.type)) return { error: "unauthorized action" };
  if (a.automatic === true) return { error: "unauthorized action" };
  if (s.over) return { error: "game over" };
  if (!s.active.has(player)) return { error: "not active" };
  if (!rules.moveExists(s, a.payload.type, player)) return { error: "no such move" };
  if (s.stateID !== claimedStateID) return { error: "stale state" };
  const next = { ...rules.apply(s, a, player), stateID: s.stateID + 1 };
  for (const r of recipients) send(r, rules.view(next, r));
  return { state: next };
}
```

## 5. Lands in

- TARGET `src/fight/intake.ts` (new module, server-side action intake for engage and attack): checklist row 5 (controls/input) and Brief rule 2 (engage is a state change, kills server-verified). today: no intake module read.
- Ruling (Lead Dev, 2026-10-10): no new row for the server tick. It stays under row 18 / post-K item 3 as the named sub-line "server tick: fixed step, input intake, per-tick NPC budget". Acceptance is many-on-one (Proof 3: N NPC brains inside the tick budget). The action-intake pipeline here is the "input intake" part of that sub-line (also row 5).
- Reuse tag: adapt-ok (MIT; code may be reused with the licence kept)
- Brief rule served: 2 (kills server-verified), 5 (target selection in the engine); rules 7-9 n/a

## 6. Gaps and risks

- It is turn-based. Frankendom is real-time, so a rejected stale action (293) would drop most inputs at 20+ actions a second. Frankendom needs a sequence number per input plus server-side reconciliation, not drop-on-mismatch.
- The `automatic` rule (186) maps directly to the one-ledger rule: clients cannot send server-only events such as a kill.
- No tick means no timers, cooldowns or AI in this file (not read elsewhere). The tick must come from a pattern like the azerothcore note.
- Per-player filtering is whole-state at `playerView` (not read in detail); Frankendom's many-on-one fights need cheaper per-zone interest filtering.
