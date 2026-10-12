// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Range = 1 | 2 | 3;

interface Unit {
  id: string;
  x: number;              // column 0..cols-1
  y: number;              // row 1..3 on the board, 0 = bench
  range: number;
  canPlace: boolean;      // eggs stay on the bench
  countsForTeam: boolean; // inanimate and gold-bow units do not count toward the team cap
}

interface Board {
  units: Unit[];
  cols: number;
}

const PAC_DEFAULTS = {
  cols: 8,
  crowdedBonus: 3,        // team cap = level, +3 in CROWDED
  removeBeforeStage: 5,   // leaving on stage <= 5: removed, no reward
  xpMinStage: 10,
  surrenderLife: -99,
} as const;

// Melee fills the front row first; mid-range the middle row; long-range the back row.
function rowOrder(range: number): number[] {
  const r = Math.min(range, 3);
  if (r === 2) return [2, 1, 3];
  if (r === 3) return [1, 2, 3];
  return [3, 2, 1];
}

function firstFreeCell(board: Board, range: number): { x: number; y: number } | null {
  for (const y of rowOrder(range)) {
    for (let x = 0; x < board.cols; x++) {
      if (!board.units.some((u) => u.y === y && u.x === x)) return { x, y };
    }
  }
  return null;
}

// Default tactics for an absent coach: move bench units onto the board, leftmost bench first, until the level cap.
// simplified: the donor loop runs a fixed number of attempts and retries the same bench unit when no cell is free;
// this version stops instead. The donor also skips bot players (caller's job here) and does not stop for a
// fully-blocked row.
function fillDefaultTeam(board: Board, level: number, crowded: boolean): number {
  const cap = crowded ? level + PAC_DEFAULTS.crowdedBonus : level;
  const onBoard = board.units.filter((u) => u.y > 0 && u.countsForTeam).length;
  const toMove = Math.max(0, cap - onBoard);
  let moved = 0;
  for (let i = 0; i < toMove; i++) {
    const next = board.units
      .filter((u) => u.y === 0 && u.canPlace)
      .sort((a, b) => a.x - b.x)[0];
    if (!next) break;
    const cell = firstFreeCell(board, next.range);
    if (!cell) break;
    next.x = cell.x;
    next.y = cell.y;
    moved++;
  }
  return moved;
}

type LeaveOutcome =
  | { kind: "none" }                                  // already out of the fight
  | { kind: "removed"; reward: false }                // early leave: removed, no rewards
  | { kind: "surrendered"; life: number; xp: boolean; elo: boolean }; // stays in play, ranked last

// Order follows the donor: the early-removal test comes first (no life check), then the already-out test.
// simplified: the donor also checks gameFinished and a hasLeftGame flag before surrender; both omitted.
function onAbsent(stage: number, life: number, consented: boolean): LeaveOutcome {
  if (stage <= PAC_DEFAULTS.removeBeforeStage && !consented) return { kind: "removed", reward: false };
  if (life <= 0) return { kind: "none" };
  return {
    kind: "surrendered",
    life: PAC_DEFAULTS.surrenderLife,
    xp: stage >= PAC_DEFAULTS.xpMinStage,
    elo: true, // donor: stage >= 10 OR left before the end; in this branch the left-before-end half is true
  };
}

export {};
