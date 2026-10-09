# OpenRA-OpenRA (quests-dialogue, cell 12)

Donor: /mnt/frankendom-donors/OpenRA-OpenRA/mods/ra/maps/soviet-01/soviet01.lua | Licence: GPL-3 | Lua (the mission script; the engine around it is C#) | symbol soviet01.lua WorldLoaded / Triggers / objectives (input line 60: `PanicAttack` is 59-68, `WorldLoaded` 70-99)

## 1. Mechanism
- Donor: OpenRA Red Alert mission script, mods/ra/maps/soviet-01/soviet01.lua. The file is Lua, not C# (the input's language column is wrong for this file; the engine is C#, the mission is Lua).
- Setup (WorldLoaded, 70-99): binds the three players (71-73), creates the main objective "raze-village" (77), and arms triggers: if all three airfields are removed from the world the objective is marked failed (79-81); the jeep bridge routine (83); creates a paratrooper proxy actor (85); inserts three Yak aircraft after 2 seconds (86, `InsertYaks` 12-22: each is created off-map, flies to a cell near the start jeep, then returns to an airfield); paratroopers when the start jeep, the church or ParaHut dies (87, 42-57); panic reinforcements when the hay house is damaged (88); two pillbox triggers that kill a pillbox when its barrel dies (89-98).
- Each trigger is an event handler on a named actor or footprint. JeepDemolishingBridge (24-40) first moves the start jeep to a waypoint (25), then arms a footprint trigger on that cell (27). When something enters, and it belongs to France and the bridge barrel is alive, the footprint trigger removes itself and kills the barrel (28-31). Whether or not that branch ran, the handler then finds the bridge actor in a box between two waypoints and kills it if alive (33-38). So the trigger is not strictly one-shot: it is removed only when the French jeep enters while the barrel lives.
- PanicAttack (59-68) is a latch: on the first damage it reinforces France with three civilians ("c3", "c6", "c9") at a spawn point, each of which moves one cell and is set to panic (61-65); the flag `HouseDamaged` is set after the check (67), so later damage does nothing. The flag starts unset (nil).
- Tick (101-105) runs every game tick: when France and Germany both have no required units left, the USSR marks the village-raid objective complete (102-103). It does not check whether the objective has already failed or completed, so the call repeats every tick afterward.
- Paratroopers (42-57): three kill triggers (jeep, church, ParaHut); each plays the "ReinforcementsArrived" speech notification and orders a paradrop to a fixed cell facing east.
- Output: spawned actors, objective state changes, speech and notification calls.

## 2. Key functions
- WorldLoaded | /mnt/frankendom-donors/OpenRA-OpenRA/mods/ra/maps/soviet-01/soviet01.lua | 70-99 | sets up players, the objective, and all triggers.
- PanicAttack | /mnt/frankendom-donors/OpenRA-OpenRA/mods/ra/maps/soviet-01/soviet01.lua | 59-68 | one-shot reinforcement latch on damage to the hay house.
- Tick | /mnt/frankendom-donors/OpenRA-OpenRA/mods/ra/maps/soviet-01/soviet01.lua | 101-105 | per-tick objective check: marks complete when the required enemy units are gone.
- JeepDemolishingBridge | /mnt/frankendom-donors/OpenRA-OpenRA/mods/ra/maps/soviet-01/soviet01.lua | 24-40 | footprint trigger: kills the barrel if a French unit enters (and removes itself), then kills the bridge if alive.
- InsertYaks | /mnt/frankendom-donors/OpenRA-OpenRA/mods/ra/maps/soviet-01/soviet01.lua | 12-22 | creates three Yak aircraft and sends them in.
- Paratroopers | /mnt/frankendom-donors/OpenRA-OpenRA/mods/ra/maps/soviet-01/soviet01.lua | 42-57 | three death triggers that each call a paradrop.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Event triggers on named actors and footprints; one-shot handlers remove themselves | Actor names (theirs, map file; e.g. HayHouse line 88, Church line 48) |
| Latch flag so a reaction runs once | Flag name HouseDamaged (theirs, lines 60 and 67); panic team of three civilians (line 61) |
| Per-tick completion check on a set of required units | Required unit groups per side (theirs, map) |
| Objective states set by the script (add, complete, fail) | Objective name raze-village (theirs, line 77); 2 second delay for the Yaks (line 86) |

## 4. TypeScript sketch
simplified: the sketch's `once` flag removes any handler after its first run; the donor's footprint trigger removes itself only inside the French-and-barrel-alive branch and keeps running the bridge-kill part. It omits the Yak insertion, the speech notifications, the airfield-failure trigger, the pillbox triggers, the paradrop and the objective-failed case. The panic latch order is the same (check, act, set).

```ts
// Licence: GPL-3 | clean-room: written from the mechanism, no donor lines.
// Mission as event triggers. A handler runs when its event fires on its target; one-shot handlers remove themselves.
// A latch flag makes a reaction run once. A per-tick check completes the objective when the required side is gone.
type Handler = (actor: string) => void;
interface Trigger { event: string; target: string; fn: Handler; once: boolean; }

const triggers: Trigger[] = [];
function on(event: string, target: string, fn: Handler, once = false): void {
  triggers.push({ event, target, fn, once });
}

function fire(event: string, target: string, actor: string): void {
  for (const t of [...triggers]) {
    if (t.event !== event || t.target !== target) continue;
    t.fn(actor);
    if (t.once) triggers.splice(triggers.indexOf(t), 1);
  }
}

let houseDamaged = false;                       // latch (theirs: HouseDamaged)
function panic(spawnReinforcements: () => void): void {
  if (!houseDamaged) spawnReinforcements();     // first damage only
  houseDamaged = true;
}

function tick(requiredAlive: (side: string) => boolean, sides: string[],
              completeObjective: () => void): void {
  if (sides.every(s => !requiredAlive(s))) completeObjective();
}
```

## 5. Lands in
- Frankendom target: `origins/quests/journal.ts` (quest and objective state) and `origins/server/quest-advance.ts` (server side of quest progress); the trigger table itself would be zone data loaded by `origins/zones/loader.ts`. All three exist on the VPS snapshot /root/work-k7 (not main); I read only their header comments (`journal.ts` is "advanced only along the content's transitions").
- Parity-checklist row: none of rows 1 to 22. Feature-map section: Origins O2 quests (`origins/talk/README.md` and `docs/specs/origins/modernuo-quests.md` on the snapshot), plus the zone-schema rule (zones as data).
- Reuse tag: rewrite-from-idea (GPL-3; mechanism only).
- Brief rule served: 4 (zones are data on one runtime); rules 7-9 n/a

## 6. Gaps and risks
- A Lua script per mission is code per zone. That conflicts with "zones are data on one runtime": the trigger table must be data, and the handlers must be a small fixed set of verbs (spawn, kill, notify, mark objective).
- The donor's Tick checks the objective every game tick inside the lockstep simulation. Frankendom objective completion must be a server-side state change recorded once in the ledger (the donor re-marks completion every tick after the condition holds, line 103).
- Triggers act on named actors that exist in the map; Frankendom spawns and kills are server-verified and must not be fired from client events.
- Paratroop, Yak and panic reinforcements call the engine's spawn directly; Frankendom spawns must come from the zone's spawn data, and a group near one target is capped by MAX_ATTACKERS = 3.
- The latch `HouseDamaged` is a script global (shared, unsaved). Frankendom needs per-character or per-instance trigger state, saved through the server.
- Pit is a client only; missions of this kind belong to zones.
- Not read: the map's other files (actor definitions, rules), `InitObjectives` and `AddPrimaryObjective` (defined elsewhere in the shared Lua library).
