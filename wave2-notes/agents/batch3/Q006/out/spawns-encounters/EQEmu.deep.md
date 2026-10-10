# EQEmu (spawns-encounters, cell 4)

Donor: `/mnt/frankendom-donors/EQEmu/zone/spawn2.cpp` | Licence: GPL-3.0 (LICENSE.md: "Version 3, 29 June 2007"; zone/spawn2.h header: "either version 3 of the License, or (at your option) any later version") | C++ | symbol `Spawn2::Process`

Checked: Read in full: `Spawn2::Process` (zone/spawn2.cpp 152-353), `resetTimer` and `despawnTimer` (118-150), `Reset`, `Depop`, `Repop`, `ForceDespawn`, `DeathReset` (381-471), the constructor (77-112). Read `SpawnGroup::GetNPCType` (zone/spawngroup.cpp 71-119), the zone-wide limit functions (zone/entity.cpp 4227-4300), the spawn loop (zone/zone.cpp 956, 1524-1535), the death hooks (zone/attack.cpp 2605, 2845; zone/npc.cpp 842-865), `IsEngaged` (zone/mob.h 783), and the donor's own description of despawn modes (changelog.txt 4280-4287). Callers: `ForceDespawn` and `DeathReset` callers found by grep (attack.cpp, npc.cpp, zone.cpp, lua/perl wrappers); the Lua/Perl wrappers were not opened. Not read: the spawn-condition manager and time-of-day events (spawn2.cpp 737-1380; only `Spawn2::SpawnConditionChanged`, 640-700, was read), `PopulateZoneSpawnList` (475-587), the body of `NPC::Depop` beyond line 842-865, and the RNG semantics of `zone->random.Int` (assumed inclusive; not read). Confidence: high on the timers, the pick and the caps (read end to end). Medium on the despawn cycle and the engaged path: I traced them by hand from the code and the changelog; I did not run them. camera_scope: not applicable.

Best transferable idea: a spawn point that owns its own respawn timer with variance, a weighted pick that skips types and groups at their cap, and a per-point lifetime rule that depops a live NPC and re-rolls.

Decision (proposed): adapt - take the per-point respawn timer with variance and the per-type and per-group caps for zone population (row 23); do not copy the despawn modes as numbered options or the engaged path, which as read spawns a second NPC at a point.

Acceptance: a server test in a zone whose spawn group is capped at 3 live NPCs: after 10 kills the live count never exceeds 3, each point's respawn falls inside respawn +/- variance/2 seconds, and an NPC with aggro is never replaced.

## 1. Mechanism

- A spawn point (`Spawn2`) owns one timer and at most one live NPC (`npcthis`). Its spawn group picks the NPC type at spawn time (208), and the point keeps the NPC pointer (287). The zone calls `Process()` on every point once per second (`spawn2_timer(1000)` at zone.cpp 956; loop at 1524-1531).
- Early exit (161): a live NPC holds the point and the point has no despawn rule (`despawn == 0`), or the point has a spawn condition. Nothing else runs.
- Timer gate (165): nothing happens until the point timer fires.
- Order of steps when the timer fires:
  - (a) Spawn-condition gate (172-176): if the point has a condition and it is not met, reset the timer and stop.
  - (b) Group pick (208): `GetNPCType(condition_value)`. A group at its cap returns 0 (spawngroup.cpp 76-77). Entries are skipped when their type is at its zone cap (84-85), when their time window does not match (89-91), or when their condition filter differs (94-95). The rest are chosen by a weighted roll over the chances (98-111). If nothing is picked, the point resets to a fresh respawn timer (214).
  - (c) Gates on the picked type: a unique-by-name type with a live copy retries in 5 s (232-235); a type at its `spawn_limit` retries in 5 s (240-243).
  - (d) Despawn rule (256-257): if the group's `despawn` is not 0, the NPC is not `ignore_despawn`, and the condition is 0, call `zone->Despawn(spawn2_id)`, which runs `ForceDespawn` on the point (407-450). For a group with `despawn` not 0, `ForceDespawn` runs before every spawn, whether or not an NPC is alive.
  - (e) Create the NPC (`new NPC`), set `npcthis`, add it to the zone ledger (309).
- Timers (`resetTimer`, 118-133): base = respawn seconds x 1000. If variance is not 0, the timer is drawn between base - half and base + half, where half = variance x 1000 / 2. Floor 100 ms. `despawnTimer` (135-150) does the same with despawn_timer.
- Death (attack.cpp 2605): `DeathReset(1)` draws a fresh respawn timer, clears `npcthis`, adds one to the kill count, and writes the respawn time to the database (453-470). The zone ledger entry is removed on the death path (attack.cpp 2845) and when the NPC leaves the entity list (entity.cpp 2811).
- Despawn modes (`sg->despawn`, read at 416-449; the donor's own description is changelog.txt 4280-4287):
  - Mode 0: no rule. A live NPC holds the point until it dies.
  - Mode 1: when the point timer fires on a live, non-engaged NPC: depop it (`Depop(false)` clears the point timer, npc.cpp 863), restart the point timer with a respawn draw (438-449), then spawn a new NPC in the same call.
  - Mode 2: the same, but the restarted timer is a despawn_timer draw (443-449). The NPC is replaced after despawn_timer +/- variance/2.
  - Mode 3: when the point timer fires on a live, non-engaged NPC: `Depop(true)` (420), which calls `DeathReset` (npc.cpp 861) and so waits a respawn draw. `IsDespawned` is set and the spawn in that call is skipped (260-262).
  - Mode 4: as mode 3, but the lifetime is set at spawn time from despawn_timer (443-449), so the NPC lives despawn_timer +/- variance/2 before it is depopped and then waits a respawn draw.
- Engaged path (416): `ForceDespawn` does not depop an NPC whose hate list is not empty (`IsEngaged`, mob.h 783). It still restarts the point timer (449), and the spawn in the same call creates a second NPC and overwrites `npcthis` (287). As read, the first NPC is left alive and no longer tracked by the point. Not run.

## 2. Key functions

- `Spawn2::Process`: `/mnt/frankendom-donors/EQEmu/zone/spawn2.cpp` 152-353. Early exit (161), timer gate (165), condition gate (172-176), group pick (208), unique and limit retries (232-243), despawn rule (256-257), create and register (287-309).
- `Spawn2::resetTimer`: `/mnt/frankendom-donors/EQEmu/zone/spawn2.cpp` 118-133. Respawn draw with variance, floor 100 ms.
- `Spawn2::despawnTimer`: `/mnt/frankendom-donors/EQEmu/zone/spawn2.cpp` 135-150. Same shape, despawn_timer input.
- `Spawn2::ForceDespawn`: `/mnt/frankendom-donors/EQEmu/zone/spawn2.cpp` 407-450. The four despawn modes (416-449).
- `Spawn2::DeathReset`: `/mnt/frankendom-donors/EQEmu/zone/spawn2.cpp` 453-471. Respawn draw, pointer cleared, kill count, database write.
- `SpawnGroup::GetNPCType`: `/mnt/frankendom-donors/EQEmu/zone/spawngroup.cpp` 71-119. Group cap, type cap, time window, condition filter, weighted roll.
- `EntityList::LimitCheckType` and `LimitCheckGroup`: `/mnt/frankendom-donors/EQEmu/zone/entity.cpp` 4252-4292. Count live NPCs of a type or a group against a limit; a limit below 1 means no limit.
- Spawn loop: `/mnt/frankendom-donors/EQEmu/zone/zone.cpp` 1524-1535 (driven by `spawn2_timer(1000)` at 956).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Respawn timer = base +/- half the variance | Variance is a per-point field from the spawn table (not read); the spread is +/- variance/2 seconds (spawn2.cpp 123-124) |
| Timer floor | 100 ms (spawn2.cpp 127-128) |
| Blocked spawn retries after a short delay | 5000 ms, used for both the unique gate and the type limit (spawn2.cpp 234, 242) |
| Weighted pick | Chance per entry; total is summed (spawngroup.cpp 98); roll in [0, total - 1] (107); entry wins when roll < chance (110) |
| Caps | Per group `spawn_limit` (spawngroup.cpp 76); per entry `npc_spawn_limit` (84); per type `spawn_limit` on npc_types (spawn2.cpp 240). A value below 1 means no limit (entity.cpp 4254, 4276) |
| Lifetime rule | Despawn mode 0-4 (spawn2.cpp 416-449); despawn_timer in seconds (changelog.txt 4280-4287) |
| Point loop | 1000 ms (zone.cpp 956) |
| Death reset | Respawn draw (spawn2.cpp 456) |

The numbers are data. The respawn, variance, group cap, type cap and despawn settings are per point or per type in the donor's content tables (zone data). The 100 ms floor, the 5 s retry and the 1 s loop are fixed rules of the engine.

## 4. TypeScript sketch

simplified: the sketch follows the donor order for a timer fire, a death and a fresh spawn: lifetime, then pick, then ledger. It omits the spawn-condition gate and events, the time-of-day window, the unique-by-name gate, the per-type `spawn_limit` retry after the pick, the waypoint and grid start, the `ignore_despawn` skip, and the database write. It changes one thing on purpose: when the NPC is engaged, the donor leaves it alive and still spawns a second one at the point (spawn2.cpp 416-449, then 287 overwrites `npcthis`); the sketch skips the spawn while the NPC is engaged instead, which is the rule Frankendom needs. The `Ledger` counts live NPCs by type and by group, as the zone ledger does.

```ts
// Licence: GPL-3.0 (donor, EQEmu). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Despawn = 0 | 1 | 2 | 3 | 4;
type Rng = () => number; // uniform in [0, 1)

interface Entry { npcType: number; chance: number; typeLimit: number; filter: number; }
interface Group { id: number; groupLimit: number; entries: Entry[]; despawn: Despawn; despawnTimerS: number; }

interface Point {
  respawnS: number;        // respawn time of this spawn point, seconds
  varianceS: number;       // spread, seconds (+/- half of it)
  group: Group;
  alive: number | null;    // npcType of the live NPC at this point, or null
  engaged: boolean;        // NPC has aggro (hate list not empty)
  dueAt: number | null;    // ms timestamp of the next action; null = no timer
}

interface Ledger { byType: Map<number, number>; byGroup: Map<number, number>; } // live NPC counts

const bump = (m: Map<number, number>, k: number, d: number): void => { m.set(k, (m.get(k) ?? 0) + d); };
const count = (m: Map<number, number>, k: number): number => m.get(k) ?? 0;

// Timer with variance: base +/- half the variance, never below 100 ms.
function jitterMs(baseS: number, varS: number, rnd: Rng): number {
  const base = baseS * 1000;
  if (varS === 0) return base;
  const half = Math.floor((varS * 1000) / 2);
  return Math.max(100, base - half + Math.floor(rnd() * (2 * half + 1)));
}

// Lifetime of a live NPC under the despawn rule: modes 1 and 3 use the respawn time, 2 and 4 use despawn_timer.
function lifetimeMs(p: Point, rnd: Rng): number {
  const g = p.group;
  const s = g.despawn === 2 || g.despawn === 4 ? g.despawnTimerS : p.respawnS;
  return jitterMs(s, p.varianceS, rnd);
}

// Weighted pick. A group at its cap picks nothing; a type at its cap or on the wrong filter is skipped.
function pickNpc(g: Group, led: Ledger, condValue: number, rnd: Rng): number {
  if (g.groupLimit >= 1 && count(led.byGroup, g.id) >= g.groupLimit) return 0;
  const open = g.entries.filter(e =>
    e.filter === condValue && (e.typeLimit < 1 || count(led.byType, e.npcType) < e.typeLimit));
  const total = open.reduce((s, e) => s + e.chance, 0);
  if (total === 0) return 0;
  let roll = Math.floor(rnd() * total);
  for (const e of open) {
    if (roll < e.chance) return e.npcType;
    roll -= e.chance;
  }
  return 0;
}

// The NPC died: it leaves the ledger and the point waits one respawn interval.
function onDeath(p: Point, led: Ledger, now: number, rnd: Rng): void {
  if (p.alive !== null) { bump(led.byType, p.alive, -1); bump(led.byGroup, p.group.id, -1); }
  p.alive = null;
  p.engaged = false;
  p.dueAt = now + jitterMs(p.respawnS, p.varianceS, rnd);
}

// Called once per second for every point. Returns the npcType spawned on this call, or 0.
function tick(p: Point, led: Ledger, now: number, rnd: Rng): number {
  const g = p.group;
  if (p.alive !== null && g.despawn === 0) return 0;      // a live NPC holds the point
  if (p.dueAt === null || now < p.dueAt) return 0;        // timer not due yet
  p.dueAt = null;

  if (p.alive !== null) {                                 // the point's despawn rule fires on a live NPC
    if (p.engaged) {                                      // simplified: skip the spawn while engaged (see note)
      p.dueAt = now + lifetimeMs(p, rnd);
      return 0;
    }
    bump(led.byType, p.alive, -1);
    bump(led.byGroup, g.id, -1);
    p.alive = null;
    if (g.despawn === 3 || g.despawn === 4) {             // depop only, then wait the respawn time
      p.dueAt = now + jitterMs(p.respawnS, p.varianceS, rnd);
      return 0;
    }
  }

  if (g.despawn !== 0) p.dueAt = now + lifetimeMs(p, rnd); // modes 1 and 2 restart the cycle before spawning
  const npcType = pickNpc(g, led, 1, rnd);                 // no spawn condition modelled: value 1
  if (npcType === 0) {                                     // nothing eligible: try again after one respawn interval
    p.dueAt = now + jitterMs(p.respawnS, p.varianceS, rnd);
    return 0;
  }
  p.alive = npcType;
  bump(led.byType, npcType, 1);
  bump(led.byGroup, g.id, 1);
  return npcType;
}
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population on the server: one spawn point owns one timer and at most one NPC; the caps and the despawn rule are zone data). Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer).
- today: not read (Frankendom side not opened in this pass).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: zones as data (respawn, variance, group cap, type cap and despawn mode are per-zone fields); one engine (the spawn loop runs on the server, not the client); rules 7-9 n/a

## 6. Gaps and risks

- GPL-3.0 (LICENSE.md and the header of zone/spawn2.h): clean-room only. The sketch is written from the mechanism, not translated.
- Row 23 says "despawn on empty with a grace timer". EQEmu does not do that. Its despawn is a per-point lifetime (modes 1-4), not an on-empty rule. The grace-timer idea is not in this donor, so Frankendom would need its own rule, not a borrowed one.
- Engaged path: as read, a point whose NPC is engaged gets a second NPC (spawn2.cpp 416-449, then 287). That breaks the one-ledger and server-verified rulings. The sketch skips the spawn instead. Test it before copying anything from the donor.
- Two removal points for the ledger: the death path (attack.cpp 2845) and the list removal (entity.cpp 2811). Frankendom should decrement once, in one place, on the server.
- Despawn modes 1-4 remove a live, unengaged NPC on a timer. In the code read, that path is `Depop` (npc.cpp 842), not the death path (attack.cpp 2605), and that path calls `DeathReset()` with realdeath false (npc.cpp 861), so the kill count (spawn2.cpp 464) is not incremented. What loot or XP the donor pays on depop was not read. Frankendom must make sure a timed depop awards nothing and is not a server-verified kill.
- The point's zone-wide type limit is checked in two places (inside the pick, entity.cpp 4252 via spawngroup.cpp 84; and again at spawn2.cpp 240). Frankendom should check caps once, at the pick.
- `ignore_despawn` NPCs return before a spawn (spawn2.cpp 252-254) and the point timer was disabled at 166; what the point does next was not traced.
- Variance is +/- half, not +/- full (spawn2.cpp 123). Frankendom's zone data must say which it means.
- The RNG bounds of `zone->random.Int` were not read. The sketch treats the draw as an inclusive integer range.
- `NPC::Depop` (npc.cpp 842) and the time-of-day and condition events (spawn2.cpp 737-1380) were not read in full; this note does not rely on them.



## Checker findings (Sonnet 5.5 medium, 2026-10-10)
**Verdict: CLEAN.** Independent check against the donor code.

**Errors / corrections:** Process early exit 161, timer gate 165, condition gate 172-177, GetNPCType caps/time/filter/weighted roll 71-119, 5 s retries 234/242, despawn call 256-257, resetTimer +/- variance/2 with 100 ms floor, ForceDespawn modes 1-4 and engaged fall-through creating a second NPC (416-449 then 287), Depop(true)->DeathReset() with realdeath default false (spawn2.h 48), limit checks entity.cpp 4252-4292, 1000 ms loop zone.cpp 956/1524, GPL-3 all match.

**Missed:** Spawn2::Enabled() gate and m_resumed_npc_id path (152-157, 204-206) not mentioned; roamdist init. Minor.
