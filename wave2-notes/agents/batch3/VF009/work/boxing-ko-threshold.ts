// Licence: Unlicense / public domain dedication (donor LICENSE). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type PunchKind = "fullSwing" | "hook" | "uppercut" | "jab";

// Points per landed punch, in the order the donor adds them (hook is two hits).
const POINTS: Record<PunchKind, number[]> = {
  fullSwing: [15],
  hook: [7, 5],
  uppercut: [8],
  jab: [5],
};

export interface Ledger {
  damage: number; // points taken this round; reset at the start of each round
}

export const KO_AT = 35; // a fighter is knocked out when the ledger is over this value
export const BEST_PUNCH_BONUS = 2; // added to the victim when the attacker lands its best punch

// Apply one landed punch to the victim's ledger. Returns true when the victim is knocked out.
// The check runs once, after all of this punch's points are added.
export function landPunch(victim: Ledger, kind: PunchKind, isBestPunch: boolean): boolean {
  if (isBestPunch) victim.damage += BEST_PUNCH_BONUS;
  for (const p of POINTS[kind]) victim.damage += p;
  return victim.damage > KO_AT;
}

export type Side = "player" | "cpu";
export interface RoundResult {
  koVictim?: Side;   // set when the round ends by knockout (the match ends too)
  roundWinner?: Side;
}

// A knockout ends the round at once. Otherwise the side with more damage taken loses the round.
export function settleRound(
  player: Ledger, cpu: Ledger, koVictim: Side | undefined,
): RoundResult {
  if (koVictim) return { koVictim };
  return { roundWinner: cpu.damage > player.damage ? "player" : "cpu" };
}

// Best of three: the match is over when either side has two round wins.
export function matchOver(playerWins: number, cpuWins: number): boolean {
  return playerWins >= 2 || cpuWins >= 2;
}
export {};
