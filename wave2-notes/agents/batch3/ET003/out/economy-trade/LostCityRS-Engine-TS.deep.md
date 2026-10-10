# LostCityRS-Engine-TS (economy-trade, cell 2)

Donor: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/script/handlers/InvOps.ts` (with `src/engine/Inventory.ts`, `src/engine/entity/Player.ts`, `src/engine/World.ts`) | Licence: MIT (`LICENSE` line 1: "MIT License"; line 3: "Copyright (c) 2023-2026 Lost City"; code may be adapted, this note re-expresses the mechanism and copies no lines) | TypeScript | symbol `BOTH_MOVEINV` (InvOps.ts 373)

Checked: `BOTH_MOVEINV` read in full (InvOps.ts 373-490). `Inventory.add` and `Inventory.remove` read (Inventory.ts 107-149, 152-215). `Player.invAdd` read (Player.ts 1548-1554). `World.addObj` read (World.ts 1465-1490). `World.cycle` read in part (340-350, 412-425, 498-512) and `processCleanup` (1139-1200, read for the shop restock, not used here). `InvType` decode read (cache/config/InvType.ts 60-112). Confidence: high on the swap order, conservation and the log order. Medium on the expiry path: I read the lifecycle set (World.ts 1489) and the grep hit `Obj.ts` 36, but not the despawn removal code. Not read: the trade content scripts (not in this repo; the accept and fairness logic lives there), `Obj.setLifeCycle`, `Zone.addObj`, the logger transport (LoggerServer and LoggerClient seen by grep only), and the "revealObj" body (the 100-tick reveal is a comment at World.ts 1487, not read in code). Second candidate, read but not written as this cell's note (one note per game and category): shop restock in `processCleanup` (World.ts 1167-1200): per-slot stock target and rate in ticks, with unlisted stock decaying one unit per 100 ticks (`INV_STOCKRATE`, World.ts 122).

Best transferable idea: A trade is one server transaction that moves both offers, conserves every unit (into the receiver's bag, or onto the floor reserved to the receiver when the bag is full), and writes one ledger row with both sides' values read before anything moves.
Decision (proposed): adapt - take the one-transaction shape, conservation and the two-sided ledger row; do not copy the floor overflow with a silent 200-tick despawn, because an item that expires without a row breaks the one-ledger ruling. Expiry must be a logged row (or a return to the owner), and the swap is one server call, not two opcodes that content runs in turn.
Acceptance: a server test in which A offers three stacks and B has one free slot: after the swap every unit is in B's bag or on the floor owned by B, the total per item id is unchanged, one TRADE ledger row holds both sides' values (cost x count), and a floor item that passes its time limit writes an EXPIRED row rather than vanishing.

## 1. Mechanism

- Two calls of one opcode move a player's offer inventory into the other player's inventory. The primary call (intOperand 0) moves player 1's offer to player 2; the secondary call (intOperand 1) moves player 2's offer to player 1 (379-387). The engine does the move. It does not check fairness: the comment at 412 says "we're going to assume the content has made sure this will go as expected".
- Order of steps (primary call):
  (a) Source and destination players are picked by the flag (386-387).
  (b) Protection checks run before any change (393-398). If an inventory has `protect` set and the script lacks protected access to that player, it throws, unless the inventory scope is shared (393 and 397 both test `scope !== InvType.SCOPE_SHARED`).
  (c) Walk every source slot (401-419). Empty the slot first (`fromInv.delete(slot)`, 419), then add to the destination (423): `overflow = count - toPlayer.invAdd(...)`. `invAdd` returns how many units `Inventory.add` placed (Player.ts 1554; Inventory.ts 107-149).
  (d) Overflow goes to the floor (425-431). If the type is not stackable or the overflow is one unit, one floor object is created per unit; otherwise one object holds the whole overflow count. Each goes on the destination's tile, owned by the destination (`toPlayer.hash64`), with a 200-tick lifecycle (430). World.addObj sets the receiver and the lifecycle from the duration (World.ts 1487-1490); the comment at 1487 says receiver objects reveal to others after 100 ticks.
  (e) Value: `fromTotal += type.cost * obj.count` (441), for the log only.
  (f) Log (447-490). If the source inventory is `dueloffer` (a duel offer), log a STAKE event with the source's items and value (447-455). Otherwise, only on the primary call (456), read the other player's offer inventory (461) and total its items at cost x count, then log one TRADE event with both sides' items and values (482-490). The read happens before the secondary call moves that side.
- Secondary call: the same move in reverse, with no log (456). Together the two calls are the swap.
- Conservation: for each source stack, `added + overflow = count` (423). Nothing is created or destroyed inside the call, except by the floor expiry in step (d), which is outside the call.
- Tick: `World.cycle` (340) runs every `TICKRATE` 600 ms (120). It reschedules with drift compensation (504 advances `nextTick`; 508 sets the next timeout). So 200 ticks is about 120 s at the donor's rate.

## 2. Key functions

- `BOTH_MOVEINV`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/script/handlers/InvOps.ts` 373-490. The whole swap, the checks, the overflow and the log.
- `Inventory.add`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/Inventory.ts` 107-149. Non-stackable: fill the first free slots from `beginSlot`. Stackable: merge into the first slot with the id, else the next free slot. Returns the count placed (149).
- `Player.invAdd`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/Player.ts` 1548-1554. Thin wrapper over `Inventory.add` with `beginSlot` -1.
- `World.addObj`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/World.ts` 1465-1490. Places a floor object and, when there is a receiver, sets the receiver and the lifecycle (1489-1490).
- `World.cycle`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/World.ts` 340-508. The fixed 600 ms loop that drives the lifecycle ticks.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Empty the source, add to the destination, keep the remainder: added + overflow = count | none (423) |
| Overflow stays with the receiver (floor object reserved to them) | receiver64 set at World.ts 1490 |
| Floor object expires on its own timer | 200 ticks (InvOps.ts 430) |
| Receiver objects reveal to others after a delay | 100 ticks (comment only, World.ts 1487; reveal code not read) |
| Value of a unit for the ledger | cost x count (InvOps.ts 441, 461-476); `ObjType.cost` not read |
| Tick length the timers count in | 600 ms, "DO NOT CHANGE" (World.ts 120) |

## 4. TypeScript sketch

simplified: the sketch merges the donor's two calls into one function and reads both offers before moving either. The donor reads the other side in its first call, before the second call moves it, so the ledger values match. It keeps the overflow-to-floor rule, the receiver ownership, the cost x count value and the conservation rule. It omits the protected-access checks (script access rules), the `dueloffer` STAKE branch, the reveal logic, zone and tile placement, the wealth-event transport and the expiry handling; it stores each floor entry as one stack (the donor makes one object per unit for non-stackables). It does not expire floor items: the donor's 200-tick despawn is the loss path rejected in section 6, and the constant is kept only as data.
```ts
// Licence: MIT (donor). Re-expressed from the described mechanism; not a line-by-line translation.
type Stack = { id: number; count: number };
type Bag = { slots: (Stack | null)[] };
type Side = { owner: string; bag: Bag; offer: Stack[] };
type Ground = { id: number; count: number; owner: string; ttlTicks: number };
type ItemMeta = { cost: number; stackable: boolean };
type TradeRow = { a: string; b: string; aValue: number; bValue: number; aItems: Stack[]; bItems: Stack[] };

const GROUND_TTL_TICKS = 200; // donor value (InvOps.ts 430); here it is zone data

// Returns how many units fit in the bag (donor: Inventory.add returns the completed count).
function bagAdd(bag: Bag, id: number, count: number, meta: ItemMeta): number {
  if (meta.stackable) {
    const hit = bag.slots.findIndex(s => s !== null && s.id === id);
    const idx = hit !== -1 ? hit : bag.slots.indexOf(null);
    if (idx === -1) return 0;
    const cur = bag.slots[idx]?.count ?? 0;
    bag.slots[idx] = { id, count: cur + count };
    return count;
  }
  let added = 0;
  for (let i = 0; i < bag.slots.length && added < count; i++) {
    if (bag.slots[i] === null) {
      bag.slots[i] = { id, count: 1 };
      added++;
    }
  }
  return added;
}

// Receiver's bag first; any overflow lands on the floor, reserved to the receiver.
function place(to: Side, stack: Stack, ground: Ground[], meta: (id: number) => ItemMeta): void {
  const added = bagAdd(to.bag, stack.id, stack.count, meta(stack.id));
  const overflow = stack.count - added;
  if (overflow > 0) {
    ground.push({ id: stack.id, count: overflow, owner: to.owner, ttlTicks: GROUND_TTL_TICKS });
  }
}

// One call for the whole swap. Both offers are taken before anything moves, so the ledger row
// records both sides as they were offered.
function swapOffers(a: Side, b: Side, ground: Ground[], meta: (id: number) => ItemMeta, ledger: TradeRow[]): void {
  const aOffer = a.offer.splice(0);
  const bOffer = b.offer.splice(0);
  const value = (xs: Stack[]): number => xs.reduce((sum, s) => sum + meta(s.id).cost * s.count, 0);
  ledger.push({ a: a.owner, b: b.owner, aValue: value(aOffer), bValue: value(bOffer), aItems: aOffer, bItems: bOffer });
  for (const s of aOffer) place(b, s, ground, meta);
  for (const s of bOffer) place(a, s, ground, meta);
}
```

## 5. Lands in

- TARGET `origins/server/trade.ts` (proposed new module; the Frankendom tree was not read). The one server swap, its floor overflow and its ledger row.
- Parity-checklist row: none fits the swap itself. The closest is row 21 (catalogue fields), for the `cost` value the ledger reads. Treat this as a partial fit, not a row for the swap.
- Reuse tag: rewrite-from-idea (MIT; re-expressed, no lines copied)
- Brief rule served: one ledger and server-verified transactions (Frankendom rulings); rules 7-9 n/a

## 6. Gaps and risks

- Silent loss: floor objects are removed after 200 ticks (InvOps.ts 430; the despawn path not read). An item that expires with no ledger row breaks the one-ledger ruling. Frankendom needs an EXPIRED row, or a return to the owner, for every expired unit.
- Two calls, no transaction: the swap is two opcode calls that content runs in turn. If the content stops or throws between them, the first half has already moved (the moves run inside each call, 401-441). Frankendom needs one server transaction that either moves both offers or moves neither.
- Fairness is not the engine's job here: the comment at 412 leaves the outcome to the content. Frankendom's server must check accept state and an offer snapshot itself, so a client cannot change an offer after accept.
- The value in the ledger is a snapshot of cost x count at call time (441, 461-476). It is not a price check. Frankendom should record the value the server used for each side.
- One inventory type serves both offers (461 reads the other side from the same `from` type). That is a constraint the donor relies on; Frankendom's trade offers need the same type on both sides or an explicit mapping.
- The duel STAKE branch logs only the source side (447-455). Frankendom's duel stakes should log both sides, or the stake log cannot reconstruct a lost stake.
- Floor placement uses the receiver's tile (430). Frankendom's zones are data on one runtime, so floor placement needs the zone's tile rule, which was not read.
- Pit client: trade UI is client-only; the server must own the swap, the floor overflow and the ledger, never the client.

Receipts: `/private/tmp/p2/wave2-haiku/batch3/ET003/receipts.tsv` (rows for LostCityRS-Engine-TS; verify_receipts.py: all rows pass, see the final table).
