// Licence: MIT (donor LICENSE). Clean-room sketch written from the described rules; no species, move or item data is used.
type Major = "none" | "sleep";
type Side = "A" | "B";

interface Mon {
  side: Side;
  hp: number;
  major: Major;
  sleepSourceSide: Side | null;  // which side put this mon to sleep
  sleepLeft: number;             // donor effectState.time: decremented on each move attempt; the attempt that takes it to 0 or less wakes the mon AND proceeds
  confusionLeft: number;         // donor volatile time: same shape (the attempt that takes it to 0 removes the volatile and proceeds); 0 = not confused
}

interface Rules {
  sleepClause: boolean;
}

// roll(min, max) returns an integer in [min, max), like the donor's random(m, n).
type Roll = (min: number, max: number) => number;

// simplified: the donor has six major statuses; this sketch keeps only sleep. It omits the SetStatus event hooks other than
// Sleep Clause, the immunity checks, abilities that change counts, the sleepUsable move flag and the 'cant' message.
// Sleep Clause here refuses a sleep on a side that already has a living mon asleep from the other side.
function trySleep(target: Mon, source: Mon, team: Mon[], rules: Rules, roll: Roll): boolean {
  if (target.hp <= 0 || target.major !== "none") return false; // one major status at a time
  if (rules.sleepClause && source.side !== target.side) {
    const foeAsleep = team.some(
      (m) => m.side === target.side && m.hp > 0 && m.major === "sleep" && m.sleepSourceSide !== m.side,
    );
    if (foeAsleep) return false;
  }
  target.major = "sleep";
  target.sleepSourceSide = source.side;
  target.sleepLeft = roll(2, 5); // [2, 5): startTime 2, 3 or 4, i.e. 1, 2 or 3 lost attempts, then the waking attempt acts
  return true;
}

// One move attempt by a sleeping mon: count down; at zero the mon wakes and the move GOES THROUGH (donor onBeforeMove cures the status and returns without blocking); otherwise the attempt is lost.
// "wakes" = acts this attempt; "asleep" = attempt lost; "awake" = was not asleep. earlyBird models the donor's extra decrement.
function sleepAttempt(m: Mon, earlyBird = false): "wakes" | "asleep" | "awake" {
  if (m.major !== "sleep") return "awake";
  if (earlyBird) m.sleepLeft -= 1;
  m.sleepLeft -= 1;
  if (m.sleepLeft <= 0) {
    m.major = "none";
    m.sleepSourceSide = null;
    return "wakes";
  }
  return "asleep";
}

// Self-hit damage: integer chain, plus 2, then a random factor of 85 to 100 percent; minimum 1.
// randomFactor is an integer in [0, 16), as the donor's random(16).
function selfHitDamage(level: number, atk: number, def: number, basePower: number, randomFactor: number): number {
  const tr = Math.trunc;
  const base = tr(tr(tr(tr((2 * level) / 5 + 2) * basePower * atk) / def) / 50) + 2;
  const scaled = tr(tr(base * (100 - randomFactor)) / 100);
  return Math.max(1, scaled);
}

// Confusion: count down per move attempt; while confused, a 33 in 100 roll hits the mon itself.
function confusedAttempt(m: Mon, percentRoll: number, hitDamage: number): number {
  if (m.confusionLeft <= 0) return 0;
  m.confusionLeft -= 1;
  if (m.confusionLeft <= 0) return 0;
  if (percentRoll >= 33) return 0;
  return hitDamage;
}

export {};
