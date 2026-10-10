// Licence: BSD-2-Clause (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export const TICKS_PER_SECOND = 50;     // engine constant (donor input.cpp:5)
export const DRIP_PERIOD_TICKS = 120;   // engine constant: one drip per 120 ticks (2.4 s at 50 Hz)
export const BLEED_HP_FLOOR = 5;        // engine constant: no drip damage at or below 5 + CON
export const GIB_GRAVITY = 0.04;        // per tick (donor actgib.cpp:1069)
export const FLOOR_Z = 8;               // landing height (donor actgib.cpp:233)
export const DROP_LIMIT_Z = 128;        // removed when it falls past this (donor actgib.cpp:246)

// ---- wounds ----
export interface Wound {
  hp: number;
  maxHp: number;
  con: number;            // constitution stat
  timer: number;          // ticks of bleeding left; > 0 means bleeding
  age: number;            // ticks since the wound's owner was created
  bloodWard: boolean;     // blocks the bleed
  bossCap: number | null; // 15 for the four boss types in the donor, null otherwise
}

export interface HitRoll { heavy: boolean; inflicted: boolean; }

// Bleed from a landed hit. Per-hit roll (chance gate) is assumed done by the caller.
export function applyBleed(w: Wound, roll: HitRoll, rand: () => number): void {
  const wasBleeding = w.timer > 0;
  if ((!wasBleeding && !roll.heavy) || roll.inflicted) {
    // normal bleed, or a status-inflicted bleed with a 250-tick floor
    const normal = Math.max(480 + Math.floor(rand() * 360) - w.con * 100, 120);
    w.timer = roll.inflicted ? Math.max(w.timer, 250) : normal;
  } else if (roll.heavy) {
    if (!wasBleeding) {
      w.timer = Math.max(500 + Math.floor(rand() * 500) - w.con * 10, 250);
    } else {
      w.timer += Math.max(Math.floor(rand() * 350) - w.con * 5, 100);
    }
  }
  // else: a normal roll on a bleeding target changes nothing (no stacking)
}

// Once per tick. The timer counts down every tick; the drip runs on the age period.
// Returns damage dealt this tick. onGib is called on each drip (the donor spawns a gib there).
export function tickWound(w: Wound, rand: () => number, onGib: () => void): number {
  if (w.timer > 0) w.timer -= 1; // simplified: the donor counts down in a separate function
  w.age += 1;
  if (w.timer <= 0 || w.age % DRIP_PERIOD_TICKS !== 0) return 0;
  if (w.bloodWard) { w.timer = 0; return 0; }
  if (w.hp <= BLEED_HP_FLOOR + Math.max(0, w.con)) { w.timer = 0; return 0; } // ends the bleed at the floor
  let hurt = 1 + Math.floor(w.maxHp / 30);
  if (hurt > 1) hurt -= Math.floor(rand() * Math.max(1, Math.floor(hurt / 2)));
  if (w.con > 0) hurt -= Math.floor(w.con / 5);
  if (w.bossCap !== null) hurt = Math.min(hurt, w.bossCap);
  hurt = Math.max(1, hurt);
  w.hp -= hurt;
  onGib();
  return hurt;
}

// ---- gibs (cosmetic, client side in the donor) ----
export interface Gib { x: number; y: number; z: number; vx: number; vy: number; vz: number; landed: boolean; }

// One logic tick. solidBelow(x, y) is true when the cell under the gib has ground.
// Returns false when the gib should be removed.
export function stepGib(g: Gib, solidBelow: (x: number, y: number) => boolean): boolean {
  if (g.z === FLOOR_Z && Math.abs(g.vx) < 0.01 && Math.abs(g.vy) < 0.01) return false; // settled
  g.x += g.vx;
  g.y += g.vy;
  g.vx *= 0.95; // horizontal decay (the donor's delay-move and per-gib decay field are omitted)
  g.vy *= 0.95;
  if (g.z < FLOOR_Z || !solidBelow(g.x, g.y)) {
    g.vz += GIB_GRAVITY;
    g.z += g.vz;
  } else {
    g.vz = 0;
    g.z = FLOOR_Z;
    g.landed = true;
  }
  return g.z <= DROP_LIMIT_Z;
}
