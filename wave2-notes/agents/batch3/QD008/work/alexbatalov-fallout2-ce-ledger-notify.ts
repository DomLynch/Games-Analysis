// Sketch: named integer ledger whose writes can notify a per-slot watcher with (old, new) BEFORE the slot is stored.
// Clean-room shape of the Fallout 2 gameSetGlobalVar reputation notice. The dialogue node loop is in the Fallout 1 sketch.

export type Notify = (slot: number, oldValue: number, newValue: number) => void;

export class NotifyingLedger {
  private readonly slots: number[];
  private readonly watchers = new Map<number, Notify>();

  constructor(slotCount: number) {
    this.slots = new Array<number>(slotCount).fill(0);
  }

  watch(slot: number, notify: Notify): void {
    this.watchers.set(slot, notify);
  }

  get(slot: number): number {
    this.check(slot);
    return this.slots[slot];
  }

  set(slot: number, value: number): void {
    this.check(slot);
    const oldValue = this.slots[slot];
    const notify = this.watchers.get(slot);
    if (notify !== undefined && value !== oldValue) {
      notify(slot, oldValue, value); // notice reads the old value, then the store happens
    }
    this.slots[slot] = value;
  }

  private check(slot: number): void {
    if (slot < 0 || slot >= this.slots.length) {
      throw new RangeError(`ledger slot ${slot} out of range`); // fix: donor returns 0 on get, -1 on set
    }
  }
}

export const REPUTATION_SLOT = 0;

// Example wiring: the donor shows "You gained N karma." or "You lost N karma." when the reputation slot changes.
export function wireReputationNotice(ledger: NotifyingLedger, feed: (line: string) => void): void {
  ledger.watch(REPUTATION_SLOT, (_slot, oldValue, newValue) => {
    const diff = newValue - oldValue;
    feed(diff > 0 ? `You gained ${diff} karma.` : `You lost ${-diff} karma.`);
  });
}

// simplified: omits the donor's config flag read (the notice is always on here), the 80-byte message buffer,
// the sfall origin of the notice, and the save/load of the slot array. Watchers are per slot; the donor has one hard-coded case.
export {};
