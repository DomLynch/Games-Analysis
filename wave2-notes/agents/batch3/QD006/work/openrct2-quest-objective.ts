// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type ObjectiveStatus = 'undecided' | 'success' | 'failure';

// One ledger field for the whole quest: undefined = running, number = recorded score, 'failed' = sentinel.
export type QuestLedger = number | 'failed' | undefined;

export interface ParkView {
  rating: number;
  guests: number;
  lowRatingDays: number; // advanced by the caller before the check runs
}

export interface QuestRules {
  kind: 'deadline' | 'streak';
  minRating: number;        // donor: 600 for the deadline kind, 700 for the streak kind
  minGuests: number;
  deadlineMonth: number;    // deadline kind: last month index of the quest
  allowEarly: boolean;      // early success allowed; a server-owned setting in multiplayer
  failAfterLowDays: number; // streak kind: donor fails on exactly 29 (==); this sketch uses >=
}

// The check. The terminal guard comes first; success is tested before failure, as in the donor.
export function checkQuest(p: ParkView, q: QuestRules, monthIndex: number, ledger: QuestLedger): ObjectiveStatus {
  if (ledger !== undefined) return 'undecided';

  const meets = p.rating >= q.minRating && p.guests >= q.minGuests;

  if (q.kind === 'deadline') {
    const atDeadline = monthIndex >= q.deadlineMonth;
    if (!atDeadline && !q.allowEarly) return 'undecided';
    if (meets) return 'success';
    return atDeadline ? 'failure' : 'undecided';
  }

  // streak kind: success is checked every time; failure after a run of low-rating days
  if (meets) return 'success';
  if (p.lowRatingDays >= q.failAfterLowDays) return 'failure';
  return 'undecided';
}

// Writes the one ledger field once and only on a terminal result. Returns the new ledger value.
export function settle(ledger: QuestLedger, status: ObjectiveStatus, score: number): QuestLedger {
  if (ledger !== undefined || status === 'undecided') return ledger;
  return status === 'success' ? score : 'failed';
}

export {};
