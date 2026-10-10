# ClassicUO (inventory-bank-equipment, cell 9)

Donor: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Client/Game/ItemHold.cs` (with `Game/GameActions.cs`, `Network/PacketHandlers.cs`, `Game/UI/Gumps/PaperdollGump.cs`) | Licence: BSD-2-Clause (LICENSE.md; `// SPDX-License-Identifier: BSD-2-Clause` header; BSD 2-Clause License, Copyright (c) 2025, andreakarasho) | C# | symbols `GameActions.PickUp`, `GameActions.DropItem`, `GameActions.Equip`, `PacketHandlers.DenyMoveItem`, `PacketHandlers.EquipItem`

Checked: Topic read as moving items between hand, containers, paperdoll and bank, and how the client reconciles a move with the server. Opened in full: `ItemHold.cs` 39-113 (fields by grep only); `GameActions.cs` 474-505 (PickUp tail; the header at 439 by grep) and 508-549 (DropItem, Equip); `PacketHandlers.cs` 1584-1745 (DenyMoveItem, EndDraggingItem, DropItemAccepted), 1807-1864 (EquipItem and its commented-out hold clear), 6033-6050 (AddItemToContainer header and hold check); `PaperdollGump.cs` 455-490 (drop onto paperdoll); `Layers.cs` 1-37; `GameCursor.cs` 421 (grep-located, read only the condition); `PlayerMobile.cs` 383-395 (CloseBank, read first lines only); `Entity.cs` 255 (FindItemByLayer, grep only). Also looked at ContainerManager.cs (member outline only: layout, not a move rule) and OutgoingPackets.cs 633-642 (equip packet builder, first lines). Not read: `AddItemToContainer` body beyond the hold check (6050-6100), `UpdateContainedItems` (2089), the item-update branch that clears a hold at 6397-6403 (its enclosing function was not named), `Send_DropRequest`, `Send_PickUpRequest` bodies, the bank gump, and whether the client ever computes weight (only the `Weight` / `WeightMax` fields are seen, PlayerMobile.cs:117-118). ClassicUO.Renderer (the hint's other tree) grepped for bank and equip: only Animations/Animation.cs matched, not read and not a move rule. Callers: `GameActions.PickUp` and `DropItem` read from their own UI callers (grep only, PaperdollGump.cs, ContainerGump.cs, CounterBarGump.cs, GameSceneInputHandler.cs). Confidence: high on the request, accept and deny order; medium on the clear rules for equip, where the donor is inconsistent (the EquipItem hold clear is commented out). camera_scope: not a camera cell.

## 1. Mechanism

- Pick up is optimistic. `GameActions.PickUp` clears any old hold (GameActions.cs:491), snapshots the item into `ItemHold` (`ItemHold.Set`, GameActions.cs:492), sends a pickup request (GameActions.cs:494), and removes a ground item from the tile (GameActions.cs:498). It then marks the item for removal from the world (`world.ObjectToRemove`, GameActions.cs:503), which `World.Update` applies (World.cs:259). The item is gone from the view while it is in hand; the snapshot holds its origin (`Container`, `X`, `Y`, `Z`, `Layer`, `Flags`, `Serial`, `Graphic`, `Hue`, `TotalAmount`; ItemHold.cs 60-86).
- While in hand, the cursor draws the held item only when `Enabled && !Dropped` (GameCursor.cs:421). `ItemHold.Enabled` is the "in hand, not yet placed" flag; `Dropped` is the "request sent, waiting for the server" flag (ItemHold.cs 39-56). Setting `Enabled` to false also clears `IsFixedPosition` and the fixed coordinates (ItemHold.cs 39-53).
- Drop: `GameActions.DropItem` checks the hold, sends the drop request (GameActions.cs 508-527), then sets `Enabled = false` and `Dropped = true` (GameActions.cs:530-531). The item is not moved locally; the server's update places it.
- Equip: `GameActions.Equip` sends the equip request with the layer from the item's data and the target container (GameActions.cs 535-549; `Send_EquipRequest` at GameActions.cs:544), then sets the same two flags (GameActions.cs:546-547). The paperdoll only calls it when the item is wearable (PaperdollGump.cs:475) and the layer is empty (`equipment == null`, PaperdollGump.cs:481-483). If the layer is occupied, the code I read sends nothing (no else branch).
- Server accepts a drop: `DropItemAccepted` (0x29, registered at PacketHandlers.cs:210) clears `Enabled` and `Dropped` (PacketHandlers.cs:1740). `EndDraggingItem` (0x28, registered at PacketHandlers.cs:209) clears the same two flags (PacketHandlers.cs 1721-1730). The hold data stays; the server's next item update places the item.
- Server denies: `DenyMoveItem` (0x27, PacketHandlers.cs:208) acts only if the hold is `Enabled`, or `Dropped` with an item that is not drawable yet (PacketHandlers.cs 1592-1597). It restores the snapshot origin: to the paperdoll if the container is a mobile (PacketHandlers.cs:1656-1658), to another container through `AddItemToContainer` (PacketHandlers.cs 1617-1621), or to the terrain at the snapshot X, Y, Z (PacketHandlers.cs:1677-1679). Then it clears the hold (PacketHandlers.cs:1693). A reason code below 5 shows a message (PacketHandlers.cs:1707).
- Server equip (0x2E, registered at PacketHandlers.cs:213): `EquipItem` removes the item from its old container unless it is a backpack (PacketHandlers.cs:1818-1821), then sets graphic (the line before 1832) and layer and container from the packet (PacketHandlers.cs:1832-1833). It does not clear the hold: the hold clear is commented out (PacketHandlers.cs 1858-1863), so the hold is cleared only by another packet.
- Clearing a sent hold on an item update: `AddItemToContainer` clears the hold when the hold serial matches and `Dropped` is set (PacketHandlers.cs 6044-6049). A second branch, in an item-update handler whose name I did not read, clears only the two flags and keeps the data when the serial matches and `Dropped` is set (PacketHandlers.cs 6397-6403).

## 2. Key functions

- `GameActions.PickUp`: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Client/Game/GameActions.cs` 439-505. Snapshot, optimistic removal, request.
- `GameActions.DropItem` and `GameActions.Equip`: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Client/Game/GameActions.cs` 508-549. Request, then Enabled off and Dropped on.
- `PacketHandlers.DenyMoveItem`: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Client/Network/PacketHandlers.cs` 1584-1745. Rollback to the snapshot origin.
- `PacketHandlers.DropItemAccepted` and `EndDraggingItem`: same file, 1721-1743. Clear the flags only.
- `PacketHandlers.EquipItem`: same file, 1807-1864. Server-sent item state; hold clear commented out.
- `ItemHold`: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Client/Game/ItemHold.cs` 39-113. The snapshot and the two flags.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Optimistic removal on pick-up, snapshot of origin, request | None (pattern) |
| Two-flag hold: in hand (Enabled), request in flight (Dropped) | None |
| Accept clears flags, the server's next update places the item | None |
| Deny restores the snapshot to paperdoll, container or terrain by the origin type | Reason code below 5 is a message (PacketHandlers.cs:1707) |
| Client gate: equip only into an empty layer; the server still decides | Layer enum, bank = 0x1D (Layers.cs:36) |

No numeric timing or stack limits are in this mechanism (checked: no timers in ItemHold or the handlers read).

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: pick-up snapshot and removal from view, request marked sent, accept clears the hold, deny restores the snapshot, and an authoritative update places the item. It omits the cursor drawing, the paperdoll and bank gumps, the stack amount, hue and flags in the snapshot, the terrain versus container branches of deny (it restores one origin), the reason code, and the commented-out equip hold clear. It is wider than the donor in one place: `serverUpdate` clears a sent hold for any item, whereas the donor clears it in `AddItemToContainer` (PacketHandlers.cs 6044-6049) and not in `EquipItem`.

```ts
// Licence: BSD-2-Clause (donor). Shape only; written from the described mechanism.
// clean-room

type Origin =
  | { kind: "ground"; x: number; y: number; z: number }
  | { kind: "container"; containerId: number; layer: number };

type Hold =
  | { state: "held"; itemId: number; origin: Origin }      // picked up, not yet placed
  | { state: "sent"; itemId: number; origin: Origin }      // drop or equip request in flight
  | null;

class HeldItem {
  private shown = new Map<number, Origin>();   // what the client draws
  private hold: Hold = null;

  constructor(private occupiedLayer: (containerId: number, layer: number) => boolean) {}

  // Client-side gate (donor: PaperdollGump only sends an equip request when the layer is empty).
  canEquip(containerId: number, layer: number): boolean {
    return !this.occupiedLayer(containerId, layer);
  }

  // Donor: GameActions pickup snapshots the item (ItemHold.Set), removes it from the view, and sends a pickup request.
  pickUp(itemId: number): boolean {
    const origin = this.shown.get(itemId);
    if (origin === undefined || this.hold !== null) return false;
    this.hold = { state: "held", itemId, origin };
    this.shown.delete(itemId);                 // optimistic: gone from the view while in hand
    return true;
  }

  // Donor: DropItem / Equip send the request, then Enabled = false and Dropped = true.
  send(): void {
    if (this.hold && this.hold.state === "held") this.hold = { ...this.hold, state: "sent" };
  }

  // Donor: DropItemAccepted (0x29) and EndDraggingItem (0x28) clear the hold flags.
  accept(): void {
    this.hold = null;
  }

  // Donor: DenyMoveItem (0x27) puts the item back at its snapshot origin, then clears the hold.
  deny(): void {
    if (!this.hold) return;
    this.shown.set(this.hold.itemId, this.hold.origin);
    this.hold = null;
  }

  // Donor: an authoritative item update sets what is shown. AddItemToContainer clears a sent hold (PacketHandlers.cs 6044-6049);
  // EquipItem does not (its clear is commented out), so the sketch is wider than the donor here.
  serverUpdate(itemId: number, where: Origin): void {
    this.shown.set(itemId, where);
    if (this.hold && this.hold.itemId === itemId && this.hold.state === "sent") this.hold = null;
  }

  shownAt(itemId: number): Origin | undefined {
    return this.shown.get(itemId);
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/inventory-pending-move.ts`, exit 0.

## 5. Lands in

- TARGET `src/fight/equip.ts` (new, client hold and server confirm for equip and loot moves): the gear-dressing path. Parity-checklist row 15 (gear dressing). The donor's bank and container moves are not part of the fight.
- Reuse tag: adapt-shape (BSD-2-Clause; code may be adapted; sketch written from the mechanism)
- Brief rule served: server-verified state (the server decides; deny rolls back to the snapshot); one ledger (the client never keeps a second copy of an item's place after the server's update).

Best transferable idea: take the item into the hand as an optimistic removal with a snapshot of its origin, and on the server's deny restore that snapshot instead of guessing where it belongs.
Decision (proposed): adapt — keep the snapshot-and-rollback shape for equip and loot moves so a denied equip puts the item back where it was; use explicit states (held, sent, placed) keyed by a request id instead of two boolean flags, and make the server's update the only thing that clears "sent".
Acceptance: a player drags a helmet onto an empty helm slot; it shows as in hand, then equipped when the server confirms; when the server denies (slot taken by a race), the helmet returns to the bag slot it came from within one frame, and a server test asserts the ledger holds one copy of the item at every step.

## 6. Gaps and risks

- BSD-2-Clause: code may be adapted. The sketch is still written from the mechanism.
- The donor has no request id: the two flags say "something is in flight" but not which request. Two quick moves can race. Frankendom needs a request id per move and a rule for an accept or deny that names an old id.
- The donor is inconsistent about clearing a sent hold: `AddItemToContainer` clears it and `EquipItem` does not (its clear is commented out). A stuck hold is possible if no later packet arrives. Frankendom must define one clear rule and test it.
- The donor shows an item as gone on pick-up even before the server agrees. For a fight, a removed weapon while the server still counts it equipped breaks the one-ledger rule. Frankendom should keep the item in view and only show the pending state.
- The client gate (empty layer only) is a convenience. The server must still decide; the donor sends nothing on an occupied layer and gives no message.
- The donor has no timeout on a sent hold in the code I read (ItemHold.cs 39-113 and the handlers above). A lost deny leaves the item removed from view until the next item update. Frankendom needs a timeout and a resend or rollback rule.
- Bank is a layer (Layers.cs:36) with `CloseBank` (PlayerMobile.cs:383-395); the bank contents and weight rules were not read. Not relevant to the fight; skipped.
