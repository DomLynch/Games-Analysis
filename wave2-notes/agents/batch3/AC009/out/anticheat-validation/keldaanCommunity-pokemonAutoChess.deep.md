# keldaanCommunity-pokemonAutoChess (anticheat-validation, cell 6)

Donor: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/rooms/commands/game-commands.ts` (with `app/rooms/game-room.ts`, `app/utils/board.ts`, `app/config/game/board.ts`, `app/config/server/network.ts`, `app/public/src/game/game-container.ts`) | Licence: GNU GPL v3 (LICENSE file, "GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007") | TypeScript | symbol `OnBuyPokemonCommand`, `OnDragDropPokemonCommand`

Checked: Read in full: `OnBuyPokemonCommand` (game-commands.ts 159-216) and the SHOP message handler (game-room.ts 379-387). Read the `OnDragDropPokemonCommand` (308-455) checks, the rejection path (442-443) and the room DRAG_DROP handler (game-room.ts 423-439). Read the team-cap helper (utils/board.ts 72-78), the board constants, the sim-step clamp (game-room.ts 716-722; network.ts 12) and `OnUpdateCommand` (game-commands.ts 1149-1170). Read the client cancel handler (game-container.ts 800-812). Read the ban checks (game-room.ts 753-756; lobby-commands.ts 388-440). Not read: the Ditto and Meltan branches (about 340-392), the swap helper, the evolution code, and the Colyseus library's `setTimestep` (not in the donor). Confidence: high on the buy and drag-drop validation order; medium on the timing source. Scope, stated plainly: this donor has no speed, teleport, rate-limit, replay-compare or flag-score check. The validation here asks "is this intent legal now", not "is this client cheating". camera_scope: not applicable (not a camera topic).

## 1. Mechanism

- The client never sends a result. It sends an intent. A shop buy carries one number, the shop slot index (`message.id`). A board move carries a piece id and a target cell. The room attaches the player id from the authenticated session (`client.auth.uid`), never from the message (game-room.ts 379-384; game-commands.ts 323).
- Buy, in order (game-commands.ts 159-216):
  (a) look up the seat by session id; reject if the seat is missing, dead, the slot is empty, or the slot holds the default placeholder (175);
  (b) build a scratch Pokemon from the slot's name only to read its evolution rule; price = `getBuyPrice(name, specialGameRule)`; `hasSpaceOnBench` = free bench cell, or the buy is an evolution (177-185);
  (c) `canBuy = money >= cost && hasSpaceOnBench`; if false, `return` with no message to the client (187-188);
  (d) only now `money -= cost` (190), place the new Pokemon at the first free bench cell (-1 if none), row 0;
  (e) if the Unown reshuffle applies, reassign the whole shop and spend a free roll (207); otherwise set the bought slot to the default (209);
  (f) re-run evolution checks for the seat.
- Board move, in order (game-commands.ts 308-455):
  (a) seat from session; the whole branch runs only if the seat is alive (323-326);
  (b) the piece must exist on this seat's board, and `x` and `y` must be non-null, `0 <= x < 8` and `0 <= y < 4` (328-340). Row 0 is the bench;
  (c) the special-piece branches (Ditto clone, Meltan) and the bench-to-bench swap run first; the PICK-phase rules follow (not read in full, see Checked);
  (d) in PICK, the team cap is `teamSize >= getMaxTeamSize(level, specialGameRule)` (397-402). A bench piece may not land on an empty board cell while the team is at its cap, and a further condition in the same branch refuses some moves onto a full team (read through the conditions, not every line);
  (e) if the move did not succeed, `DRAG_DROP_CANCEL` is sent with the message (442-443). For a living seat the message has `updateBoard` true and `updateItems` false. If the command throws, the room's `catch` sends the same cancel (game-room.ts 436). On success the seat's synergies and board size are recomputed.
  (f) client side: on cancel, if `updateBoard` is set, the last dragged sprite is snapped back to the server's coordinates (game-container.ts 807-812).
- Team cap: `getMaxTeamSize` returns the player's level, or level + 3 under the CROWDED special rule (utils/board.ts 72-78).
- Server step: the room's timestep callback receives `deltaTime` and clamps it to 50 ms before dispatching `OnUpdateCommand` (game-room.ts 716-722; network.ts 12). Inside `OnUpdateCommand`, the round clock is decremented by the step (1157). In the fight phase, each started, unfinished battle is advanced by the same clamped step (1168). So battles are simulated on the server only; the client's messages are intents, not hits.
- Bans: `onJoin` refuses a banned uid (game-room.ts 753-756). The admin ban command requires the actor to be ADMIN or MODERATOR and the target not to be ADMIN (lobby-commands.ts 407-408), sets the flag, removes the target's messages, announces it, and closes the target's sessions with `USER_BANNED` (429). Nothing here scores or flags a client automatically.

## 2. Key functions

- `OnBuyPokemonCommand.execute`: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/rooms/commands/game-commands.ts` 159-216. The buy checks in order: seat, alive, slot, price, bench space, then mutate.
- `OnDragDropPokemonCommand.execute`: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/rooms/commands/game-commands.ts` 308-455. Session identity, alive gate, bounds, PICK-phase team cap, then cancel when not applied.
- Room intake: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/rooms/game-room.ts` 379-387 (SHOP) and 423-439 (DRAG_DROP, with the throw-to-cancel path).
- Team cap: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/utils/board.ts` 72-78 (`getMaxTeamSize`).
- Server step: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/rooms/game-room.ts` 716-722 and `OnUpdateCommand` at `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/rooms/commands/game-commands.ts` 1149-1170.
- Client resync: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/public/src/game/game-container.ts` 800-812 (`handleDragDropCancel`).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Reject an intent when the seat is dead, the slot is empty, the cost is unaffordable or there is no room; mutate only after all checks | Price per Pokemon from `getBuyPrice` (value not read) |
| Bounds check on the target cell before any state read | Board 8 columns (theirs, config/game/board.ts 1) by 4 rows, row 0 the bench (theirs, config/game/board.ts 3) |
| Team cap as a function of the server's level | Cap = level (theirs, utils/board.ts 77); level + 3 under CROWDED (theirs, utils/board.ts 76) |
| Clamp the measured step so a stall advances the sim by at most a fixed amount | 50 ms (theirs, config/server/network.ts 12; applied at game-room.ts 719) |
| Refused move sends a cancel; the client snaps back only the last dragged piece | Cancel flags `updateBoard` / `updateItems` (theirs, game-commands.ts 443 and game-room.ts 436); client snap at game-container.ts 807 |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for buy (seat, alive, slot, price, bench space, then mutate) and for board moves (seat, alive, piece and bounds, team cap on bench-to-empty-cell, then apply or resync). It omits the donor's Unown reshuffle, evolution checks, Ditto and Meltan branches, the swap helper, synergy and board-size updates, the pick-phase rules for pieces that do not count toward the team, the client-side snap, and the Colyseus timing. The sketch adds an integer check on the slot index and on the cell coordinates, which the donor does not do (it relies on the array lookup and the `!= null` checks). The step clamp is the donor's rule applied to a plain function.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Piece {
  id: string;
  name: string;
  cost: number;
  x: number;   // board column 0..7
  y: number;   // row, 0 = bench
}

interface Seat {
  uid: string;                 // set from the session at connect time, never from a message
  alive: boolean;
  money: number;
  level: number;
  shop: (string | null)[];     // server-held offer, slot index -> pokemon name
  pieces: Piece[];             // everything this seat owns on bench and board
}

const BOARD_WIDTH = 8;
const BOARD_SIDE_HEIGHT = 4; // row 0 is the bench
const MAX_SIM_DT_MS = 50;

// Team cap is a function of the server's level for this seat, not of anything the client sent.
function teamCap(level: number, crowded: boolean): number {
  return crowded ? level + 3 : level;
}

// Buy intent: the message carries one slot index. Anything else is rejected silently.
function buyFromShop(
  seat: Seat,
  slotIndex: number,
  price: (name: string) => number,
  nextId: () => string
): boolean {
  if (!seat.alive) return false;
  const name = seat.shop[slotIndex];
  if (!name) return false;
  const cost = price(name);
  const benchFree = seat.pieces.filter((p) => p.y === 0).length < 8;
  if (seat.money < cost || !benchFree) return false;
  seat.money -= cost;
  const x = [0, 1, 2, 3, 4, 5, 6, 7].find(
    (col) => !seat.pieces.some((p) => p.y === 0 && p.x === col)
  );
  seat.pieces.push({ id: nextId(), name, cost, x: x ?? -1, y: 0 });
  seat.shop[slotIndex] = null;
  return true;
}

// Drag intent: the message names a piece id and a target cell. The server checks ownership,
// range and the team cap, then either applies the move or asks the client to re-sync that piece.
function moveOnBoard(
  seat: Seat,
  pieceId: string,
  x: number,
  y: number,
  crowded: boolean
): { applied: boolean; resyncBoard: boolean } {
  if (!seat.alive) return { applied: false, resyncBoard: false };
  const piece = seat.pieces.find((p) => p.id === pieceId);
  const inRange =
    x >= 0 && x < BOARD_WIDTH && y >= 0 && y < BOARD_SIDE_HEIGHT;
  if (!piece || !inRange) return { applied: false, resyncBoard: true };

  const target = seat.pieces.find((p) => p.x === x && p.y === y);
  const fromBench = piece.y === 0;
  const onBoardCount = seat.pieces.filter((p) => p.y > 0).length;
  const full = onBoardCount >= teamCap(seat.level, crowded);
  // Bench piece onto an empty board square while the team is at its cap: refused.
  if (fromBench && y > 0 && !target && full) {
    return { applied: false, resyncBoard: true };
  }
  piece.x = x;
  piece.y = y;
  return { applied: true, resyncBoard: false };
}

// Server tick: the step length is measured, then clamped, so a stall advances the sim by at most 50 ms.
function stepSimulation(measuredDtMs: number, sim: (dtMs: number) => void): void {
  sim(Math.min(MAX_SIM_DT_MS, measuredDtMs));
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/ac009-pac-intake.ts), exit 0.

## 5. Lands in

- TARGET `origins/server/intake.ts` (new): one server-side intake gate for shop and bench intents. It reads server-held state only, and it is the place the room's message handlers call before any mutation. Not in `src/fight`, because a shop purchase is not a fight action.
- Parity-checklist row 5 (controls/input; intake). Row 5 is the closest fit in the 1-23 list. No row covers a shop purchase. Row 18 (loot roll and XP award) is not the right row, because this donor's buy is not a loot roll. The step clamp in section 3 belongs to the post-K item 3 sub-line "server tick: fixed step, input intake, per-tick NPC budget", not to row 5.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only; the shape of the checks, not the code)
- Brief rule served: 1 (one engine, server-verified intent)

Best transferable idea: The client sends an index or an id and never a result; the server reads the seat from the session, checks the seat's own state in a fixed order, mutates only after every check passes, and answers a refused board move with a resync for that one piece.
Decision (proposed): adapt — the donor refuses a buy silently, so the client's shop goes stale until its next update; Frankendom's intake should answer every refused intent with a reason and a resync flag so the client can roll back the one object it moved.
Acceptance: A server test sends a buy for an out-of-range slot, for a dead seat and for an unaffordable Pokemon; each is refused, gold and bench are unchanged, and a refused board move returns a reject that carries the resync flag for that piece.

## 6. Gaps and risks

- Scope: this donor has no anticheat detector. There is no speed or teleport check, no rate limit in these handlers (a grep for throttle and debounce found only the utility definitions; I did not check whether anything calls them), no replay compare, no score, no flag or ban pipeline. The validation is game-rule legality. Do not read it as cheat detection.
- One engine: the validation lives in Colyseus command classes in the room layer, not in a shared engine module. Frankendom's engine is `src/fight`; the same gate must sit in the engine path so the Pit and the zones cannot skip it.
- Server-verified kills: battles are simulated on the server (`simulation.update(deltaTime)`, game-commands.ts 1168), so the client sends no hits here. I did not check for any client-sent attack message. Frankendom's kill verification is not covered by this donor.
- Payload types: the donor checks `!= null` and array bounds; it does not check that the index or coordinates are integers. Frankendom should validate payload shape at the boundary (for example with a schema) rather than rely on array lookups.
- One ledger: `player.money -= cost` and the board mutation happen in place with no ledger entry. Frankendom's one ledger rule needs an entry for every mutation.
- Team cap is level-driven and rule-driven (CROWDED adds 3). In Frankendom, MAX_ATTACKERS = 3 is an engine constant; the cap would be a zone or encounter field, not a level formula.
- Clamp side effect: the 50 ms clamp keeps the sim stable on a stall but makes the battle clock fall behind wall time. Frankendom's fight clock has to choose the same rule on purpose and test it.
- GPL-3.0: clean-room only. The sketch is written from the mechanism.
