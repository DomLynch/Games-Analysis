// Licence: AGPLv3+ (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type Outcome = 'applied' | 'dropped' | 'empty' | 'raced';

// One buffered input slot. A second input replaces the first (single premove).
export class PremoveBuffer {
  private slot: string | null = null;

  // Input given while the player cannot act yet.
  record(action: string): void {
    this.slot = action;
  }

  // Empty input, or a reload that found a different position.
  cancel(): void {
    this.slot = null;
  }

  // Called when the opponent's move has been applied. The buffered input is tried on a later tick.
  onOpponentMoved(
    getStateKey: () => string,
    isLegal: (action: string) => boolean,
    apply: (action: string) => boolean,
    schedule: (fn: () => void) => void,
    onOutcome: (o: Outcome) => void,
  ): void {
    const captured = getStateKey();
    schedule(() => {
      if (this.slot === null) return onOutcome('empty');
      if (getStateKey() !== captured) return onOutcome('raced'); // slot kept, as in the donor
      const action = this.slot;
      this.slot = null;
      // Fail closed: a legality check that throws drops the input (the donor's catch returns true).
      let legal = false;
      try {
        legal = isLegal(action);
      } catch {
        legal = false;
      }
      if (!legal || !apply(action)) return onOutcome('dropped');
      onOutcome('applied');
    });
  }
}

export {};
