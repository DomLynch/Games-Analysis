# lincity-ng-lincity-ng (vfx-blood-finishers, cell 13)

Donor: `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity/modules/fire.cpp` | Licence: GPL-2.0-or-later (fire.cpp header: "either version 2 of the License, or (at your option) any later version"; COPYING.txt is GPL version 2) | C++ | symbol `Fire::update`

Checked: Read in full: `modules/fire.cpp` 1-193 (update, spread, animate, torch, report). Read the fire constants `modules/fire.hpp` 46-50, `lintypes.hpp` 59-60, `engine.cpp` 131-170 (cover flags and random ignition), `simulate.cpp` 54-71, 97-110, 230-248 (day step, periodic events, per-building update loop), `lincity-ng/Game.cpp` 668-684 (the loop that runs the day step and animation), `lin-city.hpp` 80-86 (animation quantiser), `lintypes.cpp` 318-335 (torch), `modules/shanty.cpp` 229-245 (a second, separate fire animation). Candidates opened: `lincity-ng/Mps.cpp` (hint file; a UI panel, not the mechanism), `engine.cpp`, `simulate.cpp`, `modules/shanty.cpp`. Topic fit is weak: a grep of `src` for blood, gore, finisher, particle, shake and flash found no blood, gore, finisher, particle or screen-effect code (the only hit is a power-line flash at `modules/power_line.cpp`). The one death-like mechanic is a building burning down and degrading, so this note is about that. Confidence: high on the fire mechanism (every function above was read); moderate on whether it is the topic at all. Not read: where the fire-cover check flag is set, the fire_chance value of every building group (three were read), `simDelay` (the day-step interval), the rand() seed, and the map size limit. Callers: `Fire::update` has one caller read (`simulate.cpp:247`, inside `simulate_mappoints`); `Fire::spread` has one caller (`fire.cpp:101`); the wider tree was not grepped for `update()`. Camera_scope: not a camera topic.

Best transferable idea: a hazard on a tile runs a fixed-step stage timeline (burning, then smoking, then gone) that is pure state, with the visual frame derived from its progress, so the look of a death or a ruin can be tested in ticks.

Decision (proposed): adapt - keep the three-stage ruin timeline for a defeated actor's remains (for example a corpse that smoulders and then clears), set by sim ticks and not by frame time; drop the building-to-building spread and the cover rule unless Lead wants zone hazards, because neither is a Frankendom ruling today.
Acceptance: a server test advances a defeated actor's remains by N sim ticks and asserts the stage goes burning, smoking, gone at the configured tick counts; the client shows the smoke frame index going 0 to 4 in step with smoking progress, and the remains disappear at the same tick on every client.

## 1. Mechanism

- A burning building tile is a `Fire` object (fire.cpp 65-73). Its `update()` runs once per simulation day, from the per-building loop in `simulate_mappoints` (simulate.cpp 230-248; the loop body is at 238-247 and the update call at 247). Each day the loop first shuffles the building order (simulate.cpp 237), so the order of updates is random each day.
- Order of steps inside `Fire::update` (fire.cpp 75-103):
  1. First day only: `burning_days` is set to a random value below `FIRE_LENGTH / 5` = 1200 (79). This happens on the first update, not when the object is created.
  2. Stage check (81): if `burning_days > FIRE_LENGTH` (6000 days), the tile is in the smoking stage. On first entry `smoking_days` is set to a random value below `AFTER_FIRE_LENGTH / 6` (85). Then `smoking_days` goes up by 1 per day, and by 4 more under fire cover (87-88). The tile is detached when `smoking_days > AFTER_FIRE_LENGTH` (89-90), which is 12000 days. The smoking branch returns here, so it never spreads.
  3. Otherwise burning: `burning_days` goes up by 1, and by 4 more under fire cover (94-96). `days_before_spread` goes down by 1 and the tile's pollution goes up by 1 (97-98). When `days_before_spread` reaches 0 it is reset to 150 and `spread()` runs (99-102).
- `spread()` (fire.cpp 105-136): roll `rand() % 80`. Only rolls 0-3 pick a neighbour, north, south, east or west (107-121), so 4 of every 80 spread attempts reach a neighbour. Then the neighbour must be visible (126-127) and hold a building (128-129). It ignites if `rand() % 100` is below the building group's `fire_chance` (130-131). A covered neighbour is never ignited (132-133). Ignition calls `torch()` (135).
- `Construction::torch()` (lintypes.cpp 318-330) detaches the building, places a fire tile on every footprint tile (323), then reconnects transport and desert frontiers. `Fire::torch()` (fire.cpp 172-175) does nothing, so a burning tile is never re-lit.
- Random ignition from the world (`World::do_random_fire`, engine.cpp 156-170): a random tile is chosen (157), it must be visible and hold a building (158-162), the group's `fire_chance` is rolled (164), a covered tile is skipped (166), then the building is torched (169). It runs from `do_periodic_events` only when `total_time % fire_rate == 9` and the tech level is above the fire-station tech (simulate.cpp 99-102), where `fire_rate = DAYS_BETWEEN_FIRES*100/map.len()*100/map.len()` (99). In plain numbers that is about 24,000,000 / side squared days between strikes, so the chance per tile per day stays about the same whatever the map size (my arithmetic, not a test).
- Fire cover (the fire-station reach): the cover flags are rebuilt every `DAYS_BETWEEN_COVER` = 300 days at offset 75 (simulate.cpp 104-105; all_buildings.hpp 46). Each tile's cover flag is set from its check flag (engine.cpp 147-151). Cover does two things. On a burning or smoking tile it speeds progress by 5x (fire.cpp 87-88, 94-96), so a covered fire ends sooner. On a target tile it blocks ignition outright (132-133 and engine.cpp 166).
- Smoke frame: `frame = smoking_days * 4 / AFTER_FIRE_LENGTH`, capped at 4 (fire.cpp 144-145; the comment there says the cap should never fire). The report labels are "burnt down" while `burning_days < FIRE_LENGTH` and "degraded" after (158-161).
- Tick and timing: the simulation is a day counter. `World::do_time_step` does `++total_time` (simulate.cpp 54-56), then stats, then `simulate_mappoints` (66) and `do_periodic_events` (69). The game loop calls it when `tick >= next_execute` (Game.cpp 668-670), and sets the next time with `simDelay` (679; value not read). Animation runs on its own clock: `do_animate` is called when `tick >= next_animate` (Game.cpp 684). `Fire::animate` advances frames on real time, quantised to `ANIMATE_DELAY` = 100 ms through `ANIM_THRESHOLD` (lin-city.hpp 80-84; fire.cpp 147-151). So the logic is a fixed day step and the look is real time.

## 2. Key functions

- `Fire::update`: `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity/modules/fire.cpp` 75-103. Stage check, burn and smoke progress, spread timer.
- `Fire::spread`: `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity/modules/fire.cpp` 105-136. Direction roll, visibility, group ignition roll, cover block, torch.
- `Fire::animate`: `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity/modules/fire.cpp` 138-152. Smoke frame from progress; burning frames on real time.
- `World::do_random_fire`: `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity/engine.cpp` 156-170. Random tile, group chance, cover skip, torch.
- `World::do_fire_health_cricket_power_cover`: `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity/engine.cpp` 131-151 (cover flags; the check flag is set elsewhere, not read).
- `World::do_periodic_events` strike and cover cadence: `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity/simulate.cpp` 97-105.
- `World::simulate_mappoints` (per-building daily loop): `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity/simulate.cpp` 230-248.
- Game loop that drives both clocks: `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity-ng/Game.cpp` 668-684.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Stage timeline: burning, then smoking (progress counts up), then gone; stage decided by progress crossing a threshold | Burn length 6000 days = `NUMOF_DAYS_IN_YEAR*5` (fire.hpp 49); smoke length 12000 days = `NUMOF_DAYS_IN_YEAR*10` (fire.hpp 50); year 1200 days = 100-day months x 12 (lintypes.hpp 59-60) |
| Spread timer: a countdown that resets to a fixed interval and calls a spread step when it hits zero | Interval 150 days = `NUMOF_DAYS_IN_YEAR/8` (fire.hpp 48) |
| Spread picks one of four neighbours on a small roll; most rolls do nothing | 4 of 80 rolls pick a direction (fire.cpp 107-121) |
| Ignition roll per target using the target's own chance | Group chances: shanty 25 (shanty.hpp 44), residence 75 (residence.hpp 68), coal power 80 (coal_power.hpp 44) |
| Protection modifies progress: a covered tile burns and smokes faster | +4 extra per day under cover (fire.cpp 88, 96); cover recomputed every 300 days at offset 75 (all_buildings.hpp 46; simulate.cpp 104) |
| Event rate scaled by area so the per-tile chance stays the same across sizes | `DAYS_BETWEEN_FIRES` = 2400 days = `NUMOF_DAYS_IN_YEAR*2` (fire.hpp 46); `fire_rate` formula (simulate.cpp 99) |
| Death presentation as progress mapped to a frame index | Smoke frame = progress x 4 / 12000, cap 4 (fire.cpp 144-145) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (stage check, then progress, then spread timer; spread roll, then target check, then ignition roll). It moves the initial random burn length into `startBurn` (the donor draws it on the first update), and it leaves out the pollution side effect, the fire-cover recomputation, the shuffled update order, the multi-tile footprint and transport reconnection, the seeded RNG, the report labels, and the save and load code. It changes two things on purpose, both fixes listed in section 6: cover multiplies the ignition chance instead of blocking it (`coverIgnitionFactor`, no donor value), and the strike interval is computed in floats and clamped to at least 1.

```ts
// clean-room sketch: per-tile burn timeline, neighbour spread, suppression, size-normalised event rate.
// Licence of donor: GPL-2.0-or-later. Written from the described mechanism, not a line-by-line translation.
// Units: one tick = one in-game day (simulation step), never a frame.

export type Dir = "N" | "S" | "E" | "W";
const DIRS: readonly Dir[] = ["N", "S", "E", "W"];

export interface BurnParams {
  burnDays: number;            // donor FIRE_LENGTH = 6000 ticks
  smokeDays: number;           // donor AFTER_FIRE_LENGTH = 12000 ticks
  spreadEvery: number;         // donor FIRE_DAYS_PER_SPREAD = 150 ticks
  suppressBonus: number;       // extra progress per tick while suppressed (donor: +4)
  coverIgnitionFactor: number; // FIX: multiplier on ignition chance under cover (donor blocks it: 0). No donor default.
}

export type BurnStage = "burning" | "smoking" | "gone";

export interface BurnState {
  stage: BurnStage;
  burned: number;
  smoked: number;
  untilSpread: number;
}

export function startBurn(p: BurnParams, rnd: () => number): BurnState {
  return {
    stage: "burning",
    burned: Math.floor(rnd() * (p.burnDays / 5)), // donor: rand() % (FIRE_LENGTH / 5)
    smoked: 0,
    untilSpread: p.spreadEvery,
  };
}

// One daily step. Order mirrors the donor: stage check first, then progress, then spread.
export function dayTick(
  s: BurnState,
  p: BurnParams,
  suppressed: boolean,
  rnd: () => number,
  spread: () => void,
): BurnState {
  const n: BurnState = { ...s };
  if (n.stage === "gone") return n;
  const step = 1 + (suppressed ? p.suppressBonus : 0);
  if (n.stage === "burning" && n.burned > p.burnDays) {
    n.stage = "smoking";
    n.smoked = Math.floor(rnd() * (p.smokeDays / 6));
  }
  if (n.stage === "smoking") {
    n.smoked += step;
    if (n.smoked > p.smokeDays) n.stage = "gone";
    return n; // no spread while smouldering
  }
  n.burned += step;
  n.untilSpread -= 1;
  if (n.untilSpread === 0) {
    n.untilSpread = p.spreadEvery;
    spread();
  }
  return n;
}

export interface Target {
  burnable: boolean;   // a building that can still catch fire
  ignitionPct: number; // donor fire_chance, 0-100
  suppressed: boolean; // under fire-station cover
}

// Donor: rand() % 80 picks N/S/E/W on 4 of 80 rolls; otherwise nothing happens.
export function trySpread(
  rnd: () => number,
  neighbour: (d: Dir) => Target | null,
  p: BurnParams,
): Dir | null {
  const roll = Math.floor(rnd() * 80);
  if (roll >= DIRS.length) return null;
  const d = DIRS[roll];
  const t = neighbour(d);
  if (t === null || !t.burnable) return null;
  const pct = t.suppressed ? t.ignitionPct * p.coverIgnitionFactor : t.ignitionPct;
  if (Math.floor(rnd() * 100) >= pct) return null;
  return d;
}

// Donor simulate.cpp: DAYS_BETWEEN_FIRES*100/len*100/len in integer maths, which is 0 for large maps.
// FIX: float maths, clamped to at least 1 so the modulo below is always defined.
export function strikeEvery(baseDays: number, sideLen: number): number {
  return Math.max(1, Math.floor(((baseDays * 100) / sideLen) * 100 / sideLen));
}

export function strikeDue(tick: number, every: number): boolean {
  return tick % every === 9; // donor offset 9
}

// Donor fire.cpp:144-145: smoke frame = smoking_days * 4 / AFTER_FIRE_LENGTH, capped at 4.
export function smokeFrame(s: BurnState, p: BurnParams): number {
  return Math.min(4, Math.floor((s.smoked * 4) / p.smokeDays));
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `/tmp/VF015_lincity_fire_burn.ts`).

## 5. Lands in

- TARGET `src/fight/corpse.ts` (new module): the timeline for a defeated actor's remains. The stage (burning, smoking, gone) and the time it ends are engine state only if they gate something, such as a loot window, and are then set by sim ticks in the fixed step. The smoke frame is client-only (the view maps stage progress to a frame).
- Parity-checklist row 17 (death/respawn). Row 8 (blood, wounds, decals) would fit the look, but the timeline is death state, so row 17 is the one.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one engine: the timeline is engine state where it gates anything, and a view otherwise); rules 7-9 n/a

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism.
- Fixed step versus frames: the donor's clock is a day counter driven by a timer in the game loop (Game.cpp 668-670), and the look runs on a separate real-time clock (Game.cpp 684). Frankendom's rulings also split these (fixed-step server tick, client-only view). Any stage that gates a loot window must use the sim step only.
- Server-verified kills: the fire decides nothing about who is dead. The donor removes the building when smoking ends (`detach`, fire.cpp 89-90), which is an outcome, not a verdict. In Frankendom the death is the server's call and the remains are only a view unless a loot window depends on them.
- One engine and zones as data: the burn length, smoke length, spread interval, suppression bonus and ignition chances are per-zone data fields (see the JSON sidecar). The donor hard-codes them as constants in `fire.hpp`.
- Determinism (defect D4 below): the donor uses an unseeded `rand()` and a shuffled per-day update order (simulate.cpp 237). Two clients or a server replay would not agree. Frankendom must use the seeded fight or zone RNG stream and a fixed update order (for example sorted by id).
- Defects found, each kept as an idea:
  - D1, integer strike interval: `fire_rate = DAYS_BETWEEN_FIRES*100/map.len()*100/map.len()` (simulate.cpp 99) truncates twice. In my arithmetic (not a test) the first side that gives 0 is 4898 (4900 and 5000 also give 0), and `total_time % fire_rate` (101) then divides by zero. Whether a map that large can exist was not read. fix: float maths and `Math.max(1, ...)` (sketch `strikeEvery`).
  - D2, cover blocks instead of slowing: fire.cpp 132-133 blocks ignition on a covered tile outright, and the donor's own TODO (fire.cpp 125) says cover should only slow spread. fix: multiply the ignition chance by `coverIgnitionFactor` (sketch `trySpread`).
  - D3, initial random values set late: the burn length is drawn on the first update (fire.cpp 78-79), not at creation, so a tile's length depends on when its first update runs. fix: draw it in `startBurn` (sketch).
- Spread is slow by design (4 of 80 rolls), which is the idea, not a defect. Frankendom should keep it slow if a hazard spreads at all.
- Lincity is a city sim. The fire has no damage, no hit, no finisher, no blood and no screen effect. Nothing here replaces `T_Damage`-style logic. Only the remains timeline and the protection-speeds-progress rule transfer.
- Area-normalised event rate: the strike formula keeps the per-tile chance flat across map sizes. This is the one idea here for zone population (parity row 23): a spawn rate written as "per area" rather than "per zone". Not built in this note.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN. All verified (Fire::update, spread, animate, torch, do_random_fire, fire_rate, cover cadence, shuffle, constants, group chances, Game.cpp, ANIM_THRESHOLD, GPL v2-or-later); D1 arithmetic checks out.
- Missed: none.
