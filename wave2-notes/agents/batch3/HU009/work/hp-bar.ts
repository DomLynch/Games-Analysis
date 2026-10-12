// Licence: BSD-2-Clause (donor LICENSE.txt, Copyright (c) 2013-2020, Turning Wheel LLC). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface HpBarConfig {
  baseFraction: number;   // width at low max HP (0.30)
  stepFraction: number;   // width added per interval (0.025)
  stepHp: number;         // interval size in max HP (5)
  startHp: number;        // no steps at or below this max HP (20)
  fullAtHp: number;       // full width at and above this max HP (160)
  holdTicks: number;      // ghost waits this many logic ticks after the last hit (30)
  fallDivisor: number;    // ghost and gain close 1/20 of the gap per reference frame (20)
  snapHp: number;         // gain snaps to the value within this many HP (1)
}

interface HpBarState {
  shown: number;          // foreground value
  ghost: number;          // lagging value
  lastHitTick: number;    // logic tick of the last hit or heal
  lastSetpoint: number;   // HP on the previous frame
}

// Width multiplier from max HP: stepped, saturating at fullAtHp.
function widthMultiplier(maxHp: number, c: HpBarConfig): number {
  if (maxHp >= c.fullAtHp) return 1;
  const steps = Math.floor(Math.max(0, maxHp - c.startHp) / c.stepHp);
  return c.baseFraction + c.stepFraction * steps;
}

// One UI frame. fpsScale is the reference-frame scale (donor: getFPSScale(144)); tick is the logic tick count.
function stepHpBar(s: HpBarState, hp: number, tick: number, fpsScale: number, c: HpBarConfig): void {
  if (hp < s.lastSetpoint) {                       // losing HP: foreground snaps down, hold restarts
    s.shown = hp;
    s.lastHitTick = tick;
  }
  if (s.shown < hp) {                              // gaining HP: ease up, snap when close
    s.shown = Math.min(hp, s.shown + fpsScale * ((hp - s.shown) / c.fallDivisor));
    if (hp - s.shown <= c.snapHp) s.shown = hp;
  } else if (s.shown > hp) {
    s.shown = hp;
  }

  if (s.ghost < hp) {                              // healed: ghost catches up at once
    s.ghost = s.shown;
    s.lastHitTick = tick;
  } else if (s.ghost > hp) {                       // hurt: ghost holds, then drains
    if (tick - s.lastHitTick > c.holdTicks) {
      const gap = Math.max(0.01, s.ghost - hp);
      s.ghost = Math.max(hp, s.ghost - fpsScale * (gap / c.fallDivisor));
    }
  } else {
    s.lastHitTick = tick;
  }
  s.lastSetpoint = hp;
}

// Pixel width of a bar layer: progress width scaled by the multiplier, then by value over max HP.
function layerPixels(value: number, maxHp: number, progressW: number, mult: number): number {
  return Math.max(1, Math.floor(progressW * mult * (value / maxHp)));
}
export {};
