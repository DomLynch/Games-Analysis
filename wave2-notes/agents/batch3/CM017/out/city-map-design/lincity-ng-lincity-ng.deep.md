# lincity-ng-lincity-ng (city-map-design, cell 20)

Donor: `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity/modules/health_centre.cpp` (with `src/lincity/engine.cpp` 131-153 for the commit) | Licence: GPL-2.0-or-later (health_centre.cpp header 13: "(at your option) any later version."; COPYING.txt 2: "Version 2, June 1991"; data files dual GPL / CC-BY-SA per COPYING-data.txt) | C++ | symbol `HealthCentre::cover`

Checked: Read `health_centre.cpp` 1-158 in full (constructor, `update`, `cover`, save/load). Read the shared commit `World::do_fire_health_cricket_power_cover` (engine.cpp 131-153). Read the daily loop order in `simulate.cpp` (53-70, 89-106, 228-250). Read the same window test and square loop in `firestation.cpp` 96-136 and `market.cpp` 205-233 (the same pattern, different flag). Read `world.cpp` 420-430 and `lintypes.cpp` 925-962 (the build order and the placement gates). Read `residence.cpp` 180-215 only (the effect on residents). Not read: `residence.cpp` beyond 215; `ConstructionGroup::placeItem` (lintypes.cpp 899); `cricket.cpp` (grep only, same pattern); `xmlloadsave.cpp` flag mapping (grep only); the list's hint file `src/lincity/init_game.cpp` was not opened (it is the wrong file for this topic). Confidence high on the window test, the staged commit and the square loop; medium on the residence effect (read to line 215). Not a camera cell.

Best transferable idea: Score each service's uptime over a fixed window with a small tolerance, stage the area it covers in a separate layer during the window, and switch the whole area on or off in one pass at the window's end.

Decision (proposed): adapt — the staged commit and the tolerance window are the right shape for zone hub services (a healer, a bank, a guard post), but the donor's 300-day window is far too slow: here the window is zone data in server ticks, and the two defects below are fixed in the sketch.

Acceptance: A hub healer's aura stays on while the hub is staffed for at least (window minus tolerance) of the last window; if staffing drops for a whole window, the aura is off after the next commit, and a server test asserts that a failed window's supply does not count toward the next window.

## 1. Mechanism

- Each service is a building with a per-day `update` (health_centre.cpp 78). On a day it has its inputs (6 labour and 40 goods, 90-91), it counts a working day. Each day, `daycount` (elapsed days since the last evaluation) goes up and `covercount` (working days carried) goes up on a working day. Both are per building.
- Once per window, on phase 75 of a 300-day cycle (99: `total_time % DAYS_BETWEEN_COVER == 75`; the cycle is `NUMOF_DAYS_IN_MONTH*3` with a month of 100 days, all_buildings.hpp 46, lintypes.hpp 59), the building calls `cover()`.
- The window test (112): active if `covercount + 5 < daycount` is false, i.e. working days in the window plus 5 tolerance days reach the elapsed days. Failing sets `daycount = 0`, `active = false` and returns (113-117). The working-day count is not reset on that path.
- Passing sets `active = true` and subtracts the elapsed days from the working-day count (119): a surplus carries to the next window, and a small debt (down to 5 days) can carry too. `daycount` is reset to 0 (120).
- Then the square: corners `nw = max(x - range, 1)` and `se = min(x + range, len - 1)` (122-129). The loops (130-131) run `p < se`, so the east and south edges are excluded. Each tile gets the CHECK bit for this cover kind (132). The bit is not yet the cover bit.
- Commit (engine.cpp 131-153, from simulate.cpp 104-105 on the same phase): for every tile and every cover kind, `cover = check`, and both bits are cleared (149-150). Nothing a building writes is seen until this sweep.
- Order inside one day (simulate.cpp 66, 69): all constructions are updated first, in a random order reshuffled each day (237, 247), then the periodic pass runs, including the commit on the phase day. So the commit sees every service's cover call for that window, whatever their order.
- Residence effect (residence.cpp 196-198): a residence with the health cover bit gets a birth-rate modifier (`RESIDENCE_BRM_HEALTH` 300) and +15 to its desirability; fire cover gives +15 to good (201); without it, +5 to bad (203); cricket +20.
- Build gate (world.cpp 424-428; lintypes.cpp 930, 959): tech level gate, then every footprint tile must be bare, then expense, then `placeItem`, then the transport reconnect. Each service is placed one at a time through this path.

Range and rates: hospital range 14 tiles (health_centre.hpp 44), labour 6 per working day (health_centre.hpp 47), goods 40 (health_centre.hpp 49), market range 9 (market.hpp 47), firestation range 17 (firestation.hpp 44).

## 2. Key functions

- `HealthCentre::update`: `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity/modules/health_centre.cpp` 78-108. Daily inputs, working-day count, the phase-75 cover call, the monthly reset.
- `HealthCentre::cover`: same file, 110-133. The window test, the supply carry, the square and the staging bit.
- `World::do_fire_health_cricket_power_cover`: `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity/engine.cpp` 131-153. The one-pass commit for all four cover kinds.
- Daily order: `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity/simulate.cpp` 54-70 (the step), 230-250 (`simulate_mappoints`, shuffled update).
- Same pattern elsewhere: `FireStation::cover` (firestation.cpp 112-136) and `Market::cover` (market.cpp 221-233), both with the same `<` loop and the window test (firestation.cpp 114).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Uptime window with tolerance: pass if worked days + tolerance >= elapsed days | Window 300 days (`NUMOF_DAYS_IN_MONTH*3`, 100-day month: all_buildings.hpp 46, lintypes.hpp 59); tolerance 5 days (all_buildings.hpp 47). Active needs at least 295 working days in a full window. |
| Surplus carries across windows | Subtract elapsed days on pass (health_centre.cpp 119); no cap; debt possible down to -5 |
| Square area of radius r, clamped at the map edge | Hospital 14, market 9, firestation 17 tiles (health_centre.hpp 44, market.hpp 47, firestation.hpp 44) |
| Stage then commit in one sweep | Commit on the phase day after all updates (simulate.cpp 66-69, 104-105) |
| Desirability bonus from cover | Health: birth modifier 300, +15 desirability (residence.cpp 197-198); fire +15 / +5 bad (residence.cpp 201-202); cricket +20 |
| First window | Starts at construction (daycount 0, health_centre.cpp 68); first evaluation at the next phase-75 day, so a new hospital can wait up to about 300 days before its first cover (arithmetic from the constants, not run) |

## 4. TypeScript sketch

simplified: keeps the donor order (daily count, one evaluation per window with the tolerance test, activate or fail, stage the square, then one commit that copies the staged layer to the live layer). Changed: (1) the failed window also zeroes the supply count; the donor leaves it, so the working days of a failed window stay in the bank and are spent in later windows (health_centre.cpp 115-117 against 119); (2) the square is inclusive on the east and south edges (the donor's `<` loop covers [x-r, x+r-1]). Omitted: labour and goods, the running cost, the shuffle order (the sketch is order-free by design), residence effects, fire/cricket/market kinds, and the save/load of bits. The `supplied` input is a boolean the caller computes from its own inputs. Clean-room: written from the described mechanism; names and structure are new.

```ts
// Licence: clean-room. Written from the described mechanism of the GPL-2.0-or-later donor (service cover windows),
// not a translation of its lines. Names and structure are new.
export interface ServiceCfg { id: string; x: number; z: number; radius: number; }
export interface Service {
  cfg: ServiceCfg;
  live: boolean;            // covering the area in the committed grid
  supplyDays: number;       // days of supply inside the current window, may carry surplus or a small debt
  daysSinceEval: number;    // days elapsed since the last window evaluation
}
export interface CoverRules { windowDays: number; toleranceDays: number; }
export interface AreaGrid {
  size: number;             // grid is size x size cells
  committed: Uint8Array;    // what players get right now
  staged: Uint8Array;       // written during the window, copied in one pass at commit
}

// Called once per day for each service, in any order: nothing reads the grid until commit.
export function serviceDay(s: Service, suppliedToday: boolean): void {
  s.daysSinceEval++;
  if (suppliedToday) s.supplyDays++;
}

// Called once per window per service: decide, then stage the square around the service.
// simplified: the donor order is kept (check the window, activate or fail, then stage the area). Changed: the
// square is inclusive on all four sides (the donor's loop stops one cell short on the east and south), and a
// failed window also zeroes the supply count so its days do not carry into the next window (donor leaves it).
export function evaluateWindow(s: Service, grid: AreaGrid, r: CoverRules): void {
  if (s.supplyDays + r.toleranceDays < s.daysSinceEval) {
    s.live = false;
    s.daysSinceEval = 0;
    s.supplyDays = 0;          // FIX: failed window leaves no credit for the next one
    return;
  }
  s.live = true;
  s.supplyDays -= s.daysSinceEval;   // surplus (or a small debt) carries to the next window
  s.daysSinceEval = 0;
  const x0 = Math.max(s.cfg.x - s.cfg.radius, 0);
  const x1 = Math.min(s.cfg.x + s.cfg.radius, grid.size - 1);  // FIX: inclusive east edge
  const z0 = Math.max(s.cfg.z - s.cfg.radius, 0);
  const z1 = Math.min(s.cfg.z + s.cfg.radius, grid.size - 1);  // FIX: inclusive south edge
  for (let z = z0; z <= z1; z++) {
    for (let x = x0; x <= x1; x++) grid.staged[z * grid.size + x] = 1;
  }
}

// After every service has evaluated in this window: the whole area switches in one pass.
export function commitWindow(grid: AreaGrid): void {
  grid.committed.set(grid.staged);
  grid.staged.fill(0);
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (`/tmp/cm017-lincity-service-cover.ts`), exit 0.

## 5. Lands in

- TARGET `origins/world/hub-services.ts` (proposed path; not checked against the Frankendom tree): a per-zone hub service with a supply check per tick, one evaluation per window, and one commit that switches the hub's area aura on or off. Parity-checklist row 23 (zone population and placement as zone data; the aura moves population, and row 23 is the nearest row).
- today: no hub service aura has been read in Frankendom; this note assumes none exists.
- Reuse tag: clean-room-shape (GPL-2.0-or-later; shape only, no line-by-line translation)
- Brief rule served: zones as data (window, tolerance, radius per service are zone fields); one commit for the area (server-verified state changes in one pass, not piecemeal); one ledger for supply (a failed window's credit does not leak).

## 6. Gaps and risks

- Defect 1, fixed in the sketch: on a failed window the donor resets `daycount` but not `covercount` (health_centre.cpp 113-117). The working days of that window stay in the count and reduce the days needed in the next window. It reads as a leak; no test in this donor pins either behaviour (the donor has no tests directory). Fix: zero the count on the failed path too.
- Defect 2, fixed in the sketch: the square loop stops before `se` (130-131), so the east and south edges are never covered, and the area is [x-r, x+r-1] rather than symmetric. Same loop in firestation.cpp and market.cpp. Fix: inclusive bounds, clamped to the map.
- Not fixed, and not checked: the west and north clamp is 1, not 0 (122-124), so map column and row 0 are never covered. Whether the donor's map has a border tile here was not read.
- Latency: a new service waits for the next phase day, and its first window can be about 300 days long, so it can be off for most of a year after construction (arithmetic from the constants). Frankendom needs a shorter first window, or a first evaluation at build time, if a new hub should work straight away.
- The window is 300 days: far too slow for a fast game. The design choice to transfer is the window plus tolerance, not the length; the length is zone data in server ticks.
- Commit cost is a sweep of every tile for each cover kind once per window (engine.cpp 145-152). Cheap at 300 days; per tick it would need a dirty list.
- The donor has no test for the tolerance or the commit (no tests directory), so the sketch's behaviour is from reading only.
- Not a fight mechanism: no hate, no targeting, no MAX_ATTACKERS = 3 effect. It affects only residents and the hub's own area.
- Shuffled order each day (simulate.cpp 237): the donor relies on the commit to make order irrelevant. Frankendom's server tick should keep the same property, or sort the updates so order is fixed for replays.
- Build path: the donor checks the tech gate before the footprint (lintypes.cpp 930, 959) and charges before placing (world.cpp 426-428). Frankendom should check, charge and place in that order so a failed place never charges.
- The minimap and the road grammar (`src/lincity-ng/MiniMap.cpp`, `src/lincity/modules/track_road_rail.cpp`) were seen by grep only and are not described here.


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
Errors: none found; 12+ claims verified (health_centre.cpp 62-133 incl. phase 75, tolerance 5, < loop, clamp 1; engine.cpp 131-153 commit; simulate.cpp order/shuffle; ranges 14/17/9; labour 6 goods 40; residence 196-203; GPL v2+ header line 13)
Missed: update() also gates the working day on a waste cap (health_centre.cpp:88 waste+goods/3 <= MAX_WASTE_AT_HEALTH_CENTRE) and on running-cost OutOfMoney (82-96, caught); note lists only labour+goods inputs. Monthly busy/working_days reset at 103-107 not described.
