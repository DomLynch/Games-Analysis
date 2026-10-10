// Licence: AGPL-3.0 (donor). Clean-room sketch of the mechanism shape, not a translation of the donor lines.
type Rng = () => number; // returns a number in [0, 1)

interface Entry {
  damage: number;   // damage counted since the start
  spent: number;    // damage that a reset has already spent; it stops counting as threat
  aggro: number;    // +1 per hit or tick; cleared by a reset
  heal: number;     // healing the attacker has done; cleared by a reset
  taunted: boolean;
  focused: boolean;
}

interface Body { alive: boolean; inRange: boolean; }

const EVALUATION_MS = 24000; // the donor's re-evaluation timer

class ThreatTable {
  private entries = new Map<string, Entry>();
  private current: string | null = null;
  private evalUntil = 0;

  private entry(id: string): Entry {
    let e = this.entries.get(id);
    if (e === undefined) {
      e = { damage: 0, spent: 0, aggro: 0, heal: 0, taunted: false, focused: false };
      this.entries.set(id, e);
    }
    return e;
  }

  hit(id: string, damage: number): void {
    const e = this.entry(id);
    e.damage += damage;
    e.aggro += 1;
  }

  tick(id: string): void {          // non-xp hit (the donor's no-xp overload): aggro only, no threat damage
    this.entry(id).aggro += 1;
  }

  reset(): void {                   // keep the entries, spend their damage, clear aggro and heal
    for (const e of this.entries.values()) {
      e.spent = e.damage;
      e.aggro = 0;
      e.heal = 0;
    }
    this.current = null;
  }

  // Keep the last pick while the timer runs and it is still alive; otherwise rebuild the pool.
  select(now: number, rng: Rng, body: (id: string) => Body | undefined): string | null {
    if (this.current !== null && now < this.evalUntil) {
      const b = body(this.current);
      if (b !== undefined && b.alive) return this.current;
    }

    const cands: Array<[string, Entry]> = [];
    for (const [id, e] of this.entries) {
      const b = body(id);
      if (b !== undefined && b.inRange && b.alive) cands.push([id, e]);
    }

    const byDamage = cands
      .map(([id, e]): [string, number] => [id, e.damage - e.spent])
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([id]): string => id);
    const byAggro = cands
      .filter(([, e]) => e.aggro > 0)
      .sort((a, b) => b[1].aggro - a[1].aggro)
      .map(([id]): string => id);
    const byHeal = cands
      .filter(([, e]) => e.heal > 0)
      .sort((a, b) => b[1].heal - a[1].heal)
      .map(([id]): string => id);

    const pool: string[] = [];
    if (byDamage.length > 0) {
      pool.push(byDamage[0], byDamage[0], byDamage[Math.floor(rng() * byDamage.length)]);
    }
    if (byAggro.length > 0) {
      pool.push(byAggro[0], byAggro[0], byAggro[Math.floor(rng() * byAggro.length)]);
    }
    if (byHeal.length > 0) {
      pool.push(byHeal[0]);
    }

    // Taunt beats focus; both beat the pool.
    let forced: string | null = null;
    for (const [id, e] of cands) if (e.taunted) forced = id;
    if (forced === null) for (const [id, e] of cands) if (e.focused) forced = id;

    const pick = forced !== null ? forced : pool.length > 0 ? pool[Math.floor(rng() * pool.length)] : null;
    this.current = pick;
    this.evalUntil = now + EVALUATION_MS;
    return pick;
  }
}
export {};
