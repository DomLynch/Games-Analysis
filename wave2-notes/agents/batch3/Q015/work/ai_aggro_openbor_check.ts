// Licence: BSD-3-Clause (OpenBOR LICENSE, read). Clean-room shape written from the mechanism; not a line-by-line translation.
// Times are in the donor's _time units. GAME_SPEED = 200 (donor GAME_SPEED_DEFAULT).
const GAME_SPEED = 200;
const RUN_GAP = 150;        // run when the gap to the chase point is larger than this
const BACK_OFF_GAP = 80;    // step back after an attack only if the opponent is closer than this
const BACK_OFF_STEP = 40;
const OFFSCREEN_FACTOR = 0.5;

interface Unit {
  id: number;
  x: number;
  facingRight: boolean;
  alive: boolean;
  vulnerable: boolean;      // vulnerable on its current animation frame
  intangible: boolean;
  attacking: boolean;
  jumping: boolean;
  blocking: boolean;
  hostileTo: (other: Unit) => boolean;
  throttle: number;         // attackthrottle, 0..1: share of attacks refused
  throttleTicks: number;    // attackthrottletime
  aggression: number;       // lowers the wait before a strike
  nextAttack: number;       // absolute tick before which no new attack is started
  stallUntil: number;       // absolute tick before which the unit holds position
}

// Target pick: nearest hostile in front. A kept pick that is non-vulnerable or intangible is replaced by any later candidate; a candidate in front and nearer replaces it too.
function pickTarget(self: Unit, units: Unit[]): Unit | null {
  let best: Unit | null = null;
  let bestD = 0;
  for (const u of units) {
    if (u === self || !u.alive || !self.hostileTo(u)) continue;
    const d = Math.abs(u.x - self.x);     // donor adds the z difference too (omitted)
    if (d <= 0 || d >= 9999) continue;
    const inFront = (self.x < u.x) === self.facingRight;
    if (best === null || !best.vulnerable || best.intangible || (inFront && d < bestD)) {
      best = u;
      bestD = d;
    }
  }
  return best;
}

// Chase point: stand range-1 away from the target on the attacker's own side.
function chaseStopX(self: Unit, target: Unit, range: number): number {
  return self.x > target.x ? target.x + range - 1 : target.x - range + 1;
}

function shouldRun(self: Unit, destX: number): boolean {
  return Math.abs(destX - self.x) > RUN_GAP;
}

// Victim side: a hit clears the victim's own attack cooldown so it can answer.
function onHit(victim: Unit): void {
  victim.nextAttack = 0;
}

// Cooldown relief, driven by what the target is doing (donor recheck_nextattack).
function relieveCooldown(self: Unit, target: Unit): void {
  if (target.blocking) self.nextAttack = 0;
  else if (target.attacking && self.nextAttack > 4) self.nextAttack -= 4;
  else if (target.jumping && self.nextAttack > 16) self.nextAttack -= 16;
}

// Attack gate. Returns true when a strike is started (the caller runs the attack).
function tryStrike(self: Unit, target: Unit, now: number, rand: () => number, offscreen: boolean): boolean {
  relieveCooldown(self, target);      // simplified: the donor calls this twice (lines 39682 and 39684)
  if (self.nextAttack > now) return false;
  if (!target.vulnerable && target.attacking) return false;   // donor also checks drop and rise

  // Normal attacks pass min == max, so the donor clamp fixes the distance and crowd terms at 1.
  let chance = 1;
  chance *= 1 - self.throttle;
  if (offscreen) chance *= 1 - OFFSCREEN_FACTOR;
  if (rand() > chance) {
    self.nextAttack = now + rand() * self.throttleTicks;
    return false;
  }
  self.stallUntil = now + Math.trunc(rand() * Math.max(1, (GAME_SPEED * 3) / 4 - self.aggression));
  return true;
}

// After an attack: usually step back toward a spacing of BACK_OFF_GAP from the opponent.
function backOffDest(self: Unit, opponent: Unit, rand: () => number): number | null {
  if (Math.abs(self.x - opponent.x) >= BACK_OFF_GAP || rand() < 0.25) return null;   // donor uses rand32() & 3
  return self.x > opponent.x
    ? Math.min(self.x + BACK_OFF_STEP, opponent.x + BACK_OFF_GAP)
    : Math.max(self.x - BACK_OFF_STEP, opponent.x - BACK_OFF_GAP);
}

export {};
