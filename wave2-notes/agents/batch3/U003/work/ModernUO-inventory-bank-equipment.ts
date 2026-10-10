// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface ItemLike {
  id: string;
  weight: number;          // stones per unit
  amount: number;          // stack size
  stackKey?: string;       // same key = may stack (donor uses StackWith)
}

export type HoldResult = "ok" | "full-items" | "full-weight";

export class Container {
  readonly children: (ItemLike | Container)[] = [];
  totalWeight = 0;         // cached; updated by deltas, never recomputed on add
  totalItems = 0;
  ownWeight = 0;           // this container's own pile weight (donor PileWeight), added when the container itself is dropped

  constructor(
    public maxWeight: number,        // 0 = no limit
    public maxItems: number,         // 0 = no limit
    public parent: Container | null = null,
    public virtual = false,          // virtual (bank-like) containers hide contents from the carrier
  ) {}

  // Apply a delta to this container, then climb to the enclosing container unless this one is virtual.
  propagate(dWeight: number, dItems: number): void {
    this.totalWeight += dWeight;
    this.totalItems += dItems;
    if (!this.virtual && this.parent !== null) this.parent.propagate(dWeight, dItems);
  }

  // Check this container, then every enclosing container (donor CheckHold recursion).
  checkHold(weight: number, count: number, checkItems: boolean): HoldResult {
    if (checkItems && this.maxItems !== 0 && this.totalItems + count > this.maxItems) return "full-items";
    if (this.maxWeight !== 0 && this.totalWeight + weight > this.maxWeight) return "full-weight";
    return this.parent !== null ? this.parent.checkHold(weight, count, checkItems) : "ok";
  }

  // Stack onto an existing non-container with the same key first; otherwise take a new slot.
  tryDrop(item: ItemLike | Container): HoldResult {
    // A dropped container counts its contents: donor uses TotalItems + 1 and TotalWeight + PileWeight (247, 257).
    const w = item instanceof Container ? item.totalWeight + item.ownWeight : item.weight * item.amount;
    const count = item instanceof Container ? item.totalItems + 1 : 1;
    if (!(item instanceof Container) && item.stackKey !== undefined) {
      for (const c of this.children) {
        if (!(c instanceof Container) && c.stackKey === item.stackKey) {
          const hold = this.checkHold(w, 0, false);
          if (hold !== "ok") return hold;
          c.amount += item.amount;
          this.propagate(w, 0);
          return "ok";
        }
      }
    }
    const hold = this.checkHold(w, count, true);
    if (hold !== "ok") return hold;
    this.children.push(item);
    this.propagate(w, count);
    return "ok";
  }
}

// Carry limit from strength. Donor: (human in ML ? 100 : 40) + (int)(3.5 x Str).
export function maxCarry(str: number, ml: boolean, human: boolean): number {
  return (ml && human ? 100 : 40) + Math.trunc(3.5 * str);
}

// Stamina lost per step when carrying past the allowance. Walking pays the base; running doubles; mounted divides by 3
// (donor GetStamLoss; in the default config mounted players take a different path, ProcessMountMovement, not modelled).
export function overweightStepLoss(
  bodyWeight: number, carried: number, maxWeight: number, allowance: number,
  perLoss: number, baseLoss: number, running: boolean, mounted: boolean,
): number {
  const over = bodyWeight + carried - (maxWeight + allowance);
  if (over <= 0) return 0;
  let loss = baseLoss + Math.trunc(over / perLoss);
  if (mounted) loss = Math.trunc(loss / 3);
  if (running) loss *= 2;
  return loss;
}

// Equip: a layer takes one item and an invalid layer takes none. Conflicting-layer rules were not read.
export function canEquip(occupied: Set<string>, layer: string): boolean {
  return layer !== "invalid" && !occupied.has(layer);
}

export {};
