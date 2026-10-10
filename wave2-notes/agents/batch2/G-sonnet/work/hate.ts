interface Combatant {
  id: string;
  alive: boolean;
  x: number; y: number;
  groupIds: string[];            // party members, including itself (empty if solo)
  ownerId?: string;              // set for pets
}

interface Protector {
  id: string;
  level: number;                 // 1..3, each level soaks 10% of incoming hate
  active: boolean;               // alive, awake, in combat, within range of the protected
}

const MAX_PICK_DISTANCE = 3600;  // donor units
const MAX_LIST_DISTANCE = 6000;
const FALLOFF_DISTANCE = 500;

class HateList {
  private table = new Map<string, number>();

  get has(): boolean { return this.table.size > 0; }
  get(id: string): number { return this.table.get(id) ?? 0; }
  clear(): void { this.table.clear(); }

  // amount may be negative; a stored entry never drops below 1.
  add(who: Combatant, amount: number, protectors: Protector[] = []): void {
    if (amount > 0) {
      for (const g of who.groupIds) if (!this.table.has(g)) this.table.set(g, 1);
      for (const p of protectors) {
        if (amount <= 0) break;
        if (!p.active) continue;
        const soaked = Math.trunc(p.level * 0.1 * amount);
        if (soaked > 0) {
          amount -= soaked;
          this.table.set(p.id, (this.table.get(p.id) ?? 0) + soaked);
        }
      }
    }
    const cur = this.table.get(who.id);
    if (cur !== undefined) this.table.set(who.id, Math.max(1, cur + amount));
    else this.table.set(who.id, amount > 0 ? amount : 1);
  }

  // Damage event: 25% of a pet's hit goes to its owner.
  onDamaged(source: Combatant, damage: number, crit: number, owner?: Combatant): void {
    let hate = damage + crit;
    if (source.ownerId && owner) {
      this.add(owner, Math.max(1, Math.trunc(hate * 0.25)));
      hate = Math.max(1, Math.trunc(hate * 0.75));
    }
    this.add(source, hate);
  }

  // Highest hate, scaled down beyond FALLOFF_DISTANCE; prunes invalid entries on the way.
  pick(self: { x: number; y: number }, lookup: (id: string) => Combatant | undefined,
       canAttack: (c: Combatant) => boolean): string | null {
    let best: string | null = null;
    let bestScore = 0;
    for (const [id, amount] of [...this.table]) {
      const c = lookup(id);
      const d = c ? Math.hypot(c.x - self.x, c.y - self.y) : Infinity;
      if (!c || !c.alive || d > MAX_LIST_DISTANCE || !canAttack(c)) { this.table.delete(id); continue; }
      if (amount > bestScore && d <= MAX_PICK_DISTANCE) {
        const score = amount * Math.min(FALLOFF_DISTANCE / d, 1);
        if (score > bestScore) { best = id; bestScore = score; }
      }
    }
    if (best === null) this.table.clear();
    return best;
  }
}

// Think cadence: more aggressive mobs think more often, floor 1.5 s.
function thinkIntervalMs(aggroLevel: number): number {
  return Math.max(1500, 10000 - aggroLevel * 100);
}

// Tether: out of tether range and not in combat -> drop everything and walk home.
function shouldReset(distFromSpawn: number, tetherRange: number, inCombat: boolean): boolean {
  return tetherRange > 0 && distFromSpawn > tetherRange && !inCombat;
}
export {};
