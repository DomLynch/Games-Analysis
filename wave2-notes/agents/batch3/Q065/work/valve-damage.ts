// Licence: Valve Source 1 SDK licence (restricted). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Victim {
  health: number;            // whole health points, may go below zero
  damageAccumulator: number; // fractional damage carried between hits, 0..1 at rest
  eventsOnly: boolean;       // reacts to the hit but takes no health loss
}

// Apply one incoming hit. Fractions carry over so tiny hits are not lost.
// Returns true if the hit was registered (donor return value 1), false if no whole point was taken.
function applyHit(v: Victim, amount: number): boolean {
  if (v.eventsOnly) return true;
  const whole = Math.floor(amount);
  const fraction = amount - whole;
  v.damageAccumulator += fraction;
  let integerDamage = whole;
  if (v.damageAccumulator >= 1.0) {
    integerDamage += 1;
    v.damageAccumulator -= 1.0;
  }
  if (integerDamage <= 0) return false;
  v.health -= integerDamage;
  return true;
}

export {};
