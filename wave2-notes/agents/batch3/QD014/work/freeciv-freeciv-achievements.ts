// Licence: GPL-2.0-or-later (donor COPYING, version 2). Clean-room shape written from the mechanism, not a translation of the C.
interface Player {
  id: string;
  history: number; // the player's culture ledger (accumulated rewards)
}

interface Achievement {
  id: string;
  unique: boolean;      // true: one world-first winner; false: every player who qualifies
  reward: number;       // culture added to the history ledger on claim
  first: string | null; // unique only: the player who won the race
  claimed: Set<string>; // repeat guard: players who already hold it
  test: (p: Player) => boolean; // reads state; evaluated once per turn, not on the event
}

// One check for one achievement, run once per turn. Returns the world-first winner, if this turn decided one.
function checkAchievement(a: Achievement, players: Player[], rng: () => number): Player | null {
  const claimers: Player[] = [];
  for (const p of players) {
    if ((a.unique && a.first !== null) || a.claimed.has(p.id)) continue;
    if (a.test(p)) claimers.push(p);
  }

  if (!a.unique) {
    for (const p of claimers) {
      p.history += a.reward;
      a.claimed.add(p.id);
    }
    return null;
  }

  if (a.first !== null || claimers.length === 0) return null;
  // Simultaneous qualifiers: one is picked at random as the race winner; the rest get nothing.
  const winner = claimers[Math.floor(rng() * claimers.length)];
  a.first = winner.id;
  a.claimed.add(winner.id);
  winner.history += a.reward;
  return winner;
}

// Example wiring: a repeatable objective and a world-first objective, checked for two turns.
let seed = 7;
const rng = (): number => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};

const players: Player[] = [
  { id: "A", history: 0 },
  { id: "B", history: 0 },
];
const mapKnown: Achievement = {
  id: "map_known",
  unique: false,
  reward: 1000,
  first: null,
  claimed: new Set<string>(),
  test: (p) => p.id === "A",
};
const firstLaunch: Achievement = {
  id: "spaceship",
  unique: true,
  reward: 5000,
  first: null,
  claimed: new Set<string>(),
  test: () => true,
};

for (let turn = 0; turn < 2; turn++) {
  checkAchievement(mapKnown, players, rng);
  checkAchievement(firstLaunch, players, rng);
}

export {};
