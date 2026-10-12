// Licence: NetHack General Public License (donor; copyleft, GPL family). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

const STRIDENT = 4;      // alignment at which the boon roll is trusted
const MAXVALUE = 24;     // highest sacrifice value
const LUCKMAX = 10;
const LUCKMIN = -10;

type Rng = () => number;
const rn2 = (n: number, rng: Rng): number => Math.floor(rng() * n);
const rn1 = (x: number, y: number, rng: Rng): number => rn2(x, rng) + y;
const trunc = (x: number): number => (x < 0 ? Math.ceil(x) : Math.floor(x)); // C integer division

interface Ledger {
  record: number;   // alignment record: the favour
  timeout: number;  // prayer timeout, one point per turn
  luck: number;     // -10..10
  anger: number;    // divine anger of your own god, 0 = calm
  moves: number;
}

// ALIGNLIM grows with the game clock: 10 + moves / 200.
function alignLimit(moves: number): number { return 10 + Math.floor(moves / 200); }

// Positive changes are capped at the limit; negative changes always apply.
export function adjAlign(l: Ledger, n: number): void {
  if (n < 0) { l.record += n; return; }
  l.record = Math.min(alignLimit(l.moves), l.record + n);
}

function changeLuck(l: Ledger, n: number): void {
  l.luck = Math.max(LUCKMIN, Math.min(LUCKMAX, l.luck + n));
}

// Prayer gate. Major trouble needs timeout <= 200, minor <= 100, none needs 0.
// simplified: the donor's opposite-altar case (alignment negated) is omitted; the other-altar case is kept.
export function canPray(l: Ledger, trouble: number, otherAltar: boolean): 'too-soon' | 'naughty' | 'ok' {
  const alignment = otherAltar ? Math.trunc(l.record / 2) : l.record;
  const limit = trouble > 0 ? 200 : trouble < 0 ? 100 : 0;
  if (l.timeout > limit) return 'too-soon';
  if (l.luck < 0 || l.anger > 0 || alignment < 0) return 'naughty';
  return 'ok';
}

// Boon roll: 1..(luck + 2), or (luck + 3 + shrine) on an altar, capped at 3 off the altar.
// simplified: the donor uses rnl(2) for the low-alignment branch, here it is rn2(2) (no luck adjustment).
export function boonAction(l: Ledger, onAltar: boolean, onShrine: boolean, rng: Rng): number {
  const prayerLuck = Math.max(l.luck, -1);
  let action = rn1(prayerLuck + (onAltar ? 3 + (onShrine ? 1 : 0) : 2), 1, rng);
  if (!onAltar) action = Math.min(action, 3);
  if (l.record < STRIDENT) action = (l.record > 0 || rn2(2, rng) === 0) ? 1 : 0;
  return action;
}

// How many troubles the action fixes. 1: worst major only; 2 and 3: up to 9 or 10; 4 and up: all; 5 also rolls a pat on the head.
export function troublesFixed(action: number, troubles: number): number {
  switch (Math.min(action, 5)) {
    case 0: return 0;
    case 1: return Math.min(1, troubles);
    case 2: return Math.min(9, troubles);
    case 3: return Math.min(10, troubles);
    default: return troubles;
  }
}

// Pat-on-the-head pool grows with luck: rn2((luck + 6) >> 1).
export function patPoolSize(luck: number): number { return (luck + 6) >> 1; }

// Anger ladder. Own god: 3 x anger plus a luck term. Other god: alignment / 2 plus a luck term. Clamped to 1..15.
// The timeout is set to at least timeoutRoll (rnz(300) in the donor, passed in here).
export function angerRung(l: Ledger, ownGod: boolean, rng: Rng, timeoutRoll: number): string {
  let maxanger: number;
  if (ownGod) {
    const luckTerm = (l.luck > 0 || l.record >= STRIDENT) ? -trunc(l.luck / 3) : -l.luck;
    maxanger = 3 * l.anger + luckTerm;
  } else {
    maxanger = trunc(l.record / 2) + (l.luck > 0 ? -trunc(l.luck / 3) : -l.luck);
  }
  maxanger = Math.max(1, Math.min(15, maxanger));
  const r = rn2(maxanger, rng);
  l.timeout = Math.max(l.timeout, timeoutRoll);
  if (r <= 1) return 'displeased';
  if (r <= 3) return 'lose-level';
  if (r <= 5) return 'curse';
  if (r === 6) return 'curse';   // punishment in the donor when not already punished
  if (r <= 8) return 'minion';
  return 'zap';
}

// A prayer too soon: timeout grows, luck drops 3, your own god's anger rises by one, then the anger ladder runs.
export function prayTooSoon(l: Ledger, rnzPenalty: number, rng: Rng, timeoutRoll: number): string {
  l.timeout += rnzPenalty;
  changeLuck(l, -3);
  l.anger += 1;
  return angerRung(l, true, rng, timeoutRoll);
}

// Offering on an altar of your own god. Anger first, then timeout, then luck (capped so luck never rises above the value).
export function offer(l: Ledger, value: number, chaotic: boolean): void {
  if (l.anger > 0) {
    l.anger = Math.max(0, l.anger - trunc((value * (chaotic ? 2 : 3)) / MAXVALUE));
    return;
  }
  if (l.timeout > 0) {
    l.timeout = Math.max(0, l.timeout - trunc((value * (chaotic ? 500 : 300)) / MAXVALUE));
    return;
  }
  const orig = l.luck;
  let inc = trunc((value * LUCKMAX) / (MAXVALUE * 2));
  if (orig > value) inc = 0;
  else if (orig + inc > value) inc = value - orig;
  changeLuck(l, inc);
  if (l.luck < 0) l.luck = 0;
}

// Per-kill favour: the monster's malign (set once at creation). Cross-aligned hostiles give at least 5.
export function malignFor(mal: number, coaligned: boolean, peaceful: boolean, alwaysHostile: boolean): number {
  const absMal = Math.abs(mal);
  if (alwaysHostile) return coaligned ? 0 : Math.max(5, absMal);
  if (coaligned) return peaceful ? -3 * Math.max(3, absMal) : Math.max(3, absMal);
  return absMal;
}

// Luck drifts toward its base once per period: 600 moves, 300 with the Amulet or anger.
export function luckDrift(l: Ledger, baseLuck: number, amuletOrAngry: boolean): void {
  const period = amuletOrAngry ? 300 : 600;
  if (l.luck === baseLuck || l.moves % period !== 0) return;
  l.luck += l.luck > baseLuck ? -1 : 1;
}

// Once per turn: the prayer timeout falls by one; luck drifts (base 0 here).
export function tick(l: Ledger): void {
  l.moves += 1;
  if (l.timeout > 0) l.timeout -= 1;
  luckDrift(l, 0, false);
}

// Knight's code: attacking a helpless or fleeing foe costs one alignment (a lawful knight only).
export function caitiff(l: Ledger, lawfulKnight: boolean, helplessOrFleeing: boolean): void {
  if (lawfulKnight && helplessOrFleeing) adjAlign(l, -1);
}
