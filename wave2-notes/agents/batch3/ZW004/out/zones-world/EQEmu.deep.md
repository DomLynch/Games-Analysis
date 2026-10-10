# EQEmu (zones-world, cell 7)

Donor: `/mnt/frankendom-donors/EQEmu/zone/entity.cpp` (`EntityList::MobProcess`, 457-527; with `zone/spawn2.cpp`, `zone/zone.cpp`, `zone/spawngroup.cpp`) | Licence: GPL-3.0-or-later (`zone/entity.cpp` header lines 3-7: "either version 3 of the License, or (at your option) any later version"; `LICENSE.md` is GPL v3) | C++ | symbol `EntityList::MobProcess`

Best transferable idea: When the last player leaves a zone, keep its NPCs stepping for a grace period, then freeze them (no step) until someone comes back, and keep respawn timers and weighted spawn draws as plain data per spawn point.
Decision (proposed): adapt - take the grace-then-freeze gate and the spawn-point timer with variance and the per-type cap; reject "despawn on empty" as the default, because the donor freezes NPCs rather than removing them (a point is only removed when its depop flag is set).
Acceptance: a server test: the last player leaves a zone; NPCs step for `grace_s` (zone data, default 60) and then stop; a player re-entering inside the grace window cancels the freeze; a spawn point flagged path-when-idle keeps stepping.

Checked: Read in full on the VPS: `zone/entity.cpp` 385-410 (DoorProcess), 457-556 (MobProcess read to the end of its loop body; the idle gate is 471-523), 4227-4305 (LimitAddNPC, LimitCheckType, LimitCheckGroup); `zone/spawn2.cpp` 77-160 (constructor, respawn timer with variance), 152-354 (Process), 381-474 (Reset, Depop, Repop, ForceDespawn, DeathReset), 628-640 (Zone::Despawn); `zone/spawngroup.cpp` 28-125 (SpawnGroup constructor, GetNPCType); `zone/zone.cpp` 956, 1500-1545 (Zone::Process: spawn timer and walk); `zone/npc.cpp` 842-864 (NPC::Depop); `common/timer.cpp` 82-96 (Timer::Check); `common/zone_store.cpp` 723 and 729 (the two idle getters, by grep); `common/database/database_update_manifest.h` 5212-5219 (zone columns and defaults, by grep). Candidate opened and set aside: `eqlaunch/zone_launch.cpp` (the hint file, lines 1-60 read, plus its function list by grep: `Start` 56, `Restart` 89, `Stop` 122, `Process` 151, `OnTerminate` 218). It supervises zone executables with a restart wait, not population logic; bodies after line 60 not read. Not read: the spawn-entry SQL beyond the loader query, `zone_time.IsInbetweenTime` (zone time windows), the NPC constructor, `quest_idle_override` setters beyond `questmgr.cpp:1162`, and `Spawn2::LoadGrid` / waypoint selection. Confidence: high on the MobProcess order and on Spawn2::Process; medium on the first-mob edge in section 6 (control-flow reading, not run). camera: not a camera cell.

## 1. Mechanism

- Zone data: each zone row has `idle_when_empty` (default 1) and `seconds_before_idle` (default 60) (migration defaults, `database_update_manifest.h:5218-5219`). If the zone row is missing the getters return 1 and 60 (`zone_store.cpp:723`, `729`). The zone copies them at load (`zone.cpp` 1010, 1391).
- Zone process (`Zone::Process`, `zone.cpp:1522-1531`): once a second (`spawn2_timer(1000)`, `zone.cpp:956`, check at 1524), it walks every spawn point and calls `Spawn2::Process()`. This walk is not gated by clients, so respawn timers keep running in an empty zone.
- Spawn point timer (`Spawn2`): the timer is started with `resetTimer()`. Base time is `respawn * 1000` ms; with a non-zero variance the delay is a uniform draw in `base - var/2` to `base + var/2` (both in ms), floored at 100 ms (`spawn2.cpp:120-127`).
- Spawn point process (`Spawn2::Process`, `spawn2.cpp:161-310`), in order:
  1. A live NPC attached to the point blocks the respawn (161).
  2. When the timer fires (165) the condition gate runs; a failed condition calls `Reset()` (a fresh respawn delay).
  3. The group draws an NPC type with `SpawnGroup::GetNPCType(condition_value)` (208).
  4. A unique-name or per-type spawn limit that is full sets `timer.Start(5000)`: retry in five seconds (234, 242). The per-type check is `LimitCheckType` (240).
  5. A new NPC is created, added to the entity list and added to the limit list (`LimitAddNPC`, 309).
- Weighted draw (`SpawnGroup::GetNPCType`, `spawngroup.cpp:71-118`): the group cap is checked first (`LimitCheckGroup`, 76). Each entry that matches the condition filter and is under its own cap (`LimitCheckType`, 84) and inside its zone-time window (`IsInbetweenTime`, `spawngroup.cpp:89`) adds its chance to a total. A uniform roll in `0..total-1` (107) is then taken down the list, subtracting chances until one is below the running roll (110).
- Caps: `EntityList::LimitCheckType` and `LimitCheckGroup` scan the whole limit map and count records of that type or group (`entity.cpp:4252-4290`). A cap of 0 or less is no cap (`if (count < 1) return true`).
- The idle gate, `EntityList::MobProcess` (`entity.cpp:457-527`), runs once per mob per frame. When `zone->IsIdleWhenEmpty()` (471) is true:
  - Clients just went from some to none (`numclients == 0 && old_client_count > 0`) and `seconds_before_idle > 0` (473-475): the grace timer starts at `seconds_before_idle * 1000` ms (482). Mobs keep stepping during it.
  - Grace timer fires while still empty (485): the zone is marked idle, trader and buyer tables are cleared (492), and the timer is disabled.
  - A client is present or the timer is still running (498): the timer is disabled (`Disable`, after the 498 check).
  - `old_client_count = numclients` (505), set once per mob pass.
  - A mob is stepped (`mob->Process()`, 518) when clients are present, `quest_idle_override` is set, its spawn point is path-when-idle (`s2->PathWhenZoneIdle()`, 515), or the grace timer is still enabled (514-516).
  - Otherwise the mob is not stepped; it is removed only if its depop flag is set (`GetDepop()`, 522, with the comment at 520-521 saying spawn events can still spawn and kill while the zone is empty).
  - When `idle_when_empty` is 0 the mob is always stepped (525).
- `DoorProcess` (`entity.cpp:395-400`): with idle-when-empty and no clients, doors return at once. There is no grace for doors.
- Depop (`NPC::Depop`, `npc.cpp:858-861`): sets the depop flag. With `start_spawn_timer` the point restarts its respawn timer (`DeathReset`, 861); otherwise the point's repop is disabled.

## 2. Key functions

- `EntityList::MobProcess` - `/mnt/frankendom-donors/EQEmu/zone/entity.cpp` 457-527: the idle gate and the step-or-freeze choice. Read in full.
- `EntityList::DoorProcess` - `/mnt/frankendom-donors/EQEmu/zone/entity.cpp` 395-400 (the idle check at its top).
- `Spawn2::resetTimer` - `/mnt/frankendom-donors/EQEmu/zone/spawn2.cpp` 118-133: base plus or minus variance, floor 100 ms.
- `Spawn2::Process` - `/mnt/frankendom-donors/EQEmu/zone/spawn2.cpp` 152-353: order of gates and retries.
- `Spawn2::Reset`, `Spawn2::Depop`, `Spawn2::DeathReset` - `spawn2.cpp` 381-390, 453-473.
- `SpawnGroup::GetNPCType` - `/mnt/frankendom-donors/EQEmu/zone/spawngroup.cpp` 71-118: cap, filter, weighted pick.
- `EntityList::LimitCheckType`, `LimitCheckGroup`, `LimitAddNPC` - `/mnt/frankendom-donors/EQEmu/zone/entity.cpp` 4227-4290.
- `Zone::Process` - `/mnt/frankendom-donors/EQEmu/zone/zone.cpp` 1522-1531: the once-a-second spawn walk.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant (where) |
|---|---|
| Grace period after last client, then freeze | `seconds_before_idle` default 60 (zone data, `database_update_manifest.h:5219`; fallback `zone_store.cpp:729`) |
| Idle gate on or off per zone | `idle_when_empty` default 1 (zone data, `database_update_manifest.h:5218`; fallback `zone_store.cpp:723`) |
| Spawn-walk period | 1000 ms (engine constant, `zone.cpp:956`) |
| Respawn base | `respawn` seconds (zone data per spawn point), converted with `* 1000` (`spawn2.cpp:120`) |
| Respawn variance | `variance` seconds, uniform in base +/- variance/2 (`spawn2.cpp:124`) |
| Respawn floor | 100 ms (engine constant, `spawn2.cpp:127`) |
| Retry after a full per-type cap | 5000 ms (engine constant, `spawn2.cpp:234`, `242`) |
| Weighted draw | integer chances summed; roll in 0..total-1 (`spawngroup.cpp:107`) |
| Caps | per type (`npc_spawn_limit`, per entry) and per group (`group_spawn_limit`); 0 means none (`entity.cpp:4252-4290`) |

## 4. TypeScript sketch

simplified: the sketch keeps three parts: the respawn delay with variance and floor, the weighted pick with per-entry caps, and the idle gate with its grace state. It evaluates the gate once per tick, where the donor refreshes `old_client_count` inside the per-mob loop (the donor's state can therefore differ by one pass). It omits: the spawn condition gate, the unique-name check, zone-time windows, the group cap, the 5-second cap retry, quest override, waypoint grids, despawn modes, `DeathReset` bookkeeping, and the clearing of trader tables. The `shouldStep` rule is the donor's `numclients > 0 || ... PathWhenZoneIdle() || settle timer` rule without the quest override.

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Rand = (lo: number, hi: number) => number; // inclusive integer draw

interface Entry { npcType: number; chance: number; filter: number; cap: number; } // cap 0 = no cap
interface Point { baseS: number; varianceS: number; pathWhenIdle: boolean; entries: Entry[]; }

// Respawn delay in ms: base +/- variance/2, never under 100 ms.
export function respawnDelayMs(p: Point, rand: Rand): number {
  const base = p.baseS * 1000;
  if (p.varianceS === 0) return base;
  const half = (p.varianceS * 1000) / 2;
  return Math.max(100, rand(Math.floor(base - half), Math.floor(base + half)));
}

// Weighted pick among entries that match the filter and are under their cap. 0 = nothing to spawn.
export function pickEntry(entries: Entry[], filter: number, countOf: (npcType: number) => number, rand: Rand): number {
  const open = entries.filter(e => e.filter === filter && (e.cap < 1 || countOf(e.npcType) < e.cap));
  const total = open.reduce((s, e) => s + e.chance, 0);
  if (total === 0) return 0;
  let roll = rand(0, total - 1);
  for (const e of open) {
    if (roll < e.chance) return e.npcType;
    roll -= e.chance;
  }
  return 0;
}

// Zone idle gate: a grace period after the last client leaves, then mobs stop stepping.
export type Phase = 'active' | 'settling' | 'idle';

export class IdleGate {
  private phase: Phase = 'idle';
  private prevClients = 0;
  private settleEnd = 0;

  constructor(private readonly idleWhenEmpty: boolean, private readonly graceMs: number) {}

  // Call once per tick, before the mob loop.
  tick(clients: number, now: number): Phase {
    if (!this.idleWhenEmpty) { this.phase = 'active'; }
    else if (clients > 0) { this.phase = 'active'; }
    else if (this.prevClients > 0 && this.graceMs > 0) { this.phase = 'settling'; this.settleEnd = now + this.graceMs; }
    else if (this.prevClients > 0) { this.phase = 'idle'; }
    else if (this.phase === 'settling' && now >= this.settleEnd) { this.phase = 'idle'; }
    this.prevClients = clients;
    return this.phase;
  }

  // Mobs step in active and settling phases; in idle only points flagged pathWhenIdle step.
  shouldStep(p: Point): boolean {
    return this.phase !== 'idle' || p.pathWhenIdle;
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/zw004-eq-zone-population.ts`: exit 0, no errors.

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population: spawn points, respawn, caps, idle gate). Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer). Row 23 says "despawn on empty"; this donor freezes on empty and only removes a mob whose depop flag is set. The note's decision follows the donor; Lead should confirm which behaviour row 23 means.
- Today: not checked in the game repo (the target path is from the addendum).
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: zones as data (`idle_when_empty` and `seconds_before_idle` are zone fields; respawn base, variance and caps are per point or per group data); server-verified (the gate reads the server's own client count, not a client report).

## 6. Gaps and risks

- Freeze, not despawn: an idle NPC is still alive and frozen, and only spawn points with `path_when_zone_idle` keep stepping. Frankendom row 23 says "despawn on empty"; if that is the intent, this donor does not show it. Decide before building.
- Respawns run while empty: the spawn walk is not gated (`zone.cpp:1522-1531`), so new NPCs appear in an empty zone and then sit frozen (their step is gated in `MobProcess`). Frankendom must decide whether a respawn into an empty zone should wait.
- Stale first-mob edge (control-flow reading, not run): `old_client_count` is updated only inside the per-mob loop (505). If a zone has no mobs at the moment the last client leaves, the loop does not run, the grace timer does not start, and it starts later, on the first mob pass while still empty. Frankendom should start the grace from the last-client event, not from a per-mob loop.
- Grace timer is a single static per process (`entity.cpp:469`); it is shared by every mob pass in the zone process. Fine for one zone per process, but it is not a per-zone or per-instance field.
- Caps are linear scans of the limit map (`entity.cpp:4252-4290`) on every draw. Acceptable at this size; Frankendom should keep a count per type and per group.
- Per-type caps retry in 5 s, while failed conditions or empty draws wait a full respawn delay (`spawn2.cpp:234`, `242`; roll and cumulative pick at `spawngroup.cpp:107-115`; `Reset` at `spawn2.cpp:381`). Two retry rules; Frankendom should pick one and say why.
- Zone-time windows (`spawngroup.cpp:89`) and quest override (`entity.cpp:514`) are read in the gate but their internals are not read.
- Clean-room only: GPL-3.0. The sketch is written from the described mechanism.
