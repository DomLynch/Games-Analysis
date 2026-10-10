// Licence: Apache-2.0 (donor repo LICENSE). Clean-room sketch of the mechanism; not a translation.

const MIN_CYCLE_MS = 100;          // floor on one swing's full cycle
const CYCLE_CONSTANT = 500000;     // cycle ms = 500000 / attack speed

// Full swing cycle in ms from attack speed (higher speed = shorter swing).
function swingCycleMs(attackSpeed: number): number {
  return Math.max(MIN_CYCLE_MS, CYCLE_CONSTANT / attackSpeed);
}

// Playback rate so the whole swing clip fills the cycle exactly once.
function clipPlaybackRate(clipSec: number, cycleMs: number): number {
  return (clipSec * 1000) / Math.max(1, cycleMs);
}

interface LiveSwing {
  epoch: number;
  hitFired: boolean;
}

// One live swing per attacker. The hit fires from a frame event, at most once per swing.
class SwingBook {
  private live = new Map<number, LiveSwing>();

  begin(attackerId: number): number {
    const prev = this.live.get(attackerId);
    const epoch = prev === undefined ? 1 : prev.epoch + 1;
    this.live.set(attackerId, { epoch, hitFired: false });
    return epoch;
  }

  // Called from the hit frame of the swing clip. Returns the epoch that owns the hit, or null.
  onHitFrame(attackerId: number): number | null {
    const s = this.live.get(attackerId);
    if (s === undefined || s.hitFired) return null;
    s.hitFired = true;
    return s.epoch;
  }

  // An older swing cannot clear a newer one. Epoch 0 is a wildcard (clears whatever is live), as in the donor.
  end(attackerId: number, epoch = 0): void {
    const s = this.live.get(attackerId);
    if (s === undefined) return;
    if (epoch > 0 && s.epoch !== epoch) return;
    this.live.delete(attackerId);
  }
}

const cyc = swingCycleMs(333);            // about 1501.5 ms at speed 333
const rate = clipPlaybackRate(0.9, cyc);  // clip of 0.9 s plays slower to fill the cycle
const book = new SwingBook();
const e1 = book.begin(7);
const hit1 = book.onHitFrame(7);          // e1
const hit2 = book.onHitFrame(7);          // null: already fired this swing
book.end(7, e1 + 1);                      // non-zero epoch that is not the live one: no effect
export { cyc, rate, hit1, hit2 };
export {}
