// Donor licence: GPL-3.0 (LICENSE, Version 3). Clean-room: written from the described mechanism only, not translated.
type MissionType = "rescue" | "explore" | "battle" | "deliver";
type Rank = "E" | "D" | "C" | "B" | "A" | "S";

interface Mission {
  type: MissionType;
  rank: Rank;
  hash: number;
}

// Per-game facts for the match that just ended (the donor reads the in-game maxima).
interface MatchFacts {
  maxes: Record<string, number>;
  pokemonOnBoard: Set<string>;
  itemCount: Record<string, number>;
  regions: Set<string>;
  synergyLevels: Record<string, number>;
}

// Zone-data target for one mission (the donor picks these from hash-indexed pools).
interface Target {
  stat?: string;
  amount?: number;
  item?: string;
  quantity?: number;
  pokemon?: string;
  region?: string;
  synergy?: string;
  level?: number;
}

const RANKS: Rank[] = ["E", "D", "C", "B", "A", "S"];
const TYPES: MissionType[] = ["rescue", "explore", "battle", "deliver"];
const XP: Record<Rank, number> = { E: 250, D: 300, C: 400, B: 500, A: 750, S: 1000 };

// Thresholds on the completed count, one list per slot index (slot 2 reuses the last list).
const TIER_STEPS: number[][] = [
  [3, 6, 10, 15, 20],
  [5, 10, 15, 20, 30],
  [6, 12, 18, 25],
];

function rankFor(completed: number, slot: number): Rank {
  const steps = TIER_STEPS[Math.min(slot, TIER_STEPS.length - 1)];
  let idx = 0;
  for (const s of steps) {
    if (completed >= s) idx++;
  }
  return RANKS[Math.min(idx, RANKS.length - 1)];
}

// Stateless board: three missions recomputed from (uid hash, completed count); only the count is stored.
export function board(uidHash: number, completed: number): Mission[] {
  const hash = uidHash + completed;
  const doubled: MissionType[] = [...TYPES, ...TYPES];
  const start = hash % TYPES.length;
  const out: Mission[] = [];
  for (let i = 0; i < 3; i++) {
    out.push({ type: doubled[start + i], rank: rankFor(completed, i), hash });
  }
  return out;
}

export function checkMission(m: Mission, f: MatchFacts, t: Target): boolean {
  switch (m.type) {
    case "rescue":
      return f.pokemonOnBoard.has(t.pokemon ?? "");
    case "explore":
      return (
        f.regions.has(t.region ?? "") &&
        (f.synergyLevels[t.synergy ?? ""] ?? 0) >= (t.level ?? Infinity)
      );
    case "battle":
      return (f.maxes[t.stat ?? ""] ?? 0) >= (t.amount ?? Infinity);
    case "deliver":
      return (f.itemCount[t.item ?? ""] ?? 0) >= (t.quantity ?? Infinity);
  }
}

// One settle pass after a game: the board is read once, then each mission is checked.
export function settle(
  uidHash: number,
  completedBefore: number,
  facts: MatchFacts,
  targetFor: (m: Mission) => Target,
): { completed: number; xp: number[] } {
  let completed = completedBefore;
  const xp: number[] = [];
  for (const m of board(uidHash, completedBefore)) {
    if (checkMission(m, facts, targetFor(m))) {
      completed += 1; // the count moves the next board
      xp.push(XP[m.rank]);
    }
  }
  return { completed, xp };
}

export {};
