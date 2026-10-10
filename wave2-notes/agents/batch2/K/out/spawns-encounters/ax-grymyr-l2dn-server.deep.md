# ax-grymyr-l2dn-server (spawns-encounters, cell 4)

Donor: `/mnt/frankendom-donors/ax-grymyr-l2dn-server/L2Dn/L2Dn.GameServer.Model/Model/Spawn.cs` | Licence: MIT (LICENSE.txt, "MIT License", Grymyr / L2Dn Server Project; code may be adapted, keep the notice) | C# | symbols `Spawn.decreaseCount`, `RespawnTaskManager.run`, `NpcSpawnTemplate.getSpawnLocation`

Checked: the hint file (`XmlMapRegion.cs`, map regions for player respawn points) is the wrong file for NPC population (named in a respawn grep only, not read). The real mechanism is `Spawn.cs` (read in full, 574 lines), `Spawns/NpcSpawnTemplate.cs` (read in full), `TaskManagers/RespawnTaskManager.cs` (full), `TaskManagers/DecayTaskManager.cs` (lines 10-100), and the callers `Npc.onDecay` (Npc.cs 1066-1080) and `Npc.deleteMe` (1119-1137). Confidence: high on the cap / respawn / despawn logic. NOT read: `DbSpawnManager` (the raid-boss path, the only other consumer of `respawnPattern` by grep), the legacy `SpawnTable`, minion spawning, and `ThreadPool` / `Map` thread-safety. This server has NO "despawn on empty zone with grace timer" that I found: despawn is explicit (`SpawnTemplate.despawn*`), not driven by player presence (I read the Spawn* classes; I did not search the whole repo for presence-driven despawn).

## 1. Mechanism

- A population is a set of `Spawn` objects. Data (XML) declares a spawn template with `count`, `respawnTime`, `respawnRandom` and either a fixed `x,y,z,heading`, or a named zone (territory), or group/template territories with banned territories. `NpcSpawnTemplate.spawn` loops `count` times and each pass makes a separate `Spawn` with `setAmount(1)` (354), so on this path the per-Spawn cap is 1 and the template cap is `count` (325).
- Death to respawn, in order: (a) the creature dies and `DecayTaskManager.add` books a decay at now + the template's corpse time in seconds (DecayTaskManager 68, 97). (b) A 1 s sweep calls `onDecay` when due (DecayTaskManager 37). (c) `Npc.onDecay` calls `_spawn.decreaseCount(this)` (Npc 1080). (d) `decreaseCount`: if live count is 0 it returns; else live--; remove from the spawned list; then ONLY IF respawn is enabled AND `scheduled + live < max`, scheduled++ and a pending respawn is booked at `now + (random ? Rnd(min,max) : min)` (Spawn 213-219). The cap check is what the code comment says stops lag from booking multiple respawns. (e) `RespawnTaskManager` runs at a fixed rate of 1000 ms (18), skips the run if the previous one is still working (23), takes every entry whose time has passed (32), removes it, calls `spawn.respawnNpc(npc)` (40) then `scheduled--` (41). (f) `respawnNpc` does nothing unless respawn is enabled (522), else re-runs `initializeNpc` on the SAME Npc object (525).
- So the respawn clock starts at corpse removal, not at death: effective gap = corpse time + respawn delay. This follows from the call chain above; the donor never states it.
- Delay numbers: `setRespawnDelay(delay, interval)` sets min = delay - interval and max = delay + interval, both clamped to at least 10 s (455-459). Random is used only if min != max (485). With no delay (and no pattern) the template path calls `stopRespawn` (372-381); `init` also sets `_doRespawn = min > 0` (233).
- Placement (`initializeNpc`): location comes from the template (333): a fixed location, or a weighted pick among `ChanceLocation`s (cumulative percent roll, `NpcSpawnTemplate` 231), or a random point in a named territory (241), else group then template territories with up to 100 retries to avoid banned territories (248-259). Territory points get Z from the height map (SpawnTerritory 29). An optional jitter (config, default range +/-150, Config.RandomSpawns 20) offsets plain monsters in X and Y and is accepted only if the move and line-of-sight checks pass (Spawn 365-373); Z is only re-snapped if it is under 300 off (381); heading is random in 0..61793 if the spawn has none (393).
- Initial fill and stop: `init` fills until live == max (229). Startup spawns only templates flagged spawn-by-default (SpawnData 73; SpawnTemplate 140). `NpcSpawnTemplate.despawn` calls `stopRespawn` first and then `deleteMe` (425, 429); `deleteMe` runs `onDecay` (Npc 1123) and so reaches `decreaseCount`, which books nothing because respawn is off. Order matters: stop first, then delete.
- Tick: wall clock, not a fixed sim step. Two coarse 1 s sweeps (decay and respawn) comparing `DateTime.UtcNow` to a due time, each guarded against overlapping runs. Callers: a repo-wide grep found `decreaseCount` called from `Npc.onDecay` only (Npc 1080); `onDecay` is reached from the decay sweep, `deleteMe` (1123) and `endDecayTask` (1163).

## 2. Key functions

- `Spawn.decreaseCount`: `/mnt/frankendom-donors/ax-grymyr-l2dn-server/L2Dn/L2Dn.GameServer.Model/Model/Spawn.cs` 198-221. Cap check plus booking.
- `Spawn.init` / `respawnNpc` / `initializeNpc`: same file 227-236, 520-534, 323-439. Fill, revive, place.
- `Spawn.setRespawnDelay`: same file 446-466. Min/max with 10 s floor.
- `RespawnTaskManager.run` / `add`: `/mnt/frankendom-donors/ax-grymyr-l2dn-server/L2Dn/L2Dn.GameServer.Model/TaskManagers/RespawnTaskManager.cs` 21-52. The 1 s sweep and the pending map.
- `NpcSpawnTemplate.getSpawnLocation` / `spawnNpc` / `despawn`: `/mnt/frankendom-donors/ax-grymyr-l2dn-server/L2Dn/L2Dn.GameServer.Model/Model/Spawns/NpcSpawnTemplate.cs` 223-301, 343-416, 418-433.
- `DecayTaskManager.add` / `run`: `/mnt/frankendom-donors/ax-grymyr-l2dn-server/L2Dn/L2Dn.GameServer.Model/TaskManagers/DecayTaskManager.cs` 23-98. Corpse timer that starts the respawn chain.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Live + pending < cap before booking a respawn | Per-Spawn cap is 1 on the template path (theirs, NpcSpawnTemplate 354) |
| Respawn delay = base +/- random, floored | 10 s floor (theirs, Spawn 458) |
| Respawn timer starts at corpse removal | Corpse time per template (data; value not read) |
| Sweep a pending list on a coarse cadence | 1000 ms (theirs, RespawnTaskManager 18) |
| Stop respawn first, then delete, so a despawn books nothing | none |
| Weighted fixed locations, else random point in an area, retry outside banned areas | 100 retries (theirs, NpcSpawnTemplate 248) |
| Optional position jitter accepted only if reachable | +/-150 default range (theirs, Config.RandomSpawns 20); Z snap limit 300 (theirs, Spawn 381); heading range 61794 (theirs, Spawn 393) |

## 4. TypeScript sketch

simplified: the sketch keeps the cap check, delay maths, booking-at-removal, sweep and stop-then-delete order. It omits the territory/banned-area placement, jitter, heading, Z snap, minions, the DB (raid boss) path, the reuse of the dead object, the cron-style `respawnPattern` (stored by the donor, consumed only by the DB manager by grep, not read), and the donor's wall-clock timing: it uses tick counts instead, a deliberate change for a fixed-step server. `sweep` should be called on a coarse cadence.

```ts
// Licence: MIT (donor). Adapted from the described mechanism; MIT allows adaptation.
interface Rng { next(): number } // 0..1, seeded in Frankendom

interface SlotConfig {
  cap: number;            // zone data field: max live creatures
  respawnSec: number;     // zone data field; 0 = never respawn
  respawnJitterSec: number;
  minRespawnSec: number;  // floor (donor uses 10)
}

interface Creature { id: number }

interface Slot {
  cfg: SlotConfig;
  live: Creature[];
  pending: number;            // respawns booked, not yet fired
  enabled: boolean;
}

interface PendingRespawn { slot: Slot; dueTick: number }

const TICK_HZ = 20;
const pendingList: PendingRespawn[] = [];

function respawnDelayTicks(cfg: SlotConfig, rng: Rng): number {
  const lo = Math.max(cfg.minRespawnSec, cfg.respawnSec - cfg.respawnJitterSec);
  const hi = Math.max(cfg.minRespawnSec, cfg.respawnSec + cfg.respawnJitterSec);
  const sec = lo === hi ? lo : lo + rng.next() * (hi - lo);
  return Math.round(sec * TICK_HZ);
}

function initialFill(slot: Slot, make: () => Creature): void {
  while (slot.live.length < slot.cfg.cap) slot.live.push(make());
  slot.enabled = slot.cfg.respawnSec > 0;
}

// Called once the corpse has been removed (not at the moment of death).
function onRemoved(slot: Slot, dead: Creature, nowTick: number, rng: Rng): void {
  const i = slot.live.indexOf(dead);
  if (i < 0) return;
  slot.live.splice(i, 1);
  if (slot.enabled && slot.pending + slot.live.length < slot.cfg.cap) {
    slot.pending++;
    pendingList.push({ slot, dueTick: nowTick + respawnDelayTicks(slot.cfg, rng) });
  }
}

// Run on a coarse cadence (donor: once per second), not every sim tick.
function sweep(nowTick: number, make: () => Creature): void {
  for (let i = pendingList.length - 1; i >= 0; i--) {
    const p = pendingList[i];
    if (nowTick <= p.dueTick) continue;
    pendingList.splice(i, 1);
    if (p.slot.enabled) p.slot.live.push(make());
    p.slot.pending--;
  }
}

function despawnZone(slot: Slot): void {
  slot.enabled = false;          // first, so removal books nothing
  slot.live.length = 0;
}
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (engine logic; numbers are zone data fields: cap, respawn s, jitter s, min respawn s). Parity-checklist row 23 (zone population: spawn caps, respawn, despawn).
- today: not read.
- Reuse tag: adapt-with-changes (MIT; may be adapted with the notice kept)
- Brief rule served: zones as data on one runtime (addendum row 23); rules 7-9 n/a
- Best transferable idea: book a respawn only when `pending + live < cap`, and start its clock when the corpse is removed; stop respawn before deleting so a despawn books nothing.

## 6. Gaps and risks

- The donor has no player-presence logic that I found: no "despawn on empty zone with a grace timer". Row 23 wants that; this donor gives only the cap / respawn / explicit-despawn half. The grace timer must come from another donor or be written fresh.
- Wall-clock time (`DateTime.UtcNow`) and a 1 s sweep are not deterministic. Frankendom's server tick must count ticks and ideally replay from a seed (row 19, fight record). The sketch does this; the donor does not.
- Kills must be server-verified and the ledger single: the donor's respawn is triggered by corpse decay, so a client-reported kill must never reach `onRemoved`. Only the server's own death event may.
- MAX_ATTACKERS = 3 is untouched here; a zone population cap is a different limit from attackers per hero and must not be mixed up in the zone data.
- The donor's per-Spawn cap of 1 makes the lag guard nearly trivial on the template path; it matters for a shared slot with cap > 1, which another path may use (legacy `SpawnTable`, not read).
- Reusing the old Npc object (`respawnNpc`) is a memory trick; in a data-driven runtime make a fresh creature from the catalogue so no stale state (aggro, hate list) survives. (The donor's `onRespawn` reset, called at Spawn 326, was not read.)
- Heading and jitter numbers are L2 map units; convert, do not copy.
