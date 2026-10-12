// Licence: AGPL-3.0 (donor LICENSE.txt). Clean-room sketch from the described mechanism, not a translation of the donor lines.
export {};

type Cell = { x: number; y: number };

// Start chance in percent. Donor: typeStart x (15 + 1.5 x min(damage, HP before the hit)) / 100.
// The donor's comment says 2/3 where the code uses 3/2; this sketch follows the code as it runs (see section 6).
function bloodStartPercent(damage: number, hpBeforeHit: number, typeStart: number): number {
  if (damage <= 0) return 0;
  const basis = Math.min(damage, hpBeforeHit);
  return Math.floor((typeStart * (15 + Math.floor((basis * 3) / 2))) / 100);
}

// Spreads one step per generation to the four neighbours. Each neighbour succeeds with the current chance;
// the chance drops by the decrement after each generation. Stops when the chance is 0 or below (donor),
// or at a cell budget (fix: the donor has no cap other than the chance running out).
function spreadBlood(
  origin: Cell,
  startPct: number,
  decrement: number,
  isOpen: (c: Cell) => boolean,
  rand: () => number,      // seeded RNG so a replay reproduces the stains (row 19)
  maxCells: number,
): Cell[] {
  const key = (c: Cell): string => `${c.x},${c.y}`;
  const seen = new Set<string>([key(origin)]);
  const out: Cell[] = [origin];
  const dirs: Cell[] = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
  let frontier: Cell[] = [origin];   // fix: two buffers, so a cell is never re-marked before it spreads
  let chance = startPct;

  while (frontier.length > 0 && chance > 0) {
    const next: Cell[] = [];
    for (const c of frontier) {
      for (const d of dirs) {
        if (out.length >= maxCells) return out;
        const n: Cell = { x: c.x + d.x, y: c.y + d.y };
        if (seen.has(key(n)) || !isOpen(n)) continue; // fix: a cell is rolled once, never re-rolled
        if (rand() * 100 < chance) {
          seen.add(key(n));
          out.push(n);
          next.push(n);
        }
      }
    }
    frontier = next;
    chance -= decrement;
  }
  return out;
}
