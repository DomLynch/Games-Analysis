// Licence: AGPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface MountAnimal {
  satiety: number;      // 0 .. maxSatiety; 0 means hungry (mount slowed)
  maxSatiety: number;   // from the pet form (donor field PetHungerCount)
  lastX: number;        // mm, position at the previous sample
  lastY: number;
  hasLast: boolean;
  following: boolean;
}

interface MountForm {
  walkMs: number;                // walk speed, m/s (creature form)
  drainPerMetreOverWalk: number; // satiety lost per metre travelled above walk speed (catalogue data, not a code constant)
}

interface HungerStep { justHungry: boolean; freeSpeed: boolean; stopFollow: boolean; }

const MIN_MOVE_MM = 10;   // donor threshold, applied to the straight-line move
const LEASH_M = 100;      // donor AnimalStopFollowingDistance

// One update of the mount. Called on a fixed interval (dtS seconds).
function hungerSample(m: MountAnimal, form: MountForm, x: number, y: number, ownerX: number, ownerY: number, dtS: number): HungerStep {
  // Leash first, against the previous sample (donor checkAnimalInRange runs before the position store).
  let stopFollow = false;
  if (m.following) {
    const dxm = (m.lastX - ownerX) / 1000;
    const dym = (m.lastY - ownerY) / 1000;
    if (dxm * dxm + dym * dym > LEASH_M * LEASH_M) { m.following = false; stopFollow = true; }
  }

  let justHungry = false;
  if (m.hasLast && m.satiety > 0) {
    const moveMm = Math.hypot(x - m.lastX, y - m.lastY);
    if (moveMm > MIN_MOVE_MM) {
      const movedM = moveMm / 1000;
      const excessM = Math.max(0, movedM - form.walkMs * dtS); // only distance above walk speed costs food
      m.satiety = Math.max(0, m.satiety - excessM * form.drainPerMetreOverWalk);
      if (m.satiety === 0) justHungry = true;
    }
  }

  m.lastX = x; m.lastY = y; m.hasLast = true;
  return { justHungry, freeSpeed: m.satiety > 0, stopFollow };
}

// Feeding while hungry: each food unit adds calories until full. Returns how many units to remove from the stack.
function feed(m: MountAnimal, caloriesPerUnit: number, unitsAvailable: number): number {
  let used = 0;
  while (used < unitsAvailable && m.satiety < m.maxSatiety) {
    m.satiety = Math.min(m.maxSatiety, m.satiety + caloriesPerUnit);
    used++;
  }
  return used;
}
export {}
