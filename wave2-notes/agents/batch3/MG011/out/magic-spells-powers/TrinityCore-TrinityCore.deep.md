# TrinityCore-TrinityCore (magic-spells-powers, cell 2)

Donor: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/common/Utilities/EventMap.h` and `EventMap.cpp` (the timer and phase queue), used by the dragon boss `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/scripts/Northrend/Ulduar/Ulduar/boss_razorscale.cpp` (struct `boss_razorscale`, line 294) | Licence: GPL-2.0-or-later (header of EventMap.h, EventMap.cpp and boss_razorscale.cpp: "either version 2 of the License, or (at your option) any later version"; `COPYING` is the GPL version 2 text) | C++ | symbols `EventMap::ExecuteEvent`, `EventMap::SetPhase`, `EventMap::ScheduleEvent`, `boss_razorscale::UpdateAI`, `boss_razorscale::DamageTaken`

Checked: Read in full: `EventMap.h` (337 lines) and `EventMap.cpp` (250 lines). Read in `boss_razorscale.cpp`: the phase enum (224-230), Reset (313-317), the engage and air schedule (355-368), the ground and perma-ground actions (378-410), movement informs (412-453), the harpoon ground trigger (494-502), the damage hook (544-553), and the event dispatch (555-654). The other ~1,000 lines of that file were not read. Confidence high on the EventMap order of operations (whole files read) and on the Razorscale phase sequence in the ranges read; medium on the commander's part in the landing (only its `ACTION_GROUND_PHASE` case, 776-778, was read). Not read: the flame-breath spell class (`spell_razorscale_flame_breath`, line 1573), so the breath's cone shape is unknown here (`Spell.cpp` 1284 `TARGET_UNIT_CONE_180_DEG_ENEMY` only located by grep); armour per body part, taming and mounts were only located by grep (`Unit.cpp`, `Pet.cpp`, `SpellAuraEffects.cpp`), not read. `camera_scope`: not applicable.

Best transferable idea: Each timed boss ability is an event tagged with an 8-bit phase mask; a phase change switches which timers may fire (events from the old phase are dropped when they come due), and due events wait while the boss is casting rather than firing on top of a cast.
Decision (proposed): adapt - take the phase-gated timer queue and the cast gate for boss specials, but make drops visible (report them, and make "is scheduled" phase-aware) and keep the phase table in zone data rather than in the boss script.
Acceptance: A server test: a dragon test boss with an AIR breath (15-18 s repeat) and a GROUND-only wing buffet goes to ground at 50% health; after the switch to the perma-ground phase, the queued air-only event does not execute when due and `hasScheduled` reports false for it, and a breath that comes due during a cast fires only after the cast ends. A player sees the boss stop flying and start the ground set (firebolt, fuse armour, breath every 15-18 s) at 50% health.

## 1. Mechanism

- Storage: a `multimap` keyed by due time on an internal stopwatch `_time` (`EventMap.h` 55, 303-322). `Update(ms)` only advances `_time` (`EventMap.h` 87-90). There is no wall clock.
- Schedule: `ScheduleEvent(id, time, group, phase)` stores `_time + time` (`EventMap.cpp` 40-49). A min-max overload draws a random time first (51-54). `group` and `phase` each become one bit (`EventMap.h` 34-49). `phase` 0 means "any phase", and ids above 8 for group or phase are rejected silently (`EventMap.cpp` 42-46).
- Phase mask: an 8-bit mask. `SetPhase(p)` is absolute: it replaces the mask with one bit, and `SetPhase(0)` clears the mask to 0 (32-38). `AddPhase`/`RemovePhase` set or clear one bit (`EventMap.h` 122-137). `IsInPhase` tests a bit (246-249).
- Execute (`ExecuteEvent`, `EventMap.cpp` 77-98): look at the earliest entry. If it is not yet due, return 0 (83-84), so future events are never touched. If it is due and the map has a phase (mask nonzero) and the event has a phase (bit nonzero) and they do not intersect, erase it silently and loop (85-86). Otherwise erase it, make it `_lastEvent`, re-arm its series (92), and return its id (93). Returns 0 when nothing is due or the map is empty (97).
- Gating rule in one line: when the map has no phase (mask 0) every event fires; once a phase is set, only events whose phase bit matches run, and mismatched ones are dropped when they come due. Dropped events are not re-armed.
- Caller loop (Razorscale): each AI tick, `events.Update(diff)` (560), then if the boss is casting, return (562-563), then `while (eventId = ExecuteEvent())` dispatches each id (565). After every dispatch the loop returns if the boss started casting (651-652). So a due event waits for the cast to end; it is not dropped by the cast.
- Repeat: `Repeat(time)` re-inserts `_lastEvent` (the most recent executed event, with its id, group and phase) at `_time + time` (`EventMap.cpp` 67-70). Razorscale uses random repeats (576, 582, 584, 610, 640).
- Series: `ScheduleEventSeries(id, group, phase, {gaps})` appends the gaps to a per-event vector and arms the first (`EventMap.cpp` 228-245). `ExecuteEvent` re-arms the next gap for the same event (214-226, called at 92). The series ends when the vector is empty.
- Groups: `DelayEvents(delay, group)` moves only events whose group bit matches (114-133). `CancelEventGroup` removes them (178-198). Razorscale does not use groups.
- Razorscale phase flow, as read:
  (a) Reset sets phase 0 (317), so no gating during the first air events.
  (b) Engage schedules the air set: fireball 3 s, devouring flame 9 s, summon minions 1 s, all in phase AIR (357, 363-368). The same set is scheduled again on arrival at the second flight point (446). Berserk is a plain 15 min timer (359).
  (c) Ground trigger: each harpoon hit increments a counter; at `RAID_MODE(2, 4)` hits the boss calls `DoAction(ACTION_GROUND_PHASE)` (494-500). That action sets phase GROUND (390) and moves the boss to the landing point (393). On reaching the ground point the boss stuns itself (if not perma) and schedules flame breath 30 s later in GROUND (427-436).
  (d) Ground chain: flame breath (601-606) schedules wing buffet 2 s later in GROUND (605). Wing buffet schedules firebolt 2 s and resume-air 4 s, both in GROUND (612-616). Resume-air sets phase AIR (624), turns gravity off (623) and takes off 10 units higher (626-628).
  (e) Perma-ground: in `DamageTaken`, if not yet perma, the boss is below 50% health counting this hit (`HealthBelowPctDamaged(50, damage)`, 546) and the phase is GROUND, it sets phase PERMA_GROUND (550) and starts the perma action (551), which schedules the perma set (404, 370-376). Events queued for GROUND (for example resume-air) are then dropped when they come due, which by the phase rule keeps the boss grounded (this is inferred from the rule; the file has no comment saying so).

## 2. Key functions

- `EventMap::ExecuteEvent`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/common/Utilities/EventMap.cpp` 77-98 (due check, phase drop, series re-arm).
- `EventMap::SetPhase` (absolute) and `ScheduleEvent` (due = now + time, phase and group bits): `EventMap.cpp` 32-38 and 40-49.
- `EventMap::Repeat`: `EventMap.cpp` 67-70. Series: `EventMap.cpp` 214-245.
- Storage and phase bit helpers: `EventMap.h` 55 (multimap), 113-145 (documented phase semantics), 246-249 (`IsInPhase`).
- `boss_razorscale::UpdateAI` (dispatch with the casting gate): `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/scripts/Northrend/Ulduar/Ulduar/boss_razorscale.cpp` 555-654.
- `boss_razorscale::DamageTaken` (perma-ground at 50%): same file, 544-553.
- `boss_razorscale::DoAction` (ground and perma actions): same file, 378-410.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor numbers (file:line) |
|---|---|
| Phase mask, 8 slots | 8 phase bits (`EventMap.h` 113 doc, 1..8; `EventMap.cpp` 37) |
| Phase 0 = no gating | Reset to 0 at boss reset (`boss_razorscale.cpp` 317) |
| Air-set timers at engage | fireball 3 s (365), devouring flame 9 s (366), summon minions 1 s (367) |
| Fireball repeat | 2 to 3 s random (576) |
| Devouring flame repeat | 6 to 12 s in air or ground (584); 10 to 12 s in perma (582) |
| Summon waves | first wave at 5 s (589), next waves 2 to 5 s later (593), wave count `RAID_MODE(2, urand(2, 4))` (588), repeat 40 s (595) |
| Ground trigger | harpoon hits `RAID_MODE(2, 4)` (499) |
| Flame breath after landing | 30 s, ground phase (436) |
| Wing buffet after breath | 2 s, ground phase (605) |
| Firebolt after buffet | 2 s, ground phase (615) |
| Resume air after buffet | 4 s, ground phase (616); takeoff 10 units up (627) |
| Perma-ground threshold | 50 percent health, while GROUND (546) |
| Perma-ground events | firebolt 3 s (372); fuse armour 15 s (373), repeat 10 to 15 s (640); flame breath 18 s (374), repeat 15 to 18 s (610); devouring flame 22 s (375) |
| Berserk | 15 min (359) |
| Run speed during flight and landing | 3.0 (384, 392) |
| Event ordering | equal due times run in insertion order (`multimap`, `EventMap.h` 55) |

Which numbers suit a fast mobile fight: the mechanism works at a 1 to 3 s cadence as well as at 15 to 40 s, so the numbers are a design choice. A phase switch every 30 to 40 s with a 2 to 4 s transition is long for a duel; a short, fixed transition with a cast gate would suit a mobile fight better.

## 4. TypeScript sketch

simplified: the sketch keeps the donor's queue rules: earliest due first and equal times in insertion order; a due event whose phase is not active is dropped (not re-armed); a dispatch loop that waits while casting; repeat of the last event; and series gaps. It omits the group bits, `DelayEvents`, `CancelEventGroup`, `SetMinimalDelay`, `Reset`, the random-range overloads, and the duplicate-series handling; it uses a sorted array where the donor uses a multimap. Two changes are fixes, not donor behaviour: `onDrop` reports each dropped event (the donor drops silently), and `hasScheduled` ignores events whose phase is not active (the donor's `HasEventScheduled` does not check phase). The sketch does not re-arm a dropped repeat or series, matching the donor, so the designer must decide whether a dropped repeat should be re-armed.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Ev { id: number; group: number; phase: number } // group 0 = none; phase 0 = any phase; 1..8 otherwise

interface Entry { due: number; seq: number; ev: Ev }

const bit = (p: number): number => (p >= 1 && p <= 8 ? 1 << (p - 1) : 0);
const key = (e: Ev): string => `${e.id}/${e.group}/${e.phase}`;

export class EventQueue {
  private now = 0;
  private seq = 0;
  private queue: Entry[] = [];
  private phaseMask = 0;
  private last: Ev | null = null;
  private series = new Map<string, number[]>();

  constructor(private onDrop: (ev: Ev) => void = () => {}) {}

  update(ms: number): void { this.now += ms; }

  // Absolute: 0 clears the phase, 1..8 selects exactly one phase.
  setPhase(p: number): void { this.phaseMask = p === 0 ? 0 : bit(p); }

  addPhase(p: number): void { this.phaseMask |= bit(p); }

  schedule(ev: Ev, ms: number): void { this.insert(this.now + ms, ev); }

  // Re-arms the most recently executed event.
  repeat(ms: number): void { if (this.last) this.insert(this.now + ms, this.last); }

  // Gaps are appended to the series; the first gap is armed now.
  scheduleSeries(ev: Ev, gapsMs: number[]): void {
    const k = key(ev);
    const s = this.series.get(k) ?? [];
    s.push(...gapsMs);
    this.series.set(k, s);
    this.requeueSeries(ev);
  }

  private live(ev: Ev): boolean {
    return this.phaseMask === 0 || ev.phase === 0 || (bit(ev.phase) & this.phaseMask) !== 0;
  }

  // Returns 0 when nothing is due. A due event whose phase is not active is dropped.
  execute(): number {
    while (this.queue.length > 0) {
      const head = this.queue[0];
      if (head.due > this.now) return 0;
      this.queue.shift();
      if (!this.live(head.ev)) { this.onDrop(head.ev); continue; } // fix: donor drops silently
      this.last = head.ev;
      this.requeueSeries(head.ev);
      return head.ev.id;
    }
    return 0;
  }

  // Fix: phase-aware. The donor's HasEventScheduled does not check phase.
  hasScheduled(id: number): boolean {
    return this.queue.some((q) => q.ev.id === id && this.live(q.ev));
  }

  private requeueSeries(ev: Ev): void {
    const k = key(ev);
    const s = this.series.get(k);
    if (!s || s.length === 0) return;
    this.insert(this.now + (s.shift() as number), ev);
    if (s.length === 0) this.series.delete(k);
  }

  private insert(due: number, ev: Ev): void {
    this.queue.push({ due, seq: this.seq++, ev });
    this.queue.sort((a, b) => a.due - b.due || a.seq - b.seq);
  }
}

// One AI tick. Due events wait while casting; they are not dropped.
export function aiTick(q: EventQueue, diffMs: number, isCasting: () => boolean, dispatch: (id: number) => void): void {
  q.update(diffMs);
  if (isCasting()) return;
  let id = q.execute();
  while (id !== 0) {
    dispatch(id);
    if (isCasting()) return;
    id = q.execute();
  }
}
export {};
```

## 5. Lands in

- TARGET `src/fight/boss-phases.ts` (new module: a phase-gated timer queue for boss specials, one per boss, ticked by the engine's fight step; the server runs it and the client only shows the phase change). Parity-checklist row 13 (specials).
- today: no boss phase queue in Frankendom; specials are row 13.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one combat core, two clients); zones as data for the phase table, so a dragon's phases are data, not script

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, not from the donor lines.
- Stale state (defect, keep the idea): a phase-mismatched event stays in the map until it comes due (`EventMap.cpp` 83-86), and `HasEventScheduled` and `GetTimeUntilEvent` (200-212) still report it as scheduled. Fix: phase-aware `hasScheduled` (in the sketch) and a drop callback.
- Silent loss (defect, keep the idea): when a phase drops an event, the drop path does not re-arm its series or repeat (`EventMap.cpp` 85-86, against 92). A repeating ability therefore stops for good after one drop. Fix: the drop callback lets the designer re-arm, or the queue re-arms by rule. The sketch only reports.
- Duplicate series (risk, not reproduced): `ScheduleEventSeries` appends to an existing series (`EventMap.cpp` 241-242) and arms another event at once (244). Calling it twice for the same id, group and phase gives two streams. Fix: refuse or replace an existing series.
- Silent failure (risk): `SetPhase(p)` with p above 8 does nothing (`EventMap.cpp` 36-37), and `ScheduleEvent` with an out-of-range group or phase is dropped without a message (42-46). Fix: assert in the zone loader.
- Event id 0 (risk, not reproduced): `ExecuteEvent` returns 0 for "nothing due", and the caller's `while (eventId = ExecuteEvent())` loop stops on 0 (`boss_razorscale.cpp` 565). A stray id-0 event (for example from `Repeat` before any execution, since `_lastEvent` starts as id 0, `EventMap.h` 328) would end the dispatch loop early. Fix: reserve id 0 and validate it at schedule time.
- Cast gate (idea to keep, note the trade-off): due events wait while casting, but the donor checks casting only at the top of the tick and after each dispatch (`boss_razorscale.cpp` 562-563, 651-652). A cast that starts inside a dispatch loop is handled, but the donor does not say what happens to a phase change during a cast. Frankendom must decide the order: phase change first or cast first.
- Frankendom gap: the phase switch by harpoon hits and by health is boss-script logic in the donor. Frankendom rulings want the phase table as zone data and the kill/phase check on the server, so the 50% and harpoon thresholds must move into data.
- Frankendom gap: the donor's breath (`FLAME_BREATH`, cast at the victim, 604 and 609) has no cone in this file; the cone shape lives in the spell (`spell_razorscale_flame_breath`, 1573), which I did not read. The cone for Frankendom must be designed separately (see cell 1 for a cone-as-beam model).
- Not read in this cell (scope): armour per body part (`Unit.cpp` located only), taming (`Pet.cpp` located only), mounts (`SpellAuraEffects.cpp` located only), flight paths (`FlightPathMovementGenerator.h` located only), and Sindragosa and Felmyst (grep only; their `HealthAbovePct(35)` and phase lines are not analysed here).
- Data (zone data for Frankendom, from the donor numbers in section 3): the air and ground timers, the 50% threshold, the harpoon count, and the summon wave counts. The phase bits (8) and the drop rule are engine constants.
