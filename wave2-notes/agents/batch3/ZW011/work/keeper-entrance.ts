// Licence: GPL-2.0-or-later (donor). Clean-room sketch of the shape only, written from the described order of steps, not a translation.
const ENTRANCE_ROOMS = 3;           // donor: ENTRANCE_ROOMS_COUNT (creature_control.h)

type RoomKind = "lair" | "heart" | "bridge" | "workshop" | "garden" | "treasure" | "other";

interface RoomReq { kind: RoomKind; slabsReq: number; }

interface Model {
  entranceScore: number;            // base weight (donor default 10; zone/level data)
  rooms: RoomReq[];                 // up to ENTRANCE_ROOMS requirements
  pay: number;                      // gold needed to arrive
  owned: number;                    // owned_creatures_of_model
  pool: number;                     // creatures of this kind still in the pool
  allowed: boolean;
  forced: boolean;                  // donor: force_enabled above models_joined
}

interface Dungeon {
  slabs: Record<RoomKind, number>;  // room slab counts
  usedFrac256: Record<RoomKind, number>; // used capacity on a 0..256 scale
  turnsBetween: number;             // turns_between_entrance_generation
  lastGenTurn: number;
  active: number;                   // num_active_creatrs
  maxActive: number;                // max_creatures_attracted
  gold: number;
  lairSpace: number;                // free lair space; negative = over capacity
  rnd: (n: number) => number;       // seeded per player, returns 0..n-1
}

// Donor calculate_attractive_room_quantity: each room kind gives a count, per model, with its own formula.
function roomQuantity(d: Dungeon, kind: RoomKind, owned: number): number {
  const s = d.slabs[kind];
  const used = d.usedFrac256[kind];
  switch (kind) {
    case "lair": return Math.trunc(Math.trunc(s * (256 - used) / 256) / 2) - owned;
    case "heart": case "bridge": return Math.trunc(s / 9) - owned;
    case "workshop": case "garden": return Math.trunc(s / 4) - owned;
    case "treasure": return Math.trunc(Math.trunc(s * used / 256) / 3);
    default: return Math.trunc(s / 3) - owned;
  }
}

// Donor calculate_excess_attraction_for_creature: first room counts fully, second 1/2, third 1/3.
function excessAttraction(d: Dungeon, m: Model): number {
  let excess = 0;
  for (let i = 0; i < ENTRANCE_ROOMS; i++) {
    const r = m.rooms[i];
    if (r && r.slabsReq > 0) excess += Math.trunc(roomQuantity(d, r.kind, m.owned) / (i + 1));
  }
  return excess;
}

// Donor creature_will_generate_for_dungeon: in pool, allowed, then forced, else room space met.
function canGenerate(d: Dungeon, m: Model): boolean {
  if (m.pool <= 0 || !m.allowed) return false;
  if (m.forced) return true;
  return m.rooms.every(r => r.slabsReq <= 0 || d.slabs[r.kind] >= r.slabsReq);
}

// Donor calculate_creature_to_generate_for_dungeon: weighted pick, weight = max(1, base + excess).
function pickModel(d: Dungeon, models: Model[]): number {
  const cum: number[] = [];
  let total = 0;
  for (const m of models) {
    if (canGenerate(d, m)) total += Math.max(1, m.entranceScore + excessAttraction(d, m));
    cum.push(total);
  }
  if (total <= 0) return -1;
  const rnd = d.rnd(total);
  for (let i = 0; i < models.length; i++) {
    if (canGenerate(d, models[i]) && rnd < cum[i]) return i;
  }
  return -1;
}

// Donor generate_creature_for_dungeon: gold is only checked (no deduction in this function); lair space 0 still allows one.
function generateOne(d: Dungeon, models: Model[]): boolean {
  const i = pickModel(d, models);
  if (i < 0) return false;
  const m = models[i];
  if (m.pay > d.gold) return false;
  if (d.lairSpace < 0) return false;
  models[i].pool -= 1;              // remove_creature_from_generate_pool (donor: only after a creature was created)
  return true;
}

// Donor process_entrance_generation, per dungeon and turn.
// blocked = map creature limit or armageddon (donor: generation not due, timer NOT reset).
// The timer resets for an active keeper even when nothing is generated (donor line 403).
export function processTurn(d: Dungeon, models: Model[], turn: number, blocked: boolean, hasEntrance: boolean, activeKeeper: boolean): void {
  if (blocked) return;
  if (d.turnsBetween === -1 || turn - d.lastGenTurn < d.turnsBetween) return;
  if (!activeKeeper) return;
  if (hasEntrance && d.active < d.maxActive) generateOne(d, models);
  d.lastGenTurn = turn;
}
export {};
