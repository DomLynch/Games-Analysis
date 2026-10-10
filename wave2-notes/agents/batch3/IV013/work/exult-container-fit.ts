// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const MAX_STACK = 100;   // units per stack; a stack is one object

// Carry cap in stones = 2 x strength.
function carryCapStones(strength: number): number {
  return 2 * strength;
}

// Units of a stack that fit by weight, in tenths of a stone.
// Exact integer fit: floor(avail * qty / totalWt). The stack is taken whole when it fits.
function unitsFitByWeight(qty: number, totalWt: number, availTenths: number): number {
  if (totalWt <= 0 || totalWt <= availTenths) return qty;
  if (availTenths <= 0) return 0;
  return Math.min(qty, Math.floor((availTenths * qty) / totalWt));
}

// A bag's capacity is its own volume number; 0 means no limit.
// Volume counts each stack once, whatever its quantity.
interface Bag {
  capVol: number;
  usedVol: number;
}

function fitsInBag(bag: Bag, vol: number): boolean {
  return bag.capVol <= 0 || bag.usedVol + vol <= bag.capVol;
}

// Lift an item out of its source, try to place it, and put it back at the same index on failure.
function transfer<T>(src: T[], index: number, place: (item: T) => boolean): boolean {
  const [item] = src.splice(index, 1);
  if (place(item)) return true;
  src.splice(index, 0, item);
  return false;
}

export { MAX_STACK, carryCapStones, unitsFitByWeight, fitsInBag, transfer };
