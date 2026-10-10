# ax-grymyr-l2dn-server (zones-world, cell 3)

Donor: `/mnt/frankendom-donors/ax-grymyr-l2dn-server/L2Dn/L2Dn.GameServer.Model/Model/Spawn.cs` (with `TaskManagers/RespawnTaskManager.cs`, `Model/Actor/Npc.cs`, `Model/Spawns/NpcSpawnTemplate.cs`) | Licence: MIT as read (`LICENSE.txt` line 1 "MIT License", line 3 "Copyright (c) 2024-2025 Grymyr, L2Dn Server Project"); provenance flag: `README.md` line 9 says "The project code initially is the port of the L2J server written in Java." The L2J licence was not read, so the MIT claim is not checked against that origin. | C# | symbol `Spawn.decreaseCount` (respawn queue), with `RespawnTaskManager.run`

Checked: The list hint `L2Dn/L2Dn.GameServer.StaticData.Xml/Zones/XmlZoneStatName.cs` is the wrong file: it is a 57-line enum of zone XML attribute names (`spawnMinX`, `chance`, `dmgHPSec` and so on) and has no logic. The real mechanism is the spawn respawn path. Read in full: `Spawn.decreaseCount` (198-222), `Spawn.init` (227-236), `Spawn.setRespawnDelay` (446-466), `Spawn.doSpawn()` gate (262-264), `Spawn.respawnNpc` (520-530), `Spawn.hasRespawnRandom` (483-486), `RespawnTaskManager` (whole file, 62 lines), the decay path in `Npc.onDecay` (1066-1080) and the decay schedule call in `doDie` at `Npc.cs` 913, and the template path that sets the delay (`NpcSpawnTemplate.cs` 372-380). Not read: `Spawn.doSpawn(bool)` placement and `initializeNpc` beyond the counter (323-440, only the `_currentCount++` at 430 was read), `Rnd.get(TimeSpan, TimeSpan)` (assumed uniform, not read), the decay timer in `DecayTaskManager` (not read). Not read at all: `ZoneManager.cs` (385 lines), `ZoneForm.cs`, `SpawnTable.cs`, the zone boundary and transition code. This note covers respawn only and claims nothing about zone boundaries or transitions. Callers (grep over the tree): `decreaseCount` is called only from `Npc.onDecay` (Npc.cs 1080); `respawnNpc` only from `RespawnTaskManager` (40); `setRespawnDelay` from the template (374) and from admin commands (`AdminSpawn.cs` 589, 636; `AdminTeleport.cs` 547, not read). Confidence: high on the respawn counts and order; medium on the 1-second granularity (the scheduler call is read; the thread pool behaviour is not).

Best transferable idea: a respawn queue per spawn point that counts down when a corpse decays, schedules the respawn at a random time inside a delay band, and refuses to queue when alive plus already-queued would reach the cap.
Decision (proposed): adapt - take the cap rule (alive + queued must stay under the maximum), the random band with a 10-second floor and the 1-second sweep, and reject the same-object reuse and the decay trigger as written; the trigger for Frankendom should be the server-verified kill or the server's removal event, never a client event.
Acceptance: a server test with a spawn point at maximum 3 kills three creatures and asserts that no respawn is queued until one corpse is removed, that each queued respawn fires after its band delay and never under 10 seconds, and that alive plus queued never exceeds 3.

## 1. Mechanism

- A spawn point (`Spawn`) owns a maximum (`_maximumCount`, 37), an alive count (`_currentCount`, 39), a queued count (`_scheduledCount`, 41) and a delay band (min and max, 47-49).
- Setup: `setRespawnDelay(delay, random)` sets `min = max(10 s, delay - random)` and `max = max(10 s, delay + random)` (455-459). So any positive delay is at least 10 seconds, and a band of zero width is a fixed delay. The template path only calls `setRespawnDelay` when the delay is positive or a respawn pattern exists; otherwise it calls `stopRespawn` (372-380).
- Init (227-236): the spawn point fills to the maximum with `doSpawn` (229), then turns respawn on only if the min delay is above zero (233). The doc comment at 224 says the same.
- Trigger: a death does not start the countdown. The Npc's decay path (`Npc.onDecay`, 1066) calls `decreaseCount` (1080) when the spawn point is not a DB-defined spawn (1078). The death method `doDie` (`Npc.cs` 828) adds the corpse to the decay manager at line 913; its doc comment (814-818) says the corpse goes after 7 seconds, which I did not check against the timer. So the respawn clock starts when the corpse goes away.
- `decreaseCount` (198-222): if the alive count is above zero (201), it drops the alive count by one (207) and removes the NPC from the spawned list. Then, if respawn is on and `queued + alive < maximum` (213), it increments the queued count (216) and schedules the respawn at `now + Rnd.get(min, max)` when the band is wide, or `now + min` when it is not (219, and `hasRespawnRandom` at 483-486).
- The sweep (`RespawnTaskManager`, 62 lines): a fixed 1-second repeat (18). A `_working` flag stops a second run from starting while one is in progress (23-27). The run takes the entries whose due time has passed (32), calls `respawnNpc` on each (40), then drops the queued count (41).
- `respawnNpc` (520-530): if respawn is on, it calls `initializeNpc` on the same NPC object (525). `initializeNpc` adds the NPC to the spawned list and increments the alive count (430). So the cap is checked at schedule time (213), not at fire time.
- Maximum alive is enforced at two points: init fills to the maximum, and the decrement only queues when alive plus queued is under the maximum. A spawn point with a maximum of N therefore has at most N alive plus queued at any time, if no other code spawns into it.
- The respawn pattern (`_respawnPattern`, 51 and 470) is stored and passed through the template (372-374), but no reader of it appears on the `decreaseCount` path (grep over the tree, 4 files). The countdown uses only the min and max band.

## 2. Key functions

- `Spawn.decreaseCount`: `/mnt/frankendom-donors/ax-grymyr-l2dn-server/L2Dn/L2Dn.GameServer.Model/Model/Spawn.cs` 198-222.
- `Spawn.init`: same file 227-236.
- `Spawn.setRespawnDelay(TimeSpan?, TimeSpan?)`: same file 446-466.
- `Spawn.respawnNpc`: same file 520-530.
- `RespawnTaskManager.run` and `add`: `/mnt/frankendom-donors/ax-grymyr-l2dn-server/L2Dn/L2Dn.GameServer.Model/TaskManagers/RespawnTaskManager.cs` 18-51.
- `Npc.onDecay`: `/mnt/frankendom-donors/ax-grymyr-l2dn-server/L2Dn/L2Dn.GameServer.Model/Model/Actor/Npc.cs` 1066-1080; decay schedule in `doDie` at 913.
- Template delay setup: `/mnt/frankendom-donors/ax-grymyr-l2dn-server/L2Dn/L2Dn.GameServer.Model/Model/Spawns/NpcSpawnTemplate.cs` 372-380.
- Licence: `/mnt/frankendom-donors/ax-grymyr-l2dn-server/LICENSE.txt` lines 1 and 3; provenance `/mnt/frankendom-donors/ax-grymyr-l2dn-server/README.md` line 9.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants (theirs) |
|---|---|
| Respawn cap: alive plus queued must stay under the maximum | `_scheduledCount + _currentCount < _maximumCount` (Spawn.cs 213) |
| Delay band around a base delay, with a floor | base plus or minus random; each end floored at 10 s (455-459) |
| Uniform random draw inside the band when the band is non-zero | `Rnd.get(min, max)` when `min != max` (219, 485); the Rnd function was not read |
| Respawn switched on only for a positive delay | `min > TimeSpan.Zero` (233) |
| Sweep granularity | fixed 1000 ms repeat (RespawnTaskManager.cs 18) |
| Respawn clock starts at corpse decay | `decreaseCount` called from `onDecay` (Npc.cs 1080) |
| Counts are not touched for DB-defined spawns | `!DbSpawnManager.getInstance().isDefined(getId())` (Npc.cs 1078) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: decrement the alive count, then the cap check, then the random delay and the queue entry; the sweep respawns before it drops the queued count. It omits the NPC list bookkeeping (`_spawnedNpcs`), the DB-defined spawn exemption (Npc.cs 1078), the instance-world re-registration in `respawnNpc`, the minion spawn in `initializeNpc`, the respawn pattern path (unused by the countdown), and the `_working` reentry flag (the sketch is driven by a single caller). `init` calls the caller's `spawnOne`, which must increment `alive` as `initializeNpc` does in the donor. It is a pure state sketch with no clock: time is passed in, and the random source is a parameter.

```ts
// Licence: MIT as read (L2Dn LICENSE.txt, Copyright (c) 2024-2025 Grymyr, L2Dn Server Project).
// Provenance flag: README says the code began as a port of L2J (Java); L2J licence not read. Clean-room: shape only.
// Respawn queue for one spawn point: count down on corpse decay, respawn after a random delay, capped.

export const MIN_RESPAWN_MS = 10_000; // donor: floor on the min and max delay (Spawn.cs 458-459)

export interface SpawnPoint {
  maximum: number;   // cap: alive plus queued must stay below this to queue another respawn
  alive: number;     // donor: _currentCount
  queued: number;    // donor: _scheduledCount
  respawnOn: boolean;
  minDelayMs: number;
  maxDelayMs: number;
}

export interface Pending { sp: SpawnPoint; dueAt: number; }

// Donor: setRespawnDelay(delay, randomInterval): band is delay +/- random, each end floored at 10 s.
export function setDelay(sp: SpawnPoint, delayMs: number, randomMs: number): void {
  sp.minDelayMs = Math.max(MIN_RESPAWN_MS, delayMs - randomMs);
  sp.maxDelayMs = Math.max(MIN_RESPAWN_MS, delayMs + randomMs);
}

// Donor: init() fills to the cap, then turns respawn on only if the min delay is above zero.
export function init(sp: SpawnPoint, spawnOne: (sp: SpawnPoint) => void): void {
  while (sp.alive < sp.maximum) {
    spawnOne(sp);
  }
  sp.respawnOn = sp.minDelayMs > 0;
}

// Donor: Npc.onDecay calls decreaseCount when the corpse decays, not at the killing blow.
export function onDecay(sp: SpawnPoint, queue: Pending[], now: number, rand: () => number): void {
  if (sp.alive <= 0) return;
  sp.alive -= 1;
  if (sp.respawnOn && sp.queued + sp.alive < sp.maximum) {
    sp.queued += 1;
    const band = sp.maxDelayMs - sp.minDelayMs;
    const delay = band > 0 ? sp.minDelayMs + rand() * band : sp.minDelayMs;
    queue.push({ sp, dueAt: now + delay });
  }
}

// Donor: RespawnTaskManager runs once a second. Due entries respawn, then the queued count drops.
export function sweep(queue: Pending[], now: number, spawnOne: (sp: SpawnPoint) => void): Pending[] {
  const remaining: Pending[] = [];
  for (const p of queue) {
    if (now > p.dueAt) {
      if (p.sp.respawnOn) spawnOne(p.sp);
      p.sp.queued -= 1;
    } else {
      remaining.push(p);
    }
  }
  return remaining;
}
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts`, parity row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer). This donor supplies the respawn part: the cap, the random delay band and the queue. The grace-on-empty rule is not in this code.
- Server tick: the sweep is a per-second repeat in the donor. In Frankendom it runs inside the server tick (row 18 / post-K item 3 sub-line "server tick: fixed step, input intake, per-tick NPC budget"), with the per-tick NPC budget applied to the number of respawns fired in one tick.
- Numbers as zone data fields: maximum, base delay, random spread, floor (see JSON sidecar).
- Reuse tag: rewrite-from-idea (MIT as read, with the provenance flag above; the sketch is rewritten from the mechanism, not copied).
- Brief rule served: zones as data (per-zone maximum and delay band); server-verified (the queue and the cap live in the engine's server code, not the client).

## 6. Gaps and risks

- Provenance: `README.md` says the code began as a port of L2J (Java). If the port kept L2J code, the MIT notice on `LICENSE.txt` may not cover those parts. Until the L2J licence is read, treat this donor as clean-room, shape only.
- The donor starts the respawn clock when the corpse decays (Npc.cs 1080), not when the NPC dies. Frankendom's kills are server-verified; the clock should start from the verified kill or from the server's removal event, and the choice has to be tested.
- The cap is checked when the respawn is queued (Spawn.cs 213), not when it fires. A second spawn path (a GM command or another zone rule) can push alive above the cap between queue and fire. Frankendom should check the cap at fire time as well, and that check is ours to add.
- `respawnNpc` reuses the same NPC object. Frankendom's one-ledger rule means a respawn must be a new ledger entry with its own id; reusing the object could blur the earlier kill in the fight record (row 19); this is a risk I did not measure. Reject the reuse.
- The 10-second floor (455-459) applies to any positive delay. Some encounters (a fast duel reset, for example) may want less. The floor should be a data field, not a constant, if Frankendom keeps the idea.
- The sweep is wall-clock (1000 ms repeat), not the game's tick. Frankendom must drive it from the server tick so tests can run it deterministically.
- `Rnd.get(TimeSpan, TimeSpan)` and the decay timer were not read; any claim about how the random draw or the decay delay is distributed is not made.
- Not read: `ZoneManager.cs`, `ZoneForm.cs`, `SpawnTable.cs` and the zone boundary and transition code. Zone layout, streaming and transitions are not covered by this note and remain open for this donor.
