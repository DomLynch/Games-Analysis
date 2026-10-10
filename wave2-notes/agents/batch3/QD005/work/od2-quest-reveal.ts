// Licence: GPL-3.0 (donor). Clean-room sketch written from the described state machine, not a translation of the donor.
export const QS = {
  Completed: -2,   // done, nothing owed to the player
  Completing: -1,  // done, reveal still owed to the player
  NotStarted: 0,
} as const;
// Any value >= 1 is "in progress, step n".

export type Ledger = Map<number, number>; // quest id -> status

export const REVEAL_LENGTH = 3; // donor constant questCompleteAnimationDuration; unit of SetPlayLength not read

// Button enabled only once a quest has left NotStarted.
export function isOpenable(status: number): boolean {
  return status !== QS.NotStarted;
}

// Journal text: finished quests show one fixed line; NotStarted shows nothing; a step with no text shows nothing.
export function journalText(status: number, stepText: (step: number) => string | undefined, doneLine: string): string {
  if (status === QS.Completed || status === QS.Completing) return doneLine;
  if (status === QS.NotStarted) return "";
  return stepText(status) ?? "";
}

// Server-side transition (Frankendom addition, not in the donor): the ledger moves to Completing once.
export function completeQuest(ledger: Ledger, id: number): boolean {
  const s = ledger.get(id) ?? QS.NotStarted;
  if (s === QS.Completed || s === QS.Completing) return false;
  ledger.set(id, QS.Completing);
  return true;
}

// Client-side: the reveal finished (animation end) or the log closed; Completing becomes Completed.
export function settleReveal(ledger: Ledger, id: number): void {
  if (ledger.get(id) === QS.Completing) ledger.set(id, QS.Completed);
}

// Close: settle every quest the log showed (the donor settles only the selected tab).
export function closeLog(ledger: Ledger, shownIds: number[]): void {
  for (const id of shownIds) settleReveal(ledger, id);
}

export {};
