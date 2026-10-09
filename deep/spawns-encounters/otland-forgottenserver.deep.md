# otland-forgottenserver (spawns-encounters, cell 4)

Donor: /mnt/frankendom-donors/otland-forgottenserver/src/spawn.cpp | Licence: GPL-2 per spawn.cpp header ("GPL-2.0 License ... LICENSE file"; LICENSE is the GPL-2 text) | C++ | symbol Spawn::checkSpawn / Spawn::spawnMonster (opened: XML load 55-135, findPlayer 258-271, spawnMonster block 273-310, spawnMonster single 312-342, startup 344-351, checkSpawn 353-383, cleanup 385-397, addBlock 399-405; spawn.h line 56 and configmanager.cpp line 273 by search)
Licence note: GPL-2. CLEAN-ROOM sketch only.

## 1. Mechanism

- A `Spawn` is a set of spawn blocks keyed by id (`spawnMap`). Each block has a position, a facing, a respawn interval (ms; the XML `spawntime` times 1000; a block outside 10 s to 1 day is skipped with a warning, not clamped, spawn.cpp 20-21 and 67-76) and a list of (monster type, weight) entries (default weight 100 / entry count, totals capped at 100, sorted heaviest first, 104-133). `addBlock` (399-405) lowers the spawn's own `interval` to the smallest block interval; it starts at 60000 ms (spawn.h line 56).
- `startup()` (344-351) calls the block spawn once per block in startup mode: no player-view check, and the creature is placed with `internalPlaceCreature` without sending events (320-326).
- After that, a recurring check event runs every `getInterval()` ms (the spawn's interval: the smallest block interval, at most 60 s). `checkSpawn()` (353-383) first runs `cleanup()` (385-397), which drops any spawned monster that `isRemoved()` from `spawnedMap`.
- For each block with no entry in `spawnedMap` and with `now >= lastSpawn + interval`, it calls the block spawn. A block with a live monster is skipped. A failed attempt sets that block's `lastSpawn` to now and continues; a success counts toward the cap and the loop breaks once the count reaches `RATE_SPAWN` (default 1, configmanager.cpp 273; read from the config). The check reschedules itself only while `spawnedMap` is smaller than `spawnMap` (380-382).
- The block spawn (273-310): unless in startup mode, `findPlayer(pos)` (258-271) is true if any player spectator of that point lacks the ignored-by-monsters flag (`getSpectators(..., onlyPlayers = true)`); then the block is "blocked", and only types flagged ignoring-spawn-block can spawn there.
- Type choice: a block with one entry skips the roll and spawns that type. A block with several entries walks them in order; each non-blocked type needs `weight >= normal_random(1, 100)` (a fresh roll per type; `normal_random`, tools.cpp 190-201, is a bell curve: a normal draw with mean 0.5 and sd 0.25 re-drawn until inside 0..1, scaled to the range, so rolls cluster near 50 and a weight of W is not a W% chance) and a successful placement. If that pass places nothing and not every type was blocked, a second pass spawns the first non-blocked type with no roll, so a multi-type block still spawns something unless all its types are blocked or placement fails.
- The single-monster spawn (312-342) creates the monster, runs the `onSpawn` script event (which may veto, 316), places it, sets facing, spawn link and master position, records it in `spawnedMap` and stamps `spawnMap[spawnId].lastSpawn` with wall-clock `OTSYS_TIME()` (340).
- Output: a monster at the block position with its master position and facing set; the block records `lastSpawn` for its next interval.

## 2. Key functions

| Name | Path | Lines | What it does |
|---|---|---|---|
| Spawn::checkSpawn | /mnt/frankendom-donors/otland-forgottenserver/src/spawn.cpp | 353-383 | Cleans up, walks blocks, spawns up to the rate cap, reschedules |
| Spawn::spawnMonster (block) | /mnt/frankendom-donors/otland-forgottenserver/src/spawn.cpp | 273-310 | Applies the blocking rule, a weighted per-type roll, then a no-roll fallback pass |
| Spawn::spawnMonster (single) | /mnt/frankendom-donors/otland-forgottenserver/src/spawn.cpp | 312-342 | Creates the monster (onSpawn hook may veto), places it, links it to the spawn, stamps lastSpawn |
| Spawn::findPlayer | /mnt/frankendom-donors/otland-forgottenserver/src/spawn.cpp | 258-271 | True if a player who is not ignored is in view of the point |
| Spawn::cleanup | /mnt/frankendom-donors/otland-forgottenserver/src/spawn.cpp | 385-397 | Removes monsters that were removed from the map from the spawned set |
| Spawn::startup | /mnt/frankendom-donors/otland-forgottenserver/src/spawn.cpp | 344-351 | Initial placement of every block, skipping the blocking check |

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Per-slot respawn: one live entity per slot, a cooldown after each attempt | Group interval default 60000 ms (theirs, spawn.h 56); smallest block interval wins (spawn.cpp 401); block interval bounds 10 s to 1 day (theirs, spawn.cpp 20-21) |
| Block a respawn while a player is in view; allow exceptions by flag | Ignored-by-monsters player flag; ignore-block monster flag (theirs) |
| Weighted type roll per slot: heaviest type first, first hit wins | Weights 1..100 against a bell-curve roll of 1..100 (theirs, line 289; tools.cpp 190-201), default weight 100 / entry count (line 104), plus an unrolled fallback pass (line 309) |
| Global cap on spawns per check | RATE_SPAWN default 1 (theirs, configmanager.cpp 273) |

## 4. TypeScript sketch

Licence: GPL-2. CLEAN-ROOM sketch: written from the mechanism above, not translated from the donor.

simplified: the startup mode (no view check), the `onSpawn` veto, facing and master position, reference counting, the scheduler (the caller calls `checkSlots` on the spawn's interval and stops when every slot is alive), the spawn-wide interval (smallest block interval) and the interval bounds and the heaviest-first sort are omitted; `rollPct` stands for the donor's bell-curve roll, so a host that returns a uniform roll gives a different hit chance; `place` hides the placement failing; the blocked-type skip is a filter instead of the donor's counter.

```ts
// clean-room sketch of a slot-based respawn with view blocking and weighted types.
// Licence line: GPL-2 donor; this sketch is clean-room, written from mechanism only.
interface TypeWeight { type: string; weightPct: number; ignoresBlock: boolean; }
interface Slot { pos: { x: number; y: number }; intervalMs: number; lastSpawnMs: number; types: TypeWeight[]; alive?: string; }
interface Host {
  now(): number;
  playerInView(pos: { x: number; y: number }): boolean;
  place(type: string, pos: { x: number; y: number }): boolean;
  isAlive(id: string): boolean;
  rollPct(): number; // 1..100 (donor: bell curve, not uniform)
}
function trySpawnSlot(slot: Slot, slotId: string, h: Host): boolean {
  const blocked = h.playerInView(slot.pos);
  const usable = slot.types.filter((t) => !blocked || t.ignoresBlock);
  if (usable.length === 0) return false;
  const attempt = (roll: boolean): boolean => {
    for (const t of usable) {
      if (!roll) return h.place(t.type, slot.pos);            // first usable type, no roll
      if (t.weightPct >= h.rollPct() && h.place(t.type, slot.pos)) return true;
    }
    return false;
  };
  // One entry: no roll. Several: roll per type in order, then fall back to the first usable type.
  if (!(attempt(slot.types.length > 1) || attempt(false))) return false;
  slot.alive = slotId;
  slot.lastSpawnMs = h.now();
  return true;
}
function checkSlots(slots: Map<string, Slot>, h: Host, rateCap: number): number {
  for (const s of slots.values()) {
    if (s.alive && !h.isAlive(s.alive)) s.alive = undefined;
  }
  let spawned = 0;
  for (const [id, s] of slots) {
    if (s.alive) continue;
    if (h.now() < s.lastSpawnMs + s.intervalMs) continue;
    if (!trySpawnSlot(s, id, h)) {
      s.lastSpawnMs = h.now(); // failed attempt waits a full interval
      continue;
    }
    if (++spawned >= rateCap) break;
  }
  return spawned;
}
```

## 5. Lands in

- TARGET origins/server/world-spawns.ts (the server already holds one alive / respawn state per spawn instance, with a per-row `respawnSeconds` window and a presence pose for reach checks). The donor's one-live-per-slot rule and cooldown are therefore already there; what is genuinely new is (1) the "no respawn while a player can see the point" block with an exception flag per row, and (2) a weighted list of types per slot. Both are zone / row data, so (2) belongs with origins/mobs/row.ts and populate.ts `pickRow`, which weight whole camps, not per-slot types. Not src/fight/ai.ts: a respawn timer is not the brain.
- Parity-checklist row: 4 (fight loop: what is alive near the player); feature map: zones as data.
Reuse tag: adapt
Brief rule served: 4 (zones are data on one runtime); rules 7-9 n/a

## 6. Gaps and risks

- Server-verified kills: the donor's clock is wall-clock `OTSYS_TIME()` and its weighted roll uses an unseeded `normal_random` (a bell curve, not a uniform draw). Frankendom's respawn must run on the server (origins/server/world-spawns.ts) with the seeded stream for the type roll, so replay and verification agree.
- Zones as data: the 60 s default, the 1..100 weights, the 10 s / 1 day bounds and RATE_SPAWN are constants / config in the donor. In Frankendom they are row and zone fields (`respawnSeconds`, weights), not literals (no hidden numbers).
- One ledger: a respawn must not reopen a paid kill; the paid window is the per-account window in origins/server/mob-rewards.ts, not the slot's `lastSpawn`.
- The view-block rule needs player presence on the server; origins/server/world-spawns.ts has presence's pose, but no view test exists. Without a zone-geometry rule it cannot be copied.
- MAX_ATTACKERS = 3: slots alive near a player say nothing about how many are engaged; at most 3 engaged on one player (src/fight/world.ts).
- A failed attempt resets the full interval and a multi-type block always falls back to its first usable type; Frankendom must decide whether either rule is wanted.
