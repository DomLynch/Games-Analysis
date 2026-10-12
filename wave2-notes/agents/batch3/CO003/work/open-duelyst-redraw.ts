// Licence: CC0 1.0 Universal (donor LICENSE). Clean-room sketch written from the mechanism, not a translation.
// clean-room
export interface Option {
  id: number;
  baseId: string; // donor getBaseCardId(): the same card in a different copy shares a base id
}

export interface Hand {
  offers: Option[];      // what the coach currently sees, one per slot
  reserve: Option[];     // the pool a swap draws from; the top is the last element
  swapsThisWindow: number;
  pregameUsed: boolean;  // the once-per-fight opening redraw has been spent
}

export const PREGAME_MAX = 2; // donor STARTING_HAND_REPLACE_COUNT
export const WINDOW_MAX = 1;  // donor MAX_REPLACE_PER_TURN

export type Outcome = { ok: true; hand: Hand } | { ok: false; reason: string };

// pick(n) returns an index in [0, n). A seeded RNG in Frankendom; (n) => n - 1 is the donor's
// deterministic "take from the top" mode.
function swapSlots(
  h: Hand,
  slots: readonly number[],
  pick: (n: number) => number,
  avoidSameBase: boolean,
): Hand {
  const offers = [...h.offers];
  const reserve = [...h.reserve];
  for (const slot of slots) {
    const old = offers[slot];
    const candidates = reserve
      .map((_, i) => i)
      .filter((i) => !avoidSameBase || reserve[i].baseId !== old.baseId);
    // Donor: no candidate with a different base id means "default to top of the pool".
    const at =
      candidates.length > 0 ? candidates[pick(candidates.length)] : reserve.length - 1;
    const incoming = reserve[at];
    reserve.splice(at, 1);
    reserve.push(old); // the replaced option goes back into the pool
    offers[slot] = incoming;
  }
  return { ...h, offers, reserve };
}

// Opening redraw: once per fight, up to PREGAME_MAX distinct slots, no base-id rule (donor mulligan).
export function pregameRedraw(h: Hand, slots: readonly number[], pick: (n: number) => number): Outcome {
  if (h.pregameUsed) {
    return { ok: false, reason: 'opening redraw already used' };
  }
  if (slots.length > PREGAME_MAX) {
    return { ok: false, reason: `at most ${PREGAME_MAX} slots` };
  }
  if (new Set(slots).size !== slots.length) {
    // The donor's validator counts the slots but does not reject repeats. This is the fix.
    return { ok: false, reason: 'duplicate slot' };
  }
  if (h.reserve.length < slots.length) {
    return { ok: false, reason: 'not enough options in the pool' };
  }
  return { ok: true, hand: { ...swapSlots(h, slots, pick, false), pregameUsed: true } };
}

// Mid-fight swap: WINDOW_MAX per window, never from an empty pool, and never to the same base id
// when another option exists (donor ReplaceCardFromHandAction).
export function windowSwap(h: Hand, slot: number, pick: (n: number) => number): Outcome {
  if (h.swapsThisWindow >= WINDOW_MAX) {
    return { ok: false, reason: 'out of swaps this window' };
  }
  if (h.reserve.length === 0) {
    return { ok: false, reason: 'pool empty' };
  }
  return { ok: true, hand: { ...swapSlots(h, [slot], pick, true), swapsThisWindow: h.swapsThisWindow + 1 } };
}

// Called when the coach's own window opens (donor: the counter resets at the owner's end of turn).
export function openWindow(h: Hand): Hand {
  return { ...h, swapsThisWindow: 0 };
}

export {};
