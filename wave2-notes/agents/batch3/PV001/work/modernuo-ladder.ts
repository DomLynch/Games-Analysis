// Licence: GPL-3.0 (donor, ModernUO LICENSE). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Entry = { id: string; xp: number; wins: number; losses: number };

// Base XP floor for levels 1..10 (index = level - 1). Level 10+ is 2500 + 500 per level, cap 50 at 22500 XP.
const BASE_XP = [0, 100, 200, 400, 600, 900, 1200, 1600, 2000, 2500];

function levelOf(xp: number): number {
  if (xp >= 22500) return 50;
  if (xp >= 2500) return 10 + Math.floor((xp - 2500) / 500);
  let lvl = 1;
  for (let i = 0; i < 9; i++) if (xp >= BASE_XP[i]) lvl = i + 1;
  return lvl;
}

// Win and loss scalars for gap = ourLevel - theirLevel, gap -6..+6 (index gap + 6). Tunable data.
const OFFSET: Array<[number, number]> = [
  [175, 25], [165, 35], [155, 45], [145, 55], [130, 70], [115, 85], [100, 100],
  [90, 110], [80, 120], [70, 130], [60, 140], [50, 150], [40, 160],
];

// Percent applied to losses only, levels 1..9. Level 10+ is 100.
const LOSS_FACTOR = [10, 11, 11, 25, 25, 43, 43, 67, 67];

// Signed XP change for one side. Returns 0 outside a +-6 level gap (donor rule).
function xpChange(ourXp: number, theirXp: number, won: boolean, multiplier: number): number {
  const lvl = levelOf(ourXp);
  const gap = lvl - levelOf(theirXp);
  if (gap < -6 || gap > 6) return 0;
  const [winScale, lossScale] = OFFSET[gap + 6];
  const scalar = won ? winScale : lossScale;
  const factor = won || lvl >= 10 ? 100 : LOSS_FACTOR[lvl - 1];
  // simplified: one integer division; the donor divides twice, which gives the same result for positive values.
  let xp = Math.trunc((25 * scalar * factor) / 10000);
  if (xp <= 0) xp = 1; // a decisive result always moves at least 1 XP
  return (won ? xp : -xp) * multiplier;
}

class Ladder {
  private byId = new Map<string, Entry>();

  // Fixed: the donor's Find tests for existence with the test inverted (it resets existing rows and returns null for new ones).
  find(id: string): Entry {
    let e = this.byId.get(id);
    if (!e) {
      e = { id, xp: 0, wins: 0, losses: 0 };
      this.byId.set(id, e);
    }
    return e;
  }

  // One 1v1 duel. Both gains come from the pre-duel XP of both sides (donor settles A first, so B reads A's new XP).
  settleDuel(a: string, b: string, aWon: boolean, tournament: boolean): void {
    const ea = this.find(a);
    const eb = this.find(b);
    const mult = (won: boolean) => (tournament ? (won ? 5 : 2) : 1);
    const gainA = xpChange(ea.xp, eb.xp, aWon, mult(aWon));
    const gainB = xpChange(eb.xp, ea.xp, !aWon, mult(!aWon));
    this.apply(ea, gainA, aWon);
    this.apply(eb, gainB, !aWon);
  }

  private apply(e: Entry, gain: number, won: boolean): void {
    if (gain === 0) return;
    if (won) e.wins++; else e.losses++;
    e.xp = Math.max(0, e.xp + gain);
  }

  // 1-based rank by XP, highest first. Re-sorted on read (donor keeps a sorted list with bubble swaps).
  rank(id: string): number {
    const sorted = [...this.byId.values()].sort((x, y) => y.xp - x.xp);
    return sorted.findIndex((e) => e.id === id) + 1;
  }
}

export {};
