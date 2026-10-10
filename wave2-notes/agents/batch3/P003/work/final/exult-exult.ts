// Licence: GPL-2.0-or-later (donor, combat.cc header). Clean-room: written from the described mechanism, not translated.
const CHUNK_TILES = 16;      // donor: c_tiles_per_chunk (exult_constants.h 31)
const DEX_TO_ATTACK = 30;    // donor: dex_to_attack (combat.cc 75)

type Mode = "weakest" | "strongest" | "nearest" | "random" | "flank" | "default";

interface Foe {
  id: string;
  strength: number;
  dist: number;               // tiles from the NPC
  attackedBy: string | null;  // who is hitting this foe, if anyone
  fleeing: boolean;
  canAct: boolean;
  attackedByAlly: boolean;
}

// Nearest: distance plus penalties (+16 if someone else already hits it, +32 if it flees or cannot act).
// Only foes closer than 4 chunks are considered.
function nearestScore(f: Foe, selfId: string): number {
  let d = f.dist;
  if (f.attackedBy !== null && f.attackedBy !== selfId) d += 16;
  if (f.fleeing || !f.canAct) d += 32;
  return d;
}

// Picks one foe from the pool and removes it (donor: find_foe erases the chosen opponent).
// Returns null when the pool is empty; the caller then rescans.
function pickFoe(pool: Foe[], mode: Mode, selfId: string, rnd: () => number): Foe | null {
  if (pool.length === 0) return null;
  let idx = -1;
  const weakest = (): number => {
    let best = -1; let bestStr = 100;
    pool.forEach((f, i) => { if (f.strength < bestStr) { bestStr = f.strength; best = i; } });
    return best;
  };
  switch (mode) {
    case "weakest":
      idx = weakest(); break;
    case "strongest": {
      let bestStr = -100;
      pool.forEach((f, i) => { if (f.strength > bestStr) { bestStr = f.strength; idx = i; } });
      break;
    }
    case "nearest": {
      let best = 4 * CHUNK_TILES;
      pool.forEach((f, i) => { const s = nearestScore(f, selfId); if (s < best) { best = s; idx = i; } });
      break;
    }
    case "random": {
      // Three draws; the last draw that is not already hit by another attacker wins; else weakest.
      for (let t = 0; t < 3; t++) {
        const i = Math.floor(rnd() * pool.length);
        const f = pool[i];
        if (f.attackedBy !== null && f.attackedBy !== selfId) continue;
        idx = i;
      }
      if (idx < 0) idx = weakest();
      break;
    }
    case "flank": {
      let best = 4 * CHUNK_TILES;
      pool.forEach((f, i) => {
        const d = f.dist + (f.attackedByAlly ? 0 : 16) + ((f.fleeing || !f.canAct) ? 32 : 0);
        if (d < best) { best = d; idx = i; }
      });
      break;
    }
    default:
      idx = 0;
  }
  if (idx < 0) return null;
  const [chosen] = pool.splice(idx, 1);
  return chosen;
}

// Strike timer: dexterity points accumulate on each approach step; a strike costs DEX_TO_ATTACK points.
class Striker {
  dexPoints = 0;
  step(dexterity: number, inRange: boolean): "wait" | "chase" | "strike" {
    if (this.dexPoints < DEX_TO_ATTACK) {
      this.dexPoints += dexterity;
      return "wait";
    }
    if (!inRange) return "chase";    // out of range: pursue; the points are not spent
    this.dexPoints -= DEX_TO_ATTACK;
    return "strike";
  }
}
export {};
