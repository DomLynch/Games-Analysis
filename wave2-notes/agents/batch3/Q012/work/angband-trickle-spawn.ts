// Licence: GPL-2.0 or the Angband licence (dual, donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Race { name: string; level: number; weight: number; }

export interface TrickleParams {
  oneInN: number;      // 1 in N chance per spawn check
  oodOneIn: number;    // 1 in N chance that the depth used for picking is boosted
  oodAmount: number;   // cap on the boost
  minDist: number;     // spawn only farther than this from the player (approximate metric)
  maxAttempts: number; // tries to find a free floor cell
}

// Approximate distance: larger axis plus half the smaller axis.
export function approxDist(dx: number, dy: number): number {
  const a = Math.abs(dx);
  const b = Math.abs(dy);
  return Math.max(a, b) + (Math.min(a, b) >> 1);
}

// Pick a race for this depth. Weighted draw; then 60% chance of a second draw and 10% of a third,
// keeping the deeper race each time (a ties keep the newer draw, as in the donor).
export function pickRace(depth: number, races: Race[], p: TrickleParams, rng: () => number): Race | null {
  let gen = depth;
  if (depth > 0 && rng() * p.oodOneIn < 1) gen += Math.min(Math.floor(gen / 4) + 2, p.oodAmount);

  const legal = races.filter((r) => r.level <= gen && r.weight > 0);
  const total = legal.reduce((s, r) => s + r.weight, 0);
  if (total <= 0) return null;

  const draw = (): Race => {
    let v = Math.floor(rng() * total);
    for (const r of legal) {
      if (v < r.weight) return r;
      v -= r.weight;
    }
    return legal[legal.length - 1];
  };

  let race = draw();
  const roll = Math.floor(rng() * 100);
  if (roll < 60) {
    const alt = draw();
    race = alt.level >= race.level ? alt : race;
  }
  if (roll < 10) {
    const alt = draw();
    race = alt.level >= race.level ? alt : race;
  }
  return race;
}

// One spawn check (called once per 10 game ticks in the donor).
export function trySpawn(
  depth: number,
  races: Race[],
  p: TrickleParams,
  player: { x: number; y: number },
  width: number,
  height: number,
  isFreeFloor: (x: number, y: number) => boolean,
  rng: () => number,
): { x: number; y: number; race: Race } | null {
  if (rng() * p.oneInN >= 1) return null;
  for (let i = 0; i < p.maxAttempts; i++) {
    const x = Math.floor(rng() * width);
    const y = Math.floor(rng() * height);
    if (!isFreeFloor(x, y)) continue;
    if (approxDist(x - player.x, y - player.y) > p.minDist) {
      const race = pickRace(depth, races, p, rng);
      return race ? { x, y, race } : null;
    }
  }
  return null;
}

export {};
