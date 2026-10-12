// Licence: MIT (donor, Lost City 2023-2025). clean-room sketch written from the described mechanism, not a copy of the donor lines.
// clean-room
export {};

export const MAX_ATTACKERS = 3;       // Frankendom ruling; donor table has 16 slots
export const CREDIT_IDLE_TICKS = 10;  // fix: credit expires after idle time, not on full heal (ruling 2)

interface Attacker { id: string; points: number; }

// Damage credit: who hit this entity, with points. Only player attackers are recorded.
export class DamageTable {
  private rows: Attacker[] = [];
  private lastHitTick = Number.NEGATIVE_INFINITY;

  constructor(private readonly cap: number = MAX_ATTACKERS) {}

  // Donor (HeroPoints.addHero) silently drops a new attacker when every slot is full.
  // fix: when full, the lowest-points row is evicted if the new hit is bigger.
  add(id: string, damage: number, tick: number): void {
    if (damage < 1) return;
    this.lastHitTick = tick;
    const existing = this.rows.find((r) => r.id === id);
    if (existing) { existing.points += damage; return; }
    if (this.rows.length < this.cap) { this.rows.push({ id, points: damage }); return; }
    let low = 0;
    for (let i = 1; i < this.rows.length; i++) {
      if (this.rows[i].points < this.rows[low].points) low = i;
    }
    if (this.rows[low].points < damage) this.rows[low] = { id, points: damage };
  }

  // Top attacker by points. Returns the record even if that player is offline. The donor's
  // findhero pushes 0 (PvE path) when the top hero has no live Player object, so the tier flips.
  top(): Attacker | null {
    let best: Attacker | null = null;
    for (const r of this.rows) {
      if (best === null || r.points > best.points) best = r;
    }
    return best;
  }

  // Replaces the donor's clear-on-full-heal. Credit lasts CREDIT_IDLE_TICKS after the last hit.
  expire(tick: number): void {
    if (tick - this.lastHitTick >= CREDIT_IDLE_TICKS) this.rows = [];
  }

  size(): number { return this.rows.length; }
}

export type DeathTier = 'pve' | 'pvp';

// Donor: tier is PvP when findhero succeeds (top hero online). fix: any recorded player attacker makes it PvP.
export function deathTier(table: DamageTable): DeathTier {
  return table.size() > 0 ? 'pvp' : 'pve';
}

// Skull memory: prey = last 2 players this one attacked; predators = last 3 who attacked this one.
export interface PkMemory { prey: string[]; predators: string[]; }

// Donor deserves_pk_skull: no skull in the duel arena, or on retaliation (either side's memory names the other).
export function skullAllowed(attackerId: string, attacker: PkMemory, defenderId: string, defender: PkMemory, inArena: boolean): boolean {
  if (inArena) return false;
  if (defender.prey.includes(attackerId) || attacker.predators.includes(defenderId)) return false;
  return true;
}

// Donor set_pk_vars runs on the attack attempt, before the hit roll (pvp_melee.rs2 line 15, roll at 29).
export function recordAttempt(attackerId: string, attacker: PkMemory, defenderId: string, defender: PkMemory): void {
  attacker.prey = [defenderId, ...attacker.prey].slice(0, 2);
  defender.predators = [attackerId, ...defender.predators].slice(0, 3);
}
