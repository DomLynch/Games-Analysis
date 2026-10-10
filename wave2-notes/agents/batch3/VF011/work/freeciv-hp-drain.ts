// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Rng = () => number; // uniform in [0, 1), stands in for the donor's fc_rand(n) (range not read)

interface Frame {
  atMs: number;
  loserHp: number;
  winnerHp: number;
  explosionFrame: number | null; // sprite index for the death burst, or null
}

// Donor decrease_unit_hp_smooth, frame-by-frame branch: one queued HP drain, then a death burst.
// Numbers are the server's start and end HP; nothing here changes the outcome.
export function queuedDrain(
  loserStart: number, loserEnd: number,
  winnerStart: number, winnerEnd: number,
  stepMs: number, spriteCount: number,
): { steps: number; drainMs: number; frames: Frame[] } {
  const steps = Math.max(loserStart, winnerStart - winnerEnd); // donor: steps = MAX(...)
  const drainMs = stepMs * steps;
  const frames: Frame[] = [];
  for (let s = 0; s < steps; s++) {
    // Donor: hp = start - (start - end) * step / steps, integer division.
    frames.push({
      atMs: s * stepMs,
      loserHp: loserStart - Math.floor(((loserStart - loserEnd) * s) / steps),
      winnerHp: winnerStart - Math.floor(((winnerStart - winnerEnd) * s) / steps),
      explosionFrame: null,
    });
  }
  if (loserEnd <= 0) {
    // Donor: death burst is queued after the drain; one sprite per step (10 ms at the default).
    for (let f = 0; f < spriteCount; f++) {
      frames.push({ atMs: drainMs + f * stepMs, loserHp: loserEnd, winnerHp: winnerEnd, explosionFrame: f });
    }
  }
  return { steps, drainMs, frames };
}

// Donor immediate branch (no queue): each step removes one HP from one side,
// the side chosen with probability proportional to its remaining HP above the end value.
export function immediateOrder(
  hp0Start: number, hp0End: number, hp1Start: number, hp1End: number, rng: Rng,
): Array<0 | 1> {
  let a = Math.max(hp0Start, hp0End); // donor: punit->hp = MAX(current, end)
  let b = Math.max(hp1Start, hp1End);
  const order: Array<0 | 1> = [];
  while (a > hp0End || b > hp1End) {
    const diff0 = a - hp0End;
    const diff1 = b - hp1End;
    if (Math.floor(rng() * (diff0 + diff1)) < diff0) {
      a -= 1;
      order.push(0);
    } else {
      b -= 1;
      order.push(1);
    }
  }
  return order;
}

export {};
