// Licence: AGPL-3.0 (donor). Clean-room sketch of the mechanism shape, not a translation of the donor lines.
type Rng = () => number; // returns a number in [0, 1)
type Point = { x: number; y: number };

// ---- Area director: one attempt per player position update, gated in the donor's order ----
interface Template { id: string; weight: number; cap: number; count: number; } // cap -1 = no cap
interface Area {
  players: number;          // players inside the area now
  lastSpawnMs: number;
  minIntervalMs: number;    // donor default 5000 ms (config)
  total: number;
  maxTotal: number;         // per-area cap, set from region data
  templates: Template[];
}

function tryAreaSpawn(a: Area, now: number, rng: Rng, point: () => Point | null, permitted: (p: Point) => boolean): Template | null {
  if (a.players <= 0) return null;
  if (now - a.lastSpawnMs < a.minIntervalMs) return null;
  if (a.total >= a.maxTotal) return null;

  const totalWeight = a.templates.reduce((s, t) => s + t.weight, 0);
  if (totalWeight <= 0) return null;
  let choice = Math.floor(rng() * totalWeight);
  let picked: Template | null = null;
  for (const t of a.templates) {
    if (choice < t.weight) { picked = t; break; }
    choice -= t.weight;
  }
  if (picked === null) return null;
  if (picked.cap > -1 && picked.count >= picked.cap) return null;

  const p = point();
  if (p === null || !permitted(p)) return null;

  a.lastSpawnMs = now;
  a.total += 1;
  picked.count += 1;
  return picked;
}

// ---- Dynamic lair: a fixed group that respawns until each member has used its lives ----
const LIVES_AFTER_RESPAWNS = 3;   // a mob retires on the death that follows its 3rd respawn

interface LairMob { level: number; respawns: number; alive: boolean; retired: boolean; respawnAt: number | null; }
interface Lair { mobs: LairMob[]; emptyAt: number | null; }

// Donor: trunc(spawnLimit / 3) + trunc((difficulty - 2) / 2), at least 1 (C++ int division truncates toward zero).
// `difficulty` is the donor's building level (1-5), not a mob level.
function lairSize(spawnLimit: number, difficulty: number): number {
  return Math.max(1, Math.trunc(spawnLimit / 3) + Math.trunc((difficulty - 2) / 2));
}

function onMobDeath(lair: Lair, mob: LairMob, now: number): void {
  mob.alive = false;
  if (mob.respawns > LIVES_AFTER_RESPAWNS - 1) {      // donor: respawnCounter > 2
    mob.retired = true;
    if (lair.mobs.every((m) => m.retired)) lair.emptyAt = now + 60000; // lair despawns 60 s later
    return;
  }
  mob.respawnAt = now + (60 + 2 * mob.level) * 1000; // respawn delay: 60 s plus 2 s per level
}

function tickLair(lair: Lair, now: number): void {
  for (const m of lair.mobs) {
    if (!m.alive && !m.retired && m.respawnAt !== null && now >= m.respawnAt) {
      m.alive = true;
      m.respawns += 1;
      m.respawnAt = null;
    }
  }
}

// ---- Presence grace: when the last player leaves, despawn after a timer if still empty ----
const CREATURE_GRACE_MS = 30000;
const LAIR_GRACE_MS = 300000;

// The timer fires later; it re-checks the count then. Creatures do not cancel it on re-entry; theaters do.
function graceFireTime(now: number, graceMs: number): number { return now + graceMs; }
function graceFires(players: number): boolean { return players <= 0; }
export {};
