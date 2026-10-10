// Licence: BSD-2-Clause (donor). Shape only; written from the described mechanism.
// clean-room

type Origin =
  | { kind: "ground"; x: number; y: number; z: number }
  | { kind: "container"; containerId: number; layer: number };

type Hold =
  | { state: "held"; itemId: number; origin: Origin }      // picked up, not yet placed
  | { state: "sent"; itemId: number; origin: Origin }      // drop or equip request in flight
  | { state: "settled"; itemId: number; origin: Origin }   // accepted: flags off, snapshot data kept (donor)
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
    // donor gates only on ItemHold.Enabled (the "held" state); a sent or settled hold is replaced and its snapshot lost
    if (origin === undefined || (this.hold !== null && this.hold.state === "held")) return false;
    this.hold = { state: "held", itemId, origin };
    this.shown.delete(itemId);                 // optimistic: gone from the view while in hand
    return true;
  }

  // Donor: DropItem / Equip send the request, then Enabled = false and Dropped = true.
  send(): void {
    if (this.hold && this.hold.state === "held") this.hold = { ...this.hold, state: "sent" };
  }

  // Donor: DropItemAccepted (0x29) and EndDraggingItem (0x28) clear only the two flags; the snapshot data is kept.
  accept(): void {
    if (this.hold) this.hold = { ...this.hold, state: "settled" };
  }

  // Donor: DenyMoveItem (0x27) puts the item back at its snapshot origin, then clears the hold.
  deny(): void {
    if (!this.hold || this.hold.state === "settled") return; // donor: acts only when Enabled, or Dropped with the item not drawable
    this.shown.set(this.hold.itemId, this.hold.origin);
    this.hold = null;
  }

  // Donor: an authoritative item update sets what is shown. AddItemToContainer clears a sent hold (PacketHandlers.cs 6044-6049);
  // EquipItem does not (its flag change is commented out), so the sketch is wider than the donor here.
  serverUpdate(itemId: number, where: Origin): void {
    this.shown.set(itemId, where);
    if (this.hold && this.hold.itemId === itemId && this.hold.state === "sent") this.hold = null;
  }

  shownAt(itemId: number): Origin | undefined {
    return this.shown.get(itemId);
  }
}

export {};
