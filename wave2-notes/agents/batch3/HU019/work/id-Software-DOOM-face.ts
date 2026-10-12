// Licence: DOOM Source Code License (per the st_stuff.c header). Restricted: clean-room sketch from the described mechanism, not a translation.
// clean-room
export interface FaceInput {
  health: number;            // this tick, hp
  prevHealth: number;        // health at the previous tick
  dead: boolean;
  immune: boolean;           // god mode or invulnerability (engine decides)
  hitBearing: number | null; // degrees, 0 = straight ahead, + = right; set only for a hit that got past immunity
  flashTicks: number;        // damage flash still running
  firing: boolean;           // trigger held
  gainedWeapon: boolean;     // pickup this tick
  rnd: number;               // cosmetic random 0..255, separate stream from gameplay RNG
}

export interface FaceState {
  priority: number;          // 0..9, a face only replaces a face of lower priority
  timer: number;             // ticks left on the current face
  rapidTicks: number;        // -1 = not firing
  face: string;              // frame name
}

export const MUCH_PAIN = 20;     // hp lost in one tick that counts as a big hit
export const TURN_TICKS = 35;    // 1 s at 35 ticks/s
export const OUCH_TICKS = 35;    // fixed: donor defines ST_OUCHCOUNT but uses ST_TURNCOUNT
export const GRIN_TICKS = 70;
export const LOOK_TICKS = 17;    // 35 / 2, integer division
export const RAMPAGE_DELAY = 70; // about 2 s of holding fire

export function painBand(health: number): number {
  const h = Math.min(Math.max(health, 0), 100);
  return Math.floor(((100 - h) * 5) / 101); // 0..4
}

export function stepFace(s: FaceState, i: FaceInput): FaceState {
  let { priority, timer, rapidTicks: rapid, face } = s;
  const band = painBand(i.health);
  const bigLoss = i.prevHealth - i.health > MUCH_PAIN; // fixed sign (donor reads health - old)

  if (priority < 10 && i.dead) { priority = 9; face = 'dead'; timer = 1; }
  if (priority < 9 && i.gainedWeapon) { priority = 8; timer = GRIN_TICKS; face = `grin${band}`; }
  if (priority < 8 && i.flashTicks > 0 && i.hitBearing !== null) {
    priority = 7;
    if (bigLoss) { timer = OUCH_TICKS; face = `ouch${band}`; }
    else {
      timer = TURN_TICKS;
      const b = Math.abs(i.hitBearing);
      face = b < 45 ? `rampage${band}` : i.hitBearing > 0 ? `turnR${band}` : `turnL${band}`;
    }
  }
  if (priority < 7 && i.flashTicks > 0 && i.hitBearing === null) {
    if (bigLoss) { priority = 7; timer = OUCH_TICKS; face = `ouch${band}`; }
    else { priority = 6; timer = TURN_TICKS; face = `rampage${band}`; }
  }
  if (priority < 6) {
    if (i.firing) {
      if (rapid === -1) rapid = RAMPAGE_DELAY;
      else if (--rapid === 0) { priority = 5; face = `rampage${band}`; timer = 1; rapid = 1; }
    } else {
      rapid = -1;
    }
  }
  if (priority < 5 && i.immune) { priority = 4; face = 'god'; timer = 1; }
  if (timer === 0) { priority = 0; face = `look${band}${i.rnd % 3}`; timer = LOOK_TICKS; }
  timer -= 1;
  return { priority, timer, rapidTicks: rapid, face };
}

export {};
