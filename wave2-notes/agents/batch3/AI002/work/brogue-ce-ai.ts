// Licence: AGPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Rng = () => number;
type State = "sleeping" | "wandering" | "tracking" | "fleeing" | "ally";

interface Mon {
  state: State;
  hp: number;
  maxHp: number;
  flees: boolean;      // flees near death (donor MONST_FLEES_NEAR_DEATH)
  grouped: boolean;    // has a leader or followers
  cautious: boolean;   // avoids corridors when grouped (donor MA_AVOID_CORRIDORS)
  enraged: number;     // turns left after being attacked (cautious monsters only)
  alwaysHunting?: boolean; // donor MONST_ALWAYS_HUNTING: always aware
  immobile?: boolean;      // donor MONST_IMMOBILE (turret/totem): aware iff inside awareness
}

interface World {
  clock: number;         // one clock: scent stamps and perceived distance share it
  stealthRange: number;  // cells; 14 in light in the donor
  invisible: boolean;
}

// Scent distance in double units: a straight step costs 2 per cell, a pure diagonal step costs 3.
function scentDistance(dx: number, dy: number): number {
  const ax = Math.abs(dx), ay = Math.abs(dy);
  return ax > ay ? 2 * ax + ay : ax + 2 * ay;
}

// Once per player turn: the clock advances (3, or 10 while the player is invisible).
function tickClock(w: World): void {
  w.clock += w.invisible ? 10 : 3;
}

// Cells the player can see get a stamp: clock minus distance, keeping the freshest value.
function layScent(scent: number[], cell: number, dist: number, clock: number): void {
  const v = clock - dist;
  if (v > scent[cell]) scent[cell] = v;
}

// Perceived distance to the player from a monster's cell, in double units.
// Trail age and distance are measured on the same clock; direct distance wins if in view.
function perceived(w: World, scentUnderMon: number, directDist: number | null): number {
  let p = w.clock - scentUnderMon;
  if (directDist !== null) p = Math.min(p, directDist);
  if (p < 0) p = 1000;
  return Math.min(p, 1000);
}

// Awareness is 2 x stealth range, in double units. Beyond 3 x that, a monster loses the player.
function aware(m: Mon, w: World, perc: number, inView: boolean, rng: Rng): boolean {
  const awareness = w.stealthRange * 2;
  if (m.alwaysHunting) return true;
  if (m.immobile) return perc <= awareness;
  if (perc > awareness * 3) return false;
  if (m.state === "tracking") return perc > awareness ? rng() * 100 < 97 : true; // 3% per turn to lose
  if (!inView) return false;
  if (perc <= awareness) return rng() * 100 < 25;                                  // 25% per turn to notice
  return false;
}

// Feared enemy within 3 cells starts a flee; near-death fleeing has a band: enter at 25% HP, stay to 75%.
function updateState(m: Mon, awareNow: boolean, inView: boolean, closestFeared: number): void {
  if (m.state === "ally") return;
  if (m.alwaysHunting) { m.state = "tracking"; return; }
  if (m.immobile) { m.state = awareNow ? "tracking" : "sleeping"; return; }
  if (m.state === "sleeping") { if (awareNow) m.state = "tracking"; return; }
  if (m.state === "wandering" && awareNow && inView) { m.state = "tracking"; return; }
  if (m.state === "tracking" && !awareNow) { m.state = "wandering"; return; }
  if (m.state === "tracking" && closestFeared < 3) { m.state = "fleeing"; return; }
  if (m.flees && m.hp <= Math.floor(3 * m.maxHp / 4)) {
    if (m.state === "fleeing" || m.hp <= Math.floor(m.maxHp / 4)) m.state = "fleeing";
    return;
  }
  if (m.state === "fleeing" && closestFeared >= 3) { m.state = "tracking"; return; }
  if (m.state === "fleeing" && m.flees && m.hp >= Math.floor(3 * m.maxHp / 4)) m.state = "tracking";
}

// Being attacked sets the enrage timer, only on cautious monsters (donor: only when the defender has MA_AVOID_CORRIDORS; 4 turns).
function onAttacked(m: Mon): void {
  if (m.cautious) m.enraged = 4;
}

// Grouped, cautious monster tracking the player does not step from open ground into a corridor,
// unless it is enraged and at or below half health.
function corridorBlocked(m: Mon, arcsFrom: number, arcsTo: number): boolean {
  const enragedLow = m.enraged > 0 && m.hp <= Math.floor(m.maxHp / 2);
  return m.cautious && !enragedLow && m.state === "tracking" && m.grouped
    && arcsTo >= 2 && arcsFrom < 2;
}

export {};
