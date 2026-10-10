// Licence: GPL-3.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Threat {
  threatRange: number;     // engage radius in tiles
  threatRangeFar: number;  // disengage radius (donor default: 2x threatRange)
  fleeRange: number;       // flee radius (donor default: threatRange / 2)
  meleeRange: number;      // attack distance in tiles (donor default 1)
  chancePursue: number;    // percent per tick, stance -> move, beyond melee range
  chanceFlee: number;      // percent per tick, start and continue a flee
  losCooldown: number;     // seconds without line of sight before leaving combat
  fleeCooldown: number;    // seconds before a new flee may start
  fleeDuration: number;    // minimum seconds of a flee
}

export interface Foe {
  dist: number;   // tiles from the creature
  los: boolean;   // line of sight, only meaningful inside threatRange
  alive: boolean;
}

export interface AiState {
  inCombat: boolean;
  stance: boolean;      // true = standing, false = moving
  fleeing: boolean;
  losTimer: number;     // seconds since last line of sight
  fleeTimer: number;    // seconds left of the minimum flee
  fleeCooldown: number; // seconds left before the next flee
}

// Engage distance shrinks with the hero's stealth percent (0 to 100).
export function engageRange(t: Threat, heroStealthPct: number): number {
  const s = Math.min(100, Math.max(0, heroStealthPct)); // sketch adds the lower clamp
  return (t.threatRange * (100 - s)) / 100;
}

// Join and leave combat. Called once per tick with dt in seconds.
export function updateCombat(st: AiState, t: Threat, foe: Foe, heroStealthPct: number, dt: number): void {
  const los = foe.alive && foe.dist < t.threatRange && foe.los;
  st.losTimer = los ? 0 : st.losTimer + dt;
  st.fleeTimer = Math.max(0, st.fleeTimer - dt);
  st.fleeCooldown = Math.max(0, st.fleeCooldown - dt);

  if (!st.inCombat) {
    if (los && foe.dist < engageRange(t, heroStealthPct)) st.inCombat = true;
    return;
  }
  if (!foe.alive || foe.dist > t.threatRangeFar || st.losTimer >= t.losCooldown) {
    st.inCombat = false;
    st.fleeing = false;
  }
}

// Start a flee: standing, in combat, inside flee range but not in melee, roll passes, cooldown done.
export function maybeStartFlee(st: AiState, t: Threat, foe: Foe, rand: () => number): void {
  if (!st.inCombat || !st.stance || st.fleeing) return;
  if (foe.dist < t.fleeRange && foe.dist >= t.meleeRange && rand() * 100 < t.chanceFlee && st.fleeCooldown <= 0) {
    st.fleeing = true;
    st.fleeTimer = t.fleeDuration;
  }
}

// Keep fleeing past the minimum duration only while the per-tick roll passes; otherwise stand and start the cooldown.
export function checkStopFlee(st: AiState, t: Threat, rand: () => number): void {
  if (!st.fleeing || st.fleeTimer > 0) return;
  if (rand() * 100 < t.chanceFlee) return;
  st.fleeing = false;
  st.stance = true;
  st.fleeCooldown = t.fleeCooldown;
}

// Movement decision for the tick: hold, move toward the foe, or attack (in melee with line of sight).
export function movement(st: AiState, t: Threat, foe: Foe, rand: () => number): "hold" | "move" | "attack" {
  if (!st.inCombat) return "hold";
  if (st.stance) {
    // fleeing always moves (donor 631 'fleeing ||' clause)
    if (st.fleeing) {
      st.stance = false;
      return "move";
    }
    // a flee-capable creature holds position beyond flee range (donor 625)
    if (foe.dist >= t.fleeRange && t.chanceFlee > 0) return "hold";
    const pursue = foe.dist > t.meleeRange && rand() * 100 < t.chancePursue;
    const reposition = foe.dist <= t.meleeRange && !foe.los;
    if (pursue || reposition) {
      st.stance = false;
      return "move";
    }
    return foe.dist <= t.meleeRange && foe.los ? "attack" : "hold";
  }
  // already moving: stop only in melee with line of sight, not while fleeing
  if (foe.dist < t.meleeRange && !st.fleeing && foe.los) {
    st.stance = true;
    return "attack";
  }
  return "move";
}
export {};
