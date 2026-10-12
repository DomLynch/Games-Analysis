// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Intel = 0 | 1 | 2; // 0 brainless, 1 animal, 2 human (donor I_BRAINLESS, I_ANIMAL, I_HUMAN)
type Beh = "wander" | "seek" | "flee" | "cornered" | "retreat";
type Rng = () => number;

interface Mon {
  intel: Intel;
  hd: number;
  beh: Beh;
  foeMemory: number;     // game-time units left to chase a foe that is out of view
  unreachable: boolean;  // the last path search failed
  blockedAt: number;     // cell index recorded when cornered
  pos: number;           // current cell index
}

const PERC_INTEL = [15, 20, 30];            // perception multiplier by intel tier (out of 20)
const MEMORY: [number, number][] = [[100, 300], [250, 550], [450, 1000]];
const TRACK_RANGE = [3, 8, 11];             // path search cut-off by intel tier

const chance = (x: number, y: number, rng: Rng): boolean => rng() * y < x; // true with odds x in y
const between = (lo: number, hi: number, rng: Rng): number => lo + Math.floor(rng() * (hi - lo + 1));

// Chance that a monster notices the player: perception against player stealth.
function perception(m: Mon, awake: boolean): number {
  const mult = PERC_INTEL[m.intel] + (awake ? 15 : 0);
  const perc = Math.floor((5 + Math.floor(m.hd * 3 / 2)) * mult / 20);
  return Math.max(12, perc);
}
function noticesPlayer(m: Mon, awake: boolean, stealth: number, rng: Rng): boolean {
  return chance(perception(m, awake), stealth, rng);
}

// A foe is in view: chase it and refresh the memory window.
function sawFoe(m: Mon, rng: Rng): void {
  m.beh = "seek";
  m.foeMemory = between(MEMORY[m.intel][0], MEMORY[m.intel][1], rng);
}

// Once per monster move: memory runs down by the game time that passed.
function decayMemory(m: Mon, elapsed: number): void {
  if (m.foeMemory > 0) m.foeMemory -= elapsed;
}

// Foe out of view. At the last known cell a stealth roll decides whether the trail is kept.
function outOfView(m: Mon, atLastKnown: boolean, stealth: number, rng: Rng, godPenance = false): "chase" | "wander" {
  if (m.foeMemory <= 0) { m.beh = "wander"; return "wander"; }
  // Donor also keeps the trail on a coin flip when the player is under a god's penance (mon-behv.cc 672-674).
  const keepsTrail = chance(50, stealth, rng) || (godPenance && rng() < 0.5);
  if (atLastKnown && !keepsTrail) { m.foeMemory = 0; m.beh = "wander"; return "wander"; }
  return "chase";
}

// The move away from the foe failed this turn (fleeing monster blocked).
function blocked(m: Mon): void {
  if (m.beh === "cornered") { m.beh = "seek"; return; }      // blocked twice in a row: turn and fight
  if (m.beh === "flee") { m.beh = "cornered"; m.blockedAt = m.pos; return; } // first block: pause one turn
  // A RETREAT monster ignores the event: the donor only reacts when the monster is fleeing or cornered (mon-behv.cc 1353-1356).
}

// Next turn: a cornered monster that has moved resumes fleeing.
function cornerTick(m: Mon): void {
  if (m.beh === "cornered" && m.pos !== m.blockedAt) m.beh = "flee";
}

// Path search gate: beyond tracking range never search; when unreachable, search 1 turn in 12.
function mayRepath(m: Mon, dist: number, rng: Rng): boolean {
  if (dist > TRACK_RANGE[m.intel]) { m.unreachable = true; return false; }
  if (m.unreachable && !chance(1, 12, rng)) return false;
  return true;
}

// Hit or annoyed by its foe: a smart monster that cannot reach the foe backs off.
function onAttacked(m: Mon): void {
  if (m.unreachable && m.intel > 0) m.beh = "retreat";
  else if (m.beh !== "flee" && m.beh !== "cornered") m.beh = "seek";
}

export {};
