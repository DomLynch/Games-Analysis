// Licence: GPL-2.0 (donor, OpenTTD). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const MIN_F = 31;            // floor of the linear phase (of 255)
const MAX_F = 255;           // flat rate for fast deliveries
const FRAC = 16;             // fixed-point fraction used by the hyperbolic tail (1 << 4)

// Returns the multiplier on the flat rate, in units of 1/255 (so 255 = full pay).
function timeFactor(transit: number, td1: number, td2: number): number {
  const over1 = Math.max(transit - td1, 0);      // periods past the flat window
  const over2 = Math.max(over1 - td2, 0);        // periods past the medium window
  let overMax = MIN_F - MAX_F;                   // -224: distance to the tail threshold
  if (td2 > -overMax) overMax += transit - td1;          // slope-1 cargo: tail once linear hits MIN_F
  else overMax += 2 * (transit - td1) - td2;             // slope-2 cargo: tail once linear hits MIN_F

  if (overMax > 0) {
    // Hyperbolic tail: starts at MIN_F, falls toward zero, fixed point with FRAC fractional bits, at least 1/16.
    const fixed = Math.max(Math.floor((2 * MIN_F * FRAC * FRAC) / (overMax + 2 * FRAC)), 1);
    return fixed / FRAC;
  }
  // Linear phases: flat, then slope -1 for td2 periods, then slope -2, never below MIN_F.
  return Math.max(MAX_F - over1 - over2, MIN_F);
}

// Pay for one delivery: distance x pieces x payment rate x time factor, shifted down by 21 bits.
function deliveryPay(pieces: number, distance: number, transit: number, td1: number, td2: number, currentPayment: number): number {
  return Math.floor((distance * pieces * timeFactor(transit, td1, td2) * currentPayment) / 2 ** 21);
}

export {};
