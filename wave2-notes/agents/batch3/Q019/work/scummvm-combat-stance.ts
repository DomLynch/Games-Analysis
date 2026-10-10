// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type Stance = 'idle' | 'cover' | 'approach' | 'attack' | 'flee';
export type Speed = 'still' | 'moving' | 'running';

export interface Fighter {
  hp: number;          // 0..100
  aggression: number;  // 0..100, default 50
  inCombat: boolean;
  speed: Speed;
  distance: number;    // game units
  angleToOther: number; // this fighter's angle to the other fighter, engine units (scale not verified)
  retired: boolean;
}

export interface StanceRules {
  ranged: boolean;
  reach: number;               // close-attack reach, 36 in the donor
  coverAvailableNow: boolean;  // a cover point exists this tick
  hasFlee: boolean;            // flee points exist for this set
  fixedAttack?: number;        // script constant; undefined means compute
  fixedCover?: number;
  fixedFlee?: number;
}

export function closeAttackRatio(self: Fighter, enemy: Fighter): number {
  const distanceFactor = 2 * (50 - Math.min(self.distance / 12, 50));
  const angleFactor = (100 * Math.abs(enemy.angleToOther)) / 512;
  const combatFactor = enemy.inCombat ? 0 : 100;
  return distanceFactor * 0.20 + angleFactor * 0.10 + combatFactor * 0.10
    + (100 - enemy.hp) * 0.15 + self.hp * 0.15 + self.aggression * 0.30;
}

export function rangedAttackRatio(self: Fighter, enemy: Fighter): number {
  const angleFactor = (100 * Math.abs(enemy.angleToOther)) / 512;
  const combatFactor = enemy.inCombat ? 0 : 100;
  return angleFactor * 0.25 + combatFactor * 0.05 + (100 - enemy.hp) * 0.20
    + self.hp * 0.10 + self.aggression * 0.40;
}

export function coverRatio(self: Fighter, enemy: Fighter, ranged: boolean): number {
  const angleFactor = 100 - (100 * Math.abs(enemy.angleToOther)) / 512;
  if (ranged) {
    return angleFactor * 0.40 + enemy.hp * 0.05 + (100 - self.hp) * 0.15 + (100 - self.aggression) * 0.50;
  }
  const distanceFactor = 2 * Math.min(self.distance / 12, 50);
  return distanceFactor * 0.25 + angleFactor * 0.20 + enemy.hp * 0.05
    + (100 - self.hp) * 0.10 + (100 - self.aggression) * 0.50;
}

export function fleeRatio(self: Fighter, enemy: Fighter): number {
  const combatFactor = enemy.inCombat ? 100 : 0;
  return combatFactor * 0.2 + (100 - self.hp) * 0.4 + (100 - self.aggression) * 0.4;
}

export function chooseStance(self: Fighter, enemy: Fighter, r: StanceRules): Stance {
  const attack = r.fixedAttack ?? (r.ranged ? rangedAttackRatio(self, enemy) : closeAttackRatio(self, enemy));
  const cover = r.coverAvailableNow ? (r.fixedCover ?? coverRatio(self, enemy, r.ranged)) : 0;
  const flee = r.hasFlee ? (r.fixedFlee ?? fleeRatio(self, enemy)) : 0;

  let s: Stance;
  if (attack < flee || attack < cover) {
    s = cover >= flee && cover >= attack ? 'cover' : 'flee';
  } else if (r.ranged) {
    s = self.distance > r.reach ? 'approach' : 'attack';
  } else {
    s = self.distance > r.reach ? 'approach' : 'attack';
  }
  if (enemy.retired) s = 'idle';
  return s;
}

// Hit chance in percent. Returns 0 when the attack cannot land.
export function closeHitChance(self: Fighter, enemy: Fighter, reach: number): number {
  if (self.distance > reach) return 0;
  const base = enemy.speed === 'running' ? 11 : enemy.speed === 'moving' ? 22 : 33;
  const aggressiveness = base + Math.trunc(self.aggression / 3);
  const a = Math.abs(self.angleToOther);
  if (a > 128) return 0;
  return Math.trunc(aggressiveness + Math.abs(a - 128) / 3.7);
}

// roll is 1..100. A hit needs roll <= chance. Damage scales with the margin (capped at 30 points).
export function resolveHit(roll: number, chance: number, weaponDamage: number): { hit: boolean; damage: number } {
  if (chance === 0 || roll > chance) return { hit: false, damage: 0 };
  const margin = Math.min(chance - roll, 30);
  const damage = Math.trunc(((margin * 100 / 60) + 50) * weaponDamage / 100);
  return { hit: true, damage };
}

export function applyDamage(enemy: Fighter, damage: number): void {
  enemy.hp = Math.max(enemy.hp - damage, 0);
}

export {};
