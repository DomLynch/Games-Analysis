// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Deg = 0 | 45 | 90 | 135 | 180 | 225 | 270 | 315; // eight headings, 0 = east, 90 = north
interface Walker { x: number; y: number; facing: Deg; }
const DEAD_ZONE = 10; // units per axis, as in the donor

type TrySt = (d: Deg) => boolean; // turn to d, then step if the turn is close enough; true if the step was taken (the donor also returns true when it undoes the step)

function opposite(d: Deg): Deg {
  return ((d + 180) % 360) as Deg;
}

// One chase choice: diagonal first, then the axes (longer axis tried first half the time), then the current facing,
// then a sweep of the eight headings, and the reverse last.
function chaseStep(w: Walker, tx: number, ty: number, rand: () => number, trySt: TrySt): boolean {
  const back = opposite(w.facing);
  const dx = tx - w.x;
  const dy = ty - w.y;
  let ax: Deg | null = dx > DEAD_ZONE ? 0 : dx < -DEAD_ZONE ? 180 : null;
  let ay: Deg | null = dy > DEAD_ZONE ? 90 : dy < -DEAD_ZONE ? 270 : null;

  if (ax !== null && ay !== null) {
    const diag: Deg = ax === 0 ? (ay === 90 ? 45 : 315) : (ay === 90 ? 135 : 225);
    if (diag !== back && trySt(diag)) return true;
  }

  if ((rand() & 1) === 1 || Math.abs(dy) > Math.abs(dx)) {
    const t = ax;
    ax = ay;
    ay = t;
  }
  if (ax !== null && ax !== back && trySt(ax)) return true;
  if (ay !== null && ay !== back && trySt(ay)) return true;

  if (trySt(w.facing)) return true;

  if (rand() & 1) {
    for (let d = 0; d <= 315; d += 45) if (d !== back && trySt(d as Deg)) return true;
  } else {
    for (let d = 315; d >= 0; d -= 45) if (d !== back && trySt(d as Deg)) return true;
  }
  return trySt(back);
}

// Per think: stop at melee range; otherwise keep the heading 3 times in 4, re-chase on the 4th or when the heading is blocked.
function moveToGoal(w: Walker, tx: number, ty: number, closeEnough: boolean, rand: () => number, trySt: TrySt): void {
  if (closeEnough) return;
  if ((rand() & 3) === 1 || !trySt(w.facing)) chaseStep(w, tx, ty, rand, trySt);
}

export {};
