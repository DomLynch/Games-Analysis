// Licence: GPL-2.0-or-later (donor mapview_common.c header: "either version 2, or (at your option) any later version").
// clean-room: shape only, written from the described mechanism, not a translation of the donor lines.
interface HpTickBattle {
  loserStart: number;  // HP shown on a copy of the loser at the start of the hit
  loserEnd: number;    // HP the hit ends on (already decided by the authority)
  winnerStart: number; // HP shown on a copy of the winner (never below its end value)
  winnerEnd: number;
  steps: number;       // tick count, see battleSteps
  stepS: number;       // seconds per tick
}

// Donor rule: the tick count is the larger of the loser's HP and the damage the winner took.
function battleSteps(loserHp: number, winnerStart: number, winnerEnd: number): number {
  return Math.max(loserHp, winnerStart - winnerEnd);
}

// Pure: the values to draw at this elapsed time. Never writes game state.
// Returns null once the hit is over (the donor returns before drawing the final tick).
function battleDraw(b: HpTickBattle, elapsedS: number): { loserHp: number; winnerHp: number } | null {
  const total = b.steps * b.stepS;
  if (elapsedS >= total) return null;
  const step = Math.floor(elapsedS / b.stepS); // at most steps - 1
  return {
    loserHp: b.loserStart - Math.trunc(((b.loserStart - b.loserEnd) * step) / b.steps),
    winnerHp: b.winnerStart - Math.trunc(((b.winnerStart - b.winnerEnd) * step) / b.steps),
  };
}

// Pure: a movement drawn as a linear slide over a fixed time, clamped to the end point.
function moveDraw(fromX: number, fromY: number, dx: number, dy: number, durS: number, elapsedS: number): { x: number; y: number } {
  const t = Math.min(elapsedS, durS);
  return { x: fromX + dx * (t / durS), y: fromY + dy * (t / durS) };
}

interface Presentation {
  durationS: number;
  draw(elapsedS: number): void;
}

// One head at a time. The head's clock starts when it becomes the head.
class PresentationQueue {
  private items: Presentation[] = [];
  private elapsed = 0;

  push(p: Presentation): void {
    this.items.push(p);
  }

  // Called once per display frame with the wall-clock delta.
  tick(dtS: number): void {
    const head = this.items[0];
    if (head === undefined) return;
    this.elapsed += dtS;
    if (this.elapsed < head.durationS) {
      head.draw(this.elapsed);
      return;
    }
    head.draw(head.durationS);
    this.items.shift();
    this.elapsed = 0;
  }
}

export {};
