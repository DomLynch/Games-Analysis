// Licence: GPL-2.0 (donor, repo COPYING). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const LAWFUL_MIN = -32768;
const LAWFUL_MAX = 32767;
const PINK_S = 180;            // pink-name window after a hostile act
const PINK_REFRESH_S = 90;     // a new hostile act refreshes the window only at or below this many seconds left
const WANTED_MS = 24 * 3600 * 1000;

interface Pc {
  id: string;
  level: number;
  lawful: number;
  pkCount: number;
  pinkUntil: number | null;    // ms timestamp (fixed: donor counts seconds in a loop)
  lastPkAt: number | null;     // ms timestamp of the last PK kill
  inNormalZone: boolean;
  mapDeathPenalty: boolean;    // read from the map on the donor
}

const clampLawful = (v: number): number => Math.max(LAWFUL_MIN, Math.min(LAWFUL_MAX, v));
const isPink = (p: Pc, now: number): boolean => p.pinkUntil !== null && p.pinkUntil > now;

// Hostile act on a player: the attacker goes pink. A repeat act refreshes only at or below 90 s left.
function onHostileAct(attacker: Pc, victim: Pc, now: number): void {
  if (attacker.id === victim.id) return;
  if (victim.lawful < 0 || attacker.lawful < 0) return;   // chaotic on either side: no pink (CHAO_PINK off)
  if (isPink(victim, now)) return;                        // a pink victim gets no new pink (DUAL_PINK off)
  if (!victim.inNormalZone || !attacker.inNormalZone) return;
  const active = isPink(attacker, now);
  if (!active || attacker.pinkUntil! - now <= PINK_REFRESH_S * 1000) {
    attacker.pinkUntil = now + PINK_S * 1000;
  }
}

// Death of a victim. Returns the number of inventory items the ledger says to drop.
function onDeath(victim: Pc, killer: Pc | null, rng: () => number, now: number): number {
  if (!victim.mapDeathPenalty || !killer || killer.id === victim.id) return 0;

  // Lawful-scaled drop: rate in per mille, doubled when chaotic.
  let lostRate = Math.trunc(((victim.lawful + 32768) / 1000 - 65) * 4);
  let drops = 0;
  if (lostRate < 0) {
    lostRate = -lostRate;
    if (victim.lawful < 0) lostRate *= 2;
    const roll = 1 + Math.floor(rng() * 1000);
    if (roll <= lostRate) {
      if (victim.lawful <= -30000) drops = 1 + Math.floor(rng() * 4);
      else if (victim.lawful <= -20000) drops = 1 + Math.floor(rng() * 3);
      else if (victim.lawful <= -10000) drops = 1 + Math.floor(rng() * 2);
      else drops = 1;
    }
  }

  if (victim.lawful >= 0 && !isPink(victim, now)) {
    // PK kill: count it if the killer is not very lawful, then set killer lawful to the level floor
    // or 1000 below the current value, whichever is lower.
    if (killer.lawful < 30000) killer.pkCount += 1;
    killer.lastPkAt = now;
    const levelFloor = killer.level < 50 ? -4 * killer.level ** 2 : -0.08 * killer.level ** 3;
    killer.lawful = clampLawful(Math.min(Math.trunc(levelFloor), killer.lawful - 1000));
  } else {
    victim.pinkUntil = null;   // a pink or chaotic victim is not a PK victim; the pink clears
  }
  return drops;
}

// Wanted: a PK kill in the last 24 h. Expires on read, as the donor does.
function isWanted(p: Pc, now: number): boolean {
  if (p.lastPkAt === null) return false;
  if (now - p.lastPkAt > WANTED_MS) { p.lastPkAt = null; return false; }
  return true;
}

// Karma ladder: eight levels per sign (the donor's ninth threshold is only the percent ceiling).
const KARMA_STEPS = [10000, 20000, 100000, 500000, 1500000, 3000000, 5000000, 10000000];

function karmaLevel(k: number): number {
  const mag = Math.abs(k);
  let lvl = 0;
  for (const step of KARMA_STEPS) {
    if (mag >= step) lvl++; else break;
  }
  return k < 0 ? -lvl : lvl;
}

export {};
