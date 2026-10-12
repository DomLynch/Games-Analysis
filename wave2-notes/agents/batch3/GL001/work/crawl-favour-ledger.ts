// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

const MAX_FAVOUR = 200;               // favour cap (donor MAX_PIETY)
const MAX_PENANCE = 200;              // anger cap (donor MAX_PENANCE)
const STAR_STEPS = [30, 50, 75, 100, 120, 160]; // favour needed for stars 1..6
const TAPER_FROM = 100;               // from here on some gains are swallowed
const TAPER_CHANCE = 2 / 5;           // one roll per point above TAPER_FROM
const WRATH_ROLL_DIVISOR = 20;        // one angry patron: 1 in 20 per turn

type Rng = () => number;

interface Patron {
  worships: boolean;
  favour: number;       // 0..MAX_FAVOUR
  penance: number;      // 0..MAX_PENANCE, paid down by gains before favour counts
  giftTimeout: number;  // favour points to wait before the next gift roll
  wrathXp: number;      // XP left before the next queued retribution
  wrathQueued: number;  // retributions waiting to fire
}

export function stars(favour: number): number {
  let s = 0;
  for (let i = 0; i < STAR_STEPS.length; i++) if (favour >= STAR_STEPS[i]) s = i + 1;
  return s;
}

function chance(p: number, rng: Rng): boolean { return rng() < p; }

// Round n/d to a whole number; the remainder rounds up with probability remainder/d.
function randRound(n: number, d: number, rng: Rng): number {
  return Math.floor(n / d) + (chance((n % d) / d, rng) ? 1 : 0);
}

// One favour point. Order: penance first, then gift timeout, then the taper, then +1.
// simplified: the donor's taper stacks two rolls above 160 (about 64 percent swallow); this sketch uses one 40 percent roll from 100 up. Faith scaling and the Vehumet slow-down are omitted.
function gainPoint(p: Patron, rng: Rng, giftRoll: () => void): void {
  if (p.penance > 0) { p.penance -= 1; return; }
  if (p.giftTimeout > 0) p.giftTimeout -= 1;
  if (p.favour >= MAX_FAVOUR) { giftRoll(); return; }
  if (p.favour >= TAPER_FROM && chance(TAPER_CHANCE, rng)) { giftRoll(); return; }
  p.favour += 1;
  giftRoll();
}

export function gainFavour(p: Patron, amount: number, denom: number, rng: Rng, giftRoll: () => void = () => {}): void {
  if (amount <= 0 || !p.worships) return;
  const points = randRound(amount, Math.max(1, denom), rng);
  for (let i = 0; i < points; i++) gainPoint(p, rng, giftRoll);
}

// Kill favour: 90/100 at equal level; a monster far below you gives nothing (numerator goes negative and is clamped).
export function killFavour(p: Patron, monsterLevel: number, playerLevel: number, rng: Rng): void {
  let num = 90;
  let den = 100;
  if (monsterLevel > 0) {
    const extra = 36 + 2 * monsterLevel - playerLevel;
    den *= extra;
    num *= extra - 12;
  }
  gainFavour(p, Math.max(0, num), Math.max(1, den), rng);
}

export function isAngry(p: Patron): boolean { return p.worships && p.penance > 0; }

export function addPenance(p: Patron, v: number, timeoutXp: number): void {
  if (!p.worships || v <= 0) return;
  p.penance = Math.min(MAX_PENANCE, p.penance + v);
  if (p.wrathXp <= 0) p.wrathXp += Math.max(1, timeoutXp);
}

export function excommunicate(p: Patron): void {
  p.worships = false;
  p.favour = 0;
  p.wrathXp = 0;
  p.wrathQueued = 0;
}

// Returns true when the loss empties favour and the patron drops you.
export function loseFavour(p: Patron, amount: number): boolean {
  if (amount <= 0 || !p.worships) return false;
  p.favour = Math.max(0, p.favour - amount);
  if (p.favour < 1) { excommunicate(p); return true; }
  return false;
}

// A misdeed: favour lost (scaled by level) and penance added, in that order. Penance only lands if still worshipping.
export function misdeed(p: Patron, pietyFactor: number, penanceFactor: number, penanceOffset: number, level: number, timeoutXp: number): void {
  const gone = loseFavour(p, Math.max(0, pietyFactor * level));
  if (!gone) addPenance(p, Math.max(0, penanceFactor * level + penanceOffset), timeoutXp);
}

// XP tick: one pooled XP amount per tick. Only counts while angry.
export function onXp(p: Patron, xp: number, timeoutXp: number): void {
  if (!isAngry(p)) return;
  p.wrathXp -= xp;
  while (p.wrathXp < 0) {
    p.wrathQueued += 1;
    p.wrathXp += Math.max(1, timeoutXp);
  }
}

// Per-turn tick: a queued retribution fires with chance angryCount/20 (one patron here), then the queue shrinks either way.
export function onTurn(p: Patron, rng: Rng, retribution: () => void): void {
  if (p.wrathQueued <= 0) return;
  if (isAngry(p) && chance(1 / WRATH_ROLL_DIVISOR, rng)) {
    retribution();
    p.penance = Math.max(0, p.penance - (1 + Math.floor(rng() * 3))); // 1..3 off penance
  }
  p.wrathQueued -= 1;
}

// Tiered powers: rank -1 works under penance; rank 0 always (when not under penance); 1..6 by stars; 7 is a capstone flag.
export interface PowerRow { id: string; rank: number; }

export function powerUsable(p: Patron, row: PowerRow, capstoneReady: boolean): boolean {
  if (!p.worships) return false;
  if (row.rank === -1) return true;
  if (p.penance > 0) return false;
  if (row.rank <= 0) return true;
  if (row.rank === 7) return capstoneReady;
  return stars(p.favour) >= row.rank;
}

// Switching between good patrons carries favour over, minus the first star step, halved.
export function switchCarry(savedFavour: number): { amount: number; denom: number } {
  return savedFavour > STAR_STEPS[0] ? { amount: savedFavour - STAR_STEPS[0], denom: 2 } : { amount: 0, denom: 1 };
}
