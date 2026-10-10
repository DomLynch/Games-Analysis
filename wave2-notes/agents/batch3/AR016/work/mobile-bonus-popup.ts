// Licence: GPL-3.0 (lichess-org-mobile LICENSE, read). Clean-room sketch written from the described mechanism; not a translation of storm_clock.dart.
// clean-room
export {};

interface PopupTuning {
  popupMs: number; // donor 1500 (AnimationController duration)
  rollMs: number; // donor 500 (TweenAnimationBuilder duration; linear, no curve given)
  sideFraction: number; // donor 0.7 (SlideTransition x, as a fraction of the widget width)
  riseFraction: number; // donor -1.0 (SlideTransition y end, as a fraction of the widget height)
}

export interface PopupFrame {
  alpha: number; // donor opacity 1.0 -> 0.0
  dx: number; // constant side offset
  dy: number; // rises from 0 to riseFraction
  shown: number; // counter value in seconds, rolled from the previous value to the new one
  good: boolean; // colour: good when the signed amount is not below zero
}

// SIMPLIFIED: quadratic ease-out. The donor uses Flutter's Curves.easeOut, which is not in the donor and not reproduced here.
function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export class BonusPopup {
  private startedAt: number | null = null;
  private from = 0;
  private to = 0;
  private amount = 0;

  // A new event restarts the popup at once (donor: forward(from: 0.0)); events do not queue.
  push(previousValue: number, newValue: number, signedAmount: number, now: number): void {
    this.from = previousValue;
    this.to = newValue;
    this.amount = signedAmount;
    this.startedAt = now;
  }

  // Returns null when the popup is finished. The counter and the popup end together (donor: the bonus branch is removed at completion).
  frame(now: number, t: PopupTuning): PopupFrame | null {
    if (this.startedAt === null) return null;
    const elapsed = now - this.startedAt;
    if (elapsed >= t.popupMs) {
      this.startedAt = null;
      return null;
    }
    const k = easeOut(elapsed / t.popupMs);
    const rollT = Math.min(1, elapsed / t.rollMs); // linear roll
    return {
      alpha: 1 - k,
      dx: t.sideFraction,
      dy: t.riseFraction * k,
      shown: this.from + (this.to - this.from) * rollT,
      good: this.amount >= 0,
    };
  }
}
