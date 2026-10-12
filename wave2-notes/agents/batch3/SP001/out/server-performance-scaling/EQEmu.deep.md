# EQEmu (server-performance-scaling, cell 3)

Donor: `/mnt/frankendom-donors/EQEmu/zone/entity.cpp` (with `zone/main.cpp`, `zone/mob.cpp`, `zone/mob_ai.cpp`, `zone/spawn2.h`, `zone/zone.cpp`, `common/zone_store.cpp`, `common/features.h`, `common/ruletypes.h`, `common/database/database_update_manifest.h`, `common/event/timer.h`) | Licence: GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007 (LICENSE.md line 1 and 3); copyleft, clean-room only | C++ | symbol `EntityList::MobProcess`

Checked: Read: zone/main.cpp 555-640 (zone loop and 32 ms timer); entity.cpp 312-318, 438-530 (`CorpseProcess`, `MobProcess` idle branch), 1711-1764 (`QueueCloseClients`), 2868-2960 (close-list comment and `ScanCloseMobs`), 3128-3131 (`EntityList::Process`, which only runs `CheckSpawnQueue`), 5731-5738 (`GetCloseMobList`), 73-82 (`CastToNPC`); mob.cpp 8578-8615 (close-list scan timer); mob_ai.cpp 425-456 (timers), 686-700 (client AI gate), 960-972 (NPC AI gate), 1385-1400 (scan branch); features.h 140-152; timer.h 30-50; zone.cpp 1005-1012 (grep and short read). Callers of `MobProcess`: live caller zone/main.cpp:604 only; zone/sidecar_api/loot_simulator_controller.cpp:55 and zone/cli/tests are tools and tests. Not read: the `Timer` class in common/timer.h (expiry and reset semantics of `Check()` are inferred from use, not read); `Zone::Process()` body (zone.cpp:1521); `Mob::Process()` body (what an NPC does each tick); `DoNpcToNpcAggroScan`; `Client::Process` beyond the close-scan line. Camera: not applicable (server topic). camera_scope: n/a. Confidence: high on the idle branch and the cadence constants; medium on the timer expiry semantics.

## 1. Mechanism

- Fixed cadence. The zone loop is a repeating timer started at 32 ms (main.cpp:635-636) on the event loop (638). Each run, when the zone is loaded (595), it runs group, door, object, corpse, trap, raid, `entity_list.Process()` (only `CheckSpawnQueue`, entity.cpp:3128-3131), `MobProcess` (604), beacon, encounter, zone events, `zone->Process()` (611) and quest timers, in that order.
- Presence gate (`MobProcess`, entity.cpp 457-530). Only when `zone->IsIdleWhenEmpty()` (471; default 1, zone_store.cpp:723 and manifest 5218):
  - When the last client leaves (`numclients == 0` and `old_client_count > 0` from the previous tick, 505), a grace timer starts for `GetSecondsBeforeIdle()` seconds (482; default 60, zone_store.cpp:729 and manifest 5219).
  - If clients return during the grace, the timer is disabled (498-501).
  - When the grace expires with no clients (485), trader and buyer tables are cleared (492) and the timer is disabled (494).
  - Each mob's `Process()` runs only if clients are present, or `zone->quest_idle_override`, or its spawn point is marked path-while-idle (spawn2.h:56), or the grace timer is running (514-518). Otherwise the mob only checks for depop (522). So once the grace expires and the zone is empty, NPC AI and movement stop; the zone loop itself still runs.
- Per-mob AI cadence. The AI think timer is 50 ms (mob_ai.cpp:434; features.h:147). AI runs only when the think timer or the attack timer fires (696 for clients, 969 for NPCs and mobs). The NPC-to-NPC aggro scan timer is random between 500 and 6000 ms (mob_ai.cpp:452; ruletypes.h 691-692), which spreads scans out in time.
- Close lists (interest). `ScanCloseMobs` (entity.cpp 2902-2949) rebuilds one mob's close list by a pass over the whole mob list (loop at 2924; test at 2932: within 600 units, or aggro range at least 600), and links each pair both ways. The per-mob timer runs this every 6 s while moving and every 60 s when idle (mob.cpp 8581-8582; `CheckScanCloseMobsMovingTimer` 8585-8609).
- Lookups. `GetCloseMobList(mob, distance)` returns the cached list when the distance is within `MobCloseScanDistance` = 600 (ruletypes.h:765; entity.cpp 5733-5734). Beyond that it returns the whole mob list (5737).
- Client fan-out. `QueueCloseClients` (1711-1764) takes its default distance from the zone's `client_update_range` (zone.cpp:1385; manifest 6323 default 600). It walks the sender's close list, drops clients at or beyond the distance (1745), skips disconnected clients and applies the per-client filter.

## 2. Key functions

- `EntityList::MobProcess` (entity.cpp 457-530): presence gate, grace timer, per-mob processing or depop only.
- Zone loop (zone/main.cpp 595-638): order of per-tick passes and the 32 ms timer.
- `EntityList::ScanCloseMobs` (entity.cpp 2902-2949) and `EntityList::GetCloseMobList` (5731-5738): close-list cache and its fallback.
- `EntityList::QueueCloseClients` (entity.cpp 1711-1764): distance-gated client fan-out.
- `Mob::CheckScanCloseMobsMovingTimer` (mob.cpp 8585-8609): dynamic close-scan cadence.
- AI gates: `Client::AI_Process` (mob_ai.cpp 686-700) and `Mob::AI_Process` (960-972).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Fixed zone tick by repeating timer | 32 ms (theirs, main.cpp:636) |
| Gate all mob processing on presence, with a grace window after the last player leaves | Grace = zone row `seconds_before_idle`, default 60 s (zone_store.cpp:729; manifest 5219); gate on `idle_when_empty`, default 1 (zone_store.cpp:723; manifest 5218) |
| Exceptions to the gate | Zone-wide quest override (entity.cpp:514); per spawn point path-while-idle (spawn2.h:56) |
| Per-mob think cadence | AI think 50 ms (features.h:147); movement 100 ms (features.h:146, constant read, not used in the note) |
| Randomised scan interval to spread work | 500 to 6000 ms (ruletypes.h 691-692) |
| Close-list cache and refresh cadence | Scan 6 s moving, 60 s idle (mob.cpp 8581-8582); cache radius 600 (ruletypes.h:765) |
| Client fan-out distance | Zone row `client_update_range`, default 600 (manifest 6323; zone.cpp:1385) |

## 4. TypeScript sketch

simplified: the sketch keeps the grace-timer state machine (start on the last player leaving, cancel when a player returns, expire into idle) and the per-mob exceptions. It omits the trader and buyer table clear on idle, the zone loop and its other passes, depop handling for idle mobs, the mob processing itself, and the donor's shared static timer. It treats a client record as always processed, which the donor achieves by only running the pass when clients exist. It uses the explicit `kind` check that the donor lacks (see section 6).

```ts
// Licence: GPL-3.0 (donor LICENSE). clean-room: written from the described rule, not a translation of the donor lines.
// clean-room
export interface ZoneIdleRule {
  idleWhenEmpty: boolean;  // zone data, donor default true
  graceSeconds: number;    // zone data, donor default 60; 0 = zone goes idle at once
  questOverride: boolean;  // zone-wide exception: keep everything running
}

export interface MobRecord {
  kind: "npc" | "client";
  pathWhileIdle: boolean;  // per spawn point exception (NPCs only)
}

export class ZonePresence {
  private prevClients = 0;
  private graceEndsAt: number | null = null;

  constructor(private readonly rule: ZoneIdleRule) {}

  // Call once per zone tick, before the mob pass. Returns true when the zone runs this tick.
  update(clients: number, nowMs: number): boolean {
    if (!this.rule.idleWhenEmpty) return true;
    if (clients > 0) {
      this.graceEndsAt = null;                                     // someone is here: cancel grace
    } else {
      if (this.prevClients > 0 && this.rule.graceSeconds > 0) {
        this.graceEndsAt = nowMs + this.rule.graceSeconds * 1000;  // last player just left: start grace
      }
      if (this.graceEndsAt !== null && nowMs >= this.graceEndsAt) {
        this.graceEndsAt = null;                                   // grace over: zone goes idle
      }
    }
    this.prevClients = clients;
    return clients > 0 || this.rule.questOverride || this.graceEndsAt !== null;
  }
}

// Per mob: NPCs run only while the zone runs or when they are marked path-while-idle.
export function mobProcesses(zoneRunning: boolean, m: MobRecord): boolean {
  return m.kind === "client" || zoneRunning || m.pathWhileIdle;
}
```

Typecheck: copied to the VPS at /tmp/SP001-eqemu-zone-idle.ts and run `npx -y -p typescript tsc --noEmit --strict --target es2020`: exit 0.

## 5. Lands in

- TARGET `origins/server/zone-presence.ts` (proposed new module next to the zone runtime; not checked against the Frankendom repo). The gate runs on the server; the client sees only that the NPCs stop.
- Parity-checklist row 18, sub-line "server tick: fixed step, input intake, per-tick NPC budget" (the presence gate is the per-tick NPC budget for empty zones). Row 23 also names a grace timer, but for spawns and despawns; this donor's grace gates processing only, and no spawn or despawn code was read.
- today: no equivalent file known to this read (not checked).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: zones as data (`idle_when_empty` and `seconds_before_idle` as zone fields); 1 (one engine; kills are still server-verified on every tick)

## 6. Gaps and risks

- GPL-3.0 copyleft: clean-room only. The sketch is written from the rule.
- Defect (keep the idea, fix the defect): the idle branch reads `mob->CastToNPC()->respawn2` for every entry in the mob list (entity.cpp:507), and clients are in that list (entity.cpp:316). `CastToNPC` is an unchecked `static_cast` in release builds (entity.cpp:73-81). The pointer is dereferenced only when no clients are present (514), so the donor avoids a crash in practice, but a client's memory is still read as an NPC. Fix: read the spawn point only when `mob->IsNPC()`, and test with a client in the list.
- Frankendom rule: the gate must never stop the fight. A zone with a live fight has a player, so the gate is open; test that a fight in progress keeps its NPCs running when the grace is zero.
- Frankendom rule: kills stay server-verified. A gated NPC does not die, and a gated mob's depop check still runs (522); keep both.
- Cost: `ScanCloseMobs` is a full pass over the mob list for each scanning mob (loop at 2924, test at 2932); the cost grows with mobs times scanners. The donor's comment claims a large cut in aggro checks (2880-2881: 2,520,000 down to 144,000 checks a minute for 40 clients), but that figure is the donor's own estimate and was not measured here. Frankendom should use a spatial grid per zone (data) rather than a full scan.
- Cost cliff: `GetCloseMobList` silently returns the whole mob list for any distance above 600 (5733-5737). A caller that asks for a larger radius pays the full scan. Fix: cap the query distance or serve it from the grid.
- No per-tick budget: when clients are present, every mob runs `Process()` every 32 ms (518), with no cap on mobs per tick. Frankendom's per-tick NPC budget needs an explicit cap or a round-robin, which this donor lacks.
- Comment inconsistency: the donor's comment says moving mobs scan every "1-6 seconds" (2876), while the code uses 6 s moving and 60 s idle (mob.cpp 8581-8582). The code is the reference.
- Shared static timer: the grace timer is a single static object shared by all mobs (469). That is correct for one zone, but it is hidden state; Frankendom should keep the timer on the zone object.

Best transferable idea: Gate every NPC's per-tick processing on zone presence, with a zone-data grace window after the last player leaves and explicit exceptions for quest-driven and path-while-idle NPCs.

Decision (proposed): adapt - keep the presence gate with a zone-data grace window and explicit exceptions, and the 32 ms fixed zone tick; reject the full mob-list close scan and the distance fallback in favour of a per-zone spatial grid; check the NPC kind before reading NPC fields.

Acceptance: a zone with 200 NPCs and one player: when the player leaves, NPC AI and movement continue for graceSeconds (zone data, default 60) and then stop; a path-while-idle patrol keeps moving; a player who re-enters restarts processing within one tick; with grace 0 a fight in progress keeps its NPCs running.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: zones as data (zone fields for the grace and gate); row 18 sub-line "per-tick NPC budget" for the gate


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
Errors: No errors found. Verified: zone loop 32 ms (main.cpp:636) and pass order incl. MobProcess 604, zone->Process 611, quest timers; EntityList::Process = CheckSpawnQueue (3128-3131); idle gate 471, grace start 473-482, expiry 485/492/494, disable-on-return 498-501, old_client_count 505, s2 read 507 (CastToNPC unchecked static_cast, only _EQDEBUG checked, entity.cpp:73-81; clients added to mob_list at 316), process condition 514-518, depop-only 522; defaults 1 / 60 (zone_store.cpp:723/729, manifest 5218-5219); client_update_range 600 (manifest 6323, zone.cpp:1385); AIthink 50 ms (features.h:147, mob_ai.cpp:434), gates 696/969, scan timer 500-6000 (mob_ai.cpp:452, ruletypes 691-692); scan 6000/60000 (mob.cpp:8581-8582); MobCloseScanDistance 600 (ruletypes:765), GetCloseMobList fallback to full list (5731-5738); donor comment numbers 2,520,000 / 144,000 and the '1-6 seconds' mismatch; QueueCloseClients >= distance continue (1745); path_while_idle spawn2.h:56; GPL-3.0.
Missed: The whole grace-timer state machine lives INSIDE the per-mob while loop of MobProcess (entity.cpp 461-505), so it only advances when mob_list is non-empty and is re-evaluated once per mob per tick (idempotent, but costly and it never starts the grace timer in a zone with zero mobs). The note describes it as a once-per-tick gate; the sketch's update() once per tick is a reasonable fix but the donor quirk is not recorded.
