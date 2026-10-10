# azerothcore-azerothcore-wotlk (spawns-encounters, cell 4)

Donor: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Maps/Map.cpp` | Licence: GPL-2.0-or-later (Map.cpp and Creature.cpp headers: "version 2 of the License, or (at your option) any later version"; repo LICENSE is the GPL v2 text) | C++ | symbols `Map::ApplyDynamicModeRespawnScaling`, `Creature::setDeathState`, `Map::ProcessRespawns`, `Map::ProcessCreatureRespawn`

Checked: the cell hint was INFERRED, so I located the mechanism by grep. Read in full: `ApplyDynamicModeRespawnScaling` (Map.cpp 1758-1805), `ProcessRespawns` and `ProcessCreatureRespawn` (2792-2910), `SaveCreatureRespawnTime` (2477-2504), `UpdatePlayerZoneStats` (419-434), the respawn-sweep block of `Map::Update` (466-476), `Creature::setDeathState` JustDied branch (1973-2009), `Creature::Respawn` (2044-2182), the Dead case of `Creature::Update` (737-745), the config text for the dynamic settings, and `WorldUpdateLoop` (Main.cpp 584-619). Confidence: high on the death -> respawn-time -> queue -> recreate chain and the zone scaling formula. NOT read: `PoolMgr` (spawn pools: only its header and `IsPartOfAPool` calls seen), `SpawnGroupSpawn/Despawn`, the part of `IsSpawnGroupActive` after line 2643, grid load/unload (so any "despawn when nobody is near" behaviour), `World::_UpdateGameTime`, and every other caller of `setDeathState`. This is GPL: clean-room only.

## 1. Mechanism

- Death sets the respawn time. In the JustDied branch of `Creature::setDeathState`, corpse removal time = now + corpse delay (1979); then the base respawn delay is passed through `ApplyDynamicModeRespawnScaling` (1980); then `respawnTime = now + scaledDelay + corpseDelay` (1981). The corpse delay is added AFTER scaling, so it is never scaled. Bosses, world bosses and elites-or-above are persisted at death (1984). Defaults per creature are respawn 300 s and corpse 60 s (constructor, Creature.cpp 267), overridden by the spawn row's `spawntimesecs` (1753).
- Zone-population scaling (`ApplyDynamicModeRespawnScaling`), in order: rate from config, if exactly 1 return unchanged (1764, default is 1 so it is OFF); instanced maps unchanged (1768); creatures with no database spawn id (temporary summons) unchanged; quest givers, world bosses, rare and rare-elite unchanged (1779-1781); look up the player count of the creature's zone, none or zero means unchanged (1791-1796); `adjustFactor = rate / playerCount` (1797); if factor >= 1 unchanged, so nothing happens until players exceed `rate` (1798); if the base delay is already <= the minimum, unchanged, so short timers are never lengthened (1801); else `max(ceil(delay x factor), minimum)` (1804). Worked example from the formula (not from the donor): rate 10, base 300 s: 20 players -> 150 s, 40 -> 75 s, 100 -> 30 s, 300 -> floored to 10 s.
- The zone player count is a map of zone id to count, updated on each zone change: old zone count decremented if non-zero, new incremented (Map.cpp 425-433). The scaling reads it only at the moment of death, so a respawn already booked is not re-scaled when the zone fills or empties (follows from 1980-1981; I did not check other callers of `setDeathState`).
- Two respawn paths. (1) In-place ("compat"): the dead creature object stays and, in the Dead case of `Creature::Update`, checks `respawnTime <= now` and calls `Respawn()` (740-742); `Respawn` clears loot, re-rolls level, restores full health via the JustRespawned state and resets AI. This path is used when the config forces it or the creature's spawn group has the compatibility flag (1739-1740); rows with no spawn group get the "Legacy Group" with that flag (ObjectMgr.cpp 316, header line read only). (2) Queue: `Map::SaveCreatureRespawnTime` stores the time in a map and in a time-ordered set `_respawnQueue` (2495-2496). `Map::Update` runs `ProcessRespawns` when a 5000 ms countdown has expired (469-472), skipped if the force-compat config is on (467). `ProcessRespawns` pops entries from the front while due (2798-2809) and stops at the first future one (2801).
- Per-entry gating in `ProcessCreatureRespawn`, in order: pool members go to the pool system and the entry is dropped (2824); no data or compat group: drop; spawn group inactive: re-queue at now + 5 s (2848-2851); grid not loaded: re-queue at now + 5 s (2856); a live creature with that spawn id already exists: drop (2866); instance boss already DONE: re-queue +5 s (2876-2882, not detailed here); linked-respawn master still dead: re-queue at the master's time + 5..60 s (2898; a creature linked to itself is pushed a day); finally remove the stored time first (comment: otherwise the creature loads as dead) and recreate from the DB row (2905-2908).
- Tick/loop: the world loop is a variable step. It computes `diff` from real milliseconds, sleeps only if `diff` is under `MinWorldUpdateTime` (default 1 ms), then calls `World::Update(diff)` (Main.cpp 607-618, conf 1053). There is no fixed step or accumulator. Respawn deadlines are whole seconds of game time, and the queue is polled every 5 s of accumulated map `diff` (the countdown is reset to 5000 rather than carrying the remainder). Real respawn precision is therefore about 5 s in queue mode and about one update in in-place mode.

## 2. Key functions

- `Map::ApplyDynamicModeRespawnScaling`: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Maps/Map.cpp` 1758-1805. The zone-population respawn scaler.
- `Creature::setDeathState` (JustDied branch): `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Entities/Creature/Creature.cpp` 1973-2009. Computes `respawnTime`.
- `Map::ProcessRespawns` / `Map::ProcessCreatureRespawn`: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Maps/Map.cpp` 2792-2910. Time-ordered queue and the gates.
- `Map::SaveCreatureRespawnTime`: same file 2477-2504. Insert into the queue (and the DB statement, not needed by a port).
- `Creature::Respawn`: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Entities/Creature/Creature.cpp` 2044-2182. In-place revive or hand-off to the queue.
- `Map::UpdatePlayerZoneStats`: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Maps/Map.cpp` 419-434. Per-zone player counter.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Delay scales by `rate / playersInZone`, never up, never below a floor, only above `rate` players | Rate default 1 = off (theirs, worldserver.conf.dist 4846); floor 10 s (theirs, conf 4853) |
| Exempt classes (bosses, quest givers, rares, instances, summons) keep the base delay | the exemption list (theirs, Map.cpp 1779-1781) |
| Corpse delay added after scaling | 60 s default (theirs, Creature.cpp 267) |
| Time-ordered queue drained from the front; gated entries re-queued a fixed step later | 5 s re-queue (theirs, Map.cpp 2851); 5 s sweep (theirs, Map.cpp 472) |
| Drop the entry if a live instance already exists | none |
| Base respawn delay is per spawn data | 300 s default (theirs, Creature.cpp 267) |

## 4. TypeScript sketch

simplified: keeps the scaling formula and its exemptions, booking at the moment of death with corpse delay added after scaling, a time-ordered queue, a coarse sweep, and the active-group and already-alive gates. It omits pools, linked respawns, boss-done holds, grid loading, the DB save, the in-place revive path, and the donor's whole-second wall clock (a port should feed server ticks / 20). Exemption is a single flag on the slot instead of the donor's class checks.

```ts
// Licence: GPL-2.0-or-later (donor). Clean-room sketch from the described mechanism, not a translation.
// clean-room
interface ZoneData {
  respawnRate: number;      // players the zone is "sized for"; 1 = scaling off (donor default)
  minScaledSec: number;     // floor for scaled delays (donor default 10)
  corpseSec: number;
  groupActive: boolean;
}

interface DeadSlot { slotId: number; zoneId: number; baseRespawnSec: number; exempt: boolean }
interface Due { dueSec: number; slotId: number }

const queue: Due[] = [];           // keep sorted by dueSec
const playersInZone = new Map<number, number>();

function scaledDelay(z: ZoneData, slot: DeadSlot): number {
  if (z.respawnRate === 1 || slot.exempt) return slot.baseRespawnSec;
  const players = playersInZone.get(slot.zoneId) ?? 0;
  if (players === 0) return slot.baseRespawnSec;
  const factor = z.respawnRate / players;
  if (factor >= 1) return slot.baseRespawnSec;
  if (slot.baseRespawnSec <= z.minScaledSec) return slot.baseRespawnSec;
  return Math.max(Math.ceil(slot.baseRespawnSec * factor), z.minScaledSec);
}

function enqueue(d: Due): void {
  let i = queue.length;
  while (i > 0 && queue[i - 1].dueSec > d.dueSec) i--;
  queue.splice(i, 0, d);
}

// Server-verified death only. Delay is read at the moment of death.
function onDeath(z: ZoneData, slot: DeadSlot, nowSec: number): void {
  enqueue({ dueSec: nowSec + scaledDelay(z, slot) + z.corpseSec, slotId: slot.slotId });
}

// Coarse sweep (donor: every 5 s). Drain due entries in order; gated ones are pushed 5 s out.
function sweep(nowSec: number, zoneOf: (slotId: number) => ZoneData, spawn: (slotId: number) => void, isAlive: (slotId: number) => boolean): void {
  while (queue.length > 0 && queue[0].dueSec <= nowSec) {
    const d = queue.shift() as Due;
    if (!zoneOf(d.slotId).groupActive) { enqueue({ dueSec: nowSec + 5, slotId: d.slotId }); continue; }
    if (isAlive(d.slotId)) continue;
    spawn(d.slotId);
  }
}
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (engine logic; zone data fields: respawn rate (players the zone is sized for), min scaled s, corpse s, base respawn s per slot, group active). Parity-checklist row 23 (zone population: spawn caps, respawn, despawn).
- today: not read.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: zones as data on one runtime (addendum row 23); rules 7-9 n/a
- Best transferable idea: scale each respawn delay down by `rate / playersInZone` at the moment of death (never up, floored, bosses exempt), so a crowded zone refills faster without a bigger cap.

## 6. Gaps and risks

- No cap and no despawn-on-empty with a grace timer in what I read. The scaler changes speed, not the number alive; the cap comes from one live creature per spawn row. Row 23's cap and grace timer must come from elsewhere; grid unload (the closest thing to despawn) was not read.
- The donor reads the player count at death only, so a respawn booked in a quiet moment stays slow when a crowd arrives. Acceptable for a MMO; for Frankendom decide whether to rescale at fire time instead (a different design, not the donor's).
- Wall-clock seconds and a 5 s queue poll are loose; Frankendom's fixed-step server should book ticks and run the queue each tick or each N ticks, deterministically.
- Kills are server-verified: `onDeath` must run only from the engine's own death event, never from client input.
- A fight where `MAX_ATTACKERS = 3` is unaffected, but scaled-down respawns raise the density of creatures around many-on-one fights; the zone data should carry a ceiling on live count so scaling cannot overfill a zone.
- One engine / one ledger: the donor splits the in-place and queue paths, which doubles the code; Frankendom should pick the queue only.
- Dynamic scaling is OFF by default in the donor (rate 1) and a flag `SPAWNGROUP_FLAG_DYNAMIC_SPAWN_RATE` appears in a flag mask (SpawnData.h 51, seen in grep) but the function read does not test it; do not assume a per-group switch.
