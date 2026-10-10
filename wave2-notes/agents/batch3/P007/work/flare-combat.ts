// Licence: GPL-3.0 (donor engine). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Rng = () => number; // returns 0..1

// Combat limits are data (engine defaults overridden per mod), all in percent.
interface Limits {
  minAbsorb: number; maxAbsorb: number;
  minResist: number; maxResist: number;
  minAvoid: number; maxAvoid: number;
  minCrit: number; maxCrit: number;     // default 200 / 200
  minOver: number; maxOver: number;     // default 100 / 100
  minMiss: number; maxMiss: number;     // default 0 / 0
}

interface Hit {
  accuracy: number;               // attacker accuracy after power modifier
  crit: number;                   // attacker crit chance, percent
  perfect: boolean;               // never misses, never overhits
  dmg: { min: number; max: number }[];  // one range per damage type
}

interface Target {
  avoidance: number;              // percent
  absorbMin: number; absorbMax: number; // percent of the hit, rolled
  resist: number[];               // per damage type; negative = weakness, not clamped
}

const chance = (rnd: Rng, pct: number) => rnd() * 100 < pct;     // donor percentChanceF
const between = (rnd: Rng, a: number, b: number) => (a === b ? a : a + rnd() * (b - a));
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

export function resolveHit(hit: Hit, t: Target, L: Limits, rnd: Rng) {
  // 1. typed damage, resisted per type before absorb
  let dmg = 0;
  hit.dmg.forEach((d, i) => {
    const raw = between(rnd, d.min, d.max);
    const r0 = t.resist[i] ?? 0;
    const r = r0 >= 0 ? clamp(r0, L.minResist, L.maxResist) : r0;
    dmg += (raw * (100 - r)) / 100;
  });

  // 2. absorb: rolled, then held inside [minAbsorb, maxAbsorb] percent of the hit; at least 1 when it rounds to 0
  if (dmg > 0) {
    let absorb = between(rnd, t.absorbMin, t.absorbMax);
    if (absorb > 0) {
      const pct = (absorb * 100) / dmg;
      if (pct < L.minAbsorb) absorb = (dmg * L.minAbsorb) / 100;
      if (pct > L.maxAbsorb) absorb = (dmg * L.maxAbsorb) / 100;
      if (absorb === 0) absorb = 1;
    }
    dmg -= absorb;
    if (dmg <= 0) {
      dmg = 0;
      if (L.maxAbsorb < 100) dmg = 1; // donor quirk: a capped absorb still lets 1 through
    }
  }

  // 3. avoidance vs accuracy. Overhit uses the raw margin BEFORE clamping; the miss roll uses the clamped value.
  const raw = 100 - (hit.accuracy - t.avoidance);
  const overhit = !hit.perfect && raw < 0 ? chance(rnd, Math.abs(raw)) : false;
  const avoid = clamp(raw, L.minAvoid, L.maxAvoid);
  const missed = !hit.perfect && chance(rnd, avoid);

  // 4. crit OR overhit (crit wins), then a miss scales what is left (miss applies on top of crit)
  const crit = chance(rnd, hit.crit);
  if (crit) dmg = (dmg * between(rnd, L.minCrit, L.maxCrit)) / 100;
  else if (overhit) dmg = (dmg * between(rnd, L.minOver, L.maxOver)) / 100;
  if (missed) dmg = (dmg * between(rnd, L.minMiss, L.maxMiss)) / 100;

  dmg = Math.round(dmg);
  return { dmg, crit, missed, overhit };
}

// Poise: a poised target takes no hit reaction. A crit always gets through.
export function isPoised(style: "chance" | "hp" | "absorb", poise: number, dmg: number, absorb: number, hpMax: number, crit: boolean, rnd: Rng): boolean {
  if (crit) return false;
  if (style === "chance") return chance(rnd, poise);
  if (style === "hp") return hpMax > 0 && (dmg / hpMax) * 100 <= poise;
  return dmg > 0 && (absorb / dmg) * 100 > poise;
}
export {};
