// clean-room: shape of the rule only, written from the described mechanism, not a translation.
type Rank = 1 | 2 | 3; // 1 = best (three stars)

const TIER_BONUS = [500, 300, 100] as const; // top, middle, low time/move bonus

interface LevelSpec {
  par: number;        // moves the level is designed for
  appleAndCapturePoints: number; // apples*50 + captures*50 when captures score
}

// Maximum level score: fixed as the donor does (apples and captures at a flat value, plus the top bonus).
function levelMax(spec: LevelSpec): number {
  return spec.appleAndCapturePoints + TIER_BONUS[0];
}

// Time/move bonus on completion only: at or under par is top, within max(1, par/8) over par is middle.
function moveBonus(spec: LevelSpec, moves: number): number {
  const late = moves - spec.par;
  if (late <= 0) return TIER_BONUS[0];
  if (late <= Math.max(1, spec.par / 8)) return TIER_BONUS[1];
  return TIER_BONUS[2];
}

function levelRank(spec: LevelSpec, score: number): Rank {
  const max = levelMax(spec);
  return score >= max ? 1 : score >= max - 200 ? 2 : 3;
}

// Stage rank: the slack scales with the number of levels, with a floor of 200.
function stageRank(levels: LevelSpec[], scores: number[]): Rank {
  const max = levels.reduce((sum, l) => sum + levelMax(l), 0);
  const total = scores.reduce((a, b) => a + b, 0);
  const slack = Math.max(200, levels.length * 150);
  return total >= max ? 1 : total >= max - slack ? 2 : 3;
}

// Best-score ledger: a write happens only when the new score is strictly higher.
function saveBest(ledger: Map<string, number>, key: string, score: number): boolean {
  const prev = ledger.get(key) ?? -1;
  if (prev >= score) return false;
  ledger.set(key, score);
  return true;
}

// Stage percent: each started stage earns 10 / 8 / 5 points by rank, out of 10 per stage.
function percent(stages: { started: boolean; rank: Rank }[]): number {
  const points: Record<Rank, number> = { 1: 10, 2: 8, 3: 5 };
  let total = 0;
  for (const s of stages) if (s.started) total += points[s.rank];
  return Math.round((total / (stages.length * 10)) * 100);
}

export {};
