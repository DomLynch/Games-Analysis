// Licence: AGPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

export interface Companion {
  id: string;
  power: number;          // donor: totalPowerCount
  kind: number;           // donor: monsterID, used as the tie-break
  ownerId: string;
  summoned: boolean;      // donor: MB_DOES_NOT_RESURRECT, set when an ally summons it (Monsters.c:738); split clones lose the auto-ID flag instead (Monsters.c:569)
  adminRemoved: boolean;  // donor: MB_ADMINISTRATIVE_DEATH, never revived
  hp: number;
  maxHp: number;
}

// Dead companions wait here instead of being freed. Donor: creatureList `purgatory`.
export class Purgatory {
  private dead: Companion[] = [];

  // Donor removeDeadMonstersFromList: an eligible ally goes to purgatory; anything else is freed.
  onDeath(c: Companion): 'held' | 'freed' {
    if (c.summoned || c.adminRemoved) return 'freed';
    this.dead.push(c);
    return 'held';
  }

  heldFor(ownerId: string): number {
    return this.dead.filter((c) => c.ownerId === ownerId).length;
  }

  // Donor resurrectAlly: strongest first (power, then kind), removed from the pool, healed to full.
  // Returns null when nothing is held; the caller keeps the shrine waiting.
  raiseStrongest(): Companion | null {
    if (this.dead.length === 0) return null;
    let best = 0;
    for (let i = 1; i < this.dead.length; i++) {
      const a = this.dead[i];
      const b = this.dead[best];
      if (a.power > b.power || (a.power === b.power && a.kind > b.kind)) best = i;
    }
    const [c] = this.dead.splice(best, 1);
    c.hp = c.maxHp; // donor heal(monst, 100, true)
    return c;
  }
}

// Donor: one use per altar (the feature promotes the altar to an inert tile).
// adapt: charges are zone data; the donor's value is 1.
export interface Shrine { charges: number; }

export function trigger(shrine: Shrine, pool: Purgatory): Companion | null {
  if (shrine.charges <= 0) return null;
  const c = pool.raiseStrongest();
  if (c === null) return null; // the donor aborts the feature and the altar keeps waiting
  shrine.charges -= 1;
  return c;
}
