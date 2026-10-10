// Licence: GPL-3.0-or-later (donor). Clean-room sketch written from the described mechanism; not a translation of the donor lines.
export type Rng = (n: number) => number; // integer in [0, n)

export const ATTACK_NORMAL = 0;          // normal attacks skip defence, vitality and wounds
export const WOUND_MASKS = [0x20, 0x10, 0x08, 0x04]; // indexed by probability step (donor table)

export interface Champion {
  vitality: number;        // current stat
  health: number;
  wounds: number;          // bit mask of wounds already applied
  pendingDamage: number;   // summed over the pass
  pendingWounds: number;   // bit mask collected over the pass
}

// Creature swing value after the dodge gate (shape of GroupMan::getChampionDamage).
export function creatureSwing(creatureAttack: number, difficulty: number, parry: number, rng: Rng): number {
  let attack = rng(16) + creatureAttack + difficulty * 2 - parry * 2;
  if (attack <= 1) {
    if (rng(2)) return 0;
    attack = rng(4) + 2;
  }
  attack = attack >> 1;
  attack += rng(attack) + rng(4);
  attack += rng(attack);
  attack = attack >> 2;
  attack += rng(4) + 1;
  if (rng(2)) attack -= rng((attack >> 1) + 1) - 1;
  return attack;
}

// Dodge gate: a sleeping party always takes the swing; otherwise it lands if the
// dexterity roll fails or a 1-in-4 roll fires, unless the champion dodges by luck.
export function swingLands(
  dexHalf: number, creatureDex: number, difficulty: number, sleeping: boolean,
  isLucky: () => boolean, rng: Rng,
): boolean {
  if (sleeping) return true;
  const beatsDex = dexHalf < rng(32) + creatureDex + difficulty * 2 - 16;
  return (beatsDex || rng(4) === 0) && !isLucky();
}

// Wound area: 7 in 8 draws use the creature's packed probability nibbles; the rest give a hand wound.
export function woundMask(woundTest: number, packedProbs: number): number {
  if (woundTest & 0x0070) {
    const t = woundTest & 0x000f;
    let p = packedProbs;
    let i = 0;
    while (t > (p & 0x000f) && i < 3) { p = p >> 4; i++; }
    return WOUND_MASKS[i];
  }
  return woundTest & 0x0001;
}

// Vitality-style scaling: factor = 170 - stat; very high stats give a tiny value.
export function statAdjusted(attack: number, stat: number): number {
  const factor = 170 - stat;
  if (factor < 16) return attack >> 3;
  return Math.floor((attack * factor) / 128);
}

// Pending damage for one champion (shape of addPendingDamageAndWounds_getDamage).
export function addPending(
  c: Champion, attack: number, allowedWounds: number, attackType: number, defence: number, rng: Rng,
): number {
  if (attack <= 0 || c.health <= 0) return 0;
  if (attackType !== ATTACK_NORMAL) {
    attack = Math.floor((attack * (130 - defence)) / 64);
    if (attack <= 0) return 0;
    let adjusted = statAdjusted(rng(128) + 10, c.vitality);
    if (attack > adjusted) {
      do {
        c.pendingWounds |= (1 << rng(8)) & allowedWounds;
        adjusted = adjusted << 1;
      } while (attack > adjusted && adjusted !== 0);
    }
  }
  c.pendingDamage += attack;
  return attack;
}

// Defence of one wound slot: random vitality term plus gear, minus a penalty when already wounded.
export function woundDefence(
  vitality: number, actionDefence: number, shieldDefence: number, armourDefence: number,
  wounded: boolean, rng: Rng,
): number {
  let d = rng((vitality >> 3) + 1) + actionDefence + shieldDefence + armourDefence;
  if (wounded) d -= 8 + rng(4);
  return Math.min(Math.max(d >> 1, 0), 100);
}

// Area attack: each champion rolls attack +/- about attack/8, never below 1.
export function splashPerChampion(attack: number, rng: Rng): number {
  const m = (attack >> 3) + 1;
  return Math.max(1, attack - m + rng(2 * m));
}

// End-of-pass apply: wounds are kept first, then health drops; zero or less is a kill,
// otherwise a hide-damage event is due five ticks later.
export function applyPass(c: Champion, now: number): { killed: boolean; hideAt: number | null } {
  c.wounds |= c.pendingWounds;
  const dmg = c.pendingDamage;
  c.pendingWounds = 0;
  c.pendingDamage = 0;
  if (!dmg || c.health <= 0) return { killed: false, hideAt: null };
  c.health -= dmg;
  if (c.health <= 0) return { killed: true, hideAt: null };
  return { killed: false, hideAt: now + 5 };
}

export {};
