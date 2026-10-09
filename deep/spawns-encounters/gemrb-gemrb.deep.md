# gemrb-gemrb (spawns-encounters, cell 4)

Donor: /mnt/frankendom-donors/gemrb-gemrb/gemrb/core/IniSpawn.cpp | Licence: GPL-2.0-or-later per SPDX header in IniSpawn.cpp (repo COPYING is GPL-2 text) | C++ | symbol IniSpawn::SpawnGroup / SpawnCreature (opened: SelectSpawnPoint 152-208, SpawnCreature 628-785, SpawnGroup 787-814, InitialSpawn 817-835, ExitSpawn 837-840, CheckSpawn 843-848; Schedule in /mnt/frankendom-donors/gemrb-gemrb/gemrb/core/Core.cpp 259-262)

## 1. Mechanism

- Spawns are declared in an area's spawn INI (a PST feature, per the comment at Map.cpp 932). The INI's `spawn_main` section names an `enter` entry, an `exit` entry and a list of `events` (IniSpawn.cpp 99-115, read in the constructor). Each entry has an `interval` (raised to at least 15, line 538 of the same file) and a list of critters; each critter has creature files, `create_qty` (default: `spec_qty`), `spec_qty` as the total quantity (default 1), a point definition, a time-of-day mask (default all hours; a 24-character string can switch hours off) and gating flags. The parsing (`ReadSpawnEntry`, 210-540) was only skimmed at those lines.
- `InitialSpawn()` (817-835) runs `SpawnGroup(enterspawn)`, sets the area locals and, if a party spawn point is defined, moves the extra party members away. It is called at the end of the INI set-up (the line after the `events` read, marked "maybe not correct" in the source), not from a separate area-enter hook. `ExitSpawn()` (837-840) runs the exit group; it is called from Game.cpp 762. `CheckSpawn()` (843-848) runs every event group and is the respawn path; it is called from Map.cpp 934 inside the map's update function (the function name and its call rate were not read, only lines 925-934).
- `SpawnGroup` (787-814) returns at once if the entry has no critters. It returns if the interval has not elapsed: `lastSpawndate + interval >= gameTime`, tested only when both the interval and the game time are non-zero. For each critter it tests `Schedule(critter.TimeOfDay, event.lastSpawndate)`: note that the time passed is the event's last spawn date, not the current time, so the hour tested is the hour of the previous spawn (zero before the first). If that passes it spawns `SpawnCount` copies; each copy calls `SelectSpawnPoint` (except copies after the first when the hold-point flag is set), then `SpawnCreature`. After each critter that passed the schedule test (once its copies are done) it stamps `event.lastSpawndate = gameTime`, so later critters of the same event are tested against the new stamp.
- `Schedule` (Core.cpp 259-262) is `(schedule & SCHEDULE_MASK(time)) != 0`; per the comment, hours are offset by half an hour (bit 0 covers 00:30 to 01:29).
- `SpawnCreature` (628-785) returns early on: an empty creature list; a spec-variable check that fails (when a spec variable is named: its comparison with the operator and value, or, with no operator, the variable must be non-zero, 634-651); the spawn point being visible to the player unless the ignore-can-see flag is set (653); a difficulty bit set for this area (only when the no-difficulty mask flag is on; area difficulty 1, 2 or 4, 657-677); then one of two alternatives: if the critter has a script name and the check-name flag, an actor with that name already on the map (679-684); otherwise the count of map objects matching the 9 spec fields (`GetObjectCount`) at or above `TotalQuantity` (685-696). Otherwise it rolls one creature file (`Roll(1, size, -1)`), loads it (returns if missing), optionally bumps the point-index variable and the spec variable, adds the actor to the map, sets chosen stats, position and orientation, script name, appearance and death-counter flags, up to seven script slots, and the dialogue.
- `SelectSpawnPoint` (152-208): mode `e` returns at once (the point was read from a variable). With the safest-point flag it walks every point and keeps the last one not visible to the player (no break); if none is found it falls through to the normal path rather than to a fixed first point. The normal path picks index 0 (`s` single), a random index (`r`, `Roll(1, count, -1)`), or the index in a variable modulo the count (`i`). The orientation comes from the point definition, else a second orientation value, else a random one of 16. The chosen point and facing may be saved to variables.
- Output: new actors on the area map. Trigger: area set-up, area exit, and the map update's `CheckSpawn` call gated by the interval; there is no separate timer.

## 2. Key functions

| Name | Path | Lines | What it does |
|---|---|---|---|
| IniSpawn::InitialSpawn | /mnt/frankendom-donors/gemrb-gemrb/gemrb/core/IniSpawn.cpp | 817-835 | Runs the enter spawn group, sets area locals, moves extra party members |
| IniSpawn::CheckSpawn | /mnt/frankendom-donors/gemrb-gemrb/gemrb/core/IniSpawn.cpp | 843-848 | Runs every event spawn group (the respawn path) |
| IniSpawn::SpawnGroup | /mnt/frankendom-donors/gemrb-gemrb/gemrb/core/IniSpawn.cpp | 787-814 | Interval gate, schedule gate (tested against the last spawn date), spawn-count loop, stamps last spawn time |
| IniSpawn::SpawnCreature | /mnt/frankendom-donors/gemrb-gemrb/gemrb/core/IniSpawn.cpp | 628-785 | Variable, visibility, difficulty gates, then a name check or a quantity check; rolls the creature and creates it |
| IniSpawn::SelectSpawnPoint | /mnt/frankendom-donors/gemrb-gemrb/gemrb/core/IniSpawn.cpp | 152-208 | Chooses the spawn point by mode (single, random, indexed, preset) with an optional safest-point pass |
| Schedule | /mnt/frankendom-donors/gemrb-gemrb/gemrb/core/Core.cpp | 259-262 | Tests a time-of-day bit mask against a game time (SpawnGroup passes the last spawn date) |

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Interval-gated group respawn, stamped with last spawn time | Interval from the INI, minimum 15, compared with `Game::GameTime` (an atomic uint32 starting at 0, Game.h 253; the unit is not stated there, the journal-entry field at Game.h 124 comments "in game time seconds") (theirs, IniSpawn.cpp 537-538) |
| Hide-from-view spawn: spawn only where the player cannot see | Visibility test via map IsVisible (theirs, lines 171 and 653) |
| Population cap: count existing objects against a quota before spawning | Quota per critter, default 1 (theirs, line 443 of the INI reader) |
| Difficulty gate by bit mask on area difficulty | Difficulty values 1, 2, 4 map to bits (theirs, 661-670) |
| Random pick from a list, plus indexed or safest point selection | Point selection modes r, i, s, e (theirs, 154-189) |

## 4. TypeScript sketch

Licence: GPL-2. CLEAN-ROOM sketch: written from the mechanism above, not translated from the donor.

simplified: one critter stands for a whole event (the donor loops critters and stamps the event's last-spawn date after each one that passes the schedule); the schedule is tested against the current hour, where the donor tests the event's last spawn date; the spec-variable, difficulty and name gates, the point-selection modes (the `pickPoint` callback; the donor's safest-point pass keeps the last hidden point), the hold-point flag, orientation and all creature set-up are omitted; the quota is one count of live creatures plus copies already made in this call, where the donor recounts per copy and the visibility test comes before the quota test; a failed copy does not end the loop in the donor (it returns from `SpawnCreature` only), whereas the sketch `break`s on the quota.

```ts
// clean-room sketch of an interval-gated, quota-capped spawn group.
// Licence line: GPL-2 donor; this sketch is clean-room, written from mechanism only.
interface SpawnEntry {
  creatures: string[];
  count: number;        // copies per trigger
  quota: number;        // max alive at once
  intervalSeconds: number;
  schedule: number;     // bit mask over hours
  lastSpawnAt: number;
  hideFromPlayer: boolean;
}
interface World {
  now(): number;
  hourOf(t: number): number;
  alive(tag: string): number;
  visibleToPlayer(p: { x: number; y: number }): boolean;
  pickPoint(e: SpawnEntry): { x: number; y: number } | undefined;
  create(creature: string, p: { x: number; y: number }): void;
  rand(n: number): number;
}
function spawnGroup(e: SpawnEntry, w: World, tag: string): void {
  if (e.creatures.length === 0) return;
  const t = w.now();
  if (e.intervalSeconds > 0 && t > 0 && e.lastSpawnAt + e.intervalSeconds >= t) return;
  if ((e.schedule & (1 << w.hourOf(t))) === 0) return;
  const alive = w.alive(tag);
  for (let i = 0; i < e.count; i++) {
    if (alive + i >= e.quota) break;
    const p = w.pickPoint(e);
    if (!p) continue;
    if (e.hideFromPlayer && w.visibleToPlayer(p)) continue;
    const creature = e.creatures[w.rand(e.creatures.length)];
    w.create(creature, p);
  }
  e.lastSpawnAt = t;
}
```

## 5. Lands in

- TARGET origins/server/world-spawns.ts (the server's per-spawn alive / respawn state, seeded) with the zone data in origins/mobs/populate.ts (camps from rows + zone Params + seed). Both already give a respawn window per row (`respawnSeconds`); what is genuinely new from this donor is (1) a "not in view of the player" test before a creature reappears and (2) a per-entry live-count quota, both of which need the server's presence data (origins/server/world-spawns.ts reads presence's pose for reach checks). Not src/fight/ai.ts. Checklist row 4 (fight loop: what appears near the player); feature map: zones as data.
- Parity-checklist row: 4.
Reuse tag: rewrite-from-idea
Brief rule served: 4 (zones are data on one runtime); rules 7-9 n/a

## 6. Gaps and risks

- Zones as data: the donor's spawn tables are INI data with flags and a point list; Frankendom's equivalent is rows + the zone's layout landmarks. The time-of-day mask has no counterpart (src/nightfall-timing.ts is visuals only); a schedule would be a new row field, not code.
- Server-verified kills: the donor's `Roll` draws are unseeded and its gates read live world state. Frankendom's respawn, visibility test and quota must run on the server (origins/server/world-spawns.ts) from the seeded stream, or the server cannot replay which creature stood where.
- One ledger: a respawn must not reopen a paid kill; the paid window is the per-account respawn window in origins/server/mob-rewards.ts, not the entry's `lastSpawndate`.
- Hide-from-view spawning needs a visibility rule the server can compute from zone geometry; the donor uses the live map's `IsVisible`. Without it the gate cannot be copied.
- MAX_ATTACKERS = 3: a quota of creatures alive says nothing about how many are engaged on one player; the ring cap is separate (src/fight/world.ts).
- The donor's schedule gate tests the previous spawn's hour, not the present hour, which looks like a quirk; do not copy it.
