// Licence: GPL-3.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Reason = "ok" | "insufficient" | "not-stackable" | "other-item" | "over-max" | "race-class" | "level";

interface Stack {
  itemId: number;
  charges: number;
  stackSize: number;
  stackable: boolean;
  attuneable: boolean;
  attuned: boolean;
}

interface MoveResult {
  reason: Reason;
  moved: number;
  created: Stack | null;
}

// Equip move: every gate runs first; only then is anything visible written (attune, material).
function equipSwap(item: Stack, gate: () => Reason, setMaterial: () => void): Reason {
  const r = gate();
  if (r !== "ok") return r; // nothing was written: no attune, no material change
  if (item.attuneable) item.attuned = true;
  setMaterial();
  return "ok";
}

// Partial stack move with a requested count. Every refusal is decided before any write.
function moveCharges(src: Stack, dst: Stack | null, requested: number): MoveResult {
  const refuse = (reason: Reason): MoveResult => ({ reason, moved: 0, created: null });

  if (src.charges > 0 && (src.charges < requested || requested > src.stackSize)) return refuse("insufficient");
  if (!src.stackable) return refuse("not-stackable");

  if (dst) {
    if (dst.itemId !== src.itemId) return refuse("other-item");
    if (dst.charges >= dst.stackSize) return refuse("over-max");
    // same rule as the donor: take the smaller of the room left and the requested count.
    const moved = Math.min(dst.stackSize - dst.charges, requested);
    dst.charges += moved;
    src.charges -= moved; // the caller deletes src when it reaches 0
    return { reason: "ok", moved, created: null };
  }

  if (requested >= src.charges) {
    // whole stack goes to the empty slot; the caller deletes src
    return { reason: "ok", moved: src.charges, created: { ...src } };
  }
  src.charges -= requested; // split: the source keeps the rest
  return { reason: "ok", moved: requested, created: { ...src, charges: requested } };
}

export {};
