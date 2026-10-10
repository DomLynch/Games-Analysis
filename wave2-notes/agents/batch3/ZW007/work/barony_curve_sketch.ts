// Licence: BSD-2-Clause (donor LICENSE.txt, Turning Wheel LLC 2013-2020). Mechanism re-expressed from the read code; this sketch is not a line-by-line translation.
export type Monster = string;
export type Rand = (n: number) => number; // integer in [0, n)

// A band takes the inclusive roll range lo..hi. `pick` may consult the level (a gate by substitution)
// and may draw again from the same stream (the donor does this in some zones).
export interface Band { lo: number; hi: number; pick: (level: number, rand: Rand) => Monster; }
export interface ZoneCurve { modulus: number; bands: Band[]; }

export const BASIC: Monster = "SKELETON"; // the donor's fallback for every zone and every unmatched roll

export function rollZone(curve: ZoneCurve | undefined, level: number, rand: Rand): Monster {
  if (curve === undefined) return BASIC;
  const r = rand(curve.modulus);
  for (const b of curve.bands) {
    if (r >= b.lo && r <= b.hi) return b.pick(level, rand);
  }
  return BASIC;
}

// The Mines (modulus 10): rats 0-3, skeletons 4-7; roll 8 is a spider and roll 9 a troll from level 2 on,
// otherwise a skeleton. Below level 2 the skeleton share is 60 percent, not 40.
export const MINES: ZoneCurve = {
  modulus: 10,
  bands: [
    { lo: 0, hi: 3, pick: () => "RAT" },
    { lo: 4, hi: 7, pick: () => "SKELETON" },
    { lo: 8, hi: 8, pick: (level) => (level >= 2 ? "SPIDER" : "SKELETON") },
    { lo: 9, hi: 9, pick: (level) => (level >= 2 ? "TROLL" : "SKELETON") },
  ],
};

// Hell (modulus 20). On a boss map the imp band becomes a demon (the donor's own performance note).
export function hellCurve(isBossMap: boolean): ZoneCurve {
  return {
    modulus: 20,
    bands: [
      { lo: 0, hi: 1, pick: () => "SUCCUBUS" },
      { lo: 2, hi: 3, pick: () => "INCUBUS" },
      { lo: 4, hi: 8, pick: () => (isBossMap ? "DEMON" : "CREATURE_IMP") },
      { lo: 9, hi: 14, pick: () => "DEMON" },
      { lo: 15, hi: 18, pick: () => "GOATMAN" },
      { lo: 19, hi: 19, pick: () => "SHADOW" },
    ],
  };
}

// The Ruins (modulus 10): roll 8 draws again, so it is bugbear 90 percent and vampire 10 percent.
export const RUINS: ZoneCurve = {
  modulus: 10,
  bands: [
    { lo: 0, hi: 0, pick: () => "GOBLIN" },
    { lo: 1, hi: 4, pick: () => "GNOME" },
    { lo: 5, hi: 7, pick: () => "BUGBEAR" },
    { lo: 8, hi: 8, pick: (_level, rand) => (rand(10) > 0 ? "BUGBEAR" : "VAMPIRE") },
    { lo: 9, hi: 9, pick: () => "DEMON" },
  ],
};

// Per-level spawner. The zone's curve is always rolled first (this consumes the level stream); a custom
// curve, when the map has one, may then replace the result. After its first empty roll the custom curve
// is switched off for the rest of the level.
export class LevelSpawner {
  private customOn: boolean;
  constructor(
    private readonly curves: Record<string, ZoneCurve>,
    private readonly zone: string,
    private readonly rand: Rand,
    private readonly custom: ((zone: string) => Monster | null) | null,
  ) {
    this.customOn = custom !== null;
  }

  next(level: number): Monster {
    const base = rollZone(this.curves[this.zone], level, this.rand);
    if (this.customOn && this.custom !== null) {
      const c = this.custom(this.zone);
      if (c !== null) return c;
      this.customOn = false;
    }
    return base;
  }
}

export {};
