# ModernUO (city-map-design, cell 20)

Donor: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Regions/GuardedRegion.cs` (with `Projects/Server/Regions/Region.cs`, `Projects/Server/Maps/Map.cs`, `Distribution/Data/regions.json`) | Licence: GPL-3.0 (repo `/mnt/frankendom-donors/ModernUO/LICENSE`, GNU GPL version 3) | C# | symbol `GuardedRegion` (zone lookup: `Region.Find(Point3D)`)

Checked: Read in full: `GuardedRegion.cs` (1-367), `TownRegion.cs`, `RegionJsonRegistration.cs`, `Items/Maps/CityMap.cs`, `Server/CityInfo.cs` (a data record only), `Server/Maps/Map.cs` 57-58 and 1853-1875 and 1958-1990. Read in part: `Server/Regions/Region.cs` 126, 140-180, 214-253, 291-312, 329-381, 419-432; `Mobiles/Guards/BaseGuard.cs` 11-75 and 195-225 (plus 76-110); `Mobiles/Guards/WarriorGuard.cs` 130-152; `Mobiles/BaseCreature.cs` 3105-3118; `regions.json` (line ranges 116-121, 684-700, 1187, 3756, and python counts over the whole file). Callers: all four `CheckGuardCandidate` callers read (`GuardedRegion.cs` 174-177, 203-205, 220-222, 232); `CallGuards` has two callers, `GuardedRegion.OnSpeech` (195) and `BaseCreature.cs` 3113 (read); `BaseGuard.Spawn` has three callers (`GuardedRegion` 282, 326, and `BaseGuard.cs` 219), all read. `Region.Find(Point3D)` has many callers, not checked; this note describes the function, not its callers. Not read: `Rectangle3D.Contains` (assumed half-open in the sketch), `Map.GetMobilesInRange` shape (box or circle), the `Timer` class (the timing reads assume `Timer(delay, interval, count)`), `BaseRegion.MakeGuard` (base), `IsHumanInTown`, the value of `Core.AOS`, where `Dynamic = false` is set, and `GuardIdleTimer`. Camera: not applicable. Confidence: high on the zone lookup order and the guard-call flow; medium on the reinforcement timing (Timer signature assumed).

Best transferable idea: Model a city as one zone made of several rectangles, with child zones that inherit its rules and per-zone flags; resolve a point by priority, then child depth; and give every crime in a guarded zone a 15-second call window that is renewed by each new crime and brings guards in, with a dead guard starting three reinforcement waves.
Decision (proposed): adapt — take the zone shape (union of rectangles, child zones, a per-zone guard flag, rank by priority then depth) and the guard-call window; change the reinforcement to stop at MAX_ATTACKERS = 3 and tie it to the engine's fight loop, not free-standing spawns.
Acceptance: Server test: a point inside a town rectangle and inside a child farm rectangle resolves to the farm; a zone with `guardsDisabled` never opens a guard window; a first crime opens a 15 s window and a second crime inside it renews it; a dead guard starts exactly three reinforcement waves at 2.5 s, 3.5 s and 4.5 s, each recruiting an idle guard first, and the number of guards on one player never exceeds 3.

## 1. Mechanism

- A town is one `TownRegion` entry in `regions.json` (line 118), a named zone with a list of rectangles, each with its own z range. Britain's Felucca entry starts at 117 (name at 120). Child zones name the town as `Parent` (137); named child zones are fields, and 34 `TownRegion` entries carry `NoLogoutDelay`. The `regions.json` count (python, not receipted): 116 `TownRegion` entries, 70 with a parent and 46 top level; 6 `GuardedRegion` entries (moongate and arena zones; `regions.json` line 1187 is one); 10 `TownRegion` entries plus `NPC Encampment` (a `BaseRegion`) with `GuardsDisabled: true`.
- Rank: a child built with a parent takes the parent's priority (`Region.cs` 176); the default is 50 (126). Each region is registered into every 16x16-tile sector its rectangles touch (`Region.cs` 352-377 with `Map.cs` `SectorShift` = 4, line 58; sector size 16 at line 57). Each sector keeps its list sorted (`Map.cs` 1967). The sort, `CompareTo` (`Region.cs` 238-252): dynamic zones first; then higher priority; then deeper child level. So a farm inside Britain (same priority, deeper) ranks ahead of Britain.
- Lookup `Find(Point3D)` (`Region.cs` 291-312): take the point's sector (298); return the first region whose `Contains` is true (305); otherwise the map's default region (311). `Contains` is an OR over the region's rectangles (419-432).
- Guard flags on `GuardedRegion` (`GuardedRegion.cs`): `GuardsDisabled` (33) switches guards off for the zone, checked before any candidate logic (169-172, 188-191, 213-215, 230-233). `AllowReds` is `Core.AOS` (35). Towns forbid housing (151) and block spell casting unless `OnCastInTown` (140-149).
- Candidate: a player becomes a guard candidate through four routes: entering a zone as a murderer when reds are not allowed (174-177); aggression by a criminal (203-205); helping a criminal or murderer (220-222); a criminal action (232). `IsGuardCandidate` (337-345): not a guard, alive, not an invulnerable creature, and (murderer when reds are not allowed) or criminal.
- Call window (`CheckGuardCandidate`, 236-297): the first crime for a candidate starts a 15 s timer (352) and a message (249). Then it scans for a townsperson within 8 tiles (261): a `BaseCreature` that is `IsHumanInTown`, or a non-player human body inside this zone (263-264); it picks the nearest (269-275). If one is found it says a line (280), calls `BaseGuard.Spawn(fakeCall, m)` (282), and removes the candidate (284). A repeat crime while the window is open restarts the timer (292-296). When the timer ends the candidate is removed (359-365).
- Shout call (`CallGuards`, 299-333): triggered by a speech keyword `*guards*` (`OnSpeech` 193-195) or by a `BaseCreature` path (`BaseCreature.cs` 3108-3113; its trigger was not read in full). It takes every mob within 14 tiles (303) that is a candidate and either is in the table (any region) or is always a candidate and in this zone (312). Each is removed from the table and given to `BaseGuard.Spawn(this, m)` (326).
- Spawn (`BaseGuard.cs` 20-48): `amount` defaults to 1. It counts guards within 15 tiles of the target (30). An idle guard (`Focus == null`) is given to the target and counts against `amount` (32-37). A guard already focused on the target counts too, unless `onlyAdditional` (38-41). The rest are made by `region.MakeGuard(target)` (44-47) in the caller's region.
- Reinforcement: when a warrior guard dies while its focus is alive (`WarriorGuard.cs` 143-147), it starts `GuardAvengeTimer(focus)`. The archer guard does the same at `ArcherGuard.cs` 131 (surrounding code not read). The timer is built with a 2.5 s delay, a 1.0 s interval and 3 ticks (`BaseGuard.cs` 216; the `Timer` signature is assumed). Each tick calls `BaseGuard.Spawn(focus, focus, 1, true)` (219): an idle guard within 15 tiles is recruited first; guards already on the focus do not count (`onlyAdditional`); otherwise one new guard is made.

## 2. Key functions

- `GuardedRegion.CheckGuardCandidate`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Regions/GuardedRegion.cs` 236-297. The call window, the shout scan, the immediate call.
- `GuardedRegion.CallGuards`: same file 299-333. The 14-tile shout call with the table and in-zone rules.
- `GuardedRegion.IsGuardCandidate`: same file 337-345. The candidate test.
- `BaseGuard.Spawn`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/Guards/BaseGuard.cs` 20-48. Recruit idle guards and guards already on the target, then make the rest.
- `GuardAvengeTimer`: same file 212-220. Three reinforcement ticks after a guard dies.
- `Region.CompareTo`: `/mnt/frankendom-donors/ModernUO/Projects/Server/Regions/Region.cs` 231-253. The rank order.
- `Region.Find(Point3D)`: same file 291-312. First containing region in the point's sector.
- Zone data: `/mnt/frankendom-donors/ModernUO/Distribution/Data/regions.json` 117-121 (Britain), 137 (a child with a parent), 684-688 (`Buccaneer's Den`, `GuardsDisabled`).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Zone is a union of rectangles, each with a z range | Britain: six rectangles per entry (python count over `regions.json`, not receipted) |
| Child zone inherits its parent's priority; rank by priority, then depth | Default priority 50 (theirs, `Region.cs` 126); child takes parent's (176) |
| Sector index for lookup | 16 tiles per sector (theirs, `Map.cs` 57-58) |
| Crime opens a window; a repeat crime renews it | 15 s (theirs, `GuardedRegion.cs` 352) |
| Nearby townsperson answers at once | 8 tiles (theirs, 261) |
| Shout call | 14 tiles (theirs, 303) |
| Guard recruit radius | 15 tiles (theirs, `BaseGuard.cs` 30) |
| Guards per call | 1 (theirs, `BaseGuard.cs` 20) |
| Reinforcement after a guard dies | 3 ticks; first at 2.5 s; then every 1.0 s (theirs, 216) |
| Zone guard switch | `GuardsDisabled` flag (theirs, `GuardedRegion.cs` 33; 10 `TownRegion` entries in `regions.json`) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: the zone switch is checked first; a crime opens or renews the window; a nearby townsperson call spawns through the recruit rule; a shout call takes table members and in-zone murderers; the window expires per tick. It omits: `Rectangle3D.Contains` (half-open assumed); the sector index (the sketch sorts every zone on each call); the donor's nearest-townsperson loop (the caller passes it); the shout message and the per-candidate `GuardTimer` (the sketch expires all candidates in one tick function); `BaseRegion.MakeGuard` (the sketch takes a callback); the reinforcement waves (not in this sketch: see section 1); the distance shape of `GetMobilesInRange` (the sketch uses a Euclidean distance); housing and spell rules; serialization.

```ts
// Licence: GPL-3.0 (donor, ModernUO). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
export {};

interface Pt {
  x: number;
  y: number;
  z: number;
}

interface Rect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  z1: number;
  z2: number;
}

// A town is one zone made of several rectangles; child zones (farms, inns) point at the town as parent.
interface Zone {
  name: string;
  priority: number; // donor default 50; a child with a parent takes the parent's priority
  childLevel: number; // 0 for a top-level zone, parent + 1 for a child
  dynamic: boolean; // donor: dynamic zones sort before non-dynamic ones
  area: Rect[];
  guardsDisabled: boolean;
  allowHousing: boolean; // donor GuardedRegion.AllowHousing is false for towns
}

// donor CompareTo: dynamic first, then higher priority, then deeper child
function outranks(a: Zone, b: Zone): boolean {
  if (a.dynamic !== b.dynamic) return a.dynamic;
  if (a.priority !== b.priority) return a.priority > b.priority;
  return a.childLevel > b.childLevel;
}

// Containment is half-open here; the donor Rectangle3D.Contains was not read.
function inside(r: Rect, p: Pt): boolean {
  return p.x >= r.x1 && p.x < r.x2 && p.y >= r.y1 && p.y < r.y2 && p.z >= r.z1 && p.z < r.z2;
}

// donor Find(Point3D): the first zone in rank order whose area holds the point; otherwise the map default.
// simplified: sorts every candidate zone per call; the donor keeps per-16-tile sector lists sorted once at registration.
function resolveZone(zones: Zone[], p: Pt, defaultZone: Zone): Zone {
  const ranked = zones.slice().sort((a, b) => (outranks(a, b) ? -1 : outranks(b, a) ? 1 : 0));
  for (const z of ranked) {
    if (z.area.some((r) => inside(r, p))) return z;
  }
  return defaultZone;
}

interface Mob {
  id: number;
  x: number;
  y: number;
  alive: boolean;
  criminal: boolean;
  murderer: boolean;
  invulnerable: boolean;
}

interface Npc {
  humanInTown: boolean;
  x: number;
  y: number;
}

const GUARD_WINDOW_MS = 15_000; // donor GuardTimer: 15.0 s, renewed on each new crime
const SHOUT_RANGE = 8; // donor: a townsperson within 8 tiles answers at once
const CALL_RANGE = 14; // donor CallGuards: a "guards" shout reaches 14 tiles
const GUARD_RECRUIT_RANGE = 15; // donor BaseGuard.Spawn: existing guards within 15 tiles are used first

interface Guard {
  focus: Mob | null;
  x: number;
  y: number;
}

// donor BaseGuard.Spawn: recruit idle guards and guards already on the target first, then make the rest.
function spawnGuards(target: Mob, targetX: number, targetY: number, guards: Guard[], amount: number, makeGuard: () => void): void {
  let left = amount;
  for (const g of guards) {
    if (Math.hypot(g.x - targetX, g.y - targetY) > GUARD_RECRUIT_RANGE) continue;
    if (g.focus === null) {
      g.focus = target;
      left--;
    } else if (g.focus === target) {
      left--;
    }
  }
  while (left > 0) {
    makeGuard();
    left--;
  }
}

class TownGuardWindow {
  // mob id -> time the candidate status ends (ms)
  private readonly candidates = new Map<number, number>();

  // donor IsGuardCandidate: not a guard, alive, not invulnerable, and criminal (murderers always, when reds are not allowed)
  isCandidate(m: Mob, allowReds: boolean): boolean {
    if (!m.alive || m.invulnerable) return false;
    return (!allowReds && m.murderer) || m.criminal;
  }

  // donor CheckGuardCandidate: the first crime opens the window and, if a townsperson is in shouting range, a guard is called at once.
  // A repeat crime renews the window (donor: timer.Stop(); timer.Start()).
  // shouter is the nearest qualifying townsperson, chosen by the caller (donor loop at lines 258-276, not in this sketch)
  onCrime(now: number, zoneGuardsOn: boolean, m: Mob, allowReds: boolean, shouter: Npc | null, guards: Guard[], makeGuard: () => void): void {
    if (!zoneGuardsOn) return; // donor: IsDisabled() is checked before CheckGuardCandidate runs
    if (!this.isCandidate(m, allowReds)) return;

    if (!this.candidates.has(m.id)) {
      this.candidates.set(m.id, now + GUARD_WINDOW_MS);
      if (shouter !== null) {
        spawnGuards(m, m.x, m.y, guards, 1, makeGuard);
        this.candidates.delete(m.id);
      }
    } else {
      this.candidates.set(m.id, now + GUARD_WINDOW_MS);
    }
  }

  // donor CallGuards: a "guards" shout calls every candidate within 14 tiles (candidates from the table reach outside the zone).
  onGuardsShout(zoneGuardsOn: boolean, mobsWithin14: Array<{ mob: Mob; inZone: boolean }>, allowReds: boolean, guards: Guard[], makeGuard: () => void): void {
    if (!zoneGuardsOn) return; // donor: the speech and CallGuards paths are skipped when the zone is disabled
    for (const { mob, inZone } of mobsWithin14) {
      if (!this.isCandidate(mob, allowReds)) continue;
      const tabled = this.candidates.has(mob.id);
      const alwaysAndInZone = inZone && !allowReds && mob.murderer;
      if (!tabled && !alwaysAndInZone) continue;
      this.candidates.delete(mob.id);
      spawnGuards(mob, mob.x, mob.y, guards, 1, makeGuard);
    }
  }

  // donor GuardTimer.OnTick, called per tick here: drop expired candidates
  expire(now: number): void {
    for (const [id, end] of this.candidates) {
      if (end <= now) this.candidates.delete(id);
    }
  }
}
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population and guard response as engine logic; zone shape and flags as data). Parity-checklist row 23 (zone population: spawn caps, respawn, despawn). The guard-call and reinforcement rules are engine many-on-one logic (row 4, fight loop) and are not claimed by this row; see section 6.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: zones as data (town shape, child zones and guard flags are data); one engine (the lookup and guard rules are engine logic); MAX_ATTACKERS = 3 (the reinforcement rule must stop at 3)

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism, not translated.
- Zone rank is by priority and depth, not by area size. Two overlapping zones at the same priority and depth compare as equal, so the order is left to the sort and is not fixed by the data. Frankendom must make overlap a data error or give every zone a unique rank.
- The sketch sorts every zone on every lookup; the donor sorts per sector once at registration (`Map.cs` 1967). Frankendom needs the sector index for hot paths.
- Guard calls and reinforcement are town mechanics with no cap in the donor: a shout calls every candidate within 14 tiles, and a dead guard brings three waves, each adding one guard. Frankendom's MAX_ATTACKERS = 3 means the reinforcement must stop at 3 attackers on one player; the donor does not cap it.
- The donor counts a `BaseCreature` as a shouter by `IsHumanInTown` alone, with no region check (`GuardedRegion.cs` 263-264). A non-creature human must be in the zone. Frankendom should use one rule for both.
- Server-verified kills: the donor starts reinforcement from a guard's death (`WarriorGuard.cs` 143-147) and starts the call from a crime flag in the candidate test. Frankendom's kill and crime records must come from the server ledger, not from object state, and the reinforcement trigger must read that record.
- Reds and `Core.AOS`: whether murderers are always candidates depends on `Core.AOS` (not read). Frankendom must pick one rule and set it as data.
- `GuardsDisabled` is a per-zone switch (`GuardedRegion.cs` 33; `regions.json` 688). That is the right shape for "zones as data". The donor also toggles it by Administrator command (`GuardedRegion.cs` 54-56 registrations, 79-129 bodies); Frankendom should keep that switch out of the player's reach.
- Not read: `BaseRegion.MakeGuard`, `IsHumanInTown`, `GuardIdleTimer`, the `Timer` class, `Map.GetMobilesInRange` shape, `Rectangle3D.Contains`. Anything the sketch states as an assumption is not a donor fact.
- Second read mechanism, not written up: `Items/Maps/CityMap.cs` 12, 17-24 scales the city map's reveal with Cartography: `dist = Math.Max(64 + (int)(skillValue * 4), 200)` and `size = Math.Clamp(32 + (int)(skillValue * 2), 200, 400)`. It is a skill-scaled reveal radius and could be a separate cell note for the HUD or map.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: one engine, zones as data, MAX_ATTACKERS = 3; parity row 23 zone population
