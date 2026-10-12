// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Personal faction ledger: each faction has a personal range around its base; a hit moves the personal value
// inside that range; a hit to one faction spreads to its associated factions, scaled by a per-link modifier.

export interface FactionDef {
  base: number;                 // faction base standing (data)
  min: number;                  // personal floor before base adjustment (donor default -2000)
  max: number;                  // personal ceiling before base adjustment (donor default 2000)
}

export interface Assoc {
  id: number;                   // associated faction id (0 = unused slot)
  mod: number;                  // multiplier applied to the hit
}

// Donor: this_faction_min = min(0, min - base); this_faction_max = max(0, max - base).
export function personalRange(def: FactionDef): { lo: number; hi: number } {
  return { lo: Math.min(0, def.min - def.base), hi: Math.max(0, def.max - def.base) };
}

// Donor UpdatePersonalFaction: an out-of-range value is repaired; a hit moves the value unless it already
// sits at the bound it pushes against; the result is clamped to the range.
export function applyHit(current: number, hit: number, lo: number, hi: number): number {
  if (current > hi) return hi;
  if (current < lo) return lo;
  if (hit === 0) return current;
  if ((hit > 0 && current === hi) || (hit < 0 && current === lo)) return current;
  return Math.min(hi, Math.max(lo, current + hit));
}

// Donor RewardFaction: each associated faction gets mod x amount, at least 1 in magnitude, keeping the sign.
// fix: a zero modifier gives no change (the donor's max(1, ...) gives +1 for a zero modifier, see defect 1).
export function spread(amount: number, mods: number[]): number[] {
  return mods.map((m) => {
    if (m === 0) return 0;
    const scaled = m * amount;
    const mag = Math.max(1, Math.trunc(Math.abs(scaled)));
    return scaled < 0 ? -mag : mag;
  });
}

// Donor CalculateFaction: the con band for personal value + base + class/race/deity modifiers.
const BANDS: Array<[number, string]> = [
  [1100, "ally"],
  [750, "warmly"],
  [500, "kindly"],
  [100, "amiably"],
  [0, "indifferently"],
  [-100, "apprehensively"],
  [-500, "dubiously"],
  [-750, "threateningly"],
];

export function con(personal: number, base: number, modSum: number): string {
  const v = personal + base + modSum;
  for (const [min, name] of BANDS) {
    if (v >= min) return name;
  }
  return "scowls";
}

export class FactionLedger {
  private values = new Map<number, number>();

  constructor(private defs: Map<number, FactionDef>) {}

  hit(factionId: number, amount: number, assoc: Assoc[] = []): void {
    this.applyOne(factionId, amount);
    const spreadAmounts = spread(amount, assoc.map((a) => a.mod));
    assoc.forEach((a, i) => {
      if (a.id > 0 && spreadAmounts[i] !== 0) this.applyOne(a.id, spreadAmounts[i]);
    });
  }

  value(factionId: number): number {
    return this.values.get(factionId) ?? 0;
  }

  private applyOne(factionId: number, hit: number): void {
    const def = this.defs.get(factionId);
    if (!def) return;
    const { lo, hi } = personalRange(def);
    this.values.set(factionId, applyHit(this.value(factionId), hit, lo, hi));
  }
}

export {};
