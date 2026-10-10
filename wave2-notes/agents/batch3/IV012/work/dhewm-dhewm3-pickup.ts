// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Attr = { stat: string; amount: number };

// max 0 means "no room", as the donor's ammo gate does (Player.cpp:749).
interface Stat { current: number; max: number; }
interface Store { stats: Map<string, Stat>; }

// Returns false (item stays on the floor, untouched) when nothing would change.
// Attributes that are already full are skipped; the rest are applied (any-of, as in the donor).
function tryPickup(store: Store, attrs: Attr[]): boolean {
  const plan: Attr[] = [];
  for (const a of attrs) {
    const s = store.stats.get(a.stat);
    if (!s) return false;               // unknown stat: refuse the whole item (donor skips only that attribute)
    if (s.current >= s.max) continue;   // full: this attribute adds nothing
    plan.push(a);
  }
  if (plan.length === 0) return false;  // nothing to gain: the item is not consumed
  for (const a of plan) {
    const s = store.stats.get(a.stat)!;
    s.current = Math.min(s.max, s.current + a.amount); // excess above max is discarded, not returned
  }
  return true;
}

// Toast pacer: at most five toasts per set, 400 ms between toasts, 2000 ms rest after a full set,
// measured from the set's first toast (the donor's intent; its anchor is never set, see section 6).
interface Pacer { queue: string[]; slot: number; setStart: number; nextAt: number; lastShown: number; }
const GAP_MS = 400;
const SET_SIZE = 5;
const REST_MS = 2000;
const IDLE_RESET_MS = 2000;

// Called once per tick. Shows at most one toast per call.
function tickToasts(p: Pacer, now: number, show: (slot: number, text: string) => void): void {
  if (p.queue.length === 0) return;
  if (now < p.nextAt) return;
  if (p.slot > 0 && now - p.lastShown > IDLE_RESET_MS) p.slot = 0; // idle: the next set starts at slot 1
  if (p.slot === 0) p.setStart = now;                              // anchor the set on its first toast
  show(p.slot + 1, p.queue.shift()!);
  p.lastShown = now;
  p.slot += 1;
  if (p.slot === SET_SIZE) {
    p.slot = 0;
    p.nextAt = p.setStart + REST_MS;
  } else {
    p.nextAt = now + GAP_MS;
  }
}

export {};
