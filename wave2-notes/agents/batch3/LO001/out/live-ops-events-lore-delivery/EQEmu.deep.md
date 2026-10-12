# EQEmu (live-ops-events-lore-delivery, cell 1)

Donor: `/mnt/frankendom-donors/EQEmu/common/server_event_scheduler.cpp` (with `world/world_event_scheduler.cpp`, `zone/zone_event_scheduler.cpp`) | Licence: GPL-3.0-or-later (file header: "either version 3 of the License, or (at your option) any later version"; LICENSE.md is GPL v3) | C++ | symbols `ServerEventScheduler`, `WorldEventScheduler::Process`, `ZoneEventScheduler::Process`

Checked: Read in full: `common/server_event_scheduler.h` (72 lines), `common/server_event_scheduler.cpp` (270), `world/world_event_scheduler.cpp` (85), `world/world_event_scheduler.h`, `zone/zone_event_scheduler.cpp` (182), `zone/zone_event_scheduler.h`. Read the table definition (`common/database/database_update_manifest.h` 3004-3020). Read only the `cron_next` overloads of `common/cron/croncpp.h` (869-887); the cron parser itself is (not read). Call sites: `ZoneEventScheduler::Process` has one caller (`zone/main.cpp:608`); `WorldEventScheduler::Process` has one caller (`world/main.cpp:388`); `LoadScheduledEvents` has three (`zone/main.cpp:397`, `zone/worldserver.cpp:3326`, `world/world_boot.cpp:405`), of which I read the first two and saw the third by grep only. Hot-zone effect (`zone->SetIsHotzone`) consumer: (not read). Confidence: high on the window, broadcast and active-set logic (read in full). Medium-high on the cron defect in section 6: reasoned from the code path, not executed. camera_scope: n/a (not a camera topic).

## 1. Mechanism

Two processes run the same clock. The world process holds the event table in memory and sends the broadcasts. Each zone process holds its own copy and applies the state changes that last for a window.

- Table: `server_scheduled_events` (manifest 3004). Columns: description, event_type, event_data, minute/hour/day/month/year start and end (integers, 0 = unset, 3010-3015), cron_expression (3020), created_at, deleted_at (soft delete). Event types are string constants: hot_zone_activate, broadcast, reload_world, rule_change, content_flag_change (`common/server_event_scheduler.h` 26-30).
- Load: rows where `deleted_at is null` (`common/server_event_scheduler.cpp` 46).
- Change detection: once a minute the world compares its copy with the database field by field (`CheckIfEventsChanged`, cpp 163-209). If any row differs, it sends `ServerOP_UpdateSchedulerEvents` to all zones (`world/world_event_scheduler.cpp` 35-40). A zone that receives it reloads its copy (`zone/worldserver.cpp` 3323-3326).
- Gate: each process calls `Process` on every loop pass, but work runs only when `now->tm_min` differs from the last polled minute (world 32; zone 28). So the scheduler does its work once per clock minute.
- World side (`world_event_scheduler.cpp` 54-81): handles only broadcast and reload_world (57-59). A broadcast sends an emote message to all zones (66-72). A reload_world sends a world repop (78). Each row is tested each poll (63), with no memory of earlier fires.
- Zone side (`zone_event_scheduler.cpp` 22-153), in this order:
  1. Resync the stored active events with fresh row data (44; the sync is 158-182).
  2. End pass over the active list (47-82). If a window is no longer ready (51), undo it: hot zone off (56), rule change reloads the rule set (63), content flag reloads flags (74). Rule and flag undo also clear the whole active list (67, 79).
  3. Start pass over the zone rows (85-149). Only hot_zone_activate, rule_change, and content_flag_change are handled (89-94). A row starts only if it is ready and not already in the active list (103). Hot zone on when this zone's short name is in the event data (105-107). Rule change applies key=value (123). Content flag adds an enabled flag (138-145). Each started row is pushed to the active list (109, 125, 145).
- Window test `ValidateEventReadyToActivate` (cpp 78-141): if a cron expression is set, the event is ready when `cron_now + 10 >= cron_next` (85-92) and never has a duration. Otherwise, start and end are built from the row fields, with 0 fields replaced by the current clock value (238-270). Ready when `now >= start` and either there is no end or `now < end` (116-138).
- Net effect for a window row on the zone side: the change turns on once when the window opens and turns off when it closes. It does not re-fire while the window is open. A broadcast on the world side does re-fire each minute while its window is open (section 6).

## 2. Key functions

- `ServerEventScheduler::ValidateEventReadyToActivate`: `/mnt/frankendom-donors/EQEmu/common/server_event_scheduler.cpp` 78-141 (cron branch 85-107; window branch 109-140).
- `ServerEventScheduler::BuildStartTimeFromEvent` and `BuildEndTimeFromEvent`: `/mnt/frankendom-donors/EQEmu/common/server_event_scheduler.cpp` 238-270 (zero fields take the current clock value).
- `ServerEventScheduler::CheckIfEventsChanged`: `/mnt/frankendom-donors/EQEmu/common/server_event_scheduler.cpp` 163-209.
- `WorldEventScheduler::Process`: `/mnt/frankendom-donors/EQEmu/world/world_event_scheduler.cpp` 26-85.
- `ZoneEventScheduler::Process`: `/mnt/frankendom-donors/EQEmu/zone/zone_event_scheduler.cpp` 22-153.
- `ZoneEventScheduler::SyncEventDataWithActiveEvents`: `/mnt/frankendom-donors/EQEmu/zone/zone_event_scheduler.cpp` 158-182.
- `croncpp` `cron_next(cex, time_t)`: `/mnt/frankendom-donors/EQEmu/common/cron/croncpp.h` 869-887. If the result equals the input, it adds one second and searches again, so the result is the next occurrence strictly after the input.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants and rules |
|---|---|
| Event row with a start and end window; open-ended when the end is unset | Wall-clock fields minute/hour/day/month/year (manifest 3010-3015). Unset = 0 |
| One poll per clock minute, not per frame | Minute change (world 32; zone 28) |
| Cron lead window: fire when the next match is within 10 s | `cron_now + 10` (cpp 92). Defect, section 6 |
| Start once when the window opens; undo at close | `IsEventActive` guard (zone 103) and end pass (zone 47-82) |
| Zero means unset | `> 0` tests (cpp 244-265). Defect for minute 0 and hour 0 |
| Soft delete | `deleted_at is null` (cpp 46); deleted_at is compared on change (cpp 197-198) |
| Broadcast to every zone | emote message to all zones (world 66-72) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (end pass first, then start pass) and the once-per-minute gate. It fixes three donor defects: the in-loop erase (ids are collected, then removed), repeated window starts (a start fires once when the window opens), and zero-means-unset (open ends are null). It omits: the cron rule and its 10 s lead, the world/zone split (broadcast and reload_world are not in it), the rule_change and content_flag payloads (kept as one opaque data string), the hot-zone short-name filter, the database change detection, and the reload packet. The `kind` field is carried but never branched on.

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type EventKind = "hot_zone" | "rule_change" | "broadcast";

interface ScheduledEvent {
  id: number;
  kind: EventKind;
  data: string;
  // Window in whole minutes since the epoch. null = open (no start or no end).
  // Fix for donor defect: no 0-means-now sentinel, so minute 0 is a valid value.
  startMin: number | null;
  endMin: number | null;
}

function inWindow(e: ScheduledEvent, nowMin: number): boolean {
  const started = e.startMin === null || nowMin >= e.startMin;
  const notEnded = e.endMin === null || nowMin < e.endMin;
  return started && notEnded;
}

class EventScheduler {
  private active = new Set<number>();
  private lastMin = -1;

  constructor(
    private events: ScheduledEvent[],
    private onStart: (e: ScheduledEvent) => void,
    private onEnd: (e: ScheduledEvent) => void,
  ) {}

  // Called every loop pass; real work happens once per minute change.
  tick(nowMin: number): void {
    if (nowMin === this.lastMin) return;
    this.lastMin = nowMin;

    // End pass: collect expired ids first, then remove (fix for donor in-loop erase).
    const ended: number[] = [];
    for (const id of this.active) {
      const e = this.events.find((x) => x.id === id);
      if (e && !inWindow(e, nowMin)) {
        ended.push(id);
        this.onEnd(e);
      }
    }
    for (const id of ended) this.active.delete(id);

    // Start pass: a window fires once when it opens (fix for donor per-minute broadcast repeat).
    for (const e of this.events) {
      if (this.active.has(e.id)) continue;
      if (inWindow(e, nowMin)) {
        this.active.add(e.id);
        this.onStart(e);
      }
    }
  }
}

export {};
```

Typecheck: copied to `/tmp/LO001-eqemu-events.ts` on the VPS; `npx -p typescript tsc --noEmit --strict --target es2020` exit 0.

## 5. Lands in

- TARGET `origins/server/world-events.ts` (new file, proposed): the live-ops window scheduler. It sits next to the spawn director `origins/server/world-spawns.ts`. Windows are rows in zone data; the server applies and ends them, and the client only shows them.
- Parity-checklist row 23 (zone population). The event window changes zone state (spawns and the hot zone flag), so the spawn effect belongs to row 23. Server tick sub-line: once-per-minute gate (cite row 18 / post-K item 3).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: zones as data on one runtime; server-verified state (events are server state, never client state).

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism.
- Defect (cron, reasoned from the code, not executed): a cron rule fires only when `cron_now + 10 >= cron_next` (cpp 92), and `cron_next` is strictly after the input (croncpp.h 884-887). The scheduler polls only on a minute change (world 32; zone 28), so the first poll of a minute sees the current time at that minute's start. For a rule at 20:00, the 19:59 poll sees the next match 60 s away, and the 20:00 poll sees the match of the following day. So under normal loop timing a minute-aligned cron rule would not fire. Confirm with a unit test before relying on this. Fix: poll each pass; fire when the cron matches the current minute and a last-fired minute key says it has not fired yet.
- Defect (cron has no duration): the same test decides the end (zone 51), so a cron-started hot zone or rule change is undone at the next minute poll, about 60 s later. Fix: give a cron rule an explicit duration field.
- Defect (zero means unset, cpp 244-265): with hour_start 20 and minute_start 0, the start minute comes from the current clock, so the window opens at 20:<whatever minute the server is in>, and minute 0 cannot be written. Date fields also default to today. Fix: null for unset (the sketch does this).
- Defect (erase during iteration): the zone end pass loops over `m_active_events` and calls `RemoveActiveEvent(e)` inside the loop (zone 47-58), and clears the whole list inside the loop on rule and flag undo (67, 79). That is iterator invalidation. Fix: collect, then remove (the sketch does this).
- Defect (broadcast repeats): the world poll re-tests each row each minute with no start-once state (world 63). A broadcast window repeats each minute while it is open, and an open-ended broadcast repeats forever. The zone comment (zone 101) says one-time events suit the world scheduler, but the world scheduler keeps no state, so that is not what the code does. Fix: the start pass in the sketch.
- Defect (host clock): time comes from `std::localtime` and the host's `tm_isdst` (cpp 44, 250). Frankendom should use UTC from the server clock.
- Frankendom gap (one ledger, server-verified): the donor's zone copies can go stale. A zone that misses the reload signal keeps old rows until the next change (world 35-40). Frankendom must have one server copy; zones read it.
- Frankendom gap (scope of modifiers): rule_change calls a global rule manager and resets all rules on undo (zone 63), so one event's end clears the others (zone 67). Frankendom must tag each modifier with its event id, so ending one window removes only its own effect.
- Frankendom gap (what a window changes): the donor's effects are hot zone, rules, and flags. Frankendom's windows should change zone spawn data (cap, chance, respawn; row 23) and only through the engine. The donor has no spawn-level window.

Best transferable idea: a single event row with a start-once activation guard, an end pass that undoes exactly what that row changed, and one once-per-minute gate, all on the server.
Decision (proposed): adapt — keep the window rows, start-once guard and end-undo pass as server zone data, with null for unset fields and an explicit duration for cron rules (the donor's cron path is defective as read); reject the per-zone copies and the global rule reset, which conflict with one ledger and scoped modifiers.
Acceptance: a server test where a 20:00-21:00 broadcast is sent exactly once at 20:00, a zone flag is on until 21:00, and an hour-20 minute-0 event opens at 20:00 whatever minute the server booted in.

Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
Brief rule served: 1 (one runtime, zones as data); server-verified state; rules 7-9 n/a


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
Errors: All checked claims hold: Process gates (world 32, zone 28), broadcast/reload_world filter 57-59, ValidateEventReadyToActivate 78-141 incl cron +10 at 92, zero-means-unset tests 244-265, end/start passes zone 47-82 / 85-149, active-list clear 67/79, in-loop RemoveActiveEvent, CheckIfEventsChanged 163-209, croncpp cron_next 884-889 adds 1 s on equality (supports the cron defect reasoning), table manifest, callers main.cpp:608 and 388, GPL-3.0-or-later header.
Missed: None significant.
