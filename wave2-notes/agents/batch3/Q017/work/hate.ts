// Licence: GPL-2.0-or-later (donor header: "version 2, or (at your option) any later version"). Clean-room: shape only.

export interface HateTable {
  hate: Map<string, number>;   // attacker id -> accumulated hate
  firstHitDone: boolean;       // the first-hit bonus is taken once per NPC
}

export interface Live {        // what the engine knows about a candidate right now
  alive: boolean;
  sameMap: boolean;
}

// Hate from one hit. A zero amount seeds the entry (aggro on sight) without using the first-hit bonus.
export function addHate(t: HateTable, selfId: string, attackerId: string, amount: number, maxHp: number, firstHitDivisor: number): void {
  if (attackerId === selfId) return;   // donor setHate: any amount is accepted; only the damage caller guards damage >= 0 (L1MonsterInstance 288)
  let add = amount;
  if (!t.firstHitDone && amount !== 0) {
    add += Math.trunc(maxHp / firstHitDivisor);   // donor: maxHp / 10 (integer division)
    t.firstHitDone = true;
  }
  t.hate.set(attackerId, (t.hate.get(attackerId) ?? 0) + add);
}

// Top attacker. Ties go to the lower id, so the choice is the same on every server run.
// Invalid tops are removed as they are found, then the next top is tried.
export function pickTarget(t: HateTable, live: (id: string) => Live | undefined): string | null {
  for (;;) {
    let best: string | null = null;
    let bestHate = -Infinity;
    for (const id of [...t.hate.keys()].sort()) {
      const h = t.hate.get(id) ?? 0;
      if (h > bestHate) { best = id; bestHate = h; }
    }
    if (best === null) return null;
    const s = live(best);
    if (s && s.alive && s.sameMap) return best;
    t.hate.delete(best);
  }
}

export interface Pack { id: string; agroFamily: number; family: number; groupId: number; hateEmpty: boolean; }

// Who gets pulled when one member is hit. agroFamily 1 = same family only; > 1 = any family; same non-zero group always.
export function linkTargets(pack: Pack[], family: number, groupId: number): string[] {
  return pack
    .filter(m => (m.agroFamily > 0 && (m.agroFamily !== 1 || m.family === family)) || (groupId !== 0 && m.groupId === groupId))
    .filter(m => m.hateEmpty)   // donor setLink: only an empty table takes the seed
    .map(m => m.id);
}

export {};
