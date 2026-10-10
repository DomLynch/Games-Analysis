// Donor licence: restricted (root LICENSE: use of code or resources not permitted unless authorized). Clean-room: written from the described mechanism only, not translated.
const NONE = -1; // no event in this slot
const KEEP = -2; // keep the stored value

interface Slots {
  interactive: number;
  useItem: number;
  enter: number;
}

// One flat key-value ledger holds trigger slots, counters and flags, as in the donor's runtime data.
class Ledger {
  private kv = new Map<string, string>();
  private counts = new Map<string, number>();

  // Slots are stored as text "interactive_useItem_enter" under "evt_<scene>_<trigger>".
  getSlots(scene: number, trigger: number, defaults: Slots): Slots {
    const raw = this.kv.get(`evt_${scene}_${trigger}`);
    if (raw === undefined) return { ...defaults };
    const [i, u, e] = raw.split("_").map((s) => Number(s));
    return { interactive: i, useItem: u, enter: e };
  }

  // Absolute write: KEEP keeps the stored value, NONE clears it, anything else sets it.
  setSlots(scene: number, trigger: number, defaults: Slots, next: Partial<Slots>): Slots {
    const cur = this.getSlots(scene, trigger, defaults);
    const pick = (v: number | undefined, old: number): number =>
      v === undefined || v === KEEP ? old : v;
    const out: Slots = {
      interactive: pick(next.interactive, cur.interactive),
      useItem: pick(next.useItem, cur.useItem),
      enter: pick(next.enter, cur.enter),
    };
    this.kv.set(`evt_${scene}_${trigger}`, `${out.interactive}_${out.useItem}_${out.enter}`);
    return out;
  }

  // Relative step: a value >= 0 adds to the stored id (0 is a no-op), NONE sets none, KEEP leaves it.
  stepSlots(scene: number, trigger: number, defaults: Slots, steps: Partial<Slots>): Slots {
    const cur = this.getSlots(scene, trigger, defaults);
    const step = (v: number | undefined, old: number): number => {
      if (v === undefined || v === KEEP) return old;
      if (v === NONE) return NONE;
      return old + v;
    };
    const out: Slots = {
      interactive: step(steps.interactive, cur.interactive),
      useItem: step(steps.useItem, cur.useItem),
      enter: step(steps.enter, cur.enter),
    };
    this.kv.set(`evt_${scene}_${trigger}`, `${out.interactive}_${out.useItem}_${out.enter}`);
    return out;
  }

  // Counters are separate from slot steps, so a count never moves a pointer.
  addCount(scene: number, trigger: number, kind: number, n: number): number {
    const k = `${scene}_${trigger}_${kind}`;
    const v = (this.counts.get(k) ?? 0) + n;
    this.counts.set(k, v);
    return v;
  }

  getCount(scene: number, trigger: number, kind: number): number {
    return this.counts.get(`${scene}_${trigger}_${kind}`) ?? 0;
  }
}

export { Ledger, NONE, KEEP };
export type { Slots };
