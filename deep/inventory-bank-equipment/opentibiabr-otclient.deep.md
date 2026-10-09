# opentibiabr-otclient (inventory-bank-equipment, cell 9)

Donor: /mnt/frankendom-donors/opentibiabr-otclient/src/client/game.cpp | Licence: MIT | C++ | symbol Game::processInventoryChange / use / move

Symbol check: processInventoryChange (329), move (809), use (846) confirmed. The donor is a client: no inventory rule is decided here.

## 1. Mechanism
- Thin client. The client never decides slot contents. processInventoryChange(slot, item) (329-335) receives what the server already applied, stamps the item position as (UINT16_MAX, slot, 0) when the item is non-null (331-332) and writes it into the local player's slot via `setInventoryItem` (334; null clears the slot).
- Requests only. move(thing, toPos, count) (809-819) first forces count to 1 when it is zero or less (811-812), then returns early when `canPerformGameAction()` is false, the thing is null, or the position is unchanged (814-815; the body of `canPerformGameAction` was not read), then sends a move packet with the item id; creatures send the `Proto::Creature` constant instead (817-818; its value was not read).
- moveToParentContainer (821-828) returns early on cannot-act, null thing or count <= 0, then calls move() with the thing's own x and y and z = 254 (a literal; read as the protocol's "into the parent container" marker, the meaning itself is not defined in this file).
- use(thing) (846-860) returns early on cannot-act or null thing. The position is the thing's own; only when `pos.isValid()` is false (a "virtual item", 852-853) is it replaced with (0xFFFF, 0, 0). It sends a use packet with that position, the id, the stack position and `findEmptyContainerId()` (857; body 1781-1786: first index in `m_containers` that is null), then fires the Lua hook `onUse` with the position, id, stack position and 0 (859).
- Inputs: a thing reference, a target Position, a count. Outputs: outbound packets and Lua callbacks only.
- Runs event-driven: on player input and on each inbound slot packet. No tick.

## 2. Key functions
- Game::processInventoryChange | /mnt/frankendom-donors/opentibiabr-otclient/src/client/game.cpp | 329-335 | writes server-sent slot state into the local player; no validation.
- Game::move | /mnt/frankendom-donors/opentibiabr-otclient/src/client/game.cpp | 809-819 | guards, normalises count, sends the move packet.
- Game::moveToParentContainer | /mnt/frankendom-donors/opentibiabr-otclient/src/client/game.cpp | 821-828 | move into the parent container (z = 254 sentinel).
- Game::use | /mnt/frankendom-donors/opentibiabr-otclient/src/client/game.cpp | 846-860 | use packet with target and empty container id, then onUse hook.
- Game::findEmptyContainerId | /mnt/frankendom-donors/opentibiabr-otclient/src/client/game.cpp | 1781-1786 | first null index in the open-container table.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Client mirrors server slot echoes; sends intents only | Protocol sentinels 0xFFFF (inventory, game.cpp:332 and 853) and 254 (parent container, game.cpp:827) (theirs) |
| Count normalised to at least 1 before a move request | `Proto::Creature` sent in place of the item id (theirs, game.cpp:817) |
| Same-position move suppressed on the client | None |

## 4. TypeScript sketch
simplified: `use` sends the thing's own position and substitutes (0xFFFF, 0, 0) only when the position is invalid (`posValid` flag here), the donor does not test x == 0xFFFF; the Lua `onUse` hook and `findEmptyContainerId` are left to the caller (the container id is passed in); `canAct` stands in for `canPerformGameAction`; null things are not handled; `moveToParent` keeps the donor's own early return.

```ts
// Licence: MIT (opentibiabr-otclient). Lift permitted; re-expression of game.cpp 329-860.
interface Pos { x: number; y: number; z: number; }
interface Thing { id: number; pos: Pos; posValid: boolean; stackPos: number; isCreature: boolean; }
interface Wire {
  sendMove(from: Pos, id: number, stackPos: number, to: Pos, count: number): void;
  sendUse(pos: Pos, id: number, stackPos: number, emptyContainerId: number): void;
}
const INVENTORY_X = 0xffff; // theirs: protocol sentinel for "inventory"
const PARENT_Z = 254;       // theirs: protocol sentinel for "parent container"
const CREATURE_ID = -1;     // theirs: protocol id used for creatures

class InventoryClient {
  private slots = new Map<number, Thing | null>();
  constructor(private wire: Wire, private canAct: () => boolean) {}

  // Server echo only: the client mirrors what the server sent and decides nothing.
  onServerSlot(slot: number, thing: Thing | null): void {
    if (thing) thing.pos = { x: INVENTORY_X, y: slot, z: 0 };
    this.slots.set(slot, thing);
  }
  move(thing: Thing, to: Pos, count = 1): void {
    const n = count <= 0 ? 1 : count;
    const same = thing.pos.x === to.x && thing.pos.y === to.y && thing.pos.z === to.z;
    if (!this.canAct() || same) return;
    this.wire.sendMove(thing.pos, thing.isCreature ? CREATURE_ID : thing.id, thing.stackPos, to, n);
  }
  moveToParent(thing: Thing, count: number): void {
    if (!this.canAct() || count <= 0) return;
    this.move(thing, { x: thing.pos.x, y: thing.pos.y, z: PARENT_Z }, count);
  }
  use(thing: Thing, emptyContainerId: number): void {
    if (!this.canAct()) return;
    const pos = thing.posValid ? thing.pos : { x: INVENTORY_X, y: 0, z: 0 }; // donor: virtual item -> (0xFFFF, 0, 0)
    this.wire.sendUse(pos, thing.id, thing.stackPos, emptyContainerId);
  }
}
```

## 5. Lands in
- Frankendom target: src/fight/gear-room.ts (today: src/gear-room.ts, moving) for the equip intent and the server-echo slot mirror; the pack and bank beyond that are a later economy phase with no file yet.
- Parity-checklist row 15 (gear dressing) for equipped-slot state; row 5 (controls/input) for the client-side intent calls (move, use). Inventory and bank proper are beyond the 22 rows (feature-map: one ledger, server-verified).
- Reuse tag: rewrite-from-idea (the donor is a request/echo shape; the rules that matter are server-side).
- Brief rule served: one-character, one-ledger rule (server inventory is the authority); rules 7-9 n/a

## 6. Gaps and risks
- This donor holds no rules. Stack limits, equip rules and container capacity are all server-side and were not read here.
- Position sentinels (0xFFFF, 254) belong to the OTServ protocol. Frankendom needs its own id scheme.
- `findEmptyContainerId()` (1781-1786) is a linear scan of open client containers; Frankendom has no container windows to scan, so only the idea of a server-chosen target id is relevant.
- `canPerformGameAction` (the actor guard in move, moveToParentContainer and use) was not read.
- Server-verified rule: every move and use must be validated on the server. This donor shows only the request shape.
- No bank in this donor.
