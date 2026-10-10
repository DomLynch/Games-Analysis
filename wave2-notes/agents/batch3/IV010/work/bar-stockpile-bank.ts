// Licence: GPL v2 or later (donor; LICENSE.md and the gadget header). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Bank { limit: number; desired: number; stock: number; queued: number; }

// Player input: a step of 1 (plain), 5 (shift), 20 (ctrl), 100 (ctrl+shift).
function stepFor(shift: boolean, ctrl: boolean): number {
  if (shift && ctrl) return 100;
  if (ctrl) return 20;
  if (shift) return 5;
  return 1;
}

// The player never sets stock directly: the desired target moves by the step and is clamped to [0, limit].
function playerStep(b: Bank, step: number, remove: boolean): Bank {
  const delta = remove ? -step : step;
  return { ...b, desired: Math.min(Math.max(b.desired + delta, 0), b.limit) };
}

const CHUNKS = [100, 20, 5, 1];

// Reconcile: the orders that bring stock + queued to the target. Positive = add, negative = remove.
// Chunks are taken greedily from the largest size, so a gap of 19 is 5,5,5,1,1,1,1.
function reconcile(b: Bank): number[] {
  const target = Math.min(b.limit, b.desired);
  const count = b.stock + b.queued - target;
  const sign = count < 0 ? 1 : -1;
  let need = Math.abs(count);
  const orders: number[] = [];
  for (const c of CHUNKS) {
    while (need >= c) {
      orders.push(sign * c);
      need -= c;
    }
  }
  return orders;
}

// A new unit (or a unit that changes hands) starts with the desired target at the full limit.
function newBank(limit: number): Bank {
  return { limit, desired: limit, stock: 0, queued: 0 };
}

const demo = reconcile({ limit: 20, desired: 20, stock: 0, queued: 0 });
export { stepFor, playerStep, reconcile, newBank, demo };
