// Licence: NetHack General Public License (donor dat/license, para 2b). Derivatives must be licensed at no charge on identical terms, so treated as copyleft. Clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface Species {
  id: string;
  difficulty: number;        // species difficulty (data, count)
  freq: number;              // creation frequency, 0 to 7
  small: boolean;            // appears in small groups (donor G_SGROUP)
  large: boolean;            // appears in large groups (donor G_LGROUP)
  alignShift: number;        // 0 to 5, set from the zone's alignment (donor align_shift)
  temperatureMatch: boolean; // zone temperature suits this species: +3 weight
  uncommon: boolean;         // unique, not generated, extinct, or excluded
}

interface Zone {
  depth: number;      // zone difficulty (count); the donor's level_difficulty()
  rollOneIn: number;  // per-tick roll: 70 default, 50 deeper than the stronghold, 25 once the demigod flag is set
  species: Species[];
  maxGroup: number;   // Frankendom addition: cap on leader plus group (MAX_ATTACKERS = 3)
}

interface Host {
  width: number;
  height: number;
  inView(x: number, y: number): boolean;            // the player can see this tile
  free(x: number, y: number): boolean;              // a monster may stand here
  canStand(sp: Species, x: number, y: number): boolean;
  adjacentFree(x: number, y: number): { x: number; y: number } | null;
  place(sp: Species, x: number, y: number): void;
}

// Own small xorshift32 generator; the server seeds it per zone and tick so a test can replay spawns.
class Rng {
  private s: number;
  constructor(seed: number) {
    this.s = (seed >>> 0) || 1;
  }
  next(): number {
    let x = this.s;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.s = x >>> 0;
    return this.s / 4294967296;
  }
  int(lo: number, hi: number): number {
    return lo + Math.floor(this.next() * (hi - lo + 1)); // inclusive
  }
}

// Species window from zone depth and player level (donor: min = depth / 6, max = (depth + level) / 2).
function pickSpecies(zone: Zone, playerLevel: number, rng: Rng): Species | null {
  const minDiff = Math.floor(zone.depth / 6);
  const maxDiff = Math.floor((zone.depth + playerLevel) / 2);
  let chosen: Species | null = null;
  let total = 0;
  for (const sp of zone.species) {
    if (sp.difficulty < minDiff || sp.difficulty > maxDiff) continue;
    if (sp.uncommon) continue;
    const weight = sp.freq + sp.alignShift + (sp.temperatureMatch ? 3 : 0);
    if (weight <= 0) continue;
    total += weight;
    // weighted reservoir sampling: this candidate wins with probability weight / total
    if (rng.int(1, total) <= weight) chosen = sp;
  }
  return chosen;
}

// Spot first: 50 random tries that skip tiles in the player's view; then a scan
// whose first pass also skips visible tiles and whose second pass allows them.
function findSpot(host: Host, rng: Rng): { x: number; y: number } | null {
  for (let t = 0; t < 50; t++) {
    const x = rng.int(2, host.width - 2);
    const y = rng.int(0, host.height - 1);
    if (!host.inView(x, y) && host.free(x, y)) return { x, y };
  }
  const x0 = rng.int(0, host.width - 1);
  const y0 = rng.int(0, host.height - 1);
  for (let pass = 0; pass < 2; pass++) {
    for (let dx = 0; dx < host.width; dx++) {
      for (let dy = 0; dy < host.height; dy++) {
        const x = (dx + x0) % host.width;
        const y = (dy + y0) % host.height;
        if (pass === 0 && host.inView(x, y)) continue;
        if (host.free(x, y)) return { x, y };
      }
    }
  }
  return null;
}

// Group extras: draw 1..n (n = 3 small, 10 large), damp at low level, at least one; cap at maxGroup.
function groupExtras(sp: Species, zone: Zone, playerLevel: number, rng: Rng): number {
  let n = 0;
  if (sp.small && rng.int(0, 1) === 1) n = 3;
  else if (sp.large) n = rng.int(0, 2) !== 0 ? 10 : 3;
  if (n === 0) return 0;
  const damp = playerLevel < 3 ? 4 : playerLevel < 5 ? 2 : 1;
  let cnt = Math.floor(rng.int(1, n) / damp);
  if (cnt === 0) cnt = 1;
  return Math.min(cnt, zone.maxGroup - 1);
}

// One tick of the director. Returns what was placed, or null when nothing spawns this tick.
export function tickSpawn(zone: Zone, playerLevel: number, rng: Rng, host: Host): { species: string; size: number } | null {
  if (rng.int(1, zone.rollOneIn) !== 1) return null;

  const spot = findSpot(host, rng);
  if (!spot) return null;

  let sp: Species | null = null;
  for (let t = 0; t < 51; t++) {
    const pick = pickSpecies(zone, playerLevel, rng);
    if (!pick) return null; // nothing fits this window
    if (host.canStand(pick, spot.x, spot.y)) {
      sp = pick;
      break;
    }
  }
  if (!sp) return null;

  host.place(sp, spot.x, spot.y);
  const extra = groupExtras(sp, zone, playerLevel, rng);
  let placed = 1;
  let cur = spot; // the donor chains: each extra starts from the last one placed
  for (let i = 0; i < extra; i++) {
    const p = host.adjacentFree(cur.x, cur.y);
    if (!p) break;
    host.place(sp, p.x, p.y);
    cur = p;
    placed++;
  }
  return { species: sp.id, size: placed };
}

// Usage with a stub host, so the file exercises the types.
const stub: Host = {
  width: 80,
  height: 21,
  inView: (x, y) => x < 10 && y < 5,
  free: () => true,
  canStand: () => true,
  adjacentFree: (x, y) => ({ x: x + 1, y }),
  place: () => undefined,
};
const demoZone: Zone = {
  depth: 6,
  rollOneIn: 70,
  maxGroup: 3,
  species: [
    { id: 'jackal', difficulty: 1, freq: 3, small: true, large: false, alignShift: 0, temperatureMatch: false, uncommon: false },
    { id: 'wolf', difficulty: 5, freq: 2, small: false, large: true, alignShift: 1, temperatureMatch: true, uncommon: false },
  ],
};
const result = tickSpawn(demoZone, 4, new Rng(12345), stub);
