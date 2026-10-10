// Licence: LGPL-2.1-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
export {};

interface Stack { name: string; meta: string; count: number; stackMax: number; }
type Slot = Stack | null; // null = empty slot

// Units each side allows for this move (Infinity = no limit). The donor gets these from permission callbacks.
interface Permit {
  srcTake: number; // how many the source may give up
  dstPut: number;  // how many the destination may accept
  revTake: number; // reverse direction, used only for a swap: the destination item leaving its slot
  revPut: number;  // reverse direction, used only for a swap: the destination item entering the source slot
}

const sameKind = (a: Stack, b: Stack): boolean => a.name === b.name && a.meta === b.meta;

// Room for `count` units of `item` in `slot`. Stack max applies to an empty slot too (a sketch choice; the donor lets an empty slot take any count).
function roomFor(slot: Slot, item: Stack, count: number): number {
  if (slot === null) return Math.min(count, item.stackMax);
  if (!sameKind(slot, item)) return 0;
  return Math.min(count, Math.max(0, slot.stackMax - slot.count));
}

// Moves up to `want` units from src[si] to dst[di]. Returns the number of units moved (0 = nothing changed).
// Every limit is checked before any slot changes, so there is no take-then-put-back step.
export function applyMove(src: Slot[], si: number, dst: Slot[], di: number, want: number, permit: Permit, allowSwap: boolean): number {
  const s = src[si];
  if (s === null || (src === dst && si === di)) return 0;
  const d = dst[di];

  if (d !== null && !sameKind(d, s)) {
    // Swap: only the whole source stack, and only when both directions accept whole stacks.
    // The donor moves the whole source stack on a swap while checking only the requested count; this sketch checks the whole stack.
    const wholeStack = Math.min(want, s.count) === s.count;
    const allowed =
      allowSwap &&
      wholeStack &&
      permit.srcTake >= s.count &&
      permit.dstPut >= s.count &&
      permit.revTake >= d.count &&
      permit.revPut >= d.count;
    if (!allowed) return 0;
    dst[di] = s;
    src[si] = d;
    return s.count;
  }

  const count = Math.min(want, s.count, permit.srcTake, permit.dstPut, roomFor(d, s, want));
  if (count <= 0) return 0;
  if (d === null) dst[di] = { ...s, count };
  else d.count += count;
  s.count -= count;
  if (s.count === 0) src[si] = null;
  return count;
}
