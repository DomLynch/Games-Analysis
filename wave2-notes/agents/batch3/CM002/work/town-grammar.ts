// Licence: CC-BY-SA 3.0 (donor, Cataclysm: DDA). Clean-room sketch of the described mechanism, not a translation of the donor lines.
export {};

type Kind = 'shop' | 'park' | 'house';
type Side = 'left' | 'right';

// Zone data: the four numbers that change per region. Percents are of town radius.
interface ZoneTownData {
  shopRadius: number;
  shopSigma: number;
  parkRadius: number;
  parkSigma: number;
}

interface Catalogue {
  id: string;
  minSize: number;   // inclusive town size the entry may appear in
  maxSize: number;   // inclusive
  unique: boolean;   // at most once per town
}

type Bins = Record<Kind, Catalogue[]>;

interface Rng {
  int(lo: number, hi: number): number; // inclusive, like the donor's rng(lo, hi)
  chance(n: number): boolean;          // true with probability 1 / n, like one_in(n)
  unit(): number;                      // [0, 1)
}

interface Town {
  size: number;
  placedUnique: Set<string>;
}

// Box-Muller normal draw from the injected uniform source.
function normalRoll(rng: Rng, mean: number, sd: number): number {
  const u1 = Math.max(rng.unit(), 1e-12);
  const u2 = rng.unit();
  return mean + sd * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// Ring rule. distPct is the distance from the town centre as a percent of town size.
// The shop ring is at least shopRadius; a normal draw can only widen it. Parks use the
// same shape. The draw happens per call, so the boundary is fuzzy per building.
function pickKind(distPct: number, z: ZoneTownData, rng: Rng): Kind {
  const shopNormal = z.shopSigma > 0
    ? Math.max(z.shopRadius, Math.trunc(normalRoll(rng, z.shopRadius, z.shopSigma)))
    : z.shopRadius;
  const parkNormal = z.parkSigma > 0
    ? Math.max(z.parkRadius, Math.trunc(normalRoll(rng, z.parkRadius, z.parkSigma)))
    : z.parkRadius;
  if (shopNormal > distPct) return 'shop';
  if (parkNormal > distPct) return 'park';
  return 'house';
}

// Fix for the donor's unbounded do/while: a bounded number of draws, then null.
function pickCatalogue(distPct: number, town: Town, z: ZoneTownData, bins: Bins, rng: Rng, maxTries = 20): Catalogue | null {
  const bin = bins[pickKind(distPct, z, rng)];
  if (bin.length === 0) return null;
  for (let i = 0; i < maxTries; i++) {
    const c = bin[rng.int(0, bin.length - 1)];
    if (c.minSize > town.size || c.maxSize < town.size) continue;
    if (c.unique && town.placedUnique.has(c.id)) continue;
    return c;
  }
  return null;
}

// Place one building at a time, up to 10 candidate tries (donor place_building).
// Returns false when every try fails, so the caller can count it instead of failing silently.
function placeOne(town: Town, z: ZoneTownData, bins: Bins, rng: Rng, distPct: number, tryPlace: (c: Catalogue) => boolean): boolean {
  for (let r = 10; r > 0; r--) {
    const c = pickCatalogue(distPct, town, z, bins, rng);
    if (c !== null && tryPlace(c)) {
      if (c.unique) town.placedUnique.add(c.id);
      return true;
    }
  }
  return false;
}

interface Ctx {
  town: Town;
  z: ZoneTownData;
  bins: Bins;
  rng: Rng;
  distanceOf: (street: number, step: number) => number; // caller's geometry, in tiles
  tryPlace: (street: number, step: number, side: Side, c: Catalogue) => boolean;
  failures: number;
  nextStreet: number;
}

// Grow one street of length cs from the hub (donor build_city_street, abstract tiles).
// Side streets sprout every few steps, the widths alternate, and buildings go on both sides
// of each step with a 3-in-4 chance per side. A full-length street ends with a turn.
function buildStreet(ctx: Ctx, cs: number, blockWidth: number, street: number): void {
  let size = cs;
  let c = size;
  let croad = size;
  const newWidth = blockWidth === 2 ? ctx.rng.int(3, 5) : 2;

  for (let step = 1; step <= size; step++) {
    c--;
    if (c >= 2 && c < croad - blockWidth) {
      croad = c;
      let left = size - ctx.rng.int(1, 3);
      let right = size - ctx.rng.int(1, 3);
      if (left === 1) left++;
      if (right === 1) right++;
      buildStreet(ctx, left, newWidth, ctx.nextStreet++);
      buildStreet(ctx, right, newWidth, ctx.nextStreet++);
    }
    const sides: Side[] = [];
    if (!ctx.rng.chance(4)) sides.push('left');
    if (!ctx.rng.chance(4)) sides.push('right');
    for (const side of sides) {
      const distPct = Math.trunc((ctx.distanceOf(street, step) * 100) / Math.max(ctx.town.size, 1));
      const ok = placeOne(ctx.town, ctx.z, ctx.bins, ctx.rng, distPct,
        (cat) => ctx.tryPlace(street, step, side, cat));
      if (!ok) ctx.failures++;
    }
  }

  // Donor: the end-of-street turn uses a reduced size. c === 0 means the walk ran its full length.
  size -= ctx.rng.int(1, 3);
  if (size >= 2 && c === 0) {
    // The turn side (left or right of the walk) is geometry; this abstract walk does not model it.
    buildStreet(ctx, size, 2, ctx.nextStreet++);
    if (ctx.rng.chance(5)) buildStreet(ctx, size, newWidth, ctx.nextStreet++);
  }
}

// Build one town: four arms from the hub, one per cardinal direction (donor build_cities).
// The donor picks a random first arm; that only changes the order of RNG draws, so it is omitted.
export function buildTown(
  size: number,
  z: ZoneTownData,
  bins: Bins,
  rng: Rng,
  distanceOf: (street: number, step: number) => number,
  tryPlace: (street: number, step: number, side: Side, c: Catalogue) => boolean,
): { failures: number } {
  const ctx: Ctx = {
    town: { size, placedUnique: new Set<string>() },
    z,
    bins,
    rng,
    distanceOf,
    tryPlace,
    failures: 0,
    nextStreet: 1,
  };
  for (let arm = 0; arm < 4; arm++) {
    buildStreet(ctx, size, 2, ctx.nextStreet++);
  }
  return { failures: ctx.failures };
}
