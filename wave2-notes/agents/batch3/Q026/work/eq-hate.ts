// Licence: GPL-3.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Entry {
  id: number;
  hate: number;          // stored hate, integer
  dmg: number;           // damage credit (XP), capped at HP left
  frenzy: boolean;       // forced top
  sitting: boolean;
  inMelee: boolean;
  alive: boolean;
  mezzedOrFeared: boolean;
  hpPct: number;         // 0 to 100
  lastModified: number;  // ms
  oor: number;           // consecutive out-of-range checks
}

export interface Rules {
  sittingMod: number;       // percent
  meleeMod: number;         // percent
  currentTargetMod: number; // percent, default 0
  criticalMod: number;      // percent, applied when hpPct < 20
  initialBonus: number;     // hate added to a new entry
  tunnelVision: number;     // multiplier on hate for a non-top hitter (ratio; donor: parameter / 100 or the rule)
  staleMs: number;          // forget after this long untouched
  maxRangeSq: number;       // squared leash distance
}

export interface Hit {
  id: number;
  hate: number;
  dmg: number;
  hpLeft: number;
  hatemod: number;   // percent, from gear and spells
  tunnelVision: boolean;
}

// Add one hit. Known entries get hatemod percent; new entries get the initial bonus.
export function addHate(list: Map<number, Entry>, hit: Hit, now: number, rules: Rules, topId: number | null): void {
  let hate = hit.hate;
  let e = list.get(hit.id);
  if (e) {
    hate = Math.trunc((hate * Math.max(1, 100 + hit.hatemod)) / 100);
  } else {
    hate += rules.initialBonus;
  }
  if (hit.tunnelVision && topId !== null && topId !== hit.id) {
    hate = Math.trunc(hate * rules.tunnelVision); // donor: ability parameter / 100 when set, else the rule (3159-3164)
  }
  // damage credit cannot exceed the HP the mob had left (guards against stealing a kill)
  const credit = Math.max(0, Math.min(hit.dmg, hit.hpLeft));
  if (!e) {
    e = { id: hit.id, hate: 0, dmg: 0, frenzy: false, sitting: false, inMelee: false, alive: true,
          mezzedOrFeared: false, hpPct: 100, lastModified: now, oor: 0 };
    list.set(hit.id, e);
  }
  e.hate += hate;
  e.dmg += credit;
  e.lastModified = now;
}

// Pick the top hate. Sitting, current-target, melee-range and critically-hurt entries get a percent bonus on their hate.
export function pickTop(list: Map<number, Entry>, current: number | null, rules: Rules): number | null {
  let top: Entry | undefined;
  let topHate = -1;
  for (const e of list.values()) {
    if (!e.alive || e.mezzedOrFeared) continue;   // sketch excludes them (donor uses them as fallback)
    let mod = 0;
    if (e.sitting) mod += rules.sittingMod;
    if (e.id === current) mod += rules.currentTargetMod;
    if (e.inMelee) mod += rules.meleeMod;
    if (e.hpPct < 20) mod += rules.criticalMod;
    let h = e.hate;
    if (mod !== 0) h += Math.trunc((h * mod) / 100);
    if (h > topHate || e.frenzy) {
      top = e;
      topHate = h;
    }
  }
  return top ? top.id : null;
}

// Stale check: forget an entry after staleMs untouched, or after two checks in a row outside the leash.
export function staleCheck(list: Map<number, Entry>, now: number, rules: Rules, distSqTo: (id: number) => number): void {
  for (const [id, e] of list) {
    if (distSqTo(id) > rules.maxRangeSq) e.oor += 1;
    else e.oor = 0;
    if (now - e.lastModified > rules.staleMs || e.oor >= 2) list.delete(id);
  }
}

// Period gate for the target refresh (the sketch's own timer; donor Timer semantics not read).
export class Gate {
  private last = Number.NEGATIVE_INFINITY;
  constructor(private readonly periodMs: number) {}
  check(now: number): boolean {
    if (now - this.last >= this.periodMs) {
      this.last = now;
      return true;
    }
    return false;
  }
}
export {};
