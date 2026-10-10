// Licence: GPL-3.0-or-later with EA section 7 additional terms (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface EffectType {
  rate: number;          // game ticks per stage; 0 means the stage never advances
  start: number;         // first stage
  loopStart: number;     // stage to jump back to when a loop pass ends
  loopEnd: number;       // stage that ends a loop pass when more than one loop is left
  stages: number;        // total stages; the last pass ends here
  loops: number;         // loop count per type (multiplied by the instance's loop argument)
  damage: number;        // per stage advance, 8.8 fixed point: 256 = one whole point
  chainTo: EffectType | null;
}

export interface Vec2 { x: number; y: number; }

export interface Effect {
  type: EffectType;
  stage: number;
  timer: number;                   // ticks until the next stage advance
  loops: number;                   // loop passes still to play
  delay: number;                   // ticks before the first stage
  brandNew: boolean;               // skip the first logic tick after creation
  offset: Vec2;                    // offset from the object centre when attached, else world position
  centre: (() => Vec2) | null;     // object centre getter when attached
  accum: number;                   // fractional damage, 0..255
  alive: boolean;
}

export function create(type: EffectType, at: Vec2, delay: number, loopArg: number): Effect {
  const loops = Math.max(Math.max(loopArg, 1) * type.loops, 1);
  return { type, stage: 0, timer: type.rate, loops, delay, brandNew: true, offset: at, centre: null, accum: 0, alive: true };
}

// Attach: store the offset from the object's centre now; the world position follows the object from then on.
export function attach(e: Effect, centre: () => Vec2): void {
  const c = centre();
  e.offset = { x: e.offset.x - c.x, y: e.offset.y - c.y };
  e.centre = centre;
}

export function worldPos(e: Effect): Vec2 {
  if (!e.centre) return e.offset;
  const c = e.centre();
  return { x: e.offset.x + c.x, y: e.offset.y + c.y };
}

// One game tick. damage() applies whole points to the attached object and returns false if that object was destroyed.
// Returns true while the effect is alive.
export function tick(e: Effect, damage: (points: number) => boolean): boolean {
  if (!e.alive) return false;
  if (e.brandNew) { e.brandNew = false; return true; }
  if (e.delay > 0) {
    e.delay--;
    return true;                         // the start-of-effect side effects (sound, sticky attach) are omitted
  }
  if (e.type.rate === 0) return true;    // a zero rate never advances the stage
  e.timer--;
  if (e.timer > 0) return true;
  e.timer = e.type.rate;
  e.stage++;

  // damage accumulates per stage advance; a whole point is taken when the fraction passes 255
  if (e.centre && e.type.damage > 0 && e.stage < e.type.stages) {
    const acc = e.accum + e.type.damage;
    if (acc > 255) {
      if (!damage(acc >> 8)) { e.alive = false; return false; }
    }
    e.accum = acc & 0xff;
  }

  // loop or end: a pass ends at loopEnd while looping, and at the last stage on the final pass
  const lastPass = e.loops <= 1 ? e.stage >= e.type.stages : e.stage >= e.type.loopEnd - e.type.start;
  if (lastPass) {
    if (e.loops > 0) e.loops--;
    if (e.loops !== 0) {
      e.stage = e.type.loopStart;
    } else if (e.type.chainTo) {
      e.type = e.type.chainTo;           // chain: the same effect continues as the new type
      e.timer = e.type.rate;
      e.stage = e.type.start;
    } else {
      e.alive = false;
      return false;
    }
  }
  return true;
}

export {};
