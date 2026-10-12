// Licence: MIT (donor LICENSE, "MIT License"). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Shrine {
  favors: number;          // favour score for this shrine
}

const DECAY_PERCENT = 10;            // leaders lose 10% a day
const TRAINS_BY_RANK = [40, 30, 20, 10]; // boon length by rank index; ranks 4+ get 0

// Ranks a shrine within its type, highest favour first (donor: sorted by favour, descending).
function ranked(shrines: Shrine[]): Shrine[] {
  return [...shrines].sort((a, b) => b.favors - a.favors);
}

// Daily tick: the top two shrines of each type lose 10%. Ranks are taken before any decay (donor order).
function dailyDecay(shrines: Shrine[]): void {
  const top2 = ranked(shrines).slice(0, 2);
  for (const s of top2) {
    // Donor: (int)(f - f * 0.1), so the loss rounds up (ceil of 10% of f).
    const next = Math.trunc(s.favors - (s.favors * DECAY_PERCENT) / 100);
    s.favors = Math.max(0, next);
  }
}

// Boon request. Donor order: take the favour, then look up the power (a missing power leaves the favour spent).
// Fixed order: check favour > 0 under the lock, resolve the power, then spend.
function requestBoon(
  shrines: Shrine[],
  target: Shrine,
  hasBoonToken: boolean,
  classOrRaceMatch: boolean,
  powerExists: boolean,
  r8City: boolean,
): { granted: boolean; trains: number } {
  if (target.favors <= 0) return { granted: false, trains: 0 };
  if (hasBoonToken) return { granted: false, trains: 0 };
  if (!classOrRaceMatch) return { granted: false, trains: 0 };
  if (!powerExists) return { granted: false, trains: 0 };

  let rank = ranked(shrines).indexOf(target);
  // R8 towns: any non-first shrine is treated as index 1 (donor MerchantMsgHandler.java 196-198).
  if (r8City && rank !== 0) rank = 1;
  const trains = Math.max(0, TRAINS_BY_RANK[rank] ?? 0);

  target.favors -= 1; // spend one favour
  return { granted: true, trains };
}

// Cash-out: the favour total is paid out as items and reset. Persist the zero before paying (donor sets memory only).
function cashOut(
  target: Shrine,
  hasRoom: boolean,
  casWrite: (oldValue: number, newValue: number) => boolean,
): number {
  const amount = target.favors;
  if (amount <= 0) return 0;
  if (!hasRoom) return 0;
  if (!casWrite(amount, 0)) return 0;
  target.favors = 0;
  return amount; // one payout item per favour (donor: elan item count = favours)
}

export {};
