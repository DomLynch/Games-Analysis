// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Stack = { shape: string; qty: number; locked: boolean };
// One party member's pack. The donor recurses into nested containers; this sketch keeps a flat list.
type Holder = { id: string; stacks: Stack[] };

// ONE predicate for counting and debiting. The donor's count allows locked containers and its debit does not.
function eligible(s: Stack, shape: string): boolean {
  return s.shape === shape && !s.locked;
}

function countAvailable(party: Holder[], shape: string): number {
  let total = 0;
  for (const h of party) {
    for (const s of h.stacks) {
      if (eligible(s, shape)) total += s.qty;
    }
  }
  return total;
}

// All-or-nothing debit: true and exactly `cost` removed, or false and nothing removed.
// Party order is the drain order (avatar first, as in the donor's get_party).
function debitParty(party: Holder[], shape: string, cost: number): boolean {
  if (cost <= 0) return true; // design choice: the donor returns false for a zero request
  if (countAvailable(party, shape) < cost) return false;

  let left = cost;
  for (const h of party) {
    for (const s of h.stacks) {
      if (left === 0) break;
      if (!eligible(s, shape)) continue;
      const take = Math.min(s.qty, left);
      s.qty -= take;
      left -= take;
    }
    h.stacks = h.stacks.filter((s) => s.qty > 0 || !eligible(s, shape));
    if (left === 0) break;
  }
  return left === 0;
}

export {};
