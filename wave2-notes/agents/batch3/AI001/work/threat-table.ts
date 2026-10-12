// Licence: GPL-2.0-or-later (donor TrinityCore). Clean-room sketch from the described mechanism; no donor lines copied.
export type Online = 0 | 1 | 2; // 0 offline, 1 suppressed, 2 online
export type Taunt = 0 | 1 | 2; // 0 detaunt, 1 none, 2 taunt (higher ranks first)

export interface Ref {
  id: number; // the threatening unit
  base: number; // threat value, never below zero
  online: Online;
  taunt: Taunt;
  inMelee: boolean; // is this source in melee range of the owner (set by the engine)
}

export const SWITCH_RATIO = 1.1; // a new highest must be above 110% of the victim to replace it
export const OVERRIDE_RATIO = 1.3; // above 130% it replaces the victim regardless of range
export const UPDATE_INTERVAL_MS = 1000; // victim re-selection cadence on the timer

export class ThreatTable {
  private refs = new Map<number, Ref>();
  private current: Ref | null = null;
  private fixate: number | null = null;
  private timer = UPDATE_INTERVAL_MS;

  // nowState: 2 if the source can be attacked now, 1 if suppressed (immune or breakable CC), 0 if offline (not visible, not valid)
  add(id: number, amount: number, nowState: Online): void {
    const existing = this.refs.get(id);
    if (existing !== undefined) {
      // a suppressed entry comes back online only when the source is no longer suppressed
      if (existing.online === 1 && nowState === 2) existing.online = 2;
      if (existing.online === 2) existing.base = Math.max(existing.base + amount, 0);
      return;
    }
    const r: Ref = { id, base: 0, online: nowState, taunt: 1, inMelee: false };
    this.refs.set(id, r);
    if (r.online === 2) r.base = Math.max(amount, 0); // threat from a suppressed or offline source is dropped
  }

  setTaunt(id: number, t: Taunt): void {
    const r = this.refs.get(id);
    if (r !== undefined) r.taunt = t;
  }

  setFixate(id: number | null): void {
    this.fixate = id !== null && this.refs.has(id) ? id : null;
  }

  // true if a ranks lower than b: online state first, then taunt, then threat times aWeight
  private lower(a: Ref, b: Ref, aWeight: number): boolean {
    if (a.online !== b.online) return a.online < b.online;
    if (a.taunt !== b.taunt) return a.taunt < b.taunt;
    return a.base * aWeight < b.base;
  }

  private reselect(): Ref | null {
    const live = [...this.refs.values()];
    if (live.length === 0) return null;

    if (this.fixate !== null) {
      const f = this.refs.get(this.fixate);
      if (f !== undefined && f.online > 0) return f;
    }

    let highest = live[0];
    for (const r of live) if (this.lower(highest, r, 1)) highest = r;
    if (highest.online === 0) return null; // everyone offline: the caller evades

    const old = this.current !== null && this.current.online > 0 ? this.current : null;
    if (old === null || highest === old) return highest;
    if (!this.lower(old, highest, SWITCH_RATIO)) return old; // not above 110%: keep the victim
    if (this.lower(old, highest, OVERRIDE_RATIO)) return highest; // above 130%: switch regardless of range
    if (highest.inMelee) return highest; // between 110% and 130%: only a melee source switches

    // highest is ranged and below 130%: look down the list for a melee source above 110%
    const rest = live.filter((r) => r !== highest && r.online > 0).sort((a, b) => (this.lower(a, b, 1) ? 1 : -1));
    for (const next of rest) {
      if (next === old) return old;
      if (!this.lower(old, next, SWITCH_RATIO)) return old;
      if (next.inMelee) return next;
    }
    return old; // donor: hard abort here (desync); the sketch keeps the victim
  }

  // timer-driven re-selection (donor: ThreatManager::Update)
  update(dtMs: number): void {
    if (this.timer <= dtMs) {
      this.current = this.reselect();
      this.timer = UPDATE_INTERVAL_MS;
    } else {
      this.timer -= dtMs;
    }
  }

  // current victim; re-selects only when there is none or it went offline (donor: GetCurrentVictim)
  victim(): Ref | null {
    if (this.current === null || this.current.online === 0) this.current = this.reselect();
    return this.current;
  }
}

// Example: 1 takes aggro at 100; 2 reaches 115 (not above 130%: 1 keeps it); then 2 reaches 135 (above 130%: switch).
export function example(): [number | null, number | null, number | null] {
  const t = new ThreatTable();
  t.add(1, 100, 2);
  t.update(UPDATE_INTERVAL_MS);
  const first = t.victim()?.id ?? null;
  t.add(2, 115, 2);
  t.update(UPDATE_INTERVAL_MS);
  const second = t.victim()?.id ?? null;
  t.add(2, 20, 2);
  t.update(UPDATE_INTERVAL_MS);
  const third = t.victim()?.id ?? null;
  return [first, second, third];
}

export {};
