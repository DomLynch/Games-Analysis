// Licence: GPL-3.0-or-later (donor, license.txt Version 3). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

// Knockout line: the hull level below which a unit is disabled (donor: minimumHull).
// The fraction falls from 50% of max hull for small hulls toward 10% for very large ones (donor curve).
function knockoutLine(maxHull: number, percent: number, hullBonus: number): number {
  const transition = 1 / (1 + 0.0005 * maxHull);
  const fraction = percent > 0 ? Math.min(percent, 1) : 0.1 * (1 - transition) + 0.5 * transition;
  return Math.max(0, Math.floor(maxHull * fraction + hullBonus));
}

// DISABLE fires once, on the frame the hull first drops below the line (donor: wasDisabled).
function crossedKnockout(prevLevel: number, nowLevel: number, line: number): boolean {
  return !(prevLevel < line) && nowLevel < line;
}

// Recovery: after the recovery timer runs out and the cost can be paid, the hull is raised
// to 1.5 x the line (capped at max) and the unit is no longer disabled (donor: recovery block).
function tryRecover(level: number, line: number, maxHull: number, counter: number, recoveryTime: number, canPay: boolean): { level: number; disabled: boolean; counter: number } {
  const next = counter + 1;
  if (next >= recoveryTime && canPay) {
    return { level: Math.min(Math.max(level, line * 1.5), maxHull), disabled: false, counter: 0 };
  }
  return { level, disabled: true, counter: next };
}

interface Death { rate: number; count: number; total: number; }

// One frame of the dying sequence. The per-frame chance is rate / 1024 and rises by one step each frame,
// so the explosions speed up. The count moves only when a spawn succeeds.
// When the total is reached, half the total is spread out at once, then the sequence reports done.
function stepDying(d: Death, roll: () => number, spawn: (spread: boolean) => boolean): "dying" | "done" {
  if (d.count === d.total) {
    const half = Math.floor(d.total / 2);
    for (let i = 0; i < half; i++) {
      if (spawn(true)) d.count += 1;   // donor: the counter can pass the total here
    }
    return "done";
  }
  d.rate += 1;
  if (Math.floor(roll() * 1024) < d.rate) {
    if (spawn(false)) d.count += 1;
  }
  return "dying";
}

// The final blast fires on the frame the explosion count reaches the total (donor: Fire()).
function finalBlastDue(d: Death): boolean {
  return d.count === d.total;
}

// Self-destruct starts the rate at the maximum, so an explosion is due every frame from the start.
function selfDestruct(d: Death): void {
  d.rate = 1024;
}

// Example use, so the file type-checks under --strict.
const line = knockoutLine(100, 0, 0);
const cross = crossedKnockout(60, 40, line);
const rec = tryRecover(20, line, 100, 4, 5, true);
const death: Death = { rate: 0, count: 0, total: 6 };
let spawned = 0;
let frames = 0;
while (stepDying(death, () => 0.5, () => { spawned += 1; return true; }) === "dying" && frames < 1000) {
  frames += 1;
}
const blast = finalBlastDue(death);
void cross; void rec; void spawned; void blast;
