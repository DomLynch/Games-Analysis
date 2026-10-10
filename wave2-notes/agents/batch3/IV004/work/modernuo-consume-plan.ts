// Licence: GPL-3.0 (ModernUO LICENSE, "GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007"). Clean-room: rewritten from the rule
// described in the note (check the whole cost, then apply it), not a translation of the donor's lines.
export interface Stack { id: number; amount: number; }
export interface Requirement { ids: ReadonlySet<number>; amount: number; }

// Returns -1 when every requirement was met and applied, otherwise the index of the first unmet requirement.
// Nothing is changed unless every requirement is met.
export function consumeAll(bag: Stack[], reqs: Requirement[]): number {
  // Phase 1: plan against a remainder per stack, so two requirements that
  // draw on the same stack cannot both count the same units.
  const left = bag.map(s => s.amount);
  const plan: { stack: number; take: number }[] = [];
  for (let r = 0; r < reqs.length; r++) {
    let need = reqs[r].amount;
    for (let i = 0; i < bag.length && need > 0; i++) {
      if (!reqs[r].ids.has(bag[i].id) || left[i] === 0) continue;
      const take = Math.min(left[i], need);
      left[i] -= take;
      need -= take;
      plan.push({ stack: i, take });
    }
    if (need > 0) return r; // unmet: no change has been made
  }

  // Phase 2: apply the plan. Every take was checked against the remainder, so this cannot run short.
  for (const p of plan) bag[p.stack].amount -= p.take;
  for (let i = bag.length - 1; i >= 0; i--) if (bag[i].amount === 0) bag.splice(i, 1);
  return -1;
}

export {};
