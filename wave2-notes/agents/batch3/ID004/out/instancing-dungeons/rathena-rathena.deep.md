# rathena-rathena (instancing-dungeons, cell 19)

Donor: `/mnt/frankendom-donors/rathena-rathena/src/map/instance.cpp` (with `instance.hpp`, `pc.cpp`, `map.cpp`, `party.cpp`) | Licence: GPL-3.0 (LICENSE line 2: "Version 3, 29 June 2007"; the "or later" clause was not read) | C++ | symbol `instance_create` (with `instance_subscription_timer`, `instance_addmap`, `instance_destroy`, `instance_enter`, `instance_addusers`, `instance_delusers`)

Checked: Read in full: the header types (`instance.hpp` 20-100), the DB limit defaults (`instance.cpp` 88-122), the wait-queue handler and timers (329-401), keep and idle timers (402-543), `instance_create` (608-714), `instance_addmap` (715-800), `instance_destroy` (934-1050), `instance_enter` (1051-1145), `instance_addusers` and `instance_delusers` (1180-1224). Data table read first: `db/re/instance_db.yml` (585 lines, 78 `Id` entries; `db/pre-re/instance_db.yml` is a separate copy, not read). Read at the call sites: `pc.cpp` 6962-6982 (map change), `map.cpp` 2306-2316 (map quit), `party.cpp` 856-866 (disband); a whole-file grep of `instance_wait` (every use). Not read: DB parsing for the other fields (43-87, 123-328), `instance_addnpc` (584-607), `reqinfo` (1146-1179), reload and init (1225-1321), `map_addinstancemap` and `map_delinstancemap` in map.cpp (their bodies: not read), and the client messages. Confidence: high on the two timers, the wait queue and the destroy paths; medium on the map-copy step. camera_scope not applicable.

Best transferable idea: Start a copy's hard lifetime when it is built, run a separate empty-grace timer that stops when someone enters and restarts when the last person leaves, and key the copy to one owner so only one copy can be live per owner.
Decision (proposed): adapt — the hard limit plus empty grace is row 23's despawn-on-empty with a grace timer; take the shape, use server ticks instead of wall-clock timers, start the hard limit at build (the donor starts it at request), and give the build queue one pending slot so a new request cannot build out of turn (defects below).
Acceptance: a server test asserts that a second zone copy requested inside the 60 s window is queued and not built; a copy is freed 300 s after its last player leaves; a copy is freed 3600 s after it was built even when someone is inside.

## 1. Mechanism

- Copies are created per owner. `instance_create(owner, name, mode)` (608-714) accepts a party, character, guild or clan owner. An owner that already has a live copy is refused (`pd->instance_id > 0` gives -3, 608-640 region). The copy gets the next id from a counter (`instance_count++`, 664), goes into `instances`, and is pushed onto the wait queue `instance_wait` (698). Its keep timer, the hard lifetime, starts at creation (705).
- The wait queue builds one copy at a time. `instance_subscription_timer` (338-400) takes the front id (339), returns if the queue is empty (341), builds that copy with `instance_addmap` (the map copies and NPCs), sends the wait positions, pops the front (381), and schedules itself again `INSTANCE_INTERVAL` = 60000 ms later if the queue is still non-empty (388-391).
- `instance_create` calls the handler directly once (700), so the first copy is built at once. A copy requested while another is waiting also calls the handler directly, which builds the front entry (the older copy) at once and schedules a new timer without cancelling the old one (see defects).
- Building (`instance_addmap`, 715-800): the copy goes BUSY (731); the idle timer starts with `db->timeout` (733-734) so a copy nobody enters dies after the idle limit; the initial map and extra maps are copied (`map_addinstancemap`, not read); NPCs are added unless the copy is set `nonpc` (`instance_addnpc`, not read).
- Lifetime, two timers:
  - Hard lifetime: `instance_startkeeptimer` (402-452) sets `keep_limit = now + db->limit` and `add_timer(... db->limit * 1000 ...)` (418-419). Default 3600 s when a new entry omits `TimeLimit` (101-102); 0 means infinite (99).
  - Empty grace: `instance_startidletimer` (453-503) sets `idle_limit = now + db->timeout` (469-470). Default 300 s when a new entry omits `IdleTimeOut` (118-119); 0 means infinite (116).
  - Both call `instance_delete_timer`, which calls `instance_destroy` (329-332).
- Occupancy: a player who changes map into a copy calls `instance_addusers` (pc.cpp 6977), which stops the idle timer (1188) and makes sure the keep timer runs (no-op here; it was started at creation). A player who leaves a copy map calls `instance_delusers` (pc.cpp 6972, map.cpp 2313-2314). `instance_delusers` sums the users on the copy's maps, and when the count is 1 or less (before the leaver's count drops, per the comment at 1214-1215) it starts the idle timer (1216-1217).
- Entry (`instance_enter`, 1051-1145): an owner check by mode (party id, character id, guild id or clan id must match `owner_id`, 1074-1110), the copy must be BUSY (1123), the copy's map must exist (`instance_mapid`, 1131-1132), then `pc_setpos` to the given point or the DB entry point (1134).
- Destruction (`instance_destroy`, 934-1050): if the copy is still queued, it is removed from the queue and the timer is rescheduled (965-981). If built, the reason is decided from the timers (986-988: keep limit first, then idle), NPCs get their destroy hook, copy maps are removed (`map_delinstancemap`, not read), both timers are cancelled, the owner's `instance_id` is cleared, the variable store is freed, and the copy is erased (1037).
- Party disband destroys its copy (`party.cpp` 862-863). Guild dissolve does the same (`guild.cpp` 2332, not read in detail).

## 2. Key functions

- `instance_create`: `/mnt/frankendom-donors/rathena-rathena/src/map/instance.cpp` 608-714. One live copy per owner, id, queue push, immediate build, keep timer at creation.
- `instance_subscription_timer`: `/mnt/frankendom-donors/rathena-rathena/src/map/instance.cpp` 338-400. The one-at-a-time build queue and its 60 s interval.
- `instance_startkeeptimer` and `instance_startidletimer`: `/mnt/frankendom-donors/rathena-rathena/src/map/instance.cpp` 402-503. The hard lifetime and the empty grace.
- `instance_addmap`: `/mnt/frankendom-donors/rathena-rathena/src/map/instance.cpp` 715-800. Builds the copy and starts the empty grace.
- `instance_destroy`: `/mnt/frankendom-donors/rathena-rathena/src/map/instance.cpp` 934-1050. Teardown and reason.
- `instance_enter`: `/mnt/frankendom-donors/rathena-rathena/src/map/instance.cpp` 1051-1145. Owner gate and warp.
- `instance_addusers` and `instance_delusers`: `/mnt/frankendom-donors/rathena-rathena/src/map/instance.cpp` 1180-1224. Stop and start the empty grace on map change.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Hard lifetime from build, independent of occupancy | 3600 s default `TimeLimit` (instance.cpp 102) |
| Empty grace: starts when the copy has no one inside, stops on entry | 300 s default `IdleTimeOut` (instance.cpp 119) |
| One build at a time from a queue, with a fixed gap between builds | 60000 ms (instance.cpp 36) |
| One live copy per owner | Count 1 per owner (instance.cpp 608-640 region) |
| Reason for destruction: hard limit first, then empty grace, else user request | Order in instance.cpp 986-988 |
| Infinite lifetime or grace is a zero in the data | 0 = infinite (instance.cpp 99, 116) |
| Data: which copies set their own limits | In `db/re/instance_db.yml`, 18 entries set `TimeLimit` (7200 s x11, 14400 s x3, 3600 s x2, 1200 s x2); none sets `IdleTimeOut`, so every copy gets the 300 s grace; the other entries take the 3600 s loader default |

## 4. TypeScript sketch

simplified: the sketch keeps the owner key (one live copy per owner), the one-slot build queue, the hard lifetime started at build, the empty grace started and stopped by occupancy, the three destroy reasons and the teardown callback. It changes three things from the donor: it uses server ticks (20 per second) instead of wall-clock milliseconds; it starts the hard lifetime at build, not at request; and it builds the front of the queue only when no build slot is pending. It omits the party, guild and clan lookups (the owner is an id), the NPC destroy hook, the variable store, the client notices, the wait-position messages, the reload path, and the owner's own enter gate (only the copy id is used here). The donor's `users <= 1` test runs before the leaver's count drops; the sketch decrements first and checks zero.

```ts
// Licence: GPL-3.0 (donor). Clean-room: written from the described mechanism, not a translation.
type Mode = 'char' | 'party' | 'guild' | 'clan';
type Reason = 'live-timeout' | 'enter-timeout' | 'user-request';

const TICK_RATE = 20;                 // Frankendom server ticks per second (donor uses wall-clock ms)
const DEFAULT_LIMIT_S = 3600;         // donor instance_db default TimeLimit (instance.cpp 102)
const DEFAULT_IDLE_S = 300;           // donor instance_db default IdleTimeOut (instance.cpp 119)
const BUILD_INTERVAL_TICKS = 60 * TICK_RATE; // donor INSTANCE_INTERVAL 60000 ms (instance.cpp 36)

interface DbEntry { id: string; limitTicks: number | null; idleTicks: number | null; } // null = infinite
interface Instance {
  id: number;
  dbId: string;
  mode: Mode;
  ownerId: number;
  state: 'queued' | 'busy';
  users: number;
  keepDueTick: number | null; // hard lifetime, set when the instance is built (sketch fix)
  idleDueTick: number | null; // empty grace: running only while nobody is inside
}

class InstanceService {
  private nextId = 1;
  private queue: number[] = [];
  private pendingDue: number | null = null; // one build slot at a time (donor: overwritten timer)
  private instances = new Map<number, Instance>();
  private owners = new Map<string, number>(); // `${mode}:${ownerId}` -> live instance id

  constructor(
    private db: Map<string, DbEntry>,
    private build: (inst: Instance) => boolean,   // creates the zone copy; false = failed
    private unbuild: (inst: Instance) => void,    // despawns the copy's content
  ) {}

  // Create: one live instance per owner; queue it; build now only if nothing is pending.
  create(dbId: string, mode: Mode, ownerId: number, now: number): number | 'unknown-db' | 'owner-busy' {
    const entry = this.db.get(dbId);
    if (!entry) return 'unknown-db';
    const key = `${mode}:${ownerId}`;
    if (this.owners.has(key)) return 'owner-busy';
    const id = this.nextId++;
    const inst: Instance = { id, dbId, mode, ownerId, state: 'queued', users: 0, keepDueTick: null, idleDueTick: null };
    this.instances.set(id, inst);
    this.owners.set(key, id);
    this.queue.push(id);
    if (this.pendingDue === null && this.queue.length === 1) this.buildFront(now);
    return id;
  }

  // Once per tick: fire the single pending build, then expire timers.
  tick(now: number): void {
    if (this.pendingDue !== null && now >= this.pendingDue) {
      this.pendingDue = null;
      this.buildFront(now);
    }
    for (const inst of [...this.instances.values()]) {
      if (inst.keepDueTick !== null && now >= inst.keepDueTick) this.destroy(inst.id, 'live-timeout');
      else if (inst.state === 'busy' && inst.idleDueTick !== null && now >= inst.idleDueTick)
        this.destroy(inst.id, 'enter-timeout');
    }
  }

  // A player enters a copy: the empty grace stops; a player leaving to empty starts it again.
  userJoined(id: number): void {
    const inst = this.instances.get(id);
    if (!inst) return;
    inst.users += 1;
    inst.idleDueTick = null;
  }

  userLeft(id: number, now: number): void {
    const inst = this.instances.get(id);
    if (!inst) return;
    inst.users = Math.max(0, inst.users - 1);
    const entry = this.db.get(inst.dbId);
    if (inst.users === 0 && inst.state === 'busy' && entry && entry.idleTicks !== null)
      inst.idleDueTick = now + entry.idleTicks;
  }

  destroy(id: number, reason: Reason): boolean {
    const inst = this.instances.get(id);
    if (!inst) return false;
    if (inst.state === 'queued') {
      const at = this.queue.indexOf(id);
      if (at >= 0) this.queue.splice(at, 1);
      if (this.queue.length === 0) this.pendingDue = null; // nothing left for the pending slot
    } else {
      this.unbuild(inst);
    }
    void reason; // the caller tells players why (donor: IN_DESTROY_* notify)
    this.owners.delete(`${inst.mode}:${inst.ownerId}`);
    this.instances.delete(id);
    return true;
  }

  get(id: number): Instance | undefined {
    return this.instances.get(id);
  }

  private buildFront(now: number): void {
    const id = this.queue.shift();
    if (id === undefined) return;
    const inst = this.instances.get(id);
    if (!inst) return; // destroyed while queued
    const entry = this.db.get(inst.dbId);
    if (!entry || !this.build(inst)) {
      this.destroy(id, 'user-request');
    } else {
      inst.state = 'busy';
      inst.keepDueTick = entry.limitTicks === null ? null : now + entry.limitTicks;
      inst.idleDueTick = entry.idleTicks === null ? null : now + entry.idleTicks;
    }
    // Next build waits one interval; the slot is only set when someone is still queued.
    this.pendingDue = this.queue.length > 0 ? now + BUILD_INTERVAL_TICKS : null;
  }
}

// Defaults for a copy that does not set its own limits.
const defaultEntry = (id: string): DbEntry => ({
  id,
  limitTicks: DEFAULT_LIMIT_S * TICK_RATE,
  idleTicks: DEFAULT_IDLE_S * TICK_RATE,
});

export { InstanceService, defaultEntry };
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population: row 23, despawn on empty with a grace timer). The copy lifecycle (owner key, build queue, hard lifetime, empty grace) sits with the zone copies; the limits are zone data fields.
- today: `origins/server/world-spawns.ts` (not read).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only, shape only)
- Brief rule served: row 23 zone population (empty grace and hard limit); rule 1 one engine (the copy is a zone on the one runtime, not a separate server process).

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism.
- Defect 1 (read before check): `instance_subscription_timer` reads `instance_wait.id[0]` (339) before it checks for an empty queue (341). An empty queue is read out of range first. Fix: check empty first, then read the front (the sketch never reads an empty queue).
- Defect 2 (build out of turn): `instance_create` calls the handler directly (700) even when a build is already scheduled. The handler then builds the front entry at once, so the 60 s gap is skipped for that entry, and it overwrites `instance_wait.timer` (389) without cancelling the older timer. Two timer chains can then run. Fix: build directly only when no slot is pending (the sketch does this), and schedule through one slot.
- Defect 3 (destroy also overwrites): the queued-destroy path reschedules with `add_timer` (977) without checking or cancelling the existing timer. Fix: same single slot; cancel it when the queue empties (the sketch sets `pendingDue` to null).
- Defect 4 (dead default path): when `instance_id <= 0`, `instance_enter` sets `mode = IM_PARTY` (1074-1076), but `idata` stays null, and the party branch then returns `IE_NOINSTANCE` because `idata == nullptr` (1096). The "Default party checks" path can never succeed. Whether any caller passes 0 was not read. Fix: resolve the copy from the party's `instance_id` before the check, or delete the branch.
- Defect 5 (stale comment): `INSTANCE_INTERVAL` is commented as the destroy check (36), but it paces the build queue (389). Fix: rename or correct the comment; this matters for anyone tuning it.
- Design defect 6: the hard lifetime starts at request (705), so a party waiting in the queue loses lifetime while still unbuilt. Fix: start it at build (the sketch does this).
- Risk: `instance_delusers` tests `users <= 1` before the leaver's count drops (1216, comment at 1214-1215). That depends on the order of the map counter update. Fix: decrement first, test zero (the sketch does this).
- Ruling: server-verified. The donor's copy lifecycle runs in the server and the client only gets status messages, which fits. Frankendom's kills must still be server-verified inside the copy.
- Ruling: one character, one ledger. The donor keeps the owner pointer on the party and the copy's variable store. Frankendom keeps the owner key and the copy's state in the one ledger, and the copy's records are cleared on destroy.
- Not transferable as is: the wall-clock timers (ms), the map copy machinery (`map_addinstancemap`, not read), and the NPC destroy hook (a script event).
- Not read: whether a hard-lifetime destroy removes players still inside (the teardown path `map_delinstancemap` was not read). Frankendom needs an explicit answer: send them to the entry, or keep the copy until they leave.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only, shape only)
Brief rule served: row 23 zone population (empty grace, hard limit, owner key); rule 1 one engine.
