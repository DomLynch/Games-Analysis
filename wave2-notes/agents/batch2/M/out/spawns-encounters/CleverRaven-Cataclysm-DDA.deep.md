# CleverRaven-Cataclysm-DDA (spawns-encounters, cell 4)

Donor: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/mongroup.cpp` and `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/map.cpp` | Licence: Creative Commons Attribution-ShareAlike 3.0 Unported (LICENSE.txt line 1; share-alike, so clean-room: shape only, no translation) | C++ | symbols `MonsterGroupManager::GetResultFromGroup`, `map::spawn_monsters_submap_group`

Checked: `GetResultFromGroup` 196-274 and `is_spawn_valid` 121-192 (read in full); `spawn_monsters_submap_group` 10028-10173, `spawn_monsters_submap` 10175-10247 and `spawn_monsters` 10249-10264 (read in full); `game::despawn_monster` and `despawn_nonlocal_monsters` (game.cpp 10376-10404, read). Not read: how `group.population` is first set (overmap code), how `freq_total` is built, `place_critter_at`, `can_move_to`, and the other callers of `spawn_monsters` (game.cpp 927, 8519, 9881). `GetResultFromGroup` has about 15 callers (grep); I read only the call at map.cpp 10125 for the population-budget behaviour below, so the budget rule is stated for that caller only. Confidence: high on the pick and the placement, medium on the budget loop (derived from reading, not run).

## 1. Mechanism

Two steps: choose what to spawn from a weighted group, then choose where to put it.

- Pick (`GetResultFromGroup`, mongroup.cpp 196-274). Roll one integer 1..frequency total (201). Walk the group's entries in order. An entry that is not valid right now is skipped without using any of the roll (215-217). `is_spawn_valid` rejects an entry before its start time (132), after its end time unless it lasts forever (135), outside its time-of-day window (daytime is sunrise..sunset, night is sunset..sunrise, dusk/dawn are +/- 1 hour around them, 145-154, 169-184), outside its listed seasons (187), or off-holiday for event entries (126). For a valid entry: if its weight is below the roll, subtract the weight from the roll and move on (220-222); otherwise this entry is picked and the walk stops (255). The pack size is a random number in [pack_min, pack_max] when pack_max > 1, else 1 (225-226). If the entry is itself a subgroup, the function recurses once per pack member and appends the results (228-234); otherwise it appends (monster, pack size) once (246) or once per member when `use_pack_size` is set (236-244; default false, mongroup.h 247).
- Budget. If the caller passes a quantity pointer it is reduced by `max(1, cost_multiplier x pack_size)` per picked monster entry (242 or 250). If the top-level call found nothing (all entries invalid, or the roll fell past the valid ones), the group's default monster is returned with pack 1 and the budget drops by 1 (262-270). Recursive calls never fall back (262).
- Where (`spawn_monsters_submap_group`, map.cpp 10028-10173). Build a list of candidate cells in the 12-by-12 submap (SEEX/SEEY; the value itself not read): cell must be free of creatures (10085), passable with a floor or water (10049-10054, 10089), not visible to the player within sight range capped at half the map (10032, 10093), and outdoors (10097). The outermost submaps and other z-levels skip the sight test (10039-10047), underground skips the outdoors test (10064). A uniform submap checks only its first cell once and then skips per-cell terrain tests (10065-10078). If the list is empty the group is cleared and dropped, except a horde, which is kept to try later (10105-10118).
- Population. For the group's stored population `pop` the code loops `for m in 0..pop` and calls the pick with `&pop` as the budget (10121-10125). Because `pop` shrinks inside the loop while `m` grows, the loop ends sooner than `pop` picks (my reading: with cost-1 picks and pop 10 it stops after 5 picks; not run). Each result is pushed into the group `pack_size` times (10136-10138); horde members get `MHA_ALWAYS` rejoin (10133-10135).
- Placement. For each monster in the group, up to 10 tries: draw one cell at random and remove it from the list (no cell reused, 10145-10146); skip if that monster cannot move there (10148); for a horde, give it a wander target near the horde's destination with a number of turns = distance + group interest (10151-10159); place it (10163), break (10168). A monster that fails 10 tries is silently not placed. Finally the group is emptied (10172).
- Static spawn points (10198-10245): each submap carries spawn records with a type and count; `count` copies are placed within radius 3 of the point (10201-10203, 10243), then the records are cleared (10246).
- Tick: no per-tick spawn loop here. `spawn_monsters` is called when the map shifts (game.cpp 10316) and at load; it sweeps every submap in the loaded area (10257-10263). The reverse is `shift_monsters`: any monster outside the reality bubble after a shift is saved into the overmap and removed (game.cpp 10416-10421, 10383); `despawn_nonlocal_monsters` does the same for monsters beyond one sixth of the map outside its edge (10397-10401). Which of the two is the common path: not checked.

## 2. Key functions

- `MonsterGroupManager::GetResultFromGroup`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/mongroup.cpp` 196-274. Weighted pick with validity filter, pack size, subgroup recursion, budget and default fallback.
- `is_spawn_valid`: same file 121-192. Start/end time, time-of-day and season gates per entry.
- `map::spawn_monsters_submap_group`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/map.cpp` 10028-10173. Candidate cells, out-of-sight rule, budget loop, random cell draw without replacement, 10 tries.
- `map::spawn_monsters_submap` / `map::spawn_monsters`: same file 10175-10264. Static spawn points and the sweep over all submaps.
- `game::despawn_monster`, `game::shift_monsters`, `game::despawn_nonlocal_monsters`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/game.cpp` 10376-10423. Save and remove monsters outside the area.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Roll once on the weight total, subtract weights while walking the valid entries | Weights live in data (JSON group files, not read) |
| Per-entry gates: start/end time, time of day, season | Dusk/dawn = sunset/sunrise +/- 1 hour (theirs, 151-153) |
| Pack size min..max, subgroup recursion | Per-entry data fields |
| Budget spend per pick: max(1, cost x pack) | Minimum cost 1 (theirs, 250); fallback cost 1 (269) |
| Default monster when nothing matches | Group field `defaultMonster` |
| Candidate cells filtered by free / walkable / outdoors / not in view; draw without replacement | Sight range cap = half map size (theirs, 10032) |
| Retry limit per monster | 10 tries (theirs, 10145) |
| Static spawn copies near a point | Radius 3 (theirs, 10201) |
| Despawn outside the active area, remembered | Limit one sixth of map beyond the edge (theirs, 10397) |

## 4. TypeScript sketch

simplified: clean-room from the described mechanism, not a translation. It rolls over the weights of the currently valid entries only (the donor rolls over a stored total whose construction was not read, so a roll can land past the valid entries and trigger the fallback); it drops the holiday and season gates, the horde wander target and rejoin flag, the uniform-submap shortcut and the sight and indoor tests (the caller passes already-filtered cells). It copies the donor's budget loop shape (counter grows while the budget shrinks), which the donor itself may not intend.

```ts
interface Entry {
  mob?: string; group?: string;
  weight: number; cost: number;
  packMin: number; packMax: number;
  startsAt: number; endsAt: number;      // seconds on a world clock; endsAt <= 0 means forever
  timeOfDay?: [number, number];          // allowed [from, to) in seconds of day
}
interface Group { entries: Entry[]; fallback: string }
interface Pick { mob: string; pack: number }

const rngInt = (lo: number, hi: number, r: () => number): number => lo + Math.floor(r() * (hi - lo + 1));

function valid(e: Entry, now: number, tod: number): boolean {
  if (now < e.startsAt) return false;
  if (e.endsAt > 0 && now >= e.endsAt) return false;
  if (e.timeOfDay && !(tod >= e.timeOfDay[0] && tod < e.timeOfDay[1])) return false;
  return true;
}

// budget.left is spent as picks are made; the fallback mob costs 1 even if nothing matched.
function pickFromGroup(groups: Map<string, Group>, name: string, now: number, tod: number,
                       budget: { left: number }, r: () => number, nested = false): Pick[] {
  const g = groups.get(name);
  if (!g) return [];
  const live = g.entries.filter(e => valid(e, now, tod));
  // the donor rolls over its stored frequency total (how that total is built was not read) and skips invalid entries while walking; sketch rolls over live weights only
  let roll = rngInt(1, Math.max(1, live.reduce((s, e) => s + e.weight, 0)), r);
  const out: Pick[] = [];
  let found = false;
  for (const e of live) {
    if (e.weight < roll) { roll -= e.weight; continue; }
    const pack = e.packMax > 1 ? rngInt(e.packMin, e.packMax, r) : 1;
    if (e.group !== undefined) {
      for (let i = 0; i < pack; i++) out.push(...pickFromGroup(groups, e.group, now, tod, budget, r, true));
      found = true;
    } else if (e.mob !== undefined) {
      out.push({ mob: e.mob, pack });
      budget.left -= Math.max(1, e.cost * pack);
      found = true;
    }
    break;
  }
  if (!nested && !found) { out.push({ mob: g.fallback, pack: 1 }); budget.left -= 1; }
  return out;
}

interface Cell { x: number; y: number }
// cells: candidate cells already filtered (free, walkable, outdoors, out of view)
function placeGroup(cells: Cell[], picks: Pick[], r: () => number, canStand: (m: string, c: Cell) => boolean) {
  const placed: { mob: string; at: Cell }[] = [];
  if (cells.length === 0) return { placed, groupDropped: true };
  for (const p of picks) {
    for (let n = 0; n < p.pack; n++) {
      for (let tries = 0; tries < 10 && cells.length > 0; tries++) {
        const c = cells.splice(Math.floor(r() * cells.length), 1)[0]!; // drawn without replacement
        if (!canStand(p.mob, c)) continue;
        placed.push({ mob: p.mob, at: c });
        break;
      }
    }
  }
  return { placed, groupDropped: false };
}

// zone population loop: budget shrinks while the counter grows (see note)
function populate(groups: Map<string, Group>, name: string, pop: number, now: number, tod: number, r: () => number): Pick[] {
  const budget = { left: pop };
  const all: Pick[] = [];
  for (let m = 0; m < budget.left; m++) all.push(...pickFromGroup(groups, name, now, tod, budget, r));
  return all;
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, passed (`work/cdda-spawn.ts` plus `export {}`).

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (engine logic; weights, costs, pack sizes, time windows, tries and the spawn-outside-view rule as zone data fields). Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer).
- today: not checked in this pass (no Frankendom repo read).
- Reuse tag: rewrite-from-idea (CC BY-SA 3.0; clean-room only)
- Brief rule served: zones as data; rules 7-9 n/a
- Best transferable idea: describe a zone's population as a weighted group of entries (each with time window, pack range and cost) plus a numeric budget, and place the picks only on free, walkable cells outside the player's view, drawing cells without replacement with a small retry cap.

## 6. Gaps and risks

- CC BY-SA 3.0 share-alike: clean-room only; the sketch is written from the mechanism.
- Spawning here is triggered by loading an area, not by a tick or timer. Frankendom row 23 wants caps, respawn seconds and a despawn grace timer; the donor has the pick and the placement but no respawn timer or grace timer in what I read (the despawn in `shift_monsters` is immediate; it saves the monster to the overmap rather than dropping it).
- No spawn cap per zone: the budget limits one fill, not the live count. A cap field must be added as data and checked in `world-spawns.ts` before each pick.
- The "not in view of the player" rule is a single-player rule; in a many-player zone Frankendom needs a rule over all players in the zone (nearest-player distance, not line of sight), which the donor does not show.
- Random draws use the global RNG. Server-verified kills and the fight record need a seeded RNG for any spawn that affects loot or XP.
- The budget loop's counter and budget move in opposite directions (see section 1); copy the intent (a total cost per fill), not the loop.
- MAX_ATTACKERS = 3 is unrelated to spawn counts: a pack of 5 spawned together still needs the engine's attacker slot gate once they aggro.
