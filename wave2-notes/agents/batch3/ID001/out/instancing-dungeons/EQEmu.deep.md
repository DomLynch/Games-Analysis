# EQEmu (instancing-dungeons, cell 3)

Donor: `/mnt/frankendom-donors/EQEmu/world/dynamic_zone.cpp` (with `world/dynamic_zone_manager.cpp`, `common/dynamic_zone_base.cpp`, `zone/dynamic_zone.cpp`, `zone/zone.cpp`, `zone/client.cpp`, `zone/client_process.cpp`, `common/ruletypes.h`) | Licence: GPL-3.0-or-later (per dynamic_zone_base.h header line 7: "either version 3 of the License, or (at your option) any later version"; repo LICENSE.md is GPL v3) | C++ | symbol `DynamicZone` (world side: `DynamicZone::Process`, `DynamicZoneManager::Process`)

Checked: The list hint `utils/sql/svn/1498_instance_adventure.sql` is a schema migration (it adds graveyard columns to adventure_template and version and ruleset columns to zone). It is the wrong file and was not used as the mechanism. The real implementation is the dynamic zone system (EQEmu calls a party's instance a "dynamic zone" and an expedition is one type of it). Read in full: world/dynamic_zone.cpp (1-287), world/dynamic_zone_manager.cpp (1-180), common/ruletypes.h (rules at 1111 and 1115-1120). Read in part: common/dynamic_zone_base.cpp (56-82, 697-712, 762-800), zone/dynamic_zone.cpp (outline by grep; 548-556, 587-607, 1577-1600 read; the file is 1675 lines), zone/zone.cpp (constructor instance timer 1053-1072; Zone::Process expiry and warnings 1586-1630; SetInstanceTimer 2365-2370), zone/client.cpp (10439-10455), zone/client_process.cpp (153-157), common/dynamic_zone_lockout.h (25-73, by grep and read in part). Not read: the zone loop poll rate (the warnings in zone.cpp depend on it), the call site of PurgeExpiredDynamicZones, the member-save path (SaveMembers), and the ServerOP message handlers beyond the grep. Confidence high on the expiry and sweep paths (read both ends); medium on the lockout details; the "empty grace never holds" defect is from reading the two call sites together, not from a run. camera_scope: n/a (not a camera cell).

Best transferable idea: Keep one expiry time per party instance that both the world sweep and the zone timer read, delete an instance only when no zone has anyone in it, and give a removed member a kick delay instead of an instant kick.
Decision (proposed): adapt - the party roster, expiry, leader hand-over and removal-kick delay fit zones-as-data and per-party state; the donor's empty-grace branch does not hold the instance (defect 1 below), so the sketch applies the grace the rule names; the lockout multiplier and zone-start floor are fixed in the sketch's notes; GPL-3.0-or-later, clean-room only.
Acceptance: Server test: a party of three leaves an instance with no one inside; the instance survives the empty grace (1500 s by default) and is deleted only after it passes with no players in any zone; a member removed while inside is kicked to safe return 60 s later unless re-added in that window.

## 1. Mechanism

- Create (common/dynamic_zone_base.cpp 56-82; world/dynamic_zone_manager.cpp 58-79). The duration comes from the template (base 697-704). An unused instance id is taken (base 63). Start time is now and expiry is start plus duration (base 69-70). An instance row is written with the never-expires flag (base 78). The world caches the new instance (manager 61-77).
- Roster (world side is authoritative; zones keep caches). Members are saved to the database and cached (manager 69-70). Leader hand-over is in DynamicZone::ChooseNewLeader (world dz.cpp 49-76): if there are no members or the cooldown timer is not ready, it sets a retry flag and returns (51-55). Otherwise it picks the first non-leader member who is online and in the zone, and falls back to the first non-leader member (57-70). It runs when the leader is removed (189-192), when the leader is offline (201-204), and on each expedition Process (122-126).
- Removal kick (zone side). A removed member gets a removal timer (zone dz.cpp 748, 773). Client::SetDzRemovalTimer starts it at the rule's delay, 60000 ms by default (zone client.cpp 10441, 10450). Re-adding the member disables it (zone dz.cpp 779). When it fires, the client goes to the safe-return or bind point (client_process.cpp 153-157). The comment at zone dz.cpp 595-596 says live keeps removed members "temporary" for the kick duration; the comment marks the lockout part as unimplemented.
- World sweep (manager 139-177). Throttled by a timer at the WorldProcessRate rule, 6000 ms by default (manager 34, 141; rule ruletypes.h 1120). For each instance it calls Process (154). Process (world dz.cpp 100-129): status is Expired when there are no members or the instance is past expiry (105-107). If the zone running the instance is missing or has 0 players, status becomes ExpiredEmpty (110-112). On that branch, with no members and the early-shutdown rule on, it sets the remaining time to the early-shutdown delay, once (114-117). An ExpiredEmpty instance is announced to zones (manager 159), erased from the cache (167), and its lockout, member and instance rows are deleted (170-175).
- Duration change (world dz.cpp 140-163). Only reduces expiry (146). Keeps the start time, updates the database duration, and sends the new duration to zones (161). The zone sets its own timer (zone dz.cpp 253-264; zone.cpp 2365-2370).
- Zone expiry (zone.cpp, Zone constructor 1053-1072; Zone::Process 1586-1603). The zone timer starts from the database's remaining time, with a 150-second floor at zone start (1059-1061). When it fires: remove all dynamic-zone members (1595), move player corpses to the graveyard (1599), send everyone to safe return (1600), delete the instance row (1601), and start a 20-second shutdown timer (1602).
- Expiry warnings. Zone side: 1, 5 and 15 minute windows, 5 seconds wide (zone.cpp 1611-1622), skipped for expeditions, which the world warns (1626-1627). World side (dz.cpp 272-287): windows of 14-15, 4-5 and 0-1 minutes, then a 2-minute cooldown (278-284).
- Lockouts. A lockout has an expiry and a duration; Reset sets the expiry to now plus duration (lockout.h 59). A joining member gets a fresh copy of the instance's replay lockout if they do not already have one (zone dz.cpp 548-556). Adding a lockout duration writes character rows, the in-memory lockout and a client packet (base 762-772; zone dz.cpp 1577-1600).
- Startup. The cache loads only instances that have not expired (manager 102). A purge deletes stale rows (manager 38-56; call site not read).

## 2. Key functions

- `DynamicZone::Process` and `DynamicZone::SetSecondsRemaining`: `/mnt/frankendom-donors/EQEmu/world/dynamic_zone.cpp` 100-129 and 140-163.
- `DynamicZoneManager::Process` (world sweep): `/mnt/frankendom-donors/EQEmu/world/dynamic_zone_manager.cpp` 139-177.
- `DynamicZoneManager::TryCreate` and `DynamicZoneBase::Create`: `/mnt/frankendom-donors/EQEmu/world/dynamic_zone_manager.cpp` 58-79; `/mnt/frankendom-donors/EQEmu/common/dynamic_zone_base.cpp` 56-82.
- `DynamicZone::ChooseNewLeader`: `/mnt/frankendom-donors/EQEmu/world/dynamic_zone.cpp` 49-76.
- `DynamicZone::CheckExpireWarning`: `/mnt/frankendom-donors/EQEmu/world/dynamic_zone.cpp` 272-287.
- `Client::SetDzRemovalTimer` and the timer check: `/mnt/frankendom-donors/EQEmu/zone/client.cpp` 10439-10455; `/mnt/frankendom-donors/EQEmu/zone/client_process.cpp` 153-157.
- Zone expiry: `/mnt/frankendom-donors/EQEmu/zone/zone.cpp` 1053-1072 (timer start) and 1586-1603 (expiry).
- Lockout duration and replay copy: `/mnt/frankendom-donors/EQEmu/common/dynamic_zone_base.cpp` 762-772; `/mnt/frankendom-donors/EQEmu/zone/dynamic_zone.cpp` 548-556, 1577-1600.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One expiry time (start plus duration) read by the world sweep and the zone timer | Duration per template (base.cpp 704) |
| Delete only when no zone has players in the instance | Zone player count, reported by the zone server (world dz.cpp 110) |
| Grace after the last member leaves, set once and reduce-only | Early-shutdown delay 1500 s (ruletypes.h 1118); enabled by default (1117) |
| Removed member kicked after a delay unless re-added | 60000 ms (ruletypes.h 1116; zone client.cpp 10441) |
| Throttled world sweep | 6000 ms (ruletypes.h 1120; manager 141) |
| Zone start leeway for players still zoning in | 150 s floor (zone.cpp 1059-1060) |
| Shutdown window after expiry | 20000 ms (zone.cpp 1602) |
| Expiry warnings | Zone 1, 5, 15 min (zone.cpp 1611-1619); world 14-15, 4-5, 0-1 min (dz.cpp 278-280); 120000 ms cooldown (dz.cpp 284) |
| Lockout duration multiplier | 1.0 default (ruletypes.h 1111) |

## 4. TypeScript sketch

simplified: keeps the donor's roster, leader hand-over (cooldown, online-in-zone preference, retry flag), removal-kick delay, replay-lockout copy and the world sweep. It applies the empty grace the donor's rule names (reduce-only expiry, kept until it passes with no zone players) instead of the donor's same-sweep delete (defect 1). It omits the zone side (the instance timer, corpse move, gate-out and the 20-second shutdown), the expedition warnings, database writes and duration packets, the 150-second zone start floor, the lockout multiplier (defect 2), and the offline-leader case. The in-zone and online flags are inputs the caller sets (the sketch never sets them). The leader cooldown is a parameter; the donor's value was not read.

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface DzCfg {
  removalDelayMs: number;      // a removed member is kicked this long after removal (zone data)
  emptyShutdownEnabled: boolean;
  emptyShutdownS: number;      // grace kept after the last member leaves while the zone is empty (zone data)
  sweepEveryMs: number;        // world sweep interval (rule, 6000 in the donor)
  leaderCooldownMs: number;    // minimum gap between leader changes (donor value not read)
}

interface Lockout { event: string; expireAt: number; durationS: number; replay: boolean; }

interface Dz {
  id: number;
  members: Map<string, { online: boolean; inZone: boolean }>; // roster ledger keyed by character id
  leaderId: string | null;
  durationS: number;
  expireAt: number;            // ms; the one expiry the world sweep and the zone timer both read
  earlyShutdownArmed: boolean; // empty grace is applied once
  leaderDirty: boolean;        // set when a leader change was blocked by the cooldown
  lastLeaderChangeAt: number;
  pendingKick: Map<string, number>; // removed character id -> ms when the zone kicks them
  lockouts: Lockout[];
}

export class DzRegistry {
  private byId = new Map<number, Dz>();
  private nextId = 1;

  constructor(private cfg: DzCfg) {}

  create(durationS: number, memberIds: string[], now: number): Dz {
    const dz: Dz = {
      id: this.nextId++, members: new Map(), leaderId: memberIds[0] ?? null, durationS,
      expireAt: now + durationS * 1000, earlyShutdownArmed: false, leaderDirty: false,
      lastLeaderChangeAt: Number.NEGATIVE_INFINITY, pendingKick: new Map(), lockouts: [],
    };
    for (const id of memberIds) dz.members.set(id, { online: true, inZone: false });
    this.byId.set(dz.id, dz);
    return dz;
  }

  addMember(dz: Dz, charId: string): void {
    dz.members.set(charId, { online: true, inZone: false });
    dz.pendingKick.delete(charId);               // re-added before the kick: no kick
  }

  removeMember(dz: Dz, charId: string, now: number): void {
    dz.members.delete(charId);
    dz.pendingKick.set(charId, now + this.cfg.removalDelayMs);
    if (charId === dz.leaderId) this.electLeader(dz, now);
  }

  // Leader rule: prefer a non-leader member who is in the zone, else any non-leader member. Blocked by a cooldown; retried later.
  electLeader(dz: Dz, now: number): void {
    if (dz.members.size === 0 || now - dz.lastLeaderChangeAt < this.cfg.leaderCooldownMs) {
      dz.leaderDirty = true;
      return;
    }
    const others = [...dz.members.keys()].filter(id => id !== dz.leaderId);
    const pick = others.find(id => dz.members.get(id)?.inZone === true) ?? others[0];
    if (pick !== undefined) {
      dz.leaderId = pick;
      dz.lastLeaderChangeAt = now;
      dz.leaderDirty = false;
    }
  }

  // Character ids whose removal kick is due. Called on each zone tick for that instance.
  dueKicks(dz: Dz, now: number): string[] {
    const due: string[] = [];
    for (const [charId, at] of dz.pendingKick) {
      if (now >= at && !dz.members.has(charId)) {
        due.push(charId);
        dz.pendingKick.delete(charId);
      }
    }
    return due;
  }

  // A joining member gets a fresh copy of the instance's replay timer, unless they already have one.
  joinLockouts(dz: Dz, charLockouts: Lockout[], now: number): Lockout[] {
    const replay = dz.lockouts.find(l => l.replay);
    if (!replay || charLockouts.some(l => l.replay)) return charLockouts;
    return [...charLockouts, { ...replay, expireAt: now + replay.durationS * 1000 }];
  }

  // World sweep, every cfg.sweepEveryMs. zonePlayers returns undefined when no zone runs the instance.
  sweep(now: number, zonePlayers: (dzId: number) => number | undefined): number[] {
    const gone: number[] = [];
    for (const dz of this.byId.values()) {
      if (dz.members.size === 0 && this.cfg.emptyShutdownEnabled && !dz.earlyShutdownArmed) {
        dz.earlyShutdownArmed = true;
        dz.expireAt = Math.min(dz.expireAt, now + this.cfg.emptyShutdownS * 1000); // reduce only, once
      }
      if (now < dz.expireAt) continue;
      if ((zonePlayers(dz.id) ?? 0) > 0) continue; // zone still has people; its own kick timers move them out
      gone.push(dz.id);
    }
    for (const id of gone) this.byId.delete(id);
    return gone;
  }
}

export {};
```

## 5. Lands in

- TARGET `origins/server/instances.ts` (new, shared with cell 2): the party instance roster, expiry sweep and removal kicks, owned by the zone runtime. Parity-checklist row 23 (zone population: despawn on empty with a grace timer). The sweep is a throttled timer, so in Frankendom it is a call inside the fixed server tick (sub-line "server tick: fixed step, input intake, per-tick NPC budget", row 18 / post-K item 3).
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: 23 (despawn on empty with a grace timer; zones as data); one ledger (the roster lives in the engine, zones are clients)

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism.
- Two clocks and two rosters. The world holds the authoritative roster and expiry (database rows and cache), while the zone holds its own copy, its own expiry timer and its own kick timers. Frankendom's one-ledger ruling means the roster and expiry live only in the engine; zones read them.
- Defects found in the donor, each with its fix:
  1. The empty grace does not hold. In world dz.cpp 110-117 the early-shutdown branch runs only when the zone has no players, which is also the ExpiredEmpty branch. The sweep (manager 154-160) then deletes the instance in the same call. So the 1500-second rule (ruletypes.h 1118) sets an expiry that is never used. fix: as in the sketch, arm a reduce-only expiry once when the party empties and keep the instance until it passes with no zone players.
  2. Lockout multiplier applied to some writes only. Character rows get the multiplied seconds (base 767-768; zone dz.cpp 1598-1599), while the in-memory lockout and the client packet use the unscaled seconds (base 764, 770-771; zone dz.cpp 1587, 1592). The default is 1.0 (ruletypes.h 1111), so this shows only when the rule is changed; then a relog would show a different timer from the one the player saw. fix: scale once, before building the lockout, the packet and the rows. Test: set the multiplier to 0.5 and compare the client packet with the stored row.
  3. The zone start floor clamps the expiry timer. The zone uses at least 150 seconds (zone.cpp 1059-1060), so it can outlive the database expiry by up to 140 seconds at zone start. A later duration update resets the zone timer (zone dz.cpp 253-264). fix: treat the 150 seconds as a grace for a player still zoning in, not as a floor on the expiry.
  4. Zone warnings depend on a poll. The 1, 5 and 15 minute checks fire only inside 5-second windows (zone.cpp 1611-1622), so a poll slower than 5 seconds misses them. The zone poll rate was not read. fix: send each threshold once with a sent flag, as the world's 2-minute cooldown does (dz.cpp 284).
  5. Self-declared gap. The comment at zone dz.cpp 595-596 says live keeps removed members as temporary members for the kick duration and lockouts across zones, and marks the lockout part unimplemented. fix: not needed in Frankendom if lockouts live in the one ledger.
- Not read, so not claimed: the zone poll rate, the member-save failure path (SaveMembers), the PurgeExpiredDynamicZones call site, and the message handlers beyond the grep. Kill and loot ownership for a party run (for server-verified kills) is not in the code read; the instance's loot and kill ledger is not claimed.
