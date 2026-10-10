// Licence: MIT (donor, Grymyr L2Dn). Clean-room sketch written from the described mechanism, not a line-for-line translation.
// clean-room
interface Mob {
  level: number;
  globalAggro: number;        // starts at -10 after respawn; moves 1 step toward 0 per active think
  attackTimeoutAt: number;    // tick after which an attack is abandoned (set when the attack starts)
}

interface Entry { id: string; damage: number; hate: number; alive: boolean; inRegion: boolean }

const HATE_CAP = 1e15;

class HateTable {
  private rows = new Map<string, Entry>();

  constructor(private mob: Mob) {}

  // One hit. Plain hits (no skill) are scaled by the attacker's attack stat.
  onDamage(id: string, damage: number, attackStat: number, usedSkill: boolean): void {
    const row = this.row(id);
    row.damage = Math.min(row.damage + damage, HATE_CAP);
    let hateValue = (damage * 100) / (this.mob.level + 7);
    if (!usedSkill) hateValue *= attackStat;
    this.addHate(id, Math.trunc(hateValue));
  }

  // Aggression event: adds hate by value, no damage.
  onAggression(id: string, value: number): void {
    this.addHate(id, value);
  }

  hating(id: string): number {
    return this.rows.get(id)?.hate ?? 0;
  }

  stopHate(id: string): void {
    const row = this.rows.get(id);
    if (row) row.hate = 0;
  }

  // Dead or out-of-region rows lose their hate. Strict > keeps the first maximum in list order.
  mostHated(): string | null {
    if (this.rows.size === 0) return null;
    let best: string | null = null;
    let max = 0;
    for (const row of this.rows.values()) {
      if (!row.alive || !row.inRegion) row.hate = 0;
      if (row.hate > max) { best = row.id; max = row.hate; }
    }
    return best;
  }

  private addHate(id: string, value: number): void {
    const row = this.row(id);
    row.hate = Math.min(row.hate + value, HATE_CAP);
  }

  private row(id: string): Entry {
    let r = this.rows.get(id);
    if (!r) {
      r = { id, damage: 0, hate: 0, alive: true, inRegion: true };
      this.rows.set(id, r);
    }
    return r;
  }
}

type Action = { kind: "none" } | { kind: "active" } | { kind: "attack"; target: string };

// Active think: step the passive counter, then attack the most hated if hate plus counter is positive.
function thinkActive(mob: Mob, table: HateTable): Action {
  if (mob.globalAggro < 0) mob.globalAggro++;
  else if (mob.globalAggro > 0) mob.globalAggro--;
  if (mob.globalAggro < 0) return { kind: "none" };     // still in the passive window

  const hated = table.mostHated();
  if (hated === null) return { kind: "none" };
  if (table.hating(hated) + mob.globalAggro > 0) return { kind: "attack", target: hated };
  return { kind: "none" };
}

// Attack think: re-pick the most hated each tick, drop a dead target, abandon on timeout.
function thinkAttack(mob: Mob, table: HateTable, targetAlive: (id: string) => boolean, now: number): Action {
  const target = table.mostHated();
  if (target === null) return { kind: "active" };
  if (!targetAlive(target)) {
    table.stopHate(target);
    return { kind: "none" };
  }
  if (mob.attackTimeoutAt < now) return { kind: "active" };
  return { kind: "attack", target };
}

export {}
